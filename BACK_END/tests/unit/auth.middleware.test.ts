import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { authenticate, optionalAuth } from '../../src/middleware/auth.middleware';
import { SessionStore } from '../../src/middleware/sessionStore';
import { repoFor, repos } from '../helpers/mockDataSource';

/**
 * Dobles usados:
 *  - AppDataSource (stub): evita abrir la base SQLite para buscar el usuario.
 *  - jsonwebtoken.verify (mock): permite simular tokens validos, vencidos o alterados
 *    sin depender de la hora real ni de firmar tokens en cada prueba.
 * SessionStore se usa real porque es la logica que se quiere verificar junto al middleware.
 */
jest.mock('../../src/config/data-source', () => ({
    AppDataSource: require('../helpers/mockDataSource').mockAppDataSource,
}));
jest.mock('jsonwebtoken', () => ({ verify: jest.fn(), sign: jest.fn() }));

const mockedVerify = jwt.verify as jest.Mock;
const payload = { userId: 7, role: 'customer', email: 'ana@mail.com' };

const buildReq = (token?: string) => ({ cookies: token ? { authToken: token } : {} }) as unknown as Request;
const buildRes = () => {
    const res: Partial<Response> = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res as Response;
};

describe('authenticate (RF-04)', () => {
    let next: jest.MockedFunction<NextFunction>;

    beforeEach(() => {
        repos.clear();
        next = jest.fn();
        SessionStore.deleteAllForUser(7);
    });

    it('responde 401 cuando la peticion no trae cookie', async () => {
        const res = buildRes();
        await authenticate(buildReq(), res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
    });

    it('responde 401 cuando el JWT es invalido o esta vencido', async () => {
        mockedVerify.mockImplementation(() => { throw new Error('jwt expired'); });
        const res = buildRes();

        await authenticate(buildReq('token-vencido'), res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ Error: 'Invalid or expired token' });
    });

    it('responde 401 cuando el token es valido pero la sesion ya se cerro (logout, RF-03)', async () => {
        mockedVerify.mockReturnValue(payload);
        const res = buildRes();

        await authenticate(buildReq('token-sin-sesion'), res, next);

        expect(res.json).toHaveBeenCalledWith({ Error: 'Session expired. Please login again' });
        expect(next).not.toHaveBeenCalled();
    });

    it('borra la sesion y responde 401 si el usuario ya no existe', async () => {
        mockedVerify.mockReturnValue(payload);
        SessionStore.set('token-huerfano', payload);
        repoFor('User').findOne.mockResolvedValue(null);
        const res = buildRes();

        await authenticate(buildReq('token-huerfano'), res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(SessionStore.get('token-huerfano')).toBeUndefined();
    });

    it('rechaza a un usuario bloqueado y cierra todas sus sesiones en todos los dispositivos (RNF-05)', async () => {
        mockedVerify.mockReturnValue(payload);
        SessionStore.set('token-pc', payload);
        SessionStore.set('token-celular', payload);
        repoFor('User').findOne.mockResolvedValue({ id: 7, isLocked: true });
        const res = buildRes();

        await authenticate(buildReq('token-pc'), res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(SessionStore.get('token-pc')).toBeUndefined();
        expect(SessionStore.get('token-celular')).toBeUndefined();
    });

    it('adjunta el usuario a req.user y continua cuando todo es valido', async () => {
        mockedVerify.mockReturnValue(payload);
        SessionStore.set('token-ok', payload);
        const user = { id: 7, isLocked: false, role: 'customer' };
        repoFor('User').findOne.mockResolvedValue(user);
        const req = buildReq('token-ok');

        await authenticate(req, buildRes(), next);

        expect(req.user).toBe(user);
        expect(next).toHaveBeenCalledWith();
    });

    it('delega al manejador global si la base de datos falla', async () => {
        mockedVerify.mockReturnValue(payload);
        SessionStore.set('token-ok', payload);
        const dbError = new Error('SQLITE_BUSY');
        repoFor('User').findOne.mockRejectedValue(dbError);

        await authenticate(buildReq('token-ok'), buildRes(), next);

        expect(next).toHaveBeenCalledWith(dbError);
    });
});

describe('optionalAuth', () => {
    beforeEach(() => {
        repos.clear();
        SessionStore.deleteAllForUser(7);
    });

    it('continua como invitado cuando no hay token', async () => {
        const req = buildReq();
        const next = jest.fn();

        await optionalAuth(req, buildRes(), next);

        expect(req.user).toBeUndefined();
        expect(next).toHaveBeenCalled();
    });

    it('no adjunta un usuario bloqueado aunque su sesion exista', async () => {
        mockedVerify.mockReturnValue(payload);
        SessionStore.set('token-ok', payload);
        repoFor('User').findOne.mockResolvedValue({ id: 7, isLocked: true });
        const req = buildReq('token-ok');
        const next = jest.fn();

        await optionalAuth(req, buildRes(), next);

        expect(req.user).toBeUndefined();
        expect(next).toHaveBeenCalled();
    });

    it('nunca bloquea la peticion aunque el token este alterado', async () => {
        mockedVerify.mockImplementation(() => { throw new Error('invalid signature'); });
        jest.spyOn(console, 'log').mockImplementation(() => undefined);
        const next = jest.fn();

        await optionalAuth(buildReq('token-alterado'), buildRes(), next);

        expect(next).toHaveBeenCalledWith();
    });
});
