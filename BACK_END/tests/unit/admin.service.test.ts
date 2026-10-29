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

describe('AdminService pedidos (RF-26)', () => {
    it('getOrderDetail no expone el hash de la contrasena del cliente (DEF-11)', async () => {
        repoFor('Order').findOne.mockResolvedValue({ id: 3, user: { id: 8, passwordHash: '$2b$12$x' } });

        const order = await AdminService.getOrderDetail(3);

        expect(order.user).not.toHaveProperty('passwordHash');
    });

    it('getAllOrders limpia el hash en cada pedido del listado', async () => {
        repoFor('Order').find.mockResolvedValue([
            { id: 1, user: { id: 8, passwordHash: 'h1' } },
            { id: 2, user: { id: 9, passwordHash: 'h2' } },
        ]);

        const orders = await AdminService.getAllOrders();

        expect(orders.every((o: any) => !('passwordHash' in o.user))).toBe(true);
    });
});
