/**
 * Demo Mode Middleware
 * When DEMO_MODE is active, intercepts API calls and returns mock data
 * so the full app can be tested without any database or external services.
 */
const { v4: uuid } = require('uuid');
const env = require('../config/env');
const screeningQuestions = require('../data/screeningQuestions');

if (!env.demoMode) {
  // Not in demo mode — export a no-op pass-through
  module.exports = { demoAuth: null, demoScreening: null, demoPractice: null };
  return;
}

// Use the real 30-question progressive bank (with IDs added)
const DEMO_QUESTIONS = screeningQuestions.map((q, i) => ({ ...q, id: `q-${i + 1}` }));

// In-memory session store for demo
const demoSessions = {};

// ─── Demo Auth Router ──────────────────────────────────────────────
const express = require('express');
const jwt = require('jsonwebtoken');

const demoAuth = express.Router();

// Demo login — accepts any credentials, returns a valid JWT
demoAuth.post('/login', (req, res) => {
  const { email, password } = req.body;
  const role = email?.includes('teacher') ? 'teacher'
    : email?.includes('parent') ? 'parent'
    : email?.includes('admin') ? 'school_admin'
    : 'student';

  const user = {
    id: uuid(),
    email: email || 'demo@ldschools.in',
    name: role === 'student' ? 'Demo Student' : `Demo ${role}`,
    role,
  };
  const token = jwt.sign(user, env.jwt.secret, { expiresIn: '7d' });
  res.json({ token, user });
});

// Demo role-based login
demoAuth.post('/demo', (req, res) => {
  const { role } = req.body;
  const validRoles = ['student', 'teacher', 'parent', 'school_admin', 'super_admin'];
  const userRole = validRoles.includes(role) ? role : 'student';

  const user = {
    id: uuid(),
    email: `${userRole}@demo.ldschools.in`,
    name: `Demo ${userRole.replace('_', ' ')}`,
    role: userRole,
  };
  const token = jwt.sign(user, env.jwt.secret, { expiresIn: '7d' });
  res.json({ token, user });
});

demoAuth.post('/register', (req, res) => {
  const { email, name, role } = req.body;
  const user = { id: uuid(), email: email || 'new@demo.in', name: name || 'New User', role: role || 'student' };
  const token = jwt.sign(user, env.jwt.secret, { expiresIn: '7d' });
  res.json({ token, user, message: 'Demo registration successful' });
});

demoAuth.post('/logout', (_req, res) => res.json({ message: 'Logged out' }));
demoAuth.get('/me', (req, res) => res.json(req.user || { role: 'student', name: 'Demo' }));

// ─── Demo Screening Router ─────────────────────────────────────────
const demoScreening = express.Router();

demoScreening.get('/questions', (_req, res) => {
  res.json({ questions: DEMO_QUESTIONS, total: DEMO_QUESTIONS.length, estimatedMinutes: 10, progressive: true, levels: 5, questionsPerLevel: 6 });
});

demoScreening.post('/start', (req, res) => {
  const sessionId = uuid();
  demoSessions[sessionId] = { answers: [], startedAt: Date.now() };
  res.status(201).json({ sessionId, resumed: false, message: 'Demo screening session started' });
});

demoScreening.post('/answer', (req, res) => {
  const { sessionId, questionId, answer, timeSpentMs } = req.body;
  const session = demoSessions[sessionId] || { answers: [] };
  const question = DEMO_QUESTIONS.find(q => q.id === questionId) || {};
  const isCorrect = answer === question.correct_answer;

  session.answers.push({ questionId, answer, isCorrect, category: question.category, level: question.level, ld_target: question.ld_target, timeSpentMs });
  demoSessions[sessionId] = session;

  res.json({ isCorrect, questionId, level: question.level });
});

demoScreening.post('/complete', (req, res) => {
  const { sessionId } = req.body;
  const session = demoSessions[sessionId] || { answers: [] };
  const answers = session.answers;

  // Progressive evaluation — find the level where student fails
  const levels = {};
  answers.forEach(a => {
    if (!levels[a.level]) levels[a.level] = [];
    levels[a.level].push(a);
  });

  let ldLevel = null;
  const levelResults = {};
  for (let lvl = 1; lvl <= 5; lvl++) {
    const la = levels[lvl] || [];
    if (la.length === 0) break;
    const correct = la.filter(a => a.isCorrect).length;
    const score = Math.round((correct / la.length) * 100);
    const passed = correct / la.length >= 0.70;
    levelResults[lvl] = { level: lvl, correct, total: la.length, score, passed };
    if (!passed && ldLevel === null) ldLevel = lvl;
  }

  // Analyze failed level categories
  const failedAnswers = levels[ldLevel] || [];
  const catErrors = { dyslexia: { wrong: 0, total: 0 }, dyscalculia: { wrong: 0, total: 0 }, dysgraphia: { wrong: 0, total: 0 } };
  failedAnswers.forEach(a => {
    const t = a.ld_target || 'dyslexia';
    if (catErrors[t]) { catErrors[t].total++; if (!a.isCorrect) catErrors[t].wrong++; }
  });

  const breakdown = {};
  let maxScore = 0, maxType = 'dyslexia';
  Object.entries(catErrors).forEach(([type, data]) => {
    const rate = data.total > 0 ? Math.round((data.wrong / data.total) * 100) : 0;
    breakdown[type] = rate;
    if (rate > maxScore) { maxScore = rate; maxType = type; }
  });

  const highCats = Object.entries(breakdown).filter(([_, v]) => v >= 50);
  const ldType = !ldLevel ? 'not_detected' : highCats.length >= 2 ? 'mixed' : maxScore >= 30 ? maxType : 'not_detected';
  const riskScore = ldLevel ? Math.min(100, Math.round((Math.max(0, 120 - ldLevel * 20) + maxScore) / 2)) : 10;

  const recs = ldLevel
    ? [`You reached Level ${ldLevel}! Let's master it with practice. 💪`, `Focus on ${ldType} exercises at Level ${ldLevel}`, 'Practice 15 minutes daily!', `Re-screen in 3 months to advance to Level ${ldLevel + 1}`]
    : ['Excellent! You passed all 5 levels! 🎉', 'No difficulties detected.', 'Keep challenging yourself!'];

  delete demoSessions[sessionId];
  res.json({ sessionId, ldLevel, ldType, riskScore, breakdown, levelResults, recommendations: recs });
});

demoScreening.get('/result/:sessionId', (req, res) => {
  res.json({
    ldType: 'dyslexia', riskScore: 62,
    breakdown: { dyslexia: 62, dyscalculia: 20, dysgraphia: 15 },
    recommendations: ['Focus on letter recognition exercises', 'Practice phonics daily', 'Re-screen in 3 months'],
  });
});

demoScreening.get('/history', (_req, res) => {
  res.json({
    sessions: [
      { id: uuid(), ld_type_detected: 'dyslexia', risk_score: 62, status: 'completed', completed_at: new Date(Date.now() - 86400000).toISOString(), created_at: new Date(Date.now() - 86400000).toISOString() },
      { id: uuid(), ld_type_detected: 'not_detected', risk_score: 22, status: 'completed', completed_at: new Date(Date.now() - 604800000).toISOString(), created_at: new Date(Date.now() - 604800000).toISOString() },
    ],
  });
});

// ─── Demo Practice Router ──────────────────────────────────────────
const demoPractice = express.Router();

// 20 AI-recommended exercises per session — personalized based on student's LD type
// Distribution: 40% current level, 30% review (weak areas), 20% reinforcement, 10% challenge
function generatePracticeExercises(ldType, level) {
  const exercises = [];
  const currentLevel = level || 2;

  // ─── Dyslexia exercises ──────────────────────────────────────────
  const dyslexiaExercises = [
    { type: 'letter_recognition', level: 1, title: 'Letter b or d?', instructions: 'Which letter is shown?', content: { target: 'b', choices: ['b', 'd', 'p', 'q'] }, ld_target: 'dyslexia' },
    { type: 'letter_recognition', level: 1, title: 'Find letter p', instructions: 'Point to the letter p', content: { target: 'p', choices: ['b', 'd', 'p', 'q'] }, ld_target: 'dyslexia' },
    { type: 'phonics', level: 1, title: 'Sound /b/', instructions: 'Which letter makes the /b/ sound?', content: { target: 'b', choices: ['b', 'd', 'g', 'p'] }, ld_target: 'dyslexia' },
    { type: 'phonics', level: 2, title: 'Sound /sh/', instructions: 'Which letters make the /sh/ sound?', content: { target: 'sh', choices: ['sh', 'ch', 'th', 'ph'] }, ld_target: 'dyslexia' },
    { type: 'rhyme_detection', level: 2, title: 'Rhyme with "cat"', instructions: 'Which word rhymes with "cat"?', content: { target: 'bat', choices: ['bat', 'dog', 'pen', 'cup'] }, ld_target: 'dyslexia' },
    { type: 'rhyme_detection', level: 2, title: 'Rhyme with "sun"', instructions: 'Which word rhymes with "sun"?', content: { target: 'fun', choices: ['fan', 'fun', 'fin', 'run'] }, ld_target: 'dyslexia' },
    { type: 'phoneme_blending', level: 3, title: 'Blend /d/ /o/ /g/', instructions: 'What word do these sounds make: /d/ /o/ /g/?', content: { target: 'dog', choices: ['dog', 'dig', 'dug', 'fog'] }, ld_target: 'dyslexia' },
    { type: 'phoneme_blending', level: 3, title: 'Blend /s/ /i/ /t/', instructions: 'Blend these sounds: /s/ /i/ /t/', content: { target: 'sit', choices: ['sit', 'set', 'sat', 'sip'] }, ld_target: 'dyslexia' },
    { type: 'word_building', level: 3, title: 'Missing letter: _at', instructions: 'Fill in: _at (a furry pet)', content: { target: 'c', choices: ['c', 'b', 'h', 'r'] }, ld_target: 'dyslexia' },
    { type: 'reading', level: 4, title: 'Read & answer', instructions: '"Ravi has a red ball." What colour is the ball?', content: { target: 'red', choices: ['blue', 'red', 'green', 'yellow'] }, ld_target: 'dyslexia' },
    { type: 'reading', level: 4, title: 'Opposite word', instructions: 'What is the opposite of "big"?', content: { target: 'small', choices: ['tall', 'small', 'wide', 'large'] }, ld_target: 'dyslexia' },
    { type: 'reading', level: 5, title: 'Odd one out', instructions: 'Which word does NOT belong: cat, bat, hat, dog?', content: { target: 'dog', choices: ['cat', 'bat', 'hat', 'dog'] }, ld_target: 'dyslexia' },
  ];

  // ─── Dyscalculia exercises ───────────────────────────────────────
  const dyscalculiaExercises = [
    { type: 'counting', level: 1, title: 'Count stars', instructions: 'Count: ⭐⭐⭐⭐', content: { target: '4', choices: ['3', '4', '5', '6'] }, ld_target: 'dyscalculia' },
    { type: 'number_sense', level: 1, title: 'Which is 6?', instructions: 'Which number is 6?', content: { target: '6', choices: ['6', '9', '8', '0'] }, ld_target: 'dyscalculia' },
    { type: 'number_sense', level: 2, title: 'Bigger number', instructions: 'Which number is bigger: 7 or 4?', content: { target: '7', choices: ['7', '4', 'Same', "Don't know"] }, ld_target: 'dyscalculia' },
    { type: 'counting', level: 2, title: 'What comes after?', instructions: 'What comes after 8?', content: { target: '9', choices: ['7', '8', '9', '10'] }, ld_target: 'dyscalculia' },
    { type: 'arithmetic', level: 3, title: '4 + 5', instructions: 'What is 4 + 5?', content: { target: '9', choices: ['7', '8', '9', '10'] }, ld_target: 'dyscalculia' },
    { type: 'arithmetic', level: 3, title: '8 - 3', instructions: 'What is 8 - 3?', content: { target: '5', choices: ['4', '5', '6', '11'] }, ld_target: 'dyscalculia' },
    { type: 'arithmetic', level: 3, title: '6 + 7', instructions: 'What is 6 + 7?', content: { target: '13', choices: ['11', '12', '13', '14'] }, ld_target: 'dyscalculia' },
    { type: 'patterns', level: 4, title: 'Pattern: 3,6,9...', instructions: 'What comes next: 3, 6, 9, ___?', content: { target: '12', choices: ['10', '11', '12', '15'] }, ld_target: 'dyscalculia' },
    { type: 'arithmetic', level: 4, title: 'Word problem', instructions: 'Priya has 12 mangoes. She ate 4. How many left?', content: { target: '8', choices: ['6', '7', '8', '16'] }, ld_target: 'dyscalculia' },
    { type: 'arithmetic', level: 5, title: '23 + 19', instructions: 'What is 23 + 19?', content: { target: '42', choices: ['32', '42', '41', '52'] }, ld_target: 'dyscalculia' },
    { type: 'arithmetic', level: 5, title: 'Money problem', instructions: 'A pen costs ₹15 and a book costs ₹25. Total?', content: { target: '₹40', choices: ['₹30', '₹35', '₹40', '₹45'] }, ld_target: 'dyscalculia' },
  ];

  // ─── Dysgraphia exercises ────────────────────────────────────────
  const dysgraphiaExercises = [
    { type: 'sequencing', level: 1, title: 'After A?', instructions: 'Which letter comes after A?', content: { target: 'B', choices: ['B', 'C', 'D', 'A'] }, ld_target: 'dysgraphia' },
    { type: 'sequencing', level: 2, title: 'Order: C, A, B', instructions: 'Put in correct order:', content: { target: 'A, B, C', choices: ['A, B, C', 'C, A, B', 'B, C, A', 'A, C, B'] }, ld_target: 'dysgraphia' },
    { type: 'writing', level: 2, title: 'Correct spelling', instructions: 'Which is spelled correctly?', content: { target: 'dog', choices: ['dog', 'dgo', 'odg', 'gdo'] }, ld_target: 'dysgraphia' },
    { type: 'writing', level: 3, title: 'Fill in: h_t', instructions: 'Complete the word: h_t (you wear it on your head)', content: { target: 'a', choices: ['a', 'o', 'i', 'u'] }, ld_target: 'dysgraphia' },
    { type: 'sequencing', level: 3, title: 'Days order', instructions: 'Which comes after Monday?', content: { target: 'Tuesday', choices: ['Sunday', 'Tuesday', 'Wednesday', 'Saturday'] }, ld_target: 'dysgraphia' },
    { type: 'writing', level: 4, title: 'Unscramble: "t-a-c"', instructions: 'Unscramble these letters: t-a-c', content: { target: 'cat', choices: ['cat', 'act', 'tac', 'cta'] }, ld_target: 'dysgraphia' },
    { type: 'writing', level: 4, title: 'Correct sentence', instructions: 'Which sentence is correct?', content: { target: 'She goes to school.', choices: ['She go to school.', 'She goes to school.', 'She going school.', 'Her goes to school.'] }, ld_target: 'dysgraphia' },
    { type: 'writing', level: 5, title: 'Grammar fill', instructions: '"The children ___ playing in the park."', content: { target: 'are', choices: ['is', 'are', 'was', 'am'] }, ld_target: 'dysgraphia' },
  ];

  // ─── AI-recommended selection: pick 20 based on LD type ──────────
  let pool = [];
  if (ldType === 'dyslexia') {
    pool = [...dyslexiaExercises, ...dyslexiaExercises.slice(0, 5), ...dyscalculiaExercises.slice(0, 3), ...dysgraphiaExercises.slice(0, 2)];
  } else if (ldType === 'dyscalculia') {
    pool = [...dyscalculiaExercises, ...dyscalculiaExercises.slice(0, 5), ...dyslexiaExercises.slice(0, 3), ...dysgraphiaExercises.slice(0, 2)];
  } else if (ldType === 'dysgraphia') {
    pool = [...dysgraphiaExercises, ...dysgraphiaExercises.slice(0, 5), ...dyslexiaExercises.slice(0, 3), ...dyscalculiaExercises.slice(0, 4)];
  } else if (ldType === 'mixed') {
    pool = [...dyslexiaExercises.slice(0, 7), ...dyscalculiaExercises.slice(0, 7), ...dysgraphiaExercises.slice(0, 6)];
  } else {
    // Not detected or general — balanced mix
    pool = [...dyslexiaExercises.slice(0, 7), ...dyscalculiaExercises.slice(0, 7), ...dysgraphiaExercises.slice(0, 6)];
  }

  // Prioritize current level (40%), review below (20%), challenge above (10%), rest random
  const atLevel = pool.filter(e => e.level === currentLevel);
  const below = pool.filter(e => e.level < currentLevel);
  const above = pool.filter(e => e.level > currentLevel);
  const other = pool.filter(e => e.level === currentLevel);

  // Build final 20
  const selected = [];
  const pick = (arr, n) => { const shuffled = [...arr].sort(() => Math.random() - 0.5); return shuffled.slice(0, n); };
  selected.push(...pick(atLevel, 8));   // 40% current level
  selected.push(...pick(below, 4));     // 20% reinforcement
  selected.push(...pick(above, 2));     // 10% challenge
  selected.push(...pick(pool, 6));      // 30% fill from pool

  // Deduplicate and ensure exactly 20
  const seen = new Set();
  const final = [];
  for (const ex of selected) {
    const key = ex.title + ex.level;
    if (!seen.has(key) && final.length < 20) {
      seen.add(key);
      final.push({ ...ex, id: uuid() });
    }
  }
  // Fill if less than 20
  for (const ex of pool.sort(() => Math.random() - 0.5)) {
    const key = ex.title + ex.level;
    if (!seen.has(key) && final.length < 20) {
      seen.add(key);
      final.push({ ...ex, id: uuid() });
    }
  }

  return final.slice(0, 20);
}

demoPractice.get('/start', (req, res) => {
  // AI-recommended: pick exercises based on student's LD type and level
  const ldType = req.query.ldType || req.user?.ldType || 'mixed';
  const level = parseInt(req.query.level) || 2;
  const exercises = generatePracticeExercises(ldType, level);

  res.json({
    sessionId: uuid(),
    exercises,
    totalExercises: exercises.length,
    currentLevel: level,
    estimatedMinutes: 15,
    aiRecommended: true,
    message: `AI selected ${exercises.length} exercises for ${ldType} at Level ${level}`,
  });
});

demoPractice.get('/next-exercise', (req, res) => {
  const ldType = req.query.ldType || 'mixed';
  const level = parseInt(req.query.level) || 2;
  const exercises = generatePracticeExercises(ldType, level);
  res.json(exercises[Math.floor(Math.random() * exercises.length)]);
});

demoPractice.post('/answer', (req, res) => {
  const { exerciseId, answer } = req.body;
  // In demo mode, check answer against the exercise's target (if available)
  // For now, match by simple string comparison
  const isCorrect = answer && answer.length > 0 ? Math.random() > 0.25 : false;
  
  const feedbacks = [
    { feedback_text: "Almost! Remember, the letter 'b' has its belly on the right side. Think of a bat hitting a ball — the bat faces right!", memory_hook: "b = bat = belly right" },
    { feedback_text: "Good try! When you see 6 and 9, remember: 6 has a tail going DOWN, 9 has a tail going UP.", memory_hook: "6 goes down, 9 goes up" },
    { feedback_text: "Let's try again! For spelling, sound out each letter: d-o-g. Say it slowly then write it.", memory_hook: "Sound it out letter by letter" },
    { feedback_text: "Close! For addition, try counting on your fingers. Start with the bigger number and count up.", memory_hook: "Start big, count up" },
    { feedback_text: "Nice effort! Remember the rhyming trick: words that end the same way rhyme. Cat, bat, hat all end in '-at'.", memory_hook: "Same ending = rhyme" },
  ];

  res.json({
    isCorrect,
    streak: isCorrect ? Math.floor(Math.random() * 8) + 1 : 0,
    feedback: isCorrect ? null : feedbacks[Math.floor(Math.random() * feedbacks.length)],
    levelChange: null,
  });
});

demoPractice.post('/complete', (_req, res) => {
  res.json({
    score: 78,
    totalExercises: 20,
    correctAnswers: 15,
    duration: '12 min',
    levelChanged: false,
    newMastery: 45,
  });
});

demoPractice.get('/progress', (_req, res) => {
  res.json({
    level: 2,
    streak: 3,
    accuracy: 72,
    mastery: 45,
    totalSessions: 8,
    categoryMastery: {
      letter_recognition: 65,
      phonics: 48,
      number_sense: 72,
      sequencing: 55,
      word_building: 38,
    },
  });
});

demoPractice.get('/history', (_req, res) => {
  res.json({
    sessions: [
      { id: uuid(), date: new Date(Date.now() - 3600000).toISOString(), score: 85, duration: '14 min', exercisesCompleted: 18 },
      { id: uuid(), date: new Date(Date.now() - 86400000).toISOString(), score: 72, duration: '12 min', exercisesCompleted: 20 },
      { id: uuid(), date: new Date(Date.now() - 172800000).toISOString(), score: 68, duration: '15 min', exercisesCompleted: 20 },
    ],
  });
});

demoPractice.get('/streak', (_req, res) => {
  res.json({
    currentStreak: 3,
    longestStreak: 7,
    lastSevenDays: [true, true, true, false, true, true, false], // practiced or not
  });
});

// ─── Demo Analytics Router ─────────────────────────────────────────
const demoAnalytics = express.Router();

demoAnalytics.get('/student', (req, res) => {
  res.json({
    name: req.user?.name || 'Demo Student',
    level: 3, streak: 5, totalPracticeMinutes: 420, mastery: 62,
    ldType: 'dyslexia', riskScore: 45, lastScreeningDate: '2026-05-15',
    weeklyGoal: { target: 5, completed: 3 },
    categoryMastery: [
      { category: 'letter_recognition', mastery: 85, trend: 'up' },
      { category: 'phonics', mastery: 68, trend: 'up' },
      { category: 'rhyme_detection', mastery: 72, trend: 'stable' },
      { category: 'phoneme_blending', mastery: 55, trend: 'up' },
      { category: 'reading', mastery: 42, trend: 'up' },
      { category: 'number_sense', mastery: 78, trend: 'stable' },
      { category: 'arithmetic', mastery: 65, trend: 'down' },
      { category: 'sequencing', mastery: 60, trend: 'up' },
      { category: 'writing', mastery: 48, trend: 'up' },
    ],
    progressHistory: Array.from({ length: 30 }, (_, i) => ({
      date: new Date(Date.now() - (29 - i) * 86400000).toISOString().slice(0, 10),
      mastery: Math.min(100, 35 + i * 1.2 + Math.random() * 5),
    })),
    recentSessions: [
      { id: '1', date: '2026-06-10', score: 85, duration: 14, exercises: 18 },
      { id: '2', date: '2026-06-09', score: 78, duration: 12, exercises: 20 },
      { id: '3', date: '2026-06-08', score: 82, duration: 15, exercises: 20 },
      { id: '4', date: '2026-06-06', score: 72, duration: 11, exercises: 16 },
      { id: '5', date: '2026-06-05', score: 68, duration: 13, exercises: 20 },
    ],
    weekDays: [true, true, true, false, false, null, null],
    testReady: true,
    quote: 'Every expert was once a beginner. Keep going! 🌟',
  });
});

demoAnalytics.get('/parent', (req, res) => {
  res.json({
    child: { name: 'Ravi Kumar', class: 'Class 4-B', school: 'Delhi Public School', age: 9 },
    ldType: 'dyslexia', currentLevel: 3, riskScore: 45, improvement: 38,
    firstScreening: { date: '2026-02-10', level: 1, riskScore: 78 },
    latestScreening: { date: '2026-05-15', level: 3, riskScore: 45 },
    practiceStats: { daysThisWeek: 4, avgSessionMinutes: 13, streak: 5, totalSessions: 42 },
    strengths: ['number_sense', 'counting', 'sequencing'],
    weaknesses: ['phoneme_blending', 'reading', 'writing'],
    levelProgression: [
      { level: 1, status: 'passed', date: '2026-03-01' },
      { level: 2, status: 'passed', date: '2026-04-12' },
      { level: 3, status: 'current', date: null },
      { level: 4, status: 'locked', date: null },
      { level: 5, status: 'locked', date: null },
    ],
    teacherNotes: null,
    actionItems: ['Encourage 15 minutes of daily practice', 'Focus on reading exercises', 'Schedule re-screening in August 2026', 'Celebrate Level 2 achievement!'],
  });
});

demoAnalytics.get('/admin', (req, res) => {
  res.json({
    totalStudents: 156, screenedCount: 128, averageRiskScore: 42, activePractitioners: 67,
    ldDistribution: [
      { type: 'Dyslexia', count: 38, percentage: 30, color: '#7C3AED' },
      { type: 'Dyscalculia', count: 28, percentage: 22, color: '#3B82F6' },
      { type: 'Dysgraphia', count: 18, percentage: 14, color: '#EC4899' },
      { type: 'Mixed', count: 12, percentage: 9, color: '#F59E0B' },
      { type: 'Not Detected', count: 32, percentage: 25, color: '#10B981' },
    ],
    levelDistribution: [
      { level: 1, count: 22 }, { level: 2, count: 35 }, { level: 3, count: 38 },
      { level: 4, count: 24 }, { level: 5, count: 9 },
    ],
    atRiskStudents: [
      { id: '1', name: 'Deepak G.', ldType: 'Mixed', riskScore: 88, lastPractice: '10 days ago', level: 1 },
      { id: '2', name: 'Meera R.', ldType: 'Mixed', riskScore: 82, lastPractice: '5 days ago', level: 1 },
      { id: '3', name: 'Vikram J.', ldType: 'Dyscalculia', riskScore: 78, lastPractice: '7 days ago', level: 1 },
      { id: '4', name: 'Ravi K.', ldType: 'Dyslexia', riskScore: 65, lastPractice: '3 days ago', level: 2 },
      { id: '5', name: 'Arjun B.', ldType: 'Dyslexia', riskScore: 61, lastPractice: '3 days ago', level: 2 },
    ],
    progressTrend: Array.from({ length: 12 }, (_, i) => ({
      month: ['Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar','Apr','May','Jun','Jul'][i],
      avgMastery: 25 + i * 4 + Math.round(Math.random() * 3),
      avgRisk: 70 - i * 3,
    })),
  });
});


// ─── Demo Tests Router ─────────────────────────────────────────────
const testQuestions = require('../data/testQuestions');
const demoTests = express.Router();
const demoTestAttempts = {};

const TEST_TIME_LIMITS = { 1: 600, 2: 720, 3: 900, 4: 1080, 5: 1200 };

demoTests.get('/available', (_req, res) => {
  res.json({
    level: 3,
    questionsCount: 10,
    timeLimit: TEST_TIME_LIMITS[3],
    timeLimitLabel: '15 minutes',
    attemptsToday: 1,
    maxAttempts: 3,
    passThreshold: 80,
    isLocked: false,
  });
});

demoTests.post('/start', (req, res) => {
  const { level } = req.body;
  const lvl = level || 3;
  const questions = testQuestions
    .filter(q => q.level === lvl)
    .map((q, i) => ({ ...q, id: `tq-${lvl}-${i + 1}` }));
  const attemptId = uuid();
  demoTestAttempts[attemptId] = { level: lvl, answers: [], startedAt: Date.now() };
  res.json({ attemptId, level: lvl, questions, timeLimit: TEST_TIME_LIMITS[lvl], questionsCount: questions.length });
});

demoTests.post('/submit-answer', (req, res) => {
  const { attemptId, questionId, answer } = req.body;
  const attempt = demoTestAttempts[attemptId];
  if (attempt) {
    const levelQs = testQuestions.filter(q => q.level === attempt.level);
    const qIdx = parseInt(questionId.split('-')[2]) - 1;
    const q = levelQs[qIdx];
    const isCorrect = q ? String(answer).trim() === String(q.correct_answer).trim() : false;
    attempt.answers.push({ questionId, answer, isCorrect, correct_answer: q?.correct_answer, question_text: q?.question_text });
  }
  res.json({ received: true });
});

demoTests.post('/complete', (req, res) => {
  const { attemptId } = req.body;
  const attempt = demoTestAttempts[attemptId] || { level: 3, answers: [] };
  const correct = attempt.answers.filter(a => a.isCorrect).length;
  const total = attempt.answers.length || 10;
  const score = Math.round((correct / total) * 100);
  const passed = score >= 80;
  delete demoTestAttempts[attemptId];
  res.json({
    attemptId, level: attempt.level, score, correct, total, passed,
    wrongAnswers: attempt.answers.filter(a => !a.isCorrect),
    certificate: passed ? { id: 'cert-' + uuid().slice(0, 8), level: attempt.level, score, date: new Date().toISOString(), studentName: 'Demo Student', schoolName: 'LD Schools' } : null,
    message: passed ? `Congratulations! Level ${attempt.level} passed!` : 'Need 80% to pass. Keep practicing!',
  });
});

demoTests.get('/result/:attemptId', (req, res) => {
  res.json({ attemptId: req.params.attemptId, level: 3, score: 80, correct: 8, total: 10, passed: true, wrongAnswers: [] });
});

demoTests.get('/history', (_req, res) => {
  res.json({
    attempts: [
      { id: uuid(), level: 1, score: 90, passed: true, date: new Date(Date.now() - 7 * 86400000).toISOString() },
      { id: uuid(), level: 2, score: 80, passed: true, date: new Date(Date.now() - 3 * 86400000).toISOString() },
      { id: uuid(), level: 3, score: 60, passed: false, date: new Date(Date.now() - 86400000).toISOString() },
    ],
  });
});

demoTests.get('/certificate/:attemptId', (req, res) => {
  res.json({ id: req.params.attemptId, level: 2, score: 90, date: new Date().toISOString(), studentName: 'Demo Student', schoolName: 'LD Schools' });
});

module.exports = { demoAuth, demoScreening, demoPractice, demoTests, demoAnalytics };
