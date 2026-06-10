/**
 * Test Routes — Progressive Level Tests
 * Students must pass these to officially advance.
 */
const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const TestEngine = require('../services/testEngine');

// Initialize with DB pool (injected via app.locals or passed in)
let testEngine;
const getEngine = (req) => {
  if (!testEngine && req.app.locals.db) {
    testEngine = new TestEngine(req.app.locals.db);
  }
  return testEngine;
};

// GET /api/tests/available — Which test is available for the student
router.get('/available', requireAuth, async (req, res) => {
  try {
    const engine = getEngine(req);
    const available = await engine.getAvailableTest(req.user.id);
    res.json(available);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tests/start — Start a timed test
router.post('/start', requireAuth, async (req, res) => {
  try {
    const engine = getEngine(req);
    const { level } = req.body;
    const result = await engine.startTest(req.user.id, level);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/tests/submit-answer — Submit one answer
router.post('/submit-answer', requireAuth, async (req, res) => {
  try {
    const engine = getEngine(req);
    const { attemptId, questionId, answer } = req.body;
    const result = await engine.submitAnswer(attemptId, questionId, answer);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/tests/complete — Finish and grade the test
router.post('/complete', requireAuth, async (req, res) => {
  try {
    const engine = getEngine(req);
    const { attemptId } = req.body;
    const result = await engine.completeTest(attemptId);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/tests/result/:attemptId — Get detailed result
router.get('/result/:attemptId', requireAuth, async (req, res) => {
  try {
    const engine = getEngine(req);
    const result = await engine.completeTest(req.params.attemptId);
    res.json(result);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

// GET /api/tests/history — Past attempts
router.get('/history', requireAuth, async (req, res) => {
  try {
    const engine = getEngine(req);
    const history = await engine.getHistory(req.user.id);
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/tests/certificate/:attemptId — Certificate for passed test
router.get('/certificate/:attemptId', requireAuth, async (req, res) => {
  try {
    const engine = getEngine(req);
    const cert = await engine.getCertificate(req.params.attemptId);
    res.json(cert);
  } catch (err) {
    res.status(404).json({ error: 'Certificate not found' });
  }
});

module.exports = router;
