import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { AuthService } from '../../src/services/auth.service';
import { SessionStore } from '../../src/middleware/sessionStore';
import { repoFor, repos } from '../helpers/mockDataSource';

/**
 * Dobles usados:
 *  - AppDataSource (stub): los repositorios de User y ResetCode se controlan por prueba.
 *  - bcrypt (mock): el hash real con costo 12 tarda ~250 ms por llamada; ademas se
 *    necesita verificar CON QUE argumentos se llama (costo 12, hash de referencia).
 *  - jsonwebtoken.sign (stub): devuelve un token fijo para poder buscarlo en SessionStore.
 */
jest.mock('../../src/config/data-source', () => ({
    AppDataSource: require('../helpers/mockDataSource').mockAppDataSource,
}));
jest.mock('bcrypt', () => ({ hash: jest.fn(), compare: jest.fn() }));
jest.mock('jsonwebtoken', () => ({ sign: jest.fn(), verify: jest.fn() }));

const mockedHash = bcrypt.hash as jest.Mock;
const mockedCompare = bcrypt.compare as jest.Mock;
const mockedSign = jwt.sign as jest.Mock;

const storedUser = () => ({
    id: 5, name: 'Ana Torres', email: 'ana@mail.com', passwordHash: '$2b$12$hashguardado',
    role: 'customer', isLocked: false,
});

beforeEach(() => {
    repos.clear();
    SessionStore.deleteAllForUser(5);
});

describe('AuthService.register (RF-01)', () => {
    it('rechaza con 409 un correo ya registrado sin crear la cuenta', async () => {
        repoFor('User').findOne.mockResolvedValue(storedUser());

        await expect(AuthService.register('Ana', 'ana@mail.com', 'Segura123'))
            .rejects.toMatchObject({ status: 409 });
        expect(repoFor('User').save).not.toHaveBeenCalled();
    });

    it('normaliza el correo, aplica bcrypt con costo 12 y nunca devuelve el hash (RNF-01)', async () => {
        repoFor('User').findOne.mockResolvedValue(null);
        mockedHash.mockResolvedValue('$2b$12$nuevohash');

        const user = await AuthService.register('  Ana  ', '  ANA@Mail.com ', 'Segura123');

        expect(mockedHash).toHaveBeenCalledWith('Segura123', 12);
        expect(repoFor('User').create).toHaveBeenCalledWith(expect.objectContaining({
            name: 'Ana', email: 'ana@mail.com', passwordHash: '$2b$12$nuevohash', role: 'customer', isLocked: false,
        }));
        expect(user).not.toHaveProperty('passwordHash');
    });
});

describe('AuthService.login (RF-02)', () => {
    it('emite el token, registra la sesion y no expone el hash', async () => {
        repoFor('User').findOne.mockResolvedValue(storedUser());
        mockedCompare.mockResolvedValue(true);
        mockedSign.mockReturnValue('jwt-de-prueba');

        const { token, user } = await AuthService.login('ana@mail.com', 'Segura123');

        expect(token).toBe('jwt-de-prueba');
        expect(mockedSign).toHaveBeenCalledWith(
            { userId: 5, role: 'customer', email: 'ana@mail.com' }, 'test-secret', { expiresIn: '7d' },
        );
        expect(SessionStore.get('jwt-de-prueba')).toEqual({ userId: 5, role: 'customer', email: 'ana@mail.com' });
        expect(user).not.toHaveProperty('passwordHash');
    });

    it('rechaza con 403 una contrasena incorrecta', async () => {
        repoFor('User').findOne.mockResolvedValue(storedUser());
        mockedCompare.mockResolvedValue(false);

        await expect(AuthService.login('ana@mail.com', 'mala'))
            .rejects.toMatchObject({ status: 403, message: 'Invalid Credential' });
    });

    it('con un correo inexistente responde igual que con contrasena incorrecta y si ejecuta bcrypt (DEF-01 / DEF-09)', async () => {
        repoFor('User').findOne.mockResolvedValue(null);
        mockedCompare.mockResolvedValue(false);
        mockedHash.mockResolvedValue('$2b$12$hashdereferencia');

        await expect(AuthService.login('no.existe@mail.com', 'cualquiera'))
            .rejects.toMatchObject({ status: 403, message: 'Invalid Credential' });
        // Se compara contra un hash bcrypt de referencia generado con costo 12, nunca contra undefined
        expect(mockedHash).toHaveBeenCalledWith(expect.any(String), 12);
        expect(mockedCompare).toHaveBeenCalledWith('cualquiera', '$2b$12$hashdereferencia');
    });

    it('rechaza con 403 una cuenta bloqueada aunque la contrasena sea correcta', async () => {
        repoFor('User').findOne.mockResolvedValue({ ...storedUser(), isLocked: true });
        mockedCompare.mockResolvedValue(true);

        await expect(AuthService.login('ana@mail.com', 'Segura123'))
            .rejects.toMatchObject({ status: 403, message: 'Your Account is Locked' });
        expect(mockedSign).not.toHaveBeenCalled();
    });
});

describe('AuthService.logout y getMe', () => {
    it('logout elimina la sesion del token (RF-03)', () => {
        SessionStore.set('jwt-activo', { userId: 5, role: 'customer', email: 'ana@mail.com' });

        AuthService.logout('jwt-activo');

        expect(SessionStore.get('jwt-activo')).toBeUndefined();
    });

    it('getMe responde 404 si el usuario no existe', async () => {
        repoFor('User').findOne.mockResolvedValue(null);

        await expect(AuthService.getMe(99)).rejects.toMatchObject({ status: 404 });
    });
});

describe('AuthService.forgotPassword (RF-06)', () => {
    afterEach(() => jest.useRealTimers());

    it('con un correo inexistente devuelve un valor generico y no crea codigos', async () => {
        repoFor('User').findOne.mockResolvedValue(null);

        await expect(AuthService.forgotPassword('no.existe@mail.com')).resolves.toBe('0000');
        expect(repoFor('ResetCode').save).not.toHaveBeenCalled();
    });

    it('invalida los codigos anteriores y genera uno de 6 digitos que vence en 10 minutos (RNF-06)', async () => {
        jest.useFakeTimers().setSystemTime(new Date('2026-10-24T10:00:00Z'));
        repoFor('User').findOne.mockResolvedValue(storedUser());
        const anterior = { id: 1, used: false };
        repoFor('ResetCode').find.mockResolvedValue([anterior]);

        const code = await AuthService.forgotPassword('ana@mail.com');

        expect(code).toMatch(/^\d{6}$/);
        expect(anterior.used).toBe(true);
        const creado = repoFor('ResetCode').create.mock.calls[0][0];
        expect(creado.expiresAt.toISOString()).toBe('2026-10-24T10:10:00.000Z');
        expect(creado.used).toBe(false);
    });
});

describe('AuthService.resetPassword (RF-06)', () => {
    const vigente = () => ({ id: 3, code: '123456', used: false, expiresAt: new Date(Date.now() + 60_000) });

    it('marca el codigo como usado guardandolo en el repositorio de ResetCode (DEF-03)', async () => {
        repoFor('User').findOne.mockResolvedValue(storedUser());
        const resetCode = vigente();
        repoFor('ResetCode').findOne.mockResolvedValue(resetCode);
        mockedHash.mockResolvedValue('$2b$12$hashnuevo');

        await AuthService.resetPassword('ana@mail.com', '123456', 'NuevaClave99');

        expect(repoFor('ResetCode').save).toHaveBeenCalledWith(expect.objectContaining({ id: 3, used: true }));
        expect(repoFor('User').save).toHaveBeenCalledWith(expect.objectContaining({ passwordHash: '$2b$12$hashnuevo' }));
        expect(repoFor('User').save).not.toHaveBeenCalledWith(resetCode);
    });

    it('cierra todas las sesiones del usuario despues de restablecer', async () => {
        SessionStore.set('sesion-vieja', { userId: 5, role: 'customer', email: 'ana@mail.com' });
        repoFor('User').findOne.mockResolvedValue(storedUser());
        repoFor('ResetCode').findOne.mockResolvedValue(vigente());
        mockedHash.mockResolvedValue('$2b$12$hashnuevo');

        await AuthService.resetPassword('ana@mail.com', '123456', 'NuevaClave99');

        expect(SessionStore.get('sesion-vieja')).toBeUndefined();
    });

    it('rechaza con 400 un codigo vencido sin cambiar la contrasena', async () => {
        repoFor('User').findOne.mockResolvedValue(storedUser());
        repoFor('ResetCode').findOne.mockResolvedValue({ ...vigente(), expiresAt: new Date(Date.now() - 1000) });

        await expect(AuthService.resetPassword('ana@mail.com', '123456', 'NuevaClave99'))
            .rejects.toMatchObject({ status: 400, message: 'Reset code is expired. Please request a new one' });
        expect(repoFor('User').save).not.toHaveBeenCalled();
    });

    it('rechaza con 400 un codigo inexistente o ya usado (CP-29)', async () => {
        repoFor('User').findOne.mockResolvedValue(storedUser());
        repoFor('ResetCode').findOne.mockResolvedValue(null);

        await expect(AuthService.resetPassword('ana@mail.com', '123456', 'NuevaClave99'))
            .rejects.toMatchObject({ status: 400, message: 'Invalid or already used reset code' });
    });

    it('rechaza con 400 cuando el correo no existe', async () => {
        repoFor('User').findOne.mockResolvedValue(null);

        await expect(AuthService.resetPassword('no@mail.com', '123456', 'NuevaClave99'))
            .rejects.toMatchObject({ status: 400 });
    });
});
