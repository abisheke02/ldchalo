import React from 'react';
import GenericReportPage from '../../../components/common/GenericReportPage';
import { studentApi } from '../../../services/erp-api';

const dateFilters = [
  { key: 'from_date', label: 'From Date', type: 'date' },
  { key: 'to_date',   label: 'To Date',   type: 'date' },
];

const classFilter   = { key: 'class_id',      label: 'Class',           type: 'text', placeholder: 'Class name' };
const sectionFilter = { key: 'section_id',    label: 'Section',         type: 'text', placeholder: 'Section' };
const yearFilter    = { key: 'academic_year', label: 'Academic Year',   type: 'text', placeholder: 'e.g. 2024-25' };
const genderFilter  = { key: 'gender',        label: 'Gender',          type: 'select', options: ['Male', 'Female', 'Other'] };
const categoryFilter = { key: 'category',     label: 'Category',        type: 'select', options: ['General', 'OBC', 'SC', 'ST', 'EWS'] };
const monthFilter   = { key: 'month',         label: 'Month',           type: 'select', options: ['January','February','March','April','May','June','July','August','September','October','November','December'] };

const makeFetch = (type) => (filters) => studentApi.report(type, filters);

// ─── 1. Student List Report ───────────────────────────────────────────────────
export function StudentListReportPage() {
  return <GenericReportPage config={{
    title: 'Student List Report',
    subtitle: 'Complete list of enrolled students',
    filters: [classFilter, sectionFilter, yearFilter, genderFilter, categoryFilter,
      { key: 'status', label: 'Status', type: 'select', options: ['Active', 'TC Issued', 'Transferred'] },
    ],
    columns: [
      { key: 'adm_no',      label: 'Adm. No.' },
      { key: 'name',        label: 'Student Name' },
      { key: 'dob',         label: 'Date of Birth' },
      { key: 'gender',      label: 'Gender' },
      { key: 'class_name',  label: 'Class' },
      { key: 'section',     label: 'Section' },
      { key: 'roll_no',     label: 'Roll No.' },
      { key: 'category',    label: 'Category' },
      { key: 'father_name', label: "Father's Name" },
      { key: 'mother_name', label: "Mother's Name" },
      { key: 'phone',       label: 'Phone' },
      { key: 'status',      label: 'Status' },
    ],
    fetchFn: makeFetch('student-list'),
    exportName: 'student-list',
  }} />;
}

// ─── 2. Student Admission List ────────────────────────────────────────────────
export function StudentAdmissionListPage() {
  return <GenericReportPage config={{
    title: 'Student Admission List',
    subtitle: 'New admissions for the selected period',
    filters: [...dateFilters, classFilter, yearFilter, categoryFilter],
    columns: [
      { key: 'adm_no',        label: 'Adm. No.' },
      { key: 'adm_date',      label: 'Admission Date' },
      { key: 'name',          label: 'Student Name' },
      { key: 'dob',           label: 'Date of Birth' },
      { key: 'gender',        label: 'Gender' },
      { key: 'class_name',    label: 'Class Admitted' },
      { key: 'section',       label: 'Section' },
      { key: 'category',      label: 'Category' },
      { key: 'previous_school',label: 'Previous School' },
      { key: 'parent_name',   label: 'Parent Name' },
      { key: 'phone',         label: 'Phone' },
    ],
    fetchFn: makeFetch('admission-list'),
    exportName: 'student-admission-list',
  }} />;
}

// ─── 3. Student Availability ──────────────────────────────────────────────────
export function StudentAvailabilityPage() {
  return <GenericReportPage config={{
    title: 'Student Availability Report',
    subtitle: 'Students available/present on a given date',
    filters: [
      { key: 'date', label: 'Date', type: 'date' },
      classFilter, sectionFilter,
    ],
    columns: [
      { key: 'adm_no',     label: 'Adm. No.' },
      { key: 'name',       label: 'Student Name' },
      { key: 'class_name', label: 'Class' },
      { key: 'section',    label: 'Section' },
      { key: 'roll_no',    label: 'Roll No.' },
      { key: 'status',     label: 'Status' },
      { key: 'arrival_time', label: 'Arrival Time' },
    ],
    fetchFn: makeFetch('availability'),
    exportName: 'student-availability',
  }} />;
}

// ─── 4. Student Birthday Report ───────────────────────────────────────────────
export function StudentBirthdayReportPage() {
  return <GenericReportPage config={{
    title: 'Student Birthday Report',
    subtitle: 'Students celebrating birthdays in the selected month',
    filters: [monthFilter, classFilter, sectionFilter],
    columns: [
      { key: 'adm_no',     label: 'Adm. No.' },
      { key: 'name',       label: 'Student Name' },
      { key: 'dob',        label: 'Date of Birth' },
      { key: 'birth_day',  label: 'Date' },
      { key: 'class_name', label: 'Class' },
      { key: 'section',    label: 'Section' },
      { key: 'phone',      label: "Parent's Phone" },
    ],
    fetchFn: makeFetch('birthday'),
    exportName: 'student-birthday',
  }} />;
}

// ─── 5. Student Strength ──────────────────────────────────────────────────────
export function StudentStrengthPage() {
  return <GenericReportPage config={{
    title: 'Student Strength',
    subtitle: 'Class-wise and section-wise student strength',
    filters: [classFilter, sectionFilter, yearFilter],
    columns: [
      { key: 'class_name',  label: 'Class' },
      { key: 'section',     label: 'Section' },
      { key: 'total',       label: 'Total Students' },
      { key: 'boys',        label: 'Boys' },
      { key: 'girls',       label: 'Girls' },
      { key: 'others',      label: 'Others' },
      { key: 'general',     label: 'General' },
      { key: 'obc',         label: 'OBC' },
      { key: 'sc',          label: 'SC' },
      { key: 'st',          label: 'ST' },
      { key: 'ews',         label: 'EWS' },
    ],
    fetchFn: makeFetch('strength'),
    exportName: 'student-strength',
  }} />;
}

// ─── 6. Student Strength Report ───────────────────────────────────────────────
export function StudentStrengthReportPage() {
  return <GenericReportPage config={{
    title: 'Student Strength Report',
    subtitle: 'Detailed strength analysis with demographic breakdown',
    filters: [yearFilter, classFilter, categoryFilter, genderFilter],
    columns: [
      { key: 'class_name',  label: 'Class' },
      { key: 'section',     label: 'Section' },
      { key: 'total',       label: 'Total' },
      { key: 'male',        label: 'Male' },
      { key: 'female',      label: 'Female' },
      { key: 'new_admissions', label: 'New Admissions' },
      { key: 'promotions',  label: 'Promoted From' },
      { key: 'tc_issued',   label: 'TC Issued' },
      { key: 'net_strength',label: 'Net Strength' },
    ],
    fetchFn: makeFetch('strength-report'),
    exportName: 'student-strength-report',
  }} />;
}

// ─── 7. Student Participation Report ─────────────────────────────────────────
export function StudentParticipationReportPage() {
  return <GenericReportPage config={{
    title: 'Student Participation Report',
    subtitle: 'Student participation in activities and events',
    filters: [...dateFilters, classFilter, sectionFilter,
      { key: 'activity_type', label: 'Activity Type', type: 'select', options: ['Sports', 'Cultural', 'Academic', 'Co-curricular'] },
    ],
    columns: [
      { key: 'adm_no',        label: 'Adm. No.' },
      { key: 'name',          label: 'Student Name' },
      { key: 'class_name',    label: 'Class' },
      { key: 'section',       label: 'Section' },
      { key: 'activity_name', label: 'Activity' },
      { key: 'activity_type', label: 'Type' },
      { key: 'date',          label: 'Date' },
      { key: 'result',        label: 'Result / Position' },
    ],
    fetchFn: makeFetch('participation'),
    exportName: 'student-participation',
  }} />;
}

// ─── 8. Gender Wise Attendance ────────────────────────────────────────────────
export function GenderWiseAttendancePage() {
  return <GenericReportPage config={{
    title: 'Gender-wise Attendance Report',
    subtitle: 'Attendance split by gender',
    filters: [...dateFilters, classFilter, sectionFilter, yearFilter],
    columns: [
      { key: 'class_name', label: 'Class' },
      { key: 'section',    label: 'Section' },
      { key: 'date',       label: 'Date' },
      { key: 'male_total', label: 'Boys Total' },
      { key: 'male_pres',  label: 'Boys Present' },
      { key: 'male_pct',   label: 'Boys %', render: v => `${v ?? 0}%` },
      { key: 'female_total',label: 'Girls Total' },
      { key: 'female_pres',label: 'Girls Present' },
      { key: 'female_pct', label: 'Girls %', render: v => `${v ?? 0}%` },
      { key: 'overall_pct',label: 'Overall %', render: v => `${v ?? 0}%` },
    ],
    fetchFn: makeFetch('gender-attendance'),
    exportName: 'gender-wise-attendance',
  }} />;
}

// ─── 9. Hostel Students List ──────────────────────────────────────────────────
export function HostelStudentsListPage() {
  return <GenericReportPage config={{
    title: 'Hostel Students List',
    subtitle: 'List of students enrolled in the hostel',
    filters: [classFilter, sectionFilter, yearFilter,
      { key: 'room_no', label: 'Room No.', type: 'text' },
      { key: 'hostel',  label: 'Hostel', type: 'text' },
    ],
    columns: [
      { key: 'adm_no',     label: 'Adm. No.' },
      { key: 'name',       label: 'Student Name' },
      { key: 'class_name', label: 'Class' },
      { key: 'section',    label: 'Section' },
      { key: 'hostel',     label: 'Hostel' },
      { key: 'room_no',    label: 'Room No.' },
      { key: 'bed_no',     label: 'Bed No.' },
      { key: 'warden',     label: 'Warden' },
      { key: 'phone',      label: 'Emergency Phone' },
    ],
    fetchFn: makeFetch('hostel-students'),
    exportName: 'hostel-students',
  }} />;
}

// ─── 10. Previous School Marks ────────────────────────────────────────────────
export function PrevSchoolMarksPage() {
  return <GenericReportPage config={{
    title: 'Previous School Marks Report',
    subtitle: 'Marks obtained in previous school',
    filters: [classFilter, sectionFilter, yearFilter,
      { key: 'prev_board', label: 'Previous Board', type: 'text' },
    ],
    columns: [
      { key: 'adm_no',          label: 'Adm. No.' },
      { key: 'name',            label: 'Student Name' },
      { key: 'class_name',      label: 'Current Class' },
      { key: 'previous_school', label: 'Previous School' },
      { key: 'previous_class',  label: 'Previous Class' },
      { key: 'previous_board',  label: 'Board' },
      { key: 'marks_obtained',  label: 'Marks Obtained' },
      { key: 'max_marks',       label: 'Max Marks' },
      { key: 'percentage',      label: 'Percentage', render: v => `${v ?? 0}%` },
    ],
    fetchFn: makeFetch('prev-school-marks'),
    exportName: 'prev-school-marks',
  }} />;
}

// ─── 11. Promotion Cancellation ───────────────────────────────────────────────
export function PromotionCancellationPage() {
  return <GenericReportPage config={{
    title: 'Promotion Cancellation Report',
    subtitle: 'Students whose promotions were cancelled',
    filters: [...dateFilters, classFilter, yearFilter],
    columns: [
      { key: 'adm_no',        label: 'Adm. No.' },
      { key: 'name',          label: 'Student Name' },
      { key: 'from_class',    label: 'From Class' },
      { key: 'to_class',      label: 'To Class' },
      { key: 'promoted_on',   label: 'Promoted On' },
      { key: 'cancelled_on',  label: 'Cancelled On' },
      { key: 'reason',        label: 'Reason' },
      { key: 'cancelled_by',  label: 'Cancelled By' },
    ],
    fetchFn: makeFetch('promotion-cancellation'),
    exportName: 'promotion-cancellation',
  }} />;
}

// ─── 12. Promotion Status ─────────────────────────────────────────────────────
export function PromotionStatusPage() {
  return <GenericReportPage config={{
    title: 'Promotion Status Report',
    subtitle: 'Promotion status for students across classes',
    filters: [classFilter, yearFilter],
    columns: [
      { key: 'adm_no',      label: 'Adm. No.' },
      { key: 'name',        label: 'Student Name' },
      { key: 'class_name',  label: 'Current Class' },
      { key: 'result',      label: 'Result' },
      { key: 'promoted_to', label: 'Promoted To' },
      { key: 'promoted_on', label: 'Date' },
      { key: 'academic_year',label: 'Academic Year' },
      { key: 'remarks',     label: 'Remarks' },
    ],
    fetchFn: makeFetch('promotion-status'),
    exportName: 'promotion-status',
  }} />;
}

// ─── 13. Sibling Details ──────────────────────────────────────────────────────
export function SiblingDetailsPage() {
  return <GenericReportPage config={{
    title: 'Sibling Details Report',
    subtitle: 'Students who have siblings enrolled in the school',
    filters: [classFilter, sectionFilter, yearFilter],
    columns: [
      { key: 'adm_no',         label: 'Adm. No.' },
      { key: 'name',           label: 'Student Name' },
      { key: 'class_name',     label: 'Class' },
      { key: 'sibling_name',   label: "Sibling's Name" },
      { key: 'sibling_class',  label: "Sibling's Class" },
      { key: 'sibling_adm_no', label: "Sibling's Adm. No." },
      { key: 'parent_name',    label: 'Parent Name' },
      { key: 'phone',          label: 'Phone' },
    ],
    fetchFn: makeFetch('sibling-details'),
    exportName: 'sibling-details',
  }} />;
}

// ─── 14. Staff-Student Report ─────────────────────────────────────────────────
export function StaffStudentReportPage() {
  return <GenericReportPage config={{
    title: 'Staff-Student Ratio Report',
    subtitle: 'Staff to student ratio by class and department',
    filters: [classFilter, yearFilter,
      { key: 'dept', label: 'Department', type: 'text' },
    ],
    columns: [
      { key: 'class_name',     label: 'Class' },
      { key: 'section',        label: 'Section' },
      { key: 'total_students', label: 'Total Students' },
      { key: 'class_teacher',  label: 'Class Teacher' },
      { key: 'total_teachers', label: 'Total Teachers' },
      { key: 'ratio',          label: 'Staff:Student Ratio' },
    ],
    fetchFn: makeFetch('staff-student'),
    exportName: 'staff-student-report',
  }} />;
}

// ─── 15. TC Issued Report ─────────────────────────────────────────────────────
export function TCIssuedStudentPage() {
  return <GenericReportPage config={{
    title: 'TC Issued Report',
    subtitle: 'Students who have received Transfer Certificates',
    filters: [...dateFilters, classFilter, yearFilter],
    columns: [
      { key: 'adm_no',          label: 'Adm. No.' },
      { key: 'name',            label: 'Student Name' },
      { key: 'class_name',      label: 'Class' },
      { key: 'section',         label: 'Section' },
      { key: 'tc_date',         label: 'TC Date' },
      { key: 'tc_number',       label: 'TC Number' },
      { key: 'reason',          label: 'Reason' },
      { key: 'last_attendance', label: 'Last Attendance' },
      { key: 'issued_by',       label: 'Issued By' },
    ],
    fetchFn: makeFetch('tc-issued'),
    exportName: 'tc-issued',
  }} />;
}

// ─── 16. Transport Students List ─────────────────────────────────────────────
export function TransportStudentsPage() {
  return <GenericReportPage config={{
    title: 'Transport Students Report',
    subtitle: 'Students who use school transport',
    filters: [classFilter, sectionFilter, yearFilter,
      { key: 'route', label: 'Route', type: 'text', placeholder: 'Bus route' },
      { key: 'stop',  label: 'Stop',  type: 'text', placeholder: 'Bus stop' },
    ],
    columns: [
      { key: 'adm_no',     label: 'Adm. No.' },
      { key: 'name',       label: 'Student Name' },
      { key: 'class_name', label: 'Class' },
      { key: 'section',    label: 'Section' },
      { key: 'route',      label: 'Route' },
      { key: 'stop',       label: 'Bus Stop' },
      { key: 'vehicle_no', label: 'Vehicle No.' },
      { key: 'driver',     label: 'Driver' },
      { key: 'phone',      label: 'Emergency Phone' },
      { key: 'transport_fee', label: 'Transport Fee' },
    ],
    fetchFn: makeFetch('transport-students'),
    exportName: 'transport-students',
  }} />;
}
