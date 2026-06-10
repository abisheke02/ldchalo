/**
 * Exercise Bank — 108 exercises across all LD types and levels
 *
 * Structure per exercise:
 * { type, level, title, instructions, content: { target, choices, hints, visual_aid }, ld_types: [] }
 *
 * Types:
 *   Dyslexia: letter_recognition, phonics, word_building, reading
 *   Dyscalculia: number_sense, counting, arithmetic, patterns
 *   Dysgraphia: tracing, sequencing, writing
 *
 * Levels 1-5:
 *   1 = Basic recognition (single letter/number)
 *   2 = Simple matching/pairing
 *   3 = Short words/sequences
 *   4 = Sentences/multi-step
 *   5 = Complex patterns
 */

const exerciseBank = [
  // ═══════════════════════════════════════════════════════════════════
  // DYSLEXIA EXERCISES
  // ═══════════════════════════════════════════════════════════════════

  // ─── Letter Recognition (Levels 1-3) ────────────────────────────
  { type: 'letter_recognition', level: 1, title: 'Find the letter b', instructions: 'Which one is the letter "b"?', content: { target: 'b', choices: ['b', 'd', 'p', 'q'], hints: ['b has its belly on the right side'], visual_aid: 'letter_b_highlight' }, ld_types: ['dyslexia', 'mixed'] },
  { type: 'letter_recognition', level: 1, title: 'Find the letter d', instructions: 'Which one is the letter "d"?', content: { target: 'd', choices: ['b', 'd', 'p', 'q'], hints: ['d has its belly on the left side'], visual_aid: 'letter_d_highlight' }, ld_types: ['dyslexia', 'mixed'] },
  { type: 'letter_recognition', level: 1, title: 'Find the letter p', instructions: 'Which one is the letter "p"?', content: { target: 'p', choices: ['b', 'd', 'p', 'q'], hints: ['p hangs down below the line'] }, ld_types: ['dyslexia', 'mixed'] },
  { type: 'letter_recognition', level: 1, title: 'Find the letter q', instructions: 'Which one is the letter "q"?', content: { target: 'q', choices: ['b', 'd', 'p', 'q'], hints: ['q looks like the number 9'] }, ld_types: ['dyslexia', 'mixed'] },
  { type: 'letter_recognition', level: 1, title: 'Same or different?', instructions: 'Are "b" and "d" the same letter?', content: { target: 'no', choices: ['yes', 'no'], hints: ['Look carefully — one faces right, one faces left'] }, ld_types: ['dyslexia', 'mixed'] },
  { type: 'letter_recognition', level: 1, title: 'Letter sound /b/', instructions: 'Which letter makes the "buh" sound?', content: { target: 'b', choices: ['b', 'd', 'g', 'p'], hints: ['Think of "ball" — it starts with b'] }, ld_types: ['dyslexia', 'mixed'] },
  { type: 'letter_recognition', level: 1, title: 'Letter sound /d/', instructions: 'Which letter makes the "duh" sound?', content: { target: 'd', choices: ['b', 'd', 'g', 't'], hints: ['Think of "dog" — it starts with d'] }, ld_types: ['dyslexia', 'mixed'] },
  { type: 'letter_recognition', level: 1, title: 'Letter match', instructions: 'Find the uppercase letter that matches "m"', content: { target: 'M', choices: ['M', 'N', 'W', 'H'], hints: ['m has two bumps, M has two mountains'] }, ld_types: ['dyslexia', 'mixed'] },
  { type: 'letter_recognition', level: 2, title: 'Starting letter', instructions: 'What letter does "monkey" start with?', content: { target: 'm', choices: ['m', 'n', 'w', 'k'], hints: ['Say "monkey" slowly — what sound comes first?'] }, ld_types: ['dyslexia', 'mixed'] },
  { type: 'letter_recognition', level: 2, title: 'Starting letter', instructions: 'What letter does "sun" start with?', content: { target: 's', choices: ['s', 'z', 'c', 'x'], hints: ['Think of a snake — ssssss'] }, ld_types: ['dyslexia', 'mixed'] },
  { type: 'letter_recognition', level: 2, title: 'Ending letter', instructions: 'What letter does "cat" end with?', content: { target: 't', choices: ['t', 'd', 'p', 'k'], hints: ['Say "cat" — what is the last sound?'] }, ld_types: ['dyslexia', 'mixed'] },
  { type: 'letter_recognition', level: 3, title: 'Vowel hunt', instructions: 'Which of these is a vowel?', content: { target: 'e', choices: ['e', 'b', 'c', 'd'], hints: ['Vowels are: a, e, i, o, u'] }, ld_types: ['dyslexia', 'mixed'] },

  // ─── Phonics (Levels 1-4) ──────────────────────────────────────
  { type: 'phonics', level: 1, title: 'Rhyme time', instructions: 'Which word rhymes with "cat"?', content: { target: 'bat', choices: ['bat', 'dog', 'pen', 'cup'], hints: ['Rhyming words end with the same sound'] }, ld_types: ['dyslexia', 'mixed'] },
  { type: 'phonics', level: 1, title: 'Rhyme time', instructions: 'Which word rhymes with "sun"?', content: { target: 'fun', choices: ['fun', 'sit', 'map', 'dog'], hints: ['sun — fun, they both end in "un"'] }, ld_types: ['dyslexia', 'mixed'] },
  { type: 'phonics', level: 1, title: 'Rhyme time', instructions: 'Which word rhymes with "day"?', content: { target: 'play', choices: ['play', 'dog', 'sit', 'run'], hints: ['day — play, they both end in "ay"'] }, ld_types: ['dyslexia', 'mixed'] },
  { type: 'phonics', level: 1, title: 'Do they rhyme?', instructions: 'Do "hat" and "mat" rhyme?', content: { target: 'yes', choices: ['yes', 'no'], hints: ['Say them both — hat, mat. Same ending!'] }, ld_types: ['dyslexia', 'mixed'] },
  { type: 'phonics', level: 2, title: 'Sound blend', instructions: 'Blend these sounds: /c/ /a/ /t/. What word?', content: { target: 'cat', choices: ['cat', 'car', 'cup', 'cap'], hints: ['Say them faster: c-a-t → cat!'] }, ld_types: ['dyslexia', 'mixed'] },
  { type: 'phonics', level: 2, title: 'Sound blend', instructions: 'Blend these sounds: /d/ /o/ /g/. What word?', content: { target: 'dog', choices: ['dog', 'dig', 'dot', 'dip'], hints: ['Say them faster: d-o-g → dog!'] }, ld_types: ['dyslexia', 'mixed'] },
  { type: 'phonics', level: 2, title: 'Sound blend', instructions: 'Blend these sounds: /s/ /u/ /n/. What word?', content: { target: 'sun', choices: ['sun', 'sit', 'sat', 'set'], hints: ['s-u-n → sun! ☀️'] }, ld_types: ['dyslexia', 'mixed'] },
  { type: 'phonics', level: 3, title: 'Middle sound', instructions: 'What is the middle sound in "big"?', content: { target: 'i', choices: ['a', 'e', 'i', 'o'], hints: ['b-I-g: the middle sound is short "i"'] }, ld_types: ['dyslexia', 'mixed'] },
  { type: 'phonics', level: 3, title: 'Sound count', instructions: 'How many sounds in "ship"?', content: { target: '3', choices: ['2', '3', '4', '5'], hints: ['sh-i-p = 3 sounds (sh is one sound!)'] }, ld_types: ['dyslexia', 'mixed'] },
  { type: 'phonics', level: 4, title: 'Silent letter', instructions: 'Which letter is silent in "knee"?', content: { target: 'k', choices: ['k', 'n', 'e', 'none'], hints: ['We say "nee" not "k-nee"'] }, ld_types: ['dyslexia', 'mixed'] },
  { type: 'phonics', level: 4, title: 'Digraph', instructions: 'What sound does "sh" make in "ship"?', content: { target: 'sh', choices: ['sh', 's', 'h', 'ch'], hints: ['Put your finger on your lips — shhhh!'] }, ld_types: ['dyslexia', 'mixed'] },

  // ─── Word Building (Levels 2-5) ────────────────────────────────
  { type: 'word_building', level: 2, title: 'Missing letter', instructions: 'Fill in: c_t (a pet that says "meow")', content: { target: 'a', choices: ['a', 'o', 'u', 'i'], hints: ['c-a-t = cat 🐱'] }, ld_types: ['dyslexia', 'mixed'] },
  { type: 'word_building', level: 2, title: 'Missing letter', instructions: 'Fill in: d_g (a pet that barks)', content: { target: 'o', choices: ['a', 'o', 'u', 'i'], hints: ['d-o-g = dog 🐶'] }, ld_types: ['dyslexia', 'mixed'] },
  { type: 'word_building', level: 2, title: 'Missing letter', instructions: 'Fill in: s_n (it shines in the sky)', content: { target: 'u', choices: ['a', 'o', 'u', 'i'], hints: ['s-u-n = sun ☀️'] }, ld_types: ['dyslexia', 'mixed'] },
  { type: 'word_building', level: 3, title: 'Word from picture', instructions: 'What word does 🍎 show?', content: { target: 'apple', choices: ['apple', 'orange', 'grape', 'mango'], hints: ['It is red and round'] }, ld_types: ['dyslexia', 'mixed'] },
  { type: 'word_building', level: 3, title: 'Make a word', instructions: 'Put in order: t, a, c → ?', content: { target: 'cat', choices: ['cat', 'act', 'tac', 'atc'], correct_order: ['c', 'a', 't'], hints: ['Think of the animal that says meow'] }, ld_types: ['dyslexia', 'mixed'] },
  { type: 'word_building', level: 4, title: 'Complete the word', instructions: 'eleph___ (a big animal with a trunk)', content: { target: 'ant', choices: ['ant', 'ent', 'int', 'unt'], hints: ['elephant!'] }, ld_types: ['dyslexia', 'mixed'] },
  { type: 'word_building', level: 4, title: 'Compound word', instructions: 'sun + flower = ?', content: { target: 'sunflower', choices: ['sunflower', 'sunshine', 'flowerpot', 'sunlight'], hints: ['Put the two words together!'] }, ld_types: ['dyslexia', 'mixed'] },
  { type: 'word_building', level: 5, title: 'Unscramble', instructions: 'Unscramble: "aelpp" → a fruit', content: { target: 'apple', choices: ['apple', 'maple', 'ample', 'plead'], hints: ['It is red and grows on a tree 🍎'] }, ld_types: ['dyslexia', 'mixed'] },
  { type: 'word_building', level: 5, title: 'Unscramble', instructions: 'Unscramble: "ohesu" → a building', content: { target: 'house', choices: ['house', 'mouse', 'shout', 'south'], hints: ['You live in one 🏠'] }, ld_types: ['dyslexia', 'mixed'] },

  // ─── Reading (Levels 3-5) ──────────────────────────────────────
  { type: 'reading', level: 3, title: 'Simple sentence', instructions: 'Read: "The cat sat on the mat." Where did the cat sit?', content: { target: 'on the mat', choices: ['on the mat', 'on the bed', 'in the box', 'on the chair'], hints: ['Read the sentence again slowly'] }, ld_types: ['dyslexia', 'mixed'] },
  { type: 'reading', level: 3, title: 'Simple sentence', instructions: 'Read: "The dog is big." What is big?', content: { target: 'the dog', choices: ['the dog', 'the cat', 'the ball', 'the house'], hints: ['Who is the sentence about?'] }, ld_types: ['dyslexia', 'mixed'] },
  { type: 'reading', level: 4, title: 'Short passage', instructions: '"Ram has a red ball. He plays with it every day." What color is the ball?', content: { target: 'red', choices: ['red', 'blue', 'green', 'yellow'], hints: ['Look for the color word near "ball"'] }, ld_types: ['dyslexia', 'mixed'] },
  { type: 'reading', level: 4, title: 'Short passage', instructions: '"Priya likes to read books. She reads before bed." When does Priya read?', content: { target: 'before bed', choices: ['before bed', 'in the morning', 'at school', 'after lunch'], hints: ['When does she read?'] }, ld_types: ['dyslexia', 'mixed'] },
  { type: 'reading', level: 5, title: 'Comprehension', instructions: '"The farmer wakes up early. He feeds the cows and chickens. Then he waters the plants." What does the farmer do FIRST?', content: { target: 'feeds the cows and chickens', choices: ['feeds the cows and chickens', 'waters the plants', 'goes to sleep', 'eats breakfast'], hints: ['What does he do after waking up?'] }, ld_types: ['dyslexia', 'mixed'] },
  { type: 'reading', level: 5, title: 'Inference', instructions: '"Ravi took his umbrella. Dark clouds filled the sky." What is about to happen?', content: { target: 'rain', choices: ['rain', 'snow', 'sunshine', 'wind'], hints: ['Dark clouds + umbrella = ?'] }, ld_types: ['dyslexia', 'mixed'] },

  // ═══════════════════════════════════════════════════════════════════
  // DYSCALCULIA EXERCISES
  // ═══════════════════════════════════════════════════════════════════

  // ─── Number Sense (Levels 1-3) ─────────────────────────────────
  { type: 'number_sense', level: 1, title: 'Which is bigger?', instructions: 'Which number is bigger?', content: { target: '9', choices: ['6', '9'], hints: ['9 is bigger than 6!'], visual_aid: 'number_comparison' }, ld_types: ['dyscalculia', 'mixed'] },
  { type: 'number_sense', level: 1, title: 'Which is bigger?', instructions: 'Which number is bigger: 3 or 7?', content: { target: '7', choices: ['3', '7'], hints: ['Count on your fingers — 7 is more!'] }, ld_types: ['dyscalculia', 'mixed'] },
  { type: 'number_sense', level: 1, title: 'Which is smaller?', instructions: 'Which number is smaller: 5 or 2?', content: { target: '2', choices: ['5', '2'], hints: ['2 is less than 5'] }, ld_types: ['dyscalculia', 'mixed'] },
  { type: 'number_sense', level: 1, title: 'Number name', instructions: 'What number is "five"?', content: { target: '5', choices: ['3', '4', '5', '6'], hints: ['Count: one, two, three, four, FIVE'] }, ld_types: ['dyscalculia', 'mixed'] },
  { type: 'number_sense', level: 1, title: 'What comes next?', instructions: 'What number comes after 4?', content: { target: '5', choices: ['3', '5', '6', '7'], hints: ['Count: 1, 2, 3, 4, ...'] }, ld_types: ['dyscalculia', 'mixed'] },
  { type: 'number_sense', level: 2, title: 'What comes next?', instructions: 'What number comes after 15?', content: { target: '16', choices: ['14', '15', '16', '17'], hints: ['15 + 1 = 16'] }, ld_types: ['dyscalculia', 'mixed'] },
  { type: 'number_sense', level: 2, title: 'Between numbers', instructions: 'What number is between 7 and 9?', content: { target: '8', choices: ['6', '7', '8', '10'], hints: ['7, ___, 9'] }, ld_types: ['dyscalculia', 'mixed'] },
  { type: 'number_sense', level: 2, title: 'Number confusion', instructions: 'Which is twelve: 12 or 21?', content: { target: '12', choices: ['12', '21'], hints: ['Twelve = 12 (one-two). 21 is twenty-one.'] }, ld_types: ['dyscalculia', 'mixed'] },
  { type: 'number_sense', level: 3, title: 'Place value', instructions: 'In the number 35, what digit is in the tens place?', content: { target: '3', choices: ['3', '5', '35', '8'], hints: ['The tens place is the first digit (left side)'] }, ld_types: ['dyscalculia', 'mixed'] },
  { type: 'number_sense', level: 3, title: 'Comparing', instructions: 'Which is greater: 47 or 74?', content: { target: '74', choices: ['47', '74'], hints: ['Look at the tens digit first: 7 > 4'] }, ld_types: ['dyscalculia', 'mixed'] },

  // ─── Counting (Levels 1-3) ─────────────────────────────────────
  { type: 'counting', level: 1, title: 'Count the stars', instructions: 'How many stars? ⭐⭐⭐', content: { target: '3', choices: ['2', '3', '4', '5'], hints: ['Point at each star and count!'], visual_aid: 'stars_3' }, ld_types: ['dyscalculia', 'mixed'] },
  { type: 'counting', level: 1, title: 'Count the apples', instructions: 'How many apples? 🍎🍎🍎🍎🍎', content: { target: '5', choices: ['4', '5', '6', '7'], hints: ['Touch each apple as you count'], visual_aid: 'apples_5' }, ld_types: ['dyscalculia', 'mixed'] },
  { type: 'counting', level: 1, title: 'Count the hearts', instructions: 'How many hearts? ❤️❤️', content: { target: '2', choices: ['1', '2', '3', '4'], hints: ['One, two!'] }, ld_types: ['dyscalculia', 'mixed'] },
  { type: 'counting', level: 2, title: 'Skip counting', instructions: 'Count by 2s: 2, 4, 6, ___', content: { target: '8', choices: ['7', '8', '9', '10'], hints: ['Add 2 each time: 6 + 2 = 8'] }, ld_types: ['dyscalculia', 'mixed'] },
  { type: 'counting', level: 2, title: 'Skip counting', instructions: 'Count by 5s: 5, 10, 15, ___', content: { target: '20', choices: ['16', '18', '20', '25'], hints: ['Add 5 each time: 15 + 5 = 20'] }, ld_types: ['dyscalculia', 'mixed'] },
  { type: 'counting', level: 3, title: 'Count backwards', instructions: 'Count backwards: 10, 9, 8, ___', content: { target: '7', choices: ['6', '7', '8', '11'], hints: ['Going down by 1 each time'] }, ld_types: ['dyscalculia', 'mixed'] },
  { type: 'counting', level: 3, title: 'Skip count by 10', instructions: 'Count by 10s: 10, 20, 30, ___', content: { target: '40', choices: ['35', '40', '50', '31'], hints: ['Add 10 each time'] }, ld_types: ['dyscalculia', 'mixed'] },

  // ─── Arithmetic (Levels 2-5) ───────────────────────────────────
  { type: 'arithmetic', level: 2, title: 'Addition', instructions: '5 + 3 = ?', content: { target: '8', choices: ['6', '7', '8', '9'], hints: ['Start at 5 and count up 3 more'] }, ld_types: ['dyscalculia', 'mixed'] },
  { type: 'arithmetic', level: 2, title: 'Addition', instructions: '2 + 4 = ?', content: { target: '6', choices: ['5', '6', '7', '8'], hints: ['Use your fingers: 2 + 4'] }, ld_types: ['dyscalculia', 'mixed'] },
  { type: 'arithmetic', level: 2, title: 'Addition', instructions: '7 + 1 = ?', content: { target: '8', choices: ['6', '7', '8', '9'], hints: ['7 plus one more!'] }, ld_types: ['dyscalculia', 'mixed'] },
  { type: 'arithmetic', level: 3, title: 'Subtraction', instructions: '9 - 4 = ?', content: { target: '5', choices: ['4', '5', '6', '7'], hints: ['Start at 9, count back 4'] }, ld_types: ['dyscalculia', 'mixed'] },
  { type: 'arithmetic', level: 3, title: 'Subtraction', instructions: '12 - 7 = ?', content: { target: '5', choices: ['4', '5', '6', '7'], hints: ['12 minus 7: count back from 12'] }, ld_types: ['dyscalculia', 'mixed'] },
  { type: 'arithmetic', level: 3, title: 'Addition', instructions: '8 + 6 = ?', content: { target: '14', choices: ['12', '13', '14', '15'], hints: ['8 + 2 = 10, then 10 + 4 = 14'] }, ld_types: ['dyscalculia', 'mixed'] },
  { type: 'arithmetic', level: 4, title: 'Word problem', instructions: 'Ali has 8 apples. He gave 3 to Sam. How many does Ali have now?', content: { target: '5', choices: ['3', '4', '5', '6'], hints: ['Gave away means subtract: 8 - 3 = ?'] }, ld_types: ['dyscalculia', 'mixed'] },
  { type: 'arithmetic', level: 4, title: 'Word problem', instructions: 'There are 6 birds on a tree. 4 more birds come. How many birds now?', content: { target: '10', choices: ['8', '9', '10', '11'], hints: ['More birds came = add: 6 + 4 = ?'] }, ld_types: ['dyscalculia', 'mixed'] },
  { type: 'arithmetic', level: 4, title: 'Multiplication intro', instructions: '3 groups of 2 = ?', content: { target: '6', choices: ['5', '6', '7', '8'], hints: ['2 + 2 + 2 = 6 (three groups of two)'] }, ld_types: ['dyscalculia', 'mixed'] },
  { type: 'arithmetic', level: 5, title: 'Multi-step', instructions: '(5 + 3) - 2 = ?', content: { target: '6', choices: ['5', '6', '7', '8'], hints: ['First: 5 + 3 = 8. Then: 8 - 2 = 6'] }, ld_types: ['dyscalculia', 'mixed'] },
  { type: 'arithmetic', level: 5, title: 'Division intro', instructions: '10 cookies shared equally among 2 friends. How many each?', content: { target: '5', choices: ['3', '4', '5', '6'], hints: ['Split 10 into 2 equal groups'] }, ld_types: ['dyscalculia', 'mixed'] },

  // ─── Patterns (Levels 3-5) ─────────────────────────────────────
  { type: 'patterns', level: 3, title: 'Number pattern', instructions: 'What comes next: 2, 4, 6, 8, ___?', content: { target: '10', choices: ['9', '10', '11', '12'], hints: ['Adding 2 each time'] }, ld_types: ['dyscalculia', 'mixed'] },
  { type: 'patterns', level: 3, title: 'Number pattern', instructions: 'What comes next: 5, 10, 15, ___?', content: { target: '20', choices: ['16', '18', '20', '25'], hints: ['Adding 5 each time'] }, ld_types: ['dyscalculia', 'mixed'] },
  { type: 'patterns', level: 4, title: 'Shape pattern', instructions: 'What comes next: ⭐🔵⭐🔵⭐___?', content: { target: '🔵', choices: ['⭐', '🔵', '🔺', '🟢'], hints: ['Star, circle, star, circle, star, ...'] }, ld_types: ['dyscalculia', 'mixed'] },
  { type: 'patterns', level: 4, title: 'Growing pattern', instructions: 'What comes next: 1, 2, 4, 8, ___?', content: { target: '16', choices: ['10', '12', '14', '16'], hints: ['Each number doubles: × 2'] }, ld_types: ['dyscalculia', 'mixed'] },
  { type: 'patterns', level: 5, title: 'Complex pattern', instructions: 'What comes next: 1, 1, 2, 3, 5, ___?', content: { target: '8', choices: ['6', '7', '8', '9'], hints: ['Add the last two numbers: 3 + 5 = 8 (Fibonacci!)'] }, ld_types: ['dyscalculia', 'mixed'] },
  { type: 'patterns', level: 5, title: 'Decreasing pattern', instructions: 'What comes next: 100, 90, 80, 70, ___?', content: { target: '60', choices: ['50', '55', '60', '65'], hints: ['Subtract 10 each time'] }, ld_types: ['dyscalculia', 'mixed'] },

  // ═══════════════════════════════════════════════════════════════════
  // DYSGRAPHIA EXERCISES
  // ═══════════════════════════════════════════════════════════════════

  // ─── Tracing (Levels 1-2) ──────────────────────────────────────
  { type: 'tracing', level: 1, title: 'Trace the letter A', instructions: 'Follow the dotted line to write "A"', content: { target: 'A', letter: 'A', stroke_order: ['diagonal-left', 'diagonal-right', 'horizontal'], visual_aid: 'trace_A' }, ld_types: ['dysgraphia', 'mixed'] },
  { type: 'tracing', level: 1, title: 'Trace the letter B', instructions: 'Follow the dotted line to write "B"', content: { target: 'B', letter: 'B', stroke_order: ['vertical', 'curve-top', 'curve-bottom'], visual_aid: 'trace_B' }, ld_types: ['dysgraphia', 'mixed'] },
  { type: 'tracing', level: 1, title: 'Trace the letter C', instructions: 'Follow the dotted line to write "C"', content: { target: 'C', letter: 'C', stroke_order: ['curve-open'], visual_aid: 'trace_C' }, ld_types: ['dysgraphia', 'mixed'] },
  { type: 'tracing', level: 1, title: 'Trace the number 1', instructions: 'Trace the number 1', content: { target: '1', letter: '1', stroke_order: ['vertical'], visual_aid: 'trace_1' }, ld_types: ['dysgraphia', 'mixed'] },
  { type: 'tracing', level: 1, title: 'Trace the number 5', instructions: 'Trace the number 5', content: { target: '5', letter: '5', stroke_order: ['horizontal', 'vertical', 'curve'], visual_aid: 'trace_5' }, ld_types: ['dysgraphia', 'mixed'] },
  { type: 'tracing', level: 2, title: 'Trace "cat"', instructions: 'Trace the word: cat', content: { target: 'cat', word: 'cat', visual_aid: 'trace_cat' }, ld_types: ['dysgraphia', 'mixed'] },
  { type: 'tracing', level: 2, title: 'Trace "dog"', instructions: 'Trace the word: dog', content: { target: 'dog', word: 'dog', visual_aid: 'trace_dog' }, ld_types: ['dysgraphia', 'mixed'] },
  { type: 'tracing', level: 2, title: 'Trace your name', instructions: 'Trace the letters one by one', content: { target: 'name', type: 'free_trace', visual_aid: 'trace_grid' }, ld_types: ['dysgraphia', 'mixed'] },

  // ─── Sequencing (Levels 2-4) ───────────────────────────────────
  { type: 'sequencing', level: 2, title: 'ABC order', instructions: 'Which letter comes first: C or A?', content: { target: 'A', choices: ['A', 'C'], hints: ['Alphabet: A, B, C — A comes first!'] }, ld_types: ['dysgraphia', 'mixed'] },
  { type: 'sequencing', level: 2, title: 'ABC order', instructions: 'Put in order: B, A, C', content: { target: 'A,B,C', correct_order: ['A', 'B', 'C'], choices: ['B', 'A', 'C'], hints: ['Alphabet song: A, B, C, D, E...'] }, ld_types: ['dysgraphia', 'mixed'] },
  { type: 'sequencing', level: 3, title: 'Word order', instructions: 'Make a sentence: "cat / the / sat"', content: { target: 'the cat sat', correct_order: ['the', 'cat', 'sat'], choices: ['cat', 'the', 'sat'], hints: ['Who did what? The cat sat.'] }, ld_types: ['dysgraphia', 'mixed'] },
  { type: 'sequencing', level: 3, title: 'Word order', instructions: 'Make a sentence: "is / big / dog / the"', content: { target: 'the dog is big', correct_order: ['the', 'dog', 'is', 'big'], choices: ['is', 'big', 'dog', 'the'], hints: ['Start with "the"'] }, ld_types: ['dysgraphia', 'mixed'] },
  { type: 'sequencing', level: 3, title: 'Days of week', instructions: 'What day comes after Monday?', content: { target: 'Tuesday', choices: ['Sunday', 'Tuesday', 'Wednesday', 'Friday'], hints: ['Monday, Tuesday, Wednesday...'] }, ld_types: ['dysgraphia', 'mixed'] },
  { type: 'sequencing', level: 4, title: 'Story order', instructions: 'What happens first? A) He ate breakfast B) He woke up C) He went to school', content: { target: 'B', correct_order: ['B', 'A', 'C'], choices: ['A', 'B', 'C'], hints: ['What must happen before eating breakfast?'] }, ld_types: ['dysgraphia', 'mixed'] },
  { type: 'sequencing', level: 4, title: 'Sentence order', instructions: 'Put in order: "on / cat / the / mat / sat / the"', content: { target: 'the cat sat on the mat', correct_order: ['the', 'cat', 'sat', 'on', 'the', 'mat'], choices: ['on', 'cat', 'the', 'mat', 'sat', 'the'], hints: ['The cat sat on the mat 🐱'] }, ld_types: ['dysgraphia', 'mixed'] },

  // ─── Writing (Levels 3-5) ──────────────────────────────────────
  { type: 'writing', level: 3, title: 'Missing letter', instructions: 'Write the missing letter: _at → (a word for a pet that meows)', content: { target: 'c', choices: ['c', 'b', 'h', 'r'], hints: ['cat! The missing letter is c'] }, ld_types: ['dysgraphia', 'mixed'] },
  { type: 'writing', level: 3, title: 'Missing letter', instructions: 'Write the missing letter: do_ → (a pet that barks)', content: { target: 'g', choices: ['g', 't', 'b', 'p'], hints: ['dog! The missing letter is g'] }, ld_types: ['dysgraphia', 'mixed'] },
  { type: 'writing', level: 4, title: 'Complete the word', instructions: 'Complete: butter___ (an insect with colorful wings)', content: { target: 'fly', choices: ['fly', 'cup', 'milk', 'ball'], hints: ['butterfly! 🦋'] }, ld_types: ['dysgraphia', 'mixed'] },
  { type: 'writing', level: 4, title: 'Complete the word', instructions: 'Complete: rain___ (colorful arc in the sky)', content: { target: 'bow', choices: ['bow', 'drop', 'fall', 'coat'], hints: ['rainbow! 🌈'] }, ld_types: ['dysgraphia', 'mixed'] },
  { type: 'writing', level: 5, title: 'Write a sentence', instructions: 'Choose the correct sentence:', content: { target: 'The boy runs fast.', choices: ['The boy runs fast.', 'boy The runs fast.', 'The boy run fast.', 'The fast boy runs.'], hints: ['Subject + verb + rest'] }, ld_types: ['dysgraphia', 'mixed'] },
  { type: 'writing', level: 5, title: 'Punctuation', instructions: 'Which sentence has correct punctuation?', content: { target: 'I like ice cream!', choices: ['I like ice cream!', 'i like ice cream', 'I like ice cream', 'i Like Ice Cream!'], hints: ['Capital letter at start, punctuation at end'] }, ld_types: ['dysgraphia', 'mixed'] },

  // ═══════════════════════════════════════════════════════════════════
  // GENERAL / MIXED EXERCISES (for not_detected or review)
  // ═══════════════════════════════════════════════════════════════════
  { type: 'letter_recognition', level: 1, title: 'Find M', instructions: 'Which letter is "M"?', content: { target: 'M', choices: ['M', 'N', 'W', 'V'] }, ld_types: ['dyslexia', 'mixed', 'not_detected'] },
  { type: 'counting', level: 1, title: 'How many fingers?', instructions: 'How many fingers on one hand?', content: { target: '5', choices: ['4', '5', '6', '10'], hints: ['Count your fingers!'] }, ld_types: ['dyscalculia', 'mixed', 'not_detected'] },
  { type: 'phonics', level: 2, title: 'First sound', instructions: 'What sound does "fish" start with?', content: { target: 'f', choices: ['f', 'p', 'v', 's'], hints: ['fffff-ish'] }, ld_types: ['dyslexia', 'mixed', 'not_detected'] },
  { type: 'arithmetic', level: 2, title: 'Quick add', instructions: '3 + 3 = ?', content: { target: '6', choices: ['5', '6', '7', '8'] }, ld_types: ['dyscalculia', 'mixed', 'not_detected'] },
  { type: 'sequencing', level: 2, title: 'Number order', instructions: 'Put in order: 5, 2, 8', content: { target: '2,5,8', correct_order: ['2', '5', '8'], choices: ['5', '2', '8'], hints: ['Smallest to biggest'] }, ld_types: ['dyscalculia', 'dysgraphia', 'mixed', 'not_detected'] },
  { type: 'word_building', level: 3, title: 'Opposite', instructions: 'What is the opposite of "big"?', content: { target: 'small', choices: ['small', 'tall', 'fast', 'happy'] }, ld_types: ['dyslexia', 'mixed', 'not_detected'] },
  { type: 'reading', level: 3, title: 'True or false', instructions: '"A fish can fly." True or false?', content: { target: 'false', choices: ['true', 'false'], hints: ['Fish swim, they don\'t fly!'] }, ld_types: ['dyslexia', 'mixed', 'not_detected'] },
  { type: 'patterns', level: 3, title: 'Color pattern', instructions: 'Red, Blue, Red, Blue, Red, ___?', content: { target: 'Blue', choices: ['Red', 'Blue', 'Green', 'Yellow'], hints: ['The pattern repeats: Red, Blue, Red, Blue...'] }, ld_types: ['dyscalculia', 'mixed', 'not_detected'] },
];

module.exports = exerciseBank;
