import { Router } from 'express';
import crypto from 'crypto';
import Payment from '../models/Payment.js';
import User from '../models/User.js';
import { env } from '../config/env.js';
import { requireAuth } from '../middleware/auth.js';
import { trialState } from '../services/entitlements.js';

const router = Router();
router.use(requireAuth);
router.get('/status', (req, res) => res.json({ plan: req.user.plan, subscription: req.user.subscription, trial: trialState(req.user), checkoutEnabled: Boolean(env.razorpayKeyId && env.razorpayKeySecret), price: { amount: env.proMonthlyAmount, currency: env.proCurrency, interval: 'month' } }));
router.post('/orders', async (req, res, next) => {
  try {
    if (!env.razorpayKeyId || !env.razorpayKeySecret) return res.status(503).json({ error: 'Payments are not configured yet. Contact support.' });
    const receipt = `ml_${req.user._id}_${Date.now()}`.slice(0, 40);
    const auth = Buffer.from(`${env.razorpayKeyId}:${env.razorpayKeySecret}`).toString('base64');
    const response = await fetch('https://api.razorpay.com/v1/orders', { method: 'POST', headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: env.proMonthlyAmount, currency: env.proCurrency, receipt, notes: { userId: req.user._id.toString(), product: 'MathLens Pro monthly' } }) });
    const order = await response.json();
    if (!response.ok) return res.status(502).json({ error: order.error?.description || 'Could not create payment order' });
    await Payment.create({ user: req.user._id, razorpayOrderId: order.id, amount: order.amount, currency: order.currency });
    res.status(201).json({ keyId: env.razorpayKeyId, order, name: env.appName, description: 'MathLens Pro — monthly access' });
  } catch (e) { next(e); }
});
router.post('/verify', async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) return res.status(400).json({ error: 'Incomplete payment details' });
    const expected = crypto.createHmac('sha256', env.razorpayKeySecret || '').update(`${razorpay_order_id}|${razorpay_payment_id}`).digest('hex');
    const received = Buffer.from(razorpay_signature);
    if (received.length !== Buffer.byteLength(expected) || !crypto.timingSafeEqual(Buffer.from(expected), received)) return res.status(400).json({ error: 'Payment signature is invalid' });
    const payment = await Payment.findOneAndUpdate({ razorpayOrderId: razorpay_order_id, user: req.user._id, status: 'created' }, { status: 'paid', razorpayPaymentId: razorpay_payment_id }, { new: true });
    if (!payment) return res.status(404).json({ error: 'Payment order not found or already processed' });
    const periodEnd = new Date(); periodEnd.setMonth(periodEnd.getMonth() + 1);
    const user = await User.findByIdAndUpdate(req.user._id, { plan: 'pro', subscription: { status: 'active', provider: 'razorpay', paymentId: razorpay_payment_id, orderId: razorpay_order_id, currentPeriodEnd: periodEnd } }, { new: true });
    res.json({ user: { id: user._id, plan: user.plan, subscription: user.subscription } });
  } catch (e) { next(e); }
});
export default router;
