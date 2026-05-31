/**
 * Chalo Schools ERP — Day Closure Routes
 * Endpoints 166-168: Day closure list/create/summary
 * File: routes/day-closure.js
 */

const express = require('express');
const router = express.Router();
const pool = require('../../config/database');
const { requireAuth, requireRole } = require('../../middleware/auth');

// Apply authentication to all routes
router.use(requireAuth);

/**
 * #166 GET /day-closure
 * List closures
 * Auth: Accountant+
 */
router.get('/', requireRole('day_closure.view'), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      sort = 'closure_date',
      order = 'desc',
      date_from,
      date_to,
      closed_by
    } = req.query;

    const offset = (page - 1) * limit;
    const params = [];
    let paramIndex = 1;
    const conditions = [`dc.school_id = $${paramIndex++}`];
    params.push(req.user.school_id);

    if (date_from) {
      conditions.push(`dc.closure_date >= $${paramIndex++}`);
      params.push(date_from);
    }
    if (date_to) {
      conditions.push(`dc.closure_date <= $${paramIndex++}`);
      params.push(date_to);
    }
    if (closed_by) {
      conditions.push(`dc.closed_by = $${paramIndex++}`);
      params.push(closed_by);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const allowedSorts = ['closure_date', 'total_collection', 'created_at'];
    const sortCol = allowedSorts.includes(sort) ? `dc.${sort}` : 'dc.closure_date';
    const sortOrder = order === 'asc' ? 'ASC' : 'DESC';

    // Count total
    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM day_closures dc ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total);

    // Fetch data
    const dataQuery = `
      SELECT dc.id, dc.closure_date, dc.total_collection, dc.total_receipts,
             dc.cash_amount, dc.cheque_amount, dc.online_amount, dc.upi_amount,
             dc.cancelled_receipts, dc.cancelled_amount, dc.net_collection,
             dc.remarks, dc.status, dc.created_at,
             u.name as closed_by_name
      FROM day_closures dc
      LEFT JOIN users u ON dc.closed_by = u.id
      ${whereClause}
      ORDER BY ${sortCol} ${sortOrder}
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;
    params.push(parseInt(limit), offset);

    const dataResult = await pool.query(dataQuery, params);

    return res.json({
      success: true,
      data: dataResult.rows,
      message: 'Day closures retrieved successfully',
      meta: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error listing day closures:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to retrieve day closures', details: error.message }
    });
  }
});

/**
 * #167 POST /day-closure
 * Close day (lock receipts for a date)
 * Auth: Accountant+
 */
router.post('/', requireRole('day_closure.create'), async (req, res) => {
  const client = await pool.connect();
  try {
    const { closure_date, remarks } = req.body;

    const targetDate = closure_date || new Date().toISOString().split('T')[0];

    // Check if day is already closed
    const existingClosure = await client.query(
      'SELECT id FROM day_closures WHERE closure_date = $1 AND school_id = $2',
      [targetDate, req.user.school_id]
    );

    if (existingClosure.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: { code: 'ALREADY_CLOSED', message: `Day ${targetDate} is already closed` }
      });
    }

    // Don't allow closing future dates
    const today = new Date().toISOString().split('T')[0];
    if (targetDate > today) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Cannot close a future date' }
      });
    }

    await client.query('BEGIN');

    // Calculate day's summary from fee_collections
    const summaryQuery = `
      SELECT 
        COUNT(*) FILTER (WHERE status = 'completed') as total_receipts,
        COALESCE(SUM(total_amount) FILTER (WHERE status = 'completed'), 0) as total_collection,
        COALESCE(SUM(total_amount) FILTER (WHERE status = 'completed' AND payment_mode = 'cash'), 0) as cash_amount,
        COALESCE(SUM(total_amount) FILTER (WHERE status = 'completed' AND payment_mode = 'cheque'), 0) as cheque_amount,
        COALESCE(SUM(total_amount) FILTER (WHERE status = 'completed' AND payment_mode = 'online'), 0) as online_amount,
        COALESCE(SUM(total_amount) FILTER (WHERE status = 'completed' AND payment_mode = 'upi'), 0) as upi_amount,
        COALESCE(SUM(total_amount) FILTER (WHERE status = 'completed' AND payment_mode = 'dd'), 0) as dd_amount,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_receipts,
        COALESCE(SUM(total_amount) FILTER (WHERE status = 'cancelled'), 0) as cancelled_amount
      FROM fee_collections
      WHERE collection_date = $1 AND school_id = $2
    `;

    const summaryResult = await client.query(summaryQuery, [targetDate, req.user.school_id]);
    const summary = summaryResult.rows[0];

    const netCollection = parseFloat(summary.total_collection);

    // Insert day closure record
    const insertQuery = `
      INSERT INTO day_closures (
        school_id, closure_date, total_receipts, total_collection,
        cash_amount, cheque_amount, online_amount, upi_amount, dd_amount,
        cancelled_receipts, cancelled_amount, net_collection,
        remarks, status, closed_by, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'closed', $14, NOW())
      RETURNING *
    `;

    const insertResult = await client.query(insertQuery, [
      req.user.school_id, targetDate,
      parseInt(summary.total_receipts), parseFloat(summary.total_collection),
      parseFloat(summary.cash_amount), parseFloat(summary.cheque_amount),
      parseFloat(summary.online_amount), parseFloat(summary.upi_amount),
      parseFloat(summary.dd_amount),
      parseInt(summary.cancelled_receipts), parseFloat(summary.cancelled_amount),
      netCollection, remarks || null, req.user.id
    ]);

    // Lock all receipts for this date (prevent further modifications)
    await client.query(
      `UPDATE fee_collections SET is_locked = true, locked_at = NOW()
       WHERE collection_date = $1 AND school_id = $2`,
      [targetDate, req.user.school_id]
    );

    await client.query('COMMIT');

    return res.status(201).json({
      success: true,
      data: insertResult.rows[0],
      message: `Day ${targetDate} closed successfully. ${summary.total_receipts} receipts locked.`
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error closing day:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to close day', details: error.message }
    });
  } finally {
    client.release();
  }
});

/**
 * #168 GET /day-closure/:date/summary
 * Summary for a date (can be called before closing to preview)
 * Auth: Any authenticated user
 */
router.get('/:date/summary', requireRole('day_closure.view'), async (req, res) => {
  try {
    const { date } = req.params;

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Date must be in YYYY-MM-DD format' }
      });
    }

    // Check if already closed
    const closureResult = await pool.query(
      'SELECT * FROM day_closures WHERE closure_date = $1 AND school_id = $2',
      [date, req.user.school_id]
    );

    const isClosed = closureResult.rows.length > 0;

    // Get collection summary
    const summaryQuery = `
      SELECT 
        COUNT(*) FILTER (WHERE status = 'completed') as total_receipts,
        COALESCE(SUM(total_amount) FILTER (WHERE status = 'completed'), 0) as total_collection,
        COALESCE(SUM(total_amount) FILTER (WHERE status = 'completed' AND payment_mode = 'cash'), 0) as cash_amount,
        COALESCE(SUM(total_amount) FILTER (WHERE status = 'completed' AND payment_mode = 'cheque'), 0) as cheque_amount,
        COALESCE(SUM(total_amount) FILTER (WHERE status = 'completed' AND payment_mode = 'online'), 0) as online_amount,
        COALESCE(SUM(total_amount) FILTER (WHERE status = 'completed' AND payment_mode = 'upi'), 0) as upi_amount,
        COALESCE(SUM(total_amount) FILTER (WHERE status = 'completed' AND payment_mode = 'dd'), 0) as dd_amount,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_receipts,
        COALESCE(SUM(total_amount) FILTER (WHERE status = 'cancelled'), 0) as cancelled_amount
      FROM fee_collections
      WHERE collection_date = $1 AND school_id = $2
    `;

    const summaryResult = await pool.query(summaryQuery, [date, req.user.school_id]);
    const summary = summaryResult.rows[0];

    // Get class-wise breakdown
    const classBreakdownQuery = `
      SELECT c.name as class_name, 
             COUNT(*) as receipt_count,
             COALESCE(SUM(fc.total_amount), 0) as amount
      FROM fee_collections fc
      LEFT JOIN classes c ON fc.class_id = c.id
      WHERE fc.collection_date = $1 AND fc.school_id = $2 AND fc.status = 'completed'
      GROUP BY c.name
      ORDER BY c.name
    `;

    const classBreakdown = await pool.query(classBreakdownQuery, [date, req.user.school_id]);

    // Get fee head breakdown
    const headBreakdownQuery = `
      SELECT fh.name as fee_head_name,
             COALESCE(SUM(fcd.amount), 0) as amount,
             COUNT(*) as count
      FROM fee_collection_details fcd
      LEFT JOIN fee_collections fc ON fcd.fee_collection_id = fc.id
      LEFT JOIN fee_heads fh ON fcd.fee_head_id = fh.id
      WHERE fc.collection_date = $1 AND fc.school_id = $2 AND fc.status = 'completed'
      GROUP BY fh.name
      ORDER BY amount DESC
    `;

    const headBreakdown = await pool.query(headBreakdownQuery, [date, req.user.school_id]);

    return res.json({
      success: true,
      data: {
        date,
        is_closed: isClosed,
        closed_at: isClosed ? closureResult.rows[0].created_at : null,
        closed_by: isClosed ? closureResult.rows[0].closed_by : null,
        summary: {
          total_receipts: parseInt(summary.total_receipts),
          total_collection: parseFloat(summary.total_collection),
          mode_wise: {
            cash: parseFloat(summary.cash_amount),
            cheque: parseFloat(summary.cheque_amount),
            online: parseFloat(summary.online_amount),
            upi: parseFloat(summary.upi_amount),
            dd: parseFloat(summary.dd_amount)
          },
          cancelled_receipts: parseInt(summary.cancelled_receipts),
          cancelled_amount: parseFloat(summary.cancelled_amount),
          net_collection: parseFloat(summary.total_collection)
        },
        class_breakdown: classBreakdown.rows,
        fee_head_breakdown: headBreakdown.rows
      },
      message: isClosed ? `Day ${date} summary (CLOSED)` : `Day ${date} summary (OPEN)`
    });
  } catch (error) {
    console.error('Error fetching day summary:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to retrieve day summary', details: error.message }
    });
  }
});

module.exports = router;
