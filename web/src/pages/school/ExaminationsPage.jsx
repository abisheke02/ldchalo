import React, { useEffect, useState } from 'react';
import api from '../../services/api';

export default function ExaminationsPage() {
  const [exams, setExams]   = useState([]);
  const [adding, setAdding] = useState(false);
  const [form, setForm]     = useState({});

  useEffect(() => {
    api.get('/school/examinations').then((r) => setExams(r.data)).catch(() => {});
  }, []);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const addExam = async () => {
    try {
      await api.post('/school/examinations', form);
      setAdding(false);
      setForm({});
      api.get('/school/examinations').then((r) => setExams(r.data)).catch(() => {});
    } catch { alert('Failed'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Examinations</h1>
        <button className="btn-school" onClick={() => setAdding(true)}>+ New Exam</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {exams.map((e) => (
          <div key={e.id} className="card hover:shadow-md transition-shadow cursor-pointer">
            <p className="font-semibold text-gray-900">{e.name}</p>
            <p className="text-xs text-gray-500 mt-1">{e.exam_type}</p>
            <p className="text-xs text-gray-400 mt-2">
              {e.start_date ? new Date(e.start_date).toLocaleDateString('en-IN') : '—'}
              {e.end_date ? ` — ${new Date(e.end_date).toLocaleDateString('en-IN')}` : ''}
            </p>
          </div>
        ))}
      </div>

      {adding && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-sm space-y-4">
            <h3 className="text-lg font-semibold">New Exam</h3>
            <input className="input" placeholder="Exam name" onChange={set('name')} />
            <select className="input" onChange={set('exam_type')} defaultValue="unit_test">
              <option value="unit_test">Unit Test</option>
              <option value="midterm">Midterm</option>
              <option value="final">Final</option>
            </select>
            <input type="date" className="input" onChange={set('start_date')} />
            <input type="date" className="input" onChange={set('end_date')} />
            <div className="flex gap-3 justify-end">
              <button className="btn-outline" onClick={() => setAdding(false)}>Cancel</button>
              <button className="btn-school" onClick={addExam}>Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
