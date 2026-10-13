import type { Response } from 'express';
import { prisma } from '../lib/prisma';
import type { AuthRequest } from '../middleware/auth.middleware';
import { getPagination } from '../lib/pagination';
import { Prisma } from '@/generated/prisma/client';


export const listProducts = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { page, limit, skip, take } = getPagination(req, 10);
    const search = String(req.query.search ?? '').trim();
    const category = String(req.query.category ?? '').trim();
    const sort = String(req.query.sort ?? 'createdAt');
    const order = req.query.order === 'asc' ? 'asc' : 'desc';

    const where = {
      userId,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { sku: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
      ...(category && { category }),
    };

    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: { [sort]: order },
        skip,
        take,
      }),
      prisma.product.count({ where }),
    ]);

    return res.json({
      items,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error('listProducts error:', err);
    return res.status(500).json({ message: 'Something went wrong' });
  }
};


export const getProduct = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const productId = String(req.params.id);

    const product = await prisma.product.findFirst({
      where: { id: productId, userId },
    });
    if (!product) return res.status(404).json({ message: 'Product not found' });
    return res.json({ product });
  } catch (err) {
    console.error('getProduct error:', err);
    return res.status(500).json({ message: 'Something went wrong' });
  }
};


export const createProduct = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { name, sku, category, price, quantity, minimum, remarks } = req.body;

    if (!name || !sku) {
      return res.status(400).json({ message: 'Name and SKU are required' });
    }


    const existing = await prisma.product.findFirst({
      where: { sku, userId },
    });
    if (existing) {
      return res.status(409).json({ message: 'SKU already in use' });
    }

    const product = await prisma.product.create({
      data: {
        name,
        sku,
        category: category ?? null,
        price: Number(price) || 0,
        quantity: Number(quantity) || 0,
        minimum: Number(minimum) || 0,
        remarks: remarks ?? null,
        userId,
      },
    });

    if (product.quantity > 0) {
      await prisma.transaction.create({
        data: {
          type: 'IN',
          quantity: product.quantity,
          note: 'Initial stock',
          productId: product.id,
          userId,
        },
      });
    }

    return res.status(201).json({ product });
  } catch (err) {
    console.error('createProduct error:', err);
    return res.status(500).json({ message: 'Something went wrong' });
  }
};


export const updateProduct = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const productId = String(req.params.id);
    const { name, sku, category, price, quantity, minimum, remarks } = req.body;

    const existing = await prisma.product.findFirst({
      where: { id: productId, userId },
    });
    if (!existing) return res.status(404).json({ message: 'Product not found' });

    if (sku && sku !== existing.sku) {
      const clash = await prisma.product.findFirst({
        where: { sku, userId },
      });
      if (clash) return res.status(409).json({ message: 'SKU already in use' });
    }

    const nextQuantity =
      quantity !== undefined ? Number(quantity) : existing.quantity;
    const delta = nextQuantity - existing.quantity;

    const product = await prisma.$transaction(async (tx) => {
      const updated = await tx.product.update({
        where: { id: existing.id },
        data: {
          ...(name !== undefined && { name }),
          ...(sku !== undefined && { sku }),
          ...(category !== undefined && { category }),
          ...(price !== undefined && { price: Number(price) }),
          ...(quantity !== undefined && { quantity: nextQuantity }),
          ...(minimum !== undefined && { minimum: Number(minimum) }),
          ...(remarks !== undefined && { remarks }),
        },
      });

      if (delta !== 0) {
        await tx.transaction.create({
          data: {
            type: delta > 0 ? 'IN' : 'OUT',
            quantity: Math.abs(delta),
            note: delta > 0 ? 'Stock increased (manual update)' : 'Stock decreased (manual update)',
            productId: updated.id,
            userId,
          },
        });
      }

      return updated;
    });

    return res.json({ product });
  } catch (err) {
    console.error('updateProduct error:', err);
    return res.status(500).json({ message: 'Something went wrong' });
  }
};

export const deleteProduct = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const productId = String(req.params.id);
    const existing = await prisma.product.findFirst({
      where: { id: productId, userId },
    });
    if (!existing) return res.status(404).json({ message: 'Product not found' });

    await prisma.product.delete({ where: { id: existing.id } });
    return res.json({ success: true });
  } catch (err) {
    console.error('deleteProduct error:', err);
    return res.status(500).json({ message: 'Something went wrong' });
  }
};

export const listLowStockProducts = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { page, limit, skip, take } = getPagination(req, 10);

    const search = String(req.query.search ?? '').trim();
    const category = String(req.query.category ?? '').trim();

    const ALLOWED_SORT = [
      'name',
      'sku',
      'category',
      'price',
      'quantity',
      'minimum',
      'createdAt',
      'updatedAt',
    ] as const;

    const rawSort = String(req.query.sort ?? 'quantity');
    const sort = (ALLOWED_SORT as readonly string[]).includes(rawSort)
      ? (rawSort as (typeof ALLOWED_SORT)[number])
      : 'quantity';
    const order = req.query.order === 'asc' ? 'asc' : 'desc';

    // Low-stock IDs via raw SQL (no fieldReference preview needed)
    const lowStockIds = (
      await prisma.$queryRaw<{ id: string }[]>`
        SELECT id FROM "Product"
        WHERE "userId" = ${userId} AND quantity <= minimum
      `
    ).map((r) => r.id);

    if (lowStockIds.length === 0) {
      return res.json({ items: [], page, limit, total: 0, totalPages: 0 });
    }

    const where: Prisma.ProductWhereInput = {
      userId,
      id: { in: lowStockIds },
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { sku: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(category && { category }),
    };

    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: { [sort]: order },
        skip,
        take,
      }),
      prisma.product.count({ where }),
    ]);

    return res.json({
      items,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error('listLowStockProducts error:', err);
    return res.status(500).json({ message: 'Something went wrong' });
  }
};

export const countLowStockProducts = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const count = await prisma.product.count({
      where: {
        userId,
        quantity: {
          lte: prisma.product.fields.minimum,
        },
      },
    });

    return res.json({ count });
  } catch (err) {
    console.error('countLowStockProducts error:', err);
    return res.status(500).json({ message: 'Something went wrong' });
  }
};