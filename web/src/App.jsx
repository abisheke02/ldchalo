import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './store/authStore';
import Layout from './components/Layout';
import LoginPage from './pages/auth/LoginPage';

// ─── Loading spinner ──────────────────────────────────────────────────────────
const Spinner = () => (
  <div className="flex items-center justify-center h-full min-h-[300px]">
    <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
  </div>
);

// ─── Helper: lazy-load a named export from a file ────────────────────────────
const lazyNamed = (importFn, name) => lazy(() =>
  importFn().then(m => ({ default: m[name] || (() => <div className="p-8 text-gray-400">Page coming soon: {name}</div>) }))
);

// ─── Dashboard ───────────────────────────────────────────────────────────────
const SchoolDashboard = lazy(() => import('./pages/school/DashboardPage'));

// ─── LD Platform ─────────────────────────────────────────────────────────────
const StudentDashboard    = lazy(() => import('./pages/ld/StudentDashboard'));
const TeacherDashboard    = lazy(() => import('./pages/ld/TeacherDashboard'));
const ParentScorecard     = lazy(() => import('./pages/ld/ParentScorecard'));
const ScreeningPage       = lazy(() => import('./pages/ld/ScreeningPage'));
const PracticePage        = lazy(() => import('./pages/ld/PracticePage'));
const TestsPage           = lazy(() => import('./pages/ld/TestsPage'));
const RecommendationsPage = lazy(() => import('./pages/ld/RecommendationsPage'));
const AdminDashboard      = lazy(() => import('./pages/admin/AdminDashboard'));

// ─── Administration: Academic Masters ────────────────────────────────────────
const I_acad = () => import('./pages/administration/academic/AcademicMasters');
const AttendanceReasonMasterPage    = lazyNamed(I_acad, 'AttendanceReasonMasterPage');
const ChecklistMasterPage           = lazyNamed(I_acad, 'ChecklistMasterPage');
const ClassMasterPage               = lazyNamed(I_acad, 'ClassMasterPage');
const ClassSectionMappingPage       = lazyNamed(I_acad, 'ClassSectionMappingPage');
const ClassSubjectMappingPage       = lazyNamed(I_acad, 'ClassSubjectMappingPage');
const HouseMasterPage               = lazyNamed(I_acad, 'HouseMasterPage');
const ImmigrationStatusMasterPage   = lazyNamed(I_acad, 'ImmigrationStatusMasterPage');
const LevelMasterPage               = lazyNamed(I_acad, 'LevelMasterPage');
const SectionMasterPage             = lazyNamed(I_acad, 'SectionMasterPage');
const StreamMasterPage              = lazyNamed(I_acad, 'StreamMasterPage');
const StudentFeeCategoryMasterPage  = lazyNamed(I_acad, 'StudentFeeCategoryMasterPage');
const SubjectCombinationPage        = lazyNamed(I_acad, 'SubjectCombinationPage');
const SubjectMasterAdminPage        = lazyNamed(I_acad, 'SubjectMasterAdminPage');
const SubjectTypeMasterPage         = lazyNamed(I_acad, 'SubjectTypeMasterPage');
const TermMasterPage                = lazyNamed(I_acad, 'TermMasterPage');

// ─── Administration: Demographic Masters ─────────────────────────────────────
const I_demo = () => import('./pages/administration/demographic/DemographicMasters');
const CasteMasterPage         = lazyNamed(I_demo, 'CasteMasterPage');
const CityMasterPage          = lazyNamed(I_demo, 'CityMasterPage');
const CommunityMasterPage     = lazyNamed(I_demo, 'CommunityMasterPage');
const CountryMasterPage       = lazyNamed(I_demo, 'CountryMasterPage');
const DistrictMasterPage      = lazyNamed(I_demo, 'DistrictMasterPage');
const MotherTongueMasterPage  = lazyNamed(I_demo, 'MotherTongueMasterPage');
const NationalityMasterPage   = lazyNamed(I_demo, 'NationalityMasterPage');
const ReligionMasterPage      = lazyNamed(I_demo, 'ReligionMasterPage');
const StateMasterPage         = lazyNamed(I_demo, 'StateMasterPage');

// ─── Administration: Preliminary Masters ─────────────────────────────────────
const I_pre = () => import('./pages/administration/preliminary/PreliminaryMasters');
const AdmissionCategoryPage = lazyNamed(I_pre, 'AdmissionCategoryPage');
const AdmissionPriorityPage = lazyNamed(I_pre, 'AdmissionPriorityPage');
const AdmissionTypePage     = lazyNamed(I_pre, 'AdmissionTypePage');
const CallCategoryPage      = lazyNamed(I_pre, 'CallCategoryPage');
const CallPurposePage       = lazyNamed(I_pre, 'CallPurposePage');
const CallStatusPage        = lazyNamed(I_pre, 'CallStatusPage');
const EnquiryModePage       = lazyNamed(I_pre, 'EnquiryModePage');
const EnquirySourcePage     = lazyNamed(I_pre, 'EnquirySourcePage');
const EnquiryStatusPage     = lazyNamed(I_pre, 'EnquiryStatusPage');
const StaffDesignationPage  = lazyNamed(I_pre, 'StaffDesignationPage');
const StaffTypePage         = lazyNamed(I_pre, 'StaffTypePage');

// ─── Administration: School Configuration ────────────────────────────────────
const I_cfg = () => import('./pages/administration/config/SchoolConfigPages');
const SchoolMasterPage               = lazyNamed(I_cfg, 'SchoolMasterPage');
const BranchMasterAdminPage          = lazyNamed(I_cfg, 'BranchMasterAdminPage');
const BranchMasterConfigPage         = lazyNamed(I_cfg, 'BranchMasterConfigPage');
const BlockConfigPage                = lazyNamed(I_cfg, 'BlockConfigPage');
const CompanyMasterPage              = lazyNamed(I_cfg, 'CompanyMasterPage');
const ConfigurationMasterPage        = lazyNamed(I_cfg, 'ConfigurationMasterPage');
const EventMasterPage                = lazyNamed(I_cfg, 'EventMasterPage');
const HolidayMasterAdminPage         = lazyNamed(I_cfg, 'HolidayMasterAdminPage');
const OnlinePaymentConfigPage        = lazyNamed(I_cfg, 'OnlinePaymentConfigPage');
const StorageConfigPage              = lazyNamed(I_cfg, 'StorageConfigPage');
const WhatsappConfigPage             = lazyNamed(I_cfg, 'WhatsappConfigPage');
const StudentProfileVerificationPage = lazyNamed(I_cfg, 'StudentProfileVerificationPage');
const UsageAnalyticsReportPage       = lazyNamed(I_cfg, 'UsageAnalyticsReportPage');

// ─── Administration: Auth pages ───────────────────────────────────────────────
const RoleMasterPage       = lazy(() => import('./pages/school/admin/RoleMasterPage'));
const PermissionMatrixPage = lazy(() => import('./pages/school/admin/PermissionMatrixPage'));
const UserMasterPage       = lazy(() => import('./pages/school/admin/UserMasterPage'));

// ─── Administration: Reports ──────────────────────────────────────────────────
const I_arep = () => import('./pages/administration/reports/AdminReports');
const BranchNonLoggedReportPage        = lazyNamed(I_arep, 'BranchNonLoggedReportPage');
const BranchLoginStatusReportPage      = lazyNamed(I_arep, 'BranchLoginStatusReportPage');
const HomeworkDeviationReportPage      = lazyNamed(I_arep, 'HomeworkDeviationReportPage');
const HomeworkDeviationStatusPage      = lazyNamed(I_arep, 'HomeworkDeviationStatusPage');
const HomeworkPostingStatusPage        = lazyNamed(I_arep, 'HomeworkPostingStatusPage');
const PortalUserMasterReportPage       = lazyNamed(I_arep, 'PortalUserMasterReportPage');
const ProgressCardStatusReportPage     = lazyNamed(I_arep, 'ProgressCardStatusReportPage');
const AttendancePostingStatusReportPage= lazyNamed(I_arep, 'AttendancePostingStatusReportPage');
const UserMasterReportPage             = lazyNamed(I_arep, 'UserMasterReportPage');

// ─── Attendance ───────────────────────────────────────────────────────────────
const StudentAttendanceEntry = lazy(() => import('./pages/attendance/StudentAttendanceEntry'));
const StaffAttendanceEntry   = lazy(() => import('./pages/attendance/StaffAttendanceEntry'));
const LeaveRequestPage       = lazy(() => import('./pages/attendance/LeaveRequestPage'));
const LeaveApprovalPage      = lazy(() => import('./pages/attendance/LeaveApprovalPage'));
const AttendanceDashboard    = lazy(() => import('./pages/attendance/AttendanceDashboard'));

const I_attrep = () => import('./pages/attendance/reports/AttendanceReports');
const StudentAttendanceSummaryPage  = lazyNamed(I_attrep, 'StudentAttendanceSummaryPage');
const AttendanceSummaryPctPage      = lazyNamed(I_attrep, 'AttendanceSummaryPctPage');
const BlockWiseSummaryPage          = lazyNamed(I_attrep, 'BlockWiseSummaryPage');
const DatewiseClassAttendancePage   = lazyNamed(I_attrep, 'DatewiseClassAttendancePage');
const MonthlyStudentAttendancePage  = lazyNamed(I_attrep, 'MonthlyStudentAttendancePage');
const MonthwiseStudentAttendancePage= lazyNamed(I_attrep, 'MonthwiseStudentAttendancePage');
const OverallMonthlyAttendancePage  = lazyNamed(I_attrep, 'OverallMonthlyAttendancePage');
const StudentAbsentSummaryPage      = lazyNamed(I_attrep, 'StudentAbsentSummaryPage');
const StudentAttendancePage         = lazyNamed(I_attrep, 'StudentAttendancePage');
const StudentAttendanceAnalysisPage = lazyNamed(I_attrep, 'StudentAttendanceAnalysisPage');
const StudentSummaryAbsentPage      = lazyNamed(I_attrep, 'StudentSummaryAbsentPage');
const WeeklyAttendancePage          = lazyNamed(I_attrep, 'WeeklyAttendancePage');
const YearlyStudentAttendancePage   = lazyNamed(I_attrep, 'YearlyStudentAttendancePage');
const StaffConsolidatedReportPage   = lazyNamed(I_attrep, 'StaffConsolidatedReportPage');
const MonthlyStaffAttendancePage    = lazyNamed(I_attrep, 'MonthlyStaffAttendancePage');
const MonthlyStaffSummaryPage       = lazyNamed(I_attrep, 'MonthlyStaffSummaryPage');
const StaffAbsentSummaryPage        = lazyNamed(I_attrep, 'StaffAbsentSummaryPage');
const StaffAttendancePage           = lazyNamed(I_attrep, 'StaffAttendancePage');
const StaffConsolidatedAttendancePage=lazyNamed(I_attrep, 'StaffConsolidatedAttendancePage');
const StaffSummaryAbsentPage        = lazyNamed(I_attrep, 'StaffSummaryAbsentPage');
const FollowUpRegisterPage          = lazyNamed(I_attrep, 'FollowUpRegisterPage');
const ClasswiseDailyPage            = lazyNamed(I_attrep, 'ClasswiseDailyPage');
const MonthlyAttendanceStatusPage   = lazyNamed(I_attrep, 'MonthlyAttendanceStatusPage');
const MonthlyYearlyConsolidatedPage = lazyNamed(I_attrep, 'MonthlyYearlyConsolidatedPage');
const SectionwiseDailyPage          = lazyNamed(I_attrep, 'SectionwiseDailyPage');

// ─── Front Office ─────────────────────────────────────────────────────────────
const EnquiryCallsPage      = lazy(() => import('./pages/frontoffice/EnquiryCallsPage'));
const ApplicationEntryPage  = lazy(() => import('./pages/frontoffice/ApplicationEntryPage'));
const SectionAllocationPage = lazy(() => import('./pages/frontoffice/SectionAllocationPage'));

const I_forep = () => import('./pages/frontoffice/reports/FrontOfficeReports');
const ApplicantSiblingsReportPage  = lazyNamed(I_forep, 'ApplicantSiblingsReportPage');
const ApplicationListReportPage    = lazyNamed(I_forep, 'ApplicationListReportPage');
const CallRegisterReportPage       = lazyNamed(I_forep, 'CallRegisterReportPage');
const EnquiryStatusReportPage      = lazyNamed(I_forep, 'EnquiryStatusReportPage');
const EnquiryListReportPage        = lazyNamed(I_forep, 'EnquiryListReportPage');
const DraftApplicationReportPage   = lazyNamed(I_forep, 'DraftApplicationReportPage');
const GatePassReportPage           = lazyNamed(I_forep, 'GatePassReportPage');

// ─── Staff ────────────────────────────────────────────────────────────────────
const StaffInformationPage  = lazy(() => import('./pages/staff/management/StaffInformationPage'));
const SubjectAllocationPage = lazy(() => import('./pages/staff/management/SubjectAllocationPage'));

const I_sact = () => import('./pages/staff/academic/AcademicActivities');
const CircularEntryPage      = lazyNamed(I_sact, 'CircularEntryPage');
const HomeworkAssignmentPage = lazyNamed(I_sact, 'HomeworkAssignmentPage');
const NotesOfLessonPage      = lazyNamed(I_sact, 'NotesOfLessonPage');
const SpecialClassesPage     = lazyNamed(I_sact, 'SpecialClassesPage');

const I_sperf = () => import('./pages/staff/performance/StaffPerformancePages');
const EvaluationCriteriaPage = lazyNamed(I_sperf, 'EvaluationCriteriaPage');
const EvaluationMasterPage   = lazyNamed(I_sperf, 'EvaluationMasterPage');
const ObservationMasterPage  = lazyNamed(I_sperf, 'ObservationMasterPage');
const RatingMasterPage       = lazyNamed(I_sperf, 'RatingMasterPage');
const EvaluationEntryPage    = lazyNamed(I_sperf, 'EvaluationEntryPage');

const I_srep = () => import('./pages/staff/reports/StaffReports');
const StaffListReportPage           = lazyNamed(I_srep, 'StaffListReportPage');
const StaffBirthdayReportPage       = lazyNamed(I_srep, 'StaffBirthdayReportPage');
const StaffAllocationReportPage     = lazyNamed(I_srep, 'StaffAllocationReportPage');
const AnnualLessonPlanReportPage    = lazyNamed(I_srep, 'AnnualLessonPlanReportPage');
const AppointmentDetailsReportPage  = lazyNamed(I_srep, 'AppointmentDetailsReportPage');
const OverallStaffDetailsReportPage = lazyNamed(I_srep, 'OverallStaffDetailsReportPage');
const RelievingDetailsReportPage    = lazyNamed(I_srep, 'RelievingDetailsReportPage');
const RetirementDetailsReportPage   = lazyNamed(I_srep, 'RetirementDetailsReportPage');
const ServiceExtensionReportPage    = lazyNamed(I_srep, 'ServiceExtensionReportPage');

// ─── Student ──────────────────────────────────────────────────────────────────
const I_smgmt = () => import('./pages/student/management/StudentManagementPages');
const StudentInformationPage  = lazyNamed(I_smgmt, 'StudentInformationPage');
const ClassSectionChangePage  = lazyNamed(I_smgmt, 'ClassSectionChangePage');
const RollNoAllocationPage    = lazyNamed(I_smgmt, 'RollNoAllocationPage');
const StudentPromotionPage    = lazyNamed(I_smgmt, 'StudentPromotionPage');
const TCRequestPage           = lazyNamed(I_smgmt, 'TCRequestPage');
const StudentIdCardPage       = lazyNamed(I_smgmt, 'StudentIdCardPage');

const I_scert = () => import('./pages/student/certificates/CertificatePages');
const CertificateTemplatePage  = lazyNamed(I_scert, 'CertificateTemplatePage');
const BonafideCertificatePage  = lazyNamed(I_scert, 'BonafideCertificatePage');
const AttendanceCertificatePage= lazyNamed(I_scert, 'AttendanceCertificatePage');
const ConductCertificatePage   = lazyNamed(I_scert, 'ConductCertificatePage');
const CourseCompletionCertPage = lazyNamed(I_scert, 'CourseCompletionCertPage');
const FeeCertificatePage       = lazyNamed(I_scert, 'FeeCertificatePage');
const StudyCertificatePage     = lazyNamed(I_scert, 'StudyCertificatePage');

const I_srpts = () => import('./pages/student/reports/StudentReports');
const StudentListReportPage          = lazyNamed(I_srpts, 'StudentListReportPage');
const StudentAdmissionListPage       = lazyNamed(I_srpts, 'StudentAdmissionListPage');
const StudentAvailabilityPage        = lazyNamed(I_srpts, 'StudentAvailabilityPage');
const StudentBirthdayReportPage      = lazyNamed(I_srpts, 'StudentBirthdayReportPage');
const StudentStrengthPage            = lazyNamed(I_srpts, 'StudentStrengthPage');
const StudentStrengthReportPage      = lazyNamed(I_srpts, 'StudentStrengthReportPage');
const StudentParticipationReportPage = lazyNamed(I_srpts, 'StudentParticipationReportPage');
const GenderWiseAttendancePage       = lazyNamed(I_srpts, 'GenderWiseAttendancePage');
const HostelStudentsListPage         = lazyNamed(I_srpts, 'HostelStudentsListPage');
const PrevSchoolMarksPage            = lazyNamed(I_srpts, 'PrevSchoolMarksPage');
const PromotionCancellationPage      = lazyNamed(I_srpts, 'PromotionCancellationPage');
const PromotionStatusPage            = lazyNamed(I_srpts, 'PromotionStatusPage');
const SiblingDetailsPage             = lazyNamed(I_srpts, 'SiblingDetailsPage');
const StaffStudentReportPage         = lazyNamed(I_srpts, 'StaffStudentReportPage');
const TCIssuedStudentPage            = lazyNamed(I_srpts, 'TCIssuedStudentPage');
const TransportStudentsPage          = lazyNamed(I_srpts, 'TransportStudentsPage');

const StudentHealthPage = lazy(() => import('./pages/student/health/StudentHealthPage'));

// ─── Role sets ───────────────────────────────────────────────────────────────
const ADMIN  = ['school_admin', 'super_admin'];
const STAFF  = ['school_admin', 'super_admin', 'teacher'];

// ─── Route helpers ────────────────────────────────────────────────────────────
function P({ C, roles }) {
  const { token, user } = useAuthStore();
  if (!token) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user?.role)) return <Navigate to="/" replace />;
  return <Suspense fallback={<Spinner />}><C /></Suspense>;
}

const r = (C, roles = STAFF) => <P C={C} roles={roles} />;

function HomeRedirect() {
  const { user } = useAuthStore();
  const map = { super_admin: '/admin', school_admin: '/school/dashboard', teacher: '/school/dashboard', parent: '/ld/parent', student: '/ld/student' };
  return <Navigate to={map[user?.role] || '/login'} replace />;
}

function PrivateLayout() {
  const { token } = useAuthStore();
  if (!token) return <Navigate to="/login" replace />;
  return <Layout />;
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<PrivateLayout />}>
          <Route index element={<HomeRedirect />} />

          {/* Dashboard */}
          <Route path="school/dashboard" element={r(SchoolDashboard)} />

          {/* ── ADMINISTRATION ── */}
          {/* Academic Masters */}
          <Route path="admin/academic/attendance-reason"    element={r(AttendanceReasonMasterPage,   ADMIN)} />
          <Route path="admin/academic/checklist"            element={r(ChecklistMasterPage,           ADMIN)} />
          <Route path="admin/academic/class"                element={r(ClassMasterPage,               ADMIN)} />
          <Route path="admin/academic/class-section"        element={r(ClassSectionMappingPage,       ADMIN)} />
          <Route path="admin/academic/class-subject"        element={r(ClassSubjectMappingPage,       ADMIN)} />
          <Route path="admin/academic/house"                element={r(HouseMasterPage,               ADMIN)} />
          <Route path="admin/academic/immigration-status"   element={r(ImmigrationStatusMasterPage,   ADMIN)} />
          <Route path="admin/academic/level"                element={r(LevelMasterPage,               ADMIN)} />
          <Route path="admin/academic/section"              element={r(SectionMasterPage,             ADMIN)} />
          <Route path="admin/academic/stream"               element={r(StreamMasterPage,              ADMIN)} />
          <Route path="admin/academic/student-fee-category" element={r(StudentFeeCategoryMasterPage,  ADMIN)} />
          <Route path="admin/academic/subject-combination"  element={r(SubjectCombinationPage,        ADMIN)} />
          <Route path="admin/academic/subject"              element={r(SubjectMasterAdminPage,        ADMIN)} />
          <Route path="admin/academic/subject-type"         element={r(SubjectTypeMasterPage,         ADMIN)} />
          <Route path="admin/academic/term"                 element={r(TermMasterPage,                ADMIN)} />
          {/* Auth */}
          <Route path="admin/auth/roles"                    element={r(RoleMasterPage,       ADMIN)} />
          <Route path="admin/auth/permissions"              element={r(PermissionMatrixPage, ADMIN)} />
          <Route path="admin/auth/users"                    element={r(UserMasterPage,       ADMIN)} />
          <Route path="admin/auth/portal-menu"              element={r(ConfigurationMasterPage, ADMIN)} />
          <Route path="admin/auth/user-role-class"          element={r(ClassSectionMappingPage, ADMIN)} />
          <Route path="admin/auth/workflow"                 element={r(ConfigurationMasterPage, ADMIN)} />
          <Route path="admin/auth/help-support"             element={r(UserMasterReportPage,    ADMIN)} />
          <Route path="admin/auth/non-logged-users"         element={r(BranchNonLoggedReportPage, ADMIN)} />
          <Route path="admin/auth/portal-activity"          element={r(BranchLoginStatusReportPage, ADMIN)} />
          <Route path="admin/auth/portal-user"              element={r(PortalUserMasterReportPage, ADMIN)} />
          <Route path="admin/auth/login-history"            element={r(BranchLoginStatusReportPage, ADMIN)} />
          <Route path="admin/auth/role-authorization"       element={r(PermissionMatrixPage, ADMIN)} />
          <Route path="admin/auth/staff-usage"              element={r(UserMasterReportPage, ADMIN)} />
          {/* Demographic */}
          <Route path="admin/demographic/caste"             element={r(CasteMasterPage,        ADMIN)} />
          <Route path="admin/demographic/city"              element={r(CityMasterPage,         ADMIN)} />
          <Route path="admin/demographic/community"         element={r(CommunityMasterPage,    ADMIN)} />
          <Route path="admin/demographic/country"           element={r(CountryMasterPage,      ADMIN)} />
          <Route path="admin/demographic/district"          element={r(DistrictMasterPage,     ADMIN)} />
          <Route path="admin/demographic/mother-tongue"     element={r(MotherTongueMasterPage, ADMIN)} />
          <Route path="admin/demographic/nationality"       element={r(NationalityMasterPage,  ADMIN)} />
          <Route path="admin/demographic/religion"          element={r(ReligionMasterPage,     ADMIN)} />
          <Route path="admin/demographic/state"             element={r(StateMasterPage,        ADMIN)} />
          {/* Preliminary */}
          <Route path="admin/preliminary/admission-category" element={r(AdmissionCategoryPage, ADMIN)} />
          <Route path="admin/preliminary/admission-priority" element={r(AdmissionPriorityPage, ADMIN)} />
          <Route path="admin/preliminary/admission-type"     element={r(AdmissionTypePage,     ADMIN)} />
          <Route path="admin/preliminary/call-category"      element={r(CallCategoryPage,      ADMIN)} />
          <Route path="admin/preliminary/call-purpose"       element={r(CallPurposePage,       ADMIN)} />
          <Route path="admin/preliminary/call-status"        element={r(CallStatusPage,        ADMIN)} />
          <Route path="admin/preliminary/enquiry-mode"       element={r(EnquiryModePage,       ADMIN)} />
          <Route path="admin/preliminary/enquiry-source"     element={r(EnquirySourcePage,     ADMIN)} />
          <Route path="admin/preliminary/enquiry-status"     element={r(EnquiryStatusPage,     ADMIN)} />
          <Route path="admin/preliminary/staff-designation"  element={r(StaffDesignationPage,  ADMIN)} />
          <Route path="admin/preliminary/staff-type"         element={r(StaffTypePage,         ADMIN)} />
          {/* School Config */}
          <Route path="admin/config/school-master"          element={r(SchoolMasterPage,               ADMIN)} />
          <Route path="admin/config/branch-master"          element={r(BranchMasterAdminPage,          ADMIN)} />
          <Route path="admin/config/branch-config"          element={r(BranchMasterConfigPage,         ADMIN)} />
          <Route path="admin/config/block-config"           element={r(BlockConfigPage,                ADMIN)} />
          <Route path="admin/config/company-master"         element={r(CompanyMasterPage,              ADMIN)} />
          <Route path="admin/config/config-master"          element={r(ConfigurationMasterPage,        ADMIN)} />
          <Route path="admin/config/event-master"           element={r(EventMasterPage,                ADMIN)} />
          <Route path="admin/config/holiday-master"         element={r(HolidayMasterAdminPage,         ADMIN)} />
          <Route path="admin/config/online-payment"         element={r(OnlinePaymentConfigPage,        ADMIN)} />
          <Route path="admin/config/storage"                element={r(StorageConfigPage,              ADMIN)} />
          <Route path="admin/config/whatsapp"               element={r(WhatsappConfigPage,             ADMIN)} />
          <Route path="admin/config/profile-verification"   element={r(StudentProfileVerificationPage, ADMIN)} />
          <Route path="admin/config/usage-analytics"        element={r(UsageAnalyticsReportPage,       ADMIN)} />
          {/* Admin Reports */}
          <Route path="admin/reports/branch-non-logged"     element={r(BranchNonLoggedReportPage,         ADMIN)} />
          <Route path="admin/reports/branch-login-status"   element={r(BranchLoginStatusReportPage,       ADMIN)} />
          <Route path="admin/reports/hw-deviation"          element={r(HomeworkDeviationReportPage,       ADMIN)} />
          <Route path="admin/reports/hw-deviation-status"   element={r(HomeworkDeviationStatusPage,       ADMIN)} />
          <Route path="admin/reports/hw-posting-status"     element={r(HomeworkPostingStatusPage,         ADMIN)} />
          <Route path="admin/reports/portal-user"           element={r(PortalUserMasterReportPage,        ADMIN)} />
          <Route path="admin/reports/progress-card"         element={r(ProgressCardStatusReportPage,      ADMIN)} />
          <Route path="admin/reports/attendance-posting"    element={r(AttendancePostingStatusReportPage, ADMIN)} />
          <Route path="admin/reports/user-master"           element={r(UserMasterReportPage,              ADMIN)} />

          {/* ── ATTENDANCE ── */}
          <Route path="attendance/dashboard"                element={r(AttendanceDashboard,          STAFF)} />
          <Route path="attendance/student-entry"            element={r(StudentAttendanceEntry,       STAFF)} />
          <Route path="attendance/staff-entry"              element={r(StaffAttendanceEntry,         ADMIN)} />
          <Route path="attendance/leave-approval"           element={r(LeaveApprovalPage,            STAFF)} />
          <Route path="attendance/approve-leave"            element={r(LeaveApprovalPage,            ADMIN)} />
          <Route path="attendance/leave-request"            element={r(LeaveRequestPage,             STAFF)} />
          <Route path="attendance/reports/summary"          element={r(StudentAttendanceSummaryPage,  STAFF)} />
          <Route path="attendance/reports/summary-pct"      element={r(AttendanceSummaryPctPage,      STAFF)} />
          <Route path="attendance/reports/block-wise"       element={r(BlockWiseSummaryPage,          STAFF)} />
          <Route path="attendance/reports/datewise-class"   element={r(DatewiseClassAttendancePage,   STAFF)} />
          <Route path="attendance/reports/monthly-student"  element={r(MonthlyStudentAttendancePage,  STAFF)} />
          <Route path="attendance/reports/monthwise-student"element={r(MonthwiseStudentAttendancePage,STAFF)} />
          <Route path="attendance/reports/overall-monthly"  element={r(OverallMonthlyAttendancePage,  STAFF)} />
          <Route path="attendance/reports/student-absent"   element={r(StudentAbsentSummaryPage,      STAFF)} />
          <Route path="attendance/reports/student"          element={r(StudentAttendancePage,         STAFF)} />
          <Route path="attendance/reports/analysis"         element={r(StudentAttendanceAnalysisPage, STAFF)} />
          <Route path="attendance/reports/summary-absent"   element={r(StudentSummaryAbsentPage,      STAFF)} />
          <Route path="attendance/reports/weekly"           element={r(WeeklyAttendancePage,          STAFF)} />
          <Route path="attendance/reports/yearly"           element={r(YearlyStudentAttendancePage,   STAFF)} />
          <Route path="attendance/staff-reports/consolidated"       element={r(StaffConsolidatedReportPage,    ADMIN)} />
          <Route path="attendance/staff-reports/monthly"            element={r(MonthlyStaffAttendancePage,     ADMIN)} />
          <Route path="attendance/staff-reports/monthly-summary"    element={r(MonthlyStaffSummaryPage,        ADMIN)} />
          <Route path="attendance/staff-reports/absent-summary"     element={r(StaffAbsentSummaryPage,         ADMIN)} />
          <Route path="attendance/staff-reports/attendance"         element={r(StaffAttendancePage,            ADMIN)} />
          <Route path="attendance/staff-reports/consolidated-report"element={r(StaffConsolidatedAttendancePage,ADMIN)} />
          <Route path="attendance/staff-reports/summary-absent"     element={r(StaffSummaryAbsentPage,         ADMIN)} />
          <Route path="attendance/reports/follow-up"        element={r(FollowUpRegisterPage,          STAFF)} />
          <Route path="attendance/reports/classwise-daily"  element={r(ClasswiseDailyPage,            STAFF)} />
          <Route path="attendance/reports/monthly-status"   element={r(MonthlyAttendanceStatusPage,   STAFF)} />
          <Route path="attendance/reports/monthly-yearly"   element={r(MonthlyYearlyConsolidatedPage, STAFF)} />
          <Route path="attendance/reports/sectionwise-daily"element={r(SectionwiseDailyPage,          STAFF)} />

          {/* ── FRONT OFFICE ── */}
          <Route path="frontoffice/admissions/application-entry"  element={r(ApplicationEntryPage,  STAFF)} />
          <Route path="frontoffice/admissions/section-allocation" element={r(SectionAllocationPage, ADMIN)} />
          <Route path="frontoffice/enquiry/calls"                 element={r(EnquiryCallsPage,      STAFF)} />
          <Route path="frontoffice/enquiry/followup"              element={r(EnquiryCallsPage,      STAFF)} />
          <Route path="frontoffice/enquiry/general-calls"         element={r(EnquiryCallsPage,      STAFF)} />
          <Route path="frontoffice/enquiry/gate-pass"             element={r(ApplicationEntryPage,  STAFF)} />
          <Route path="frontoffice/enquiry/import-enquiry"        element={r(ApplicationEntryPage,  ADMIN)} />
          <Route path="frontoffice/enquiry/import-fees"           element={r(ApplicationEntryPage,  ADMIN)} />
          <Route path="frontoffice/enquiry/import-staff"          element={r(ApplicationEntryPage,  ADMIN)} />
          <Route path="frontoffice/enquiry/import-students"       element={r(ApplicationEntryPage,  ADMIN)} />
          <Route path="frontoffice/reports/siblings"              element={r(ApplicantSiblingsReportPage,STAFF)} />
          <Route path="frontoffice/reports/application-list"      element={r(ApplicationListReportPage,  STAFF)} />
          <Route path="frontoffice/reports/call-register"         element={r(CallRegisterReportPage,     STAFF)} />
          <Route path="frontoffice/reports/enquiry-status"        element={r(EnquiryStatusReportPage,    STAFF)} />
          <Route path="frontoffice/reports/enquiry-list"          element={r(EnquiryListReportPage,      STAFF)} />
          <Route path="frontoffice/reports/draft-application"     element={r(DraftApplicationReportPage, STAFF)} />
          <Route path="frontoffice/reports/gate-pass"             element={r(GatePassReportPage,         STAFF)} />
          <Route path="frontoffice/dashboard"                     element={r(SchoolDashboard,            STAFF)} />

          {/* ── STAFF ── */}
          <Route path="staff/management/information"        element={r(StaffInformationPage,   ADMIN)} />
          <Route path="staff/management/subject-allocation" element={r(SubjectAllocationPage,  ADMIN)} />
          <Route path="staff/management/id-card"            element={r(StudentIdCardPage,      ADMIN)} />
          <Route path="staff/academic/circular-entry"       element={r(CircularEntryPage,      STAFF)} />
          <Route path="staff/academic/homework"             element={r(HomeworkAssignmentPage, STAFF)} />
          <Route path="staff/academic/notes-of-lesson"      element={r(NotesOfLessonPage,      STAFF)} />
          <Route path="staff/academic/special-classes"      element={r(SpecialClassesPage,     STAFF)} />
          <Route path="staff/syllabus/master"               element={r(SpecialClassesPage,     STAFF)} />
          <Route path="staff/syllabus/lesson-plan"          element={r(NotesOfLessonPage,      STAFF)} />
          <Route path="staff/syllabus/daily-updation"       element={r(CircularEntryPage,      STAFF)} />
          <Route path="staff/syllabus/task-master"          element={r(SpecialClassesPage,     STAFF)} />
          <Route path="staff/performance/criteria"          element={r(EvaluationCriteriaPage, ADMIN)} />
          <Route path="staff/performance/master"            element={r(EvaluationMasterPage,   ADMIN)} />
          <Route path="staff/performance/observation-master"element={r(ObservationMasterPage,  ADMIN)} />
          <Route path="staff/performance/rating-master"     element={r(RatingMasterPage,       ADMIN)} />
          <Route path="staff/performance/evaluation-entry"  element={r(EvaluationEntryPage,    ADMIN)} />
          <Route path="staff/performance/appraisal"         element={r(EvaluationEntryPage,    ADMIN)} />
          <Route path="staff/performance/self-appraisal"    element={r(EvaluationEntryPage,    STAFF)} />
          <Route path="staff/relieving/relieving"           element={r(StaffInformationPage,   ADMIN)} />
          <Route path="staff/relieving/experience-cert"     element={r(BonafideCertificatePage,ADMIN)} />
          <Route path="staff/things-we-did/entry"           element={r(HomeworkAssignmentPage, STAFF)} />
          <Route path="staff/things-we-did/publish"         element={r(CircularEntryPage,      ADMIN)} />
          <Route path="staff/things-we-did/report"          element={r(StaffListReportPage,    STAFF)} />
          <Route path="staff/reports/list"                  element={r(StaffListReportPage,           ADMIN)} />
          <Route path="staff/reports/birthday"              element={r(StaffBirthdayReportPage,       ADMIN)} />
          <Route path="staff/reports/allocation"            element={r(StaffAllocationReportPage,     ADMIN)} />
          <Route path="staff/reports/lesson-plan"           element={r(AnnualLessonPlanReportPage,    STAFF)} />
          <Route path="staff/reports/appointment"           element={r(AppointmentDetailsReportPage,  ADMIN)} />
          <Route path="staff/reports/overall"               element={r(OverallStaffDetailsReportPage, ADMIN)} />
          <Route path="staff/reports/relieving"             element={r(RelievingDetailsReportPage,    ADMIN)} />
          <Route path="staff/reports/retirement"            element={r(RetirementDetailsReportPage,   ADMIN)} />
          <Route path="staff/reports/service-extension"     element={r(ServiceExtensionReportPage,    ADMIN)} />
          <Route path="staff/dashboard"                     element={r(SchoolDashboard,               STAFF)} />

          {/* ── STUDENT ── */}
          <Route path="student/management/information"          element={r(StudentInformationPage,  STAFF)} />
          <Route path="student/management/history"              element={r(StudentInformationPage,  STAFF)} />
          <Route path="student/management/observation"          element={r(StudentInformationPage,  STAFF)} />
          <Route path="student/management/observation-approval" element={r(LeaveApprovalPage,       ADMIN)} />
          <Route path="student/management/observation-history"  element={r(StudentListReportPage,   STAFF)} />
          <Route path="student/management/section-change"       element={r(ClassSectionChangePage,  ADMIN)} />
          <Route path="student/management/roll-allocation"      element={r(RollNoAllocationPage,    ADMIN)} />
          <Route path="student/management/roll-out"             element={r(RollNoAllocationPage,    ADMIN)} />
          <Route path="student/management/fee-category"         element={r(StudentInformationPage,  ADMIN)} />
          <Route path="student/management/fee-category-change"  element={r(LeaveApprovalPage,       ADMIN)} />
          <Route path="student/management/tc-request"           element={r(TCRequestPage,           ADMIN)} />
          <Route path="student/management/promotion"            element={r(StudentPromotionPage,    ADMIN)} />
          <Route path="student/management/id-card"              element={r(StudentIdCardPage,       ADMIN)} />
          <Route path="student/dashboard"                       element={r(SchoolDashboard,         STAFF)} />
          <Route path="student/certificates/template"           element={r(CertificateTemplatePage, ADMIN)} />
          <Route path="student/certificates/bonafide"           element={r(BonafideCertificatePage, STAFF)} />
          <Route path="student/certificates/attendance"         element={r(AttendanceCertificatePage,STAFF)} />
          <Route path="student/certificates/conduct"            element={r(ConductCertificatePage,  STAFF)} />
          <Route path="student/certificates/course-completion"  element={r(CourseCompletionCertPage,STAFF)} />
          <Route path="student/certificates/fee-cert"           element={r(FeeCertificatePage,      STAFF)} />
          <Route path="student/certificates/study"              element={r(StudyCertificatePage,    STAFF)} />
          <Route path="student/health/evaluation"               element={r(StudentHealthPage,       STAFF)} />
          <Route path="student/reports/list"                    element={r(StudentListReportPage,          STAFF)} />
          <Route path="student/reports/admission-list"          element={r(StudentAdmissionListPage,      STAFF)} />
          <Route path="student/reports/availability"            element={r(StudentAvailabilityPage,       STAFF)} />
          <Route path="student/reports/birthday"                element={r(StudentBirthdayReportPage,     STAFF)} />
          <Route path="student/reports/strength"                element={r(StudentStrengthPage,           STAFF)} />
          <Route path="student/reports/strength-report"         element={r(StudentStrengthReportPage,     STAFF)} />
          <Route path="student/reports/participation"           element={r(StudentParticipationReportPage,STAFF)} />
          <Route path="student/reports/gender-wise-attendance"  element={r(GenderWiseAttendancePage,      STAFF)} />
          <Route path="student/reports/hostel"                  element={r(HostelStudentsListPage,        STAFF)} />
          <Route path="student/reports/prev-school-marks"       element={r(PrevSchoolMarksPage,           STAFF)} />
          <Route path="student/reports/promotion-cancellation"  element={r(PromotionCancellationPage,     ADMIN)} />
          <Route path="student/reports/promotion-status"        element={r(PromotionStatusPage,           ADMIN)} />
          <Route path="student/reports/siblings"                element={r(SiblingDetailsPage,            STAFF)} />
          <Route path="student/reports/staff-student"           element={r(StaffStudentReportPage,        ADMIN)} />
          <Route path="student/reports/tc-issued"               element={r(TCIssuedStudentPage,           ADMIN)} />
          <Route path="student/reports/transport"               element={r(TransportStudentsPage,         STAFF)} />

          {/* ── LD Platform ── */}
          <Route path="ld/student"          element={r(StudentDashboard,    ['student'])} />
          <Route path="ld/teacher"          element={r(TeacherDashboard,    ['teacher','school_admin'])} />
          <Route path="ld/parent"           element={r(ParentScorecard,     ['parent'])} />
          <Route path="ld/screening"        element={r(ScreeningPage,       ['student'])} />
          <Route path="ld/practice"         element={r(PracticePage,        ['student'])} />
          <Route path="ld/tests"            element={r(TestsPage,           ['student'])} />
          <Route path="ld/recommendations"  element={r(RecommendationsPage, ['student','teacher','parent'])} />

          {/* Super Admin */}
          <Route path="admin" element={r(AdminDashboard, ['super_admin'])} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
