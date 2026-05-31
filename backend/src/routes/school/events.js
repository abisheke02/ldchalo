/**
 * Chalo Schools ERP - Events Routes
 * Endpoints 38-41: Events CRUD
 * File: routes/events.js
 */

const express = require('express');
const router = express.Router();
const pool = require('../../config/database');
const { requireAuth } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/auth');

// ─────────────────────────────────────────────────────────────────────────────
// #38 GET /events — List events (filter by month/type/class)
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  '/',
  requireAuth,
  requireRole('events', 'read'),
  async (req, res) => {
    try {
      const {
        page = 1,
        limit = 50,
        search,
        type,
        month,
        year,
        from_date,
        to_date,
        class_id,
        branch_id,
        status,
        sort = 'start_date',
        order = 'asc'
      } = req.query;
      const offset = (page - 1) * limit;
      const params = [req.user.school_id];
      let whereClause = 'WHERE e.school_id = $1';

      if (search) {
        params.push(`%${search}%`);
        whereClause += ` AND (e.title ILIKE $${params.length} OR e.description ILIKE $${params.length})`;
      }

      if (type) {
        params.push(type);
        whereClause += ` AND e.type = $${params.length}`;
      }

      if (month) {
        params.push(parseInt(month));
        whereClause += ` AND EXTRACT(MONTH FROM e.start_date) = $${params.length}`;
      }

      if (year) {
        params.push(parseInt(year));
        whereClause += ` AND EXTRACT(YEAR FROM e.start_date) = $${params.length}`;
      }

      if (from_date) {
        params.push(from_date);
        whereClause += ` AND e.start_date >= $${params.length}::date`;
      }

      if (to_date) {
        params.push(to_date);
        whereClause += ` AND e.end_date <= $${params.length}::date`;
      }

      if (class_id) {
        params.push(parseInt(class_id));
        whereClause += ` AND (e.applicable_classes @> ARRAY[$${params.length}]::int[] OR e.applicable_classes IS NULL)`;
      }

      if (branch_id) {
        params.push(parseInt(branch_id));
        whereClause += ` AND (e.branch_id = $${params.length} OR e.branch_id IS NULL)`;
      }

      if (status) {
        params.push(status);
        whereClause += ` AND e.status = $${params.length}`;
      }

      // Validate sort column
      const allowedSorts = ['start_date', 'end_date', 'title', 'created_at'];
      const sortCol = allowedSorts.includes(sort) ? `e.${sort}` : 'e.start_date';
      const sortOrder = order.toLowerCase() === 'desc' ? 'DESC' : 'ASC';

      // Count
      const countResult = await pool.query(
        `SELECT COUNT(*) FROM events e ${whereClause}`,
        params
      );
      const total = parseInt(countResult.rows[0].count);

      // Data
      params.push(parseInt(limit), offset);
      const { rows } = await pool.query(
        `SELECT e.id, e.title, e.description, e.type, e.start_date, e.end_date,
                e.start_time, e.end_time, e.venue, e.organizer, e.status,
                e.is_all_day, e.applicable_classes, e.applicable_to,
                e.branch_id, e.attachment_url, e.created_by,
                u.name AS created_by_name, e.created_at
         FROM events e
         LEFT JOIN users u ON u.id = e.created_by
         ${whereClause}
         ORDER BY ${sortCol} ${sortOrder}
         LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params
      );

      return res.json({
        success: true,
        data: rows,
        message: 'Events retrieved successfully',
        meta: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('Error listing events:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve events',
        error: { code: 'INTERNAL_ERROR', message: error.message }
      });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// #39 POST /events — Create event
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  '/',
  requireAuth,
  requireRole('events', 'create'),
  async (req, res) => {
    try {
      const {
        title, description, type, start_date, end_date,
        start_time, end_time, venue, organizer, is_all_day = false,
        applicable_classes, applicable_to = 'all', branch_id,
        attachment_url, notify = false
      } = req.body;

      // Validation
      if (!title || !start_date) {
        return res.status(400).json({
          success: false,
          message: 'Title and start_date are required'
        });
      }

      // Validate type
      const validTypes = ['academic', 'cultural', 'sports', 'meeting', 'examination', 'holiday', 'other'];
      if (type && !validTypes.includes(type)) {
        return res.status(400).json({
          success: false,
          message: `Type must be one of: ${validTypes.join(', ')}`
        });
      }

      // Validate date range
      if (end_date && end_date < start_date) {
        return res.status(400).json({
          success: false,
          message: 'end_date cannot be before start_date'
        });
      }

      const { rows } = await pool.query(
        `INSERT INTO events (
          school_id, title, description, type, start_date, end_date,
          start_time, end_time, venue, organizer, is_all_day,
          applicable_classes, applicable_to, branch_id, attachment_url,
          status, created_by, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'published', $16, NOW())
        RETURNING *`,
        [
          req.user.school_id, title.trim(), description || null, type || 'other',
          start_date, end_date || start_date, start_time || null, end_time || null,
          venue || null, organizer || null, is_all_day,
          applicable_classes || null, applicable_to, branch_id || null,
          attachment_url || null, req.user.id
        ]
      );

      // TODO: If notify is true, send notifications to applicable users
      // This would integrate with a notification service

      return res.status(201).json({
        success: true,
        data: rows[0],
        message: 'Event created successfully'
      });
    } catch (error) {
      console.error('Error creating event:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to create event',
        error: { code: 'INTERNAL_ERROR', message: error.message }
      });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// #40 PUT /events/:id — Update event
// ─────────────────────────────────────────────────────────────────────────────
router.put(
  '/:id',
  requireAuth,
  requireRole('events', 'update'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const {
        title, description, type, start_date, end_date,
        start_time, end_time, venue, organizer, is_all_day,
        applicable_classes, applicable_to, branch_id,
        attachment_url, status
      } = req.body;

      // Verify exists
      const existing = await pool.query(
        'SELECT id FROM events WHERE id = $1 AND school_id = $2',
        [id, req.user.school_id]
      );
      if (existing.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Event not found'
        });
      }

      // Build dynamic update
      const updates = [];
      const params = [];
      let idx = 1;

      if (title !== undefined) { updates.push(`title = $${idx}`); params.push(title.trim()); idx++; }
      if (description !== undefined) { updates.push(`description = $${idx}`); params.push(description); idx++; }
      if (type !== undefined) { updates.push(`type = $${idx}`); params.push(type); idx++; }
      if (start_date !== undefined) { updates.push(`start_date = $${idx}`); params.push(start_date); idx++; }
      if (end_date !== undefined) { updates.push(`end_date = $${idx}`); params.push(end_date); idx++; }
      if (start_time !== undefined) { updates.push(`start_time = $${idx}`); params.push(start_time); idx++; }
      if (end_time !== undefined) { updates.push(`end_time = $${idx}`); params.push(end_time); idx++; }
      if (venue !== undefined) { updates.push(`venue = $${idx}`); params.push(venue); idx++; }
      if (organizer !== undefined) { updates.push(`organizer = $${idx}`); params.push(organizer); idx++; }
      if (is_all_day !== undefined) { updates.push(`is_all_day = $${idx}`); params.push(is_all_day); idx++; }
      if (applicable_classes !== undefined) { updates.push(`applicable_classes = $${idx}`); params.push(applicable_classes); idx++; }
      if (applicable_to !== undefined) { updates.push(`applicable_to = $${idx}`); params.push(applicable_to); idx++; }
      if (branch_id !== undefined) { updates.push(`branch_id = $${idx}`); params.push(branch_id); idx++; }
      if (attachment_url !== undefined) { updates.push(`attachment_url = $${idx}`); params.push(attachment_url); idx++; }
      if (status !== undefined) { updates.push(`status = $${idx}`); params.push(status); idx++; }

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
        `UPDATE events SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
        params
      );

      return res.json({
        success: true,
        data: rows[0],
        message: 'Event updated successfully'
      });
    } catch (error) {
      console.error('Error updating event:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update event',
        error: { code: 'INTERNAL_ERROR', message: error.message }
      });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// #41 DELETE /events/:id — Delete event
// ─────────────────────────────────────────────────────────────────────────────
router.delete(
  '/:id',
  requireAuth,
  requireRole('events', 'delete'),
  async (req, res) => {
    try {
      const { id } = req.params;

      const result = await pool.query(
        'DELETE FROM events WHERE id = $1 AND school_id = $2 RETURNING id, title',
        [id, req.user.school_id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Event not found'
        });
      }

      return res.json({
        success: true,
        data: null,
        message: `Event "${result.rows[0].title}" deleted successfully`
      });
    } catch (error) {
      console.error('Error deleting event:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete event',
        error: { code: 'INTERNAL_ERROR', message: error.message }
      });
    }
  }
);

module.exports = router;
