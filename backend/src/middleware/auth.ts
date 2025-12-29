import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/auth';
import { JWTPayload, AuthenticationError, AuthorizationError } from '../types';
import logger from '../utils/logger';

// Extend Express Request to include user
declare global {
    namespace Express {
        interface Request {
            user?: JWTPayload;
        }
    }
}

// Authenticate middleware - verifies JWT token
export const authenticate = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new AuthenticationError('No token provided');
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix

        try {
            const decoded = verifyToken(token);
            req.user = decoded;
            next();
        } catch (error) {
            throw new AuthenticationError('Invalid or expired token');
        }
    } catch (error) {
        next(error);
    }
};

// Require admin role
export const requireAdmin = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        if (!req.user) {
            throw new AuthenticationError('Authentication required');
        }

        if (!req.user.isAdmin) {
            throw new AuthorizationError('Admin access required');
        }

        next();
    } catch (error) {
        next(error);
    }
};

// Require KYC approval
export const requireKYCApproved = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        if (!req.user) {
            throw new AuthenticationError('Authentication required');
        }

        if (req.user.kycStatus !== 'APPROVED') {
            throw new AuthorizationError('KYC approval required for this action');
        }

        next();
    } catch (error) {
        next(error);
    }
};

// Optional authentication - doesn't fail if no token
export const optionalAuth = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const authHeader = req.headers.authorization;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            try {
                const decoded = verifyToken(token);
                req.user = decoded;
            } catch (error) {
                logger.warn('Invalid token in optional auth:', error);
            }
        }

        next();
    } catch (error) {
        next(error);
    }
};

export default {
    authenticate,
    requireAdmin,
    requireKYCApproved,
    optionalAuth,
};
