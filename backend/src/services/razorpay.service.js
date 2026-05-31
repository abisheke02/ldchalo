/**
 * @fileoverview Razorpay Payment Integration Service
 * @description Handles payment order creation, verification, refunds,
 * and payment status retrieval for online fee collection.
 * 
 * Environment Variables Required:
 * - RAZORPAY_KEY_ID: Razorpay API key ID
 * - RAZORPAY_KEY_SECRET: Razorpay API key secret
 * - RAZORPAY_WEBHOOK_SECRET: Webhook signature verification secret
 * - RAZORPAY_CURRENCY: Currency code (default: 'INR')
 * 
 * @module services/razorpay.service
 */

'use strict';

const Razorpay = require('razorpay');
const crypto = require('crypto');

/**
 * Razorpay configuration
 * @constant {Object}
 */
const CONFIG = {
  keyId: process.env.RAZORPAY_KEY_ID,
  keySecret: process.env.RAZORPAY_KEY_SECRET,
  webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET,
  currency: process.env.RAZORPAY_CURRENCY || 'INR',
};

/**
 * Razorpay client instance (lazy initialized)
 * @type {Razorpay|null}
 */
let razorpayInstance = null;

/**
 * Gets or creates the Razorpay client instance
 * @returns {Razorpay} Razorpay client
 * @throws {Error} If API credentials are not configured
 */
function getClient() {
  if (!razorpayInstance) {
    if (!CONFIG.keyId || !CONFIG.keySecret) {
      throw new Error('Razorpay API credentials are not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET environment variables.');
    }
    razorpayInstance = new Razorpay({
      key_id: CONFIG.keyId,
      key_secret: CONFIG.keySecret,
    });
  }
  return razorpayInstance;
}

/**
 * Creates a Razorpay payment order
 * 
 * Amount is specified in the smallest currency unit (paise for INR).
 * For ₹500, pass amount as 50000.
 * 
 * @param {number} amount - Payment amount in paise (smallest currency unit)
 * @param {string} receipt - Unique receipt ID (maps to your internal receipt number)
 * @param {Object} [notes={}] - Additional metadata (max 15 key-value pairs, 256 chars each)
 * @param {Object} [options={}] - Additional order options
 * @param {string} [options.currency] - Currency code override (default: INR)
 * @param {boolean} [options.partial_payment] - Allow partial payments (default: false)
 * @returns {Promise<Object>} Razorpay order object with id, amount, status
 * 
 * @example
 * const order = await createOrder(500000, 'REC/2026/001234', {
 *   student_id: '42',
 *   student_name: 'Rahul Sharma',
 *   fee_heads: 'Tuition Fee, Computer Fee',
 *   school_id: '1',
 * });
 * // Returns: { success: true, order: { id: 'order_xxx', amount: 500000, ... } }
 */
async function createOrder(amount, receipt, notes = {}, options = {}) {
  try {
    // Validate amount
    if (!amount || amount <= 0) {
      return {
        success: false,
        error: 'Amount must be a positive number (in paise)',
      };
    }

    if (!receipt) {
      return {
        success: false,
        error: 'Receipt ID is required',
      };
    }

    const client = getClient();

    const orderParams = {
      amount: Math.round(amount), // Ensure integer (paise)
      currency: options.currency || CONFIG.currency,
      receipt: String(receipt).substring(0, 40), // Max 40 chars
      notes: sanitizeNotes(notes),
      partial_payment: options.partial_payment || false,
    };

    const order = await client.orders.create(orderParams);

    return {
      success: true,
      order: {
        id: order.id,
        amount: order.amount,
        amount_due: order.amount_due,
        amount_paid: order.amount_paid,
        currency: order.currency,
        receipt: order.receipt,
        status: order.status,
        created_at: order.created_at,
      },
      // Return key_id for frontend SDK initialization
      key_id: CONFIG.keyId,
    };
  } catch (error) {
    console.error('[Razorpay] Order creation failed:', error.message);
    return {
      success: false,
      error: error.error?.description || error.message,
      code: error.statusCode || 'ORDER_CREATION_FAILED',
    };
  }
}

/**
 * Verifies a Razorpay payment signature
 * 
 * After successful payment on the client side, the frontend sends back
 * razorpay_order_id, razorpay_payment_id, and razorpay_signature.
 * This function verifies the signature to confirm payment authenticity.
 * 
 * @param {string} orderId - Razorpay order ID (order_xxx)
 * @param {string} paymentId - Razorpay payment ID (pay_xxx)
 * @param {string} signature - Razorpay signature from checkout response
 * @returns {Object} Verification result
 * 
 * @example
 * const result = verifyPayment('order_xxx', 'pay_yyy', 'signature_zzz');
 * if (result.success) {
 *   // Payment is verified — update fee collection record
 * }
 */
function verifyPayment(orderId, paymentId, signature) {
  try {
    if (!orderId || !paymentId || !signature) {
      return {
        success: false,
        verified: false,
        error: 'Order ID, Payment ID, and Signature are all required',
      };
    }

    // Generate expected signature
    const expectedSignature = crypto
      .createHmac('sha256', CONFIG.keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    // Compare signatures (timing-safe comparison)
    const isValid = crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );

    if (isValid) {
      return {
        success: true,
        verified: true,
        orderId,
        paymentId,
      };
    }

    return {
      success: false,
      verified: false,
      error: 'Payment signature verification failed. Possible tampering detected.',
    };
  } catch (error) {
    console.error('[Razorpay] Signature verification error:', error.message);
    return {
      success: false,
      verified: false,
      error: 'Signature verification failed: ' + error.message,
    };
  }
}

/**
 * Retrieves payment details from Razorpay
 * 
 * @param {string} paymentId - Razorpay payment ID (pay_xxx)
 * @returns {Promise<Object>} Payment details including status, method, and amount
 * 
 * @example
 * const details = await getPaymentDetails('pay_xxx');
 * // Returns: { success: true, payment: { id, amount, status, method, ... } }
 */
async function getPaymentDetails(paymentId) {
  try {
    if (!paymentId) {
      return { success: false, error: 'Payment ID is required' };
    }

    const client = getClient();
    const payment = await client.payments.fetch(paymentId);

    return {
      success: true,
      payment: {
        id: payment.id,
        order_id: payment.order_id,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        method: payment.method,
        description: payment.description,
        email: payment.email,
        contact: payment.contact,
        fee: payment.fee,
        tax: payment.tax,
        error_code: payment.error_code,
        error_description: payment.error_description,
        created_at: payment.created_at,
        captured: payment.captured,
        card_id: payment.card_id,
        bank: payment.bank,
        wallet: payment.wallet,
        vpa: payment.vpa,
        notes: payment.notes,
      },
    };
  } catch (error) {
    console.error('[Razorpay] Fetch payment failed:', error.message);
    return {
      success: false,
      error: error.error?.description || error.message,
      code: error.statusCode || 'FETCH_FAILED',
    };
  }
}

/**
 * Processes a refund for a payment
 * 
 * @param {string} paymentId - Razorpay payment ID to refund (pay_xxx)
 * @param {number} [amount] - Refund amount in paise (omit for full refund)
 * @param {Object} [options={}] - Additional refund options
 * @param {string} [options.speed] - 'normal' or 'optimum' (default: 'normal')
 * @param {Object} [options.notes] - Refund notes/metadata
 * @param {string} [options.receipt] - Refund receipt ID
 * @returns {Promise<Object>} Refund details
 * 
 * @example
 * // Full refund
 * const refund = await processRefund('pay_xxx');
 * 
 * // Partial refund of ₹500
 * const partialRefund = await processRefund('pay_xxx', 50000, {
 *   notes: { reason: 'Excess payment', approved_by: 'admin' }
 * });
 */
async function processRefund(paymentId, amount, options = {}) {
  try {
    if (!paymentId) {
      return { success: false, error: 'Payment ID is required' };
    }

    const client = getClient();

    const refundParams = {};
    if (amount) {
      refundParams.amount = Math.round(amount); // Partial refund amount in paise
    }
    if (options.speed) {
      refundParams.speed = options.speed;
    }
    if (options.notes) {
      refundParams.notes = sanitizeNotes(options.notes);
    }
    if (options.receipt) {
      refundParams.receipt = String(options.receipt).substring(0, 40);
    }

    const refund = await client.payments.refund(paymentId, refundParams);

    return {
      success: true,
      refund: {
        id: refund.id,
        payment_id: refund.payment_id,
        amount: refund.amount,
        currency: refund.currency,
        status: refund.status,
        speed_requested: refund.speed_requested,
        speed_processed: refund.speed_processed,
        receipt: refund.receipt,
        notes: refund.notes,
        created_at: refund.created_at,
      },
    };
  } catch (error) {
    console.error('[Razorpay] Refund failed:', error.message);
    return {
      success: false,
      error: error.error?.description || error.message,
      code: error.statusCode || 'REFUND_FAILED',
    };
  }
}

/**
 * Gets the status/details of a refund
 * 
 * @param {string} paymentId - Payment ID the refund belongs to
 * @param {string} refundId - Refund ID (rfnd_xxx)
 * @returns {Promise<Object>} Refund status
 */
async function getRefundStatus(paymentId, refundId) {
  try {
    const client = getClient();
    const refund = await client.payments.fetchRefund(paymentId, refundId);

    return {
      success: true,
      refund: {
        id: refund.id,
        payment_id: refund.payment_id,
        amount: refund.amount,
        status: refund.status,
        speed_processed: refund.speed_processed,
        created_at: refund.created_at,
      },
    };
  } catch (error) {
    console.error('[Razorpay] Fetch refund failed:', error.message);
    return {
      success: false,
      error: error.error?.description || error.message,
    };
  }
}

/**
 * Verifies a Razorpay webhook signature
 * 
 * Use this to validate incoming webhook events from Razorpay.
 * 
 * @param {string|Buffer} body - Raw request body (as string or buffer)
 * @param {string} signature - X-Razorpay-Signature header value
 * @returns {boolean} Whether the webhook signature is valid
 * 
 * @example
 * // In webhook route handler
 * app.post('/payments/webhook', express.raw({ type: 'application/json' }), (req, res) => {
 *   const isValid = verifyWebhookSignature(req.body, req.headers['x-razorpay-signature']);
 *   if (!isValid) return res.status(400).send('Invalid signature');
 *   // Process webhook event...
 * });
 */
function verifyWebhookSignature(body, signature) {
  try {
    if (!CONFIG.webhookSecret) {
      console.error('[Razorpay] Webhook secret not configured');
      return false;
    }

    const bodyString = typeof body === 'string' ? body : body.toString();
    const expectedSignature = crypto
      .createHmac('sha256', CONFIG.webhookSecret)
      .update(bodyString)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    console.error('[Razorpay] Webhook signature verification error:', error.message);
    return false;
  }
}

/**
 * Fetches all payments for an order
 * 
 * @param {string} orderId - Razorpay order ID
 * @returns {Promise<Object>} Payments associated with the order
 */
async function getOrderPayments(orderId) {
  try {
    if (!orderId) {
      return { success: false, error: 'Order ID is required' };
    }

    const client = getClient();
    const payments = await client.orders.fetchPayments(orderId);

    return {
      success: true,
      payments: payments.items || payments,
    };
  } catch (error) {
    console.error('[Razorpay] Fetch order payments failed:', error.message);
    return {
      success: false,
      error: error.error?.description || error.message,
    };
  }
}

/**
 * Captures an authorized payment (if auto-capture is disabled)
 * 
 * @param {string} paymentId - Payment ID to capture
 * @param {number} amount - Amount to capture in paise
 * @returns {Promise<Object>} Capture result
 */
async function capturePayment(paymentId, amount) {
  try {
    const client = getClient();
    const payment = await client.payments.capture(paymentId, amount, CONFIG.currency);

    return {
      success: true,
      payment: {
        id: payment.id,
        status: payment.status,
        amount: payment.amount,
        captured: payment.captured,
      },
    };
  } catch (error) {
    console.error('[Razorpay] Capture failed:', error.message);
    return {
      success: false,
      error: error.error?.description || error.message,
    };
  }
}

/**
 * Sanitizes notes object for Razorpay API (max 15 keys, 256 chars each)
 * @param {Object} notes - Raw notes object
 * @returns {Object} Sanitized notes
 */
function sanitizeNotes(notes) {
  if (!notes || typeof notes !== 'object') return {};

  const sanitized = {};
  const entries = Object.entries(notes).slice(0, 15); // Max 15 keys

  for (const [key, value] of entries) {
    sanitized[key.substring(0, 40)] = String(value || '').substring(0, 256);
  }

  return sanitized;
}

/**
 * Converts rupees to paise
 * @param {number} rupees - Amount in rupees
 * @returns {number} Amount in paise
 * 
 * @example
 * const paise = toPaise(500.50); // 50050
 */
function toPaise(rupees) {
  return Math.round(Number(rupees) * 100);
}

/**
 * Converts paise to rupees
 * @param {number} paise - Amount in paise
 * @returns {number} Amount in rupees
 * 
 * @example
 * const rupees = toRupees(50050); // 500.50
 */
function toRupees(paise) {
  return Number(paise) / 100;
}

module.exports = {
  createOrder,
  verifyPayment,
  getPaymentDetails,
  processRefund,
  getRefundStatus,
  verifyWebhookSignature,
  getOrderPayments,
  capturePayment,
  // Utility functions
  toPaise,
  toRupees,
};
