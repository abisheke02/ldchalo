import api from './api';

// ─── Demo exercise pool (used when backend unavailable) ─────────────
const EXERCISE_POOL = [
  // Dyslexia
  { id: 'p1', type: 'letter_recognition', level: 1, title: 'Letter b or d?', instructions: 'Which letter is shown here?', content: { target: 'b', choices: ['b', 'd', 'p', 'q'] }, ld_target: 'dyslexia' },
  { id: 'p2', type: 'letter_recognition', level: 1, title: 'Find letter p', instructions: 'Point to the letter p', content: { target: 'p', choices: ['b', 'd', 'p', 'q'] }, ld_target: 'dyslexia' },
  { id: 'p3', type: 'phonics', level: 1, title: 'Sound /b/', instructions: 'Which letter makes the /b/ sound?', content: { target: 'b', choices: ['b', 'd', 'g', 'p'] }, ld_target: 'dyslexia' },
  { id: 'p4', type: 'phonics', level: 2, title: 'Sound /sh/', instructions: 'Which letters make the /sh/ sound?', content: { target: 'sh', choices: ['sh', 'ch', 'th', 'ph'] }, ld_target: 'dyslexia' },
  { id: 'p5', type: 'rhyme_detection', level: 2, title: 'Rhyme with "cat"', instructions: 'Which word rhymes with "cat"?', content: { target: 'bat', choices: ['bat', 'dog', 'pen', 'cup'] }, ld_target: 'dyslexia' },
  { id: 'p6', type: 'rhyme_detection', level: 2, title: 'Rhyme with "sun"', instructions: 'Which word rhymes with "sun"?', content: { target: 'fun', choices: ['fan', 'fun', 'fin', 'run'] }, ld_target: 'dyslexia' },
  { id: 'p7', type: 'phoneme_blending', level: 3, title: 'Blend /d/ /o/ /g/', instructions: 'What word do these sounds make: /d/ /o/ /g/?', content: { target: 'dog', choices: ['dog', 'dig', 'dug', 'fog'] }, ld_target: 'dyslexia' },
  { id: 'p8', type: 'phoneme_blending', level: 3, title: 'Blend /s/ /i/ /t/', instructions: 'Blend these sounds: /s/ /i/ /t/', content: { target: 'sit', choices: ['sit', 'set', 'sat', 'sip'] }, ld_target: 'dyslexia' },
  { id: 'p9', type: 'word_building', level: 3, title: 'Missing letter: _at', instructions: 'Fill in: _at (a furry pet)', content: { target: 'c', choices: ['c', 'b', 'h', 'r'] }, ld_target: 'dyslexia' },
  { id: 'p10', type: 'reading', level: 4, title: 'Read & answer', instructions: '"Ravi has a red ball." What colour is the ball?', content: { target: 'red', choices: ['blue', 'red', 'green', 'yellow'] }, ld_target: 'dyslexia' },
  // Dyscalculia
  { id: 'p11', type: 'counting', level: 1, title: 'Count stars', instructions: 'Count: ⭐⭐⭐⭐', content: { target: '4', choices: ['3', '4', '5', '6'] }, ld_target: 'dyscalculia' },
  { id: 'p12', type: 'number_sense', level: 1, title: 'Which is 6?', instructions: 'Which number is 6?', content: { target: '6', choices: ['6', '9', '8', '0'] }, ld_target: 'dyscalculia' },
  { id: 'p13', type: 'number_sense', level: 2, title: 'Bigger number', instructions: 'Which is bigger: 7 or 4?', content: { target: '7', choices: ['7', '4', 'Same', "Don't know"] }, ld_target: 'dyscalculia' },
  { id: 'p14', type: 'counting', level: 2, title: 'After 8?', instructions: 'What comes after 8?', content: { target: '9', choices: ['7', '8', '9', '10'] }, ld_target: 'dyscalculia' },
  { id: 'p15', type: 'arithmetic', level: 3, title: '4 + 5', instructions: 'What is 4 + 5?', content: { target: '9', choices: ['7', '8', '9', '10'] }, ld_target: 'dyscalculia' },
  { id: 'p16', type: 'arithmetic', level: 3, title: '8 - 3', instructions: 'What is 8 - 3?', content: { target: '5', choices: ['4', '5', '6', '11'] }, ld_target: 'dyscalculia' },
  { id: 'p17', type: 'arithmetic', level: 4, title: 'Word problem', instructions: 'Priya has 12 mangoes. She ate 4. How many left?', content: { target: '8', choices: ['6', '7', '8', '16'] }, ld_target: 'dyscalculia' },
  { id: 'p18', type: 'patterns', level: 4, title: 'Pattern: 3,6,9...', instructions: 'What comes next: 3, 6, 9, ___?', content: { target: '12', choices: ['10', '11', '12', '15'] }, ld_target: 'dyscalculia' },
  // Dysgraphia
  { id: 'p19', type: 'sequencing', level: 1, title: 'After A?', instructions: 'Which letter comes after A?', content: { target: 'B', choices: ['B', 'C', 'D', 'A'] }, ld_target: 'dysgraphia' },
  { id: 'p20', type: 'sequencing', level: 2, title: 'Order ABC', instructions: 'Put in correct order: C, A, B', content: { target: 'A, B, C', choices: ['A, B, C', 'C, A, B', 'B, C, A', 'A, C, B'] }, ld_target: 'dysgraphia' },
  { id: 'p21', type: 'writing', level: 2, title: 'Correct spelling', instructions: 'Which is spelled correctly?', content: { target: 'dog', choices: ['dog', 'dgo', 'odg', 'gdo'] }, ld_target: 'dysgraphia' },
  { id: 'p22', type: 'writing', level: 3, title: 'Fill in: h_t', instructions: 'Complete: h_t (wear on head)', content: { target: 'a', choices: ['a', 'o', 'i', 'u'] }, ld_target: 'dysgraphia' },
  { id: 'p23', type: 'sequencing', level: 3, title: 'After Monday?', instructions: 'Which day comes after Monday?', content: { target: 'Tuesday', choices: ['Sunday', 'Tuesday', 'Wednesday', 'Saturday'] }, ld_target: 'dysgraphia' },
  { id: 'p24', type: 'writing', level: 4, title: 'Unscramble: t-a-c', instructions: 'Unscramble: t-a-c', content: { target: 'cat', choices: ['cat', 'act', 'tac', 'cta'] }, ld_target: 'dysgraphia' },
  { id: 'p25', type: 'writing', level: 5, title: 'Grammar fill', instructions: '"The children ___ playing."', content: { target: 'are', choices: ['is', 'are', 'was', 'am'] }, ld_target: 'dysgraphia' },
  { id: 'p26', type: 'arithmetic', level: 5, title: '23 + 19', instructions: 'What is 23 + 19?', content: { target: '42', choices: ['32', '42', '41', '52'] }, ld_target: 'dyscalculia' },
  { id: 'p27', type: 'reading', level: 4, title: 'Opposite of "big"', instructions: 'What is the opposite of "big"?', content: { target: 'small', choices: ['tall', 'small', 'wide', 'large'] }, ld_target: 'dyslexia' },
  { id: 'p28', type: 'reading', level: 5, title: 'Odd one out', instructions: 'Which does NOT belong: cat, bat, hat, dog?', content: { target: 'dog', choices: ['cat', 'bat', 'hat', 'dog'] }, ld_target: 'dyslexia' },
  { id: 'p29', type: 'arithmetic', level: 3, title: '6 + 7', instructions: 'What is 6 + 7?', content: { target: '13', choices: ['11', '12', '13', '14'] }, ld_target: 'dyscalculia' },
  { id: 'p30', type: 'arithmetic', level: 5, title: 'Money problem', instructions: 'Pen ₹15 + Book ₹25 = ?', content: { target: '₹40', choices: ['₹30', '₹35', '₹40', '₹45'] }, ld_target: 'dyscalculia' },
];

// Pick 20 exercises based on LD type (AI recommendation simulation)
function selectExercises(ldType = 'mixed', level = 2) {
  let pool = [...EXERCISE_POOL];
  
  // Prioritize by LD type
  if (ldType === 'dyslexia') pool.sort((a, b) => (a.ld_target === 'dyslexia' ? -1 : 1));
  else if (ldType === 'dyscalculia') pool.sort((a, b) => (a.ld_target === 'dyscalculia' ? -1 : 1));
  else if (ldType === 'dysgraphia') pool.sort((a, b) => (a.ld_target === 'dysgraphia' ? -1 : 1));
  else pool.sort(() => Math.random() - 0.5); // mixed/not detected = shuffle

  // Prioritize current level
  const atLevel = pool.filter(e => e.level === level);
  const below = pool.filter(e => e.level < level);
  const above = pool.filter(e => e.level > level);

  const selected = [
    ...atLevel.slice(0, 8),      // 40% current level
    ...below.slice(0, 6),        // 30% review
    ...above.slice(0, 2),        // 10% challenge
    ...pool.slice(0, 4),         // 20% fill
  ];

  // Deduplicate and limit to 20
  const seen = new Set();
  const final = [];
  for (const ex of selected) {
    if (!seen.has(ex.id) && final.length < 20) {
      seen.add(ex.id);
      final.push(ex);
    }
  }
  // Fill remaining
  for (const ex of pool) {
    if (!seen.has(ex.id) && final.length < 20) {
      seen.add(ex.id);
      final.push(ex);
    }
  }
  return final.slice(0, 20);
}

// AI feedback messages
const AI_FEEDBACKS = [
  { feedback_text: "Almost! Remember, 'b' has its belly on the RIGHT side. Think: bat hits a ball → bat faces right!", memory_hook: "b = belly right" },
  { feedback_text: "Good try! 6 has a tail going DOWN like a slide, 9 has a tail going UP like a balloon.", memory_hook: "6 slides down, 9 floats up" },
  { feedback_text: "Let's try again! Sound out each letter slowly: d-o-g. Say it, then pick the word.", memory_hook: "Sound it out: d-o-g" },
  { feedback_text: "Close! For addition, use your fingers. Start with the bigger number and count up.", memory_hook: "Start big, count up" },
  { feedback_text: "Nice effort! Words that END the same way rhyme. Cat, bat, hat → all end in '-at'.", memory_hook: "Same ending = rhyme" },
  { feedback_text: "Almost there! For subtraction, count backwards. 8... 7, 6, 5. You took away 3!", memory_hook: "Count backwards to subtract" },
  { feedback_text: "Think about it! 'Opposite' means the reverse. Big ↔ Small, Hot ↔ Cold, Happy ↔ Sad.", memory_hook: "Opposite = flip it around" },
];

let demoSessionAnswers = [];

// ─── Practice API with demo fallback ────────────────────────────────
const practiceApi = {
  /** Start a new adaptive practice session — AI selects 20 exercises */
  startSession: async (ldType, level) => {
    try {
      const data = await api.get(`/practice/start?ldType=${ldType || 'mixed'}&level=${level || 2}`).then(r => r.data);
      if (data?.exercises?.length >= 10) return data;
      throw new Error('insufficient');
    } catch {
      console.log('[practiceApi] Using local exercise bank (20 AI-recommended exercises)');
      demoSessionAnswers = [];
      const exercises = selectExercises(ldType || 'mixed', level || 2);
      return {
        sessionId: 'demo-practice-' + Date.now(),
        exercises,
        totalExercises: exercises.length,
        currentLevel: level || 2,
        estimatedMinutes: 15,
        aiRecommended: true,
        message: `AI selected 20 exercises for your learning needs`,
      };
    }
  },

  /** Submit answer for current exercise */
  submitAnswer: async (sessionId, exerciseId, answer, timeSpentMs) => {
    try {
      return await api.post('/practice/answer', { sessionId, exerciseId, answer, timeSpentMs }).then(r => r.data);
    } catch {
      // Demo: check answer against exercise target
      const exercise = EXERCISE_POOL.find(e => e.id === exerciseId);
      const isCorrect = exercise ? String(answer).trim() === String(exercise.content.target).trim() : false;
      demoSessionAnswers.push({ exerciseId, answer, isCorrect });
      const streak = isCorrect ? demoSessionAnswers.filter(a => a.isCorrect).length : 0;

      return {
        isCorrect,
        streak,
        feedback: isCorrect ? null : AI_FEEDBACKS[Math.floor(Math.random() * AI_FEEDBACKS.length)],
        levelChange: null,
      };
    }
  },

  /** Complete / end a practice session */
  completeSession: async (sessionId) => {
    try {
      return await api.post('/practice/complete', { sessionId }).then(r => r.data);
    } catch {
      const correct = demoSessionAnswers.filter(a => a.isCorrect).length;
      return {
        score: Math.round((correct / Math.max(1, demoSessionAnswers.length)) * 100),
        totalExercises: demoSessionAnswers.length,
        correctAnswers: correct,
        streak: 1,
        levelChanged: false,
        newMastery: 45 + correct * 2,
      };
    }
  },

  /** Get student's overall progress */
  getProgress: async () => {
    try { return await api.get('/practice/progress').then(r => r.data); }
    catch {
      return { level: 2, streak: 3, accuracy: 72, mastery: 45, totalSessions: 8,
        categoryMastery: { letter_recognition: 65, phonics: 48, number_sense: 72, sequencing: 55, word_building: 38 } };
    }
  },

  /** Get past practice sessions */
  getHistory: async () => {
    try { return await api.get('/practice/history').then(r => r.data); }
    catch {
      return { sessions: [
        { id: '1', date: new Date(Date.now() - 3600000).toISOString(), score: 85, duration: '14 min', exercisesCompleted: 20 },
        { id: '2', date: new Date(Date.now() - 86400000).toISOString(), score: 72, duration: '12 min', exercisesCompleted: 20 },
      ]};
    }
  },

  /** Get daily streak info */
  getStreak: async () => {
    try { return await api.get('/practice/streak').then(r => r.data); }
    catch { return { currentStreak: 3, longestStreak: 7, lastSevenDays: [true, true, true, false, true, true, false] }; }
  },

  /** Get next adaptive exercise */
  getNextExercise: async (sessionId) => {
    try { return await api.get(`/practice/next-exercise?sessionId=${sessionId}`).then(r => r.data); }
    catch { return EXERCISE_POOL[Math.floor(Math.random() * EXERCISE_POOL.length)]; }
  },
};

export default practiceApi;
