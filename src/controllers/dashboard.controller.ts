import type { Response } from 'express';
import { prisma } from '../lib/prisma';
import type { AuthRequest } from '../middleware/auth.middleware';


export const getDashboardSummary = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const now = new Date();
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

   
    const lowStockRows = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM "Product"
      WHERE "userId" = ${userId} AND quantity <= minimum
    `;
    const lowStockIds = lowStockRows.map((r) => r.id);

    const [
      totalProducts,
      productsLastMonth,
      lowStockItems,
      stockValueAgg,
      stockValueLastMonthAgg,
      movementsThisMonth,
      movementsLastMonth,
    ] = await Promise.all([
      prisma.product.count({ where: { userId } }),

      prisma.product.count({
        where: { userId, createdAt: { lt: startOfThisMonth } },
      }),

      lowStockIds.length,

    
      prisma.$queryRaw<{ total: number | null }[]>`
        SELECT COALESCE(SUM(price * quantity), 0)::float AS total
        FROM "Product"
        WHERE "userId" = ${userId}
      `,

      // Same but as of the start of this month (approximation of last month's value)
      prisma.$queryRaw<{ total: number | null }[]>`
        SELECT COALESCE(SUM(price * quantity), 0)::float AS total
        FROM "Product"
        WHERE "userId" = ${userId} AND "createdAt" < ${startOfThisMonth}
      `,

      prisma.transaction.count({
        where: { userId, createdAt: { gte: startOfThisMonth } },
      }),

      prisma.transaction.count({
        where: {
          userId,
          createdAt: { gte: startOfLastMonth, lt: startOfThisMonth },
        },
      }),
    ]);

    const stockValue = Number(stockValueAgg[0]?.total ?? 0);
    const stockValueLastMonth = Number(stockValueLastMonthAgg[0]?.total ?? 0);

    const pct = (curr: number, prev: number) =>
      prev === 0 ? (curr > 0 ? 100 : 0) : ((curr - prev) / prev) * 100;

    return res.json({
      totalProducts,
      productsChangePct: pct(totalProducts, productsLastMonth),
      lowStockItems,
      stockValue,
      stockValueChangePct: pct(stockValue, stockValueLastMonth),
      movementsThisMonth,
      movementsChangePct: pct(movementsThisMonth, movementsLastMonth),
    });
  } catch (err) {
    console.error('getDashboardSummary error:', err);
    return res.status(500).json({ message: 'Something went wrong' });
  }
};


export const getInventoryTrend = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const days = Math.min(
      365,
      Math.max(7, Number(req.query.days ?? 30) || 30),
    );

    // Current total stock value
    const currentAgg = await prisma.$queryRaw<{ total: number | null }[]>`
      SELECT COALESCE(SUM(price * quantity), 0)::float AS total
      FROM "Product"
      WHERE "userId" = ${userId}
    `;
    const currentValue = Number(currentAgg[0]?.total ?? 0);

    // Net value change per day from transactions.
    // Each IN adds price*quantity, each OUT subtracts price*quantity.
    // We attribute the transaction to the product's current price.
    const dailyChanges = await prisma.$queryRaw<
      { day: Date; delta: number }[]
    >`
      SELECT
        t."createdAt"::date AS day,
        COALESCE(SUM(
          CASE
            WHEN t.type = 'IN' THEN p.price * t.quantity
            ELSE -p.price * t.quantity
          END
        ), 0)::float AS delta
      FROM "Transaction" t
      JOIN "Product" p ON p.id = t."productId"
      WHERE t."userId" = ${userId}
        AND t."createdAt" >= (CURRENT_DATE - (${days}::int - 1) * INTERVAL '1 day')
      GROUP BY t."createdAt"::date
      ORDER BY day ASC
    `;

    const changeByDay = new Map<string, number>();
    for (const row of dailyChanges) {
      const key =
        row.day instanceof Date
          ? row.day.toISOString().slice(0, 10)
          : String(row.day);
      changeByDay.set(key, Number(row.delta));
    }

    // Walk backwards from today to reconstruct each day's value.
    // value(today) = currentValue
    // value(today - 1) = value(today) - change(today)
    const points: { date: string; value: number }[] = [];
    let running = currentValue;

    for (let i = 0; i < days; i++) {
      const d = new Date();
      d.setUTCHours(0, 0, 0, 0);
      d.setUTCDate(d.getUTCDate() - i);
      const key = d.toISOString().slice(0, 10);

      points.push({ date: key, value: Math.max(0, running) });

     
      running -= changeByDay.get(key) ?? 0;
    }

    points.reverse(); // oldest → newest

    return res.json({ days, points });
  } catch (err) {
    console.error('getInventoryTrend error:', err);
    return res.status(500).json({ message: 'Something went wrong' });
  }
};