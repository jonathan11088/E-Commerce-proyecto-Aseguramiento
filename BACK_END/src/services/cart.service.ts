import { AppDataSource } from "../config/data-source"
import { addToCart } from "../controllers/cart.controller";
import { CartItem } from "../entities/CartItem"
import { Product } from "../entities/Product";
import { User } from "../entities/User";
import { ApiError } from "../utils/ApiError/ApiError";

export const CartSerice = {
    /**
     * Returns all cart items for a user with product details.
     * Computes a line total and overall cart total server-side.
     */
    async getCart(userId: number) {
        const itemRepo = await AppDataSource.getRepository(CartItem);
        const items = await itemRepo.find({
            where: { user: { id: userId } },
            relations: { product: { subCategory: { category: { type: true } } } }
        });

        const total = items.reduce((sum, item) => {
            return sum + Number(item.product.price) * item.quantity;
        }, 0);

        return { items, total: Number(total.toFixed(2)) };
    },

    /**
     * Adds a product to the cart.
     * If the product is already in the cart, increments the quantity.
     * Validates stock before adding.
     */
    async addToCart(userId: number, productId: number, quantity: number) {
        const prodRepo = await AppDataSource.getRepository(Product);
        const cartRepo = await AppDataSource.getRepository(CartItem);

        const product = await prodRepo.findOne({ where: { id: productId } });

        if (!product) throw new ApiError("Product Not Found", 404); //404 Not found

        if (product.stock < 1) throw new ApiError(`Out Of Stock`, 400); //400 Bad Request

        // Check if this product is already in the user's cart
        const existing = await cartRepo.findOne({
            where: {
                user: { id: userId },
                product: { id: productId }
            }
        });

        if (existing) {
            const newQty = existing.quantity + quantity;
            if (newQty > product.stock) {
                throw new ApiError(`Only ${product.stock} units available. You already have ${existing.quantity} in your cart.`
                    , 400);
            }
            existing.quantity = newQty;
            // product.stock -= quantity; // Deduct newly added quantity
            // await prodRepo.save(product);
            return cartRepo.save(existing);
        }

        if (quantity > product.stock) {
            throw new ApiError(`Only ${product.stock} units available`, 400);
        }

        // // Deduct stock for new cart item
        // product.stock -= quantity;
        // await prodRepo.save(product);

        const user = { id: userId } as User;
        const cartItem = cartRepo.create({ user, product, quantity });
        return cartRepo.save(cartItem);
    },

    /**
     * Updates the quantity of a specific cart item.
     * Quantity of 0 removes the item entirely.
     */
    async updateCartItem(userId: number, productId: number, quantity: number) {
        const cartItemRepo = AppDataSource.getRepository(CartItem);

        const item = await cartItemRepo.findOne({
            where: {
                user: { id: userId },
                product: { id: productId },
            },
            relations: { product: true },
        });

        if (!item) {
            throw new ApiError("Item not found in cart", 404)
        }


        // Quantity 0 means remove
        if (quantity <= 0) {
            // product.stock += item.quantity; // Restore the Product Stock
            // await productRepo.save(product);
            await cartItemRepo.remove(item);
            return { message: 'Item removed from cart and stock restored' };
        }

        // Calculate the difference (Delta)
        // const diff = quantity - item.quantity;

        // Validate against current stock
        // if (diff > product.stock) {
        //     const error: any = new Error(`Only ${item.product.stock} units available`);
        //     error.status = 400;
        //     throw error;
        // }

        // product.stock -= diff;
        item.quantity = quantity;
        // await productRepo.save(product);
        return cartItemRepo.save(item);
    },

    /**
     * Removes a single product from the cart.
     */
    async removeFromCart(userId: number, productId: number) {
        const cartItemRepo = await AppDataSource.getRepository(CartItem);
        // Find the item in the cart (include the product relation to get quantity)
        const item = await cartItemRepo.findOne({
            where: {
                user: { id: userId }, product: { id: productId }
            },
            relations: { product: true } // Crucial to access product.stock
        });
        if (!item) throw new ApiError('Item not found', 404);

        // // Restore the product stock
        // const product = item.product;
        // product.stock += item.quantity;

        // await productRepo.save(product);

        await cartItemRepo.remove(item);
        return { message: "Item Removed From Cart", item };
    },

    /**
     * Clears all items from a user's cart.
     * Called internally by OrderService after successful checkout —
     * not exposed as a standalone user action in the spec,
     * but useful for admin/testing purposes.
     */
    async clearCart(userId: number) {
        const cartItemRepo = await AppDataSource.getRepository(CartItem);
        const items = await cartItemRepo.find({
            where: { user: { id: userId } },
            relations: { product: true }
        });

        if (items.length === 0) {
            throw new ApiError('Cart Is already empty', 400);
        }
        // //Restore stock for each product
        // for (const item of items) {
        //     item.product.stock += item.quantity;
        //     await productRepo.save(item.product);
        // }

        await cartItemRepo.delete({ user: { id: userId } });

        return { message: "Cart cleared successfully" };
    }
}