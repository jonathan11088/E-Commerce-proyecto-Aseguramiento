import { OrderService } from '../../src/services/order.service';
import { mockAppDataSource, repoFor, repos } from '../helpers/mockDataSource';

/**
 * Doble usado: AppDataSource (stub) con un EntityManager falso dentro de transaction().
 * Por que se aisla: el checkout es transaccional; con un manager simulado se puede
 * verificar el ORDEN y los argumentos de cada operacion (crear pedido, congelar precio,
 * descontar stock, vaciar carrito) y comprobar que si algo falla no se escribe nada.
 */
jest.mock('../../src/config/data-source', () => ({
    AppDataSource: require('../helpers/mockDataSource').mockAppDataSource,
}));

const buildManager = (cartItems: any[]) => ({
    find: jest.fn().mockResolvedValue(cartItems),
    create: jest.fn((_entity: any, data: any) => ({ ...data })),
    save: jest.fn(async (_entity: any, data: any) => (Array.isArray(data) ? data : { id: 77, ...data })),
    decrement: jest.fn(),
    delete: jest.fn(),
    findOne: jest.fn(async () => ({ id: 77 })),
});

const useManager = (manager: ReturnType<typeof buildManager>) => {
    mockAppDataSource.transaction.mockImplementation(async (work: any) => work(manager));
};

const item = (id: number, price: string, stock: number, quantity: number) => ({
    quantity, product: { id, name: `Producto ${id}`, price, stock },
});

beforeEach(() => repos.clear());

describe('OrderService.checkout (RF-19)', () => {
    it('rechaza con 400 un carrito vacio y no crea pedido (CP-23 / DEF-07)', async () => {
        const manager = buildManager([]);
        useManager(manager);

        await expect(OrderService.checkout(1, 'Credit Card'))
            .rejects.toMatchObject({ status: 400, message: 'Your Cart is Empty' });
        expect(manager.save).not.toHaveBeenCalled();
    });

    it('rechaza con 400 si la cantidad supera el stock y no descuenta inventario (CP-15)', async () => {
        const manager = buildManager([item(1, '10.00', 3, 4)]);
        useManager(manager);

        await expect(OrderService.checkout(1, 'Credit Card')).rejects.toMatchObject({ status: 400 });
        expect(manager.save).not.toHaveBeenCalled();
        expect(manager.decrement).not.toHaveBeenCalled();
        expect(manager.delete).not.toHaveBeenCalled();
    });

    it('acepta comprar exactamente el stock disponible (valor limite, CP-14)', async () => {
        const manager = buildManager([item(1, '10.00', 3, 3)]);
        useManager(manager);

        await OrderService.checkout(1, 'Credit Card');

        expect(manager.decrement).toHaveBeenCalledWith(expect.anything(), { id: 1 }, 'stock', 3);
    });

    it('calcula el total, congela el precio, descuenta stock y vacia el carrito', async () => {
        const manager = buildManager([item(1, '299.00', 10, 2), item(2, '15.50', 5, 1)]);
        useManager(manager);

        const order = await OrderService.checkout(9, 'Debit Card');

        expect(order).toEqual({ id: 77 });
        expect(manager.create).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
            user: { id: 9 }, totalAmount: 613.5, paymentMethod: 'Debit Card',
        }));
        const orderItems = manager.save.mock.calls[1][1];
        expect(orderItems.map((i: any) => i.priceAtPurchase)).toEqual([299, 15.5]);
        expect(manager.decrement).toHaveBeenCalledTimes(2);
        expect(manager.decrement).toHaveBeenCalledWith(expect.anything(), { id: 2 }, 'stock', 1);
        expect(manager.delete).toHaveBeenCalledWith(expect.anything(), { user: { id: 9 } });
    });
});

describe('OrderService consultas (RF-21, RF-22)', () => {
    it('getMyOrders filtra por el usuario y ordena del mas reciente al mas antiguo', async () => {
        repoFor('Order').find.mockResolvedValue([]);

        await OrderService.getMyOrders(4);

        expect(repoFor('Order').find).toHaveBeenCalledWith(expect.objectContaining({
            where: { user: { id: 4 } }, order: { createdAt: 'DESC' },
        }));
    });

    it('getOrderById responde 404 si el pedido no pertenece al cliente (CP-36 / DEF-08)', async () => {
        repoFor('Order').findOne.mockResolvedValue(null);

        await expect(OrderService.getOrderById(1, 50)).rejects.toMatchObject({ status: 404 });
        expect(repoFor('Order').findOne).toHaveBeenCalledWith(expect.objectContaining({
            where: { id: 50, user: { id: 1 } },
        }));
    });

    it('getOrderById nunca devuelve el hash de la contrasena del cliente (DEF-11)', async () => {
        repoFor('Order').findOne.mockResolvedValue({ id: 50, user: { id: 1, email: 'a@mail.com', passwordHash: '$2b$12$x' } });

        const order = await OrderService.getOrderById(1, 50);

        expect(order.user).toEqual({ id: 1, email: 'a@mail.com' });
    });
});
