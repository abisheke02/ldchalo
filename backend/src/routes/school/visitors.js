/**
 * Chalo Schools ERP — Visitor Management Routes
 * Endpoints 281-289: Visitor types, statuses, entries, checkout, report
 * File: routes/visitors.js
 */

const express = require('express');
const router = express.Router();
const pool = require('../../config/database');
const { requireAuth, requireRole } = require('../../middleware/auth');

// Apply authentication to all routes
router.use(requireAuth);

/**
 * #281 GET /visitors/types
 * List visitor types
 * Auth: Any authenticated user
 */
router.get('/types', requireRole('visitors.view'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, description, is_active, badge_color, requires_approval, 
              max_visit_duration_minutes, created_at
       FROM visitor_types 
       WHERE school_id = $1
       ORDER BY name ASC`,
      [req.user.school_id]
    );

    return res.json({
      success: true,
      data: result.rows,
      message: 'Visitor types retrieved successfully'
    });
  } catch (error) {
    console.error('Error listing visitor types:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to retrieve visitor types', details: error.message }
    });
  }
});

/**
 * #282 POST /visitors/types
 * Create visitor type
 * Auth: Admin
 */
router.post('/types', requireRole('visitors.manage'), async (req, res) => {
  try {
    const {
      name,
      description,
      badge_color,
      requires_approval,
      max_visit_duration_minutes,
      is_active = true
    } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'name is required' }
      });
    }

    // Check for duplicate
    const duplicate = await pool.query(
      'SELECT id FROM visitor_types WHERE name ILIKE $1 AND school_id = $2',
      [name, req.user.school_id]
    );

    if (duplicate.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: { code: 'DUPLICATE', message: 'Visitor type with this name already exists' }
      });
    }

    const result = await pool.query(
      `INSERT INTO visitor_types (
        school_id, name, description, badge_color, requires_approval,
        max_visit_duration_minutes, is_active, created_by, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      RETURNING *`,
      [req.user.school_id, name, description || null, badge_color || '#4A90D9',
       requires_approval || false, max_visit_duration_minutes || null,
       is_active, req.user.id]
    );

    return res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Visitor type created successfully'
    });
  } catch (error) {
    console.error('Error creating visitor type:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to create visitor type', details: error.message }
    });
  }
});

/**
 * #283 GET /visitors/statuses
 * List visitor statuses
 * Auth: Any authenticated user
 */
router.get('/statuses', requireRole('visitors.view'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, description, color, is_terminal, sort_order, created_at
       FROM visitor_statuses 
       WHERE school_id = $1
       ORDER BY sort_order ASC, name ASC`,
      [req.user.school_id]
    );

    return res.json({
      success: true,
      data: result.rows,
      message: 'Visitor statuses retrieved successfully'
    });
  } catch (error) {
    console.error('Error listing visitor statuses:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to retrieve visitor statuses', details: error.message }
    });
  }
});

/**
 * #284 POST /visitors/statuses
 * Create status
 * Auth: Admin
 */
router.post('/statuses', requireRole('visitors.manage'), async (req, res) => {
  try {
    const {
      name,
      description,
      color,
      is_terminal, // Whether this is a final status (checked_out, denied)
      sort_order
    } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'name is required' }
      });
    }

    const result = await pool.query(
      `INSERT INTO visitor_statuses (
        school_id, name, description, color, is_terminal, sort_order, created_by, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      RETURNING *`,
      [req.user.school_id, name, description || null, color || '#666666',
       is_terminal || false, sort_order || 0, req.user.id]
    );

    return res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Visitor status created successfully'
    });
  } catch (error) {
    console.error('Error creating visitor status:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to create visitor status', details: error.message }
    });
  }
});

/**
 * #285 GET /visitors
 * List visitor entries (date filter)
 * Auth: Any authenticated user
 */
router.get('/', requireRole('visitors.view'), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      sort = 'check_in_time',
      order = 'desc',
      search,
      date, // specific date YYYY-MM-DD
      date_from,
      date_to,
      visitor_type_id,
      status, // checked_in, checked_out, waiting, denied
      host_staff_id,
      currently_inside // true = only show visitors who haven't checked out
    } = req.query;

    const offset = (page - 1) * limit;
    const params = [];
    let paramIndex = 1;
    const conditions = [`ve.school_id = $${paramIndex++}`];
    params.push(req.user.school_id);

    if (search) {
      conditions.push(`(ve.visitor_name ILIKE $${paramIndex} OR ve.phone ILIKE $${paramIndex} OR ve.purpose ILIKE $${paramIndex} OR ve.badge_number ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }
    if (date) {
      conditions.push(`DATE(ve.check_in_time) = $${paramIndex++}`);
      params.push(date);
    }
    if (date_from) {
      conditions.push(`ve.check_in_time >= $${paramIndex++}`);
      params.push(date_from);
    }
    if (date_to) {
      conditions.push(`ve.check_in_time <= $${paramIndex++}`);
      params.push(date_to + ' 23:59:59');
    }
    if (visitor_type_id) {
      conditions.push(`ve.visitor_type_id = $${paramIndex++}`);
      params.push(visitor_type_id);
    }
    if (status) {
      conditions.push(`ve.status = $${paramIndex++}`);
      params.push(status);
    }
    if (host_staff_id) {
      conditions.push(`ve.host_staff_id = $${paramIndex++}`);
      params.push(host_staff_id);
    }
    if (currently_inside === 'true') {
      conditions.push(`ve.check_out_time IS NULL AND ve.status = 'checked_in'`);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const allowedSorts = ['check_in_time', 'check_out_time', 'visitor_name', 'created_at'];
    const sortCol = allowedSorts.includes(sort) ? `ve.${sort}` : 've.check_in_time';
    const sortOrder = order === 'asc' ? 'ASC' : 'DESC';

    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM visitor_entries ve ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total);

    const dataQuery = `
      SELECT ve.id, ve.visitor_name, ve.phone, ve.email, ve.company,
             ve.id_type, ve.id_number, ve.photo_url, ve.badge_number,
             ve.purpose, ve.items_carried, ve.vehicle_number,
             ve.check_in_time, ve.check_out_time, ve.status,
             ve.number_of_visitors, ve.remarks, ve.created_at,
             vt.name as visitor_type_name, vt.badge_color,
             hs.name as host_staff_name, hs.department,
             s.name as student_visited_name,
             ciu.name as checked_in_by_name,
             cou.name as checked_out_by_name,
             CASE WHEN ve.check_out_time IS NOT NULL 
                  THEN EXTRACT(EPOCH FROM (ve.check_out_time - ve.check_in_time))/60
                  ELSE EXTRACT(EPOCH FROM (NOW() - ve.check_in_time))/60
             END as duration_minutes
      FROM visitor_entries ve
      LEFT JOIN visitor_types vt ON ve.visitor_type_id = vt.id
      LEFT JOIN staff hs ON ve.host_staff_id = hs.id
      LEFT JOIN students s ON ve.student_id = s.id
      LEFT JOIN users ciu ON ve.checked_in_by = ciu.id
      LEFT JOIN users cou ON ve.checked_out_by = cou.id
      ${whereClause}
      ORDER BY ${sortCol} ${sortOrder}
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;
    params.push(parseInt(limit), offset);

    const dataResult = await pool.query(dataQuery, params);

    return res.json({
      success: true,
      data: dataResult.rows,
      message: 'Visitor entries retrieved successfully',
      meta: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error listing visitor entries:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to retrieve visitor entries', details: error.message }
    });
  }
});

/**
 * #286 POST /visitors
 * Register visitor check-in
 * Auth: Any authenticated user (receptionist/security)
 */
router.post('/', requireRole('visitors.checkin'), async (req, res) => {
  try {
    const {
      visitor_name,
      phone,
      email,
      company,
      id_type, // aadhar, driving_license, voter_id, passport, other
      id_number,
      photo_url,
      visitor_type_id,
      purpose,
      host_staff_id, // Who they're visiting (staff)
      student_id, // Or visiting a student
      number_of_visitors = 1,
      items_carried, // laptop, camera, etc.
      vehicle_number,
      expected_duration_minutes,
      remarks
    } = req.body;

    if (!visitor_name || !phone || !purpose) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'visitor_name, phone, and purpose are required' }
      });
    }

    // Generate badge number
    const todayCount = await pool.query(
      `SELECT COUNT(*) as count FROM visitor_entries 
       WHERE school_id = $1 AND DATE(check_in_time) = CURRENT_DATE`,
      [req.user.school_id]
    );
    const badgeNumber = `V${new Date().toISOString().split('T')[0].replace(/-/g, '').slice(4)}-${String(parseInt(todayCount.rows[0].count) + 1).padStart(3, '0')}`;

    // Check visitor type for approval requirement
    let initialStatus = 'checked_in';
    if (visitor_type_id) {
      const typeResult = await pool.query(
        'SELECT requires_approval FROM visitor_types WHERE id = $1',
        [visitor_type_id]
      );
      if (typeResult.rows.length > 0 && typeResult.rows[0].requires_approval) {
        initialStatus = 'waiting';
      }
    }

    const result = await pool.query(
      `INSERT INTO visitor_entries (
        school_id, visitor_name, phone, email, company,
        id_type, id_number, photo_url, badge_number,
        visitor_type_id, purpose, host_staff_id, student_id,
        number_of_visitors, items_carried, vehicle_number,
        expected_duration_minutes, remarks,
        check_in_time, status, checked_in_by, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, NOW(), $19, $20, NOW())
      RETURNING *`,
      [
        req.user.school_id, visitor_name, phone, email || null, company || null,
        id_type || null, id_number || null, photo_url || null, badgeNumber,
        visitor_type_id || null, purpose, host_staff_id || null, student_id || null,
        number_of_visitors, items_carried || null, vehicle_number || null,
        expected_duration_minutes || null, remarks || null,
        initialStatus, req.user.id
      ]
    );

    return res.status(201).json({
      success: true,
      data: result.rows[0],
      message: `Visitor checked in successfully. Badge: ${badgeNumber}`
    });
  } catch (error) {
    console.error('Error registering visitor:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to register visitor', details: error.message }
    });
  }
});

/**
 * #287 PATCH /visitors/:id/checkout
 * Check out visitor
 * Auth: Any authenticated user (receptionist/security)
 */
router.patch('/:id/checkout', requireRole('visitors.checkout'), async (req, res) => {
  try {
    const { id } = req.params;
    const { remarks, items_returned } = req.body;

    // Fetch visitor entry
    const visitorResult = await pool.query(
      'SELECT * FROM visitor_entries WHERE id = $1 AND school_id = $2',
      [id, req.user.school_id]
    );

    if (visitorResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Visitor entry not found' }
      });
    }

    const visitor = visitorResult.rows[0];

    if (visitor.status === 'checked_out') {
      return res.status(400).json({
        success: false,
        error: { code: 'ALREADY_CHECKED_OUT', message: 'Visitor has already checked out' }
      });
    }

    if (visitor.status === 'denied') {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_STATUS', message: 'Cannot check out a denied visitor' }
      });
    }

    const result = await pool.query(
      `UPDATE visitor_entries SET 
        status = 'checked_out', check_out_time = NOW(),
        checkout_remarks = $1, items_returned = $2,
        checked_out_by = $3
       WHERE id = $4
       RETURNING *, 
        EXTRACT(EPOCH FROM (check_out_time - check_in_time))/60 as duration_minutes`,
      [remarks || null, items_returned || null, req.user.id, id]
    );

    return res.json({
      success: true,
      data: result.rows[0],
      message: `Visitor ${visitor.visitor_name} checked out successfully`
    });
  } catch (error) {
    console.error('Error checking out visitor:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to check out visitor', details: error.message }
    });
  }
});

/**
 * #288 GET /visitors/report
 * Visitor information report
 * Auth: Any authenticated user
 */
router.get('/report', requireRole('visitors.report'), async (req, res) => {
  try {
    const {
      date_from,
      date_to,
      group_by = 'date', // date, type, purpose, host
      visitor_type_id,
      format // summary, detailed
    } = req.query;

    const params = [req.user.school_id];
    let paramIndex = 2;
    const conditions = ['ve.school_id = $1'];

    if (date_from) {
      conditions.push(`DATE(ve.check_in_time) >= $${paramIndex++}`);
      params.push(date_from);
    }
    if (date_to) {
      conditions.push(`DATE(ve.check_in_time) <= $${paramIndex++}`);
      params.push(date_to);
    }
    if (visitor_type_id) {
      conditions.push(`ve.visitor_type_id = $${paramIndex++}`);
      params.push(visitor_type_id);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    // Overall summary
    const summaryQuery = `
      SELECT 
        COUNT(*) as total_visitors,
        COUNT(*) FILTER (WHERE ve.status = 'checked_in') as currently_inside,
        COUNT(*) FILTER (WHERE ve.status = 'checked_out') as checked_out,
        COUNT(*) FILTER (WHERE ve.status = 'denied') as denied,
        COALESCE(SUM(ve.number_of_visitors), 0) as total_people,
        ROUND(AVG(EXTRACT(EPOCH FROM (COALESCE(ve.check_out_time, NOW()) - ve.check_in_time))/60)::numeric, 1) as avg_duration_minutes
      FROM visitor_entries ve
      ${whereClause}
    `;
    const summaryResult = await pool.query(summaryQuery, params);

    // Group-by breakdown
    let groupQuery;
    let groupByField;

    switch (group_by) {
      case 'type':
        groupByField = 'vt.name';
        groupQuery = `
          SELECT vt.name as group_label, COUNT(*) as visitor_count,
                 SUM(ve.number_of_visitors) as total_people
          FROM visitor_entries ve
          LEFT JOIN visitor_types vt ON ve.visitor_type_id = vt.id
          ${whereClause}
          GROUP BY vt.name
          ORDER BY visitor_count DESC
        `;
        break;

      case 'purpose':
        groupByField = 've.purpose';
        groupQuery = `
          SELECT ve.purpose as group_label, COUNT(*) as visitor_count,
                 SUM(ve.number_of_visitors) as total_people
          FROM visitor_entries ve
          ${whereClause}
          GROUP BY ve.purpose
          ORDER BY visitor_count DESC
          LIMIT 20
        `;
        break;

      case 'host':
        groupByField = 'hs.name';
        groupQuery = `
          SELECT hs.name as group_label, COUNT(*) as visitor_count,
                 SUM(ve.number_of_visitors) as total_people
          FROM visitor_entries ve
          LEFT JOIN staff hs ON ve.host_staff_id = hs.id
          ${whereClause}
          GROUP BY hs.name
          ORDER BY visitor_count DESC
          LIMIT 20
        `;
        break;

      default: // date
        groupByField = 'DATE(ve.check_in_time)';
        groupQuery = `
          SELECT DATE(ve.check_in_time) as group_label, COUNT(*) as visitor_count,
                 SUM(ve.number_of_visitors) as total_people
          FROM visitor_entries ve
          ${whereClause}
          GROUP BY DATE(ve.check_in_time)
          ORDER BY group_label DESC
          LIMIT 30
        `;
    }

    const groupResult = await pool.query(groupQuery, params);

    // Peak hours analysis
    const peakHoursQuery = `
      SELECT EXTRACT(HOUR FROM ve.check_in_time) as hour,
             COUNT(*) as visitor_count
      FROM visitor_entries ve
      ${whereClause}
      GROUP BY EXTRACT(HOUR FROM ve.check_in_time)
      ORDER BY hour ASC
    `;
    const peakHoursResult = await pool.query(peakHoursQuery, params);

    return res.json({
      success: true,
      data: {
        summary: summaryResult.rows[0],
        breakdown: groupResult.rows,
        peak_hours: peakHoursResult.rows,
        group_by,
        date_range: { from: date_from || 'all', to: date_to || 'all' }
      },
      message: 'Visitor report generated successfully'
    });
  } catch (error) {
    console.error('Error generating visitor report:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to generate visitor report', details: error.message }
    });
  }
});

/**
 * #289 GET /visitors/today
 * Today's visitor summary
 * Auth: Any authenticated user
 */
router.get('/today', requireRole('visitors.view'), async (req, res) => {
  try {
    // Today's summary stats
    const summaryQuery = `
      SELECT 
        COUNT(*) as total_visitors_today,
        COUNT(*) FILTER (WHERE status = 'checked_in') as currently_inside,
        COUNT(*) FILTER (WHERE status = 'checked_out') as checked_out,
        COUNT(*) FILTER (WHERE status = 'waiting') as waiting_approval,
        COUNT(*) FILTER (WHERE status = 'denied') as denied,
        COALESCE(SUM(number_of_visitors), 0) as total_people
      FROM visitor_entries
      WHERE school_id = $1 AND DATE(check_in_time) = CURRENT_DATE
    `;
    const summaryResult = await pool.query(summaryQuery, [req.user.school_id]);

    // Currently inside visitors
    const insideQuery = `
      SELECT ve.id, ve.visitor_name, ve.phone, ve.company, ve.purpose,
             ve.badge_number, ve.check_in_time, ve.number_of_visitors,
             vt.name as visitor_type_name, vt.badge_color,
             hs.name as host_staff_name,
             EXTRACT(EPOCH FROM (NOW() - ve.check_in_time))/60 as minutes_inside
      FROM visitor_entries ve
      LEFT JOIN visitor_types vt ON ve.visitor_type_id = vt.id
      LEFT JOIN staff hs ON ve.host_staff_id = hs.id
      WHERE ve.school_id = $1 
        AND DATE(ve.check_in_time) = CURRENT_DATE
        AND ve.status = 'checked_in'
      ORDER BY ve.check_in_time ASC
    `;
    const insideResult = await pool.query(insideQuery, [req.user.school_id]);

    // Type-wise breakdown for today
    const typeBreakdownQuery = `
      SELECT vt.name as type_name, vt.badge_color, COUNT(*) as count
      FROM visitor_entries ve
      LEFT JOIN visitor_types vt ON ve.visitor_type_id = vt.id
      WHERE ve.school_id = $1 AND DATE(ve.check_in_time) = CURRENT_DATE
      GROUP BY vt.name, vt.badge_color
      ORDER BY count DESC
    `;
    const typeBreakdown = await pool.query(typeBreakdownQuery, [req.user.school_id]);

    // Recent check-ins (last 5)
    const recentQuery = `
      SELECT ve.id, ve.visitor_name, ve.purpose, ve.badge_number,
             ve.check_in_time, ve.status,
             vt.name as visitor_type_name
      FROM visitor_entries ve
      LEFT JOIN visitor_types vt ON ve.visitor_type_id = vt.id
      WHERE ve.school_id = $1 AND DATE(ve.check_in_time) = CURRENT_DATE
      ORDER BY ve.check_in_time DESC
      LIMIT 5
    `;
    const recentResult = await pool.query(recentQuery, [req.user.school_id]);

    return res.json({
      success: true,
      data: {
        date: new Date().toISOString().split('T')[0],
        summary: summaryResult.rows[0],
        currently_inside: insideResult.rows,
        type_breakdown: typeBreakdown.rows,
        recent_checkins: recentResult.rows
      },
      message: "Today's visitor summary retrieved successfully"
    });
  } catch (error) {
    console.error('Error fetching today\'s visitor summary:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to retrieve today\'s visitor summary', details: error.message }
    });
  }
});

module.exports = router;
