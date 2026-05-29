import { useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../services/api';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8];

export default function TimetablePage() {
  const [slots, setSlots] = useState([]);
  const [classId, setClassId] = useState('');
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(false);

  async function loadTimetable() {
    if (!classId) return toast.error('Enter a class ID');
    setLoading(true);
    try {
      const { data } = await api.get(`/school/timetable/${classId}`);
      setSlots(data);
    } catch { toast.error('Failed to load timetable'); }
    finally { setLoading(false); }
  }

  async function generateAI() {
    if (!classId) return toast.error('Enter a class ID');
    setGenerating(true);
    try {
      const { data } = await api.post('/school/timetable/generate', {
        academic_year_id: null,
        class_ids: [classId],
      });
      toast.success(`Generated ${data.generated} slots via AI`);
      await loadTimetable();
    } catch { toast.error('AI generation failed'); }
    finally { setGenerating(false); }
  }

  function getSlot(day, period) {
    return slots.find(s => s.day_of_week === day && s.period_number === period);
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-800">Timetable Management</h2>

      <div className="flex gap-3 items-center">
        <input className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-64"
          placeholder="Class ID (UUID)" value={classId} onChange={e => setClassId(e.target.value)} />
        <button onClick={loadTimetable} disabled={loading}
          className="px-4 py-2 bg-gray-700 text-white rounded-lg text-sm hover:bg-gray-800 disabled:opacity-60">
          Load
        </button>
        <button onClick={generateAI} disabled={generating}
          className="px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-blue-900 disabled:opacity-60">
          {generating ? 'Generating with AI...' : 'AI Auto-Generate'}
        </button>
      </div>

      {slots.length > 0 && (
        <div className="bg-white rounded-xl shadow overflow-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-primary text-white">
                <th className="px-4 py-3 text-left">Day</th>
                {PERIODS.map(p => <th key={p} className="px-3 py-3">Period {p}</th>)}
              </tr>
            </thead>
            <tbody>
              {DAYS.map((day, di) => (
                <tr key={day} className={di % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-4 py-3 font-semibold text-gray-700">{day}</td>
                  {PERIODS.map(p => {
                    const slot = getSlot(di + 1, p);
                    return (
                      <td key={p} className="px-2 py-2 text-center border border-gray-100">
                        {slot ? (
                          <div className="bg-blue-50 rounded p-1">
                            <p className="font-semibold text-blue-800">{slot.subject_name}</p>
                            <p className="text-gray-500 text-xs">{slot.teacher_name}</p>
                          </div>
                        ) : (
                          <span className="text-gray-300">â€”</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!slots.length && !loading && (
        <div className="bg-white rounded-xl shadow p-10 text-center text-gray-400">
          Enter a class ID and click Load or AI Auto-Generate
        </div>
      )}
    </div>
  );
}
