/**
 * Rule-based LD classifier — fallback when Claude AI is unavailable.
 * Scores answers by category and determines LD type.
 */

const CATEGORY_WEIGHTS = {
  letter_recognition: { dyslexia: 10, dysgraphia: 3, dyscalculia: 0 },
  rhyme_detection:    { dyslexia: 15, dysgraphia: 0, dyscalculia: 0 },
  phoneme_blending:   { dyslexia: 15, dysgraphia: 5, dyscalculia: 0 },
  number_sense:       { dyslexia: 0,  dysgraphia: 0, dyscalculia: 15 },
  sequencing:         { dyslexia: 5,  dysgraphia: 3, dyscalculia: 8 },
};

/**
 * Classify LD type based on answer patterns using rule-based scoring.
 * @param {Array} answers - Array of { category, isCorrect, responseTimeMs }
 * @returns {{ ldType, riskScore, breakdown, recommendations }}
 */
function classifyLD(answers) {
  const scores = { dyslexia: 0, dysgraphia: 0, dyscalculia: 0 };
  const categoryErrors = {};

  // Count errors per category
  for (const answer of answers) {
    if (!answer.isCorrect) {
      const category = answer.category || 'letter_recognition';
      categoryErrors[category] = (categoryErrors[category] || 0) + 1;

      const weights = CATEGORY_WEIGHTS[category] || {};
      scores.dyslexia += weights.dyslexia || 0;
      scores.dysgraphia += weights.dysgraphia || 0;
      scores.dyscalculia += weights.dyscalculia || 0;
    }

    // Slow response time also contributes (> 20 seconds per question)
    if (answer.responseTimeMs && answer.responseTimeMs > 20000) {
      const category = answer.category || 'letter_recognition';
      const weights = CATEGORY_WEIGHTS[category] || {};
      scores.dyslexia += Math.round((weights.dyslexia || 0) * 0.3);
      scores.dysgraphia += Math.round((weights.dysgraphia || 0) * 0.3);
      scores.dyscalculia += Math.round((weights.dyscalculia || 0) * 0.3);
    }
  }

  // Normalize scores to 0-100 range
  const maxPossible = 120; // theoretical max if all wrong in weighted category
  const breakdown = {
    dyslexia: Math.min(100, Math.round((scores.dyslexia / maxPossible) * 100)),
    dysgraphia: Math.min(100, Math.round((scores.dysgraphia / maxPossible) * 100)),
    dyscalculia: Math.min(100, Math.round((scores.dyscalculia / maxPossible) * 100)),
  };

  // Determine LD type
  const maxScore = Math.max(breakdown.dyslexia, breakdown.dysgraphia, breakdown.dyscalculia);
  const riskScore = maxScore;

  let ldType = 'not_detected';
  const highScores = Object.entries(breakdown).filter(([_, v]) => v > 30);

  if (highScores.length >= 2) {
    ldType = 'mixed';
  } else if (breakdown.dyslexia > 40) {
    ldType = 'dyslexia';
  } else if (breakdown.dysgraphia > 40) {
    ldType = 'dysgraphia';
  } else if (breakdown.dyscalculia > 40) {
    ldType = 'dyscalculia';
  }

  // Generate recommendations based on type
  const recommendations = getRecommendations(ldType, breakdown);

  return { ldType, riskScore, breakdown, recommendations };
}

function getRecommendations(ldType, breakdown) {
  const recs = [];

  switch (ldType) {
    case 'dyslexia':
      recs.push('Start with Level 1 phonics exercises focusing on letter-sound recognition');
      recs.push('Practice CVC (consonant-vowel-consonant) word decoding daily');
      recs.push('Use multisensory approach: see the letter, say the sound, trace it');
      break;
    case 'dysgraphia':
      recs.push('Begin with letter tracing exercises to build muscle memory');
      recs.push('Practice writing in large spaces first, then gradually reduce size');
      recs.push('Use speech-to-text as an alternative when writing is frustrating');
      break;
    case 'dyscalculia':
      recs.push('Start with number sense exercises using visual aids (blocks, dots)');
      recs.push('Practice number sequences and patterns at Level 1 difficulty');
      recs.push('Use real-world counting activities (money, objects) to build intuition');
      break;
    case 'mixed':
      recs.push('Begin with the area showing highest difficulty score');
      recs.push('Short, varied practice sessions (10 min each area) to avoid fatigue');
      recs.push('Regular re-screening every 3 months to track progress');
      break;
    default:
      recs.push('No significant learning disability indicators detected');
      recs.push('Continue regular academic activities');
      recs.push('Re-screen in 3 months if concerns arise');
  }

  return recs;
}

module.exports = { classifyLD };
