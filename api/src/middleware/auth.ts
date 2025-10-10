import { Response, NextFunction } from 'express';
import { AuthRequest, JWTPayload } from '../types';
import { verifyToken, extractToken } from '../utils/auth';

// Authenticate user middleware
export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
    try {
        const token = extractToken(req.headers.authorization);

        if (!token) {
            res.status(401).json({
                success: false,
                error: 'Access denied. No token provided.',
            });
            return;
        }

        const decoded = verifyToken(token);
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({
            success: false,
            error: 'Invalid or expired token.',
        });
        return;
    }
}

// Authorize admin middleware
export function authorizeAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
    if (!req.user?.isAdmin) {
        res.status(403).json({
            success: false,
            error: 'Access denied. Admin privileges required.',
        });
        return;
    }
    next();
}

// Optional authentication (doesn't fail if no token)
export function optionalAuth(req: AuthRequest, res: Response, next: NextFunction): void {
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
