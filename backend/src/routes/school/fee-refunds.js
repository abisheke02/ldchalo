/**
 * Chalo Schools ERP — Fee Refunds Routes
 * Endpoints 160-162: Refund initiate/approve/process
 * File: routes/fee-refunds.js
 */

const express = require('express');
const router = express.Router();
const pool = require('../../config/database');
const { requireAuth, requireRole } = require('../../middleware/auth');

// Apply authentication to all routes
router.use(requireAuth);

/**
 * #160 POST /fee-refunds
 * Initiate refund
 * Auth: Accountant+
 */
router.post('/', requireRole('fee_refunds.create'), async (req, res) => {
  try {
    const {
      student_id,
      fee_collection_id,
      refund_amount,
      reason,
      refund_mode, // cash, cheque, bank_transfer, upi
      bank_account_name,
      bank_account_number,
      bank_ifsc,
      upi_id
    } = req.body;

    // Validation
    if (!student_id || !fee_collection_id || !refund_amount || !reason || !refund_mode) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'student_id, fee_collection_id, refund_amount, reason, and refund_mode are required'
        }
      });
    }

    // Verify the fee collection exists and belongs to this student
    const collectionResult = await pool.query(
      `SELECT fc.*, s.name as student_name, s.admission_number
       FROM fee_collections fc
       LEFT JOIN students s ON fc.student_id = s.id
       WHERE fc.id = $1 AND fc.student_id = $2 AND fc.school_id = $3 AND fc.status = 'completed'`,
      [fee_collection_id, student_id, req.user.school_id]
    );

    if (collectionResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Active fee collection record not found for this student' }
      });
    }

    const collection = collectionResult.rows[0];

    // Validate refund amount doesn't exceed paid amount
    if (parseFloat(refund_amount) > parseFloat(collection.total_amount)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Refund amount cannot exceed the collected amount' }
      });
    }

    // Check if a refund is already pending for this collection
    const existingRefund = await pool.query(
      `SELECT id FROM fee_refunds 
       WHERE fee_collection_id = $1 AND status IN ('pending', 'approved') AND school_id = $2`,
      [fee_collection_id, req.user.school_id]
    );

    if (existingRefund.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: { code: 'DUPLICATE', message: 'A refund request already exists for this collection' }
      });
    }

    // Generate refund reference number
    const refundRef = `REF${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

    const insertQuery = `
      INSERT INTO fee_refunds (
        school_id, student_id, fee_collection_id, refund_reference, refund_amount,
        reason, refund_mode, bank_account_name, bank_account_number, bank_ifsc,
        upi_id, status, initiated_by, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'pending', $12, NOW())
      RETURNING *
    `;

    const result = await pool.query(insertQuery, [
      req.user.school_id, student_id, fee_collection_id, refundRef, refund_amount,
      reason, refund_mode, bank_account_name || null, bank_account_number || null,
      bank_ifsc || null, upi_id || null, req.user.id
    ]);

    return res.status(201).json({
      success: true,
      data: {
        ...result.rows[0],
        student_name: collection.student_name,
        admission_number: collection.admission_number,
        original_receipt: collection.receipt_number
      },
      message: `Refund initiated successfully. Reference: ${refundRef}. Pending admin approval.`
    });
  } catch (error) {
    console.error('Error initiating refund:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to initiate refund', details: error.message }
    });
  }
});

/**
 * #161 PATCH /fee-refunds/:id/approve
 * Approve refund
 * Auth: Admin
 */
router.patch('/:id/approve', requireRole('fee_refunds.approve'), async (req, res) => {
  try {
    const { id } = req.params;
    const { notes, approved_amount } = req.body;

    // Fetch refund
    const refundResult = await pool.query(
      'SELECT * FROM fee_refunds WHERE id = $1 AND school_id = $2',
      [id, req.user.school_id]
    );

    if (refundResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Refund request not found' }
      });
    }

    const refund = refundResult.rows[0];

    if (refund.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_STATUS', message: `Cannot approve refund with status: ${refund.status}` }
      });
    }

    const finalAmount = approved_amount || refund.refund_amount;

    await pool.query(
      `UPDATE fee_refunds SET status = 'approved', approved_amount = $1,
       approved_by = $2, approved_at = NOW(), approval_notes = $3
       WHERE id = $4`,
      [finalAmount, req.user.id, notes || null, id]
    );

    return res.json({
      success: true,
      data: { id: parseInt(id), status: 'approved', approved_amount: finalAmount },
      message: 'Refund approved successfully. Ready for processing.'
    });
  } catch (error) {
    console.error('Error approving refund:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to approve refund', details: error.message }
    });
  }
});

/**
 * #162 PATCH /fee-refunds/:id/process
 * Mark refund processed
 * Auth: Admin
 */
router.patch('/:id/process', requireRole('fee_refunds.process'), async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { transaction_reference, processed_date, notes } = req.body;

    await client.query('BEGIN');

    // Fetch refund
    const refundResult = await client.query(
      'SELECT * FROM fee_refunds WHERE id = $1 AND school_id = $2',
      [id, req.user.school_id]
    );

    if (refundResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Refund request not found' }
      });
    }

    const refund = refundResult.rows[0];

    if (refund.status !== 'approved') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_STATUS', message: `Cannot process refund with status: ${refund.status}. Must be approved first.` }
      });
    }

    const processedAmount = refund.approved_amount || refund.refund_amount;

    // Update refund status to processed
    await client.query(
      `UPDATE fee_refunds SET status = 'processed', transaction_reference = $1,
       processed_date = $2, processed_by = $3, processed_at = NOW(), processing_notes = $4
       WHERE id = $5`,
      [transaction_reference || null, processed_date || new Date().toISOString().split('T')[0], req.user.id, notes || null, id]
    );

    // Update student fee allocation — reduce paid amount by refund amount
    const collectionResult = await client.query(
      'SELECT fee_structure_id, student_id FROM fee_collections WHERE id = $1',
      [refund.fee_collection_id]
    );

    if (collectionResult.rows.length > 0) {
      const { fee_structure_id, student_id } = collectionResult.rows[0];
      await client.query(
        `UPDATE student_fee_allocations SET paid_amount = paid_amount - $1, updated_at = NOW()
         WHERE student_id = $2 AND fee_structure_id = $3`,
        [processedAmount, student_id, fee_structure_id]
      );
    }

    // Record in refund ledger/journal
    await client.query(
      `INSERT INTO financial_transactions (
        school_id, type, reference_id, reference_type, amount, 
        description, created_by, created_at
      ) VALUES ($1, 'refund', $2, 'fee_refund', $3, $4, $5, NOW())`,
      [req.user.school_id, id, processedAmount,
       `Refund processed for collection #${refund.fee_collection_id}`, req.user.id]
    );

    await client.query('COMMIT');

    return res.json({
      success: true,
      data: {
        id: parseInt(id),
        status: 'processed',
        processed_amount: processedAmount,
        transaction_reference,
        processed_date: processed_date || new Date().toISOString().split('T')[0]
      },
      message: 'Refund processed successfully'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error processing refund:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to process refund', details: error.message }
    });
  } finally {
    client.release();
  }
});

/**
 * GET /fee-refunds (additional convenience endpoint)
 * List all refunds with filters
 */
router.get('/', requireRole('fee_refunds.view'), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      sort = 'created_at',
      order = 'desc',
      search,
      status,
      refund_mode,
      date_from,
      date_to
    } = req.query;

    const offset = (page - 1) * limit;
    const params = [];
    let paramIndex = 1;
    const conditions = [`fr.school_id = $${paramIndex++}`];
    params.push(req.user.school_id);

    if (search) {
      conditions.push(`(s.name ILIKE $${paramIndex} OR s.admission_number ILIKE $${paramIndex} OR fr.refund_reference ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }
    if (status) {
      conditions.push(`fr.status = $${paramIndex++}`);
      params.push(status);
    }
    if (refund_mode) {
      conditions.push(`fr.refund_mode = $${paramIndex++}`);
      params.push(refund_mode);
    }
    if (date_from) {
      conditions.push(`fr.created_at >= $${paramIndex++}`);
      params.push(date_from);
    }
    if (date_to) {
      conditions.push(`fr.created_at <= $${paramIndex++}`);
      params.push(date_to + ' 23:59:59');
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM fee_refunds fr
       LEFT JOIN students s ON fr.student_id = s.id
       ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total);

    const allowedSorts = ['created_at', 'refund_amount', 'status'];
    const sortCol = allowedSorts.includes(sort) ? `fr.${sort}` : 'fr.created_at';
    const sortOrder = order === 'asc' ? 'ASC' : 'DESC';

    const dataQuery = `
      SELECT fr.id, fr.refund_reference, fr.refund_amount, fr.approved_amount,
             fr.refund_mode, fr.status, fr.reason, fr.transaction_reference,
             fr.created_at, fr.approved_at, fr.processed_at,
             s.name as student_name, s.admission_number,
             fc.receipt_number as original_receipt,
             iu.name as initiated_by_name,
             au.name as approved_by_name,
             pu.name as processed_by_name
      FROM fee_refunds fr
      LEFT JOIN students s ON fr.student_id = s.id
      LEFT JOIN fee_collections fc ON fr.fee_collection_id = fc.id
      LEFT JOIN users iu ON fr.initiated_by = iu.id
      LEFT JOIN users au ON fr.approved_by = au.id
      LEFT JOIN users pu ON fr.processed_by = pu.id
      ${whereClause}
      ORDER BY ${sortCol} ${sortOrder}
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;
    params.push(parseInt(limit), offset);

    const dataResult = await pool.query(dataQuery, params);

    return res.json({
      success: true,
      data: dataResult.rows,
      message: 'Fee refunds retrieved successfully',
      meta: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error listing fee refunds:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to retrieve fee refunds', details: error.message }
    });
  }
});

module.exports = router;
