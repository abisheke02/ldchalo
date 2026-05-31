import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './store/authStore';
import Layout from './components/Layout';

// Auth
import LoginPage from './pages/auth/LoginPage';

// School ERP
import SchoolHome        from './pages/school/SchoolHome';
import SchoolDashboard   from './pages/school/DashboardPage';
import StudentsPage      from './pages/school/StudentsPage';
import AttendancePage    from './pages/school/AttendancePage';
import FeesPage          from './pages/school/FeesPage';
import StaffPage         from './pages/school/StaffPage';
import TimetablePage     from './pages/school/TimetablePage';
import AdmissionsPage    from './pages/school/AdmissionsPage';
import ExaminationsPage  from './pages/school/ExaminationsPage';
import CommunicationsPage from './pages/school/CommunicationsPage';
import TransportPage     from './pages/school/TransportPage';
import LibraryPage       from './pages/school/LibraryPage';
import PayrollPage       from './pages/school/PayrollPage';
import ReportsPage       from './pages/school/ReportsPage';
import SettingsPage      from './pages/school/SettingsPage';

// Admin pages
import RoleMasterPage from './pages/school/admin/RoleMasterPage';
import PermissionMatrixPage from './pages/school/admin/PermissionMatrixPage';
import UserMasterPage from './pages/school/admin/UserMasterPage';
import SchoolProfilePage from './pages/school/admin/SchoolProfilePage';
import BranchMasterPage from './pages/school/admin/BranchMasterPage';
import ConfigurationPage from './pages/school/admin/ConfigurationPage';

// Masters pages
import SchoolInfoMasterPage from './pages/school/masters/SchoolInfoMasterPage';
import ClassMasterPage from './pages/school/masters/ClassMasterPage';
import SubjectMasterPage from './pages/school/masters/SubjectMasterPage';
import AcademicYearPage from './pages/school/masters/AcademicYearPage';
import HolidayMasterPage from './pages/school/masters/HolidayMasterPage';
import DemographicMastersPage from './pages/school/masters/DemographicMastersPage';
import TimeConfigPage from './pages/school/masters/TimeConfigPage';

// Fees pages
import FeeCollectionPage from './pages/school/fees/FeeCollectionPage';
import ReceiptListPage from './pages/school/fees/ReceiptListPage';
import ConcessionPage from './pages/school/fees/ConcessionPage';
import RefundPage from './pages/school/fees/RefundPage';
import DayClosurePage from './pages/school/fees/DayClosurePage';

// Communication pages
import GatewayConfigPage from './pages/school/communication/GatewayConfigPage';
import TemplatesPage from './pages/school/communication/TemplatesPage';
import SendMessagePage from './pages/school/communication/SendMessagePage';
import MessageLogPage from './pages/school/communication/MessageLogPage';

// Online Payment
import OnlinePaymentPage from './pages/school/fees/OnlinePaymentPage';

// Report pages
import FeeCollectionReportPage from './pages/school/reports/FeeCollectionReportPage';
import OutstandingReportPage from './pages/school/reports/OutstandingReportPage';
import ConcessionReportPage from './pages/school/reports/ConcessionReportPage';
import AttendanceReportPage from './pages/school/reports/AttendanceReportPage';

// LD Platform
import StudentDashboard  from './pages/ld/StudentDashboard';
import TeacherDashboard  from './pages/ld/TeacherDashboard';
import ParentScorecard   from './pages/ld/ParentScorecard';
import ScreeningPage     from './pages/ld/ScreeningPage';
import PracticePage      from './pages/ld/PracticePage';
import TestsPage         from './pages/ld/TestsPage';
import RecommendationsPage from './pages/ld/RecommendationsPage';

// Admin
import AdminDashboard    from './pages/admin/AdminDashboard';

const PrivateRoute = ({ children, roles }) => {
  const { token, user } = useAuthStore();
  if (!token) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user?.role)) return <Navigate to="/" replace />;
  return children;
};

const HomeRedirect = () => {
  const { user } = useAuthStore();
  const map = {
    super_admin:  '/admin',
    school_admin: '/school/home',
    teacher:      '/school/home',
    parent:       '/ld/parent',
    student:      '/ld/student',
  };
  return <Navigate to={map[user?.role] || '/login'} replace />;
};

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route index element={<HomeRedirect />} />

          {/* School ERP — Module Home */}
          <Route path="school/home"        element={<PrivateRoute roles={['school_admin','teacher','super_admin']}><SchoolHome /></PrivateRoute>} />
          <Route path="school/dashboard"   element={<PrivateRoute roles={['school_admin','teacher','super_admin']}><SchoolDashboard /></PrivateRoute>} />
          <Route path="school/students"    element={<PrivateRoute roles={['school_admin','teacher']}><StudentsPage /></PrivateRoute>} />
          <Route path="school/attendance"  element={<PrivateRoute roles={['school_admin','teacher']}><AttendancePage /></PrivateRoute>} />
          <Route path="school/fees"        element={<PrivateRoute roles={['school_admin','teacher']}><FeesPage /></PrivateRoute>} />
          <Route path="school/staff"       element={<PrivateRoute roles={['school_admin']}><StaffPage /></PrivateRoute>} />
          <Route path="school/timetable"   element={<PrivateRoute roles={['school_admin','teacher']}><TimetablePage /></PrivateRoute>} />
          <Route path="school/admissions"  element={<PrivateRoute roles={['school_admin','teacher']}><AdmissionsPage /></PrivateRoute>} />
          <Route path="school/examinations" element={<PrivateRoute roles={['school_admin','teacher']}><ExaminationsPage /></PrivateRoute>} />
          <Route path="school/communications" element={<PrivateRoute roles={['school_admin','teacher']}><CommunicationsPage /></PrivateRoute>} />
          <Route path="school/transport"   element={<PrivateRoute roles={['school_admin']}><TransportPage /></PrivateRoute>} />
          <Route path="school/library"     element={<PrivateRoute roles={['school_admin','teacher']}><LibraryPage /></PrivateRoute>} />
          <Route path="school/payroll"     element={<PrivateRoute roles={['school_admin']}><PayrollPage /></PrivateRoute>} />
          <Route path="school/reports"     element={<PrivateRoute roles={['school_admin','teacher']}><ReportsPage /></PrivateRoute>} />
          <Route path="school/settings"    element={<PrivateRoute roles={['school_admin','super_admin']}><SettingsPage /></PrivateRoute>} />

          {/* Fees */}
          <Route path="school/fees/collect" element={<PrivateRoute roles={['school_admin','teacher']}><FeeCollectionPage /></PrivateRoute>} />
          <Route path="school/fees/receipts" element={<PrivateRoute roles={['school_admin','teacher']}><ReceiptListPage /></PrivateRoute>} />
          <Route path="school/fees/concessions" element={<PrivateRoute roles={['school_admin']}><ConcessionPage /></PrivateRoute>} />
          <Route path="school/fees/refunds" element={<PrivateRoute roles={['school_admin']}><RefundPage /></PrivateRoute>} />
          <Route path="school/fees/day-closure" element={<PrivateRoute roles={['school_admin']}><DayClosurePage /></PrivateRoute>} />

          {/* Online Payment */}
          <Route path="school/fees/pay-online" element={<PrivateRoute roles={['school_admin','teacher','parent','student']}><OnlinePaymentPage /></PrivateRoute>} />

          {/* Reports */}
          <Route path="school/reports/fee-collection" element={<PrivateRoute roles={['school_admin','teacher']}><FeeCollectionReportPage /></PrivateRoute>} />
          <Route path="school/reports/outstanding" element={<PrivateRoute roles={['school_admin','teacher']}><OutstandingReportPage /></PrivateRoute>} />
          <Route path="school/reports/concessions" element={<PrivateRoute roles={['school_admin']}><ConcessionReportPage /></PrivateRoute>} />
          <Route path="school/reports/attendance" element={<PrivateRoute roles={['school_admin','teacher']}><AttendanceReportPage /></PrivateRoute>} />

          {/* Communication */}
          <Route path="school/communication/gateway" element={<PrivateRoute roles={['school_admin']}><GatewayConfigPage /></PrivateRoute>} />
          <Route path="school/communication/templates" element={<PrivateRoute roles={['school_admin','teacher']}><TemplatesPage /></PrivateRoute>} />
          <Route path="school/communication/send" element={<PrivateRoute roles={['school_admin','teacher']}><SendMessagePage /></PrivateRoute>} />
          <Route path="school/communication/log" element={<PrivateRoute roles={['school_admin']}><MessageLogPage /></PrivateRoute>} />

          {/* Admin */}
          <Route path="school/admin/roles" element={<PrivateRoute roles={['school_admin','super_admin']}><RoleMasterPage /></PrivateRoute>} />
          <Route path="school/admin/permissions" element={<PrivateRoute roles={['school_admin','super_admin']}><PermissionMatrixPage /></PrivateRoute>} />
          <Route path="school/admin/users" element={<PrivateRoute roles={['school_admin','super_admin']}><UserMasterPage /></PrivateRoute>} />
          <Route path="school/admin/school-profile" element={<PrivateRoute roles={['school_admin','super_admin']}><SchoolProfilePage /></PrivateRoute>} />
          <Route path="school/admin/branches" element={<PrivateRoute roles={['school_admin','super_admin']}><BranchMasterPage /></PrivateRoute>} />
          <Route path="school/admin/config" element={<PrivateRoute roles={['school_admin','super_admin']}><ConfigurationPage /></PrivateRoute>} />

          {/* Masters */}
          <Route path="school/masters" element={<PrivateRoute roles={['school_admin','teacher','super_admin']}><SchoolInfoMasterPage /></PrivateRoute>} />
          <Route path="school/masters/classes" element={<PrivateRoute roles={['school_admin','teacher','super_admin']}><ClassMasterPage /></PrivateRoute>} />
          <Route path="school/masters/subjects" element={<PrivateRoute roles={['school_admin','teacher','super_admin']}><SubjectMasterPage /></PrivateRoute>} />
          <Route path="school/masters/academic-year" element={<PrivateRoute roles={['school_admin','super_admin']}><AcademicYearPage /></PrivateRoute>} />
          <Route path="school/masters/holidays" element={<PrivateRoute roles={['school_admin','super_admin']}><HolidayMasterPage /></PrivateRoute>} />
          <Route path="school/masters/demographics" element={<PrivateRoute roles={['school_admin','super_admin']}><DemographicMastersPage /></PrivateRoute>} />
          <Route path="school/masters/time-config" element={<PrivateRoute roles={['school_admin','super_admin']}><TimeConfigPage /></PrivateRoute>} />

          {/* LD Platform */}
          <Route path="ld/student"          element={<PrivateRoute roles={['student']}><StudentDashboard /></PrivateRoute>} />
          <Route path="ld/teacher"          element={<PrivateRoute roles={['teacher','school_admin']}><TeacherDashboard /></PrivateRoute>} />
          <Route path="ld/parent"           element={<PrivateRoute roles={['parent']}><ParentScorecard /></PrivateRoute>} />
          <Route path="ld/screening"        element={<PrivateRoute roles={['student']}><ScreeningPage /></PrivateRoute>} />
          <Route path="ld/practice"         element={<PrivateRoute roles={['student']}><PracticePage /></PrivateRoute>} />
          <Route path="ld/tests"            element={<PrivateRoute roles={['student']}><TestsPage /></PrivateRoute>} />
          <Route path="ld/recommendations"  element={<PrivateRoute roles={['student','teacher','parent']}><RecommendationsPage /></PrivateRoute>} />

          {/* Admin */}
          <Route path="admin" element={<PrivateRoute roles={['super_admin']}><AdminDashboard /></PrivateRoute>} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
