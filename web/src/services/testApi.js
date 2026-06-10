import api from './api';

// Demo test questions (embedded for offline use)
const DEMO_TEST_QUESTIONS = {
  1: [
    { id: 't1-1', question_text: 'Which of these is "d" (not "b")?', question_type: 'mcq', options: ['b', 'd', 'q', 'p'], correct_answer: 'd' },
    { id: 't1-2', question_text: 'Which letter is "p" (not "q")?', question_type: 'mcq', options: ['q', 'b', 'p', 'd'], correct_answer: 'p' },
    { id: 't1-3', question_text: 'What letter makes /m/ sound?', question_type: 'mcq', options: ['n', 'm', 'w', 'u'], correct_answer: 'm' },
    { id: 't1-4', question_text: 'Count: ⭐⭐⭐⭐⭐ How many?', question_type: 'mcq', options: ['4', '5', '6', '3'], correct_answer: '5' },
    { id: 't1-5', question_text: 'Which is "9" (not "6")?', question_type: 'mcq', options: ['6', '9', '0', '8'], correct_answer: '9' },
    { id: 't1-6', question_text: 'What comes after 7?', question_type: 'mcq', options: ['6', '9', '8', '5'], correct_answer: '8' },
    { id: 't1-7', question_text: 'Correct alphabetical order?', question_type: 'mcq', options: ['A, B, C', 'A, C, B', 'B, A, C', 'C, B, A'], correct_answer: 'A, B, C' },
    { id: 't1-8', question_text: 'Letter between B and D?', question_type: 'mcq', options: ['A', 'C', 'E', 'F'], correct_answer: 'C' },
    { id: 't1-9', question_text: 'Fingers on one hand?', question_type: 'mcq', options: ['4', '5', '6', '10'], correct_answer: '5' },
    { id: 't1-10', question_text: 'Which is UPPERCASE?', question_type: 'mcq', options: ['a', 'b', 'A', 'd'], correct_answer: 'A' },
  ],
  2: [
    { id: 't2-1', question_text: 'Which does NOT rhyme with "cat"?', question_type: 'mcq', options: ['bat', 'hat', 'dog', 'mat'], correct_answer: 'dog' },
    { id: 't2-2', question_text: 'Find the rhyming pair:', question_type: 'mcq', options: ['run - fun', 'run - dog', 'run - cat', 'run - big'], correct_answer: 'run - fun' },
    { id: 't2-3', question_text: 'Same sound as "ball"?', question_type: 'mcq', options: ['dog', 'bat', 'cat', 'fun'], correct_answer: 'bat' },
    { id: 't2-4', question_text: 'Biggest number?', question_type: 'mcq', options: ['15', '51', '12', '21'], correct_answer: '51' },
    { id: 't2-5', question_text: 'Smallest first: 8, 3, 5', question_type: 'mcq', options: ['3, 5, 8', '8, 5, 3', '5, 3, 8', '3, 8, 5'], correct_answer: '3, 5, 8' },
    { id: 't2-6', question_text: 'Next: 2, 4, 6, ___?', question_type: 'mcq', options: ['7', '8', '9', '10'], correct_answer: '8' },
    { id: 't2-7', question_text: 'Spelled correctly?', question_type: 'mcq', options: ['dgo', 'dog', 'god', 'odg'], correct_answer: 'dog' },
    { id: 't2-8', question_text: 'Spelled correctly?', question_type: 'mcq', options: ['brid', 'bird', 'brid', 'drbi'], correct_answer: 'bird' },
    { id: 't2-9', question_text: 'Missing: _un (bright in sky)?', question_type: 'mcq', options: ['s', 'r', 'f', 'b'], correct_answer: 's' },
    { id: 't2-10', question_text: 'Between 14 and 16?', question_type: 'mcq', options: ['13', '15', '17', '14'], correct_answer: '15' },
  ],
  3: [
    { id: 't3-1', question_text: 'Blend: /sh/ /i/ /p/ = ?', question_type: 'mcq', options: ['ship', 'shop', 'chip', 'sip'], correct_answer: 'ship' },
    { id: 't3-2', question_text: 'Blend: /tr/ /ee/ = ?', question_type: 'mcq', options: ['tree', 'three', 'free', 'true'], correct_answer: 'tree' },
    { id: 't3-3', question_text: '3 syllables?', question_type: 'mcq', options: ['cat', 'banana', 'dog', 'tree'], correct_answer: 'banana' },
    { id: 't3-4', question_text: '7 + 5 = ?', question_type: 'mcq', options: ['11', '12', '13', '10'], correct_answer: '12' },
    { id: 't3-5', question_text: '15 - 8 = ?', question_type: 'mcq', options: ['6', '7', '8', '9'], correct_answer: '7' },
    { id: 't3-6', question_text: '4 × 3 = ?', question_type: 'mcq', options: ['7', '10', '12', '14'], correct_answer: '12' },
    { id: 't3-7', question_text: 'Complete: el_ph_nt', question_type: 'mcq', options: ['e, a', 'a, e', 'i, a', 'e, e'], correct_answer: 'e, a' },
    { id: 't3-8', question_text: 'After Tuesday?', question_type: 'mcq', options: ['Monday', 'Wednesday', 'Thursday', 'Friday'], correct_answer: 'Wednesday' },
    { id: 't3-9', question_text: 'Unscramble "g-n-a-m-o" (fruit):', question_type: 'mcq', options: ['mango', 'mongo', 'gonma', 'namgo'], correct_answer: 'mango' },
    { id: 't3-10', question_text: '9 + 6 = ?', question_type: 'mcq', options: ['14', '15', '16', '13'], correct_answer: '15' },
  ],
  4: [
    { id: 't4-1', question_text: '"Priya ran to shop for milk." Why?', question_type: 'mcq', options: ['She was late', 'She needed milk', 'She was scared', 'Exercise'], correct_answer: 'She needed milk' },
    { id: 't4-2', question_text: 'Opposite of "ancient"?', question_type: 'mcq', options: ['old', 'modern', 'big', 'slow'], correct_answer: 'modern' },
    { id: 't4-3', question_text: 'Same as "happy"?', question_type: 'mcq', options: ['sad', 'joyful', 'angry', 'tired'], correct_answer: 'joyful' },
    { id: 't4-4', question_text: '₹50 - ₹15 - ₹20 = ?', question_type: 'mcq', options: ['₹10', '₹15', '₹20', '₹25'], correct_answer: '₹15' },
    { id: 't4-5', question_text: '9:30 AM + 2 hours = ?', question_type: 'mcq', options: ['10:30', '11:30 AM', '12:30', '11:00'], correct_answer: '11:30 AM' },
    { id: 't4-6', question_text: '5, 10, 15, 20, ___?', question_type: 'mcq', options: ['22', '24', '25', '30'], correct_answer: '25' },
    { id: 't4-7', question_text: 'Correct punctuation?', question_type: 'mcq', options: ['where are you going', 'Where are you going?', 'where are you going?', 'Where are you going'], correct_answer: 'Where are you going?' },
    { id: 't4-8', question_text: '"She ___ to school daily."', question_type: 'mcq', options: ['go', 'goes', 'going', 'gone'], correct_answer: 'goes' },
    { id: 't4-9', question_text: 'Unscramble "t-i-b-a-r-b" (animal):', question_type: 'mcq', options: ['rabbit', 'tibbar', 'ribbit', 'ratbit'], correct_answer: 'rabbit' },
    { id: 't4-10', question_text: '3 books = ₹45. 1 book = ?', question_type: 'mcq', options: ['₹12', '₹15', '₹18', '₹20'], correct_answer: '₹15' },
  ],
  5: [
    { id: 't5-1', question_text: '"Raining cats and dogs" means:', question_type: 'mcq', options: ['Animals falling', 'Raining very heavily', 'Cats outside', 'Storm coming'], correct_answer: 'Raining very heavily' },
    { id: 't5-2', question_text: '"Face lit up" means Meera felt:', question_type: 'mcq', options: ['Angry', 'Happy and excited', 'Scared', 'Confused'], correct_answer: 'Happy and excited' },
    { id: 't5-3', question_text: 'Main idea about tigers paragraph?', question_type: 'mcq', options: ['Deer live in forests', 'Tigers need protection', 'Forests are big', 'Hunting is bad'], correct_answer: 'Tigers need protection' },
    { id: 't5-4', question_text: '23 × 4 = ?', question_type: 'mcq', options: ['82', '92', '96', '88'], correct_answer: '92' },
    { id: 't5-5', question_text: '144 ÷ 12 = ?', question_type: 'mcq', options: ['10', '11', '12', '14'], correct_answer: '12' },
    { id: 't5-6', question_text: '¾ of 100 = ?', question_type: 'mcq', options: ['25', '50', '75', '80'], correct_answer: '75' },
    { id: 't5-7', question_text: 'Correct grammar?', question_type: 'mcq', options: ["He dont like", "He doesn't like mangoes", "He not like", "He no likes"], correct_answer: "He doesn't like mangoes" },
    { id: 't5-8', question_text: 'Best conclusion for festivals paragraph?', question_type: 'mcq', options: ['I like food', 'Festivals bring joy and togetherness', 'School is fun', 'Birds fly'], correct_answer: 'Festivals bring joy and togetherness' },
    { id: 't5-9', question_text: '8cm × 5cm area = ?', question_type: 'mcq', options: ['13 sq cm', '26 sq cm', '40 sq cm', '45 sq cm'], correct_answer: '40 sq cm' },
    { id: 't5-10', question_text: 'Adverb in "She sings beautifully"?', question_type: 'mcq', options: ['She', 'sings', 'beautifully', 'None'], correct_answer: 'beautifully' },
  ],
};

const TIME_LIMITS = { 1: 600, 2: 720, 3: 900, 4: 1080, 5: 1200 }; // seconds
let demoTestAnswers = [];
let demoTestSession = null;

const testApi = {
  /** Get available test for student */
  getAvailable: async () => {
    try {
      return await api.get('/tests/available').then(r => r.data);
    } catch {
      const level = 3; // demo: Level 3 test available
      return {
        level,
        questionsCount: 10,
        timeLimit: TIME_LIMITS[level],
        timeLimitLabel: `${TIME_LIMITS[level] / 60} minutes`,
        attemptsToday: 1,
        maxAttempts: 3,
        passThreshold: 80,
        isLocked: false,
      };
    }
  },

  /** Start a test */
  startTest: async (level) => {
    try {
      return await api.post('/tests/start', { level }).then(r => r.data);
    } catch {
      const questions = DEMO_TEST_QUESTIONS[level] || DEMO_TEST_QUESTIONS[1];
      demoTestAnswers = [];
      demoTestSession = { level, startedAt: Date.now() };
      return {
        attemptId: 'demo-test-' + Date.now(),
        level,
        questions,
        timeLimit: TIME_LIMITS[level],
        questionsCount: questions.length,
      };
    }
  },

  /** Submit answer during test */
  submitAnswer: async (attemptId, questionId, answer) => {
    try {
      return await api.post('/tests/submit-answer', { attemptId, questionId, answer }).then(r => r.data);
    } catch {
      const level = demoTestSession?.level || 1;
      const allQ = DEMO_TEST_QUESTIONS[level] || [];
      const q = allQ.find(q => q.id === questionId);
      const isCorrect = q ? String(answer).trim() === String(q.correct_answer).trim() : false;
      demoTestAnswers.push({ questionId, answer, isCorrect, correct_answer: q?.correct_answer, question_text: q?.question_text });
      return { received: true };
    }
  },

  /** Complete test and get result */
  completeTest: async (attemptId) => {
    try {
      return await api.post('/tests/complete', { attemptId }).then(r => r.data);
    } catch {
      const correct = demoTestAnswers.filter(a => a.isCorrect).length;
      const total = demoTestAnswers.length || 10;
      const score = Math.round((correct / total) * 100);
      const passed = score >= 80;
      const level = demoTestSession?.level || 1;

      return {
        attemptId,
        level,
        score,
        correct,
        total,
        passed,
        wrongAnswers: demoTestAnswers.filter(a => !a.isCorrect),
        certificate: passed ? { id: 'cert-' + Date.now(), level, score, date: new Date().toISOString(), studentName: 'Demo Student' } : null,
        message: passed ? `🎉 Congratulations! You passed Level ${level}!` : `Keep practicing — you need ${Math.ceil(total * 0.8)} correct answers to pass.`,
      };
    }
  },

  /** Get test history */
  getHistory: async () => {
    try {
      return await api.get('/tests/history').then(r => r.data);
    } catch {
      return {
        attempts: [
          { id: 'a1', level: 1, score: 90, passed: true, date: new Date(Date.now() - 7 * 86400000).toISOString() },
          { id: 'a2', level: 2, score: 80, passed: true, date: new Date(Date.now() - 3 * 86400000).toISOString() },
          { id: 'a3', level: 3, score: 60, passed: false, date: new Date(Date.now() - 86400000).toISOString() },
        ],
      };
    }
  },

  /** Get certificate for a passed test */
  getCertificate: async (attemptId) => {
    try {
      return await api.get(`/tests/certificate/${attemptId}`).then(r => r.data);
    } catch {
      return { id: attemptId, level: 2, score: 90, date: new Date().toISOString(), studentName: 'Demo Student', schoolName: 'LD Schools' };
    }
  },
};

export default testApi;
export { TIME_LIMITS };
