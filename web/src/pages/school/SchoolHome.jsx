import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import useAuthStore from '../../store/authStore';

const MODULES = [
  { title: 'Dashboard',      sub: 'Analytics & Overview',              icon: '📊', to: '/school/dashboard',      color: '#0891B2', roles: ['school_admin','teacher','super_admin'] },
  { title: 'Administration', sub: 'Settings, Security & Authorization', icon: '⚙️', to: '/school/settings',       color: '#7C3AED', roles: ['school_admin','super_admin'] },
  { title: 'Front Office',   sub: 'Enquiry, Interview & Admission',    icon: '🏢', to: '/school/admissions',     color: '#2563EB', roles: ['school_admin','teacher'] },
  { title: 'Students',       sub: 'Create, Manage & Students',         icon: '👨‍🎓', to: '/school/students',       color: '#059669', roles: ['school_admin','teacher'] },
  { title: 'Staff',          sub: 'Create & Manage Staff',             icon: '👥', to: '/school/staff',          color: '#DC2626', roles: ['school_admin'] },
  { title: 'Fee & Finance',  sub: 'Configure & Collect Fee',           icon: '💰', to: '/school/fees',           color: '#D97706', roles: ['school_admin','teacher'] },
  { title: 'Examination',    sub: 'Configure Exam & Progress Card',    icon: '📝', to: '/school/examinations',   color: '#7C3AED', roles: ['school_admin','teacher'] },
  { title: 'Communication',  sub: 'SMS & Email',                       icon: '💬', to: '/school/communications', color: '#0891B2', roles: ['school_admin','teacher'] },
  { title: 'Timetable',      sub: 'Configure Timetable',               icon: '📅', to: '/school/timetable',     color: '#059669', roles: ['school_admin','teacher'] },
  { title: 'Inventory',      sub: 'Material Request & Issues',         icon: '📦', to: '/school/library',        color: '#B45309', roles: ['school_admin'] },
  { title: 'Attendance',     sub: 'Student & Staff Attendance',        icon: '✅', to: '/school/attendance',    color: '#2563EB', roles: ['school_admin','teacher'] },
  { title: 'Payroll',        sub: 'Generate Salary & Payslips',        icon: '💵', to: '/school/payroll',        color: '#DC2626', roles: ['school_admin'] },
  { title: 'Transport',      sub: 'Manage Bus Routes & Students',      icon: '🚌', to: '/school/transport',      color: '#7C3AED', roles: ['school_admin'] },
  { title: 'Reports',        sub: 'Fee, Exam & Attendance Reports',    icon: '📈', to: '/school/reports',        color: '#059669', roles: ['school_admin','teacher'] },
  { title: 'Digital AI',     sub: 'AI Insights & Automation',          icon: '🤖', to: '/school/ai',             color: '#0891B2', roles: ['school_admin','teacher'] },
];

const StatCard = ({ label, value, icon, color }) => (
  <div style={{ borderLeftColor: color }} className="bg-white rounded-xl p-4 border-l-4 shadow-sm">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-2xl font-bold text-gray-900">{value ?? '—'}</p>
        <p className="text-xs text-gray-500 mt-0.5">{label}</p>
      </div>
      <span className="text-2xl">{icon}</span>
    </div>
  </div>
);

export default function SchoolHome() {
  const { user } = useAuthStore();
  const [stats, setStats]   = useState(null);
  const [school, setSchool] = useState(null);

  useEffect(() => {
    api.get('/analytics/dashboard').then((r) => setStats(r.data)).catch(() => {});
    api.get('/schools/info').then((r) => setSchool(r.data)).catch(() => {});
  }, []);

  const role     = user?.role;
  const visible  = MODULES.filter((m) => !m.roles || m.roles.includes(role));
  const today    = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#0e3a5c] to-[#1a6fa8] text-white px-6 py-5">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <h1 className="text-xl font-bold">{school?.name || 'School Management'}</h1>
            <p className="text-blue-200 text-sm mt-0.5">{today}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium">{user?.name}</p>
              <p className="text-blue-300 text-xs capitalize">{role?.replace('_', ' ')}</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-lg font-bold">
              {(user?.name || 'U')[0]}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          <StatCard label="Total Students"   value={stats?.students}                          icon="👨‍🎓" color="#2563EB" />
          <StatCard label="Present Today"    value={stats?.attendance?.present}               icon="✅"   color="#059669" />
          <StatCard label="Fees Today"       value={`₹${stats?.fees?.collected_today || 0}`} icon="💰"  color="#D97706" />
          <StatCard label="Active Classes"   value={school?.class_count || '—'}               icon="🏫"  color="#7C3AED" />
        </div>

        {/* Module Grid */}
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Modules</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visible.map((mod) => (
            <Link key={mod.to} to={mod.to}
              className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all group overflow-hidden border border-gray-100"
            >
              <div className="flex items-center gap-5 p-5">
                {/* Icon box */}
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl shrink-0 transition-transform group-hover:scale-110"
                  style={{ backgroundColor: mod.color + '15' }}
                >
                  {mod.icon}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-base">{mod.title}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">{mod.sub}</p>
                </div>
              </div>
              {/* Footer bar */}
              <div
                className="px-5 py-2.5 text-xs font-semibold text-white flex items-center gap-1 transition-opacity"
                style={{ backgroundColor: mod.color }}
              >
                Take me In <span className="ml-1">→</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
