import React from 'react';

/**
 * AI wrong-answer feedback card — warm, encouraging, never shaming.
 * Shows as a bottom overlay when student gets an answer wrong.
 * @param {object} feedback - { feedback_text, memory_hook }
 * @param {function} onDismiss - called when "Got it!" is tapped
 */
export default function FeedbackCard({ feedback, onDismiss }) {
  if (!feedback) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/20 animate-fade-in">
      <div className="w-full max-w-lg mx-4 mb-6 bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl shadow-xl border border-amber-200 overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 pt-5 pb-3">
          <span className="text-3xl">💡</span>
          <h3 className="text-lg font-bold text-amber-800">Let's learn together!</h3>
        </div>

        {/* Feedback text */}
        <div className="px-6 pb-4">
          <p className="text-base text-amber-900 leading-relaxed">
            {feedback.feedback_text || "That's okay! Let's look at this differently."}
          </p>

          {/* Memory hook */}
          {feedback.memory_hook && (
            <div className="mt-3 flex items-center gap-2 bg-white/70 rounded-xl px-4 py-2.5 border border-amber-100">
              <span className="text-xl">🧠</span>
              <p className="text-sm font-semibold text-amber-700 italic">
                Remember: "{feedback.memory_hook}"
              </p>
            </div>
          )}
        </div>

        {/* Dismiss button */}
        <button
          onClick={onDismiss}
          className="w-full py-4 bg-amber-500 text-white text-lg font-bold
            hover:bg-amber-600 active:bg-amber-700 transition-colors"
        >
          Got it! 👍
        </button>
      </div>
    </div>
  );
}
