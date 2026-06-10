/**
 * Progressive Screening Engine
 * 
 * DESIGN:
 * - 5 levels, 20 questions each (7 dyslexia + 7 dyscalculia + 6 dysgraphia)
 * - Total: 100 questions
 * - Student starts at Level 1, advances if score ≥ 70% (14/20 correct)
 * - When score < 70% → THAT is their LD level (where they struggle)
 * - Categories they fail in → determines LD TYPE
 * - If they pass ALL 5 levels → "No LD Detected"
 * 
 * EXAMPLE:
 *   Student passes Level 1 (18/20), Level 2 (15/20), fails Level 3 (8/20)
 *   → LD Level = 3
 *   → Failed questions were in: phoneme_blending (dyslexia) + arithmetic (dyscalculia)
 *   → LD Types detected: dyslexia, dyscalculia → "mixed"
 *   → Recommendation: Practice Level 3 exercises for dyslexia + dyscalculia
 */

const PASS_THRESHOLD = 0.70; // 70% = pass (4/6 correct minimum)

/**
 * Evaluate a completed screening session with progressive levels.
 * @param {Array} answers - All answers with { level, category, ld_target, isCorrect }
 * @returns {Object} - { ldLevel, ldType, riskScore, breakdown, recommendations, levelResults }
 */
function evaluateProgressiveScreening(answers) {
  // Group answers by level
  const levels = {};
  answers.forEach(a => {
    if (!levels[a.level]) levels[a.level] = [];
    levels[a.level].push(a);
  });

  // Walk through levels 1→5 to find where student struggles
  let ldLevel = null; // null = passed all levels
  const levelResults = {};

  for (let lvl = 1; lvl <= 5; lvl++) {
    const levelAnswers = levels[lvl] || [];
    if (levelAnswers.length === 0) break;

    const correct = levelAnswers.filter(a => a.isCorrect).length;
    const total = levelAnswers.length;
    const score = total > 0 ? correct / total : 0;
    const passed = score >= PASS_THRESHOLD;

    levelResults[lvl] = {
      level: lvl,
      correct,
      total,
      score: Math.round(score * 100),
      passed,
    };

    if (!passed && ldLevel === null) {
      ldLevel = lvl; // First level they failed = their LD level
    }
  }

  // If passed all levels
  if (ldLevel === null) {
    return {
      ldLevel: null,
      ldType: 'not_detected',
      riskScore: Math.max(0, 15 - Object.keys(levelResults).length * 2), // Very low risk
      breakdown: { dyslexia: 0, dyscalculia: 0, dysgraphia: 0 },
      levelResults,
      recommendations: [
        'Great news! No learning difficulties detected at any level.',
        'Continue regular practice to maintain and improve skills.',
        'Try challenging exercises at the highest level.',
      ],
    };
  }

  // Analyze WHICH categories they failed in at the LD level
  const failedLevel = levels[ldLevel] || [];
  const categoryErrors = { dyslexia: { wrong: 0, total: 0 }, dyscalculia: { wrong: 0, total: 0 }, dysgraphia: { wrong: 0, total: 0 } };

  failedLevel.forEach(a => {
    const target = a.ld_target || 'dyslexia';
    if (categoryErrors[target]) {
      categoryErrors[target].total++;
      if (!a.isCorrect) categoryErrors[target].wrong++;
    }
  });

  // Calculate breakdown percentages
  const breakdown = {};
  let maxScore = 0;
  let maxType = 'dyslexia';

  Object.entries(categoryErrors).forEach(([type, data]) => {
    const errorRate = data.total > 0 ? Math.round((data.wrong / data.total) * 100) : 0;
    breakdown[type] = errorRate;
    if (errorRate > maxScore) {
      maxScore = errorRate;
      maxType = type;
    }
  });

  // Determine LD type
  let ldType;
  const highCategories = Object.entries(breakdown).filter(([_, v]) => v >= 50);
  if (highCategories.length >= 2) {
    ldType = 'mixed';
  } else if (maxScore >= 50) {
    ldType = maxType;
  } else if (maxScore >= 30) {
    ldType = maxType; // Mild but detected
  } else {
    ldType = 'not_detected';
  }

  // Risk score: based on level failed and error rate
  // Level 1 fail = high risk (100), Level 5 fail = moderate risk (40)
  const levelRisk = Math.max(0, 120 - (ldLevel * 20));
  const errorRisk = maxScore;
  const riskScore = Math.min(100, Math.round((levelRisk + errorRisk) / 2));

  // Generate recommendations based on LD level and type
  const recommendations = generateRecommendations(ldLevel, ldType, breakdown);

  return {
    ldLevel,
    ldType,
    riskScore,
    breakdown,
    levelResults,
    recommendations,
  };
}

/**
 * Generate personalized recommendations based on screening results.
 */
function generateRecommendations(ldLevel, ldType, breakdown) {
  const recs = [];

  // Level-specific recommendation
  recs.push(`Your learning level is at Level ${ldLevel}. We'll help you master Level ${ldLevel} skills!`);

  // Type-specific recommendations
  if (ldType === 'dyslexia' || ldType === 'mixed') {
    if (ldLevel <= 2) recs.push('Practice letter recognition — focus on b/d/p/q differences');
    else if (ldLevel === 3) recs.push('Practice phonics and sound blending — hear the parts of words');
    else recs.push('Practice reading comprehension — read short stories with questions');
  }

  if (ldType === 'dyscalculia' || ldType === 'mixed') {
    if (ldLevel <= 2) recs.push('Practice number recognition — use counting objects to help');
    else if (ldLevel === 3) recs.push('Practice basic addition and subtraction with visual aids');
    else recs.push('Practice word problems — draw pictures to understand the question');
  }

  if (ldType === 'dysgraphia' || ldType === 'mixed') {
    if (ldLevel <= 2) recs.push('Practice letter formation — trace letters in the air and on paper');
    else if (ldLevel === 3) recs.push('Practice spelling and sequencing — break words into parts');
    else recs.push('Practice sentence building — start with short sentences');
  }

  recs.push('Practice 15 minutes daily for best results');
  recs.push(`Re-screen in 3 months to check progress towards Level ${Math.min(5, ldLevel + 1)}`);

  return recs;
}

/**
 * Determine if student should advance to next level (real-time during quiz).
 * Call after each level's questions are answered.
 */
function shouldAdvanceLevel(levelAnswers) {
  const correct = levelAnswers.filter(a => a.isCorrect).length;
  const total = levelAnswers.length;
  return total > 0 && (correct / total) >= PASS_THRESHOLD;
}

module.exports = {
  evaluateProgressiveScreening,
  shouldAdvanceLevel,
  PASS_THRESHOLD,
};
