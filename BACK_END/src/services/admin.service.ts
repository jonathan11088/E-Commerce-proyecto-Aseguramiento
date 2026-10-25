import fs from 'fs';
import path from 'path';
import { AppDataSource } from "../config/data-source";
import { Product } from "../entities/Product";
import { SubCategory } from "../entities/SubCategory";
import { User, UserRole } from '../entities/User';
import { ApiError } from '../utils/ApiError/ApiError';
import { Order } from '../entities/Order';
import { SessionStore } from '../middleware/sessionStore';

// ----> Product Management <----
/**
 * AdminService
 * 
 * Provides administrative operations for managing products, customers, and orders.
 * Encapsulates business logic for CRUD operations and account controls,
 * ensuring consistent error handling and resource cleanup.
 */
export const AdminService = {
    /**
   * Retrieve all products with their sub-category and category relations.
   * Results are ordered by creation date (newest first).
   */
    async getAllProducts() {
        return AppDataSource.getRepository(Product)
            .find({
                relations: {
                    subCategory: {
                        category: {
                            type: true
                        }
                    }
                },
                order: { createdAt: 'DESC' },
            });
    },

    /**
   * Create a new product.
   * Validates that the referenced sub-category exists before persisting.
   * Throws ApiError(404) if the sub-category is missing.
   */
    async createProduct(data: {
        name: string,
        description: string,
        price: number,
        stock: number,
        subCategoryId: number,
        imagePath?: string
    }) {
        const subCatRepo = await AppDataSource.getRepository(SubCategory);
        const subCat = await subCatRepo.findOne({ where: { id: data.subCategoryId } })

        if (!subCat) {
            throw new ApiError("SubCategory Not Found", 404);
        }

        const product = AppDataSource.getRepository(Product).create({
            name: data.name,
            description: data.description,
            price: data.price,
            stock: data.stock,
            subCategory: subCat,
            imagePath: data.imagePath ?? null
        })

        return AppDataSource.getRepository(Product).save(product);
    },

    /**
   * Update an existing product.
   * - Deletes old image file if replaced.
   * - Validates new sub-category if provided.
   * - Applies partial updates to fields.
   * Throws ApiError(404) if product or sub-category is missing.
   */
    async updateProduct(prodId: number, data: {
        name?: string,
        desc?: string,
        price?: number,
        stock?: number,
        subCategoryId?: number,
        imagePath?: string
    }) {
        const productRepo = await AppDataSource.getRepository(Product);
        const product = await productRepo.findOne({
            where: {
                id: prodId
            },
            relations: {
                subCategory: true
            }
        });
        if (!product) {
            throw new ApiError("Product Not Found", 404);
        }

        // If a new image is uploaded, delete the old file from disk
        // 1st new update actually contain an image? 
        // 2nd check the existence 
        // 3rd new image name different from the old one?
        if (data.imagePath && product.imagePath && data.imagePath !== product.imagePath) {
            const oldPath = path.join(__dirname, '..', '..', 'ProductImages', product.imagePath);
            if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }

        // Handle sub-category reassignment
        if (data.subCategoryId) {
            const subCatRepo = await AppDataSource.getRepository(SubCategory).findOne({
                where: { id: data.subCategoryId }
            });
            if (!subCatRepo) {
                throw new ApiError("SubCategory Not Found", 404);
            }
            product.subCategory = subCatRepo;
        }
        // Apply updates with fallbacks to existing values
        Object.assign(product, {
            name: data.name ?? product.name,
            description: data.desc ?? product.description,
            price: data.price ?? product.price,
            stock: data.stock ?? product.stock,
            imagePath: data.imagePath ?? product.imagePath,
        });
        return await productRepo.save(product);
    },

    /**
   * Delete a product by ID.
   * Removes associated image file from disk if present.
   * Throws ApiError(404) if product is missing.
   */
    async deleteProduct(prodId: number) {
        const productRepo = await AppDataSource.getRepository(Product);
        const product = await productRepo.findOne({ where: { id: prodId } });
        if (!product) {
            throw new ApiError("Product Not Found", 404);
        }

        if (product.imagePath) {
            const filePath = path.join(__dirname, '..', '..', 'ProductImages', product.imagePath);
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }

        await productRepo.remove(product);
        return true;
    },

    // ----> Customer Management <----
    /**
   * Retrieve all customers.
   * Filters by role = 'customer' and selects limited fields for privacy.
   * Results are ordered by creation date (newest first).
   */
    async getAllCustomers() {
        const userRepo = AppDataSource.getRepository(User);
        const customers = await userRepo
            .createQueryBuilder('user')
            .where('user.role = :role', { role: UserRole.CUSTOMER })
            .orderBy('user.createdAt', 'DESC')
            .getMany();

        // Strip passwordHash from each result before sending
        return customers.map(({ passwordHash: _, ...safe }) => safe);
    },

    /**
   * Toggle account lock status for a customer.
   * - Locks/unlocks the account.
   * - Clears active sessions if locked.
   * Throws ApiError(404) if customer is missing.
   */
    async toggleLock(customerId: number) {
        const customerRepo = await AppDataSource.getRepository(User);
        const customer = await customerRepo.findOne({ where: { id: customerId } });

        if (!customer) {
            throw new ApiError("Customer Not Found", 404);
        }

        customer.isLocked = !customer.isLocked;
        await customerRepo.save(customer);

        if (customer.isLocked) {
            SessionStore.deleteAllForUser(customer.id);
        }

        return {
            message: customer.isLocked ? 'Account locked successfully' : 'Account unlocked successfully',
            isLocked: customer.isLocked
        }
    },

    // ----> Order Management <----
    /**
   * Retrieve all orders with user and product item relations.
   * Results are ordered by creation date (newest first).
   */
    async getAllOrders() {
        return AppDataSource.getRepository(Order).find({
            relations: { user: true, items: { product: true } },
            order: { createdAt: 'DESC' },
        });
    },

    /**
   * Retrieve detailed information for a specific order.
   * Includes user and product item relations.
   * Throws ApiError(404) if order is missing.
   */
    async getOrderDetail(id: number) {
        const order = await AppDataSource.getRepository(Order).findOne({
            where: { id },
            relations: {
                user: true, items: { product: true }
            },
        });

        if (!order) throw new ApiError("Order Not Found", 404);

        return order;
    }

}