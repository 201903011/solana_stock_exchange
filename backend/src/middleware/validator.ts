import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain } from 'express-validator';
import { ValidationError } from '../types';

// Middleware to handle validation results
export const validate = (validations: ValidationChain[]) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        // Execute all validations
        await Promise.all(validations.map((validation) => validation.run(req)));

        const errors = validationResult(req);
        if (errors.isEmpty()) {
            return next();
        }

        const extractedErrors: any[] = [];
        errors.array().map((err: any) =>
            extractedErrors.push({ [err.path]: err.msg })
        );

        throw new ValidationError(
            `Validation failed: ${JSON.stringify(extractedErrors)}`
        );
    };
};

// Generic error handler
export const errorHandler = (
    err: any,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal server error';

    res.status(statusCode).json({
        success: false,
        error: message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
};

// 404 handler
export const notFoundHandler = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    res.status(404).json({
        success: false,
        error: 'Route not found',
    });
};

export default {
    validate,
    errorHandler,
    notFoundHandler,
};
