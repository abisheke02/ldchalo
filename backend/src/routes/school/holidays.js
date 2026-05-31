/**
 * Chalo Schools ERP - Holidays Routes
 * Endpoints 33-37: Holidays CRUD + bulk import
 * File: routes/holidays.js
 */

const express = require('express');
const router = express.Router();
const pool = require('../../config/database');
const { requireAuth } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/auth');

// ─────────────────────────────────────────────────────────────────────────────
// #33 GET /holidays — List holidays (filter by academic year, month, type)
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  '/',
  requireAuth,
  requireRole('holidays', 'read'),
  async (req, res) => {
    try {
      const {
        page = 1,
        limit = 100,
        academic_year_id,
        month,
        type,
        branch_id,
        search,
        from_date,
        to_date
      } = req.query;
      const offset = (page - 1) * limit;
      const params = [req.user.school_id];
      let whereClause = 'WHERE school_id = $1';

      if (academic_year_id) {
        params.push(parseInt(academic_year_id));
        whereClause += ` AND academic_year_id = $${params.length}`;
      }

      if (month) {
        params.push(parseInt(month));
        whereClause += ` AND EXTRACT(MONTH FROM holiday_date) = $${params.length}`;
      }

      if (type) {
        params.push(type);
        whereClause += ` AND type = $${params.length}`;
      }

      if (branch_id) {
        params.push(parseInt(branch_id));
        whereClause += ` AND (branch_id = $${params.length} OR branch_id IS NULL)`;
      }

      if (search) {
        params.push(`%${search}%`);
        whereClause += ` AND (name ILIKE $${params.length} OR description ILIKE $${params.length})`;
      }

      if (from_date) {
        params.push(from_date);
        whereClause += ` AND holiday_date >= $${params.length}::date`;
      }

      if (to_date) {
        params.push(to_date);
        whereClause += ` AND holiday_date <= $${params.length}::date`;
      }

      // Count
      const countResult = await pool.query(
        `SELECT COUNT(*) FROM holidays ${whereClause}`,
        params
      );
      const total = parseInt(countResult.rows[0].count);

      // Data
      params.push(parseInt(limit), offset);
      const { rows } = await pool.query(
        `SELECT id, name, holiday_date, end_date, type, description,
                academic_year_id, branch_id, is_recurring, applicable_to,
                created_at
         FROM holidays ${whereClause}
         ORDER BY holiday_date ASC
         LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params
      );

      return res.json({
        success: true,
        data: rows,
        message: 'Holidays retrieved successfully',
        meta: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('Error listing holidays:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve holidays',
        error: { code: 'INTERNAL_ERROR', message: error.message }
      });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// #34 POST /holidays — Create holiday
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  '/',
  requireAuth,
  requireRole('holidays', 'create'),
  async (req, res) => {
    try {
      const {
        name, holiday_date, end_date, type, description,
        academic_year_id, branch_id, is_recurring = false,
        applicable_to = 'all'
      } = req.body;

      // Validation
      if (!name || !holiday_date || !academic_year_id) {
        return res.status(400).json({
          success: false,
          message: 'Name, holiday_date, and academic_year_id are required'
        });
      }

      // Validate type
      const validTypes = ['public', 'school', 'religious', 'national', 'other'];
      if (type && !validTypes.includes(type)) {
        return res.status(400).json({
          success: false,
          message: `Type must be one of: ${validTypes.join(', ')}`
        });
      }

      // Validate date format
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(holiday_date)) {
        return res.status(400).json({
          success: false,
          message: 'holiday_date must be in YYYY-MM-DD format'
        });
      }

      // Check for duplicate on same date
      const existing = await pool.query(
        'SELECT id FROM holidays WHERE school_id = $1 AND holiday_date = $2 AND name = $3 AND academic_year_id = $4',
        [req.user.school_id, holiday_date, name, academic_year_id]
      );
      if (existing.rows.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'A holiday with the same name on this date already exists'
        });
      }

      const { rows } = await pool.query(
        `INSERT INTO holidays (school_id, name, holiday_date, end_date, type, description, academic_year_id, branch_id, is_recurring, applicable_to, created_by, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
         RETURNING *`,
        [
          req.user.school_id, name.trim(), holiday_date, end_date || holiday_date,
          type || 'school', description || null, academic_year_id,
          branch_id || null, is_recurring, applicable_to, req.user.id
        ]
      );

      return res.status(201).json({
        success: true,
        data: rows[0],
        message: 'Holiday created successfully'
      });
    } catch (error) {
      console.error('Error creating holiday:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to create holiday',
        error: { code: 'INTERNAL_ERROR', message: error.message }
      });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// #35 POST /holidays/bulk — Bulk import holidays (Excel/JSON)
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  '/bulk',
  requireAuth,
  requireRole('holidays', 'create'),
  async (req, res) => {
    try {
      const { items, academic_year_id } = req.body;

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'items array is required and must not be empty'
        });
      }

      if (!academic_year_id) {
        return res.status(400).json({
          success: false,
          message: 'academic_year_id is required'
        });
      }

      if (items.length > 200) {
        return res.status(400).json({
          success: false,
          message: 'Maximum 200 holidays can be imported at once'
        });
      }

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        const results = { created: 0, skipped: 0, errors: [] };

        for (let i = 0; i < items.length; i++) {
          const item = items[i];

          // Validate each item
          if (!item.name || !item.holiday_date) {
            results.errors.push({ row: i + 1, message: 'name and holiday_date are required' });
            results.skipped++;
            continue;
          }

          // Check for duplicate
          const existing = await client.query(
            'SELECT id FROM holidays WHERE school_id = $1 AND holiday_date = $2 AND name = $3 AND academic_year_id = $4',
            [req.user.school_id, item.holiday_date, item.name, academic_year_id]
          );

          if (existing.rows.length > 0) {
            results.skipped++;
            results.errors.push({ row: i + 1, message: `Duplicate: ${item.name} on ${item.holiday_date}` });
            continue;
          }

          await client.query(
            `INSERT INTO holidays (school_id, name, holiday_date, end_date, type, description, academic_year_id, branch_id, is_recurring, applicable_to, created_by, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())`,
            [
              req.user.school_id, item.name.trim(), item.holiday_date,
              item.end_date || item.holiday_date, item.type || 'school',
              item.description || null, academic_year_id,
              item.branch_id || null, item.is_recurring || false,
              item.applicable_to || 'all', req.user.id
            ]
          );
          results.created++;
        }

        await client.query('COMMIT');

        return res.status(201).json({
          success: true,
          data: results,
          message: `Bulk import complete: ${results.created} created, ${results.skipped} skipped`
        });
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error bulk importing holidays:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to bulk import holidays',
        error: { code: 'INTERNAL_ERROR', message: error.message }
      });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// #36 PUT /holidays/:id — Update holiday
// ─────────────────────────────────────────────────────────────────────────────
router.put(
  '/:id',
  requireAuth,
  requireRole('holidays', 'update'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const {
        name, holiday_date, end_date, type, description,
        branch_id, is_recurring, applicable_to
      } = req.body;

      // Verify exists
      const existing = await pool.query(
        'SELECT id FROM holidays WHERE id = $1 AND school_id = $2',
        [id, req.user.school_id]
      );
      if (existing.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Holiday not found'
        });
      }

      // Build dynamic update
      const updates = [];
      const params = [];
      let idx = 1;

      if (name !== undefined) { updates.push(`name = $${idx}`); params.push(name.trim()); idx++; }
      if (holiday_date !== undefined) { updates.push(`holiday_date = $${idx}`); params.push(holiday_date); idx++; }
      if (end_date !== undefined) { updates.push(`end_date = $${idx}`); params.push(end_date); idx++; }
      if (type !== undefined) { updates.push(`type = $${idx}`); params.push(type); idx++; }
      if (description !== undefined) { updates.push(`description = $${idx}`); params.push(description); idx++; }
      if (branch_id !== undefined) { updates.push(`branch_id = $${idx}`); params.push(branch_id); idx++; }
      if (is_recurring !== undefined) { updates.push(`is_recurring = $${idx}`); params.push(is_recurring); idx++; }
      if (applicable_to !== undefined) { updates.push(`applicable_to = $${idx}`); params.push(applicable_to); idx++; }

      if (updates.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No fields to update'
        });
      }

      updates.push(`updated_at = NOW()`);
      updates.push(`updated_by = $${idx}`);
      params.push(req.user.id);
      idx++;
      params.push(id);

      const { rows } = await pool.query(
        `UPDATE holidays SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
        params
      );

      return res.json({
        success: true,
        data: rows[0],
        message: 'Holiday updated successfully'
      });
    } catch (error) {
      console.error('Error updating holiday:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update holiday',
        error: { code: 'INTERNAL_ERROR', message: error.message }
      });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// #37 DELETE /holidays/:id — Delete holiday
// ─────────────────────────────────────────────────────────────────────────────
router.delete(
  '/:id',
  requireAuth,
  requireRole('holidays', 'delete'),
  async (req, res) => {
    try {
      const { id } = req.params;

      const result = await pool.query(
        'DELETE FROM holidays WHERE id = $1 AND school_id = $2 RETURNING id, name',
        [id, req.user.school_id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Holiday not found'
        });
      }

      return res.json({
        success: true,
        data: null,
        message: `Holiday "${result.rows[0].name}" deleted successfully`
      });
    } catch (error) {
      console.error('Error deleting holiday:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete holiday',
        error: { code: 'INTERNAL_ERROR', message: error.message }
      });
    }
  }
);

module.exports = router;
