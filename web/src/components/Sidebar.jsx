import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import useAuthStore from '../store/authStore';

const SCHOOL_NAV = [
  { to: '/school/home',          label: 'Home',           icon: '🏠', end: true },
  { to: '/school/dashboard',     label: 'Dashboard',      icon: '📊' },
  { to: '/school/settings',      label: 'Administration', icon: '⚙️', roles: ['school_admin','super_admin'] },
  { to: '/school/masters',       label: 'Masters',        icon: '📋', roles: ['school_admin','super_admin'] },
  { to: '/school/admin/users',   label: 'User Mgmt',      icon: '👤', roles: ['school_admin','super_admin'] },
  { to: '/school/admissions',    label: 'Front Office',   icon: '🏢' },
  { to: '/school/students',      label: 'Students',       icon: '👨‍🎓' },
  { to: '/school/staff',         label: 'Staff',          icon: '👥', roles: ['school_admin','super_admin'] },
  { to: '/school/fees',          label: 'Fee & Finance',  icon: '💰' },
  { to: '/school/examinations',  label: 'Examination',    icon: '📝' },
  { to: '/school/communication/send', label: 'Communication', icon: '💬' },
  { to: '/school/timetable',     label: 'Timetable',      icon: '📅' },
  { to: '/school/library',       label: 'Library',        icon: '📚' },
  { to: '/school/attendance',    label: 'Attendance',     icon: '✅' },
  { to: '/school/payroll',       label: 'Payroll',        icon: '💵', roles: ['school_admin','super_admin'] },
  { to: '/school/transport',     label: 'Transport',      icon: '🚌', roles: ['school_admin','super_admin'] },
  { to: '/school/reports',       label: 'Reports',        icon: '📈' },
];

const LD_NAV = [
  { to: '/ld/student',         label: 'My Dashboard',  icon: '🏠', roles: ['student'] },
  { to: '/ld/teacher',         label: 'My Class',      icon: '👩‍🏫', roles: ['teacher','school_admin'] },
  { to: '/ld/parent',          label: 'My Child',      icon: '👨‍👩‍👧', roles: ['parent'] },
  { to: '/ld/screening',       label: 'Screening',     icon: '🔍', roles: ['student'] },
  { to: '/ld/practice',        label: 'Practice',      icon: '📚', roles: ['student'] },
  { to: '/ld/tests',           label: 'Tests',         icon: '📝', roles: ['student'] },
  { to: '/ld/recommendations', label: 'Tips',          icon: '💡', roles: ['student','teacher','parent'] },
];

const NavItem = ({ to, label, icon, end = false }) => (
  <NavLink to={to} end={end}
    className={({ isActive }) =>
      `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
        isActive
          ? 'bg-[#0891B2]/10 text-[#0891B2]'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      }`
    }
  >
    <span className="text-base w-5 text-center">{icon}</span>
    <span>{label}</span>
  </NavLink>
);

export default function Sidebar({ open }) {
  const { user } = useAuthStore();
  const role     = user?.role;
  const loc      = useLocation();

  const showSchool = ['school_admin', 'teacher', 'super_admin'].includes(role);
  const showLD     = ['student', 'teacher', 'parent', 'school_admin'].includes(role);
  const showAdmin  = role === 'super_admin';
  const isSchoolSection = loc.pathname.startsWith('/school');

  if (!open) {
    return (
      <aside className="w-14 bg-white border-r border-gray-200 flex flex-col items-center py-4 gap-3 shrink-0">
        <span className="text-xl">📖</span>
        {(showSchool ? SCHOOL_NAV : LD_NAV).slice(0, 8).map((n) => (
          <NavLink key={n.to} to={n.to} title={n.label}
            className={({ isActive }) => `w-9 h-9 rounded-lg flex items-center justify-center text-base transition-colors ${isActive ? 'bg-[#0891B2]/10 text-[#0891B2]' : 'text-gray-500 hover:bg-gray-100'}`}
          >
            {n.icon}
          </NavLink>
        ))}
      </aside>
    );
  }

  return (
    <aside className="w-56 bg-white border-r border-gray-200 flex flex-col shrink-0 overflow-hidden">
      {/* Logo */}
      <div className="h-14 flex items-center gap-2.5 px-4 border-b border-gray-200 bg-[#0e3a5c]">
        <span className="text-xl">📖</span>
        <div>
          <p className="text-white font-bold text-sm leading-tight">LD Schools</p>
          <p className="text-blue-300 text-xs">Learning Disability Platform</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-5">
        {showSchool && (
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 px-3">School ERP</p>
            <div className="space-y-0.5">
              {SCHOOL_NAV.filter((n) => !n.roles || n.roles.includes(role)).map((n) => (
                <NavItem key={n.to} {...n} />
              ))}
            </div>
          </div>
        )}

        {showLD && (
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 px-3">LD Platform</p>
            <div className="space-y-0.5">
              {LD_NAV.filter((n) => !n.roles || n.roles.includes(role)).map((n) => (
                <NavItem key={n.to} {...n} />
              ))}
            </div>
          </div>
        )}

        {showAdmin && (
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 px-3">Super Admin</p>
            <NavItem to="/admin" label="Admin Overview" icon="⚙️" />
          </div>
        )}
      </nav>

      {/* Bottom info */}
      <div className="p-3 border-t border-gray-100">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50">
          <div className="w-7 h-7 rounded-full bg-[#0891B2] flex items-center justify-center text-white text-xs font-bold shrink-0">
            {(user?.name || 'U')[0]}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-gray-900 truncate">{user?.name || 'User'}</p>
            <p className="text-[10px] text-gray-400 capitalize">{role?.replace('_', ' ')}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
