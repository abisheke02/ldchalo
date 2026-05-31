import React, { useEffect, useState } from 'react';
import api from '../../services/api';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function TimetablePage() {
  const [classes, setClasses] = useState([]);
  const [classId, setClassId] = useState('');
  const [slots, setSlots]     = useState([]);

  useEffect(() => {
    api.get('/schools/classes').then((r) => setClasses(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!classId) return;
    api.get(`/school/timetable/${classId}`).then((r) => setSlots(r.data)).catch(() => {});
  }, [classId]);

  const grid = {};
  for (let d = 1; d <= 6; d++) {
    grid[d] = {};
    for (let p = 1; p <= 8; p++) grid[d][p] = null;
  }
  slots.forEach((s) => { if (grid[s.day_of_week]) grid[s.day_of_week][s.period_number] = s; });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Timetable</h1>

      <div className="flex items-center gap-4">
        <select className="input w-52" value={classId} onChange={(e) => setClassId(e.target.value)}>
          <option value="">Select class…</option>
          {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {classId && (
        <div className="card overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr>
                <th className="p-2 text-gray-400 font-medium">Period</th>
                {DAYS.map((d) => <th key={d} className="p-2 text-gray-700 font-semibold text-center">{d}</th>)}
              </tr>
            </thead>
            <tbody>
              {[1,2,3,4,5,6,7,8].map((p) => (
                <tr key={p} className="border-t border-gray-100">
                  <td className="p-2 text-gray-400 font-medium text-center">{p}</td>
                  {[1,2,3,4,5,6].map((d) => {
                    const slot = grid[d]?.[p];
                    return (
                      <td key={d} className="p-1">
                        {slot ? (
                          <div className="bg-indigo-50 rounded p-2 text-center">
                            <p className="font-semibold text-indigo-700">{slot.subject_name || '—'}</p>
                            <p className="text-gray-400 text-xs">{slot.teacher_name || ''}</p>
                          </div>
                        ) : (
                          <div className="h-12 rounded bg-gray-50 border border-dashed border-gray-200" />
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
    </div>
  );
}
