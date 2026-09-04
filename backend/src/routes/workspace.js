import { Router } from 'express';
import Scan from '../models/Scan.js';
import User from '../models/User.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);
router.get('/stats', async (req, res, next) => {
  try {
    const [scans, favorites, questions] = await Promise.all([
      Scan.countDocuments({ user: req.user._id }),
      Scan.countDocuments({ user: req.user._id, favorite: true }),
      Scan.aggregate([{ $match: { user: req.user._id } }, { $project: { count: { $size: '$questions' } } }, { $group: { _id: null, total: { $sum: '$count' } } }])
    ]);
    res.json({ scans, favorites, questions: questions[0]?.total || 0, plan: req.user.plan, usage: req.user.usage });
  } catch (e) { next(e); }
});
router.patch('/plan/:userId', requireAdmin, async (req, res, next) => {
  try {
    if (!['free','pro','institution'].includes(req.body.plan)) return res.status(400).json({ error: 'Invalid plan' });
    const user = await User.findByIdAndUpdate(req.params.userId, { plan: req.body.plan }, { new: true }).select('-passwordHash');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (e) { next(e); }
});
export default router;
