import React, { useState } from 'react';
import teacherApi from '../../services/teacherApi';

const EXERCISE_TYPES = [
  { value: 'letter_recognition', label: '🔤 Letter Recognition' },
  { value: 'phonics', label: '🔊 Phonics' },
  { value: 'rhyme_detection', label: '🎵 Rhyming' },
  { value: 'phoneme_blending', label: '🗣️ Sound Blending' },
  { value: 'reading', label: '📖 Reading' },
  { value: 'number_sense', label: '🔢 Number Sense' },
  { value: 'counting', label: '🧮 Counting' },
  { value: 'arithmetic', label: '➕ Arithmetic' },
  { value: 'patterns', label: '🔄 Patterns' },
  { value: 'sequencing', label: '📋 Sequencing' },
  { value: 'writing', label: '✍️ Writing' },
];

export default function ExerciseAssigner({ student, onClose, onAssigned }) {
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [level, setLevel] = useState(student.level || 1);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const toggleType = (type) => {
    setSelectedTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const handleAssign = async () => {
    if (selectedTypes.length === 0) return;
    setLoading(true);
    try {
      await teacherApi.assignExercise(student.id, { types: selectedTypes, level });
      setSuccess(true);
      setTimeout(() => { onAssigned?.(); onClose(); }, 1500);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6" onClick={e => e.stopPropagation()}>
        {success ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-3">✅</div>
            <p className="text-lg font-bold text-gray-800">Exercises Assigned!</p>
            <p className="text-sm text-gray-500 mt-1">{selectedTypes.length} types at Level {level} for {student.name}</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-gray-800">Assign Exercises</h3>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>

            <p className="text-sm text-gray-500 mb-4">
              Assign to <strong>{student.name}</strong>
            </p>

            {/* Level selector */}
            <div className="mb-4">
              <label className="text-xs font-medium text-gray-500 mb-1 block">Level</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(l => (
                  <button key={l} onClick={() => setLevel(l)}
                    className={`w-10 h-10 rounded-lg text-sm font-bold transition-all ${level === l ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                    {l}
                  </button>
                ))}
              </div>
            </div>

            {/* Exercise types */}
            <div className="mb-5">
              <label className="text-xs font-medium text-gray-500 mb-2 block">Exercise Types</label>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                {EXERCISE_TYPES.map(type => (
                  <button key={type.value} onClick={() => toggleType(type.value)}
                    className={`text-left px-3 py-2 rounded-lg text-xs font-medium transition-all border ${
                      selectedTypes.includes(type.value)
                        ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                        : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}>
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Assign button */}
            <button onClick={handleAssign} disabled={selectedTypes.length === 0 || loading}
              className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
              {loading ? 'Assigning...' : `Assign ${selectedTypes.length} Type${selectedTypes.length !== 1 ? 's' : ''} at Level ${level}`}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
