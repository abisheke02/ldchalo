import React from 'react';
import GenericReportPage from '../../../components/common/GenericReportPage';
import { staffApi } from '../../../services/erp-api';

const dateFilters = [
  { key: 'from_date', label: 'From Date', type: 'date' },
  { key: 'to_date',   label: 'To Date',   type: 'date' },
];

const deptFilter       = { key: 'department',   label: 'Department',   type: 'text', placeholder: 'Department name' };
const designationFilter = { key: 'designation', label: 'Designation',  type: 'text', placeholder: 'Designation' };
const yearFilter        = { key: 'academic_year', label: 'Academic Year', type: 'text', placeholder: 'e.g. 2024-25' };
const staffTypeFilter   = { key: 'staff_type',  label: 'Staff Type',   type: 'select', options: ['Teaching', 'Non-Teaching', 'Administrative', 'Support'] };

const makeFetch = (type) => (filters) => staffApi.report(type, filters);

// ─── 1. Staff List Report ─────────────────────────────────────────────────────
export function StaffListReportPage() {
  return <GenericReportPage config={{
    title: 'Staff List Report',
    subtitle: 'Complete list of all school staff members',
    filters: [deptFilter, designationFilter, staffTypeFilter,
      { key: 'status', label: 'Employment Status', type: 'select', options: ['Active', 'On Leave', 'Resigned', 'Retired'] },
    ],
    columns: [
      { key: 'emp_code',    label: 'Emp. Code' },
      { key: 'name',        label: 'Name' },
      { key: 'gender',      label: 'Gender' },
      { key: 'dob',         label: 'Date of Birth' },
      { key: 'designation', label: 'Designation' },
      { key: 'department',  label: 'Department' },
      { key: 'staff_type',  label: 'Type' },
      { key: 'join_date',   label: 'Join Date' },
      { key: 'mobile',      label: 'Mobile' },
      { key: 'email',       label: 'Email' },
      { key: 'status',      label: 'Status' },
    ],
    fetchFn: makeFetch('staff-list'),
    exportName: 'staff-list',
  }} />;
}

// ─── 2. Staff Birthday Report ─────────────────────────────────────────────────
export function StaffBirthdayReportPage() {
  return <GenericReportPage config={{
    title: 'Staff Birthday Report',
    subtitle: 'Staff birthdays for the selected month',
    filters: [
      { key: 'month', label: 'Month', type: 'select', options: ['January','February','March','April','May','June','July','August','September','October','November','December'] },
      deptFilter,
      staffTypeFilter,
    ],
    columns: [
      { key: 'emp_code',    label: 'Emp. Code' },
      { key: 'name',        label: 'Name' },
      { key: 'dob',         label: 'Date of Birth' },
      { key: 'birth_day',   label: 'Birth Day' },
      { key: 'birth_month', label: 'Month' },
      { key: 'designation', label: 'Designation' },
      { key: 'department',  label: 'Department' },
      { key: 'mobile',      label: 'Mobile' },
    ],
    fetchFn: makeFetch('staff-birthday'),
    exportName: 'staff-birthday',
  }} />;
}

// ─── 3. Staff Allocation Report ───────────────────────────────────────────────
export function StaffAllocationReportPage() {
  return <GenericReportPage config={{
    title: 'Staff Allocation Report',
    subtitle: 'Teacher-subject-class allocation details',
    filters: [
      yearFilter,
      deptFilter,
      { key: 'class_id', label: 'Class',   type: 'text', placeholder: 'Class name' },
      { key: 'subject',  label: 'Subject', type: 'text', placeholder: 'Subject name' },
    ],
    columns: [
      { key: 'emp_code',     label: 'Emp. Code' },
      { key: 'name',         label: 'Teacher Name' },
      { key: 'subject_name', label: 'Subject' },
      { key: 'class_name',   label: 'Class' },
      { key: 'section',      label: 'Section' },
      { key: 'periods_week', label: 'Periods/Week' },
      { key: 'academic_year',label: 'Academic Year' },
    ],
    fetchFn: makeFetch('staff-allocation'),
    exportName: 'staff-allocation',
  }} />;
}

// ─── 4. Annual Lesson Plan Report ─────────────────────────────────────────────
export function AnnualLessonPlanReportPage() {
  return <GenericReportPage config={{
    title: 'Annual Lesson Plan Report',
    subtitle: 'Year-wise lesson plan progress by teacher and subject',
    filters: [yearFilter, deptFilter,
      { key: 'subject', label: 'Subject', type: 'text', placeholder: 'Subject name' },
      { key: 'class_id', label: 'Class', type: 'text' },
    ],
    columns: [
      { key: 'teacher_name', label: 'Teacher' },
      { key: 'subject_name', label: 'Subject' },
      { key: 'class_name',   label: 'Class' },
      { key: 'total_chapters', label: 'Total Chapters' },
      { key: 'completed',    label: 'Completed' },
      { key: 'pending',      label: 'Pending' },
      { key: 'completion_pct', label: 'Completion %', render: v => `${v ?? 0}%` },
      { key: 'academic_year', label: 'Academic Year' },
    ],
    fetchFn: makeFetch('annual-lesson-plan'),
    exportName: 'annual-lesson-plan',
  }} />;
}

// ─── 5. Appointment Details Report ───────────────────────────────────────────
export function AppointmentDetailsReportPage() {
  return <GenericReportPage config={{
    title: 'Appointment Details Report',
    subtitle: 'Staff appointment and joining history',
    filters: [...dateFilters, deptFilter, designationFilter, staffTypeFilter],
    columns: [
      { key: 'emp_code',      label: 'Emp. Code' },
      { key: 'name',          label: 'Name' },
      { key: 'designation',   label: 'Designation' },
      { key: 'department',    label: 'Department' },
      { key: 'appointment_date', label: 'Appointment Date' },
      { key: 'join_date',     label: 'Joining Date' },
      { key: 'appointment_type', label: 'Type' },
      { key: 'employment_type', label: 'Employment' },
      { key: 'reporting_to',  label: 'Reporting To' },
    ],
    fetchFn: makeFetch('appointment-details'),
    exportName: 'appointment-details',
  }} />;
}

// ─── 6. Overall Staff Details Report ─────────────────────────────────────────
export function OverallStaffDetailsReportPage() {
  return <GenericReportPage config={{
    title: 'Overall Staff Details Report',
    subtitle: 'Comprehensive staff details including personal, employment and bank info',
    filters: [deptFilter, designationFilter, staffTypeFilter,
      { key: 'status', label: 'Status', type: 'select', options: ['Active', 'Resigned', 'Retired', 'All'] },
    ],
    columns: [
      { key: 'emp_code',    label: 'Emp. Code' },
      { key: 'name',        label: 'Name' },
      { key: 'dob',         label: 'DOB' },
      { key: 'gender',      label: 'Gender' },
      { key: 'designation', label: 'Designation' },
      { key: 'department',  label: 'Department' },
      { key: 'join_date',   label: 'Join Date' },
      { key: 'qualification', label: 'Qualification' },
      { key: 'experience',  label: 'Experience' },
      { key: 'mobile',      label: 'Mobile' },
      { key: 'email',       label: 'Email' },
      { key: 'address',     label: 'Address' },
      { key: 'basic_salary',label: 'Basic Salary' },
      { key: 'bank_name',   label: 'Bank' },
      { key: 'account_no',  label: 'Account No.' },
    ],
    fetchFn: makeFetch('overall-staff-details'),
    exportName: 'overall-staff-details',
  }} />;
}

// ─── 7. Relieving Details Report ──────────────────────────────────────────────
export function RelievingDetailsReportPage() {
  return <GenericReportPage config={{
    title: 'Relieving Details Report',
    subtitle: 'Staff who have been relieved / resigned',
    filters: [...dateFilters, deptFilter, designationFilter],
    columns: [
      { key: 'emp_code',      label: 'Emp. Code' },
      { key: 'name',          label: 'Name' },
      { key: 'designation',   label: 'Designation' },
      { key: 'department',    label: 'Department' },
      { key: 'join_date',     label: 'Join Date' },
      { key: 'relieving_date',label: 'Relieving Date' },
      { key: 'reason',        label: 'Reason' },
      { key: 'notice_period', label: 'Notice Period' },
      { key: 'lwd',           label: 'Last Working Day' },
      { key: 'remarks',       label: 'Remarks' },
    ],
    fetchFn: makeFetch('relieving-details'),
    exportName: 'relieving-details',
  }} />;
}

// ─── 8. Retirement Details Report ────────────────────────────────────────────
export function RetirementDetailsReportPage() {
  return <GenericReportPage config={{
    title: 'Retirement Details Report',
    subtitle: 'Staff retirement information and upcoming retirements',
    filters: [
      ...dateFilters,
      deptFilter,
      { key: 'upcoming_months', label: 'Retiring in Next (months)', type: 'number', placeholder: '6' },
    ],
    columns: [
      { key: 'emp_code',        label: 'Emp. Code' },
      { key: 'name',            label: 'Name' },
      { key: 'designation',     label: 'Designation' },
      { key: 'department',      label: 'Department' },
      { key: 'dob',             label: 'Date of Birth' },
      { key: 'join_date',       label: 'Join Date' },
      { key: 'retirement_date', label: 'Retirement Date' },
      { key: 'years_of_service',label: 'Years of Service' },
      { key: 'status',          label: 'Status' },
    ],
    fetchFn: makeFetch('retirement-details'),
    exportName: 'retirement-details',
  }} />;
}

// ─── 9. Service Extension Report ─────────────────────────────────────────────
export function ServiceExtensionReportPage() {
  return <GenericReportPage config={{
    title: 'Service Extension Report',
    subtitle: 'Staff service extensions post-retirement age',
    filters: [...dateFilters, deptFilter, designationFilter],
    columns: [
      { key: 'emp_code',          label: 'Emp. Code' },
      { key: 'name',              label: 'Name' },
      { key: 'designation',       label: 'Designation' },
      { key: 'department',        label: 'Department' },
      { key: 'retirement_date',   label: 'Original Retirement' },
      { key: 'extension_from',    label: 'Extension From' },
      { key: 'extension_to',      label: 'Extension To' },
      { key: 'extension_months',  label: 'Extension (months)' },
      { key: 'approval_authority',label: 'Approved By' },
      { key: 'remarks',           label: 'Remarks' },
    ],
    fetchFn: makeFetch('service-extension'),
    exportName: 'service-extension',
  }} />;
}
