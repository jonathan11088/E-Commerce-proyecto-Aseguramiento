/**
 * Custom API error class.
 * 
 * Extends the built-in `Error` object to include HTTP status codes
 * and provide cleaner stack traces for debugging.
 */
export class ApiError extends Error {
    constructor(message: string, statusCode: number) {
        super(message);
        this.name = this.constructor.name;
        (this as any).statusCode = statusCode;
        // El manejador global de app.ts lee err.status, por eso se expone tambien
        (this as any).status = statusCode;
        // This line captures exactly where the error happened in your code
        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * Funciton Approach
 * // src/utils/throwError.ts
    export const throwError = (message: string, status: number): never => {
        const error: any = new Error(message);
        error.status = status;
        throw error;
    };
 */