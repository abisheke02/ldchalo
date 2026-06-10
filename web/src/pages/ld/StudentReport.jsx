import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import teacherApi from '../../services/teacherApi';
import ExerciseAssigner from '../../components/teacher/ExerciseAssigner';

const LD_BADGES = {
  dyslexia: { label: 'Dyslexia', color: '#7C3AED' },
  dyscalculia: { label: 'Dyscalculia', color: '#2563EB' },
  dysgraphia: { label: 'Dysgraphia', color: '#EC4899' },
  mixed: { label: 'Mixed', color: '#F59E0B' },
  not_detected: { label: 'No LD', color: '#10B981' },
};

export default function StudentReport() {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAssigner, setShowAssigner] = useState(false);
  const [note, setNote] = useState('');
  const [noteSaved, setNoteSaved] = useState(false);
  const [reminderSent, setReminderSent] = useState(false);

  useEffect(() => {
    teacherApi.getStudentDetail(studentId)
      .then(data => { setStudent(data); setNote(data.notes || ''); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [studentId]);

  const handleSaveNote = async () => {
    await teacherApi.addNote(studentId, note);
    setNoteSaved(true);
    setTimeout(() => setNoteSaved(false), 2000);
  };

  const handleReminder = async () => {
    await teacherApi.sendReminder(studentId);
    setReminderSent(true);
    setTimeout(() => setReminderSent(false), 3000);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  if (!student) return <p className="text-center text-gray-400 py-16">Student not found</p>;

  const badge = LD_BADGES[student.ldType] || LD_BADGES.not_detected;
  const riskColor = student.riskScore > 60 ? '#EF4444' : student.riskScore > 30 ? '#F59E0B' : '#10B981';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back button */}
      <button onClick={() => navigate('/ld/teacher')} className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1">
        ← Back to Class
      </button>

      {/* Student Profile Card */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xl font-bold">
            {student.initials || student.name.split(' ').map(n => n[0]).join('')}
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-800">{student.name}</h1>
            <p className="text-sm text-gray-500">{student.class} • {student.email}</p>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-xs px-3 py-1 rounded-full text-white font-medium" style={{ backgroundColor: badge.color }}>
                {badge.label}
              </span>
              <span className="text-xs text-gray-500">Level {student.level}</span>
              <span className="text-xs font-bold" style={{ color: riskColor }}>Risk: {student.riskScore}/100</span>
              {student.streak > 0 && <span className="text-xs text-orange-500">🔥 {student.streak} day streak</span>}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowAssigner(true)} className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700">
              Assign Exercise
            </button>
            <button onClick={handleReminder} disabled={reminderSent}
              className={`px-4 py-2 text-xs font-semibold rounded-lg ${reminderSent ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
              {reminderSent ? '✓ Sent!' : '📢 Remind'}
            </button>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MiniStat label="Mastery" value={`${student.mastery}%`} icon="📊" />
        <MiniStat label="Total Sessions" value={student.totalSessions} icon="📚" />
        <MiniStat label="Practice Time" value={`${student.totalPracticeMinutes}m`} icon="⏱️" />
        <MiniStat label="Last Practice" value={student.lastPractice === 0 ? 'Today' : `${student.lastPractice}d ago`} icon="📅"
          alert={student.lastPractice >= 5} />
      </div>

      {/* Progress Chart (SVG) */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">📈 Mastery Progress (Last 6 Weeks)</h3>
        <ProgressChart data={student.progressHistory} />
      </div>

      {/* Category Mastery */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">📊 Category Breakdown</h3>
        <div className="space-y-3">
          {Object.entries(student.categoryMastery || {}).map(([cat, value]) => {
            const barColor = value >= 70 ? '#10B981' : value >= 40 ? '#F59E0B' : '#EF4444';
            const trend = value >= 70 ? '↑' : value >= 40 ? '→' : '↓';
            const trendColor = value >= 70 ? 'text-green-500' : value >= 40 ? 'text-gray-400' : 'text-red-500';
            return (
              <div key={cat}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-gray-600 capitalize">{cat.replace(/_/g, ' ')}</span>
                  <span className="flex items-center gap-1">
                    <span className="text-gray-400">{value}%</span>
                    <span className={`font-bold ${trendColor}`}>{trend}</span>
                  </span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${value}%`, backgroundColor: barColor }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Practice Calendar Heatmap */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">📅 Practice Calendar (Last 30 Days)</h3>
        <div className="flex flex-wrap gap-1">
          {(student.practiceDays || []).map((practiced, i) => (
            <div key={i} className={`w-6 h-6 rounded-md ${practiced ? 'bg-green-400' : 'bg-gray-100'}`}
              title={`Day ${i + 1}: ${practiced ? 'Practiced' : 'Missed'}`} />
          ))}
        </div>
        <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
          <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-green-400" /> Practiced</span>
          <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-gray-100" /> Missed</span>
          <span className="ml-auto">{(student.practiceDays || []).filter(d => d).length}/30 days</span>
        </div>
      </div>

      {/* Test Results */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">🎯 Test Results</h3>
        {student.testResults?.length > 0 ? (
          <div className="space-y-2">
            {student.testResults.map((test, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                <div>
                  <span className="text-sm font-medium text-gray-700">Level {test.level} Test</span>
                  <span className="text-xs text-gray-400 ml-2">{test.date}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-gray-700">{test.score}%</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${test.passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {test.passed ? 'PASSED' : 'FAILED'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">No test attempts yet</p>
        )}
      </div>

      {/* Teacher Notes */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">📝 Teacher Notes</h3>
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Add private notes about this student..."
          className="w-full h-24 px-4 py-3 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300"
        />
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-gray-400">{noteSaved ? '✓ Saved!' : 'Private — only you can see this'}</span>
          <button onClick={handleSaveNote} className="px-4 py-1.5 bg-gray-100 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-200">
            Save Note
          </button>
        </div>
      </div>

      {/* Exercise Assigner Modal */}
      {showAssigner && (
        <ExerciseAssigner student={student} onClose={() => setShowAssigner(false)} onAssigned={() => {}} />
      )}
    </div>
  );
}

// ─── Mini Stat ─────────────────────────────────────────────────────
function MiniStat({ icon, label, value, alert = false }) {
  return (
    <div className={`bg-white rounded-xl p-3 border ${alert ? 'border-red-200' : 'border-gray-100'} shadow-sm`}>
      <span className="text-xs text-gray-400">{icon} {label}</span>
      <p className={`text-lg font-bold ${alert ? 'text-red-600' : 'text-gray-800'} mt-0.5`}>{value}</p>
    </div>
  );
}

// ─── Progress Chart (SVG) ──────────────────────────────────────────
function ProgressChart({ data = [] }) {
  if (data.length < 2) return <p className="text-sm text-gray-400">Not enough data</p>;

  const width = 500, height = 150, padding = 30;
  const maxVal = Math.max(...data.map(d => d.mastery), 100);
  const points = data.map((d, i) => ({
    x: padding + (i / (data.length - 1)) * (width - padding * 2),
    y: height - padding - (d.mastery / maxVal) * (height - padding * 2),
  }));
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaD = pathD + ` L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-40">
      {/* Grid lines */}
      {[0, 25, 50, 75, 100].map(v => {
        const y = height - padding - (v / maxVal) * (height - padding * 2);
        return (
          <g key={v}>
            <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="#F3F4F6" strokeWidth="1" />
            <text x={padding - 5} y={y + 4} textAnchor="end" className="text-[9px]" fill="#9CA3AF">{v}%</text>
          </g>
        );
      })}
      {/* Area fill */}
      <path d={areaD} fill="url(#progressGradient)" opacity="0.2" />
      {/* Line */}
      <path d={pathD} fill="none" stroke="#4F46E5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Dots */}
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="4" fill="#4F46E5" stroke="white" strokeWidth="2" />
      ))}
      {/* Date labels */}
      {data.map((d, i) => (
        <text key={i} x={points[i].x} y={height - 8} textAnchor="middle" className="text-[9px]" fill="#9CA3AF">
          {d.date.slice(5)}
        </text>
      ))}
      <defs>
        <linearGradient id="progressGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4F46E5" />
          <stop offset="100%" stopColor="#4F46E5" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
}
