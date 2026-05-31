/**
 * Chalo Schools ERP - Time Configuration Routes
 * Endpoints 75-82: Time blocks, periods, week config
 * File: routes/masters/time-config.js
 */

const express = require('express');
const router = express.Router();
const pool = require('../../../config/database');
const { requireAuth } = require('../../../middleware/auth');
const { requireRole } = require('../../../middleware/auth');

// ═══════════════════════════════════════════════════════════════════════════════
// TIME BLOCKS (Endpoints 75-76)
// ═══════════════════════════════════════════════════════════════════════════════

// #75 GET /time-blocks — List time blocks
router.get(
  '/time-blocks',
  requireAuth,
  requireRole('time_config', 'read'),
  async (req, res) => {
    try {
      const { branch_id, academic_year_id, is_active = 'true' } = req.query;
      const params = [req.user.school_id, is_active === 'true'];
      let whereClause = 'WHERE school_id = $1 AND is_active = $2';

      if (branch_id) {
        params.push(parseInt(branch_id));
        whereClause += ` AND branch_id = $${params.length}`;
      }

      if (academic_year_id) {
        params.push(parseInt(academic_year_id));
        whereClause += ` AND academic_year_id = $${params.length}`;
      }

      const { rows } = await pool.query(
        `SELECT id, name, code, start_time, end_time, type, branch_id,
                academic_year_id, applicable_days, sort_order, is_active, created_at
         FROM time_blocks ${whereClause}
         ORDER BY sort_order, start_time`,
        params
      );

      return res.json({
        success: true,
        data: rows,
        message: 'Time blocks retrieved successfully',
        meta: { total: rows.length }
      });
    } catch (error) {
      console.error('Error listing time blocks:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve time blocks',
        error: { code: 'INTERNAL_ERROR', message: error.message }
      });
    }
  }
);

// #76 POST /time-blocks — Create time block
router.post(
  '/time-blocks',
  requireAuth,
  requireRole('time_config', 'create'),
  async (req, res) => {
    try {
      const {
        name, code, start_time, end_time, type,
        branch_id, academic_year_id, applicable_days, sort_order
      } = req.body;

      // Validation
      if (!name || !start_time || !end_time) {
        return res.status(400).json({
          success: false,
          message: 'name, start_time, and end_time are required'
        });
      }

      // Validate type
      const validTypes = ['instruction', 'break', 'lunch', 'assembly', 'activity', 'other'];
      if (type && !validTypes.includes(type)) {
        return res.status(400).json({
          success: false,
          message: `type must be one of: ${validTypes.join(', ')}`
        });
      }

      // Validate time format (HH:MM or HH:MM:SS)
      const timeRegex = /^\d{2}:\d{2}(:\d{2})?$/;
      if (!timeRegex.test(start_time) || !timeRegex.test(end_time)) {
        return res.status(400).json({
          success: false,
          message: 'start_time and end_time must be in HH:MM or HH:MM:SS format'
        });
      }

      // Validate end_time > start_time
      if (end_time <= start_time) {
        return res.status(400).json({
          success: false,
          message: 'end_time must be after start_time'
        });
      }

      // Check for overlapping time blocks
      const overlap = await pool.query(
        `SELECT id, name FROM time_blocks
         WHERE school_id = $1 AND is_active = true
         AND ((start_time < $3 AND end_time > $2))
         ${branch_id ? 'AND branch_id = $4' : ''}`,
        branch_id
          ? [req.user.school_id, start_time, end_time, branch_id]
          : [req.user.school_id, start_time, end_time]
      );
      if (overlap.rows.length > 0) {
        return res.status(409).json({
          success: false,
          message: `Time block overlaps with "${overlap.rows[0].name}"`
        });
      }

      const { rows } = await pool.query(
        `INSERT INTO time_blocks (school_id, name, code, start_time, end_time, type, branch_id, academic_year_id, applicable_days, sort_order, is_active, created_by, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true, $11, NOW())
         RETURNING *`,
        [
          req.user.school_id, name.trim(), code || null, start_time, end_time,
          type || 'instruction', branch_id || null, academic_year_id || null,
          applicable_days || null, sort_order || 0, req.user.id
        ]
      );

      return res.status(201).json({
        success: true,
        data: rows[0],
        message: 'Time block created successfully'
      });
    } catch (error) {
      console.error('Error creating time block:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to create time block',
        error: { code: 'INTERNAL_ERROR', message: error.message }
      });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════════
// PERIODS (Endpoints 77-80)
// ═══════════════════════════════════════════════════════════════════════════════

// #77 GET /periods — List periods
router.get(
  '/periods',
  requireAuth,
  requireRole('time_config', 'read'),
  async (req, res) => {
    try {
      const { branch_id, academic_year_id, class_id, day, is_active = 'true' } = req.query;
      const params = [req.user.school_id, is_active === 'true'];
      let whereClause = 'WHERE p.school_id = $1 AND p.is_active = $2';

      if (branch_id) {
        params.push(parseInt(branch_id));
        whereClause += ` AND p.branch_id = $${params.length}`;
      }

      if (academic_year_id) {
        params.push(parseInt(academic_year_id));
        whereClause += ` AND p.academic_year_id = $${params.length}`;
      }

      if (class_id) {
        params.push(parseInt(class_id));
        whereClause += ` AND p.class_id = $${params.length}`;
      }

      if (day) {
        params.push(day);
        whereClause += ` AND $${params.length} = ANY(p.applicable_days)`;
      }

      const { rows } = await pool.query(
        `SELECT p.id, p.name, p.period_number, p.start_time, p.end_time,
                p.duration_minutes, p.type, p.time_block_id, tb.name AS time_block_name,
                p.class_id, p.branch_id, p.academic_year_id,
                p.applicable_days, p.sort_order, p.is_active
         FROM periods p
         LEFT JOIN time_blocks tb ON tb.id = p.time_block_id
         ${whereClause}
         ORDER BY p.sort_order, p.period_number, p.start_time`,
        params
      );

      return res.json({
        success: true,
        data: rows,
        message: 'Periods retrieved successfully',
        meta: { total: rows.length }
      });
    } catch (error) {
      console.error('Error listing periods:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve periods',
        error: { code: 'INTERNAL_ERROR', message: error.message }
      });
    }
  }
);

// #78 POST /periods — Create period
router.post(
  '/periods',
  requireAuth,
  requireRole('time_config', 'create'),
  async (req, res) => {
    try {
      const {
        name, period_number, start_time, end_time, duration_minutes,
        type, time_block_id, class_id, branch_id, academic_year_id,
        applicable_days, sort_order
      } = req.body;

      // Validation
      if (!name || !start_time || !end_time || !period_number) {
        return res.status(400).json({
          success: false,
          message: 'name, period_number, start_time, and end_time are required'
        });
      }

      // Validate type
      const validTypes = ['lecture', 'lab', 'break', 'lunch', 'assembly', 'activity', 'free'];
      if (type && !validTypes.includes(type)) {
        return res.status(400).json({
          success: false,
          message: `type must be one of: ${validTypes.join(', ')}`
        });
      }

      // Calculate duration if not provided
      const calcDuration = duration_minutes || (() => {
        const [sh, sm] = start_time.split(':').map(Number);
        const [eh, em] = end_time.split(':').map(Number);
        return (eh * 60 + em) - (sh * 60 + sm);
      })();

      const { rows } = await pool.query(
        `INSERT INTO periods (school_id, name, period_number, start_time, end_time, duration_minutes, type, time_block_id, class_id, branch_id, academic_year_id, applicable_days, sort_order, is_active, created_by, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, true, $14, NOW())
         RETURNING *`,
        [
          req.user.school_id, name.trim(), period_number, start_time, end_time,
          calcDuration, type || 'lecture', time_block_id || null, class_id || null,
          branch_id || null, academic_year_id || null, applicable_days || null,
          sort_order || period_number, req.user.id
        ]
      );

      return res.status(201).json({
        success: true,
        data: rows[0],
        message: 'Period created successfully'
      });
    } catch (error) {
      console.error('Error creating period:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to create period',
        error: { code: 'INTERNAL_ERROR', message: error.message }
      });
    }
  }
);

// #79 PUT /periods/:id — Update period
router.put(
  '/periods/:id',
  requireAuth,
  requireRole('time_config', 'update'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const {
        name, period_number, start_time, end_time, duration_minutes,
        type, time_block_id, class_id, applicable_days, sort_order, is_active
      } = req.body;

      // Verify exists
      const existing = await pool.query(
        'SELECT id FROM periods WHERE id = $1 AND school_id = $2',
        [id, req.user.school_id]
      );
      if (existing.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Period not found' });
      }

      // Build dynamic update
      const updates = [];
      const params = [];
      let idx = 1;

      if (name !== undefined) { updates.push(`name = $${idx}`); params.push(name.trim()); idx++; }
      if (period_number !== undefined) { updates.push(`period_number = $${idx}`); params.push(period_number); idx++; }
      if (start_time !== undefined) { updates.push(`start_time = $${idx}`); params.push(start_time); idx++; }
      if (end_time !== undefined) { updates.push(`end_time = $${idx}`); params.push(end_time); idx++; }
      if (duration_minutes !== undefined) { updates.push(`duration_minutes = $${idx}`); params.push(duration_minutes); idx++; }
      if (type !== undefined) { updates.push(`type = $${idx}`); params.push(type); idx++; }
      if (time_block_id !== undefined) { updates.push(`time_block_id = $${idx}`); params.push(time_block_id); idx++; }
      if (class_id !== undefined) { updates.push(`class_id = $${idx}`); params.push(class_id); idx++; }
      if (applicable_days !== undefined) { updates.push(`applicable_days = $${idx}`); params.push(applicable_days); idx++; }
      if (sort_order !== undefined) { updates.push(`sort_order = $${idx}`); params.push(sort_order); idx++; }
      if (is_active !== undefined) { updates.push(`is_active = $${idx}`); params.push(is_active); idx++; }

      if (updates.length === 0) {
        return res.status(400).json({ success: false, message: 'No fields to update' });
      }

      updates.push(`updated_at = NOW()`);
      updates.push(`updated_by = $${idx}`); params.push(req.user.id); idx++;
      params.push(id);

      const { rows } = await pool.query(
        `UPDATE periods SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
        params
      );

      return res.json({
        success: true,
        data: rows[0],
        message: 'Period updated successfully'
      });
    } catch (error) {
      console.error('Error updating period:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update period',
        error: { code: 'INTERNAL_ERROR', message: error.message }
      });
    }
  }
);

// #80 POST /periods/bulk — Bulk create periods
router.post(
  '/periods/bulk',
  requireAuth,
  requireRole('time_config', 'create'),
  async (req, res) => {
    try {
      const { periods, branch_id, academic_year_id } = req.body;

      if (!periods || !Array.isArray(periods) || periods.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'periods array is required and must not be empty'
        });
      }

      if (periods.length > 50) {
        return res.status(400).json({
          success: false,
          message: 'Maximum 50 periods can be created at once'
        });
      }

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        const results = { created: 0, errors: [] };
        const createdPeriods = [];

        for (let i = 0; i < periods.length; i++) {
          const p = periods[i];

          if (!p.name || !p.start_time || !p.end_time || !p.period_number) {
            results.errors.push({ row: i + 1, message: 'name, period_number, start_time, end_time required' });
            continue;
          }

          // Calculate duration
          const [sh, sm] = p.start_time.split(':').map(Number);
          const [eh, em] = p.end_time.split(':').map(Number);
          const duration = p.duration_minutes || ((eh * 60 + em) - (sh * 60 + sm));

          const { rows } = await client.query(
            `INSERT INTO periods (school_id, name, period_number, start_time, end_time, duration_minutes, type, time_block_id, class_id, branch_id, academic_year_id, applicable_days, sort_order, is_active, created_by, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, true, $14, NOW())
             RETURNING *`,
            [
              req.user.school_id, p.name.trim(), p.period_number, p.start_time, p.end_time,
              duration, p.type || 'lecture', p.time_block_id || null, p.class_id || null,
              branch_id || p.branch_id || null, academic_year_id || p.academic_year_id || null,
              p.applicable_days || null, p.sort_order || p.period_number, req.user.id
            ]
          );

          createdPeriods.push(rows[0]);
          results.created++;
        }

        await client.query('COMMIT');

        return res.status(201).json({
          success: true,
          data: { periods: createdPeriods, summary: results },
          message: `Bulk create complete: ${results.created} periods created`
        });
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error bulk creating periods:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to bulk create periods',
        error: { code: 'INTERNAL_ERROR', message: error.message }
      });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════════
// WEEK CONFIGURATION (Endpoints 81-82)
// ═══════════════════════════════════════════════════════════════════════════════

// #81 GET /week-config — Get week working days
router.get(
  '/week-config',
  requireAuth,
  requireRole('time_config', 'read'),
  async (req, res) => {
    try {
      const { branch_id, academic_year_id } = req.query;
      const params = [req.user.school_id];
      let whereClause = 'WHERE school_id = $1';

      if (branch_id) {
        params.push(parseInt(branch_id));
        whereClause += ` AND branch_id = $${params.length}`;
      }

      if (academic_year_id) {
        params.push(parseInt(academic_year_id));
        whereClause += ` AND academic_year_id = $${params.length}`;
      }

      const { rows } = await pool.query(
        `SELECT id, branch_id, academic_year_id,
                monday, tuesday, wednesday, thursday, friday, saturday, sunday,
                monday_start, monday_end, tuesday_start, tuesday_end,
                wednesday_start, wednesday_end, thursday_start, thursday_end,
                friday_start, friday_end, saturday_start, saturday_end,
                sunday_start, sunday_end,
                total_working_days, created_at, updated_at
         FROM week_config ${whereClause}
         LIMIT 1`,
        params
      );

      if (rows.length === 0) {
        // Return default config if not set
        return res.json({
          success: true,
          data: {
            monday: true, tuesday: true, wednesday: true,
            thursday: true, friday: true, saturday: true, sunday: false,
            total_working_days: 6
          },
          message: 'Default week configuration (not yet customized)'
        });
      }

      return res.json({
        success: true,
        data: rows[0],
        message: 'Week configuration retrieved successfully'
      });
    } catch (error) {
      console.error('Error getting week config:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve week configuration',
        error: { code: 'INTERNAL_ERROR', message: error.message }
      });
    }
  }
);

// #82 PUT /week-config — Set working/off days
router.put(
  '/week-config',
  requireAuth,
  requireRole('time_config', 'update'),
  async (req, res) => {
    try {
      const {
        branch_id, academic_year_id,
        monday, tuesday, wednesday, thursday, friday, saturday, sunday,
        monday_start, monday_end, tuesday_start, tuesday_end,
        wednesday_start, wednesday_end, thursday_start, thursday_end,
        friday_start, friday_end, saturday_start, saturday_end,
        sunday_start, sunday_end
      } = req.body;

      // Calculate total working days
      const days = { monday, tuesday, wednesday, thursday, friday, saturday, sunday };
      const total_working_days = Object.values(days).filter(d => d === true).length;

      // Upsert — insert if not exists, update if exists
      const existing = await pool.query(
        `SELECT id FROM week_config WHERE school_id = $1 AND branch_id ${branch_id ? '= $2' : 'IS NULL'} AND academic_year_id ${academic_year_id ? `= $${branch_id ? 3 : 2}` : 'IS NULL'}`,
        [req.user.school_id, ...(branch_id ? [branch_id] : []), ...(academic_year_id ? [academic_year_id] : [])].filter(Boolean)
      );

      let result;

      if (existing.rows.length > 0) {
        // Update existing
        result = await pool.query(
          `UPDATE week_config SET
            monday = COALESCE($1, monday), tuesday = COALESCE($2, tuesday),
            wednesday = COALESCE($3, wednesday), thursday = COALESCE($4, thursday),
            friday = COALESCE($5, friday), saturday = COALESCE($6, saturday),
            sunday = COALESCE($7, sunday),
            monday_start = COALESCE($8, monday_start), monday_end = COALESCE($9, monday_end),
            tuesday_start = COALESCE($10, tuesday_start), tuesday_end = COALESCE($11, tuesday_end),
            wednesday_start = COALESCE($12, wednesday_start), wednesday_end = COALESCE($13, wednesday_end),
            thursday_start = COALESCE($14, thursday_start), thursday_end = COALESCE($15, thursday_end),
            friday_start = COALESCE($16, friday_start), friday_end = COALESCE($17, friday_end),
            saturday_start = COALESCE($18, saturday_start), saturday_end = COALESCE($19, saturday_end),
            sunday_start = COALESCE($20, sunday_start), sunday_end = COALESCE($21, sunday_end),
            total_working_days = $22, updated_at = NOW(), updated_by = $23
           WHERE id = $24
           RETURNING *`,
          [
            monday, tuesday, wednesday, thursday, friday, saturday, sunday,
            monday_start || null, monday_end || null,
            tuesday_start || null, tuesday_end || null,
            wednesday_start || null, wednesday_end || null,
            thursday_start || null, thursday_end || null,
            friday_start || null, friday_end || null,
            saturday_start || null, saturday_end || null,
            sunday_start || null, sunday_end || null,
            total_working_days, req.user.id, existing.rows[0].id
          ]
        );
      } else {
        // Insert new
        result = await pool.query(
          `INSERT INTO week_config (
            school_id, branch_id, academic_year_id,
            monday, tuesday, wednesday, thursday, friday, saturday, sunday,
            monday_start, monday_end, tuesday_start, tuesday_end,
            wednesday_start, wednesday_end, thursday_start, thursday_end,
            friday_start, friday_end, saturday_start, saturday_end,
            sunday_start, sunday_end,
            total_working_days, created_by, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, NOW())
          RETURNING *`,
          [
            req.user.school_id, branch_id || null, academic_year_id || null,
            monday !== undefined ? monday : true,
            tuesday !== undefined ? tuesday : true,
            wednesday !== undefined ? wednesday : true,
            thursday !== undefined ? thursday : true,
            friday !== undefined ? friday : true,
            saturday !== undefined ? saturday : true,
            sunday !== undefined ? sunday : false,
            monday_start || null, monday_end || null,
            tuesday_start || null, tuesday_end || null,
            wednesday_start || null, wednesday_end || null,
            thursday_start || null, thursday_end || null,
            friday_start || null, friday_end || null,
            saturday_start || null, saturday_end || null,
            sunday_start || null, sunday_end || null,
            total_working_days, req.user.id
          ]
        );
      }

      return res.json({
        success: true,
        data: result.rows[0],
        message: 'Week configuration updated successfully'
      });
    } catch (error) {
      console.error('Error updating week config:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update week configuration',
        error: { code: 'INTERNAL_ERROR', message: error.message }
      });
    }
  }
);

module.exports = router;
