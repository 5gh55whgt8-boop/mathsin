import { Router } from 'express';
import User from '../models/User.js';
import { requireAuth } from '../middleware/auth.js';
import { aiAction } from '../services/openai.js';

const router = Router();
router.use(requireAuth);
router.post('/action', async (req, res, next) => {
  try {
    const result = await aiAction(req.body);
    await User.updateOne({ _id: req.user._id }, { $inc: { 'usage.aiActions': 1 } });
    res.json(result);
  } catch (e) { next(e); }
});
export default router;
