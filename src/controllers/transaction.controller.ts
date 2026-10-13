import type { Response } from 'express';
import { prisma } from '../lib/prisma';
import type { AuthRequest } from '../middleware/auth.middleware';
import { getPagination } from '../lib/pagination';


export const listTransactions = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { page, limit, skip, take } = getPagination(req, 20);
    const productId = String(req.query.productId ?? '').trim();
    const type = String(req.query.type ?? '').trim().toUpperCase();

    const where = {
      userId,
      ...(productId && { productId }),
      ...(type === 'IN' || type === 'OUT' ? { type: type as 'IN' | 'OUT' } : {}),
    };

  const [items, total] = await Promise.all([
  prisma.transaction.findMany({
    where,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    skip,
    take,
    include: {
      product: { select: { id: true, name: true, sku: true } },
      user: { select: { id: true, name: true, email: true } }, // ← add this
    },
  }),
  prisma.transaction.count({ where }),
]);

    return res.json({
      items,
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
    });
  } catch (err) {
    console.error('listTransactions error:', err);
    return res.status(500).json({ message: 'Something went wrong' });
  }
};


export const createTransaction = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { productId, type, quantity, note } = req.body;

    if (!productId || !type || !quantity) {
      return res
        .status(400)
        .json({ message: 'productId, type, and quantity are required' });
    }

    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty <= 0) {
      return res.status(400).json({ message: 'Quantity must be a positive integer' });
    }

    const t = String(type).toUpperCase();
    if (t !== 'IN' && t !== 'OUT') {
      return res.status(400).json({ message: 'Type must be IN or OUT' });
    }

    const product = await prisma.product.findFirst({
      where: { id: productId, userId },
    });
    if (!product) return res.status(404).json({ message: 'Product not found' });

    if (t === 'OUT' && product.quantity < qty) {
      return res.status(400).json({ message: 'Not enough stock' });
    }

    // Atomic: update product and create transaction together
    const [updated, transaction] = await prisma.$transaction([
      prisma.product.update({
        where: { id: product.id },
        data: {
          quantity: t === 'IN' ? { increment: qty } : { decrement: qty },
        },
      }),
      prisma.transaction.create({
        data: {
          type: t as 'IN' | 'OUT',
          quantity: qty,
          note: note ?? null,
          productId: product.id,
          userId,
        },
      }),
    ]);

    return res.status(201).json({ transaction, product: updated });
  } catch (err) {
    console.error('createTransaction error:', err);
    return res.status(500).json({ message: 'Something went wrong' });
  }
};