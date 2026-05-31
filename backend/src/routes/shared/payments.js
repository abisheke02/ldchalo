const router   = require('express').Router();
const crypto   = require('crypto');
const { v4: uuid } = require('uuid');
const { query } = require('../../config/database');
const { requireAuth } = require('../../middleware/auth');
const env      = require('../../config/env');

// Create Razorpay order
router.post('/order', requireAuth, async (req, res, next) => {
  try {
    if (!env.razorpay.keyId) return res.status(503).json({ error: 'Payments not configured' });
    const Razorpay = require('razorpay');
    const rzp      = new Razorpay({ key_id: env.razorpay.keyId, key_secret: env.razorpay.keySecret });
    const { amount, currency = 'INR', planType = 'pro' } = req.body;

    const order = await rzp.orders.create({ amount: amount * 100, currency, receipt: uuid() });
    await query(
      `INSERT INTO payment_orders (id, user_id, razorpay_order_id, amount, currency, status)
       VALUES ($1,$2,$3,$4,$5,'created')`,
      [uuid(), req.user.id, order.id, amount, currency]
    );
    res.json({ orderId: order.id, amount, currency, keyId: env.razorpay.keyId });
  } catch (err) { next(err); }
});

// Verify payment
router.post('/verify', requireAuth, async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const expected = crypto
      .createHmac('sha256', env.razorpay.keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expected !== razorpay_signature) return res.status(400).json({ error: 'Signature mismatch' });

    await query(
      `UPDATE payment_orders SET status='paid', razorpay_payment_id=$1 WHERE razorpay_order_id=$2`,
      [razorpay_payment_id, razorpay_order_id]
    );
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// Razorpay webhook
router.post('/webhook', async (req, res) => {
  const sig = req.headers['x-razorpay-signature'];
  const raw = JSON.stringify(req.body);
  const mac = crypto.createHmac('sha256', env.razorpay.webhookSecret).update(raw).digest('hex');
  if (mac !== sig) return res.status(400).json({ error: 'Invalid signature' });

  const { event, payload } = req.body;
  if (event === 'payment.captured') {
    await query(
      `UPDATE payment_orders SET status='paid' WHERE razorpay_order_id=$1`,
      [payload.payment.entity.order_id]
    ).catch(() => {});
  }
  res.json({ ok: true });
});

module.exports = router;
