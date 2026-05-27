import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './services/authStore';
import Layout from './components/Layout';
import LoginPage from './pages/auth/LoginPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import StudentsPage from './pages/students/StudentsPage';
import StaffPage from './pages/staff/StaffPage';
import AdmissionsPage from './pages/admissions/AdmissionsPage';
import AttendancePage from './pages/attendance/AttendancePage';
import TimetablePage from './pages/timetable/TimetablePage';
import ExaminationsPage from './pages/examinations/ExaminationsPage';
import FeesPage from './pages/fees/FeesPage';
import ReportsPage from './pages/reports/ReportsPage';

function ProtectedRoute({ children }) {
  const token = useAuthStore(s => s.token);
  return token ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="students" element={<StudentsPage />} />
        <Route path="staff" element={<StaffPage />} />
        <Route path="admissions" element={<AdmissionsPage />} />
        <Route path="attendance" element={<AttendancePage />} />
        <Route path="timetable" element={<TimetablePage />} />
        <Route path="examinations" element={<ExaminationsPage />} />
        <Route path="fees" element={<FeesPage />} />
        <Route path="reports" element={<ReportsPage />} />
      </Route>
    </Routes>
  );
}
