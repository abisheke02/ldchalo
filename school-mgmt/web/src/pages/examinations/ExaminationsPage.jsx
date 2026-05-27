import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../services/api';

export default function ExaminationsPage() {
  const [exams, setExams] = useState([]);
  const [rephrase, setRephrase] = useState({ text: '', result: '' });
  const [rephrasing, setRephrasing] = useState(false);

  async function rephraseRemark() {
    if (!rephrase.text) return;
    setRephrasing(true);
    try {
      const { data } = await api.post('/communications/ai/rephrase', { text: rephrase.text, type: 'remark' });
      setRephrase(r => ({ ...r, result: data.rephrased }));
    } catch { toast.error('AI rephrase failed'); }
    finally { setRephrasing(false); }
  }

  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-bold text-gray-800">Examinations & Report Cards</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Features overview */}
        <div className="bg-white rounded-xl shadow p-5 space-y-3">
          <p className="font-semibold text-gray-700">Module Features</p>
          {[
            { icon: '📅', label: 'Exam Planner', desc: 'Term-wise, distributed via parent portal' },
            { icon: '⚡', label: 'Quick Marks Entry', desc: '5 min/student via AnsApp concept' },
            { icon: '🤖', label: 'AI Result Analysis', desc: '360° performance insights' },
            { icon: '📄', label: 'Digital Report Card', desc: 'CBSE/IGCSE formats, downloadable' },
            { icon: '📊', label: 'Performance Chart', desc: 'Auto-generated graphical view' },
            { icon: '✨', label: 'AI-Rephrased Remarks', desc: 'Professional teacher comments' },
          ].map(f => (
            <div key={f.label} className="flex gap-3 items-start">
              <span className="text-xl">{f.icon}</span>
              <div>
                <p className="text-sm font-medium">{f.label}</p>
                <p className="text-xs text-gray-400">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* AI Communication Assistant */}
        <div className="bg-white rounded-xl shadow p-5 space-y-3">
          <p className="font-semibold text-gray-700">AI Communication Assistant</p>
          <p className="text-xs text-gray-400">Rephrase teacher remarks professionally using Claude AI</p>
          <textarea rows={4} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter teacher remark (e.g. 'student is ok but needs to work more')"
            value={rephrase.text} onChange={e => setRephrase(r => ({ ...r, text: e.target.value }))} />
          <button onClick={rephraseRemark} disabled={rephrasing || !rephrase.text}
            className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-blue-900 disabled:opacity-60">
            {rephrasing ? 'Rephrasing...' : 'Rephrase with AI'}
          </button>
          {rephrase.result && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-xs font-semibold text-green-700 mb-1">AI Rephrased:</p>
              <p className="text-sm text-gray-700">{rephrase.result}</p>
            </div>
          )}
        </div>
      </div>

      {/* Grade config reference */}
      <div className="bg-white rounded-xl shadow p-5">
        <p className="font-semibold text-gray-700 mb-3">CBSE Grade Scale</p>
        <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
          {[
            { grade: 'A1', range: '91–100', color: 'bg-green-100 text-green-800' },
            { grade: 'A2', range: '81–90', color: 'bg-green-100 text-green-700' },
            { grade: 'B1', range: '71–80', color: 'bg-blue-100 text-blue-700' },
            { grade: 'B2', range: '61–70', color: 'bg-blue-100 text-blue-600' },
            { grade: 'C1', range: '51–60', color: 'bg-amber-100 text-amber-700' },
            { grade: 'C2', range: '41–50', color: 'bg-amber-100 text-amber-600' },
            { grade: 'D',  range: '33–40', color: 'bg-orange-100 text-orange-700' },
            { grade: 'E',  range: '0–32',  color: 'bg-red-100 text-red-700' },
          ].map(g => (
            <div key={g.grade} className={`rounded-lg p-2 text-center ${g.color}`}>
              <p className="font-bold text-lg">{g.grade}</p>
              <p className="text-xs">{g.range}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
