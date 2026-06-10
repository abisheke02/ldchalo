/**
 * Progressive Test Questions — 50 questions, 10 per level
 * These test MASTERY (harder than practice/screening)
 * Students must score ≥ 80% (8/10) to pass and advance.
 */

const testQuestions = [
  // ═══════════════════════════════════════════════════════════════
  // LEVEL 1 — Mastery: Letters, Numbers, Alphabet (10 questions)
  // ═══════════════════════════════════════════════════════════════
  { question_text: 'Which of these is the letter "d" (not "b")?', question_type: 'mcq', category: 'letter_recognition', ld_target: 'dyslexia', level: 1, options: ['b', 'd', 'q', 'p'], correct_answer: 'd', order_index: 1 },
  { question_text: 'Which letter is "p" (not "q")?', question_type: 'mcq', category: 'letter_recognition', ld_target: 'dyslexia', level: 1, options: ['q', 'b', 'p', 'd'], correct_answer: 'p', order_index: 2 },
  { question_text: 'What letter makes the sound /m/?', question_type: 'mcq', category: 'phonics', ld_target: 'dyslexia', level: 1, options: ['n', 'm', 'w', 'u'], correct_answer: 'm', order_index: 3 },
  { question_text: 'Count: ⭐⭐⭐⭐⭐ How many stars?', question_type: 'mcq', category: 'counting', ld_target: 'dyscalculia', level: 1, options: ['4', '5', '6', '3'], correct_answer: '5', order_index: 4 },
  { question_text: 'Which number is "9" (not "6")?', question_type: 'mcq', category: 'number_sense', ld_target: 'dyscalculia', level: 1, options: ['6', '9', '0', '8'], correct_answer: '9', order_index: 5 },
  { question_text: 'What number comes after 7?', question_type: 'mcq', category: 'counting', ld_target: 'dyscalculia', level: 1, options: ['6', '9', '8', '5'], correct_answer: '8', order_index: 6 },
  { question_text: 'Which is correct alphabetical order?', question_type: 'mcq', category: 'sequencing', ld_target: 'dysgraphia', level: 1, options: ['A, B, C', 'A, C, B', 'B, A, C', 'C, B, A'], correct_answer: 'A, B, C', order_index: 7 },
  { question_text: 'What letter comes between "B" and "D"?', question_type: 'mcq', category: 'sequencing', ld_target: 'dysgraphia', level: 1, options: ['A', 'C', 'E', 'F'], correct_answer: 'C', order_index: 8 },
  { question_text: 'How many fingers on one hand?', question_type: 'mcq', category: 'counting', ld_target: 'dyscalculia', level: 1, options: ['4', '5', '6', '10'], correct_answer: '5', order_index: 9 },
  { question_text: 'Which is the UPPERCASE letter?', question_type: 'mcq', category: 'letter_recognition', ld_target: 'dyslexia', level: 1, options: ['a', 'b', 'A', 'd'], correct_answer: 'A', order_index: 10 },

  // ═══════════════════════════════════════════════════════════════
  // LEVEL 2 — Mastery: Rhyming, Number Compare, Spelling (10)
  // ═══════════════════════════════════════════════════════════════
  { question_text: 'Which word does NOT rhyme with "cat"?', question_type: 'mcq', category: 'rhyme_detection', ld_target: 'dyslexia', level: 2, options: ['bat', 'hat', 'dog', 'mat'], correct_answer: 'dog', order_index: 11 },
  { question_text: 'Find the rhyming pair:', question_type: 'mcq', category: 'rhyme_detection', ld_target: 'dyslexia', level: 2, options: ['run - fun', 'run - dog', 'run - cat', 'run - big'], correct_answer: 'run - fun', order_index: 12 },
  { question_text: 'Which word starts with the same sound as "ball"?', question_type: 'mcq', category: 'phonics', ld_target: 'dyslexia', level: 2, options: ['dog', 'bat', 'cat', 'fun'], correct_answer: 'bat', order_index: 13 },
  { question_text: 'Which is the biggest number?', question_type: 'mcq', category: 'number_sense', ld_target: 'dyscalculia', level: 2, options: ['15', '51', '12', '21'], correct_answer: '51', order_index: 14 },
  { question_text: 'Put in order (smallest first): 8, 3, 5', question_type: 'mcq', category: 'number_sense', ld_target: 'dyscalculia', level: 2, options: ['3, 5, 8', '8, 5, 3', '5, 3, 8', '3, 8, 5'], correct_answer: '3, 5, 8', order_index: 15 },
  { question_text: 'What comes next: 2, 4, 6, ___?', question_type: 'mcq', category: 'patterns', ld_target: 'dyscalculia', level: 2, options: ['7', '8', '9', '10'], correct_answer: '8', order_index: 16 },
  { question_text: 'Which is spelled correctly?', question_type: 'mcq', category: 'writing', ld_target: 'dysgraphia', level: 2, options: ['dgo', 'dog', 'god', 'odg'], correct_answer: 'dog', order_index: 17 },
  { question_text: 'Which is spelled correctly?', question_type: 'mcq', category: 'writing', ld_target: 'dysgraphia', level: 2, options: ['brid', 'bird', 'brid', 'drbi'], correct_answer: 'bird', order_index: 18 },
  { question_text: 'What letter is missing: _un (something bright in the sky)?', question_type: 'mcq', category: 'writing', ld_target: 'dysgraphia', level: 2, options: ['s', 'r', 'f', 'b'], correct_answer: 's', order_index: 19 },
  { question_text: 'Which number comes between 14 and 16?', question_type: 'mcq', category: 'number_sense', ld_target: 'dyscalculia', level: 2, options: ['13', '15', '17', '14'], correct_answer: '15', order_index: 20 },

  // ═══════════════════════════════════════════════════════════════
  // LEVEL 3 — Mastery: Blending, Arithmetic, Words (10)
  // ═══════════════════════════════════════════════════════════════
  { question_text: 'Blend: /sh/ /i/ /p/ = ?', question_type: 'mcq', category: 'phoneme_blending', ld_target: 'dyslexia', level: 3, options: ['ship', 'shop', 'chip', 'sip'], correct_answer: 'ship', order_index: 21 },
  { question_text: 'Blend: /tr/ /ee/ = ?', question_type: 'mcq', category: 'phoneme_blending', ld_target: 'dyslexia', level: 3, options: ['tree', 'three', 'free', 'true'], correct_answer: 'tree', order_index: 22 },
  { question_text: 'Which word has 3 syllables?', question_type: 'mcq', category: 'reading', ld_target: 'dyslexia', level: 3, options: ['cat', 'banana', 'dog', 'tree'], correct_answer: 'banana', order_index: 23 },
  { question_text: '7 + 5 = ?', question_type: 'mcq', category: 'arithmetic', ld_target: 'dyscalculia', level: 3, options: ['11', '12', '13', '10'], correct_answer: '12', order_index: 24 },
  { question_text: '15 - 8 = ?', question_type: 'mcq', category: 'arithmetic', ld_target: 'dyscalculia', level: 3, options: ['6', '7', '8', '9'], correct_answer: '7', order_index: 25 },
  { question_text: '4 × 3 = ?', question_type: 'mcq', category: 'arithmetic', ld_target: 'dyscalculia', level: 3, options: ['7', '10', '12', '14'], correct_answer: '12', order_index: 26 },
  { question_text: 'Complete: el_ph_nt', question_type: 'mcq', category: 'writing', ld_target: 'dysgraphia', level: 3, options: ['e, a', 'a, e', 'i, a', 'e, e'], correct_answer: 'e, a', order_index: 27 },
  { question_text: 'Which day comes after Tuesday?', question_type: 'mcq', category: 'sequencing', ld_target: 'dysgraphia', level: 3, options: ['Monday', 'Wednesday', 'Thursday', 'Friday'], correct_answer: 'Wednesday', order_index: 28 },
  { question_text: 'Rearrange to spell a fruit: "g-n-a-m-o"', question_type: 'mcq', category: 'writing', ld_target: 'dysgraphia', level: 3, options: ['mango', 'mongo', 'gonma', 'namgo'], correct_answer: 'mango', order_index: 29 },
  { question_text: '9 + 6 = ?', question_type: 'mcq', category: 'arithmetic', ld_target: 'dyscalculia', level: 3, options: ['14', '15', '16', '13'], correct_answer: '15', order_index: 30 },

  // ═══════════════════════════════════════════════════════════════
  // LEVEL 4 — Mastery: Comprehension, Word Problems, Grammar (10)
  // ═══════════════════════════════════════════════════════════════
  { question_text: '"Priya ran to the shop because she needed milk." Why did Priya run?', question_type: 'mcq', category: 'reading', ld_target: 'dyslexia', level: 4, options: ['She was late', 'She needed milk', 'She was scared', 'For exercise'], correct_answer: 'She needed milk', order_index: 31 },
  { question_text: 'What is the opposite of "ancient"?', question_type: 'mcq', category: 'reading', ld_target: 'dyslexia', level: 4, options: ['old', 'modern', 'big', 'slow'], correct_answer: 'modern', order_index: 32 },
  { question_text: 'Which word means the same as "happy"?', question_type: 'mcq', category: 'reading', ld_target: 'dyslexia', level: 4, options: ['sad', 'joyful', 'angry', 'tired'], correct_answer: 'joyful', order_index: 33 },
  { question_text: 'Amit had ₹50. He bought a pen for ₹15 and a book for ₹20. How much is left?', question_type: 'mcq', category: 'arithmetic', ld_target: 'dyscalculia', level: 4, options: ['₹10', '₹15', '₹20', '₹25'], correct_answer: '₹15', order_index: 34 },
  { question_text: 'A train leaves at 9:30 AM and takes 2 hours. When does it arrive?', question_type: 'mcq', category: 'arithmetic', ld_target: 'dyscalculia', level: 4, options: ['10:30 AM', '11:30 AM', '12:30 PM', '11:00 AM'], correct_answer: '11:30 AM', order_index: 35 },
  { question_text: 'Pattern: 5, 10, 15, 20, ___?', question_type: 'mcq', category: 'patterns', ld_target: 'dyscalculia', level: 4, options: ['22', '24', '25', '30'], correct_answer: '25', order_index: 36 },
  { question_text: 'Which sentence has correct punctuation?', question_type: 'mcq', category: 'writing', ld_target: 'dysgraphia', level: 4, options: ['where are you going', 'Where are you going?', 'where are you going?', 'Where are you going'], correct_answer: 'Where are you going?', order_index: 37 },
  { question_text: 'Choose the correct word: "She ___ to school every day."', question_type: 'mcq', category: 'writing', ld_target: 'dysgraphia', level: 4, options: ['go', 'goes', 'going', 'gone'], correct_answer: 'goes', order_index: 38 },
  { question_text: 'Unscramble: "t-i-b-a-r-b" (a small animal)', question_type: 'mcq', category: 'writing', ld_target: 'dysgraphia', level: 4, options: ['rabbit', 'tibbar', 'ribbit', 'ratbit'], correct_answer: 'rabbit', order_index: 39 },
  { question_text: 'If 3 books cost ₹45, how much does 1 book cost?', question_type: 'mcq', category: 'arithmetic', ld_target: 'dyscalculia', level: 4, options: ['₹12', '₹15', '₹18', '₹20'], correct_answer: '₹15', order_index: 40 },

  // ═══════════════════════════════════════════════════════════════
  // LEVEL 5 — Mastery: Inference, Complex Math, Advanced Writing (10)
  // ═══════════════════════════════════════════════════════════════
  { question_text: '"It was raining cats and dogs." This means:', question_type: 'mcq', category: 'reading', ld_target: 'dyslexia', level: 5, options: ['Animals were falling', 'It was raining very heavily', 'Cats and dogs were outside', 'A storm was coming'], correct_answer: 'It was raining very heavily', order_index: 41 },
  { question_text: '"Meera\'s face lit up when she saw the gift." How did Meera feel?', question_type: 'mcq', category: 'reading', ld_target: 'dyslexia', level: 5, options: ['Angry', 'Happy and excited', 'Scared', 'Confused'], correct_answer: 'Happy and excited', order_index: 42 },
  { question_text: 'What is the main idea: "Tigers live in forests. They hunt deer. Tigers are endangered."', question_type: 'mcq', category: 'reading', ld_target: 'dyslexia', level: 5, options: ['Deer live in forests', 'Tigers are wild animals that need protection', 'Forests are big', 'Hunting is bad'], correct_answer: 'Tigers are wild animals that need protection', order_index: 43 },
  { question_text: '23 × 4 = ?', question_type: 'mcq', category: 'arithmetic', ld_target: 'dyscalculia', level: 5, options: ['82', '92', '96', '88'], correct_answer: '92', order_index: 44 },
  { question_text: '144 ÷ 12 = ?', question_type: 'mcq', category: 'arithmetic', ld_target: 'dyscalculia', level: 5, options: ['10', '11', '12', '14'], correct_answer: '12', order_index: 45 },
  { question_text: 'What is ¾ of 100?', question_type: 'mcq', category: 'arithmetic', ld_target: 'dyscalculia', level: 5, options: ['25', '50', '75', '80'], correct_answer: '75', order_index: 46 },
  { question_text: 'Which sentence is grammatically correct?', question_type: 'mcq', category: 'writing', ld_target: 'dysgraphia', level: 5, options: ['He dont like mangoes', 'He doesn\'t like mangoes', 'He not like mangoes', 'He no likes mangoes'], correct_answer: "He doesn't like mangoes", order_index: 47 },
  { question_text: 'Choose the best concluding sentence: "India has many festivals. Diwali is the festival of lights. Holi celebrates colors. ___"', question_type: 'mcq', category: 'writing', ld_target: 'dysgraphia', level: 5, options: ['I like food.', 'These festivals bring joy and togetherness.', 'School is fun.', 'Birds can fly.'], correct_answer: 'These festivals bring joy and togetherness.', order_index: 48 },
  { question_text: 'A rectangle is 8 cm long and 5 cm wide. What is its area?', question_type: 'mcq', category: 'arithmetic', ld_target: 'dyscalculia', level: 5, options: ['13 sq cm', '26 sq cm', '40 sq cm', '45 sq cm'], correct_answer: '40 sq cm', order_index: 49 },
  { question_text: 'Which word is an adverb in: "She sings beautifully"?', question_type: 'mcq', category: 'writing', ld_target: 'dysgraphia', level: 5, options: ['She', 'sings', 'beautifully', 'None'], correct_answer: 'beautifully', order_index: 50 },
];

module.exports = testQuestions;
