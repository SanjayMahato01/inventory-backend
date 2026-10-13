import { Router } from 'express';
import {
  getDashboardSummary,
  getInventoryTrend,
} from '../controllers/dashboard.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);

router.get('/summary', getDashboardSummary);
router.get('/inventory-trend', getInventoryTrend);

export default router;