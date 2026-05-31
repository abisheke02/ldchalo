/**
 * Chalo Schools ERP — Approval Workflows Routes
 * Endpoints 265-269: Cross-module approval workflow
 * File: routes/approvals.js
 */

const express = require('express');
const router = express.Router();
const pool = require('../../config/database');
const { requireAuth, requireRole } = require('../../middleware/auth');

// Apply authentication to all routes
router.use(requireAuth);

/**
 * #265 GET /approvals
 * List pending approvals for current user
 * Auth: Any authenticated user (shows only their approvals)
 */
router.get('/', requireRole('approvals.view'), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      sort = 'created_at',
      order = 'desc',
      search,
      status, // pending, approved, rejected, all
      module, // fee_concession, fee_refund, leave, expense, admission, etc.
      priority, // low, medium, high, urgent
      date_from,
      date_to
    } = req.query;

    const offset = (page - 1) * limit;
    const params = [];
    let paramIndex = 1;
    const conditions = [`a.school_id = $${paramIndex++}`];
    params.push(req.user.school_id);

    // By default, show approvals assigned to current user
    // Admin can see all by passing role filter
    if (req.user.role !== 'school_admin' && req.user.role !== 'super_admin') {
      conditions.push(`a.approver_id = $${paramIndex++}`);
      params.push(req.user.id);
    }

    if (search) {
      conditions.push(`(a.title ILIKE $${paramIndex} OR a.reference_number ILIKE $${paramIndex} OR ru.name ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }
    if (status && status !== 'all') {
      conditions.push(`a.status = $${paramIndex++}`);
      params.push(status);
    } else if (!status) {
      conditions.push(`a.status = 'pending'`);
    }
    if (module) {
      conditions.push(`a.module = $${paramIndex++}`);
      params.push(module);
    }
    if (priority) {
      conditions.push(`a.priority = $${paramIndex++}`);
      params.push(priority);
    }
    if (date_from) {
      conditions.push(`a.created_at >= $${paramIndex++}`);
      params.push(date_from);
    }
    if (date_to) {
      conditions.push(`a.created_at <= $${paramIndex++}`);
      params.push(date_to + ' 23:59:59');
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const allowedSorts = ['created_at', 'priority', 'module', 'status'];
    const sortCol = allowedSorts.includes(sort) ? `a.${sort}` : 'a.created_at';
    const sortOrder = order === 'asc' ? 'ASC' : 'DESC';

    // Count total
    const countQuery = `
      SELECT COUNT(*) as total
      FROM approvals a
      LEFT JOIN users ru ON a.requested_by = ru.id
      ${whereClause}
    `;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    // Fetch data
    const dataQuery = `
      SELECT a.id, a.reference_number, a.title, a.description, a.module,
             a.entity_type, a.entity_id, a.status, a.priority,
             a.amount, a.metadata, a.created_at, a.updated_at,
             a.due_date, a.escalation_date,
             ru.name as requested_by_name, ru.id as requested_by_id,
             au.name as approver_name,
             acu.name as actioned_by_name, a.actioned_at
      FROM approvals a
      LEFT JOIN users ru ON a.requested_by = ru.id
      LEFT JOIN users au ON a.approver_id = au.id
      LEFT JOIN users acu ON a.actioned_by = acu.id
      ${whereClause}
      ORDER BY 
        CASE a.priority 
          WHEN 'urgent' THEN 1 
          WHEN 'high' THEN 2 
          WHEN 'medium' THEN 3 
          WHEN 'low' THEN 4 
        END,
        ${sortCol} ${sortOrder}
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;
    params.push(parseInt(limit), offset);

    const dataResult = await pool.query(dataQuery, params);

    // Get summary counts
    const summaryParams = [req.user.school_id];
    let summaryCondition = 'a.school_id = $1';
    if (req.user.role !== 'school_admin' && req.user.role !== 'super_admin') {
      summaryCondition += ' AND a.approver_id = $2';
      summaryParams.push(req.user.id);
    }

    const summaryQuery = `
      SELECT 
        COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
        COUNT(*) FILTER (WHERE status = 'approved') as approved_count,
        COUNT(*) FILTER (WHERE status = 'rejected') as rejected_count,
        COUNT(*) FILTER (WHERE status = 'pending' AND priority = 'urgent') as urgent_count
      FROM approvals a
      WHERE ${summaryCondition}
    `;
    const summaryResult = await pool.query(summaryQuery, summaryParams);

    return res.json({
      success: true,
      data: dataResult.rows,
      message: 'Approvals retrieved successfully',
      meta: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
        summary: {
          pending: parseInt(summaryResult.rows[0].pending_count),
          approved: parseInt(summaryResult.rows[0].approved_count),
          rejected: parseInt(summaryResult.rows[0].rejected_count),
          urgent: parseInt(summaryResult.rows[0].urgent_count)
        }
      }
    });
  } catch (error) {
    console.error('Error listing approvals:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to retrieve approvals', details: error.message }
    });
  }
});

/**
 * #266 GET /approvals/:id
 * Get approval details
 * Auth: Any authenticated user
 */
router.get('/:id', requireRole('approvals.view'), async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT a.id, a.reference_number, a.title, a.description, a.module,
             a.entity_type, a.entity_id, a.status, a.priority,
             a.amount, a.metadata, a.created_at, a.updated_at,
             a.due_date, a.escalation_date,
             a.approval_notes, a.rejection_reason,
             a.actioned_at,
             ru.name as requested_by_name, ru.email as requested_by_email,
             au.name as approver_name,
             acu.name as actioned_by_name
      FROM approvals a
      LEFT JOIN users ru ON a.requested_by = ru.id
      LEFT JOIN users au ON a.approver_id = au.id
      LEFT JOIN users acu ON a.actioned_by = acu.id
      WHERE a.id = $1 AND a.school_id = $2
    `;

    const result = await pool.query(query, [id, req.user.school_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Approval request not found' }
      });
    }

    const approval = result.rows[0];

    // Get approval history/trail
    const historyResult = await pool.query(
      `SELECT ah.id, ah.action, ah.comment, ah.created_at,
              u.name as action_by_name
       FROM approval_history ah
       LEFT JOIN users u ON ah.action_by = u.id
       WHERE ah.approval_id = $1
       ORDER BY ah.created_at ASC`,
      [id]
    );

    // Get related entity details based on module
    let entityDetails = null;
    try {
      if (approval.module === 'fee_concession' && approval.entity_id) {
        const entityResult = await pool.query(
          `SELECT fc.*, s.name as student_name, s.admission_number
           FROM fee_concessions fc
           LEFT JOIN students s ON fc.student_id = s.id
           WHERE fc.id = $1`,
          [approval.entity_id]
        );
        entityDetails = entityResult.rows[0] || null;
      } else if (approval.module === 'fee_refund' && approval.entity_id) {
        const entityResult = await pool.query(
          `SELECT fr.*, s.name as student_name, s.admission_number
           FROM fee_refunds fr
           LEFT JOIN students s ON fr.student_id = s.id
           WHERE fr.id = $1`,
          [approval.entity_id]
        );
        entityDetails = entityResult.rows[0] || null;
      } else if (approval.module === 'leave' && approval.entity_id) {
        const entityResult = await pool.query(
          `SELECT l.*, st.name as staff_name
           FROM leave_requests l
           LEFT JOIN staff st ON l.staff_id = st.id
           WHERE l.id = $1`,
          [approval.entity_id]
        );
        entityDetails = entityResult.rows[0] || null;
      }
    } catch (e) {
      // Entity details are supplementary, don't fail the request
      console.warn('Could not fetch entity details:', e.message);
    }

    return res.json({
      success: true,
      data: {
        ...approval,
        history: historyResult.rows,
        entity_details: entityDetails
      },
      message: 'Approval details retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching approval details:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to retrieve approval details', details: error.message }
    });
  }
});

/**
 * #267 PATCH /approvals/:id/approve
 * Approve request
 * Auth: Approver
 */
router.patch('/:id/approve', requireRole('approvals.action'), async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { notes, approved_amount } = req.body;

    await client.query('BEGIN');

    // Fetch approval
    const approvalResult = await client.query(
      'SELECT * FROM approvals WHERE id = $1 AND school_id = $2',
      [id, req.user.school_id]
    );

    if (approvalResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Approval request not found' }
      });
    }

    const approval = approvalResult.rows[0];

    if (approval.status !== 'pending') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_STATUS', message: `Cannot approve request with status: ${approval.status}` }
      });
    }

    // Check if user is authorized to approve
    if (approval.approver_id && approval.approver_id !== req.user.id && req.user.role !== 'school_admin') {
      await client.query('ROLLBACK');
      return res.status(403).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'You are not the designated approver for this request' }
      });
    }

    // Update approval status
    await client.query(
      `UPDATE approvals SET status = 'approved', approval_notes = $1, 
       actioned_by = $2, actioned_at = NOW(), approved_amount = $3, updated_at = NOW()
       WHERE id = $4`,
      [notes || null, req.user.id, approved_amount || approval.amount, id]
    );

    // Add to history trail
    await client.query(
      `INSERT INTO approval_history (approval_id, action, comment, action_by, created_at)
       VALUES ($1, 'approved', $2, $3, NOW())`,
      [id, notes || 'Request approved', req.user.id]
    );

    // Trigger module-specific approval action
    await handleApprovalAction(client, approval, 'approved', { approved_amount, notes }, req.user);

    await client.query('COMMIT');

    return res.json({
      success: true,
      data: { id: parseInt(id), status: 'approved', actioned_by: req.user.id },
      message: 'Request approved successfully'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error approving request:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to approve request', details: error.message }
    });
  } finally {
    client.release();
  }
});

/**
 * #268 PATCH /approvals/:id/reject
 * Reject request with reason
 * Auth: Approver
 */
router.patch('/:id/reject', requireRole('approvals.action'), async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Rejection reason is required' }
      });
    }

    await client.query('BEGIN');

    // Fetch approval
    const approvalResult = await client.query(
      'SELECT * FROM approvals WHERE id = $1 AND school_id = $2',
      [id, req.user.school_id]
    );

    if (approvalResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Approval request not found' }
      });
    }

    const approval = approvalResult.rows[0];

    if (approval.status !== 'pending') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_STATUS', message: `Cannot reject request with status: ${approval.status}` }
      });
    }

    // Check if user is authorized
    if (approval.approver_id && approval.approver_id !== req.user.id && req.user.role !== 'school_admin') {
      await client.query('ROLLBACK');
      return res.status(403).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'You are not the designated approver for this request' }
      });
    }

    // Update approval status
    await client.query(
      `UPDATE approvals SET status = 'rejected', rejection_reason = $1,
       actioned_by = $2, actioned_at = NOW(), updated_at = NOW()
       WHERE id = $3`,
      [reason, req.user.id, id]
    );

    // Add to history trail
    await client.query(
      `INSERT INTO approval_history (approval_id, action, comment, action_by, created_at)
       VALUES ($1, 'rejected', $2, $3, NOW())`,
      [id, reason, req.user.id]
    );

    // Trigger module-specific rejection action
    await handleApprovalAction(client, approval, 'rejected', { reason }, req.user);

    await client.query('COMMIT');

    return res.json({
      success: true,
      data: { id: parseInt(id), status: 'rejected', rejection_reason: reason },
      message: 'Request rejected'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error rejecting request:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to reject request', details: error.message }
    });
  } finally {
    client.release();
  }
});

/**
 * #269 GET /approvals/history
 * Approval history
 * Auth: Any authenticated user
 */
router.get('/history', requireRole('approvals.view'), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      module,
      action, // approved, rejected
      date_from,
      date_to,
      requested_by
    } = req.query;

    const offset = (page - 1) * limit;
    const params = [];
    let paramIndex = 1;
    const conditions = [`a.school_id = $${paramIndex++}`];
    params.push(req.user.school_id);

    // Only show completed approvals in history
    conditions.push(`a.status IN ('approved', 'rejected')`);

    if (search) {
      conditions.push(`(a.title ILIKE $${paramIndex} OR a.reference_number ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }
    if (module) {
      conditions.push(`a.module = $${paramIndex++}`);
      params.push(module);
    }
    if (action) {
      conditions.push(`a.status = $${paramIndex++}`);
      params.push(action);
    }
    if (date_from) {
      conditions.push(`a.actioned_at >= $${paramIndex++}`);
      params.push(date_from);
    }
    if (date_to) {
      conditions.push(`a.actioned_at <= $${paramIndex++}`);
      params.push(date_to + ' 23:59:59');
    }
    if (requested_by) {
      conditions.push(`a.requested_by = $${paramIndex++}`);
      params.push(requested_by);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM approvals a ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total);

    const dataQuery = `
      SELECT a.id, a.reference_number, a.title, a.module, a.entity_type,
             a.status, a.priority, a.amount, a.approved_amount,
             a.approval_notes, a.rejection_reason,
             a.created_at, a.actioned_at,
             ru.name as requested_by_name,
             acu.name as actioned_by_name
      FROM approvals a
      LEFT JOIN users ru ON a.requested_by = ru.id
      LEFT JOIN users acu ON a.actioned_by = acu.id
      ${whereClause}
      ORDER BY a.actioned_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;
    params.push(parseInt(limit), offset);

    const dataResult = await pool.query(dataQuery, params);

    return res.json({
      success: true,
      data: dataResult.rows,
      message: 'Approval history retrieved successfully',
      meta: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching approval history:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to retrieve approval history', details: error.message }
    });
  }
});

// ============================================
// Helper: Handle module-specific approval/rejection actions
// ============================================
async function handleApprovalAction(client, approval, action, data, user) {
  const { module: moduleName, entity_type, entity_id } = approval;

  try {
    switch (moduleName) {
      case 'fee_concession':
        if (action === 'approved') {
          await client.query(
            `UPDATE fee_concessions SET status = 'approved', approved_by = $1, approved_at = NOW(),
             approved_amount = $2 WHERE id = $3`,
            [user.id, data.approved_amount || approval.amount, entity_id]
          );
          // Update student fee allocation
          const concession = await client.query('SELECT * FROM fee_concessions WHERE id = $1', [entity_id]);
          if (concession.rows.length > 0 && concession.rows[0].fee_structure_id) {
            await client.query(
              `UPDATE student_fee_allocations SET concession_amount = COALESCE(concession_amount, 0) + $1
               WHERE student_id = $2 AND fee_structure_id = $3`,
              [data.approved_amount || approval.amount, concession.rows[0].student_id, concession.rows[0].fee_structure_id]
            );
          }
        } else {
          await client.query(
            `UPDATE fee_concessions SET status = 'rejected', rejected_by = $1, rejected_at = NOW(),
             rejection_reason = $2 WHERE id = $3`,
            [user.id, data.reason, entity_id]
          );
        }
        break;

      case 'fee_refund':
        if (action === 'approved') {
          await client.query(
            `UPDATE fee_refunds SET status = 'approved', approved_by = $1, approved_at = NOW(),
             approved_amount = $2 WHERE id = $3`,
            [user.id, data.approved_amount || approval.amount, entity_id]
          );
        } else {
          await client.query(
            `UPDATE fee_refunds SET status = 'rejected', rejection_reason = $1 WHERE id = $2`,
            [data.reason, entity_id]
          );
        }
        break;

      case 'leave':
        if (action === 'approved') {
          await client.query(
            `UPDATE leave_requests SET status = 'approved', approved_by = $1, approved_at = NOW() WHERE id = $2`,
            [user.id, entity_id]
          );
        } else {
          await client.query(
            `UPDATE leave_requests SET status = 'rejected', rejected_by = $1, rejection_reason = $2 WHERE id = $3`,
            [user.id, data.reason, entity_id]
          );
        }
        break;

      case 'expense':
        if (action === 'approved') {
          await client.query(
            `UPDATE expense_requests SET status = 'approved', approved_by = $1, approved_at = NOW() WHERE id = $2`,
            [user.id, entity_id]
          );
        } else {
          await client.query(
            `UPDATE expense_requests SET status = 'rejected', rejection_reason = $1 WHERE id = $2`,
            [data.reason, entity_id]
          );
        }
        break;

      default:
        // For modules without specific handlers, just log the action
        console.log(`Approval action '${action}' for module '${moduleName}' entity ${entity_id}`);
    }
  } catch (error) {
    console.error(`Error handling approval action for ${moduleName}:`, error);
    // Don't throw — the approval status update is more important
  }
}

module.exports = router;
