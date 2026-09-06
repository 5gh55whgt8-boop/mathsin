import { Router } from 'express';
import Scan from '../models/Scan.js';
import User from '../models/User.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import Ticket from '../models/Ticket.js';
import { env } from '../config/env.js';
import { trialState } from '../services/entitlements.js';

const router = Router();
router.use(requireAuth);
router.get('/stats', async (req, res, next) => {
  try {
    const [scans, favorites, questions] = await Promise.all([
      Scan.countDocuments({ user: req.user._id }),
      Scan.countDocuments({ user: req.user._id, favorite: true }),
      Scan.aggregate([{ $match: { user: req.user._id } }, { $project: { count: { $size: '$questions' } } }, { $group: { _id: null, total: { $sum: '$count' } } }])
    ]);
    res.json({ scans, favorites, questions: questions[0]?.total || 0, plan: req.user.plan, usage: req.user.usage, trial: trialState(req.user), subscription: req.user.subscription });
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
router.get('/admin/overview', requireAdmin, async (req, res, next) => {
  try {
    const now = new Date();
    const [totalUsers, paidUsers, tickets, users] = await Promise.all([
      User.countDocuments({ role: 'user' }), User.countDocuments({ 'subscription.status': 'active' }), Ticket.countDocuments({ status: { $ne: 'resolved' } }),
      User.find({ role: 'user' }).select('-passwordHash').sort({ createdAt: -1 }).limit(200)
    ]);
    const trialUsers = users.filter(user => user.subscription?.status !== 'active' && !trialState(user).expired).length;
    const expiredUsers = users.filter(user => user.subscription?.status !== 'active' && trialState(user).expired).length;
    res.json({ summary: { totalUsers, paidUsers, trialUsers, expiredUsers, openTickets: tickets }, users: users.map(user => ({ id: user._id, name: user.name, email: user.email, plan: user.plan, usage: user.usage, trial: trialState(user), subscription: user.subscription, createdAt: user.createdAt })) });
  } catch (e) { next(e); }
});
router.patch('/admin/users/:userId/trial', requireAdmin, async (req, res, next) => {
  try {
    const days = Math.max(1, Math.min(365, Number(req.body.days || 7)));
    const scanLimit = Math.max(1, Math.min(10000, Number(req.body.scanLimit || env.freeScanLimit)));
    const expiresAt = new Date(); expiresAt.setDate(expiresAt.getDate() + days);
    const user = await User.findByIdAndUpdate(req.params.userId, { plan: 'free', 'trial.expiresAt': expiresAt, 'trial.scanLimit': scanLimit, 'subscription.status': 'trialing' }, { new: true }).select('-passwordHash');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user: { id: user._id, trial: trialState(user), subscription: user.subscription, plan: user.plan } });
  } catch (e) { next(e); }
});
router.post('/tickets', async (req, res, next) => {
  try {
    const { subject, message } = req.body;
    if (!subject?.trim() || !message?.trim()) return res.status(400).json({ error: 'Subject and message are required' });
    const ticket = await Ticket.create({ user: req.user._id, subject, message });
    res.status(201).json({ ticket });
  } catch (e) { next(e); }
});
router.get('/tickets', async (req, res, next) => {
  try {
    const filter = req.user.role === 'admin' ? {} : { user: req.user._id };
    const tickets = await Ticket.find(filter).populate('user', 'name email').sort({ updatedAt: -1 }).limit(200);
    res.json({ tickets });
  } catch (e) { next(e); }
});
router.patch('/admin/tickets/:ticketId', requireAdmin, async (req, res, next) => {
  try {
    const patch = {}; if (['open', 'in_progress', 'resolved'].includes(req.body.status)) patch.status = req.body.status; if (typeof req.body.adminReply === 'string') patch.adminReply = req.body.adminReply;
    const ticket = await Ticket.findByIdAndUpdate(req.params.ticketId, patch, { new: true }).populate('user', 'name email');
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    res.json({ ticket });
  } catch (e) { next(e); }
});
export default router;
