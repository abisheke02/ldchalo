/**
 * Chalo Schools ERP - Academic Masters Routes
 * Endpoints 45-74: Academic years, boards, levels, terms, classes, sections,
 *                  subjects, subject types, class-subject mapping, streams,
 *                  subject combinations, houses
 * File: routes/masters/academic.js
 */

const express = require('express');
const router = express.Router();
const pool = require('../../../config/database');
const { requireAuth } = require('../../../middleware/auth');
const { requireRole } = require('../../../middleware/auth');

// ═══════════════════════════════════════════════════════════════════════════════
// ACADEMIC YEARS (Endpoints 45-48)
// ═══════════════════════════════════════════════════════════════════════════════

// #45 GET /academic-years — List academic years
router.get(
  '/academic-years',
  requireAuth,
  requireRole('academic_masters', 'read'),
  async (req, res) => {
    try {
      const { page = 1, limit = 20, search, is_active } = req.query;
      const offset = (page - 1) * limit;
      const params = [req.user.school_id];
      let whereClause = 'WHERE school_id = $1';

      if (is_active !== undefined) {
        params.push(is_active === 'true');
        whereClause += ` AND is_active = $${params.length}`;
      }

      if (search) {
        params.push(`%${search}%`);
        whereClause += ` AND (name ILIKE $${params.length} OR code ILIKE $${params.length})`;
      }

      const countResult = await pool.query(
        `SELECT COUNT(*) FROM academic_years ${whereClause}`, params
      );
      const total = parseInt(countResult.rows[0].count);

      params.push(parseInt(limit), offset);
      const { rows } = await pool.query(
        `SELECT id, name, code, start_date, end_date, is_current, is_active, created_at
         FROM academic_years ${whereClause}
         ORDER BY start_date DESC
         LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params
      );

      return res.json({
        success: true,
        data: rows,
        message: 'Academic years retrieved successfully',
        meta: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / limit) }
      });
    } catch (error) {
      console.error('Error listing academic years:', error);
      return res.status(500).json({
        success: false, message: 'Failed to retrieve academic years',
        error: { code: 'INTERNAL_ERROR', message: error.message }
      });
    }
  }
);

// #46 POST /academic-years — Create academic year
router.post(
  '/academic-years',
  requireAuth,
  requireRole('academic_masters', 'create'),
  async (req, res) => {
    try {
      const { name, code, start_date, end_date } = req.body;

      if (!name || !start_date || !end_date) {
        return res.status(400).json({
          success: false,
          message: 'name, start_date, and end_date are required'
        });
      }

      if (end_date <= start_date) {
        return res.status(400).json({
          success: false,
          message: 'end_date must be after start_date'
        });
      }

      // Check duplicate
      const existing = await pool.query(
        'SELECT id FROM academic_years WHERE school_id = $1 AND (name = $2 OR code = $3)',
        [req.user.school_id, name, code || name]
      );
      if (existing.rows.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'An academic year with this name/code already exists'
        });
      }

      const { rows } = await pool.query(
        `INSERT INTO academic_years (school_id, name, code, start_date, end_date, is_current, is_active, created_by, created_at)
         VALUES ($1, $2, $3, $4, $5, false, true, $6, NOW())
         RETURNING *`,
        [req.user.school_id, name.trim(), code || name, start_date, end_date, req.user.id]
      );

      return res.status(201).json({
        success: true, data: rows[0], message: 'Academic year created successfully'
      });
    } catch (error) {
      console.error('Error creating academic year:', error);
      return res.status(500).json({
        success: false, message: 'Failed to create academic year',
        error: { code: 'INTERNAL_ERROR', message: error.message }
      });
    }
  }
);

// #47 PUT /academic-years/:id — Update academic year
router.put(
  '/academic-years/:id',
  requireAuth,
  requireRole('academic_masters', 'update'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { name, code, start_date, end_date, is_active } = req.body;

      const existing = await pool.query(
        'SELECT id FROM academic_years WHERE id = $1 AND school_id = $2',
        [id, req.user.school_id]
      );
      if (existing.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Academic year not found' });
      }

      const updates = [];
      const params = [];
      let idx = 1;

      if (name !== undefined) { updates.push(`name = $${idx}`); params.push(name.trim()); idx++; }
      if (code !== undefined) { updates.push(`code = $${idx}`); params.push(code); idx++; }
      if (start_date !== undefined) { updates.push(`start_date = $${idx}`); params.push(start_date); idx++; }
      if (end_date !== undefined) { updates.push(`end_date = $${idx}`); params.push(end_date); idx++; }
      if (is_active !== undefined) { updates.push(`is_active = $${idx}`); params.push(is_active); idx++; }

      updates.push(`updated_at = NOW()`);
      updates.push(`updated_by = $${idx}`); params.push(req.user.id); idx++;
      params.push(id);

      const { rows } = await pool.query(
        `UPDATE academic_years SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
        params
      );

      return res.json({ success: true, data: rows[0], message: 'Academic year updated successfully' });
    } catch (error) {
      console.error('Error updating academic year:', error);
      return res.status(500).json({
        success: false, message: 'Failed to update academic year',
        error: { code: 'INTERNAL_ERROR', message: error.message }
      });
    }
  }
);

// #48 PATCH /academic-years/:id/activate — Set as current active year
router.patch(
  '/academic-years/:id/activate',
  requireAuth,
  requireRole('academic_masters', 'update'),
  async (req, res) => {
    try {
      const { id } = req.params;

      const existing = await pool.query(
        'SELECT id FROM academic_years WHERE id = $1 AND school_id = $2',
        [id, req.user.school_id]
      );
      if (existing.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Academic year not found' });
      }

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Deactivate all other years
        await client.query(
          'UPDATE academic_years SET is_current = false WHERE school_id = $1',
          [req.user.school_id]
        );

        // Activate this year
        const { rows } = await client.query(
          'UPDATE academic_years SET is_current = true, is_active = true, updated_at = NOW() WHERE id = $1 RETURNING *',
          [id]
        );

        await client.query('COMMIT');

        return res.json({ success: true, data: rows[0], message: 'Academic year activated successfully' });
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error activating academic year:', error);
      return res.status(500).json({
        success: false, message: 'Failed to activate academic year',
        error: { code: 'INTERNAL_ERROR', message: error.message }
      });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════════
// BOARDS (Endpoints 49-50)
// ═══════════════════════════════════════════════════════════════════════════════

// #49 GET /boards — List boards (CBSE, ICSE...)
router.get(
  '/boards',
  requireAuth,
  requireRole('academic_masters', 'read'),
  async (req, res) => {
    try {
      const { search, is_active = 'true' } = req.query;
      const params = [req.user.school_id, is_active === 'true'];
      let whereClause = 'WHERE school_id = $1 AND is_active = $2';

      if (search) {
        params.push(`%${search}%`);
        whereClause += ` AND (name ILIKE $${params.length} OR code ILIKE $${params.length})`;
      }

      const { rows } = await pool.query(
        `SELECT id, name, code, description, is_active, created_at
         FROM boards ${whereClause} ORDER BY sort_order, name`,
        params
      );

      return res.json({ success: true, data: rows, message: 'Boards retrieved successfully', meta: { total: rows.length } });
    } catch (error) {
      console.error('Error listing boards:', error);
      return res.status(500).json({
        success: false, message: 'Failed to retrieve boards',
        error: { code: 'INTERNAL_ERROR', message: error.message }
      });
    }
  }
);

// #50 POST /boards — Create board
router.post(
  '/boards',
  requireAuth,
  requireRole('academic_masters', 'create'),
  async (req, res) => {
    try {
      const { name, code, description } = req.body;

      if (!name) {
        return res.status(400).json({ success: false, message: 'Board name is required' });
      }

      const existing = await pool.query(
        'SELECT id FROM boards WHERE school_id = $1 AND (name = $2 OR code = $3)',
        [req.user.school_id, name, code || name.toUpperCase().replace(/\s+/g, '_')]
      );
      if (existing.rows.length > 0) {
        return res.status(409).json({ success: false, message: 'Board already exists' });
      }

      const { rows } = await pool.query(
        `INSERT INTO boards (school_id, name, code, description, is_active, created_by, created_at)
         VALUES ($1, $2, $3, $4, true, $5, NOW()) RETURNING *`,
        [req.user.school_id, name.trim(), code || name.toUpperCase().replace(/\s+/g, '_'), description || null, req.user.id]
      );

      return res.status(201).json({ success: true, data: rows[0], message: 'Board created successfully' });
    } catch (error) {
      console.error('Error creating board:', error);
      return res.status(500).json({
        success: false, message: 'Failed to create board',
        error: { code: 'INTERNAL_ERROR', message: error.message }
      });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════════
// LEVELS (Endpoints 51-52)
// ═══════════════════════════════════════════════════════════════════════════════

// #51 GET /levels — List levels (Primary, Secondary...)
router.get(
  '/levels',
  requireAuth,
  requireRole('academic_masters', 'read'),
  async (req, res) => {
    try {
      const { search, is_active = 'true' } = req.query;
      const params = [req.user.school_id, is_active === 'true'];
      let whereClause = 'WHERE school_id = $1 AND is_active = $2';

      if (search) {
        params.push(`%${search}%`);
        whereClause += ` AND name ILIKE $${params.length}`;
      }

      const { rows } = await pool.query(
        `SELECT id, name, code, description, from_class, to_class, sort_order, is_active
         FROM levels ${whereClause} ORDER BY sort_order, name`,
        params
      );

      return res.json({ success: true, data: rows, message: 'Levels retrieved successfully', meta: { total: rows.length } });
    } catch (error) {
      console.error('Error listing levels:', error);
      return res.status(500).json({
        success: false, message: 'Failed to retrieve levels',
        error: { code: 'INTERNAL_ERROR', message: error.message }
      });
    }
  }
);

// #52 POST /levels — Create level
router.post(
  '/levels',
  requireAuth,
  requireRole('academic_masters', 'create'),
  async (req, res) => {
    try {
      const { name, code, description, from_class, to_class, sort_order } = req.body;

      if (!name) {
        return res.status(400).json({ success: false, message: 'Level name is required' });
      }

      const { rows } = await pool.query(
        `INSERT INTO levels (school_id, name, code, description, from_class, to_class, sort_order, is_active, created_by, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8, NOW()) RETURNING *`,
        [req.user.school_id, name.trim(), code || null, description || null, from_class || null, to_class || null, sort_order || 0, req.user.id]
      );

      return res.status(201).json({ success: true, data: rows[0], message: 'Level created successfully' });
    } catch (error) {
      console.error('Error creating level:', error);
      return res.status(500).json({
        success: false, message: 'Failed to create level',
        error: { code: 'INTERNAL_ERROR', message: error.message }
      });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════════
// TERMS (Endpoints 53-55)
// ═══════════════════════════════════════════════════════════════════════════════

// #53 GET /terms — List terms (filter by academic year)
router.get(
  '/terms',
  requireAuth,
  requireRole('academic_masters', 'read'),
  async (req, res) => {
    try {
      const { academic_year_id, search, is_active = 'true' } = req.query;
      const params = [req.user.school_id, is_active === 'true'];
      let whereClause = 'WHERE t.school_id = $1 AND t.is_active = $2';

      if (academic_year_id) {
        params.push(parseInt(academic_year_id));
        whereClause += ` AND t.academic_year_id = $${params.length}`;
      }

      if (search) {
        params.push(`%${search}%`);
        whereClause += ` AND t.name ILIKE $${params.length}`;
      }

      const { rows } = await pool.query(
        `SELECT t.id, t.name, t.code, t.academic_year_id, ay.name AS academic_year_name,
                t.start_date, t.end_date, t.sort_order, t.is_active
         FROM terms t
         LEFT JOIN academic_years ay ON ay.id = t.academic_year_id
         ${whereClause}
         ORDER BY t.academic_year_id DESC, t.sort_order, t.start_date`,
        params
      );

      return res.json({ success: true, data: rows, message: 'Terms retrieved successfully', meta: { total: rows.length } });
    } catch (error) {
      console.error('Error listing terms:', error);
      return res.status(500).json({
        success: false, message: 'Failed to retrieve terms',
        error: { code: 'INTERNAL_ERROR', message: error.message }
      });
    }
  }
);

// #54 POST /terms — Create term
router.post(
  '/terms',
  requireAuth,
  requireRole('academic_masters', 'create'),
  async (req, res) => {
    try {
      const { name, code, academic_year_id, start_date, end_date, sort_order } = req.body;

      if (!name || !academic_year_id || !start_date || !end_date) {
        return res.status(400).json({
          success: false,
          message: 'name, academic_year_id, start_date, and end_date are required'
        });
      }

      const { rows } = await pool.query(
        `INSERT INTO terms (school_id, name, code, academic_year_id, start_date, end_date, sort_order, is_active, created_by, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8, NOW()) RETURNING *`,
        [req.user.school_id, name.trim(), code || null, academic_year_id, start_date, end_date, sort_order || 0, req.user.id]
      );

      return res.status(201).json({ success: true, data: rows[0], message: 'Term created successfully' });
    } catch (error) {
      console.error('Error creating term:', error);
      return res.status(500).json({
        success: false, message: 'Failed to create term',
        error: { code: 'INTERNAL_ERROR', message: error.message }
      });
    }
  }
);

// #55 PUT /terms/:id — Update term
router.put(
  '/terms/:id',
  requireAuth,
  requireRole('academic_masters', 'update'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { name, code, start_date, end_date, sort_order, is_active } = req.body;

      const existing = await pool.query(
        'SELECT id FROM terms WHERE id = $1 AND school_id = $2',
        [id, req.user.school_id]
      );
      if (existing.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Term not found' });
      }

      const updates = [];
      const params = [];
      let idx = 1;

      if (name !== undefined) { updates.push(`name = $${idx}`); params.push(name.trim()); idx++; }
      if (code !== undefined) { updates.push(`code = $${idx}`); params.push(code); idx++; }
      if (start_date !== undefined) { updates.push(`start_date = $${idx}`); params.push(start_date); idx++; }
      if (end_date !== undefined) { updates.push(`end_date = $${idx}`); params.push(end_date); idx++; }
      if (sort_order !== undefined) { updates.push(`sort_order = $${idx}`); params.push(sort_order); idx++; }
      if (is_active !== undefined) { updates.push(`is_active = $${idx}`); params.push(is_active); idx++; }

      updates.push(`updated_at = NOW()`);
      params.push(id);

      const { rows } = await pool.query(
        `UPDATE terms SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
        params
      );

      return res.json({ success: true, data: rows[0], message: 'Term updated successfully' });
    } catch (error) {
      console.error('Error updating term:', error);
      return res.status(500).json({
        success: false, message: 'Failed to update term',
        error: { code: 'INTERNAL_ERROR', message: error.message }
      });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════════
// CLASSES (Endpoints 56-58)
// ═══════════════════════════════════════════════════════════════════════════════

// #56 GET /classes — List classes (filter by level/board)
router.get(
  '/classes',
  requireAuth,
  requireRole('academic_masters', 'read'),
  async (req, res) => {
    try {
      const { level_id, board_id, search, is_active = 'true', page = 1, limit = 50 } = req.query;
      const offset = (page - 1) * limit;
      const params = [req.user.school_id, is_active === 'true'];
      let whereClause = 'WHERE c.school_id = $1 AND c.is_active = $2';

      if (level_id) {
        params.push(parseInt(level_id));
        whereClause += ` AND c.level_id = $${params.length}`;
      }

      if (board_id) {
        params.push(parseInt(board_id));
        whereClause += ` AND c.board_id = $${params.length}`;
      }

      if (search) {
        params.push(`%${search}%`);
        whereClause += ` AND (c.name ILIKE $${params.length} OR c.code ILIKE $${params.length})`;
      }

      const countResult = await pool.query(
        `SELECT COUNT(*) FROM classes c ${whereClause}`, params
      );
      const total = parseInt(countResult.rows[0].count);

      params.push(parseInt(limit), offset);
      const { rows } = await pool.query(
        `SELECT c.id, c.name, c.code, c.numeric_name, c.level_id, l.name AS level_name,
                c.board_id, b.name AS board_name, c.stream_id, c.sort_order,
                c.student_capacity, c.is_active,
                (SELECT COUNT(*) FROM sections s WHERE s.class_id = c.id AND s.is_active = true) AS section_count
         FROM classes c
         LEFT JOIN levels l ON l.id = c.level_id
         LEFT JOIN boards b ON b.id = c.board_id
         ${whereClause}
         ORDER BY c.sort_order, c.numeric_name, c.name
         LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params
      );

      return res.json({
        success: true, data: rows, message: 'Classes retrieved successfully',
        meta: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / limit) }
      });
    } catch (error) {
      console.error('Error listing classes:', error);
      return res.status(500).json({
        success: false, message: 'Failed to retrieve classes',
        error: { code: 'INTERNAL_ERROR', message: error.message }
      });
    }
  }
);

// #57 POST /classes — Create class
router.post(
  '/classes',
  requireAuth,
  requireRole('academic_masters', 'create'),
  async (req, res) => {
    try {
      const { name, code, numeric_name, level_id, board_id, stream_id, sort_order, student_capacity } = req.body;

      if (!name) {
        return res.status(400).json({ success: false, message: 'Class name is required' });
      }

      const existing = await pool.query(
        'SELECT id FROM classes WHERE school_id = $1 AND name = $2',
        [req.user.school_id, name]
      );
      if (existing.rows.length > 0) {
        return res.status(409).json({ success: false, message: 'Class with this name already exists' });
      }

      const { rows } = await pool.query(
        `INSERT INTO classes (school_id, name, code, numeric_name, level_id, board_id, stream_id, sort_order, student_capacity, is_active, created_by, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, $10, NOW()) RETURNING *`,
        [req.user.school_id, name.trim(), code || null, numeric_name || null, level_id || null, board_id || null, stream_id || null, sort_order || 0, student_capacity || null, req.user.id]
      );

      return res.status(201).json({ success: true, data: rows[0], message: 'Class created successfully' });
    } catch (error) {
      console.error('Error creating class:', error);
      return res.status(500).json({
        success: false, message: 'Failed to create class',
        error: { code: 'INTERNAL_ERROR', message: error.message }
      });
    }
  }
);

// #58 PUT /classes/:id — Update class
router.put(
  '/classes/:id',
  requireAuth,
  requireRole('academic_masters', 'update'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { name, code, numeric_name, level_id, board_id, stream_id, sort_order, student_capacity, is_active } = req.body;

      const existing = await pool.query(
        'SELECT id FROM classes WHERE id = $1 AND school_id = $2',
        [id, req.user.school_id]
      );
      if (existing.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Class not found' });
      }

      const updates = [];
      const params = [];
      let idx = 1;

      if (name !== undefined) { updates.push(`name = $${idx}`); params.push(name.trim()); idx++; }
      if (code !== undefined) { updates.push(`code = $${idx}`); params.push(code); idx++; }
      if (numeric_name !== undefined) { updates.push(`numeric_name = $${idx}`); params.push(numeric_name); idx++; }
      if (level_id !== undefined) { updates.push(`level_id = $${idx}`); params.push(level_id); idx++; }
      if (board_id !== undefined) { updates.push(`board_id = $${idx}`); params.push(board_id); idx++; }
      if (stream_id !== undefined) { updates.push(`stream_id = $${idx}`); params.push(stream_id); idx++; }
      if (sort_order !== undefined) { updates.push(`sort_order = $${idx}`); params.push(sort_order); idx++; }
      if (student_capacity !== undefined) { updates.push(`student_capacity = $${idx}`); params.push(student_capacity); idx++; }
      if (is_active !== undefined) { updates.push(`is_active = $${idx}`); params.push(is_active); idx++; }

      updates.push(`updated_at = NOW()`);
      params.push(id);

      const { rows } = await pool.query(
        `UPDATE classes SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
        params
      );

      return res.json({ success: true, data: rows[0], message: 'Class updated successfully' });
    } catch (error) {
      console.error('Error updating class:', error);
      return res.status(500).json({
        success: false, message: 'Failed to update class',
        error: { code: 'INTERNAL_ERROR', message: error.message }
      });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════════
// SECTIONS (Endpoints 59-60)
// ═══════════════════════════════════════════════════════════════════════════════

// #59 GET /classes/:id/sections — Get sections for a class
router.get(
  '/classes/:id/sections',
  requireAuth,
  requireRole('academic_masters', 'read'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { is_active = 'true' } = req.query;

      const { rows } = await pool.query(
        `SELECT s.id, s.name, s.code, s.class_id, s.capacity, s.class_teacher_id,
                st.name AS class_teacher_name, s.sort_order, s.is_active,
                (SELECT COUNT(*) FROM student_sections ss WHERE ss.section_id = s.id AND ss.is_current = true) AS student_count
         FROM sections s
         LEFT JOIN staff st ON st.id = s.class_teacher_id
         WHERE s.class_id = $1 AND s.school_id = $2 AND s.is_active = $3
         ORDER BY s.sort_order, s.name`,
        [id, req.user.school_id, is_active === 'true']
      );

      return res.json({ success: true, data: rows, message: 'Sections retrieved successfully', meta: { total: rows.length } });
    } catch (error) {
      console.error('Error listing sections:', error);
      return res.status(500).json({
        success: false, message: 'Failed to retrieve sections',
        error: { code: 'INTERNAL_ERROR', message: error.message }
      });
    }
  }
);

// #60 POST /classes/:id/sections — Add section to class
router.post(
  '/classes/:id/sections',
  requireAuth,
  requireRole('academic_masters', 'create'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { name, code, capacity, class_teacher_id, sort_order } = req.body;

      if (!name) {
        return res.status(400).json({ success: false, message: 'Section name is required' });
      }

      // Verify class exists
      const classCheck = await pool.query(
        'SELECT id FROM classes WHERE id = $1 AND school_id = $2',
        [id, req.user.school_id]
      );
      if (classCheck.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Class not found' });
      }

      // Check duplicate section in class
      const existing = await pool.query(
        'SELECT id FROM sections WHERE class_id = $1 AND school_id = $2 AND name = $3',
        [id, req.user.school_id, name]
      );
      if (existing.rows.length > 0) {
        return res.status(409).json({ success: false, message: 'Section with this name already exists in this class' });
      }

      const { rows } = await pool.query(
        `INSERT INTO sections (school_id, class_id, name, code, capacity, class_teacher_id, sort_order, is_active, created_by, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8, NOW()) RETURNING *`,
        [req.user.school_id, id, name.trim(), code || null, capacity || null, class_teacher_id || null, sort_order || 0, req.user.id]
      );

      return res.status(201).json({ success: true, data: rows[0], message: 'Section created successfully' });
    } catch (error) {
      console.error('Error creating section:', error);
      return res.status(500).json({
        success: false, message: 'Failed to create section',
        error: { code: 'INTERNAL_ERROR', message: error.message }
      });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════════
// SUBJECTS (Endpoints 61-63)
// ═══════════════════════════════════════════════════════════════════════════════

// #61 GET /subjects — List all subjects
router.get(
  '/subjects',
  requireAuth,
  requireRole('academic_masters', 'read'),
  async (req, res) => {
    try {
      const { search, subject_type_id, is_active = 'true', page = 1, limit = 100 } = req.query;
      const offset = (page - 1) * limit;
      const params = [req.user.school_id, is_active === 'true'];
      let whereClause = 'WHERE s.school_id = $1 AND s.is_active = $2';

      if (subject_type_id) {
        params.push(parseInt(subject_type_id));
        whereClause += ` AND s.subject_type_id = $${params.length}`;
      }

      if (search) {
        params.push(`%${search}%`);
        whereClause += ` AND (s.name ILIKE $${params.length} OR s.code ILIKE $${params.length})`;
      }

      const countResult = await pool.query(
        `SELECT COUNT(*) FROM subjects s ${whereClause}`, params
      );
      const total = parseInt(countResult.rows[0].count);

      params.push(parseInt(limit), offset);
      const { rows } = await pool.query(
        `SELECT s.id, s.name, s.code, s.subject_type_id, st.name AS subject_type_name,
                s.is_elective, s.is_language, s.has_practical, s.max_marks,
                s.pass_marks, s.sort_order, s.is_active
         FROM subjects s
         LEFT JOIN subject_types st ON st.id = s.subject_type_id
         ${whereClause}
         ORDER BY s.sort_order, s.name
         LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params
      );

      return res.json({
        success: true, data: rows, message: 'Subjects retrieved successfully',
        meta: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / limit) }
      });
    } catch (error) {
      console.error('Error listing subjects:', error);
      return res.status(500).json({
        success: false, message: 'Failed to retrieve subjects',
        error: { code: 'INTERNAL_ERROR', message: error.message }
      });
    }
  }
);

// #62 POST /subjects — Create subject
router.post(
  '/subjects',
  requireAuth,
  requireRole('academic_masters', 'create'),
  async (req, res) => {
    try {
      const { name, code, subject_type_id, is_elective, is_language, has_practical, max_marks, pass_marks, sort_order } = req.body;

      if (!name) {
        return res.status(400).json({ success: false, message: 'Subject name is required' });
      }

      const existing = await pool.query(
        'SELECT id FROM subjects WHERE school_id = $1 AND (name = $2 OR code = $3)',
        [req.user.school_id, name, code || '']
      );
      if (existing.rows.length > 0) {
        return res.status(409).json({ success: false, message: 'Subject with this name/code already exists' });
      }

      const { rows } = await pool.query(
        `INSERT INTO subjects (school_id, name, code, subject_type_id, is_elective, is_language, has_practical, max_marks, pass_marks, sort_order, is_active, created_by, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true, $11, NOW()) RETURNING *`,
        [req.user.school_id, name.trim(), code || null, subject_type_id || null, is_elective || false, is_language || false, has_practical || false, max_marks || null, pass_marks || null, sort_order || 0, req.user.id]
      );

      return res.status(201).json({ success: true, data: rows[0], message: 'Subject created successfully' });
    } catch (error) {
      console.error('Error creating subject:', error);
      return res.status(500).json({
        success: false, message: 'Failed to create subject',
        error: { code: 'INTERNAL_ERROR', message: error.message }
      });
    }
  }
);

// #63 PUT /subjects/:id — Update subject
router.put(
  '/subjects/:id',
  requireAuth,
  requireRole('academic_masters', 'update'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { name, code, subject_type_id, is_elective, is_language, has_practical, max_marks, pass_marks, sort_order, is_active } = req.body;

      const existing = await pool.query(
        'SELECT id FROM subjects WHERE id = $1 AND school_id = $2',
        [id, req.user.school_id]
      );
      if (existing.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Subject not found' });
      }

      const updates = [];
      const params = [];
      let idx = 1;

      if (name !== undefined) { updates.push(`name = $${idx}`); params.push(name.trim()); idx++; }
      if (code !== undefined) { updates.push(`code = $${idx}`); params.push(code); idx++; }
      if (subject_type_id !== undefined) { updates.push(`subject_type_id = $${idx}`); params.push(subject_type_id); idx++; }
      if (is_elective !== undefined) { updates.push(`is_elective = $${idx}`); params.push(is_elective); idx++; }
      if (is_language !== undefined) { updates.push(`is_language = $${idx}`); params.push(is_language); idx++; }
      if (has_practical !== undefined) { updates.push(`has_practical = $${idx}`); params.push(has_practical); idx++; }
      if (max_marks !== undefined) { updates.push(`max_marks = $${idx}`); params.push(max_marks); idx++; }
      if (pass_marks !== undefined) { updates.push(`pass_marks = $${idx}`); params.push(pass_marks); idx++; }
      if (sort_order !== undefined) { updates.push(`sort_order = $${idx}`); params.push(sort_order); idx++; }
      if (is_active !== undefined) { updates.push(`is_active = $${idx}`); params.push(is_active); idx++; }

      updates.push(`updated_at = NOW()`);
      params.push(id);

      const { rows } = await pool.query(
        `UPDATE subjects SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
        params
      );

      return res.json({ success: true, data: rows[0], message: 'Subject updated successfully' });
    } catch (error) {
      console.error('Error updating subject:', error);
      return res.status(500).json({
        success: false, message: 'Failed to update subject',
        error: { code: 'INTERNAL_ERROR', message: error.message }
      });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════════
// SUBJECT TYPES (Endpoint 64)
// ═══════════════════════════════════════════════════════════════════════════════

// #64 GET /subject-types — List subject types
router.get(
  '/subject-types',
  requireAuth,
  requireRole('academic_masters', 'read'),
  async (req, res) => {
    try {
      const { rows } = await pool.query(
        `SELECT id, name, code, description, is_active
         FROM subject_types
         WHERE school_id = $1 AND is_active = true
         ORDER BY sort_order, name`,
        [req.user.school_id]
      );

      return res.json({ success: true, data: rows, message: 'Subject types retrieved successfully', meta: { total: rows.length } });
    } catch (error) {
      console.error('Error listing subject types:', error);
      return res.status(500).json({
        success: false, message: 'Failed to retrieve subject types',
        error: { code: 'INTERNAL_ERROR', message: error.message }
      });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════════
// CLASS-SUBJECT MAPPING (Endpoints 65-68)
// ═══════════════════════════════════════════════════════════════════════════════

// #65 GET /class-subject-mapping — Get subjects for a class
router.get(
  '/class-subject-mapping',
  requireAuth,
  requireRole('academic_masters', 'read'),
  async (req, res) => {
    try {
      const { class_id, academic_year_id, subject_id } = req.query;
      const params = [req.user.school_id];
      let whereClause = 'WHERE csm.school_id = $1';

      if (class_id) {
        params.push(parseInt(class_id));
        whereClause += ` AND csm.class_id = $${params.length}`;
      }

      if (academic_year_id) {
        params.push(parseInt(academic_year_id));
        whereClause += ` AND csm.academic_year_id = $${params.length}`;
      }

      if (subject_id) {
        params.push(parseInt(subject_id));
        whereClause += ` AND csm.subject_id = $${params.length}`;
      }

      const { rows } = await pool.query(
        `SELECT csm.id, csm.class_id, c.name AS class_name,
                csm.subject_id, s.name AS subject_name, s.code AS subject_code,
                csm.academic_year_id, csm.is_mandatory, csm.periods_per_week,
                csm.teacher_id, st.name AS teacher_name
         FROM class_subject_mapping csm
         JOIN classes c ON c.id = csm.class_id
         JOIN subjects s ON s.id = csm.subject_id
         LEFT JOIN staff st ON st.id = csm.teacher_id
         ${whereClause}
         ORDER BY c.sort_order, s.sort_order, s.name`,
        params
      );

      return res.json({ success: true, data: rows, message: 'Class-subject mappings retrieved', meta: { total: rows.length } });
    } catch (error) {
      console.error('Error listing class-subject mapping:', error);
      return res.status(500).json({
        success: false, message: 'Failed to retrieve mappings',
        error: { code: 'INTERNAL_ERROR', message: error.message }
      });
    }
  }
);

// #66 POST /class-subject-mapping — Map subject to class
router.post(
  '/class-subject-mapping',
  requireAuth,
  requireRole('academic_masters', 'create'),
  async (req, res) => {
    try {
      const { class_id, subject_id, academic_year_id, is_mandatory = true, periods_per_week, teacher_id } = req.body;

      if (!class_id || !subject_id || !academic_year_id) {
        return res.status(400).json({
          success: false,
          message: 'class_id, subject_id, and academic_year_id are required'
        });
      }

      // Check duplicate
      const existing = await pool.query(
        'SELECT id FROM class_subject_mapping WHERE school_id = $1 AND class_id = $2 AND subject_id = $3 AND academic_year_id = $4',
        [req.user.school_id, class_id, subject_id, academic_year_id]
      );
      if (existing.rows.length > 0) {
        return res.status(409).json({ success: false, message: 'Subject already mapped to this class for this academic year' });
      }

      const { rows } = await pool.query(
        `INSERT INTO class_subject_mapping (school_id, class_id, subject_id, academic_year_id, is_mandatory, periods_per_week, teacher_id, created_by, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW()) RETURNING *`,
        [req.user.school_id, class_id, subject_id, academic_year_id, is_mandatory, periods_per_week || null, teacher_id || null, req.user.id]
      );

      return res.status(201).json({ success: true, data: rows[0], message: 'Subject mapped to class successfully' });
    } catch (error) {
      console.error('Error creating class-subject mapping:', error);
      return res.status(500).json({
        success: false, message: 'Failed to create mapping',
        error: { code: 'INTERNAL_ERROR', message: error.message }
      });
    }
  }
);

// #67 DELETE /class-subject-mapping/:id — Remove mapping
router.delete(
  '/class-subject-mapping/:id',
  requireAuth,
  requireRole('academic_masters', 'delete'),
  async (req, res) => {
    try {
      const { id } = req.params;

      const result = await pool.query(
        'DELETE FROM class_subject_mapping WHERE id = $1 AND school_id = $2 RETURNING id',
        [id, req.user.school_id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Mapping not found' });
      }

      return res.json({ success: true, data: null, message: 'Mapping removed successfully' });
    } catch (error) {
      console.error('Error deleting class-subject mapping:', error);
      return res.status(500).json({
        success: false, message: 'Failed to remove mapping',
        error: { code: 'INTERNAL_ERROR', message: error.message }
      });
    }
  }
);

// #68 POST /class-subject-mapping/bulk — Bulk assign subjects to class
router.post(
  '/class-subject-mapping/bulk',
  requireAuth,
  requireRole('academic_masters', 'create'),
  async (req, res) => {
    try {
      const { class_id, academic_year_id, subjects } = req.body;

      if (!class_id || !academic_year_id || !subjects || !Array.isArray(subjects) || subjects.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'class_id, academic_year_id, and subjects array are required'
        });
      }

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        const results = { created: 0, skipped: 0 };

        for (const subj of subjects) {
          const subjectId = subj.subject_id || subj;

          // Check duplicate
          const existing = await client.query(
            'SELECT id FROM class_subject_mapping WHERE school_id = $1 AND class_id = $2 AND subject_id = $3 AND academic_year_id = $4',
            [req.user.school_id, class_id, subjectId, academic_year_id]
          );

          if (existing.rows.length > 0) {
            results.skipped++;
            continue;
          }

          await client.query(
            `INSERT INTO class_subject_mapping (school_id, class_id, subject_id, academic_year_id, is_mandatory, periods_per_week, teacher_id, created_by, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
            [req.user.school_id, class_id, subjectId, academic_year_id, subj.is_mandatory !== false, subj.periods_per_week || null, subj.teacher_id || null, req.user.id]
          );
          results.created++;
        }

        await client.query('COMMIT');

        return res.status(201).json({
          success: true, data: results,
          message: `Bulk mapping complete: ${results.created} created, ${results.skipped} skipped`
        });
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error bulk mapping subjects:', error);
      return res.status(500).json({
        success: false, message: 'Failed to bulk map subjects',
        error: { code: 'INTERNAL_ERROR', message: error.message }
      });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════════
// STREAMS (Endpoints 69-70)
// ═══════════════════════════════════════════════════════════════════════════════

// #69 GET /streams — List streams (Science, Commerce...)
router.get(
  '/streams',
  requireAuth,
  requireRole('academic_masters', 'read'),
  async (req, res) => {
    try {
      const { search, is_active = 'true' } = req.query;
      const params = [req.user.school_id, is_active === 'true'];
      let whereClause = 'WHERE school_id = $1 AND is_active = $2';

      if (search) {
        params.push(`%${search}%`);
        whereClause += ` AND name ILIKE $${params.length}`;
      }

      const { rows } = await pool.query(
        `SELECT id, name, code, description, applicable_from_class, is_active, created_at
         FROM streams ${whereClause} ORDER BY sort_order, name`,
        params
      );

      return res.json({ success: true, data: rows, message: 'Streams retrieved successfully', meta: { total: rows.length } });
    } catch (error) {
      console.error('Error listing streams:', error);
      return res.status(500).json({
        success: false, message: 'Failed to retrieve streams',
        error: { code: 'INTERNAL_ERROR', message: error.message }
      });
    }
  }
);

// #70 POST /streams — Create stream
router.post(
  '/streams',
  requireAuth,
  requireRole('academic_masters', 'create'),
  async (req, res) => {
    try {
      const { name, code, description, applicable_from_class, sort_order } = req.body;

      if (!name) {
        return res.status(400).json({ success: false, message: 'Stream name is required' });
      }

      const { rows } = await pool.query(
        `INSERT INTO streams (school_id, name, code, description, applicable_from_class, sort_order, is_active, created_by, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, true, $7, NOW()) RETURNING *`,
        [req.user.school_id, name.trim(), code || null, description || null, applicable_from_class || null, sort_order || 0, req.user.id]
      );

      return res.status(201).json({ success: true, data: rows[0], message: 'Stream created successfully' });
    } catch (error) {
      console.error('Error creating stream:', error);
      return res.status(500).json({
        success: false, message: 'Failed to create stream',
        error: { code: 'INTERNAL_ERROR', message: error.message }
      });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════════
// SUBJECT COMBINATIONS (Endpoints 71-72)
// ═══════════════════════════════════════════════════════════════════════════════

// #71 GET /subject-combinations — List subject combinations
router.get(
  '/subject-combinations',
  requireAuth,
  requireRole('academic_masters', 'read'),
  async (req, res) => {
    try {
      const { stream_id, class_id, is_active = 'true' } = req.query;
      const params = [req.user.school_id, is_active === 'true'];
      let whereClause = 'WHERE sc.school_id = $1 AND sc.is_active = $2';

      if (stream_id) {
        params.push(parseInt(stream_id));
        whereClause += ` AND sc.stream_id = $${params.length}`;
      }

      if (class_id) {
        params.push(parseInt(class_id));
        whereClause += ` AND sc.class_id = $${params.length}`;
      }

      const { rows } = await pool.query(
        `SELECT sc.id, sc.name, sc.code, sc.stream_id, st.name AS stream_name,
                sc.class_id, c.name AS class_name, sc.subject_ids, sc.max_students,
                sc.is_active, sc.created_at
         FROM subject_combinations sc
         LEFT JOIN streams st ON st.id = sc.stream_id
         LEFT JOIN classes c ON c.id = sc.class_id
         ${whereClause}
         ORDER BY sc.name`,
        params
      );

      return res.json({ success: true, data: rows, message: 'Subject combinations retrieved', meta: { total: rows.length } });
    } catch (error) {
      console.error('Error listing subject combinations:', error);
      return res.status(500).json({
        success: false, message: 'Failed to retrieve subject combinations',
        error: { code: 'INTERNAL_ERROR', message: error.message }
      });
    }
  }
);

// #72 POST /subject-combinations — Create combination
router.post(
  '/subject-combinations',
  requireAuth,
  requireRole('academic_masters', 'create'),
  async (req, res) => {
    try {
      const { name, code, stream_id, class_id, subject_ids, max_students } = req.body;

      if (!name || !subject_ids || !Array.isArray(subject_ids) || subject_ids.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'name and subject_ids array are required'
        });
      }

      const { rows } = await pool.query(
        `INSERT INTO subject_combinations (school_id, name, code, stream_id, class_id, subject_ids, max_students, is_active, created_by, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8, NOW()) RETURNING *`,
        [req.user.school_id, name.trim(), code || null, stream_id || null, class_id || null, subject_ids, max_students || null, req.user.id]
      );

      return res.status(201).json({ success: true, data: rows[0], message: 'Subject combination created successfully' });
    } catch (error) {
      console.error('Error creating subject combination:', error);
      return res.status(500).json({
        success: false, message: 'Failed to create subject combination',
        error: { code: 'INTERNAL_ERROR', message: error.message }
      });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════════
// HOUSES (Endpoints 73-74)
// ═══════════════════════════════════════════════════════════════════════════════

// #73 GET /houses — List school houses
router.get(
  '/houses',
  requireAuth,
  requireRole('academic_masters', 'read'),
  async (req, res) => {
    try {
      const { search, is_active = 'true' } = req.query;
      const params = [req.user.school_id, is_active === 'true'];
      let whereClause = 'WHERE school_id = $1 AND is_active = $2';

      if (search) {
        params.push(`%${search}%`);
        whereClause += ` AND name ILIKE $${params.length}`;
      }

      const { rows } = await pool.query(
        `SELECT id, name, code, color, motto, house_captain_id, house_teacher_id,
                points, is_active, created_at
         FROM houses ${whereClause} ORDER BY sort_order, name`,
        params
      );

      return res.json({ success: true, data: rows, message: 'Houses retrieved successfully', meta: { total: rows.length } });
    } catch (error) {
      console.error('Error listing houses:', error);
      return res.status(500).json({
        success: false, message: 'Failed to retrieve houses',
        error: { code: 'INTERNAL_ERROR', message: error.message }
      });
    }
  }
);

// #74 POST /houses — Create house
router.post(
  '/houses',
  requireAuth,
  requireRole('academic_masters', 'create'),
  async (req, res) => {
    try {
      const { name, code, color, motto, house_captain_id, house_teacher_id, sort_order } = req.body;

      if (!name) {
        return res.status(400).json({ success: false, message: 'House name is required' });
      }

      const existing = await pool.query(
        'SELECT id FROM houses WHERE school_id = $1 AND name = $2',
        [req.user.school_id, name]
      );
      if (existing.rows.length > 0) {
        return res.status(409).json({ success: false, message: 'House with this name already exists' });
      }

      const { rows } = await pool.query(
        `INSERT INTO houses (school_id, name, code, color, motto, house_captain_id, house_teacher_id, sort_order, points, is_active, created_by, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0, true, $9, NOW()) RETURNING *`,
        [req.user.school_id, name.trim(), code || null, color || null, motto || null, house_captain_id || null, house_teacher_id || null, sort_order || 0, req.user.id]
      );

      return res.status(201).json({ success: true, data: rows[0], message: 'House created successfully' });
    } catch (error) {
      console.error('Error creating house:', error);
      return res.status(500).json({
        success: false, message: 'Failed to create house',
        error: { code: 'INTERNAL_ERROR', message: error.message }
      });
    }
  }
);

module.exports = router;
