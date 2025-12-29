import { Request } from 'express';
import { PaginationParams, FilterParams } from '../types';

export interface ParsedQuery {
    pagination: PaginationParams;
    filters: FilterParams;
}

export const parsePaginationParams = (req: Request): PaginationParams => {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit as string, 10) || 20, 100); // Max 100 items per page
    const sortBy = (req.query.sortBy as string) || 'id';
    const sortOrder = (req.query.sortOrder as string)?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    return { page, limit, sortBy, sortOrder };
};

export const parseFilterParams = (req: Request, allowedFilters: string[] = []): FilterParams => {
    const filters: FilterParams = {};

    // Search parameter
    if (req.query.search) {
        filters.search = req.query.search as string;
    }

    // Status filter
    if (req.query.status) {
        filters.status = req.query.status as string;
    }

    // Date range filters
    if (req.query.dateFrom) {
        filters.dateFrom = req.query.dateFrom as string;
    }

    if (req.query.dateTo) {
        filters.dateTo = req.query.dateTo as string;
    }

    // Additional custom filters
    allowedFilters.forEach((filter) => {
        if (req.query[filter]) {
            filters[filter] = req.query[filter] as string;
        }
    });

    return filters;
};

export const buildWhereClause = (
    filters: FilterParams,
    searchFields: string[] = []
): { where: string; params: any[] } => {
    const conditions: string[] = [];
    const params: any[] = [];

    // Search across multiple fields
    if (filters.search && searchFields.length > 0) {
        const searchConditions = searchFields.map((field) => `${field} LIKE ?`);
        conditions.push(`(${searchConditions.join(' OR ')})`);
        searchFields.forEach(() => params.push(`%${filters.search}%`));
    }

    // Status filter
    if (filters.status) {
        conditions.push('status = ?');
        params.push(filters.status);
    }

    // Date range filters
    if (filters.dateFrom) {
        conditions.push('DATE(created_at) >= ?');
        params.push(filters.dateFrom);
    }

    if (filters.dateTo) {
        conditions.push('DATE(created_at) <= ?');
        params.push(filters.dateTo);
    }

    // Additional filters
    Object.keys(filters).forEach((key) => {
        if (!['search', 'status', 'dateFrom', 'dateTo'].includes(key)) {
            conditions.push(`${key} = ?`);
            params.push(filters[key]);
        }
    });

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    return { where, params };
};

export const buildPaginationQuery = (
    baseQuery: string,
    pagination: PaginationParams,
    whereClause: string = '',
    params: any[] = []
): { sql: string; params: any[] } => {
    const { page, limit, sortBy, sortOrder } = pagination;
    const offset = (page - 1) * limit;

    const sql = `
    ${baseQuery}
    ${whereClause}
    ORDER BY ${sortBy} ${sortOrder}
    LIMIT ? OFFSET ?
  `;

    return {
        sql: sql.trim(),
        params: [...params, limit, offset],
    };
};

export const buildCountQuery = (
    baseTable: string,
    whereClause: string = ''
): string => {
    return `SELECT COUNT(*) as total FROM ${baseTable} ${whereClause}`;
};

export const calculatePagination = (
    total: number,
    page: number,
    limit: number
) => {
    return {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
    };
};
