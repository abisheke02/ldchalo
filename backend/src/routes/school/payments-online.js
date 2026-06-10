/**
 * Chalo Schools ERP — Payments Routes (Razorpay Integration)
 * Endpoints 163-165: Create order, verify payment, webhook handler
 * File: routes/payments.js
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Razorpay = require('razorpay');
const pool = require('../../config/database');
const { requireAuth, requireRole } = require('../../middleware/auth');

// Initialize Razorpay instance (optional — skips if keys not set)
let razorpay = null;
try {
  if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
    razorpay = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });
  }
} catch { /* Razorpay not configured */ }

/**
 * #163 POST /payments/create-order
 * Create Razorpay order for fee payment
 * Auth: Authenticated user (parent/student portal)
 */
router.post('/create-order', requireAuth, requireRole('payments.create'), async (req, res) => {
  try {
    const {
      student_id,
      fee_structure_id,
      fee_heads, // Array of { fee_head_id, amount }
      total_amount,
      academic_year_id,
      notes
    } = req.body;

    // Validation
    if (!student_id || !total_amount || !fee_heads || !fee_heads.length) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'student_id, total_amount, and fee_heads are required' }
      });
    }

    if (total_amount < 1) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Amount must be at least ₹1' }
      });
    }

    // Verify student exists
    const studentResult = await pool.query(
      'SELECT id, name, admission_number, school_id FROM students WHERE id = $1',
      [student_id]
    );

    if (studentResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Student not found' }
      });
    }

    const student = studentResult.rows[0];

    // Get school details for receipt
    const schoolResult = await pool.query(
      'SELECT id, name FROM schools WHERE id = $1',
      [student.school_id]
    );

    // Create Razorpay order
    const orderOptions = {
      amount: Math.round(total_amount * 100), // Razorpay expects amount in paise
      currency: 'INR',
      receipt: `fee_${student_id}_${Date.now()}`,
      notes: {
        student_id: student_id.toString(),
        student_name: student.name,
        admission_number: student.admission_number,
        school_id: student.school_id.toString(),
        fee_structure_id: (fee_structure_id || '').toString(),
        academic_year_id: (academic_year_id || '').toString(),
        purpose: 'fee_payment',
        ...(notes || {})
      }
    };

    const razorpayOrder = await razorpay.orders.create(orderOptions);

    // Store order in database for tracking
    await pool.query(
      `INSERT INTO payment_orders (
        school_id, student_id, razorpay_order_id, amount, currency,
        fee_structure_id, academic_year_id, fee_heads_json, status, created_by, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'created', $9, NOW())`,
      [
        student.school_id, student_id, razorpayOrder.id, total_amount, 'INR',
        fee_structure_id || null, academic_year_id || null, JSON.stringify(fee_heads),
        req.user.id
      ]
    );

    return res.status(201).json({
      success: true,
      data: {
        order_id: razorpayOrder.id,
        amount: total_amount,
        amount_in_paise: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        receipt: razorpayOrder.receipt,
        status: razorpayOrder.status,
        key_id: process.env.RAZORPAY_KEY_ID, // Frontend needs this to open checkout
        prefill: {
          name: student.name,
          contact: student.parent_phone || '',
          email: student.parent_email || ''
        },
        school_name: schoolResult.rows[0]?.name || 'School',
        notes: {
          student_name: student.name,
          admission_number: student.admission_number
        }
      },
      message: 'Razorpay order created successfully'
    });
  } catch (error) {
    console.error('Error creating Razorpay order:', error);

    // Handle Razorpay-specific errors
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        error: {
          code: 'RAZORPAY_ERROR',
          message: error.error?.description || 'Razorpay order creation failed',
          details: error.error
        }
      });
    }

    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to create payment order', details: error.message }
    });
  }
});

/**
 * #164 POST /payments/verify
 * Verify payment signature after successful Razorpay checkout
 * Auth: Authenticated user
 */
router.post('/verify', requireAuth, async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    } = req.body;

    // Validation
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'razorpay_order_id, razorpay_payment_id, and razorpay_signature are required' }
      });
    }

    // Verify signature using HMAC SHA256
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    const isSignatureValid = crypto.timingSafeEqual(
      Buffer.from(generatedSignature, 'hex'),
      Buffer.from(razorpay_signature, 'hex')
    );

    if (!isSignatureValid) {
      // Log the failed verification attempt
      await pool.query(
        `UPDATE payment_orders SET status = 'signature_failed', 
         razorpay_payment_id = $1, updated_at = NOW()
         WHERE razorpay_order_id = $2`,
        [razorpay_payment_id, razorpay_order_id]
      );

      return res.status(400).json({
        success: false,
        error: { code: 'SIGNATURE_MISMATCH', message: 'Payment verification failed. Signature mismatch.' }
      });
    }

    await client.query('BEGIN');

    // Fetch the order details
    const orderResult = await client.query(
      'SELECT * FROM payment_orders WHERE razorpay_order_id = $1',
      [razorpay_order_id]
    );

    if (orderResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Payment order not found' }
      });
    }

    const order = orderResult.rows[0];

    if (order.status === 'paid') {
      await client.query('ROLLBACK');
      return res.json({
        success: true,
        data: { order_id: razorpay_order_id, payment_id: razorpay_payment_id, status: 'already_verified' },
        message: 'Payment was already verified'
      });
    }

    // Update order status
    await client.query(
      `UPDATE payment_orders SET status = 'paid', razorpay_payment_id = $1, 
       razorpay_signature = $2, paid_at = NOW(), updated_at = NOW()
       WHERE razorpay_order_id = $3`,
      [razorpay_payment_id, razorpay_signature, razorpay_order_id]
    );

    // Auto-create fee collection record
    const feeHeads = JSON.parse(order.fee_heads_json || '[]');

    // Get student details
    const studentResult = await client.query(
      'SELECT id, name, class_id, section_id, admission_number FROM students WHERE id = $1',
      [order.student_id]
    );
    const student = studentResult.rows[0];

    // Generate receipt number
    const receiptResult = await client.query(
      `SELECT next_value, prefix, padding FROM auto_number_config 
       WHERE entity_type = 'fee_receipt' AND school_id = $1`,
      [order.school_id]
    );

    let receiptNumber;
    if (receiptResult.rows.length > 0) {
      const config = receiptResult.rows[0];
      const paddedNum = String(config.next_value).padStart(config.padding || 6, '0');
      receiptNumber = `${config.prefix || 'REC'}${paddedNum}`;
      await client.query(
        `UPDATE auto_number_config SET next_value = next_value + 1 WHERE entity_type = 'fee_receipt' AND school_id = $1`,
        [order.school_id]
      );
    } else {
      receiptNumber = `ONLINE-${Date.now()}`;
    }

    // Create fee collection
    const collectionInsert = await client.query(
      `INSERT INTO fee_collections (
        school_id, student_id, class_id, section_id, fee_structure_id,
        receipt_number, collection_date, amount, total_amount,
        payment_mode, transaction_reference, status, academic_year_id,
        collected_by, razorpay_payment_id, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE, $7, $7, 'online', $8, 'completed', $9, $10, $11, NOW())
      RETURNING *`,
      [
        order.school_id, order.student_id, student.class_id, student.section_id,
        order.fee_structure_id, receiptNumber, order.amount, razorpay_payment_id,
        order.academic_year_id, req.user.id, razorpay_payment_id
      ]
    );

    const collection = collectionInsert.rows[0];

    // Insert fee head details
    for (const head of feeHeads) {
      await client.query(
        `INSERT INTO fee_collection_details (fee_collection_id, fee_head_id, amount)
         VALUES ($1, $2, $3)`,
        [collection.id, head.fee_head_id, head.amount]
      );
    }

    // Update student fee outstanding
    if (order.fee_structure_id) {
      await client.query(
        `UPDATE student_fee_allocations SET paid_amount = paid_amount + $1, updated_at = NOW()
         WHERE student_id = $2 AND fee_structure_id = $3`,
        [order.amount, order.student_id, order.fee_structure_id]
      );
    }

    await client.query('COMMIT');

    return res.json({
      success: true,
      data: {
        verified: true,
        order_id: razorpay_order_id,
        payment_id: razorpay_payment_id,
        receipt_number: receiptNumber,
        collection_id: collection.id,
        amount: order.amount,
        student_name: student.name
      },
      message: 'Payment verified successfully. Receipt generated.'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error verifying payment:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to verify payment', details: error.message }
    });
  } finally {
    client.release();
  }
});

/**
 * #165 POST /payments/webhook
 * Razorpay webhook handler (no auth — verified via signature)
 * Auth: None (Razorpay signature verification)
 */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const client = await pool.connect();
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    // Verify webhook signature
    const receivedSignature = req.headers['x-razorpay-signature'];

    if (!receivedSignature) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_SIGNATURE', message: 'Webhook signature missing' }
      });
    }

    const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);

    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(body)
      .digest('hex');

    const isValid = crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(receivedSignature, 'hex')
    );

    if (!isValid) {
      console.error('Webhook signature verification failed');
      return res.status(400).json({
        success: false,
        error: { code: 'SIGNATURE_INVALID', message: 'Webhook signature verification failed' }
      });
    }

    // Parse the webhook payload
    const event = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const eventType = event.event;
    const payload = event.payload;

    // Log the webhook event
    await client.query(
      `INSERT INTO webhook_logs (source, event_type, payload, received_at)
       VALUES ('razorpay', $1, $2, NOW())`,
      [eventType, JSON.stringify(payload)]
    );

    await client.query('BEGIN');

    switch (eventType) {
      case 'payment.captured': {
        const payment = payload.payment.entity;
        const orderId = payment.order_id;

        // Update order status if not already updated by /verify
        await client.query(
          `UPDATE payment_orders SET status = 'paid', razorpay_payment_id = $1,
           paid_at = NOW(), updated_at = NOW()
           WHERE razorpay_order_id = $2 AND status != 'paid'`,
          [payment.id, orderId]
        );

        // Check if fee collection was already created by /verify
        const existingCollection = await client.query(
          'SELECT id FROM fee_collections WHERE razorpay_payment_id = $1',
          [payment.id]
        );

        if (existingCollection.rows.length === 0) {
          // Create fee collection (fallback if /verify wasn't called)
          const orderResult = await client.query(
            'SELECT * FROM payment_orders WHERE razorpay_order_id = $1',
            [orderId]
          );

          if (orderResult.rows.length > 0) {
            const order = orderResult.rows[0];
            const studentResult = await client.query(
              'SELECT id, class_id, section_id FROM students WHERE id = $1',
              [order.student_id]
            );

            if (studentResult.rows.length > 0) {
              const student = studentResult.rows[0];
              const receiptNumber = `ONLINE-WH-${Date.now()}`;

              await client.query(
                `INSERT INTO fee_collections (
                  school_id, student_id, class_id, section_id, fee_structure_id,
                  receipt_number, collection_date, amount, total_amount,
                  payment_mode, transaction_reference, status, academic_year_id,
                  razorpay_payment_id, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE, $7, $7, 'online', $8, 'completed', $9, $10, NOW())`,
                [
                  order.school_id, order.student_id, student.class_id, student.section_id,
                  order.fee_structure_id, receiptNumber, order.amount,
                  payment.id, order.academic_year_id, payment.id
                ]
              );

              // Update outstanding
              if (order.fee_structure_id) {
                await client.query(
                  `UPDATE student_fee_allocations SET paid_amount = paid_amount + $1, updated_at = NOW()
                   WHERE student_id = $2 AND fee_structure_id = $3`,
                  [order.amount, order.student_id, order.fee_structure_id]
                );
              }
            }
          }
        }
        break;
      }

      case 'payment.failed': {
        const payment = payload.payment.entity;
        const orderId = payment.order_id;

        await client.query(
          `UPDATE payment_orders SET status = 'failed', 
           failure_reason = $1, updated_at = NOW()
           WHERE razorpay_order_id = $2`,
          [payment.error_description || 'Payment failed', orderId]
        );
        break;
      }

      case 'refund.created':
      case 'refund.processed': {
        const refund = payload.refund.entity;
        // Log refund event for reconciliation
        await client.query(
          `INSERT INTO payment_events (event_type, razorpay_payment_id, amount, status, event_data, created_at)
           VALUES ($1, $2, $3, $4, $5, NOW())`,
          [eventType, refund.payment_id, refund.amount / 100, refund.status, JSON.stringify(refund)]
        );
        break;
      }

      default:
        // Log unhandled event types for future implementation
        console.log(`Unhandled Razorpay webhook event: ${eventType}`);
    }

    await client.query('COMMIT');

    // Always respond 200 to Razorpay to acknowledge receipt
    return res.status(200).json({ success: true, message: 'Webhook processed' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error processing Razorpay webhook:', error);
    // Still respond 200 to prevent Razorpay retries for processing errors
    return res.status(200).json({ success: true, message: 'Webhook received (processing error logged)' });
  } finally {
    client.release();
  }
});

module.exports = router;
