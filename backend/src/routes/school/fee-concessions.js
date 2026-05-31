/**
 * Chalo Schools ERP — Fee Concessions Routes
 * Endpoints 156-159: Concession request/approve/reject
 * File: routes/fee-concessions.js
 */

const express = require('express');
const router = express.Router();
const pool = require('../../config/database');
const { requireAuth, requireRole } = require('../../middleware/auth');

// Apply authentication to all routes
router.use(requireAuth);

/**
 * #156 GET /fee-concessions
 * List concession requests
 * Auth: Any authenticated user
 */
router.get('/', requireRole('fee_concessions.view'), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      sort = 'created_at',
      order = 'desc',
      search,
      status, // pending, approved, rejected
      class_id,
      academic_year_id,
      concession_type // percentage, fixed
    } = req.query;

    const offset = (page - 1) * limit;
    const params = [];
    let paramIndex = 1;
    const conditions = [`fcon.school_id = $${paramIndex++}`];
    params.push(req.user.school_id);

    if (search) {
      conditions.push(`(s.name ILIKE $${paramIndex} OR s.admission_number ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }
    if (status) {
      conditions.push(`fcon.status = $${paramIndex++}`);
      params.push(status);
    }
    if (class_id) {
      conditions.push(`s.class_id = $${paramIndex++}`);
      params.push(class_id);
    }
    if (academic_year_id) {
      conditions.push(`fcon.academic_year_id = $${paramIndex++}`);
      params.push(academic_year_id);
    }
    if (concession_type) {
      conditions.push(`fcon.concession_type = $${paramIndex++}`);
      params.push(concession_type);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const allowedSorts = ['created_at', 'amount', 'status'];
    const sortCol = allowedSorts.includes(sort) ? `fcon.${sort}` : 'fcon.created_at';
    const sortOrder = order === 'asc' ? 'ASC' : 'DESC';

    // Count total
    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM fee_concessions fcon
       LEFT JOIN students s ON fcon.student_id = s.id
       ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total);

    // Fetch data
    const dataQuery = `
      SELECT fcon.id, fcon.student_id, fcon.concession_type, fcon.amount, fcon.percentage,
             fcon.reason, fcon.status, fcon.approved_at, fcon.rejected_at,
             fcon.rejection_reason, fcon.created_at,
             s.name as student_name, s.admission_number,
             c.name as class_name, sec.name as section_name,
             fh.name as fee_head_name,
             ru.name as requested_by_name,
             au.name as approved_by_name
      FROM fee_concessions fcon
      LEFT JOIN students s ON fcon.student_id = s.id
      LEFT JOIN classes c ON s.class_id = c.id
      LEFT JOIN sections sec ON s.section_id = sec.id
      LEFT JOIN fee_heads fh ON fcon.fee_head_id = fh.id
      LEFT JOIN users ru ON fcon.requested_by = ru.id
      LEFT JOIN users au ON fcon.approved_by = au.id
      ${whereClause}
      ORDER BY ${sortCol} ${sortOrder}
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;
    params.push(parseInt(limit), offset);

    const dataResult = await pool.query(dataQuery, params);

    return res.json({
      success: true,
      data: dataResult.rows,
      message: 'Fee concessions retrieved successfully',
      meta: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error listing fee concessions:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to retrieve fee concessions', details: error.message }
    });
  }
});

/**
 * #157 POST /fee-concessions
 * Apply concession for student
 * Auth: Accountant+
 */
router.post('/', requireRole('fee_concessions.create'), async (req, res) => {
  try {
    const {
      student_id,
      fee_head_id,
      fee_structure_id,
      concession_type, // 'percentage' or 'fixed'
      amount,
      percentage,
      reason,
      academic_year_id,
      applicable_from, // date from which concession applies
      applicable_to    // date until which concession applies
    } = req.body;

    // Validation
    if (!student_id || !concession_type || !reason) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'student_id, concession_type, and reason are required' }
      });
    }

    if (concession_type === 'fixed' && !amount) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'amount is required for fixed concession type' }
      });
    }

    if (concession_type === 'percentage' && !percentage) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'percentage is required for percentage concession type' }
      });
    }

    if (concession_type === 'percentage' && (percentage < 0 || percentage > 100)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Percentage must be between 0 and 100' }
      });
    }

    // Verify student exists
    const studentResult = await pool.query(
      'SELECT id, name FROM students WHERE id = $1 AND school_id = $2',
      [student_id, req.user.school_id]
    );

    if (studentResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Student not found' }
      });
    }

    // Check for duplicate pending concession
    const duplicateCheck = await pool.query(
      `SELECT id FROM fee_concessions 
       WHERE student_id = $1 AND fee_head_id = $2 AND status = 'pending' AND school_id = $3`,
      [student_id, fee_head_id || null, req.user.school_id]
    );

    if (duplicateCheck.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: { code: 'DUPLICATE', message: 'A pending concession already exists for this student and fee head' }
      });
    }

    // Calculate concession amount if percentage type
    let concessionAmount = amount || 0;
    if (concession_type === 'percentage' && fee_structure_id) {
      const feeResult = await pool.query(
        'SELECT total_amount FROM student_fee_allocations WHERE student_id = $1 AND fee_structure_id = $2',
        [student_id, fee_structure_id]
      );
      if (feeResult.rows.length > 0) {
        concessionAmount = (parseFloat(feeResult.rows[0].total_amount) * percentage) / 100;
      }
    }

    const insertQuery = `
      INSERT INTO fee_concessions (
        school_id, student_id, fee_head_id, fee_structure_id, concession_type,
        amount, percentage, calculated_amount, reason, status,
        academic_year_id, applicable_from, applicable_to, requested_by, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending', $10, $11, $12, $13, NOW())
      RETURNING *
    `;

    const result = await pool.query(insertQuery, [
      req.user.school_id, student_id, fee_head_id || null, fee_structure_id || null,
      concession_type, amount || null, percentage || null, concessionAmount,
      reason, academic_year_id || null, applicable_from || null, applicable_to || null,
      req.user.id
    ]);

    return res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Concession request submitted successfully. Pending admin approval.'
    });
  } catch (error) {
    console.error('Error creating fee concession:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to create fee concession', details: error.message }
    });
  }
});

/**
 * #158 PATCH /fee-concessions/:id/approve
 * Approve concession
 * Auth: Admin
 */
router.patch('/:id/approve', requireRole('fee_concessions.approve'), async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { approved_amount, notes } = req.body;

    await client.query('BEGIN');

    // Fetch concession
    const concessionResult = await client.query(
      'SELECT * FROM fee_concessions WHERE id = $1 AND school_id = $2',
      [id, req.user.school_id]
    );

    if (concessionResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Concession request not found' }
      });
    }

    const concession = concessionResult.rows[0];

    if (concession.status !== 'pending') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_STATUS', message: `Cannot approve a concession with status: ${concession.status}` }
      });
    }

    const finalAmount = approved_amount || concession.calculated_amount || concession.amount;

    // Update concession status
    await client.query(
      `UPDATE fee_concessions SET status = 'approved', approved_amount = $1, 
       approved_by = $2, approved_at = NOW(), approval_notes = $3
       WHERE id = $4`,
      [finalAmount, req.user.id, notes || null, id]
    );

    // Update student fee allocation to reflect concession
    if (concession.fee_structure_id) {
      await client.query(
        `UPDATE student_fee_allocations 
         SET concession_amount = COALESCE(concession_amount, 0) + $1, updated_at = NOW()
         WHERE student_id = $2 AND fee_structure_id = $3`,
        [finalAmount, concession.student_id, concession.fee_structure_id]
      );
    }

    await client.query('COMMIT');

    return res.json({
      success: true,
      data: { id: parseInt(id), status: 'approved', approved_amount: finalAmount },
      message: 'Concession approved successfully'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error approving concession:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to approve concession', details: error.message }
    });
  } finally {
    client.release();
  }
});

/**
 * #159 PATCH /fee-concessions/:id/reject
 * Reject concession
 * Auth: Admin
 */
router.patch('/:id/reject', requireRole('fee_concessions.reject'), async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Rejection reason is required' }
      });
    }

    // Fetch concession
    const concessionResult = await pool.query(
      'SELECT * FROM fee_concessions WHERE id = $1 AND school_id = $2',
      [id, req.user.school_id]
    );

    if (concessionResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Concession request not found' }
      });
    }

    const concession = concessionResult.rows[0];

    if (concession.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_STATUS', message: `Cannot reject a concession with status: ${concession.status}` }
      });
    }

    await pool.query(
      `UPDATE fee_concessions SET status = 'rejected', rejection_reason = $1, 
       rejected_by = $2, rejected_at = NOW()
       WHERE id = $3`,
      [reason, req.user.id, id]
    );

    return res.json({
      success: true,
      data: { id: parseInt(id), status: 'rejected', rejection_reason: reason },
      message: 'Concession rejected'
    });
  } catch (error) {
    console.error('Error rejecting concession:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to reject concession', details: error.message }
    });
  }
});

module.exports = router;
