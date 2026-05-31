/**
 * Chalo Schools ERP - User Management Routes
 * Endpoints 16-23: User CRUD + login history + activity log
 * File: routes/users.js
 */

const express = require('express');
const router = express.Router();
const pool = require('../../config/database');
const { requireAuth } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/auth');
const bcrypt = require('bcryptjs');

// ─────────────────────────────────────────────────────────────────────────────
// #16 GET /users — List all users (filterable by role, status)
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  '/',
  requireAuth,
  requireRole('users', 'read'),
  async (req, res) => {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        role_id,
        status,
        sort = 'name',
        order = 'asc'
      } = req.query;
      const offset = (page - 1) * limit;
      const params = [req.user.school_id];
      let whereClause = 'WHERE u.school_id = $1';

      if (search) {
        params.push(`%${search}%`);
        whereClause += ` AND (u.name ILIKE $${params.length} OR u.email ILIKE $${params.length} OR u.phone ILIKE $${params.length})`;
      }

      if (role_id) {
        params.push(parseInt(role_id));
        whereClause += ` AND ur.role_id = $${params.length}`;
      }

      if (status) {
        params.push(status);
        whereClause += ` AND u.status = $${params.length}`;
      }

      // Validate sort column to prevent SQL injection
      const allowedSorts = ['name', 'email', 'created_at', 'last_login_at', 'status'];
      const sortCol = allowedSorts.includes(sort) ? `u.${sort}` : 'u.name';
      const sortOrder = order.toLowerCase() === 'desc' ? 'DESC' : 'ASC';

      // Count
      const countResult = await pool.query(
        `SELECT COUNT(DISTINCT u.id) FROM users u
         LEFT JOIN user_roles ur ON ur.user_id = u.id
         ${whereClause}`,
        params
      );
      const total = parseInt(countResult.rows[0].count);

      // Data
      params.push(parseInt(limit), offset);
      const { rows } = await pool.query(
        `SELECT u.id, u.name, u.email, u.phone, u.status, u.avatar_url,
                u.last_login_at, u.created_at,
                json_agg(json_build_object('id', r.id, 'name', r.name)) FILTER (WHERE r.id IS NOT NULL) AS roles
         FROM users u
         LEFT JOIN user_roles ur ON ur.user_id = u.id
         LEFT JOIN roles r ON r.id = ur.role_id
         ${whereClause}
         GROUP BY u.id
         ORDER BY ${sortCol} ${sortOrder}
         LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params
      );

      return res.json({
        success: true,
        data: rows,
        message: 'Users retrieved successfully',
        meta: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('Error listing users:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve users',
        error: { code: 'INTERNAL_ERROR', message: error.message }
      });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// #17 POST /users — Create user + assign role
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  '/',
  requireAuth,
  requireRole('users', 'create'),
  async (req, res) => {
    try {
      const { name, email, phone, password, role_id, branch_id, status = 'active' } = req.body;

      // Validation
      if (!name || !email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Name, email, and password are required'
        });
      }

      // Email format check
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid email format'
        });
      }

      // Check duplicate email
      const existing = await pool.query(
        'SELECT id FROM users WHERE email = $1 AND school_id = $2',
        [email.toLowerCase(), req.user.school_id]
      );
      if (existing.rows.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'A user with this email already exists'
        });
      }

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Create user
        const { rows } = await client.query(
          `INSERT INTO users (school_id, name, email, phone, password_hash, status, branch_id, created_by, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
           RETURNING id, name, email, phone, status, branch_id, created_at`,
          [req.user.school_id, name.trim(), email.toLowerCase(), phone || null, hashedPassword, status, branch_id || null, req.user.id]
        );

        const user = rows[0];

        // Assign role if provided
        if (role_id) {
          await client.query(
            'INSERT INTO user_roles (user_id, role_id, school_id, assigned_by) VALUES ($1, $2, $3, $4)',
            [user.id, role_id, req.user.school_id, req.user.id]
          );
        }

        await client.query('COMMIT');

        return res.status(201).json({
          success: true,
          data: user,
          message: 'User created successfully'
        });
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error creating user:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to create user',
        error: { code: 'INTERNAL_ERROR', message: error.message }
      });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// #18 GET /users/:id — Get user details
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  '/:id',
  requireAuth,
  requireRole('users', 'read'),
  async (req, res) => {
    try {
      const { id } = req.params;

      const { rows } = await pool.query(
        `SELECT u.id, u.name, u.email, u.phone, u.status, u.avatar_url,
                u.branch_id, u.last_login_at, u.login_count, u.created_at, u.updated_at,
                json_agg(json_build_object('id', r.id, 'name', r.name, 'slug', r.slug)) FILTER (WHERE r.id IS NOT NULL) AS roles,
                b.name AS branch_name
         FROM users u
         LEFT JOIN user_roles ur ON ur.user_id = u.id
         LEFT JOIN roles r ON r.id = ur.role_id
         LEFT JOIN branches b ON b.id = u.branch_id
         WHERE u.id = $1 AND u.school_id = $2
         GROUP BY u.id, b.name`,
        [id, req.user.school_id]
      );

      if (rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      return res.json({
        success: true,
        data: rows[0],
        message: 'User retrieved successfully'
      });
    } catch (error) {
      console.error('Error getting user:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve user',
        error: { code: 'INTERNAL_ERROR', message: error.message }
      });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// #19 PUT /users/:id — Update user
// ─────────────────────────────────────────────────────────────────────────────
router.put(
  '/:id',
  requireAuth,
  requireRole('users', 'update'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { name, email, phone, branch_id } = req.body;

      // Verify user exists
      const existing = await pool.query(
        'SELECT id FROM users WHERE id = $1 AND school_id = $2',
        [id, req.user.school_id]
      );
      if (existing.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Check email uniqueness if changed
      if (email) {
        const emailCheck = await pool.query(
          'SELECT id FROM users WHERE email = $1 AND school_id = $2 AND id != $3',
          [email.toLowerCase(), req.user.school_id, id]
        );
        if (emailCheck.rows.length > 0) {
          return res.status(409).json({
            success: false,
            message: 'Email already in use by another user'
          });
        }
      }

      // Build dynamic update
      const updates = [];
      const params = [];
      let idx = 1;

      if (name !== undefined) { updates.push(`name = $${idx}`); params.push(name.trim()); idx++; }
      if (email !== undefined) { updates.push(`email = $${idx}`); params.push(email.toLowerCase()); idx++; }
      if (phone !== undefined) { updates.push(`phone = $${idx}`); params.push(phone); idx++; }
      if (branch_id !== undefined) { updates.push(`branch_id = $${idx}`); params.push(branch_id); idx++; }

      updates.push(`updated_at = NOW()`);
      updates.push(`updated_by = $${idx}`);
      params.push(req.user.id);
      idx++;

      params.push(id);

      const { rows } = await pool.query(
        `UPDATE users SET ${updates.join(', ')} WHERE id = $${idx} RETURNING id, name, email, phone, status, branch_id, updated_at`,
        params
      );

      return res.json({
        success: true,
        data: rows[0],
        message: 'User updated successfully'
      });
    } catch (error) {
      console.error('Error updating user:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update user',
        error: { code: 'INTERNAL_ERROR', message: error.message }
      });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// #20 PATCH /users/:id/status — Activate/deactivate user
// ─────────────────────────────────────────────────────────────────────────────
router.patch(
  '/:id/status',
  requireAuth,
  requireRole('users', 'update'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      // Validate status
      const validStatuses = ['active', 'inactive', 'suspended'];
      if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Status must be one of: ${validStatuses.join(', ')}`
        });
      }

      // Prevent self-deactivation
      if (parseInt(id) === req.user.id && status !== 'active') {
        return res.status(403).json({
          success: false,
          message: 'You cannot deactivate your own account'
        });
      }

      const { rows } = await pool.query(
        `UPDATE users SET status = $1, updated_at = NOW(), updated_by = $2
         WHERE id = $3 AND school_id = $4
         RETURNING id, name, email, status`,
        [status, req.user.id, id, req.user.school_id]
      );

      if (rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      return res.json({
        success: true,
        data: rows[0],
        message: `User ${status === 'active' ? 'activated' : 'deactivated'} successfully`
      });
    } catch (error) {
      console.error('Error updating user status:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update user status',
        error: { code: 'INTERNAL_ERROR', message: error.message }
      });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// #21 POST /users/:id/assign-role — Assign role to user
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  '/:id/assign-role',
  requireAuth,
  requireRole('users', 'update'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { role_id, replace = false } = req.body;

      if (!role_id) {
        return res.status(400).json({
          success: false,
          message: 'role_id is required'
        });
      }

      // Verify user exists
      const user = await pool.query(
        'SELECT id, name FROM users WHERE id = $1 AND school_id = $2',
        [id, req.user.school_id]
      );
      if (user.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Verify role exists
      const role = await pool.query(
        'SELECT id, name FROM roles WHERE id = $1 AND school_id = $2',
        [role_id, req.user.school_id]
      );
      if (role.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Role not found'
        });
      }

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // If replace mode, remove existing roles
        if (replace) {
          await client.query('DELETE FROM user_roles WHERE user_id = $1', [id]);
        }

        // Check if already assigned
        const existing = await client.query(
          'SELECT id FROM user_roles WHERE user_id = $1 AND role_id = $2',
          [id, role_id]
        );
        if (existing.rows.length > 0) {
          await client.query('ROLLBACK');
          return res.status(409).json({
            success: false,
            message: 'Role already assigned to this user'
          });
        }

        // Assign role
        await client.query(
          'INSERT INTO user_roles (user_id, role_id, school_id, assigned_by, assigned_at) VALUES ($1, $2, $3, $4, NOW())',
          [id, role_id, req.user.school_id, req.user.id]
        );

        await client.query('COMMIT');

        return res.json({
          success: true,
          data: { user_id: parseInt(id), role_id: parseInt(role_id), role_name: role.rows[0].name },
          message: 'Role assigned successfully'
        });
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error assigning role:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to assign role',
        error: { code: 'INTERNAL_ERROR', message: error.message }
      });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// #22 GET /users/login-history — Login history log
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  '/login-history',
  requireAuth,
  requireRole('users', 'read'),
  async (req, res) => {
    try {
      const {
        page = 1,
        limit = 50,
        user_id,
        from_date,
        to_date,
        status
      } = req.query;
      const offset = (page - 1) * limit;
      const params = [req.user.school_id];
      let whereClause = 'WHERE lh.school_id = $1';

      if (user_id) {
        params.push(parseInt(user_id));
        whereClause += ` AND lh.user_id = $${params.length}`;
      }

      if (from_date) {
        params.push(from_date);
        whereClause += ` AND lh.login_at >= $${params.length}::date`;
      }

      if (to_date) {
        params.push(to_date);
        whereClause += ` AND lh.login_at <= ($${params.length}::date + interval '1 day')`;
      }

      if (status) {
        params.push(status);
        whereClause += ` AND lh.status = $${params.length}`;
      }

      // Count
      const countResult = await pool.query(
        `SELECT COUNT(*) FROM login_history lh ${whereClause}`,
        params
      );
      const total = parseInt(countResult.rows[0].count);

      // Data
      params.push(parseInt(limit), offset);
      const { rows } = await pool.query(
        `SELECT lh.id, lh.user_id, u.name AS user_name, u.email,
                lh.login_at, lh.logout_at, lh.ip_address, lh.user_agent,
                lh.status, lh.failure_reason
         FROM login_history lh
         JOIN users u ON u.id = lh.user_id
         ${whereClause}
         ORDER BY lh.login_at DESC
         LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params
      );

      return res.json({
        success: true,
        data: rows,
        message: 'Login history retrieved successfully',
        meta: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('Error getting login history:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve login history',
        error: { code: 'INTERNAL_ERROR', message: error.message }
      });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// #23 GET /users/activity-log — User activity tracking
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  '/activity-log',
  requireAuth,
  requireRole('users', 'read'),
  async (req, res) => {
    try {
      const {
        page = 1,
        limit = 50,
        user_id,
        action,
        module,
        from_date,
        to_date
      } = req.query;
      const offset = (page - 1) * limit;
      const params = [req.user.school_id];
      let whereClause = 'WHERE al.school_id = $1';

      if (user_id) {
        params.push(parseInt(user_id));
        whereClause += ` AND al.user_id = $${params.length}`;
      }

      if (action) {
        params.push(action);
        whereClause += ` AND al.action = $${params.length}`;
      }

      if (module) {
        params.push(module);
        whereClause += ` AND al.module = $${params.length}`;
      }

      if (from_date) {
        params.push(from_date);
        whereClause += ` AND al.performed_at >= $${params.length}::date`;
      }

      if (to_date) {
        params.push(to_date);
        whereClause += ` AND al.performed_at <= ($${params.length}::date + interval '1 day')`;
      }

      // Count
      const countResult = await pool.query(
        `SELECT COUNT(*) FROM activity_log al ${whereClause}`,
        params
      );
      const total = parseInt(countResult.rows[0].count);

      // Data
      params.push(parseInt(limit), offset);
      const { rows } = await pool.query(
        `SELECT al.id, al.user_id, u.name AS user_name,
                al.action, al.module, al.entity_type, al.entity_id,
                al.description, al.old_values, al.new_values,
                al.ip_address, al.performed_at
         FROM activity_log al
         JOIN users u ON u.id = al.user_id
         ${whereClause}
         ORDER BY al.performed_at DESC
         LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params
      );

      return res.json({
        success: true,
        data: rows,
        message: 'Activity log retrieved successfully',
        meta: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('Error getting activity log:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve activity log',
        error: { code: 'INTERNAL_ERROR', message: error.message }
      });
    }
  }
);

module.exports = router;
