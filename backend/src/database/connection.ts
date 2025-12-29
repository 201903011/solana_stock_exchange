import mysql from 'mysql2/promise';
import { config } from '../config';
import logger from '../utils/logger';

let pool: mysql.Pool | null = null;

export const createPool = (): mysql.Pool => {
    if (pool) {
        return pool;
    }

    pool = mysql.createPool(config.database);

    logger.info('Database connection pool created');

    return pool;
};

export const getPool = (): mysql.Pool => {
    if (!pool) {
        return createPool();
    }
    return pool;
};

export const query = async <T = any>(
    sql: string,
    params?: any[]
): Promise<T> => {
    const connection = getPool();
    try {
        const [results] = await connection.execute(sql, params);
        return results as T;
    } catch (error) {
        logger.error('Database query error:', error);
        throw error;
    }
};

export const getConnection = async (): Promise<mysql.PoolConnection> => {
    return getPool().getConnection();
};

export const closePool = async (): Promise<void> => {
    if (pool) {
        await pool.end();
        pool = null;
        logger.info('Database connection pool closed');
    }
};

export default {
    createPool,
    getPool,
    query,
    getConnection,
    closePool,
};
