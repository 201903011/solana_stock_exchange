import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { JWTPayload, User } from '../types';
import ms from 'ms';

const SALT_ROUNDS = 10;

// Hash password
export const hashPassword = async (password: string): Promise<string> => {
    return bcrypt.hash(password, SALT_ROUNDS);
};

// Compare password
export const comparePassword = async (
    password: string,
    hashedPassword: string
): Promise<boolean> => {
    return bcrypt.compare(password, hashedPassword);
};

// Generate JWT token
export const generateToken = (payload: Omit<JWTPayload, 'iat' | 'exp'>): string => {
    return jwt.sign(payload, config.jwt.secret as string, {
        expiresIn: config.jwt.expiresIn as ms.StringValue,
    });
};

// Verify JWT token
export const verifyToken = (token: string): JWTPayload => {
    return jwt.verify(token, config.jwt.secret) as JWTPayload;
};

// Generate token hash for session storage
export const generateTokenHash = (token: string): string => {
    return bcrypt.hashSync(token, 8);
};

// Create JWT payload from user
export const createJWTPayload = (user: User): Omit<JWTPayload, 'iat' | 'exp'> => {
    return {
        userId: user.id,
        email: user.email,
        walletAddress: user.wallet_address,
        isAdmin: user.is_admin,
        kycStatus: user.kyc_status,
    };
};

// Validate email format
export const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

// Validate password strength
export const isStrongPassword = (password: string): {
    isValid: boolean;
    errors: string[];
} => {
    const errors: string[] = [];

    if (password.length < 8) {
        errors.push('Password must be at least 8 characters long');
    }

    if (!/[A-Z]/.test(password)) {
        errors.push('Password must contain at least one uppercase letter');
    }

    if (!/[a-z]/.test(password)) {
        errors.push('Password must contain at least one lowercase letter');
    }

    if (!/[0-9]/.test(password)) {
        errors.push('Password must contain at least one number');
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        errors.push('Password must contain at least one special character');
    }

    return {
        isValid: errors.length === 0,
        errors,
    };
};

// Validate phone number (Indian format)
export const isValidPhoneNumber = (phone: string): boolean => {
    const phoneRegex = /^[6-9]\d{9}$/;
    return phoneRegex.test(phone.replace(/[\s-]/g, ''));
};

export default {
    hashPassword,
    comparePassword,
    generateToken,
    verifyToken,
    generateTokenHash,
    createJWTPayload,
    isValidEmail,
    isStrongPassword,
    isValidPhoneNumber,
};
