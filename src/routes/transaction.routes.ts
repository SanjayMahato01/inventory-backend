import { Router } from 'express';
import {
  listTransactions,
  createTransaction,
} from '../controllers/transaction.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);

router.get('/', listTransactions);
router.post('/', createTransaction);

export default router;