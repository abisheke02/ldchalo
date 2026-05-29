import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import useAuthStore from './services/authStore';

import LoginPage from './pages/auth/LoginPage';
import OnboardingWizard from './pages/onboarding/OnboardingWizard';
import DashboardPage from './pages/dashboard/DashboardPage';
import ClassDetailPage from './pages/dashboard/ClassDetailPage';
import StudentDetailPage from './pages/dashboard/StudentDetailPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminCMS from './pages/admin/AdminCMS';
import AdminSchoolPage from './pages/admin/AdminSchoolPage';
import StudentInvitePage from './pages/auth/StudentInvitePage';
import ParentScorecard from './pages/parent/ParentScorecard';
import MessagingPage from './pages/messages/MessagingPage';
import StudentDashboardWeb from './pages/student/StudentDashboardWeb';
import StudentTestSpace from './pages/student/StudentTestSpace';
import StudentScreeningPage from './pages/student/StudentScreeningPage';
import SchoolSettingsPage from './pages/settings/SchoolSettingsPage';
import InviteAcceptPage from './pages/onboarding/InviteAcceptPage';

const HOME_BY_ROLE = { student: '/student', parent: '/parent', admin: '/admin' };

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { token, user } = useAuthStore();
  if (!token) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    const home = HOME_BY_ROLE[user?.role] || '/dashboard';
    return <Navigate to={home} replace />;
  }
  // Redirect teachers with no school to onboarding (except if already there)
  if (allowedRoles?.includes('teacher') && user?.role === 'teacher' && !user?.school_id) {
    return <Navigate to="/onboarding" replace />;
  }
  return children;
};

const App = () => (
  <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 3500,
        style: { borderRadius: '12px', fontWeight: 600 },
      }}
    />
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/invite/:token" element={<InviteAcceptPage />} />
      <Route path="/student-invite/:token" element={<StudentInvitePage />} />

      {/* Teacher onboarding — shown when no school_id yet */}
      <Route
        path="/onboarding"
        element={
          <ProtectedRoute allowedRoles={['teacher', 'admin', 'student']}>
            <OnboardingWizard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute allowedRoles={['teacher', 'admin']}>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/classes/:classId"
        element={
          <ProtectedRoute allowedRoles={['teacher', 'admin']}>
            <ClassDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/students/:studentId"
        element={
          <ProtectedRoute allowedRoles={['teacher', 'admin']}>
            <StudentDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute allowedRoles={['teacher', 'admin']}>
            <SchoolSettingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/messages"
        element={
          <ProtectedRoute allowedRoles={['teacher', 'parent']}>
            <MessagingPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/cms"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminCMS />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/schools/:schoolId"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminSchoolPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/parent"
        element={
          <ProtectedRoute allowedRoles={['parent']}>
            <ParentScorecard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student"
        element={
          <ProtectedRoute allowedRoles={['student']}>
            <StudentDashboardWeb />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/screening"
        element={
          <ProtectedRoute allowedRoles={['student']}>
            <StudentScreeningPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/tests"
        element={
          <ProtectedRoute allowedRoles={['student']}>
            <StudentTestSpace />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  </BrowserRouter>
);

export default App;
