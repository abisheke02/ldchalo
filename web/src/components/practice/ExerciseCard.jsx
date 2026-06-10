import React, { useState, useEffect } from 'react';

/**
 * ExerciseCard — renders different UIs based on exercise type.
 * Types: letter_recognition, phonics, word_building, number_sense,
 *        counting, arithmetic, tracing, sequencing, reading
 */
export default function ExerciseCard({ exercise, onAnswer, disabled }) {
  const [selected, setSelected] = useState(null);
  const [inputValue, setInputValue] = useState('');
  const [sequenceOrder, setSequenceOrder] = useState([]);

  // Reset state when exercise changes
  useEffect(() => {
    setSelected(null);
    setInputValue('');
    if (exercise?.content?.choices && exercise?.type === 'sequencing') {
      setSequenceOrder([...exercise.content.choices].sort(() => Math.random() - 0.5));
    }
  }, [exercise?.id]);

  const content = exercise?.content || {};
  const choices = content.choices || content.options || [];

  const handleSelect = (answer) => {
    if (disabled) return;
    setSelected(answer);
    setTimeout(() => onAnswer(answer), 300);
  };

  const handleSubmitInput = () => {
    if (disabled || !inputValue.trim()) return;
    onAnswer(inputValue.trim());
  };

  const handleSequenceConfirm = () => {
    if (disabled) return;
    onAnswer(sequenceOrder.join(','));
  };

  const moveItem = (fromIdx, toIdx) => {
    const items = [...sequenceOrder];
    const [moved] = items.splice(fromIdx, 1);
    items.splice(toIdx, 0, moved);
    setSequenceOrder(items);
  };

  // ─── MCQ-based types (letter_recognition, phonics, number_sense, reading) ───
  if (['letter_recognition', 'phonics', 'number_sense', 'reading', 'mcq'].includes(exercise?.type) ||
      (exercise?.type && choices.length > 0 && !['sequencing', 'arithmetic', 'tracing', 'word_building', 'counting'].includes(exercise?.type))) {
    return (
      <div className="w-full animate-fade-in">
        {/* Visual aid / main display */}
        {content.target && (
          <div className="bg-white rounded-2xl shadow-sm border-2 border-indigo-100 p-8 mb-6 text-center">
            <span className="text-6xl font-black text-indigo-700">{content.target}</span>
            {exercise?.type === 'phonics' && (
              <button
                className="block mx-auto mt-3 text-3xl hover:scale-110 transition-transform"
                title="Listen"
                onClick={() => {
                  if (window.speechSynthesis) {
                    const utter = new SpeechSynthesisUtterance(content.target);
                    utter.lang = 'en-IN';
                    utter.rate = 0.75;
                    window.speechSynthesis.speak(utter);
                  }
                }}
              >
                🔊
              </button>
            )}
          </div>
        )}

        {/* Instructions */}
        <h3 className="text-xl font-bold text-gray-700 text-center mb-5">
          {exercise?.instructions || exercise?.title}
        </h3>

        {/* MCQ Options */}
        <div className="grid grid-cols-2 gap-3">
          {choices.map((opt, idx) => (
            <button
              key={idx}
              onClick={() => handleSelect(opt)}
              disabled={disabled}
              className={`
                p-5 rounded-xl text-xl font-bold transition-all duration-200 border-2
                ${selected === opt
                  ? 'bg-indigo-600 text-white border-indigo-600 scale-105 shadow-lg'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-indigo-300 hover:shadow-md'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-95'}
              `}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ─── Counting type ───
  if (exercise?.type === 'counting') {
    const count = content.count || 5;
    const emoji = content.emoji || '⭐';
    return (
      <div className="w-full animate-fade-in">
        <h3 className="text-xl font-bold text-gray-700 text-center mb-4">
          {exercise?.instructions || 'Count the objects!'}
        </h3>
        {/* Objects to count */}
        <div className="bg-white rounded-2xl shadow-sm border-2 border-indigo-100 p-6 mb-6 text-center">
          <div className="flex flex-wrap justify-center gap-2">
            {Array.from({ length: count }).map((_, i) => (
              <span key={i} className="text-4xl animate-bounce" style={{ animationDelay: `${i * 100}ms` }}>
                {emoji}
              </span>
            ))}
          </div>
        </div>
        {/* Number choices */}
        <div className="grid grid-cols-4 gap-3">
          {(choices.length > 0 ? choices : [count - 1, count, count + 1, count + 2]).map((num, idx) => (
            <button
              key={idx}
              onClick={() => handleSelect(String(num))}
              disabled={disabled}
              className={`
                p-4 rounded-xl text-2xl font-black transition-all border-2
                ${selected === String(num)
                  ? 'bg-indigo-600 text-white border-indigo-600 scale-110'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-indigo-300'
                }
                ${disabled ? 'opacity-50' : 'cursor-pointer'}
              `}
            >
              {num}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ─── Arithmetic type ───
  if (exercise?.type === 'arithmetic') {
    const equation = content.equation || content.target || '5 + 3';
    return (
      <div className="w-full animate-fade-in">
        <h3 className="text-xl font-bold text-gray-700 text-center mb-4">
          {exercise?.instructions || 'Solve this!'}
        </h3>
        {/* Equation display */}
        <div className="bg-white rounded-2xl shadow-sm border-2 border-indigo-100 p-8 mb-6 text-center">
          <span className="text-5xl font-black text-indigo-700">{equation} = ?</span>
        </div>
        {/* Number pad or choices */}
        {choices.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {choices.map((num, idx) => (
              <button
                key={idx}
                onClick={() => handleSelect(String(num))}
                disabled={disabled}
                className={`
                  p-5 rounded-xl text-2xl font-black transition-all border-2
                  ${selected === String(num)
                    ? 'bg-indigo-600 text-white border-indigo-600 scale-105'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-indigo-300'
                  }
                  ${disabled ? 'opacity-50' : 'cursor-pointer'}
                `}
              >
                {num}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex gap-3 justify-center">
            <input
              type="number"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="w-24 text-center text-3xl font-bold border-2 border-gray-300 rounded-xl p-3
                focus:border-indigo-500 focus:outline-none"
              placeholder="?"
              disabled={disabled}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmitInput()}
            />
            <button
              onClick={handleSubmitInput}
              disabled={disabled || !inputValue}
              className="px-6 py-3 bg-indigo-600 text-white text-lg font-bold rounded-xl
                hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              ✓
            </button>
          </div>
        )}
      </div>
    );
  }

  // ─── Word building type ───
  if (exercise?.type === 'word_building') {
    const letters = content.letters || content.choices || [];
    return (
      <div className="w-full animate-fade-in">
        <h3 className="text-xl font-bold text-gray-700 text-center mb-4">
          {exercise?.instructions || 'Build the word!'}
        </h3>
        {content.hint && (
          <div className="text-center mb-4 text-lg text-gray-500">Hint: {content.hint}</div>
        )}
        {/* Input area */}
        <div className="flex gap-2 justify-center mb-6">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value.toLowerCase())}
            className="text-center text-2xl font-bold border-2 border-gray-300 rounded-xl px-4 py-3 w-48
              focus:border-indigo-500 focus:outline-none tracking-widest"
            placeholder="Type the word"
            disabled={disabled}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmitInput()}
          />
        </div>
        {/* Letter tiles */}
        <div className="flex flex-wrap justify-center gap-2 mb-4">
          {letters.map((letter, idx) => (
            <button
              key={idx}
              onClick={() => setInputValue(prev => prev + letter)}
              className="w-12 h-12 rounded-lg bg-amber-100 border-2 border-amber-300
                text-xl font-black text-amber-800 hover:bg-amber-200 hover:scale-110
                transition-all active:scale-90"
            >
              {letter}
            </button>
          ))}
        </div>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => setInputValue('')}
            className="px-4 py-2 bg-gray-200 text-gray-600 rounded-lg font-semibold"
          >
            Clear
          </button>
          <button
            onClick={handleSubmitInput}
            disabled={disabled || !inputValue}
            className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg
              hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            Submit ✓
          </button>
        </div>
      </div>
    );
  }

  // ─── Sequencing type ───
  if (exercise?.type === 'sequencing') {
    return (
      <div className="w-full animate-fade-in">
        <h3 className="text-xl font-bold text-gray-700 text-center mb-4">
          {exercise?.instructions || 'Put these in the correct order!'}
        </h3>
        <div className="space-y-2 mb-6">
          {sequenceOrder.map((item, idx) => (
            <div key={idx} className="flex items-center gap-3 bg-white rounded-xl p-4 border-2 border-gray-200 shadow-sm">
              <span className="w-8 h-8 flex items-center justify-center bg-indigo-100 text-indigo-700 rounded-full font-bold text-sm">
                {idx + 1}
              </span>
              <span className="flex-1 text-lg font-semibold text-gray-700">{item}</span>
              <div className="flex gap-1">
                {idx > 0 && (
                  <button
                    onClick={() => moveItem(idx, idx - 1)}
                    className="w-8 h-8 bg-gray-100 hover:bg-indigo-100 rounded-lg flex items-center justify-center text-lg"
                  >
                    ↑
                  </button>
                )}
                {idx < sequenceOrder.length - 1 && (
                  <button
                    onClick={() => moveItem(idx, idx + 1)}
                    className="w-8 h-8 bg-gray-100 hover:bg-indigo-100 rounded-lg flex items-center justify-center text-lg"
                  >
                    ↓
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={handleSequenceConfirm}
          disabled={disabled}
          className="w-full py-3 bg-indigo-600 text-white text-lg font-bold rounded-xl
            hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          Confirm Order ✓
        </button>
      </div>
    );
  }

  // ─── Tracing type (placeholder canvas) ───
  if (exercise?.type === 'tracing') {
    return (
      <div className="w-full animate-fade-in">
        <h3 className="text-xl font-bold text-gray-700 text-center mb-4">
          {exercise?.instructions || 'Trace the letter!'}
        </h3>
        <div className="bg-white rounded-2xl border-2 border-dashed border-gray-300 p-8 mb-6 text-center relative overflow-hidden">
          {/* Background letter to trace */}
          <span className="text-[120px] font-black text-gray-200 select-none">
            {content.letter || content.target || 'A'}
          </span>
          {/* Canvas placeholder */}
          <div className="absolute inset-0 flex items-center justify-center bg-transparent">
            <p className="text-sm text-gray-400 bg-white/80 px-3 py-1 rounded-full">
              ✏️ Touch to trace (coming soon)
            </p>
          </div>
        </div>
        <button
          onClick={() => handleSelect('traced')}
          disabled={disabled}
          className="w-full py-3 bg-indigo-600 text-white text-lg font-bold rounded-xl
            hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          Done Tracing ✓
        </button>
      </div>
    );
  }

  // ─── Fallback / generic ───
  return (
    <div className="w-full animate-fade-in">
      <h3 className="text-xl font-bold text-gray-700 text-center mb-4">
        {exercise?.instructions || exercise?.title || 'Answer this question'}
      </h3>
      {content.target && (
        <div className="bg-white rounded-2xl shadow-sm border-2 border-indigo-100 p-8 mb-6 text-center">
          <span className="text-4xl font-bold text-gray-800">{content.target}</span>
        </div>
      )}
      {choices.length > 0 ? (
        <div className="grid grid-cols-2 gap-3">
          {choices.map((opt, idx) => (
            <button
              key={idx}
              onClick={() => handleSelect(String(opt))}
              disabled={disabled}
              className={`
                p-5 rounded-xl text-xl font-bold transition-all border-2
                ${selected === String(opt)
                  ? 'bg-indigo-600 text-white border-indigo-600 scale-105'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-indigo-300'
                }
                ${disabled ? 'opacity-50' : 'cursor-pointer'}
              `}
            >
              {opt}
            </button>
          ))}
        </div>
      ) : (
        <div className="flex gap-3 justify-center">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="text-center text-xl font-bold border-2 border-gray-300 rounded-xl px-4 py-3 w-48
              focus:border-indigo-500 focus:outline-none"
            placeholder="Your answer"
            disabled={disabled}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmitInput()}
          />
          <button
            onClick={handleSubmitInput}
            disabled={disabled || !inputValue}
            className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl
              hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            ✓
          </button>
        </div>
      )}
    </div>
  );
}
