import type { Request } from 'express';

export interface Pagination {
  page: number;
  limit: number;
  skip: number;
  take: number;
}

export function getPagination(req: Request, defaultLimit = 10): Pagination {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || defaultLimit));
  return { page, limit, skip: (page - 1) * limit, take: limit };
}