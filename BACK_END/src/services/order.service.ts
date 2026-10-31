import { AppDataSource } from "../config/data-source"
import { CartItem } from "../entities/CartItem";
import { Order } from "../entities/Order";
import { OrderItem } from "../entities/OrderItem";
import { Product } from "../entities/Product";
import { User } from "../entities/User";
import { ApiError } from "../utils/ApiError/ApiError";
import { withoutPasswordHash } from "../utils/sanitizeOrder";

const VALID_PAYMENT_METHODS = [
    'Credit Card',
    'Debit Card',
    'Cash on Delivery',
    'Bank Transfer',
];

export const OrderService = {
    /**
     * get all the orders 
     * @param userId using jwt token 
     * @returns arrays of products whichc are order
     */
    async getMyOrders(userId: number): Promise<Order[]> {
        const orderRepo = await AppDataSource.getRepository(Order);

        const order = await orderRepo.find({
            where: { user: { id: userId } },
            relations: { items: { product: true } }, // Crucial for showing product names/images in the UI
            order: { createdAt: 'DESC' }
        });

        return order;
    },

    /**
     * Retrieve a specific order for a given user.
     * @param userId - The ID of the user who owns the order.
     * @param orderId - The ID of the order to retrieve.
     * @returns The order entity with related user and product items.
     * @throws ApiError(404) if the order does not exist for the given user.
     */
    async getOrderById(userId: number, orderId: number): Promise<Order> {
        const orderRepo = await AppDataSource.getRepository(Order).findOne({
            where: {
                id: orderId,
                user: {
                    id: userId
                },
            },
            relations: {
                items: {
                    product: true
                },
                user: true
            },
        });

        if (!orderRepo) throw new ApiError("Order Not Found", 404);

        return withoutPasswordHash(orderRepo);
    },

    /**
     * Checkout process for a user
     * 1. Load the Cart
     * 2. Validate stock for every time
     * 3. Compute total amount and create order
     * 4. Decrement the product stock
     * 5. Clear the Cart
     * @param userId - The id who want to proceed for chekout
     * @param paymentMethod 
     * @returns the order details
     */
    async checkout(userId: number, paymentMethod: string): Promise<Order> {
        return await AppDataSource.transaction(async (manager) => {

            // 1. Load the Cart
            const cartItemRepo = await manager.find(CartItem, {
                where: { user: { id: userId } },
                relations: { product: true },
            });

            if (cartItemRepo.length === 0) throw new ApiError("Your Cart is Empty", 400);

            // 2. Validate stock for every time
            for (const cartItems of cartItemRepo) {
                // Soft Reservation Check 
                if (cartItems.quantity > cartItems.product.stock) {
                    throw new ApiError(`Insufficient Stcok for ${cartItems.product.name}. 
                        Available: ${cartItems.product.stock}, Reuested: ${cartItems.quantity}`, 400);
                }
            }

            // 3. Compute total amount and create order
            const totalAmount = cartItemRepo.reduce((sum, item) => {
                return sum + Number(item.product.price) * item.quantity
            }, 0);

            // await is not required because manager.create is a synchronous operation.
            // Unlike save, find, or update, the create method does not talk to the database.
            const order = manager.create(Order, {
                user: { id: userId } as User,
                totalAmount: Number(totalAmount.toFixed(2)),
                paymentMethod,
            })
            const saveOrder = await manager.save(Order, order);

            // Create OrderItems with FROZEN prices
            const orderItems = cartItemRepo.map((item) =>
                manager.create(OrderItem, {
                    order: saveOrder,
                    product: item.product,
                    quantity: item.quantity,
                    priceAtPurchase: Number(item.product.price), // SNAPSHOT
                })
            );
            await manager.save(OrderItem, orderItems);
            
            // 4. Decrement the product stock
            for (const item of cartItemRepo) {
                //manager.decrement() inside the loop to handle inventory updates atomically.
                await manager.decrement(Product, // The table to update.
                    { id: item.product.id }, // The specific row (the "Where" clause).
                    'stock', // The specific column to change.
                    item.quantity // The amount to subtract.
                );
            }

            // 5. Clear the Cart
            await manager.delete(CartItem, {user: {id: userId}});

            const placed = await manager.findOne(Order, {
                where: {id: saveOrder.id},
                relations: {items: {product: true}, user: true},
            });
            return withoutPasswordHash(placed) as Order;
        });
    }

}