import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../services/authStore';

const nav = [
  { to: '/dashboard',    label: 'Dashboard',     icon: '📊' },
  { to: '/admissions',   label: 'Admissions',    icon: '📋' },
  { to: '/students',     label: 'Students',      icon: '🎓' },
  { to: '/staff',        label: 'Staff',         icon: '👥' },
  { to: '/attendance',   label: 'Attendance',    icon: '✅' },
  { to: '/timetable',    label: 'Timetable',     icon: '🗓️' },
  { to: '/examinations', label: 'Examinations',  icon: '📝' },
  { to: '/fees',         label: 'Fees',          icon: '💰' },
  { to: '/reports',      label: 'Reports',       icon: '📈' },
];

export default function Sidebar() {
  const logout = useAuthStore(s => s.logout);
  const user = useAuthStore(s => s.user);

  return (
    <aside className="w-60 bg-primary text-white flex flex-col">
      <div className="p-5 border-b border-blue-800">
        <h1 className="text-xl font-bold">School Mgmt</h1>
        <p className="text-xs text-blue-300 mt-1">{user?.name || 'Admin'}</p>
      </div>

      <nav className="flex-1 py-4">
        {nav.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-5 py-3 text-sm transition-colors ${
                isActive ? 'bg-blue-700 font-semibold' : 'hover:bg-blue-800'
              }`
            }
          >
            <span>{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <button
        onClick={logout}
        className="m-4 py-2 px-4 bg-red-600 hover:bg-red-700 rounded text-sm font-medium"
      >
        Logout
      </button>
    </aside>
  );
}
