/**
 * AI-powered LD Classifier using Claude API.
 * Analyzes screening quiz answers to classify learning disability type.
 * Falls back to rule-based classifier if Claude is unavailable.
 */

const Anthropic = require('@anthropic-ai/sdk');
const { classifyLD: ruleBasedClassify } = require('./ruleBasedClassifier');

const MODEL = 'claude-sonnet-4-6';
const client = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

const SYSTEM_PROMPT = `You are an educational psychologist AI specializing in learning disability screening for Indian children aged 5-12. You analyze quiz responses to identify potential learning disabilities.

Given a set of screening quiz answers, analyze the error patterns and classify the child's potential learning disability type.

CLASSIFICATION RULES:
- Dyslexia: letter reversals (b/d, p/q), difficulty with phoneme blending, poor rhyme detection, slow letter recognition
- Dysgraphia: difficulty with letter formation, sequencing errors in writing tasks, slow handwriting-related responses
- Dyscalculia: number confusion (6/9, 12/21), difficulty with arithmetic, poor number sequencing, can't grasp quantity concepts
- Mixed: significant errors across multiple categories (2+ categories with > 30% error rate)
- Not Detected: error rate below threshold in all categories (< 25% total errors)

Also consider response time — very slow responses (> 20 seconds) in a category suggest processing difficulty in that area.

RESPONSE FORMAT (return ONLY valid JSON):
{
  "ldType": "dyslexia" | "dysgraphia" | "dyscalculia" | "mixed" | "not_detected",
  "riskScore": 0-100,
  "breakdown": {
    "dyslexia": 0-100,
    "dysgraphia": 0-100,
    "dyscalculia": 0-100
  },
  "recommendations": ["string", "string", "string"],
  "reasoning": "Brief explanation of classification reasoning"
}`;

/**
 * Classify LD type using Claude AI with rule-based fallback.
 * @param {Array} answers - Array of answer objects from screening session
 * @returns {Promise<Object>} Classification result
 */
async function classifyLD(answers) {
  // If no Claude API key, use rule-based immediately
  if (!client) {
    console.log('[ldClassifier] Claude unavailable — using rule-based classifier');
    return ruleBasedClassify(answers);
  }

  try {
    // Prepare summary for Claude
    const summary = {
      totalQuestions: answers.length,
      totalCorrect: answers.filter(a => a.isCorrect).length,
      totalIncorrect: answers.filter(a => !a.isCorrect).length,
      averageResponseTimeMs: Math.round(answers.reduce((sum, a) => sum + (a.responseTimeMs || 0), 0) / answers.length),
      byCategory: {},
      detailedAnswers: answers.map(a => ({
        question: a.questionText,
        category: a.category,
        studentAnswer: a.studentAnswer,
        correctAnswer: a.correctAnswer,
        isCorrect: a.isCorrect,
        responseTimeMs: a.responseTimeMs,
      })),
    };

    // Group by category
    const categories = ['letter_recognition', 'rhyme_detection', 'phoneme_blending', 'number_sense', 'sequencing'];
    for (const cat of categories) {
      const catAnswers = answers.filter(a => a.category === cat);
      summary.byCategory[cat] = {
        total: catAnswers.length,
        correct: catAnswers.filter(a => a.isCorrect).length,
        errors: catAnswers.filter(a => !a.isCorrect).length,
        errorRate: catAnswers.length > 0
          ? Math.round((catAnswers.filter(a => !a.isCorrect).length / catAnswers.length) * 100)
          : 0,
        avgResponseMs: catAnswers.length > 0
          ? Math.round(catAnswers.reduce((s, a) => s + (a.responseTimeMs || 0), 0) / catAnswers.length)
          : 0,
      };
    }

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 512,
      system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: JSON.stringify(summary) }],
    });

    const result = JSON.parse(response.content[0].text.trim());

    // Validate the response shape
    if (!result.ldType || typeof result.riskScore !== 'number' || !result.breakdown) {
      throw new Error('Invalid AI response shape');
    }

    return {
      ldType: result.ldType,
      riskScore: Math.min(100, Math.max(0, result.riskScore)),
      breakdown: result.breakdown,
      recommendations: result.recommendations || [],
      reasoning: result.reasoning || '',
      classifiedBy: 'ai',
    };
  } catch (err) {
    console.error('[ldClassifier] Claude classification failed:', err.message);
    console.log('[ldClassifier] Falling back to rule-based classifier');

    const fallback = ruleBasedClassify(answers);
    fallback.classifiedBy = 'rule_based';
    return fallback;
  }
}

module.exports = { classifyLD };
