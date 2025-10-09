import { Response, NextFunction } from 'express';
import { AuthRequest, JWTPayload } from '../types';
import { verifyToken, extractToken } from '../utils/auth';

// Authenticate user middleware
export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
    try {
        const token = extractToken(req.headers.authorization);

        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'Access denied. No token provided.',
            });
        }

        const decoded = verifyToken(token);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            error: 'Invalid or expired token.',
        });
    }
}

// Authorize admin middleware
export function authorizeAdmin(req: AuthRequest, res: Response, next: NextFunction) {
    if (!req.user?.isAdmin) {
        return res.status(403).json({
            success: false,
            error: 'Access denied. Admin privileges required.',
        });
    }
    next();
}

// Optional authentication (doesn't fail if no token)
export function optionalAuth(req: AuthRequest, res: Response, next: NextFunction) {
    try {
        const token = extractToken(req.headers.authorization);
        if (token) {
            const decoded = verifyToken(token);
            req.user = decoded;
        }
    } catch (error) {
        // Ignore errors for optional auth
    }
    next();
}
