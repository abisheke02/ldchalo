/**
 * Chalo Schools ERP - Roles & Permissions Routes
 * Endpoints 9-15: CRUD roles + permission matrix
 * File: routes/roles.js
 */

const express = require('express');
const router = express.Router();
const pool = require('../../config/database');
const { requireAuth } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/auth');

// ─────────────────────────────────────────────────────────────────────────────
// #9 GET /roles — List all roles
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  '/',
  requireAuth,
  requireRole('roles', 'read'),
  async (req, res) => {
    try {
      const { page = 1, limit = 50, search, is_system } = req.query;
      const offset = (page - 1) * limit;
      const params = [req.user.school_id];
      let whereClause = 'WHERE school_id = $1';

      if (is_system !== undefined) {
        params.push(is_system === 'true');
        whereClause += ` AND is_system = $${params.length}`;
      }

      if (search) {
        params.push(`%${search}%`);
        whereClause += ` AND (name ILIKE $${params.length} OR description ILIKE $${params.length})`;
      }

      // Count query
      const countResult = await pool.query(
        `SELECT COUNT(*) FROM roles ${whereClause}`,
        params
      );
      const total = parseInt(countResult.rows[0].count);

      // Data query
      params.push(parseInt(limit), offset);
      const { rows } = await pool.query(
        `SELECT id, name, slug, description, is_system, is_active, user_count, created_at, updated_at
         FROM roles ${whereClause}
         ORDER BY is_system DESC, name ASC
         LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params
      );

      return res.json({
        success: true,
        data: rows,
        message: 'Roles retrieved successfully',
        meta: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('Error listing roles:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve roles',
        error: { code: 'INTERNAL_ERROR', message: error.message }
      });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// #10 POST /roles — Create custom role
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  '/',
  requireAuth,
  requireRole('roles', 'create'),
  async (req, res) => {
    try {
      const { name, description, permissions } = req.body;

      // Validation
      if (!name || name.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: 'Role name is required and must be at least 2 characters'
        });
      }

      // Generate slug from name
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/(^_|_$)/g, '');

      // Check duplicate
      const existing = await pool.query(
        'SELECT id FROM roles WHERE school_id = $1 AND slug = $2',
        [req.user.school_id, slug]
      );
      if (existing.rows.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'A role with this name already exists'
        });
      }

      // Insert role
      const { rows } = await pool.query(
        `INSERT INTO roles (school_id, name, slug, description, is_system, is_active, created_by, created_at)
         VALUES ($1, $2, $3, $4, false, true, $5, NOW())
         RETURNING *`,
        [req.user.school_id, name.trim(), slug, description || null, req.user.id]
      );

      const role = rows[0];

      // If permissions provided, assign them
      if (permissions && Array.isArray(permissions) && permissions.length > 0) {
        const permValues = permissions
          .filter(p => p.granted)
          .map((p, i) => `($1, $2, $${i + 3})`)
          .join(', ');

        if (permValues) {
          const permParams = [role.id, req.user.school_id, ...permissions.filter(p => p.granted).map(p => p.permission_id)];
          await pool.query(
            `INSERT INTO role_permissions (role_id, school_id, permission_id)
             VALUES ${permissions.filter(p => p.granted).map((_, i) => `($1, $2, $${i + 3})`).join(', ')}`,
            permParams
          );
        }
      }

      return res.status(201).json({
        success: true,
        data: role,
        message: 'Role created successfully'
      });
    } catch (error) {
      console.error('Error creating role:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to create role',
        error: { code: 'INTERNAL_ERROR', message: error.message }
      });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// #11 PUT /roles/:id — Update role
// ─────────────────────────────────────────────────────────────────────────────
router.put(
  '/:id',
  requireAuth,
  requireRole('roles', 'update'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description, is_active } = req.body;

      // Check role exists and belongs to school
      const existing = await pool.query(
        'SELECT * FROM roles WHERE id = $1 AND school_id = $2',
        [id, req.user.school_id]
      );
      if (existing.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Role not found'
        });
      }

      // Prevent editing system roles
      if (existing.rows[0].is_system) {
        return res.status(403).json({
          success: false,
          message: 'System roles cannot be modified'
        });
      }

      // Build dynamic update
      const updates = [];
      const params = [];
      let paramIndex = 1;

      if (name !== undefined) {
        updates.push(`name = $${paramIndex}`);
        params.push(name.trim());
        paramIndex++;
      }
      if (description !== undefined) {
        updates.push(`description = $${paramIndex}`);
        params.push(description);
        paramIndex++;
      }
      if (is_active !== undefined) {
        updates.push(`is_active = $${paramIndex}`);
        params.push(is_active);
        paramIndex++;
      }

      updates.push(`updated_at = NOW()`);
      updates.push(`updated_by = $${paramIndex}`);
      params.push(req.user.id);
      paramIndex++;

      params.push(id);

      const { rows } = await pool.query(
        `UPDATE roles SET ${updates.join(', ')} WHERE id = $${paramIndex - 1} RETURNING *`,
        params
      );

      // Fix: use the last param index for the WHERE clause
      const result = await pool.query(
        `UPDATE roles SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
        [...params.slice(0, -1), id]
      );

      return res.json({
        success: true,
        data: rows[0],
        message: 'Role updated successfully'
      });
    } catch (error) {
      console.error('Error updating role:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update role',
        error: { code: 'INTERNAL_ERROR', message: error.message }
      });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// #12 DELETE /roles/:id — Delete role (non-system only)
// ─────────────────────────────────────────────────────────────────────────────
router.delete(
  '/:id',
  requireAuth,
  requireRole('roles', 'delete'),
  async (req, res) => {
    try {
      const { id } = req.params;

      // Check role exists
      const existing = await pool.query(
        'SELECT * FROM roles WHERE id = $1 AND school_id = $2',
        [id, req.user.school_id]
      );
      if (existing.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Role not found'
        });
      }

      // Prevent deleting system roles
      if (existing.rows[0].is_system) {
        return res.status(403).json({
          success: false,
          message: 'System roles cannot be deleted'
        });
      }

      // Check if any users are assigned this role
      const usersWithRole = await pool.query(
        'SELECT COUNT(*) FROM user_roles WHERE role_id = $1',
        [id]
      );
      if (parseInt(usersWithRole.rows[0].count) > 0) {
        return res.status(409).json({
          success: false,
          message: 'Cannot delete role with assigned users. Reassign users first.'
        });
      }

      // Delete permissions first, then role
      await pool.query('DELETE FROM role_permissions WHERE role_id = $1', [id]);
      await pool.query('DELETE FROM roles WHERE id = $1', [id]);

      return res.json({
        success: true,
        data: null,
        message: 'Role deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting role:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete role',
        error: { code: 'INTERNAL_ERROR', message: error.message }
      });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// #13 GET /roles/:id/permissions — Get permissions for role
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  '/:id/permissions',
  requireAuth,
  requireRole('roles', 'read'),
  async (req, res) => {
    try {
      const { id } = req.params;

      // Verify role belongs to school
      const role = await pool.query(
        'SELECT id, name FROM roles WHERE id = $1 AND school_id = $2',
        [id, req.user.school_id]
      );
      if (role.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Role not found'
        });
      }

      // Get all permissions with granted status for this role
      const { rows } = await pool.query(
        `SELECT p.id, p.module, p.action, p.name, p.description,
                CASE WHEN rp.id IS NOT NULL THEN true ELSE false END AS granted
         FROM permissions p
         LEFT JOIN role_permissions rp ON rp.permission_id = p.id AND rp.role_id = $1
         ORDER BY p.module, p.action`,
        [id]
      );

      // Group by module
      const grouped = rows.reduce((acc, perm) => {
        if (!acc[perm.module]) acc[perm.module] = [];
        acc[perm.module].push(perm);
        return acc;
      }, {});

      return res.json({
        success: true,
        data: {
          role: role.rows[0],
          permissions: rows,
          grouped
        },
        message: 'Permissions retrieved successfully'
      });
    } catch (error) {
      console.error('Error getting role permissions:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve permissions',
        error: { code: 'INTERNAL_ERROR', message: error.message }
      });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// #14 PUT /roles/:id/permissions — Set permission matrix for role
// ─────────────────────────────────────────────────────────────────────────────
router.put(
  '/:id/permissions',
  requireAuth,
  requireRole('roles', 'update'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { permissions } = req.body;

      if (!permissions || !Array.isArray(permissions)) {
        return res.status(400).json({
          success: false,
          message: 'permissions array is required'
        });
      }

      // Verify role belongs to school and isn't system
      const role = await pool.query(
        'SELECT id, is_system FROM roles WHERE id = $1 AND school_id = $2',
        [id, req.user.school_id]
      );
      if (role.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Role not found'
        });
      }

      if (role.rows[0].is_system) {
        return res.status(403).json({
          success: false,
          message: 'System role permissions cannot be modified'
        });
      }

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Remove all existing permissions for this role
        await client.query('DELETE FROM role_permissions WHERE role_id = $1', [id]);

        // Insert granted permissions
        const granted = permissions.filter(p => p.granted);
        if (granted.length > 0) {
          const values = granted.map((_, i) => `($1, $2, $${i + 3})`).join(', ');
          const params = [id, req.user.school_id, ...granted.map(p => p.permission_id)];
          await client.query(
            `INSERT INTO role_permissions (role_id, school_id, permission_id) VALUES ${values}`,
            params
          );
        }

        await client.query('COMMIT');

        return res.json({
          success: true,
          data: { role_id: parseInt(id), permissions_granted: granted.length },
          message: 'Permissions updated successfully'
        });
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error setting role permissions:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update permissions',
        error: { code: 'INTERNAL_ERROR', message: error.message }
      });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// #15 GET /permissions — List all available permissions
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  '/permissions',
  requireAuth,
  requireRole('roles', 'read'),
  async (req, res) => {
    try {
      const { module } = req.query;
      let query = 'SELECT id, module, action, name, description FROM permissions';
      const params = [];

      if (module) {
        query += ' WHERE module = $1';
        params.push(module);
      }

      query += ' ORDER BY module, action';

      const { rows } = await pool.query(query, params);

      // Group by module for easy frontend consumption
      const grouped = rows.reduce((acc, perm) => {
        if (!acc[perm.module]) acc[perm.module] = [];
        acc[perm.module].push(perm);
        return acc;
      }, {});

      return res.json({
        success: true,
        data: rows,
        meta: { grouped, total: rows.length },
        message: 'Permissions retrieved successfully'
      });
    } catch (error) {
      console.error('Error listing permissions:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve permissions',
        error: { code: 'INTERNAL_ERROR', message: error.message }
      });
    }
  }
);

module.exports = router;
