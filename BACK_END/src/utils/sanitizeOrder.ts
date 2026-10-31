import { Order } from "../entities/Order";

/**
 * Removes the customer's password hash from an order before it is sent to the client.
 * Orders are loaded with their user relation and TypeORM returns every column,
 * including password_hash (DEF-11).
 */
export const withoutPasswordHash = <T extends Order | null>(order: T): T => {
    if (order?.user) {
        const { passwordHash: _, ...safeUser } = order.user;
        order.user = safeUser as Order['user'];
    }
    return order;
};
