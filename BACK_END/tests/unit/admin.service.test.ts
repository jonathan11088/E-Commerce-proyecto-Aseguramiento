import { AdminService } from '../../src/services/admin.service';
import { SessionStore } from '../../src/middleware/sessionStore';
import { repoFor, repos } from '../helpers/mockDataSource';

/**
 * Doble usado: AppDataSource (stub) para el repositorio de User.
 * SessionStore es real: lo que se verifica es que bloquear cierre las sesiones de verdad.
 */
jest.mock('../../src/config/data-source', () => ({
    AppDataSource: require('../helpers/mockDataSource').mockAppDataSource,
}));

beforeEach(() => {
    repos.clear();
    SessionStore.deleteAllForUser(8);
});

describe('AdminService.toggleLock (RF-05)', () => {
    it('responde 404 si el cliente no existe', async () => {
        repoFor('User').findOne.mockResolvedValue(null);

        await expect(AdminService.toggleLock(999)).rejects.toMatchObject({ status: 404 });
    });

    it('al bloquear guarda el estado y cierra todas las sesiones del cliente', async () => {
        SessionStore.set('pc', { userId: 8, role: 'customer', email: 'c@mail.com' });
        SessionStore.set('celular', { userId: 8, role: 'customer', email: 'c@mail.com' });
        repoFor('User').findOne.mockResolvedValue({ id: 8, isLocked: false });

        const result = await AdminService.toggleLock(8);

        expect(result).toEqual({ message: 'Account locked successfully', isLocked: true });
        expect(repoFor('User').save).toHaveBeenCalledWith(expect.objectContaining({ id: 8, isLocked: true }));
        expect(SessionStore.get('pc')).toBeUndefined();
        expect(SessionStore.get('celular')).toBeUndefined();
    });

    it('al desbloquear informa el desbloqueo y no toca sesiones', async () => {
        SessionStore.set('pc', { userId: 8, role: 'customer', email: 'c@mail.com' });
        repoFor('User').findOne.mockResolvedValue({ id: 8, isLocked: true });

        const result = await AdminService.toggleLock(8);

        expect(result).toEqual({ message: 'Account unlocked successfully', isLocked: false });
        expect(SessionStore.get('pc')).toBeDefined();
    });
});
