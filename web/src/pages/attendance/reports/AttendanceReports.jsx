import React from 'react';
import GenericReportPage from '../../../components/common/GenericReportPage';
import { attendanceApi } from '../../../services/erp-api';

// ─── Shared filter sets ───────────────────────────────────────────────────────
const dateFilters = [
  { key: 'from_date', label: 'From Date', type: 'date' },
  { key: 'to_date',   label: 'To Date',   type: 'date' },
];

const classFilters = [
  { key: 'class_id',   label: 'Class',   type: 'text', placeholder: 'Enter Class' },
  { key: 'section_id', label: 'Section', type: 'text', placeholder: 'Enter Section' },
];

const deptFilters = [
  { key: 'department', label: 'Department', type: 'text', placeholder: 'Department' },
];

const yearFilter = { key: 'academic_year', label: 'Academic Year', type: 'text', placeholder: 'e.g. 2024-25' };
const monthFilter = { key: 'month', label: 'Month', type: 'select', options: [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]};

// ─── Helper ───────────────────────────────────────────────────────────────────
const makeFetch = (type) => (filters) => attendanceApi.report(type, filters);

// ─── 1. Student Attendance Summary ───────────────────────────────────────────
export function StudentAttendanceSummaryPage() {
  return <GenericReportPage config={{
    title: 'Student Attendance Summary',
    subtitle: 'Classwise summary of student attendance',
    filters: [...dateFilters, ...classFilters, yearFilter],
    columns: [
      { key: 'class_name',  label: 'Class' },
      { key: 'section',     label: 'Section' },
      { key: 'total',       label: 'Total Students' },
      { key: 'present',     label: 'Present' },
      { key: 'absent',      label: 'Absent' },
      { key: 'late',        label: 'Late' },
      { key: 'pct',         label: 'Attendance %', render: v => `${v ?? 0}%` },
    ],
    fetchFn: makeFetch('student-summary'),
    exportName: 'student-attendance-summary',
  }} />;
}

// ─── 2. Attendance Summary % ─────────────────────────────────────────────────
export function AttendanceSummaryPctPage() {
  return <GenericReportPage config={{
    title: 'Attendance Summary — Percentage',
    subtitle: 'Percentage-wise attendance overview',
    filters: [...dateFilters, ...classFilters, yearFilter, monthFilter],
    columns: [
      { key: 'student_name', label: 'Student Name' },
      { key: 'adm_no',       label: 'Adm. No.' },
      { key: 'class_name',   label: 'Class' },
      { key: 'section',      label: 'Section' },
      { key: 'working_days', label: 'Working Days' },
      { key: 'present',      label: 'Days Present' },
      { key: 'absent',       label: 'Days Absent' },
      { key: 'attendance_pct', label: 'Attendance %', render: v => `${v ?? 0}%` },
    ],
    fetchFn: makeFetch('student-summary-pct'),
    exportName: 'attendance-summary-pct',
  }} />;
}

// ─── 3. Block Wise Summary ────────────────────────────────────────────────────
export function BlockWiseSummaryPage() {
  return <GenericReportPage config={{
    title: 'Block Wise Attendance Summary',
    subtitle: 'Attendance grouped by block / building',
    filters: [
      ...dateFilters,
      { key: 'block', label: 'Block', type: 'text', placeholder: 'Block name' },
      yearFilter,
    ],
    columns: [
      { key: 'block',       label: 'Block' },
      { key: 'class_name',  label: 'Class' },
      { key: 'total',       label: 'Total' },
      { key: 'present',     label: 'Present' },
      { key: 'absent',      label: 'Absent' },
      { key: 'pct',         label: '%', render: v => `${v ?? 0}%` },
    ],
    fetchFn: makeFetch('block-wise-summary'),
    exportName: 'block-wise-attendance',
  }} />;
}

// ─── 4. Date-wise Class Attendance ───────────────────────────────────────────
export function DatewiseClassAttendancePage() {
  return <GenericReportPage config={{
    title: 'Date-wise Class Attendance',
    subtitle: 'Day-by-day attendance for each class',
    filters: [...dateFilters, ...classFilters],
    columns: [
      { key: 'date',       label: 'Date' },
      { key: 'class_name', label: 'Class' },
      { key: 'section',    label: 'Section' },
      { key: 'total',      label: 'Total' },
      { key: 'present',    label: 'Present' },
      { key: 'absent',     label: 'Absent' },
      { key: 'late',       label: 'Late' },
      { key: 'pct',        label: '%', render: v => `${v ?? 0}%` },
    ],
    fetchFn: makeFetch('datewise-class'),
    exportName: 'datewise-class-attendance',
  }} />;
}

// ─── 5. Monthly Student Attendance ───────────────────────────────────────────
export function MonthlyStudentAttendancePage() {
  return <GenericReportPage config={{
    title: 'Monthly Student Attendance',
    subtitle: 'Month-by-month attendance for each student',
    filters: [monthFilter, yearFilter, ...classFilters],
    columns: [
      { key: 'student_name', label: 'Student Name' },
      { key: 'adm_no',       label: 'Adm. No.' },
      { key: 'class_name',   label: 'Class' },
      { key: 'section',      label: 'Section' },
      { key: 'month',        label: 'Month' },
      { key: 'working_days', label: 'Working Days' },
      { key: 'present',      label: 'Present' },
      { key: 'absent',       label: 'Absent' },
      { key: 'pct',          label: '%', render: v => `${v ?? 0}%` },
    ],
    fetchFn: makeFetch('monthly-student'),
    exportName: 'monthly-student-attendance',
  }} />;
}

// ─── 6. Month-wise Student Attendance ────────────────────────────────────────
export function MonthwiseStudentAttendancePage() {
  return <GenericReportPage config={{
    title: 'Month-wise Student Attendance',
    subtitle: 'All months in a single view per student',
    filters: [yearFilter, ...classFilters],
    columns: [
      { key: 'student_name', label: 'Student Name' },
      { key: 'adm_no',       label: 'Adm. No.' },
      { key: 'class_name',   label: 'Class' },
      { key: 'jun',  label: 'Jun' }, { key: 'jul',  label: 'Jul' },
      { key: 'aug',  label: 'Aug' }, { key: 'sep',  label: 'Sep' },
      { key: 'oct',  label: 'Oct' }, { key: 'nov',  label: 'Nov' },
      { key: 'dec',  label: 'Dec' }, { key: 'jan',  label: 'Jan' },
      { key: 'feb',  label: 'Feb' }, { key: 'mar',  label: 'Mar' },
      { key: 'apr',  label: 'Apr' }, { key: 'may',  label: 'May' },
      { key: 'total_pct', label: 'Overall %', render: v => `${v ?? 0}%` },
    ],
    fetchFn: makeFetch('monthwise-student'),
    exportName: 'monthwise-student-attendance',
  }} />;
}

// ─── 7. Overall Monthly Attendance ───────────────────────────────────────────
export function OverallMonthlyAttendancePage() {
  return <GenericReportPage config={{
    title: 'Overall Monthly Attendance',
    subtitle: 'School-wide monthly attendance overview',
    filters: [monthFilter, yearFilter],
    columns: [
      { key: 'class_name',   label: 'Class' },
      { key: 'section',      label: 'Section' },
      { key: 'total',        label: 'Total Students' },
      { key: 'working_days', label: 'Working Days' },
      { key: 'avg_present',  label: 'Avg. Present' },
      { key: 'avg_absent',   label: 'Avg. Absent' },
      { key: 'avg_pct',      label: 'Avg. %', render: v => `${v ?? 0}%` },
    ],
    fetchFn: makeFetch('overall-monthly'),
    exportName: 'overall-monthly-attendance',
  }} />;
}

// ─── 8. Student Absent Summary ────────────────────────────────────────────────
export function StudentAbsentSummaryPage() {
  return <GenericReportPage config={{
    title: 'Student Absent Summary',
    subtitle: 'Summary of student absences',
    filters: [...dateFilters, ...classFilters, { key: 'min_absences', label: 'Min Absences', type: 'number' }],
    columns: [
      { key: 'student_name', label: 'Student Name' },
      { key: 'adm_no',       label: 'Adm. No.' },
      { key: 'class_name',   label: 'Class' },
      { key: 'section',      label: 'Section' },
      { key: 'total_absent', label: 'Total Absent' },
      { key: 'consecutive',  label: 'Max Consecutive' },
      { key: 'parent_phone', label: "Parent's Phone" },
    ],
    fetchFn: makeFetch('student-absent-summary'),
    exportName: 'student-absent-summary',
  }} />;
}

// ─── 9. Student Attendance ────────────────────────────────────────────────────
export function StudentAttendancePage() {
  return <GenericReportPage config={{
    title: 'Student Attendance Register',
    subtitle: 'Day-by-day attendance record per student',
    filters: [...dateFilters, ...classFilters, { key: 'student_id', label: 'Student (Adm No.)', type: 'text' }],
    columns: [
      { key: 'date',         label: 'Date' },
      { key: 'student_name', label: 'Student Name' },
      { key: 'adm_no',       label: 'Adm. No.' },
      { key: 'class_name',   label: 'Class' },
      { key: 'section',      label: 'Section' },
      { key: 'status',       label: 'Status' },
      { key: 'remarks',      label: 'Remarks' },
    ],
    fetchFn: makeFetch('student-attendance'),
    exportName: 'student-attendance-register',
  }} />;
}

// ─── 10. Student Attendance Analysis ─────────────────────────────────────────
export function StudentAttendanceAnalysisPage() {
  return <GenericReportPage config={{
    title: 'Student Attendance Analysis',
    subtitle: 'Trend and pattern analysis of student attendance',
    filters: [...dateFilters, yearFilter, ...classFilters,
      { key: 'threshold', label: 'Below % Threshold', type: 'number', placeholder: '75' },
    ],
    columns: [
      { key: 'student_name',  label: 'Student Name' },
      { key: 'adm_no',        label: 'Adm. No.' },
      { key: 'class_name',    label: 'Class' },
      { key: 'section',       label: 'Section' },
      { key: 'working_days',  label: 'Working Days' },
      { key: 'present',       label: 'Present' },
      { key: 'absent',        label: 'Absent' },
      { key: 'late',          label: 'Late' },
      { key: 'pct',           label: 'Attendance %', render: v => `${v ?? 0}%` },
      { key: 'status',        label: 'Risk', render: v => (
        <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${v === 'critical' ? 'bg-red-100 text-red-700' : v === 'low' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
          {v || 'Normal'}
        </span>
      )},
    ],
    fetchFn: makeFetch('student-analysis'),
    exportName: 'student-attendance-analysis',
  }} />;
}

// ─── 11. Student Summary Absent ───────────────────────────────────────────────
export function StudentSummaryAbsentPage() {
  return <GenericReportPage config={{
    title: 'Student Absence Summary Register',
    subtitle: 'Consolidated absence register for students',
    filters: [monthFilter, yearFilter, ...classFilters],
    columns: [
      { key: 'adm_no',       label: 'Adm. No.' },
      { key: 'student_name', label: 'Student Name' },
      { key: 'class_name',   label: 'Class' },
      { key: 'section',      label: 'Section' },
      { key: 'absent_dates', label: 'Absent Dates' },
      { key: 'total_absent', label: 'Total Days' },
      { key: 'reason',       label: 'Reason' },
    ],
    fetchFn: makeFetch('student-summary-absent'),
    exportName: 'student-summary-absent',
  }} />;
}

// ─── 12. Weekly Attendance ────────────────────────────────────────────────────
export function WeeklyAttendancePage() {
  return <GenericReportPage config={{
    title: 'Weekly Attendance Report',
    subtitle: 'Week-by-week attendance breakdown',
    filters: [
      ...dateFilters,
      ...classFilters,
      { key: 'week_no', label: 'Week Number', type: 'number', placeholder: 'e.g. 1-52' },
    ],
    columns: [
      { key: 'week',         label: 'Week' },
      { key: 'class_name',   label: 'Class' },
      { key: 'section',      label: 'Section' },
      { key: 'mon',  label: 'Mon' }, { key: 'tue', label: 'Tue' },
      { key: 'wed',  label: 'Wed' }, { key: 'thu', label: 'Thu' },
      { key: 'fri',  label: 'Fri' }, { key: 'sat', label: 'Sat' },
      { key: 'total', label: 'Total Present' },
    ],
    fetchFn: makeFetch('weekly-attendance'),
    exportName: 'weekly-attendance',
  }} />;
}

// ─── 13. Yearly Student Attendance ───────────────────────────────────────────
export function YearlyStudentAttendancePage() {
  return <GenericReportPage config={{
    title: 'Yearly Student Attendance',
    subtitle: 'Annual attendance summary for all students',
    filters: [yearFilter, ...classFilters],
    columns: [
      { key: 'adm_no',       label: 'Adm. No.' },
      { key: 'student_name', label: 'Student Name' },
      { key: 'class_name',   label: 'Class' },
      { key: 'section',      label: 'Section' },
      { key: 'total_days',   label: 'Total School Days' },
      { key: 'present',      label: 'Days Present' },
      { key: 'absent',       label: 'Days Absent' },
      { key: 'medical_leave',label: 'Medical Leave' },
      { key: 'overall_pct',  label: 'Annual %', render: v => `${v ?? 0}%` },
    ],
    fetchFn: makeFetch('yearly-student'),
    exportName: 'yearly-student-attendance',
  }} />;
}

// ─── 14. Staff Consolidated Report ───────────────────────────────────────────
export function StaffConsolidatedReportPage() {
  return <GenericReportPage config={{
    title: 'Staff Consolidated Attendance Report',
    subtitle: 'Consolidated attendance data for all staff',
    filters: [...dateFilters, ...deptFilters,
      { key: 'staff_type', label: 'Staff Type', type: 'select', options: ['Teaching', 'Non-Teaching', 'All'] },
    ],
    columns: [
      { key: 'emp_code',    label: 'Emp. Code' },
      { key: 'name',        label: 'Name' },
      { key: 'department',  label: 'Department' },
      { key: 'designation', label: 'Designation' },
      { key: 'working_days',label: 'Working Days' },
      { key: 'present',     label: 'Present' },
      { key: 'absent',      label: 'Absent' },
      { key: 'late',        label: 'Late' },
      { key: 'leave',       label: 'On Leave' },
      { key: 'pct',         label: '%', render: v => `${v ?? 0}%` },
    ],
    fetchFn: makeFetch('staff-consolidated'),
    exportName: 'staff-consolidated-report',
  }} />;
}

// ─── 15. Monthly Staff Attendance ─────────────────────────────────────────────
export function MonthlyStaffAttendancePage() {
  return <GenericReportPage config={{
    title: 'Monthly Staff Attendance',
    subtitle: 'Staff attendance for a specific month',
    filters: [monthFilter, yearFilter, ...deptFilters],
    columns: [
      { key: 'emp_code',    label: 'Emp. Code' },
      { key: 'name',        label: 'Staff Name' },
      { key: 'department',  label: 'Department' },
      { key: 'month',       label: 'Month' },
      { key: 'working_days',label: 'Working Days' },
      { key: 'present',     label: 'Present' },
      { key: 'absent',      label: 'Absent' },
      { key: 'late',        label: 'Late' },
      { key: 'pct',         label: '%', render: v => `${v ?? 0}%` },
    ],
    fetchFn: makeFetch('monthly-staff'),
    exportName: 'monthly-staff-attendance',
  }} />;
}

// ─── 16. Monthly Staff Summary ────────────────────────────────────────────────
export function MonthlyStaffSummaryPage() {
  return <GenericReportPage config={{
    title: 'Monthly Staff Attendance Summary',
    subtitle: 'Department-wise monthly summary',
    filters: [monthFilter, yearFilter, ...deptFilters],
    columns: [
      { key: 'department',   label: 'Department' },
      { key: 'total_staff',  label: 'Total Staff' },
      { key: 'avg_present',  label: 'Avg. Present' },
      { key: 'avg_absent',   label: 'Avg. Absent' },
      { key: 'total_leave',  label: 'Total Leave Days' },
      { key: 'avg_pct',      label: 'Avg. %', render: v => `${v ?? 0}%` },
    ],
    fetchFn: makeFetch('monthly-staff-summary'),
    exportName: 'monthly-staff-summary',
  }} />;
}

// ─── 17. Staff Absent Summary ─────────────────────────────────────────────────
export function StaffAbsentSummaryPage() {
  return <GenericReportPage config={{
    title: 'Staff Absent Summary',
    subtitle: 'Summary of staff absences',
    filters: [...dateFilters, ...deptFilters, { key: 'min_absences', label: 'Min Absences', type: 'number' }],
    columns: [
      { key: 'emp_code',     label: 'Emp. Code' },
      { key: 'name',         label: 'Staff Name' },
      { key: 'department',   label: 'Department' },
      { key: 'total_absent', label: 'Total Absent' },
      { key: 'consecutive',  label: 'Max Consecutive' },
      { key: 'contact',      label: 'Contact' },
    ],
    fetchFn: makeFetch('staff-absent-summary'),
    exportName: 'staff-absent-summary',
  }} />;
}

// ─── 18. Staff Attendance ─────────────────────────────────────────────────────
export function StaffAttendancePage() {
  return <GenericReportPage config={{
    title: 'Staff Attendance Register',
    subtitle: 'Daily attendance register for staff',
    filters: [...dateFilters, ...deptFilters, { key: 'staff_id', label: 'Emp. Code', type: 'text' }],
    columns: [
      { key: 'date',        label: 'Date' },
      { key: 'emp_code',    label: 'Emp. Code' },
      { key: 'name',        label: 'Staff Name' },
      { key: 'department',  label: 'Department' },
      { key: 'check_in',    label: 'Check In' },
      { key: 'check_out',   label: 'Check Out' },
      { key: 'status',      label: 'Status' },
      { key: 'remarks',     label: 'Remarks' },
    ],
    fetchFn: makeFetch('staff-attendance'),
    exportName: 'staff-attendance-register',
  }} />;
}

// ─── 19. Staff Consolidated Attendance ───────────────────────────────────────
export function StaffConsolidatedAttendancePage() {
  return <GenericReportPage config={{
    title: 'Staff Consolidated Attendance',
    subtitle: 'Combined view of all staff attendance data',
    filters: [yearFilter, ...deptFilters,
      { key: 'staff_type', label: 'Staff Type', type: 'select', options: ['Teaching', 'Non-Teaching'] },
    ],
    columns: [
      { key: 'emp_code',    label: 'Emp. Code' },
      { key: 'name',        label: 'Name' },
      { key: 'department',  label: 'Department' },
      { key: 'designation', label: 'Designation' },
      { key: 'join_date',   label: 'Join Date' },
      { key: 'total_days',  label: 'Total Days' },
      { key: 'present',     label: 'Present' },
      { key: 'absent',      label: 'Absent' },
      { key: 'leave',       label: 'Leave' },
      { key: 'annual_pct',  label: 'Annual %', render: v => `${v ?? 0}%` },
    ],
    fetchFn: makeFetch('staff-consolidated-full'),
    exportName: 'staff-consolidated-attendance',
  }} />;
}

// ─── 20. Staff Summary Absent ─────────────────────────────────────────────────
export function StaffSummaryAbsentPage() {
  return <GenericReportPage config={{
    title: 'Staff Absence Register',
    subtitle: 'Detailed absence register for staff',
    filters: [monthFilter, yearFilter, ...deptFilters],
    columns: [
      { key: 'emp_code',     label: 'Emp. Code' },
      { key: 'name',         label: 'Staff Name' },
      { key: 'department',   label: 'Department' },
      { key: 'absent_dates', label: 'Absent Dates' },
      { key: 'total_absent', label: 'Total Days' },
      { key: 'reason',       label: 'Reason' },
    ],
    fetchFn: makeFetch('staff-summary-absent'),
    exportName: 'staff-summary-absent',
  }} />;
}

// ─── 21. Follow-up Register ───────────────────────────────────────────────────
export function FollowUpRegisterPage() {
  return <GenericReportPage config={{
    title: 'Follow-up Register',
    subtitle: 'Register of follow-up actions for absent students',
    filters: [...dateFilters, ...classFilters],
    columns: [
      { key: 'date',         label: 'Date' },
      { key: 'student_name', label: 'Student Name' },
      { key: 'adm_no',       label: 'Adm. No.' },
      { key: 'class_name',   label: 'Class' },
      { key: 'absence_days', label: 'Absent Days' },
      { key: 'parent_name',  label: "Parent's Name" },
      { key: 'contact',      label: 'Contact' },
      { key: 'follow_up',    label: 'Follow-up Done' },
      { key: 'remarks',      label: 'Remarks' },
    ],
    fetchFn: makeFetch('follow-up-register'),
    exportName: 'follow-up-register',
  }} />;
}

// ─── 22. Class-wise Daily ─────────────────────────────────────────────────────
export function ClasswiseDailyPage() {
  return <GenericReportPage config={{
    title: 'Class-wise Daily Attendance',
    subtitle: 'Daily attendance count for each class',
    filters: [
      { key: 'date', label: 'Date', type: 'date' },
      ...classFilters,
    ],
    columns: [
      { key: 'class_name', label: 'Class' },
      { key: 'section',    label: 'Section' },
      { key: 'total',      label: 'Total' },
      { key: 'present',    label: 'Present' },
      { key: 'absent',     label: 'Absent' },
      { key: 'late',       label: 'Late' },
      { key: 'pct',        label: '%', render: v => `${v ?? 0}%` },
    ],
    fetchFn: makeFetch('classwise-daily'),
    exportName: 'classwise-daily-attendance',
  }} />;
}

// ─── 23. Monthly Attendance Status ───────────────────────────────────────────
export function MonthlyAttendanceStatusPage() {
  return <GenericReportPage config={{
    title: 'Monthly Attendance Status',
    subtitle: 'Attendance status for each student per day in the month',
    filters: [monthFilter, yearFilter, ...classFilters],
    columns: [
      { key: 'student_name', label: 'Student Name' },
      { key: 'adm_no',       label: 'Adm. No.' },
      { key: 'class_name',   label: 'Class' },
      { key: 'section',      label: 'Section' },
      { key: 'attendance_grid', label: 'Daily Status (P/A/L)' },
      { key: 'total_present',   label: 'Present' },
      { key: 'total_absent',    label: 'Absent' },
      { key: 'pct',             label: '%', render: v => `${v ?? 0}%` },
    ],
    fetchFn: makeFetch('monthly-status'),
    exportName: 'monthly-attendance-status',
  }} />;
}

// ─── 24. Monthly/Yearly Consolidated ─────────────────────────────────────────
export function MonthlyYearlyConsolidatedPage() {
  return <GenericReportPage config={{
    title: 'Monthly & Yearly Consolidated Attendance',
    subtitle: 'Combined monthly and annual attendance view',
    filters: [yearFilter, ...classFilters, ...deptFilters],
    columns: [
      { key: 'name',         label: 'Name' },
      { key: 'type',         label: 'Type (Student/Staff)' },
      { key: 'class_dept',   label: 'Class / Dept' },
      { key: 'q1_pct',       label: 'Q1 %' },
      { key: 'q2_pct',       label: 'Q2 %' },
      { key: 'q3_pct',       label: 'Q3 %' },
      { key: 'q4_pct',       label: 'Q4 %' },
      { key: 'annual_pct',   label: 'Annual %', render: v => `${v ?? 0}%` },
    ],
    fetchFn: makeFetch('monthly-yearly-consolidated'),
    exportName: 'monthly-yearly-consolidated',
  }} />;
}

// ─── 25. Section-wise Daily ───────────────────────────────────────────────────
export function SectionwiseDailyPage() {
  return <GenericReportPage config={{
    title: 'Section-wise Daily Attendance',
    subtitle: 'Daily attendance split by section',
    filters: [
      { key: 'date', label: 'Date', type: 'date' },
      ...classFilters,
    ],
    columns: [
      { key: 'class_name', label: 'Class' },
      { key: 'section',    label: 'Section' },
      { key: 'teacher',    label: 'Class Teacher' },
      { key: 'total',      label: 'Total' },
      { key: 'present',    label: 'Present' },
      { key: 'absent',     label: 'Absent' },
      { key: 'late',       label: 'Late' },
      { key: 'pct',        label: '%', render: v => `${v ?? 0}%` },
    ],
    fetchFn: makeFetch('sectionwise-daily'),
    exportName: 'sectionwise-daily-attendance',
  }} />;
}
