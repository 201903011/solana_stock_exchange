import mysql from 'mysql2/promise';
import { config } from '../config';

// Create connection pool
export const pool = mysql.createPool(config.database);

// Test database connection
export async function testConnection(): Promise<void> {
    try {
        const connection = await pool.getConnection();
        console.log('✅ Database connected successfully');
        connection.release();
    } catch (error) {
        console.error('❌ Database connection failed:', error);
        throw error;
    }
}

// Execute query helper
export async function query<T = any>(sql: string, params?: any[]): Promise<T[]> {
    try {
        const [rows] = await pool.execute(sql, params);
        return rows as T[];
    } catch (error) {
        console.error('Database query error:', error);
        throw error;
    }
}

// Execute query with single result
export async function queryOne<T = any>(sql: string, params?: any[]): Promise<T | null> {
    const rows = await query<T>(sql, params);
    return rows.length > 0 ? rows[0] : null;
}

// Begin transaction
export async function beginTransaction() {
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    return connection;
}

export default pool;
