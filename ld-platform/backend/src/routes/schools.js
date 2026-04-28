const express = require('express');
const Joi = require('joi');
const { requireAuth, requireRole } = require('../middleware/auth');
const {
  createSchool, registerSchool, joinSchoolByCode, getSchoolInfo,
  createTeacherInvite, acceptTeacherInvite,
  linkParentToStudent,
  createClass, getClassStudents, getTeacherClasses,
} = require('../services/schoolService');
const { query } = require('../config/database');

const router = express.Router();
const DEMO_SCHOOL_ID = '00000000-0000-0000-0000-000000000001';

// ─── School Registration (public — new teacher registers their school) ────────
// POST /api/schools/register
router.post('/register', requireAuth, async (req, res, next) => {
  try {
    const schema = Joi.object({
      name:            Joi.string().min(2).max(200).required(),
      location:        Joi.string().min(2).max(200).required(),
      board:           Joi.string().valid('CBSE','ICSE','State','Other').default('CBSE'),
      principalName:   Joi.string().max(100).optional().allow(''),
      studentStrength: Joi.number().integer().min(0).max(10000).optional(),
    });
    const { error, value } = schema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const school = await registerSchool({ ...value, userId: req.user.userId });
    res.status(201).json({ school });
  } catch (err) { next(err); }
});

// ─── Admin creates school ─────────────────────────────────────────────────────
// POST /api/schools
router.post('/', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const schema = Joi.object({
      name:     Joi.string().min(2).max(200).required(),
      location: Joi.string().max(200).required(),
      planType: Joi.string().valid('free','basic','pro').default('free'),
    });
    const { error, value } = schema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const school = await createSchool(value);
    res.status(201).json({ school });
  } catch (err) { next(err); }
});

// ─── Join school by code ──────────────────────────────────────────────────────
// POST /api/schools/join-by-code   body: { code }
router.post('/join-by-code', requireAuth, async (req, res, next) => {
  try {
    const { code } = req.body;
    if (!code?.trim()) return res.status(400).json({ error: 'code is required' });
    const schoolId = await joinSchoolByCode(req.user.userId, code.trim().toUpperCase());
    res.json({ message: 'Joined school successfully', schoolId });
  } catch (err) {
    if (err.status === 404) return res.status(404).json({ error: err.message });
    next(err);
  }
});

// ─── Get school info (join code, teachers list) ───────────────────────────────
// GET /api/schools/info
router.get('/info', requireAuth, requireRole('teacher','admin'), async (req, res, next) => {
  try {
    const schoolId = req.user.schoolId;
    if (!schoolId) return res.status(404).json({ error: 'Not assigned to a school' });

    if (schoolId === DEMO_SCHOOL_ID) {
      return res.json({
        school: { id: DEMO_SCHOOL_ID, name: 'Demo School', location: 'Delhi', board: 'CBSE', plan_type: 'free', join_code: 'DEMO01', max_students: 5 },
        teachers: [{ id: '00000000-0000-0000-0000-000000000000', name: 'Demo Teacher', role: 'teacher' }],
      });
    }

    const result = await getSchoolInfo(schoolId);
    res.json(result);
  } catch (err) { next(err); }
});

// ─── Invite teacher ───────────────────────────────────────────────────────────
// POST /api/schools/invite-teacher   body: { phone?, email? }
router.post('/invite-teacher', requireAuth, requireRole('teacher','admin'), async (req, res, next) => {
  try {
    const schema = Joi.object({
      phone: Joi.string().pattern(/^\+91[6-9]\d{9}$/).optional(),
      email: Joi.string().email().optional(),
    }).or('phone', 'email');
    const { error, value } = schema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const schoolId = req.user.schoolId;
    if (!schoolId) return res.status(400).json({ error: 'You must belong to a school to invite teachers' });

    const invite = await createTeacherInvite({ schoolId, invitedBy: req.user.userId, ...value });

    const inviteLink = `${process.env.WEB_URL || 'http://localhost:5173'}/invite/${invite.token}`;
    res.json({ message: 'Invite created', inviteLink, token: invite.token });
  } catch (err) { next(err); }
});

// ─── Accept teacher invite ────────────────────────────────────────────────────
// POST /api/schools/accept-invite/:token
router.post('/accept-invite/:token', requireAuth, async (req, res, next) => {
  try {
    const schoolId = await acceptTeacherInvite(req.params.token, req.user.userId);
    res.json({ message: 'Welcome to the school!', schoolId });
  } catch (err) {
    if (err.status === 400) return res.status(400).json({ error: err.message });
    next(err);
  }
});

// ─── Link parent to student ───────────────────────────────────────────────────
// POST /api/schools/link-parent
// body: { studentId, parentPhone?, parentEmail? }
router.post('/link-parent', requireAuth, requireRole('teacher','admin'), async (req, res, next) => {
  try {
    const schema = Joi.object({
      studentId:   Joi.string().uuid().required(),
      parentPhone: Joi.string().pattern(/^\+91[6-9]\d{9}$/).optional(),
      parentEmail: Joi.string().email().optional(),
    }).or('parentPhone', 'parentEmail');
    const { error, value } = schema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    await linkParentToStudent({ teacherId: req.user.userId, ...value });
    res.json({ message: 'Parent linked successfully. They can now log in to view the scorecard.' });
  } catch (err) {
    if (err.status === 400) return res.status(400).json({ error: err.message });
    next(err);
  }
});

// ─── Subscription info ────────────────────────────────────────────────────────
// GET /api/schools/subscription
router.get('/subscription', requireAuth, requireRole('teacher','admin'), async (req, res, next) => {
  try {
    const schoolId = req.user.schoolId;
    if (!schoolId) return res.status(404).json({ error: 'No school assigned' });

    if (schoolId === DEMO_SCHOOL_ID) {
      return res.json({ planType: 'free', maxStudents: 5, studentCount: 3, usagePct: 60, subscriptionExpiresAt: null, isExpired: false, schoolId });
    }

    const result = await query(
      `SELECT sc.plan_type, sc.max_students, sc.subscription_expires_at,
              COUNT(DISTINCT u.id) FILTER (WHERE u.role = 'student') AS student_count
       FROM schools sc
       LEFT JOIN users u ON u.school_id = sc.id
       WHERE sc.id = $1
       GROUP BY sc.plan_type, sc.max_students, sc.subscription_expires_at`,
      [schoolId]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'School not found' });

    const row = result.rows[0];
    const isExpired = row.subscription_expires_at ? new Date(row.subscription_expires_at) < new Date() : false;
    const studentCount = Number(row.student_count) || 0;
    const maxStudents = Number(row.max_students) || 5;
    const usagePct = Math.min(100, Math.round((studentCount / maxStudents) * 100));

    res.json({ planType: row.plan_type || 'free', maxStudents, studentCount, usagePct, subscriptionExpiresAt: row.subscription_expires_at, isExpired, schoolId });
  } catch (err) { next(err); }
});

// ─── Classes ──────────────────────────────────────────────────────────────────
router.post('/classes', requireAuth, requireRole('teacher','admin'), async (req, res, next) => {
  try {
    const schema = Joi.object({
      className: Joi.string().min(2).max(100).required(),
      schoolId:  Joi.string().uuid().required(),
    });
    const { error, value } = schema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const classRecord = await createClass(req.user.userId, value.schoolId, value.className);
    res.status(201).json({ class: classRecord });
  } catch (err) { next(err); }
});

router.get('/classes', requireAuth, requireRole('teacher','admin'), async (req, res, next) => {
  try {
    const classes = await getTeacherClasses(req.user.userId);
    res.json({ classes });
  } catch (err) { next(err); }
});

router.get('/classes/:classId/students', requireAuth, requireRole('teacher','admin'), async (req, res, next) => {
  try {
    const students = await getClassStudents(req.params.classId, req.user.userId);
    res.json({ students });
  } catch (err) { next(err); }
});

module.exports = router;
