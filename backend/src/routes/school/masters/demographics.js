/**
 * Chalo Schools ERP - Demographics Masters Routes
 * Endpoints 83-90: Generic CRUD for all demographics using reusable controller pattern
 * Supports: countries, states, cities, religions, communities, castes,
 *           nationalities, mother-tongues, regions
 * File: routes/masters/demographics.js
 */

const express = require('express');
const router = express.Router();
const pool = require('../../../config/database');
const { requireAuth } = require('../../../middleware/auth');
const { requireRole } = require('../../../middleware/auth');

// ─────────────────────────────────────────────────────────────────────────────
// TYPE CONFIGURATION — Maps URL :type to table names and schema
// ─────────────────────────────────────────────────────────────────────────────
const DEMOGRAPHIC_TYPES = {
  countries: {
    table: 'demographic_countries',
    searchFields: ['name', 'code'],
    parentField: null,
    fields: ['name', 'code', 'phone_code', 'currency', 'sort_order']
  },
  states: {
    table: 'demographic_states',
    searchFields: ['name', 'code'],
    parentField: 'country_id',
    fields: ['name', 'code', 'country_id', 'sort_order']
  },
  cities: {
    table: 'demographic_cities',
    searchFields: ['name'],
    parentField: 'state_id',
    fields: ['name', 'state_id', 'district', 'pincode', 'sort_order']
  },
  religions: {
    table: 'demographic_religions',
    searchFields: ['name'],
    parentField: null,
    fields: ['name', 'code', 'sort_order']
  },
  communities: {
    table: 'demographic_communities',
    searchFields: ['name'],
    parentField: 'religion_id',
    fields: ['name', 'code', 'religion_id', 'sort_order']
  },
  castes: {
    table: 'demographic_castes',
    searchFields: ['name'],
    parentField: 'community_id',
    fields: ['name', 'code', 'community_id', 'category', 'sort_order']
  },
  nationalities: {
    table: 'demographic_nationalities',
    searchFields: ['name'],
    parentField: null,
    fields: ['name', 'code', 'sort_order']
  },
  'mother-tongues': {
    table: 'demographic_mother_tongues',
    searchFields: ['name'],
    parentField: null,
    fields: ['name', 'code', 'script', 'sort_order']
  },
  regions: {
    table: 'demographic_regions',
    searchFields: ['name'],
    parentField: null,
    fields: ['name', 'code', 'description', 'sort_order']
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// MIDDLEWARE: Validate demographic type from URL param
// ─────────────────────────────────────────────────────────────────────────────
const validateType = (req, res, next) => {
  const { type } = req.params;
  if (!DEMOGRAPHIC_TYPES[type]) {
    return res.status(400).json({
      success: false,
      message: `Invalid demographic type: "${type}". Valid types: ${Object.keys(DEMOGRAPHIC_TYPES).join(', ')}`
    });
  }
  req.demoConfig = DEMOGRAPHIC_TYPES[type];
  next();
};

// ─────────────────────────────────────────────────────────────────────────────
// #83 GET /demographics/:type — List items
// Also handles #88, #89, #90 via parent filters
// (e.g., /demographics/states?country_id=1)
// (e.g., /demographics/cities?state_id=5)
// (e.g., /demographics/castes?community_id=3)
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  '/:type',
  requireAuth,
  validateType,
  requireRole('demographics', 'read'),
  async (req, res) => {
    try {
      const { table, searchFields, parentField } = req.demoConfig;
      const {
        page = 1,
        limit = 100,
        search,
        is_active = 'true',
        sort = 'name',
        order = 'asc',
        ...filters
      } = req.query;
      const offset = (page - 1) * limit;

      // Build query
      const params = [req.user.school_id, is_active === 'true'];
      let whereClause = 'WHERE school_id = $1 AND is_active = $2';

      // Search across configured fields
      if (search) {
        const searchClauses = searchFields.map((field, i) => {
          params.push(`%${search}%`);
          return `${field} ILIKE $${params.length}`;
        });
        whereClause += ` AND (${searchClauses.join(' OR ')})`;
      }

      // Parent filter (e.g., country_id, state_id, community_id)
      if (parentField && filters[parentField]) {
        params.push(parseInt(filters[parentField]));
        whereClause += ` AND ${parentField} = $${params.length}`;
      }

      // Additional generic filters
      Object.entries(filters).forEach(([key, value]) => {
        if (key !== parentField && key !== 'search' && !key.startsWith('_')) {
          // Only allow known column filters to prevent SQL injection
          if (/^[a-z_]+$/.test(key)) {
            params.push(value);
            whereClause += ` AND ${key} = $${params.length}`;
          }
        }
      });

      // Count
      const countResult = await pool.query(
        `SELECT COUNT(*) FROM ${table} ${whereClause}`,
        params
      );
      const total = parseInt(countResult.rows[0].count);

      // Validate sort column
      const allowedSorts = ['name', 'code', 'sort_order', 'created_at'];
      const sortCol = allowedSorts.includes(sort) ? sort : 'name';
      const sortOrder = order.toLowerCase() === 'desc' ? 'DESC' : 'ASC';

      // Data
      params.push(parseInt(limit), offset);
      const { rows } = await pool.query(
        `SELECT * FROM ${table} ${whereClause}
         ORDER BY sort_order ASC NULLS LAST, ${sortCol} ${sortOrder}
         LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params
      );

      return res.json({
        success: true,
        data: rows,
        message: `${req.params.type} retrieved successfully`,
        meta: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit),
          type: req.params.type
        }
      });
    } catch (error) {
      console.error(`Error listing ${req.params.type}:`, error);
      return res.status(500).json({
        success: false,
        message: `Failed to retrieve ${req.params.type}`,
        error: { code: 'INTERNAL_ERROR', message: error.message }
      });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// #84 POST /demographics/:type — Create item
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  '/:type',
  requireAuth,
  validateType,
  requireRole('demographics', 'create'),
  async (req, res) => {
    try {
      const { table, fields } = req.demoConfig;
      const { type } = req.params;

      // Validate required field: name
      if (!req.body.name || req.body.name.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'name is required'
        });
      }

      // Check duplicate
      const existing = await pool.query(
        `SELECT id FROM ${table} WHERE school_id = $1 AND name = $2 AND is_active = true`,
        [req.user.school_id, req.body.name.trim()]
      );
      if (existing.rows.length > 0) {
        return res.status(409).json({
          success: false,
          message: `${type.slice(0, -1)} with this name already exists`
        });
      }

      // Build insert from configured fields
      const insertFields = ['school_id'];
      const insertValues = [req.user.school_id];
      const placeholders = ['$1'];
      let idx = 2;

      for (const field of fields) {
        if (req.body[field] !== undefined) {
          insertFields.push(field);
          insertValues.push(field === 'name' ? req.body[field].trim() : req.body[field]);
          placeholders.push(`$${idx}`);
          idx++;
        }
      }

      // Add metadata fields
      insertFields.push('is_active', 'created_by', 'created_at');
      insertValues.push(true, req.user.id);
      placeholders.push(`$${idx}`, `$${idx + 1}`, 'NOW()');
      idx += 2;

      const { rows } = await pool.query(
        `INSERT INTO ${table} (${insertFields.join(', ')})
         VALUES (${placeholders.join(', ')})
         RETURNING *`,
        insertValues
      );

      return res.status(201).json({
        success: true,
        data: rows[0],
        message: `${type.slice(0, -1)} created successfully`
      });
    } catch (error) {
      console.error(`Error creating ${req.params.type}:`, error);
      return res.status(500).json({
        success: false,
        message: `Failed to create ${req.params.type}`,
        error: { code: 'INTERNAL_ERROR', message: error.message }
      });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// #85 PUT /demographics/:type/:id — Update item
// ─────────────────────────────────────────────────────────────────────────────
router.put(
  '/:type/:id',
  requireAuth,
  validateType,
  requireRole('demographics', 'update'),
  async (req, res) => {
    try {
      const { table, fields } = req.demoConfig;
      const { type, id } = req.params;

      // Verify exists
      const existing = await pool.query(
        `SELECT id FROM ${table} WHERE id = $1 AND school_id = $2`,
        [id, req.user.school_id]
      );
      if (existing.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: `${type.slice(0, -1)} not found`
        });
      }

      // Build update from configured fields
      const updates = [];
      const params = [];
      let idx = 1;

      for (const field of fields) {
        if (req.body[field] !== undefined) {
          updates.push(`${field} = $${idx}`);
          params.push(field === 'name' ? req.body[field].trim() : req.body[field]);
          idx++;
        }
      }

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
        `UPDATE ${table} SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
        params
      );

      return res.json({
        success: true,
        data: rows[0],
        message: `${type.slice(0, -1)} updated successfully`
      });
    } catch (error) {
      console.error(`Error updating ${req.params.type}:`, error);
      return res.status(500).json({
        success: false,
        message: `Failed to update ${req.params.type}`,
        error: { code: 'INTERNAL_ERROR', message: error.message }
      });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// #86 DELETE /demographics/:type/:id — Soft delete (deactivate)
// ─────────────────────────────────────────────────────────────────────────────
router.delete(
  '/:type/:id',
  requireAuth,
  validateType,
  requireRole('demographics', 'delete'),
  async (req, res) => {
    try {
      const { table } = req.demoConfig;
      const { type, id } = req.params;

      // Soft delete — mark as inactive
      const { rows } = await pool.query(
        `UPDATE ${table} SET is_active = false, updated_at = NOW(), updated_by = $1
         WHERE id = $2 AND school_id = $3
         RETURNING id, name`,
        [req.user.id, id, req.user.school_id]
      );

      if (rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: `${type.slice(0, -1)} not found`
        });
      }

      return res.json({
        success: true,
        data: null,
        message: `${type.slice(0, -1)} "${rows[0].name}" deactivated successfully`
      });
    } catch (error) {
      console.error(`Error deleting ${req.params.type}:`, error);
      return res.status(500).json({
        success: false,
        message: `Failed to delete ${req.params.type}`,
        error: { code: 'INTERNAL_ERROR', message: error.message }
      });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// #87 POST /demographics/:type/bulk — Bulk import from Excel/JSON
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  '/:type/bulk',
  requireAuth,
  validateType,
  requireRole('demographics', 'create'),
  async (req, res) => {
    try {
      const { table, fields } = req.demoConfig;
      const { type } = req.params;
      const { items } = req.body;

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'items array is required and must not be empty'
        });
      }

      if (items.length > 500) {
        return res.status(400).json({
          success: false,
          message: 'Maximum 500 items can be imported at once'
        });
      }

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        const results = { created: 0, skipped: 0, errors: [] };

        for (let i = 0; i < items.length; i++) {
          const item = items[i];

          // Validate name
          if (!item.name || item.name.trim().length === 0) {
            results.errors.push({ row: i + 1, message: 'name is required' });
            results.skipped++;
            continue;
          }

          // Check duplicate
          const existing = await client.query(
            `SELECT id FROM ${table} WHERE school_id = $1 AND name = $2 AND is_active = true`,
            [req.user.school_id, item.name.trim()]
          );

          if (existing.rows.length > 0) {
            results.skipped++;
            results.errors.push({ row: i + 1, message: `Duplicate: "${item.name}"` });
            continue;
          }

          // Build insert
          const insertFields = ['school_id'];
          const insertValues = [req.user.school_id];
          const placeholders = ['$1'];
          let idx = 2;

          for (const field of fields) {
            if (item[field] !== undefined) {
              insertFields.push(field);
              insertValues.push(field === 'name' ? item[field].trim() : item[field]);
              placeholders.push(`$${idx}`);
              idx++;
            }
          }

          insertFields.push('is_active', 'created_by', 'created_at');
          insertValues.push(true, req.user.id);
          placeholders.push(`$${idx}`, `$${idx + 1}`, 'NOW()');

          await client.query(
            `INSERT INTO ${table} (${insertFields.join(', ')}) VALUES (${placeholders.join(', ')})`,
            insertValues
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
      console.error(`Error bulk importing ${req.params.type}:`, error);
      return res.status(500).json({
        success: false,
        message: `Failed to bulk import ${req.params.type}`,
        error: { code: 'INTERNAL_ERROR', message: error.message }
      });
    }
  }
);

module.exports = router;
