import React, { useState, useCallback } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import useAuthStore from '../store/authStore';

// ─── Navigation tree ─────────────────────────────────────────────────────────
// Structure: Module → Section → Page
// icon uses Heroicons path data (inline SVG)

const NAV_TREE = [
  {
    module: 'Dashboard',
    icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
    color: '#6366F1',
    roles: ['school_admin','super_admin','teacher'],
    sections: [
      { section: null, pages: [
        { label: 'Main Dashboard', to: '/school/dashboard' },
      ]},
    ],
  },
  {
    module: 'Administration',
    icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
    color: '#8B5CF6',
    roles: ['school_admin','super_admin'],
    sections: [
      {
        section: 'Academic Masters',
        pages: [
          { label: 'Attendance Reason Master', to: '/admin/academic/attendance-reason' },
          { label: 'Checklist Master',         to: '/admin/academic/checklist' },
          { label: 'Class Master',             to: '/admin/academic/class' },
          { label: 'Class Section Mapping',    to: '/admin/academic/class-section' },
          { label: 'Class Subject Mapping',    to: '/admin/academic/class-subject' },
          { label: 'House Master',             to: '/admin/academic/house' },
          { label: 'Immigration Status Master',to: '/admin/academic/immigration-status' },
          { label: 'Level Master',             to: '/admin/academic/level' },
          { label: 'Section Master',           to: '/admin/academic/section' },
          { label: 'Stream Master',            to: '/admin/academic/stream' },
          { label: 'Student Fee Category',     to: '/admin/academic/student-fee-category' },
          { label: 'Subject Combination',      to: '/admin/academic/subject-combination' },
          { label: 'Subject Master',           to: '/admin/academic/subject' },
          { label: 'Subject Type Master',      to: '/admin/academic/subject-type' },
          { label: 'Term Master',              to: '/admin/academic/term' },
        ],
      },
      {
        section: 'Auth & Authorization',
        pages: [
          { label: 'Portal Menu Master',           to: '/admin/auth/portal-menu' },
          { label: 'Role Master',                  to: '/admin/auth/roles' },
          { label: 'User Master',                  to: '/admin/auth/users' },
          { label: 'User Role Class Mapping',      to: '/admin/auth/user-role-class' },
          { label: 'Workflow Master',              to: '/admin/auth/workflow' },
          { label: 'App Help Support',             to: '/admin/auth/help-support' },
          { label: 'Non-Logged Portal Users',      to: '/admin/auth/non-logged-users' },
          { label: 'Portal Activity Tracking',     to: '/admin/auth/portal-activity' },
          { label: 'Portal User',                  to: '/admin/auth/portal-user' },
          { label: 'Portal User Login History',    to: '/admin/auth/login-history' },
          { label: 'Role Authorization',           to: '/admin/auth/role-authorization' },
          { label: 'Staff Usage Report',           to: '/admin/auth/staff-usage' },
        ],
      },
      {
        section: 'Demographic Masters',
        pages: [
          { label: 'Caste Master',          to: '/admin/demographic/caste' },
          { label: 'City Master',           to: '/admin/demographic/city' },
          { label: 'Community Master',      to: '/admin/demographic/community' },
          { label: 'Country Master',        to: '/admin/demographic/country' },
          { label: 'District Master',       to: '/admin/demographic/district' },
          { label: 'Mother Tongue Master',  to: '/admin/demographic/mother-tongue' },
          { label: 'Nationality Master',    to: '/admin/demographic/nationality' },
          { label: 'Religion Master',       to: '/admin/demographic/religion' },
          { label: 'State Master',          to: '/admin/demographic/state' },
        ],
      },
      {
        section: 'Preliminary Master',
        pages: [
          { label: 'Admission Category',   to: '/admin/preliminary/admission-category' },
          { label: 'Admission Priority',   to: '/admin/preliminary/admission-priority' },
          { label: 'Admission Type',       to: '/admin/preliminary/admission-type' },
          { label: 'Call Category',        to: '/admin/preliminary/call-category' },
          { label: 'Call Purpose',         to: '/admin/preliminary/call-purpose' },
          { label: 'Call Status',          to: '/admin/preliminary/call-status' },
          { label: 'Enquiry Mode',         to: '/admin/preliminary/enquiry-mode' },
          { label: 'Enquiry Source',       to: '/admin/preliminary/enquiry-source' },
          { label: 'Enquiry Status',       to: '/admin/preliminary/enquiry-status' },
          { label: 'Staff Designation',    to: '/admin/preliminary/staff-designation' },
          { label: 'Staff Type',           to: '/admin/preliminary/staff-type' },
        ],
      },
      {
        section: 'School Configuration',
        pages: [
          { label: 'School Master',                to: '/admin/config/school-master' },
          { label: 'Branch Master',                to: '/admin/config/branch-master' },
          { label: 'Branch Master Configuration',  to: '/admin/config/branch-config' },
          { label: 'Block Configuration',          to: '/admin/config/block-config' },
          { label: 'Company Master',               to: '/admin/config/company-master' },
          { label: 'Configuration Master',         to: '/admin/config/config-master' },
          { label: 'Event Master',                 to: '/admin/config/event-master' },
          { label: 'Holiday Master',               to: '/admin/config/holiday-master' },
          { label: 'Online Payment Configuration', to: '/admin/config/online-payment' },
          { label: 'Storage Configuration',        to: '/admin/config/storage' },
          { label: 'WhatsApp Configuration',       to: '/admin/config/whatsapp' },
          { label: 'Student Profile Verification', to: '/admin/config/profile-verification' },
          { label: 'Usage Analytics Report',       to: '/admin/config/usage-analytics' },
        ],
      },
      {
        section: 'Reports & Lists',
        pages: [
          { label: 'Branch Level Non-Logged Report',    to: '/admin/reports/branch-non-logged' },
          { label: 'Branch Portal Login Status',        to: '/admin/reports/branch-login-status' },
          { label: 'Homework Posting Deviation',        to: '/admin/reports/hw-deviation' },
          { label: 'Homework Posting Deviation Status', to: '/admin/reports/hw-deviation-status' },
          { label: 'Homework Posting Status',           to: '/admin/reports/hw-posting-status' },
          { label: 'Portal User Master Report',         to: '/admin/reports/portal-user' },
          { label: 'Progress Card Status',              to: '/admin/reports/progress-card' },
          { label: 'Attendance Posting Status',         to: '/admin/reports/attendance-posting' },
          { label: 'User Master Report',                to: '/admin/reports/user-master' },
        ],
      },
    ],
  },
  {
    module: 'Attendance',
    icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
    color: '#10B981',
    roles: ['school_admin','super_admin','teacher'],
    sections: [
      {
        section: 'Attendance',
        pages: [
          { label: 'Student Attendance Entry', to: '/attendance/student-entry' },
          { label: 'Staff Attendance Entry',   to: '/attendance/staff-entry' },
          { label: 'Student Leave Approval',   to: '/attendance/leave-approval' },
          { label: 'Attendance Dashboard',     to: '/attendance/dashboard' },
        ],
      },
      {
        section: 'Leave Request',
        pages: [
          { label: 'Leave Request Entry', to: '/attendance/leave-request' },
          { label: 'Leave Approval',      to: '/attendance/approve-leave' },
        ],
      },
      {
        section: 'Student Reports',
        pages: [
          { label: 'Attendance Summary',                   to: '/attendance/reports/summary' },
          { label: 'Attendance Summary Percentage-Wise',   to: '/attendance/reports/summary-pct' },
          { label: 'Block-Wise Summary',                   to: '/attendance/reports/block-wise' },
          { label: 'Datewise Class Attendance',            to: '/attendance/reports/datewise-class' },
          { label: 'Monthly Student Attendance',           to: '/attendance/reports/monthly-student' },
          { label: 'Monthwise Student Attendance',         to: '/attendance/reports/monthwise-student' },
          { label: 'Overall Monthly Student Attendance',   to: '/attendance/reports/overall-monthly' },
          { label: 'Student Absent Summary',               to: '/attendance/reports/student-absent' },
          { label: 'Student Attendance',                   to: '/attendance/reports/student' },
          { label: 'Student Attendance Analysis',          to: '/attendance/reports/analysis' },
          { label: 'Student Summary Absent',               to: '/attendance/reports/summary-absent' },
          { label: 'Weekly Attendance',                    to: '/attendance/reports/weekly' },
          { label: 'Yearly Student Attendance',            to: '/attendance/reports/yearly' },
        ],
      },
      {
        section: 'Staff Reports',
        pages: [
          { label: 'Consolidated Report',                to: '/attendance/staff-reports/consolidated' },
          { label: 'Monthly Staff Attendance',           to: '/attendance/staff-reports/monthly' },
          { label: 'Monthly Staff Attendance Summary',   to: '/attendance/staff-reports/monthly-summary' },
          { label: 'Staff Absent Summary',               to: '/attendance/staff-reports/absent-summary' },
          { label: 'Staff Attendance',                   to: '/attendance/staff-reports/attendance' },
          { label: 'Staff Consolidated Report',          to: '/attendance/staff-reports/consolidated-report' },
          { label: 'Staff Summary Absent',               to: '/attendance/staff-reports/summary-absent' },
        ],
      },
      {
        section: 'Reports & Lists',
        pages: [
          { label: '3/5 Days Follow-Up Register',        to: '/attendance/reports/follow-up' },
          { label: 'Class-Wise Daily Consolidated',      to: '/attendance/reports/classwise-daily' },
          { label: 'Monthly Attendance Status Wise',     to: '/attendance/reports/monthly-status' },
          { label: 'Monthly Yearly Section Consolidated',to: '/attendance/reports/monthly-yearly' },
          { label: 'Section-Wise Daily Consolidated',    to: '/attendance/reports/sectionwise-daily' },
        ],
      },
    ],
  },
  {
    module: 'Front Office',
    icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
    color: '#F59E0B',
    roles: ['school_admin','super_admin','teacher'],
    sections: [
      {
        section: 'Admission Process',
        pages: [
          { label: 'Application Entry',  to: '/frontoffice/admissions/application-entry' },
          { label: 'Section Allocation', to: '/frontoffice/admissions/section-allocation' },
        ],
      },
      {
        section: 'Enquiry Process',
        pages: [
          { label: 'Enquiry Calls',      to: '/frontoffice/enquiry/calls' },
          { label: 'Followup Calls',     to: '/frontoffice/enquiry/followup' },
          { label: 'General Calls',      to: '/frontoffice/enquiry/general-calls' },
          { label: 'Student Gate Pass',  to: '/frontoffice/enquiry/gate-pass' },
          { label: 'Enquiry Import',     to: '/frontoffice/enquiry/import-enquiry' },
          { label: 'Fees Import',        to: '/frontoffice/enquiry/import-fees' },
          { label: 'Staff Import',       to: '/frontoffice/enquiry/import-staff' },
          { label: 'Student Import',     to: '/frontoffice/enquiry/import-students' },
        ],
      },
      {
        section: 'Reports & Lists',
        pages: [
          { label: 'Applicant Siblings Details',        to: '/frontoffice/reports/siblings' },
          { label: 'Application List Report',           to: '/frontoffice/reports/application-list' },
          { label: 'Call Register Report',              to: '/frontoffice/reports/call-register' },
          { label: 'Enquiry & Application Status',      to: '/frontoffice/reports/enquiry-status' },
          { label: 'Enquiry List Report',               to: '/frontoffice/reports/enquiry-list' },
          { label: 'Online Draft Application Report',   to: '/frontoffice/reports/draft-application' },
          { label: 'Student Gate Pass Report',          to: '/frontoffice/reports/gate-pass' },
          { label: 'Front Office Dashboard',            to: '/frontoffice/dashboard' },
        ],
      },
    ],
  },
  {
    module: 'Staff',
    icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
    color: '#3B82F6',
    roles: ['school_admin','super_admin','teacher'],
    sections: [
      {
        section: 'Staff Management',
        pages: [
          { label: 'Staff Information',    to: '/staff/management/information' },
          { label: 'Subject Allocation',   to: '/staff/management/subject-allocation' },
          { label: 'Staff ID Card',        to: '/staff/management/id-card' },
        ],
      },
      {
        section: 'Academic Activities',
        pages: [
          { label: 'Circular Entry',          to: '/staff/academic/circular-entry' },
          { label: 'Homework & Assignment',   to: '/staff/academic/homework' },
          { label: 'Notes of Lesson',         to: '/staff/academic/notes-of-lesson' },
          { label: 'Special Classes',         to: '/staff/academic/special-classes' },
        ],
      },
      {
        section: 'Syllabus Plan',
        pages: [
          { label: 'Syllabus Master',  to: '/staff/syllabus/master' },
          { label: 'Lesson Plan',      to: '/staff/syllabus/lesson-plan' },
          { label: 'Daily Updation',   to: '/staff/syllabus/daily-updation' },
          { label: 'Task Master',      to: '/staff/syllabus/task-master' },
        ],
      },
      {
        section: 'Staff Performance',
        pages: [
          { label: 'Evaluation Criteria',    to: '/staff/performance/criteria' },
          { label: 'Evaluation Master',      to: '/staff/performance/master' },
          { label: 'Observation Master',     to: '/staff/performance/observation-master' },
          { label: 'Rating Master',          to: '/staff/performance/rating-master' },
          { label: 'Evaluation Entry',       to: '/staff/performance/evaluation-entry' },
          { label: 'Management Appraisal',   to: '/staff/performance/appraisal' },
          { label: 'Self Appraisal',         to: '/staff/performance/self-appraisal' },
        ],
      },
      {
        section: 'Staff Relieving',
        pages: [
          { label: 'Staff Relieving',       to: '/staff/relieving/relieving' },
          { label: 'Experience Certificate',to: '/staff/relieving/experience-cert' },
        ],
      },
      {
        section: 'Things We Did',
        pages: [
          { label: 'Things We Did',         to: '/staff/things-we-did/entry' },
          { label: 'Things We Did Publish', to: '/staff/things-we-did/publish' },
          { label: 'Things We Did Report',  to: '/staff/things-we-did/report' },
        ],
      },
      {
        section: 'Reports & Lists',
        pages: [
          { label: 'Staff List',                      to: '/staff/reports/list' },
          { label: 'Staff Birthday Report',           to: '/staff/reports/birthday' },
          { label: 'Staff Allocation Report',         to: '/staff/reports/allocation' },
          { label: 'Annual Lesson Plan Report',       to: '/staff/reports/lesson-plan' },
          { label: 'Appointment Details Report',      to: '/staff/reports/appointment' },
          { label: 'Overall Staff Details Report',    to: '/staff/reports/overall' },
          { label: 'Relieving Details Report',        to: '/staff/reports/relieving' },
          { label: 'Retirement Details Report',       to: '/staff/reports/retirement' },
          { label: 'Service Extension Details',       to: '/staff/reports/service-extension' },
          { label: 'Staff Dashboard',                 to: '/staff/dashboard' },
        ],
      },
    ],
  },
  {
    module: 'Student',
    icon: 'M12 14l9-5-9-5-9 5 9 5z M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z',
    color: '#EC4899',
    roles: ['school_admin','super_admin','teacher'],
    sections: [
      {
        section: 'Students Management',
        pages: [
          { label: 'Student Information',           to: '/student/management/information' },
          { label: 'Student History',               to: '/student/management/history' },
          { label: 'Student Observation',           to: '/student/management/observation' },
          { label: 'Observation Approval',          to: '/student/management/observation-approval' },
          { label: 'Observation History',           to: '/student/management/observation-history' },
          { label: 'Class Section Change',          to: '/student/management/section-change' },
          { label: 'Roll No Allocation',            to: '/student/management/roll-allocation' },
          { label: 'Roll Out Entry',                to: '/student/management/roll-out' },
          { label: 'Student Fee Category',          to: '/student/management/fee-category' },
          { label: 'Fee Category Change Request',   to: '/student/management/fee-category-change' },
          { label: 'Request for TC',                to: '/student/management/tc-request' },
          { label: 'Student Promotion',             to: '/student/management/promotion' },
          { label: 'Student ID Card',               to: '/student/management/id-card' },
          { label: 'Student Dashboard',             to: '/student/dashboard' },
        ],
      },
      {
        section: 'Student Certificates',
        pages: [
          { label: 'Certificate Template',         to: '/student/certificates/template' },
          { label: 'Bonafide Certificate',         to: '/student/certificates/bonafide' },
          { label: 'Attendance Certificate',       to: '/student/certificates/attendance' },
          { label: 'Conduct Certificate',          to: '/student/certificates/conduct' },
          { label: 'Course Completion Certificate',to: '/student/certificates/course-completion' },
          { label: 'Student Fee Certificate',      to: '/student/certificates/fee-cert' },
          { label: 'Study Certificate',            to: '/student/certificates/study' },
        ],
      },
      {
        section: 'Student Health',
        pages: [
          { label: 'Student Health Evaluation', to: '/student/health/evaluation' },
        ],
      },
      {
        section: 'Reports & Lists',
        pages: [
          { label: 'Student List',                       to: '/student/reports/list' },
          { label: 'Student Admission List',             to: '/student/reports/admission-list' },
          { label: 'Student Availability',               to: '/student/reports/availability' },
          { label: 'Student Birthday Report',            to: '/student/reports/birthday' },
          { label: 'Student Strength',                   to: '/student/reports/strength' },
          { label: 'Student Strength Report',            to: '/student/reports/strength-report' },
          { label: 'Student Participation Report',       to: '/student/reports/participation' },
          { label: 'Gender-Wise Class Attendance',       to: '/student/reports/gender-wise-attendance' },
          { label: 'Hostel Students List',               to: '/student/reports/hostel' },
          { label: 'Previous School Marks Report',       to: '/student/reports/prev-school-marks' },
          { label: 'Promotion Cancellation Report',      to: '/student/reports/promotion-cancellation' },
          { label: 'Promotion Status Report',            to: '/student/reports/promotion-status' },
          { label: 'Sibling Details Report',             to: '/student/reports/siblings' },
          { label: 'Staff Student Report',               to: '/student/reports/staff-student' },
          { label: 'TC Issued Student List',             to: '/student/reports/tc-issued' },
          { label: 'Transport Students List',            to: '/student/reports/transport' },
        ],
      },
    ],
  },
];

// ─── LD Platform nav (separate section) ──────────────────────────────────────
const LD_NAV = [
  { label: 'My Dashboard',    to: '/ld/student',         roles: ['student'] },
  { label: 'My Class',        to: '/ld/teacher',         roles: ['teacher','school_admin'] },
  { label: 'My Child',        to: '/ld/parent',          roles: ['parent'] },
  { label: 'Screening',       to: '/ld/screening',       roles: ['student'] },
  { label: 'Practice',        to: '/ld/practice',        roles: ['student'] },
  { label: 'Tests',           to: '/ld/tests',           roles: ['student'] },
  { label: 'Recommendations', to: '/ld/recommendations', roles: ['student','teacher','parent'] },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function Icon({ path, size = 16 }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={`shrink-0`} style={{ width: size, height: size }}
      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    </svg>
  );
}

function ChevronIcon({ open }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" style={{ width: 12, height: 12 }}
      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
      className={`transition-transform duration-200 ${open ? 'rotate-90' : ''}`}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}

function PageLink({ label, to }) {
  return (
    <NavLink to={to}
      className={({ isActive }) =>
        `block text-xs py-1.5 pl-4 pr-2 rounded-md transition-colors truncate ${
          isActive
            ? 'bg-indigo-50 text-indigo-700 font-semibold'
            : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
        }`
      }
    >
      {label}
    </NavLink>
  );
}

function SectionGroup({ section, pages, defaultOpen = false }) {
  const location = useLocation();
  const anyActive = pages.some(p => location.pathname === p.to);
  const [open, setOpen] = useState(defaultOpen || anyActive);

  if (!section) {
    return (
      <div className="space-y-0.5">
        {pages.map(p => <PageLink key={p.to} {...p} />)}
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-2 py-1.5 rounded-md text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
      >
        <span className="truncate">{section}</span>
        <ChevronIcon open={open} />
      </button>
      {open && (
        <div className="ml-2 mt-0.5 space-y-0.5 border-l border-gray-200 pl-2">
          {pages.map(p => <PageLink key={p.to} {...p} />)}
        </div>
      )}
    </div>
  );
}

function ModuleGroup({ module: mod, icon, color, sections, role }) {
  const location = useLocation();
  const anyActive = sections.some(s => s.pages.some(p => location.pathname.startsWith(p.to)));
  const [open, setOpen] = useState(anyActive);

  return (
    <div className="mb-1">
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold transition-colors
          ${open ? 'bg-gray-100 text-gray-900' : 'text-gray-700 hover:bg-gray-50'}`}
      >
        <span style={{ color }} className="shrink-0">
          <Icon path={icon} size={16} />
        </span>
        <span className="flex-1 text-left truncate">{mod}</span>
        <ChevronIcon open={open} />
      </button>

      {open && (
        <div className="mt-1 ml-2 space-y-1 border-l-2 pl-2" style={{ borderColor: color + '40' }}>
          {sections.map(s => (
            <SectionGroup key={s.section || 'root'} section={s.section} pages={s.pages} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Sidebar ─────────────────────────────────────────────────────────────

export default function Sidebar({ open }) {
  const { user } = useAuthStore();
  const role = user?.role || '';

  const showSchool = ['school_admin','teacher','super_admin'].includes(role);
  const showLD     = ['student','teacher','parent','school_admin'].includes(role);

  if (!open) {
    // Collapsed: show only module icons
    return (
      <aside className="w-14 bg-white border-r border-gray-200 flex flex-col items-center py-4 gap-2 shrink-0">
        <span className="text-lg mb-2">📖</span>
        {NAV_TREE.map(m => (
          <div key={m.module} title={m.module}
            className="w-9 h-9 rounded-lg flex items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors"
            style={{ color: m.color }}>
            <Icon path={m.icon} size={18} />
          </div>
        ))}
      </aside>
    );
  }

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col shrink-0 overflow-hidden">
      {/* Logo */}
      <div className="h-14 flex items-center gap-2.5 px-4 border-b border-gray-200 bg-[#0e3a5c] shrink-0">
        <span className="text-xl">📖</span>
        <div>
          <p className="text-white font-bold text-sm leading-tight">LD Schools ERP</p>
          <p className="text-blue-300 text-[10px]">School Management Platform</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1 scrollbar-thin scrollbar-thumb-gray-200">
        {showSchool && NAV_TREE.filter(m => !m.roles || m.roles.includes(role)).map(m => (
          <ModuleGroup key={m.module} {...m} role={role} />
        ))}

        {showLD && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 px-3">LD Platform</p>
            <div className="space-y-0.5">
              {LD_NAV.filter(n => !n.roles || n.roles.includes(role)).map(n => (
                <NavLink key={n.to} to={n.to}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive ? 'bg-cyan-50 text-cyan-700' : 'text-gray-600 hover:bg-gray-50'
                    }`
                  }
                >
                  <span className="text-sm">•</span>
                  <span>{n.label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* User badge */}
      <div className="p-3 border-t border-gray-100 shrink-0">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50">
          <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
            {(user?.name || 'U')[0].toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-gray-900 truncate">{user?.name || 'User'}</p>
            <p className="text-[10px] text-gray-400 capitalize">{role?.replace(/_/g,' ')}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
