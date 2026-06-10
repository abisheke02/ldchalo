import React, { useEffect, useState } from 'react';
import teacherApi from '../../services/teacherApi';
import StudentCard from '../../components/teacher/StudentCard';
import ClassDistributionChart from '../../components/teacher/ClassDistributionChart';

export default function TeacherDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('lastPractice'); // name, level, riskScore, lastPractice
  const [filterLd, setFilterLd] = useState('all');
  const [filterPractice, setFilterPractice] = useState('all'); // all, active, inactive

  useEffect(() => {
    teacherApi.getClassOverview()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) return <p className="text-center text-gray-400 py-16">No data available</p>;

  // Filter and sort students
  let students = [...(data.students || [])];

  if (filterLd !== 'all') {
    students = students.filter(s => s.ldType === filterLd);
  }
  if (filterPractice === 'active') {
    students = students.filter(s => s.lastPractice <= 1);
  } else if (filterPractice === 'inactive') {
    students = students.filter(s => s.lastPractice >= 5);
  }

  students.sort((a, b) => {
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    if (sortBy === 'level') return b.level - a.level;
    if (sortBy === 'riskScore') return b.riskScore - a.riskScore;
    if (sortBy === 'lastPractice') return b.lastPractice - a.lastPractice; // inactive first
    return 0;
  });

  const atRiskStudents = data.students.filter(s => s.lastPractice >= 5);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">My Class</h1>
          <p className="text-sm text-gray-500">{data.className} • {data.totalStudents} students</p>
        </div>
        <button className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors">
          + Add Student
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon="👥" label="Total Students" value={data.totalStudents} />
        <StatCard icon="📋" label="Screened" value={`${data.screenedCount}/${data.totalStudents}`} color="text-blue-600" />
        <StatCard icon="💪" label="Practicing Today" value={data.practicingToday} color="text-green-600" />
        <StatCard icon="⚠️" label="At Risk" value={data.atRiskCount} color="text-red-600" alert={data.atRiskCount > 0} />
      </div>

      {/* Alerts */}
      {atRiskStudents.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-red-500 font-bold text-sm">🚨 Needs Attention</span>
          </div>
          <p className="text-sm text-red-700 mb-3">
            {atRiskStudents.length} student{atRiskStudents.length > 1 ? 's haven\'t' : ' hasn\'t'} practiced in 5+ days
          </p>
          <div className="flex flex-wrap gap-2">
            {atRiskStudents.map(s => (
              <span key={s.id} className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-medium">
                {s.name} ({s.lastPractice}d)
              </span>
            ))}
          </div>
        </div>
      )}

      {/* LD Distribution */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">LD Distribution</h3>
        <ClassDistributionChart distribution={data.distribution} total={data.totalStudents} />
      </div>

      {/* Filters & Sort */}
      <div className="flex flex-wrap items-center gap-3">
        <select value={sortBy} onChange={e => setSortBy(e.target.value)}
          className="text-xs px-3 py-2 border border-gray-200 rounded-lg bg-white text-gray-600">
          <option value="lastPractice">Sort: Last Practice</option>
          <option value="riskScore">Sort: Risk Score</option>
          <option value="level">Sort: Level</option>
          <option value="name">Sort: Name</option>
        </select>

        <select value={filterLd} onChange={e => setFilterLd(e.target.value)}
          className="text-xs px-3 py-2 border border-gray-200 rounded-lg bg-white text-gray-600">
          <option value="all">All LD Types</option>
          <option value="dyslexia">Dyslexia</option>
          <option value="dyscalculia">Dyscalculia</option>
          <option value="dysgraphia">Dysgraphia</option>
          <option value="mixed">Mixed</option>
          <option value="not_detected">No LD</option>
        </select>

        <select value={filterPractice} onChange={e => setFilterPractice(e.target.value)}
          className="text-xs px-3 py-2 border border-gray-200 rounded-lg bg-white text-gray-600">
          <option value="all">All Students</option>
          <option value="active">Active (today/yesterday)</option>
          <option value="inactive">Inactive (5+ days)</option>
        </select>

        <span className="text-xs text-gray-400 ml-auto">{students.length} shown</span>
      </div>

      {/* Student List */}
      <div className="space-y-2">
        {students.map(student => (
          <StudentCard key={student.id} student={student} />
        ))}
        {students.length === 0 && (
          <p className="text-center text-gray-400 py-8">No students match your filters</p>
        )}
      </div>
    </div>
  );
}

// ─── Stat Card Component ─────────────────────────────────────────────
function StatCard({ icon, label, value, color = 'text-gray-800', alert = false }) {
  return (
    <div className={`bg-white rounded-xl p-4 border ${alert ? 'border-red-200 bg-red-50/50' : 'border-gray-100'} shadow-sm`}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">{icon}</span>
        <span className="text-xs text-gray-500">{label}</span>
      </div>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
    </div>
  );
}
