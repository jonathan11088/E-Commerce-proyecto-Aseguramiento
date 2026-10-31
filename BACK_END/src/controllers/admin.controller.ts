import { NextFunction, Request, Response } from 'express';
import { AdminService } from '../services/admin.service';
/**
 * Controller: Get all products.
 * Delegates to AdminService and returns product list.
 * Responds with 200 OK and JSON payload.
 */
export const getAllProducts = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const products = await AdminService.getAllProducts();
        res.status(200).json({ products });
    } catch (err) {
        next(err);
    }
};

/**
 * Controller: Create a new product.
 * - Validates required fields in request body.
 * - Extracts optional image filename from uploaded file.
 * - Delegates creation to AdminService.
 * Responds with 201 Created and the new product.
 */
export const createProduct = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { name, description, price, stock, subCategoryId } = req.body;
        if (!name || !description || !price || !subCategoryId) {
            res.status(400).json({ error: 'name, description, price and subCategoryId are required' });
            return;
        }
        const imagePath = req.file ? req.file.filename : undefined;
        const product = await AdminService.createProduct({
            name, description,
            price: Number(price),
            stock: Number(stock) || 0,
            subCategoryId: Number(subCategoryId),
            imagePath,
        });
        res.status(201).json({message: "Product Created", product});
    } catch (err) {
        next(err);
    }
};

/**
 * Controller: Update an existing product.
 * - Validates product ID from route params.
 * - Extracts optional new image filename.
 * - Delegates update to AdminService.
 * Responds with 200 OK and the updated product.
 */
export const updateProduct = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = Number(req.params.id);
        if(isNaN(id)){
            res.status(400).json({Error: "Invalid product ID"});
            return;
        }
        const imagePath = req.file ? req.file.filename : undefined;
        const product = await AdminService.updateProduct(id, {...req.body, imagePath} );
        res.status(200).json({message: "Product Updated", product});
    } catch (err) {
        next(err);
    }
};

/**
 * Controller: Delete a product.
 * - Validates product ID from route params.
 * - Delegates deletion to AdminService.
 * Responds with 200 OK and deleted product ID.
 */
export const deleteProduct = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = Number(req.params.id);
        if(isNaN(id)){res.status(400).json({Error: "Invalid Product ID"}); return;} 
        await AdminService.deleteProduct(id);
        res.json({message: "Product Deleted", deletedId: id});
    } catch (err) {
        next(err);
    }
};

/**
 * Controller: Get all customers.
 * Delegates to AdminService and returns customer list.
 * Responds with 200 OK and JSON payload.
 */
export const getAllCustomers = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = await AdminService.getAllCustomers();
        res.status(200).json(user);
    } catch (err) {
        next(err);
    }
};

/**
 * Controller: Toggle lock status of a customer account.
 * - Validates user ID from route params.
 * - Delegates lock/unlock logic to AdminService.
 * Responds with 201 Updated and lock status.
 */
export const toggleLock = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = Number(req.params.id);
        if(isNaN(id)){res.status(400).json({Error: "Invalid User ID"}); return;} 
        const result = await AdminService.toggleLock(id);
        res.status(201).json(result);
    } catch (err) {
        next(err);
    }

};

/**
 * Controller: Get all orders.
 * Delegates to AdminService and returns order list.
 * Responds with 200 OK and JSON payload.
 */
export const getAllOrders = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await AdminService.getAllOrders();
        res.status(200).json(result);
    } catch (err) {
        next(err);
    }

};

/**
 * Controller: Get detailed information for a specific order.
 * - Validates order ID from route params.
 * - Delegates retrieval to AdminService.
 * Responds with 200 OK and order details.
 */
export const getOrderDetail = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = Number(req.params.id);
        if(isNaN(id)){res.status(400).json({Error: "Invalid Product ID"}); return;} 
        const result = await AdminService.getOrderDetail(id);
        res.status(200).json(result);
    } catch (err) {
        next(err);
    }
};