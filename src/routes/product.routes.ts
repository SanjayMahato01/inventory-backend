import { Router } from 'express';
import {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  listLowStockProducts,
  countLowStockProducts,
} from '../controllers/product.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);

router.get('/', listProducts);
router.get('/low-stock', listLowStockProducts);           
router.get('/low-stock/count', countLowStockProducts);    
router.post('/', createProduct);


router.get('/:id', getProduct);                          
router.patch('/:id', updateProduct);
router.delete('/:id', deleteProduct);

export default router;