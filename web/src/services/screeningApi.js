import api from './api';
import FULL_QUESTIONS from '../data/screeningQuestions';

// ─── 5-Level Progressive Screening (100 questions) ──────────────────
// Full 100 questions embedded in frontend — works WITHOUT backend.
// If backend IS running, uses backend data (allows dynamic question updates).
// Pass ≥ 70% (14/20 correct) to advance. Fail → that's your LD level.

// ─── Session state ──────────────────────────────────────────────────
let demoAnswers = [];
const PASS_THRESHOLD = 0.70; // 14/20 correct to pass a level

// ─── Progressive evaluation ─────────────────────────────────────────
function evaluateProgressive(answers) {
  const levels = {};
  answers.forEach(a => {
    if (!levels[a.level]) levels[a.level] = [];
    levels[a.level].push(a);
  });

  let ldLevel = null;
  const levelResults = {};

  for (let lvl = 1; lvl <= 5; lvl++) {
    const lvlAnswers = levels[lvl] || [];
    if (lvlAnswers.length === 0) break;
    const correct = lvlAnswers.filter(a => a.isCorrect).length;
    const total = lvlAnswers.length;
    const score = correct / total;
    const passed = score >= PASS_THRESHOLD;
    levelResults[lvl] = { level: lvl, correct, total, score: Math.round(score * 100), passed };
    if (!passed && ldLevel === null) ldLevel = lvl;
  }

  // No LD detected — passed all levels
  if (ldLevel === null) {
    const totalCorrect = answers.filter(a => a.isCorrect).length;
    const riskScore = Math.max(0, 25 - Math.round((totalCorrect / answers.length) * 25));
    return {
      ldLevel: null,
      ldType: 'not_detected',
      riskScore,
      breakdown: { dyslexia: 0, dyscalculia: 0, dysgraphia: 0 },
      levelResults,
      recommendations: [
        'Excellent! You passed all 5 levels! 🎉',
        'No learning difficulties were detected.',
        'Continue challenging yourself at the highest level.',
      ],
    };
  }

  // Analyze errors at the failed level
  const failedAnswers = levels[ldLevel] || [];
  const catErrors = { dyslexia: { wrong: 0, total: 0 }, dyscalculia: { wrong: 0, total: 0 }, dysgraphia: { wrong: 0, total: 0 } };
  failedAnswers.forEach(a => {
    const target = a.ld_target || 'dyslexia';
    if (catErrors[target]) {
      catErrors[target].total++;
      if (!a.isCorrect) catErrors[target].wrong++;
    }
  });

  const breakdown = {};
  let maxScore = 0, maxType = 'dyslexia';
  Object.entries(catErrors).forEach(([type, data]) => {
    const errorRate = data.total > 0 ? Math.round((data.wrong / data.total) * 100) : 0;
    breakdown[type] = errorRate;
    if (errorRate > maxScore) { maxScore = errorRate; maxType = type; }
  });

  // Determine type
  const highCats = Object.entries(breakdown).filter(([_, v]) => v >= 50);
  let ldType = highCats.length >= 2 ? 'mixed' : maxScore >= 30 ? maxType : 'not_detected';

  // Risk score
  const levelRisk = Math.max(0, 120 - (ldLevel * 20));
  const riskScore = Math.min(100, Math.round((levelRisk + maxScore) / 2));

  // Recommendations
  const recs = [`You passed ${ldLevel - 1} levels and need to master Level ${ldLevel} to advance! 💪`];

  // Level-specific + LD-type-specific recommendations
  if (ldType === 'dyslexia' || ldType === 'mixed' || breakdown.dyslexia > 30) {
    const dyslexiaRecs = {
      1: ['Practice identifying letters b, d, p, q — use the "bed" trick (b-e-d makes a bed shape)', 'Trace letters daily with your finger in sand or on paper'],
      2: ['Practice rhyming words — find 5 words that rhyme with "cat", "dog", "run"', 'Read simple poems and clap the rhyming words'],
      3: ['Practice blending sounds — say /c/ /a/ /t/ slowly then fast to make "cat"', 'Use phonics flashcards daily for 10 minutes'],
      4: ['Read short stories (3-4 sentences) and answer "who, what, where" questions', 'Practice finding opposites and similar words'],
      5: ['Read paragraphs and identify the main idea', 'Practice understanding idioms and figurative language', 'Read 1 short story daily and summarize it in your own words'],
    };
    (dyslexiaRecs[ldLevel] || []).forEach(r => recs.push('📖 ' + r));
  }

  if (ldType === 'dyscalculia' || ldType === 'mixed' || breakdown.dyscalculia > 30) {
    const dyscalculiaRecs = {
      1: ['Practice counting real objects (fruits, toys, steps)', 'Play number matching games — match digit "6" with six dots'],
      2: ['Compare numbers using objects — "which group has more?"', 'Practice number sequences: count forward and backward from any number'],
      3: ['Use fingers or objects for addition/subtraction (5 + 3 = count 5, then 3 more)', 'Practice number bonds (pairs that make 10: 3+7, 4+6, 5+5)'],
      4: ['Draw pictures to solve word problems', 'Practice skip counting (2, 4, 6... and 5, 10, 15...)', 'Use real money (₹1, ₹2, ₹5 coins) to practice addition'],
      5: ['Break big additions into parts: 15+27 = 15+20+7 = 42', 'Practice with real-life problems: shopping, time, measurement', 'Learn multiplication tables for 2, 3, 5, 10 using songs'],
    };
    (dyscalculiaRecs[ldLevel] || []).forEach(r => recs.push('🔢 ' + r));
  }

  if (ldType === 'dysgraphia' || ldType === 'mixed' || breakdown.dysgraphia > 30) {
    const dysgraphiaRecs = {
      1: ['Trace letters in the air, then on paper — start with straight lines, then curves', 'Practice writing your name 5 times daily'],
      2: ['Spell 3-letter words (cat, dog, sun) by saying each letter sound', 'Put alphabet cards in order as a daily game'],
      3: ['Practice filling in missing letters: c_t, d_g, s_n', 'Learn the days of the week and months in order — sing them!'],
      4: ['Unscramble simple words daily (3-4 letters first, then 5)', 'Read sentences and find the mistakes (missing capitals, wrong spelling)'],
      5: ['Write 2-3 sentences about your day every evening', 'Practice using correct grammar: "is/are", "was/were", "has/have"', 'Build sentences using word cards arranged in order'],
    };
    (dysgraphiaRecs[ldLevel] || []).forEach(r => recs.push('✍️ ' + r));
  }

  recs.push('Practice 15 minutes daily to crack Level ' + ldLevel + '!');
  recs.push('Re-screen in 3 months to check if you can pass Level ' + ldLevel + '!');

  return { ldLevel, ldType, riskScore, breakdown, levelResults, recommendations: recs };
}

// ─── API with full fallback ─────────────────────────────────────────
const screeningApi = {
  /** Get all 100 screening questions (from backend or local fallback) */
  getQuestions: async () => {
    try {
      const data = await api.get('/screening/questions').then(r => r.data);
      if (data?.questions?.length >= 20) return data;
      throw new Error('insufficient');
    } catch {
      console.log('[screeningApi] Using local 100-question bank (backend unavailable)');
      return {
        questions: FULL_QUESTIONS,
        total: FULL_QUESTIONS.length,
        estimatedMinutes: 15,
        progressive: true,
        levels: 5,
        questionsPerLevel: 20,
      };
    }
  },

  /** Start a new screening session */
  startSession: async () => {
    try {
      return await api.post('/screening/start').then(r => r.data);
    } catch {
      demoAnswers = [];
      return { sessionId: 'demo-' + Date.now(), resumed: false, message: 'Session started (offline mode)' };
    }
  },

  /** Submit an answer */
  submitAnswer: async (sessionId, questionId, answer, timeSpentMs) => {
    try {
      return await api.post('/screening/answer', { sessionId, questionId, answer, timeSpentMs }).then(r => r.data);
    } catch {
      const q = FULL_QUESTIONS.find(q => q.id === questionId);
      const isCorrect = q ? answer === q.correct_answer : false;
      demoAnswers.push({ questionId, answer, isCorrect, category: q?.category, level: q?.level, ld_target: q?.ld_target });
      return { isCorrect, questionId, level: q?.level };
    }
  },

  /** Complete session and get classification */
  completeSession: async (sessionId) => {
    try {
      return await api.post('/screening/complete', { sessionId }).then(r => r.data);
    } catch {
      return evaluateProgressive(demoAnswers);
    }
  },

  /** Get result for a specific session */
  getResult: async (sessionId) => {
    try {
      return await api.get(`/screening/result/${sessionId}`).then(r => r.data);
    } catch {
      return evaluateProgressive(demoAnswers);
    }
  },

  /** Get screening history */
  getHistory: async () => {
    try {
      return await api.get('/screening/history').then(r => r.data);
    } catch {
      return { sessions: [] };
    }
  },
};

export default screeningApi;
