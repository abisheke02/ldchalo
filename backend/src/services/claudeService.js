const Anthropic = require('@anthropic-ai/sdk');

const MODEL = 'claude-sonnet-4-6';
const client = process.env.ANTHROPIC_API_KEY ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }) : null;

// ─────────────────────────────────────────────────────────────────
// WRONG ANSWER FEEDBACK (real-time, per question)
// Plan §5.5 — returns null if Claude is unavailable or the call fails,
// so callers can fall back to plain right/wrong feedback.
// ─────────────────────────────────────────────────────────────────
const generateWrongAnswerFeedback = async ({ questionText, studentAnswer, correctAnswer, questionType, studentAge, ldType }) => {
  if (!client) return null;

  const systemPrompt = `You explain wrong answers to Indian children with learning disabilities in the simplest, warmest possible English. Never shame or blame. Always explain visually when possible.

Return a JSON object with:
- feedback_text: 2-3 sentences max. Start with a small encouragement. Explain the correct answer clearly. Use "remember b faces right, d faces left" style memory hooks where possible.
- memory_hook: one short phrase they can remember (or null if not applicable)

Max reading level: Grade 3 English. Respond ONLY with valid JSON object.`;

  const userMessage = JSON.stringify({ questionText, studentAnswer, correctAnswer, questionType, studentAge, ldType });

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 256,
      system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: userMessage }],
    });

    return JSON.parse(response.content[0].text.trim());
  } catch (err) {
    console.error('[claudeService] generateWrongAnswerFeedback failed:', err.message);
    return null;
  }
};

module.exports = { generateWrongAnswerFeedback };
