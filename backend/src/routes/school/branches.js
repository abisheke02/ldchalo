/**
 * Chalo Schools ERP - Branch Management Routes
 * Endpoints 29-32: Branch CRUD
 * File: routes/branches.js
 */

const express = require('express');
const router = express.Router();
const pool = require('../../config/database');
const { requireAuth } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/auth');

// ─────────────────────────────────────────────────────────────────────────────
// #29 GET /branches — List branches
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  '/',
  requireAuth,
  requireRole('branches', 'read'),
  async (req, res) => {
    try {
      const { page = 1, limit = 50, search, is_active, sort = 'name', order = 'asc' } = req.query;
      const offset = (page - 1) * limit;
      const params = [req.user.school_id];
      let whereClause = 'WHERE school_id = $1';

      if (is_active !== undefined) {
        params.push(is_active === 'true');
        whereClause += ` AND is_active = $${params.length}`;
      }

      if (search) {
        params.push(`%${search}%`);
        whereClause += ` AND (name ILIKE $${params.length} OR code ILIKE $${params.length} OR city ILIKE $${params.length})`;
      }

      // Count
      const countResult = await pool.query(
        `SELECT COUNT(*) FROM branches ${whereClause}`,
        params
      );
      const total = parseInt(countResult.rows[0].count);

      // Validate sort
      const allowedSorts = ['name', 'code', 'city', 'created_at'];
      const sortCol = allowedSorts.includes(sort) ? sort : 'name';
      const sortOrder = order.toLowerCase() === 'desc' ? 'DESC' : 'ASC';

      // Data
      params.push(parseInt(limit), offset);
      const { rows } = await pool.query(
        `SELECT id, name, code, address, city, state, pincode, phone, email,
                principal_name, is_active, is_main, student_count, staff_count,
                created_at, updated_at
         FROM branches ${whereClause}
         ORDER BY is_main DESC, ${sortCol} ${sortOrder}
         LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params
      );

      return res.json({
        success: true,
        data: rows,
        message: 'Branches retrieved successfully',
        meta: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('Error listing branches:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve branches',
        error: { code: 'INTERNAL_ERROR', message: error.message }
      });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// #30 POST /branches — Create branch
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  '/',
  requireAuth,
  requireRole('branches', 'create'),
  async (req, res) => {
    try {
      const {
        name, code, address, city, state, pincode,
        phone, email, principal_name, is_main = false
      } = req.body;

      // Validation
      if (!name || !code) {
        return res.status(400).json({
          success: false,
          message: 'Branch name and code are required'
        });
      }

      // Check duplicate code
      const existing = await pool.query(
        'SELECT id FROM branches WHERE school_id = $1 AND code = $2',
        [req.user.school_id, code.toUpperCase()]
      );
      if (existing.rows.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'A branch with this code already exists'
        });
      }

      const { rows } = await pool.query(
        `INSERT INTO branches (school_id, name, code, address, city, state, pincode, phone, email, principal_name, is_main, is_active, created_by, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true, $12, NOW())
         RETURNING *`,
        [
          req.user.school_id, name.trim(), code.toUpperCase(), address || null,
          city || null, state || null, pincode || null, phone || null,
          email || null, principal_name || null, is_main, req.user.id
        ]
      );

      return res.status(201).json({
        success: true,
        data: rows[0],
        message: 'Branch created successfully'
      });
    } catch (error) {
      console.error('Error creating branch:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to create branch',
        error: { code: 'INTERNAL_ERROR', message: error.message }
      });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// #31 PUT /branches/:id — Update branch
// ─────────────────────────────────────────────────────────────────────────────
router.put(
  '/:id',
  requireAuth,
  requireRole('branches', 'update'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const {
        name, code, address, city, state, pincode,
        phone, email, principal_name, is_active, is_main
      } = req.body;

      // Verify branch exists
      const existing = await pool.query(
        'SELECT id FROM branches WHERE id = $1 AND school_id = $2',
        [id, req.user.school_id]
      );
      if (existing.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Branch not found'
        });
      }

      // Check code uniqueness if changed
      if (code) {
        const codeCheck = await pool.query(
          'SELECT id FROM branches WHERE school_id = $1 AND code = $2 AND id != $3',
          [req.user.school_id, code.toUpperCase(), id]
        );
        if (codeCheck.rows.length > 0) {
          return res.status(409).json({
            success: false,
            message: 'Branch code already in use'
          });
        }
      }

      // Build dynamic update
      const updates = [];
      const params = [];
      let idx = 1;

      if (name !== undefined) { updates.push(`name = $${idx}`); params.push(name.trim()); idx++; }
      if (code !== undefined) { updates.push(`code = $${idx}`); params.push(code.toUpperCase()); idx++; }
      if (address !== undefined) { updates.push(`address = $${idx}`); params.push(address); idx++; }
      if (city !== undefined) { updates.push(`city = $${idx}`); params.push(city); idx++; }
      if (state !== undefined) { updates.push(`state = $${idx}`); params.push(state); idx++; }
      if (pincode !== undefined) { updates.push(`pincode = $${idx}`); params.push(pincode); idx++; }
      if (phone !== undefined) { updates.push(`phone = $${idx}`); params.push(phone); idx++; }
      if (email !== undefined) { updates.push(`email = $${idx}`); params.push(email); idx++; }
      if (principal_name !== undefined) { updates.push(`principal_name = $${idx}`); params.push(principal_name); idx++; }
      if (is_active !== undefined) { updates.push(`is_active = $${idx}`); params.push(is_active); idx++; }
      if (is_main !== undefined) { updates.push(`is_main = $${idx}`); params.push(is_main); idx++; }

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
        `UPDATE branches SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
        params
      );

      return res.json({
        success: true,
        data: rows[0],
        message: 'Branch updated successfully'
      });
    } catch (error) {
      console.error('Error updating branch:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update branch',
        error: { code: 'INTERNAL_ERROR', message: error.message }
      });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// #32 DELETE /branches/:id — Delete branch
// ─────────────────────────────────────────────────────────────────────────────
router.delete(
  '/:id',
  requireAuth,
  requireRole('branches', 'delete'),
  async (req, res) => {
    try {
      const { id } = req.params;

      // Verify branch exists
      const existing = await pool.query(
        'SELECT id, is_main, student_count, staff_count FROM branches WHERE id = $1 AND school_id = $2',
        [id, req.user.school_id]
      );
      if (existing.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Branch not found'
        });
      }

      // Prevent deleting main branch
      if (existing.rows[0].is_main) {
        return res.status(403).json({
          success: false,
          message: 'Main branch cannot be deleted'
        });
      }

      // Prevent deleting if branch has students/staff
      const branch = existing.rows[0];
      if (branch.student_count > 0 || branch.staff_count > 0) {
        return res.status(409).json({
          success: false,
          message: 'Cannot delete branch with assigned students or staff. Transfer them first.'
        });
      }

      // Soft delete — mark inactive
      await pool.query(
        'UPDATE branches SET is_active = false, updated_at = NOW(), updated_by = $1 WHERE id = $2',
        [req.user.id, id]
      );

      return res.json({
        success: true,
        data: null,
        message: 'Branch deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting branch:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete branch',
        error: { code: 'INTERNAL_ERROR', message: error.message }
      });
    }
  }
);

module.exports = router;
