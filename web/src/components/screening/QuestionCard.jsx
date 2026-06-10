import React, { useState, useEffect } from 'react';

const OPTION_COLORS = ['#4F46E5', '#EC4899', '#F59E0B', '#10B981'];

/**
 * QuestionCard — renders different UI based on question_type
 * Types: 'mcq', 'yes_no', 'drag_order'
 */
export default function QuestionCard({ question, onAnswer, disabled }) {
  const [selected, setSelected] = useState(null);
  const [dragItems, setDragItems] = useState(
    question.question_type === 'drag_order' && question.options
      ? [...question.options].sort(() => Math.random() - 0.5)
      : []
  );

  // Reset selected state when question changes (safety net)
  useEffect(() => {
    setSelected(null);
    if (question.question_type === 'drag_order' && question.options) {
      setDragItems([...question.options].sort(() => Math.random() - 0.5));
    }
  }, [question.id || question.order_index]);

  const handleSelect = (answer) => {
    if (disabled) return;
    setSelected(answer);
    onAnswer(answer);
  };

  const handleDragReorder = (fromIdx, toIdx) => {
    const items = [...dragItems];
    const [moved] = items.splice(fromIdx, 1);
    items.splice(toIdx, 0, moved);
    setDragItems(items);
    onAnswer(items.join(','));
  };

  // Parse options from JSONB
  const options = typeof question.options === 'string'
    ? JSON.parse(question.options)
    : question.options || [];

  return (
    <div className="w-full max-w-2xl mx-auto animate-fade-in">
      {/* Question text */}
      <div className="bg-white rounded-2xl shadow-lg p-8 mb-6 border-2 border-indigo-100">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-800 text-center leading-relaxed">
          {question.question_text}
        </h2>
      </div>

      {/* MCQ options */}
      {question.question_type === 'mcq' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {options.map((opt, idx) => (
            <button
              key={idx}
              onClick={() => handleSelect(opt)}
              disabled={disabled}
              className={`
                relative p-5 rounded-xl text-lg font-semibold transition-all duration-200
                border-3 cursor-pointer
                ${selected === opt
                  ? 'bg-indigo-600 text-white border-indigo-600 scale-105 shadow-lg'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-indigo-300 hover:shadow-md hover:scale-[1.02]'
                }
                ${disabled ? 'opacity-60 cursor-not-allowed' : ''}
              `}
            >
              <span className="absolute top-2 left-3 text-sm opacity-60">
                {String.fromCharCode(65 + idx)}
              </span>
              <span className="block text-center text-xl">{opt}</span>
            </button>
          ))}
        </div>
      )}

      {/* Yes/No */}
      {question.question_type === 'yes_no' && (
        <div className="flex gap-6 justify-center">
          <button
            onClick={() => handleSelect('yes')}
            disabled={disabled}
            className={`
              w-40 h-40 rounded-2xl text-2xl font-bold transition-all duration-200
              flex flex-col items-center justify-center gap-2
              ${selected === 'yes'
                ? 'bg-green-500 text-white scale-110 shadow-xl'
                : 'bg-green-50 text-green-700 border-3 border-green-200 hover:bg-green-100 hover:scale-105'
              }
              ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            <span className="text-4xl">👍</span>
            <span>YES</span>
          </button>
          <button
            onClick={() => handleSelect('no')}
            disabled={disabled}
            className={`
              w-40 h-40 rounded-2xl text-2xl font-bold transition-all duration-200
              flex flex-col items-center justify-center gap-2
              ${selected === 'no'
                ? 'bg-red-500 text-white scale-110 shadow-xl'
                : 'bg-red-50 text-red-700 border-3 border-red-200 hover:bg-red-100 hover:scale-105'
              }
              ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            <span className="text-4xl">👎</span>
            <span>NO</span>
          </button>
        </div>
      )}

      {/* Drag to order (simplified with clickable buttons) */}
      {question.question_type === 'drag_order' && (
        <div className="space-y-3">
          <p className="text-center text-gray-500 text-sm mb-4">
            Tap items in the correct order
          </p>
          <div className="flex flex-col gap-3">
            {dragItems.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 p-4 bg-white rounded-xl border-2 border-gray-200 hover:border-indigo-300 cursor-grab active:cursor-grabbing shadow-sm"
              >
                <span className="w-8 h-8 flex items-center justify-center bg-indigo-100 text-indigo-700 rounded-full font-bold text-sm">
                  {idx + 1}
                </span>
                <span className="text-lg font-medium text-gray-700">{item}</span>
                <div className="ml-auto flex gap-1">
                  {idx > 0 && (
                    <button
                      onClick={() => handleDragReorder(idx, idx - 1)}
                      className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center"
                    >
                      ↑
                    </button>
                  )}
                  {idx < dragItems.length - 1 && (
                    <button
                      onClick={() => handleDragReorder(idx, idx + 1)}
                      className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center"
                    >
                      ↓
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={() => onAnswer(dragItems.join(','))}
            disabled={disabled}
            className="w-full mt-4 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
          >
            Confirm Order ✓
          </button>
        </div>
      )}
    </div>
  );
}
