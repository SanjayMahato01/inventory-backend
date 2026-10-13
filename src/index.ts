import express, { Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { connectDB } from './config/db';
import { env } from './config/env';
import { logger } from './lib/logger';
import { requestLogger } from './middleware/requestLogger';
import authRoutes from './routes/auth.routes';
import productRoutes from './routes/product.routes';
import transactionRoutes from './routes/transaction.routes'
import dashboardRouter from './routes/dashboard.routes';

const app = express();
const PORT = env.PORT ?? 5000;

app.use(requestLogger);

app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get('/health', (_req: Request, res: Response) => {
  res.json({ ok: true });
});

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/dashboard', dashboardRouter);

app.use((_req: Request, res: Response) => {
  res.status(404).json({ message: 'Route not found' });
});

app.use(
  (err: Error, _req: Request, res: Response, _next: express.NextFunction) => {
    logger.error({ err }, 'Unhandled error');
    res.status(500).json({ message: 'Something went wrong' });
  }
);

async function startServer() {
  try {
    await connectDB();
    app.listen(PORT, () => {
      logger.info(`Server running at http://localhost:${PORT}`);
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to start server');
    process.exit(1);
  }
}

startServer();

export { app };