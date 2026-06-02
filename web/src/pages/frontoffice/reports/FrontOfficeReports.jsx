import React from 'react';
import GenericReportPage from '../../../components/common/GenericReportPage';
import { frontOfficeApi } from '../../../services/erp-api';

const dateFilters = [
  { key: 'from_date', label: 'From Date', type: 'date' },
  { key: 'to_date',   label: 'To Date',   type: 'date' },
];

const classFilter = { key: 'class', label: 'Class Applying', type: 'text', placeholder: 'e.g. Grade 6' };
const yearFilter  = { key: 'academic_year', label: 'Academic Year', type: 'text', placeholder: 'e.g. 2024-25' };
const statusFilter = {
  key: 'status', label: 'Status', type: 'select',
  options: ['New', 'In Progress', 'Follow-up Needed', 'Converted', 'Closed', 'Not Interested'],
};
const categoryFilter = {
  key: 'category', label: 'Category', type: 'select',
  options: ['Walk-in', 'Phone Call', 'Email', 'Website', 'Referral', 'Social Media'],
};

const makeFetch = (type) => (filters) => frontOfficeApi.report(type, filters);

// ─── 1. Applicant Siblings Report ─────────────────────────────────────────────
export function ApplicantSiblingsReportPage() {
  return <GenericReportPage config={{
    title: 'Applicant Siblings Report',
    subtitle: 'Applicants who have siblings already enrolled',
    filters: [...dateFilters, classFilter, yearFilter],
    columns: [
      { key: 'applicant_name',  label: 'Applicant Name' },
      { key: 'class_applying',  label: 'Class Applying' },
      { key: 'sibling_name',    label: "Sibling's Name" },
      { key: 'sibling_class',   label: "Sibling's Class" },
      { key: 'parent_name',     label: 'Parent Name' },
      { key: 'phone',           label: 'Phone' },
      { key: 'application_date',label: 'Application Date' },
    ],
    fetchFn: makeFetch('applicant-siblings'),
    exportName: 'applicant-siblings-report',
  }} />;
}

// ─── 2. Application List Report ───────────────────────────────────────────────
export function ApplicationListReportPage() {
  return <GenericReportPage config={{
    title: 'Application List Report',
    subtitle: 'Complete list of all admission applications',
    filters: [
      ...dateFilters,
      classFilter,
      yearFilter,
      { key: 'app_status', label: 'Application Status', type: 'select', options: ['Submitted', 'Under Review', 'Approved', 'Rejected', 'Waitlisted'] },
      { key: 'gender', label: 'Gender', type: 'select', options: ['Male', 'Female', 'Other'] },
    ],
    columns: [
      { key: 'app_id',          label: 'App. ID' },
      { key: 'applicant_name',  label: 'Applicant Name' },
      { key: 'dob',             label: 'Date of Birth' },
      { key: 'gender',          label: 'Gender' },
      { key: 'class_applying',  label: 'Class' },
      { key: 'category',        label: 'Category' },
      { key: 'parent_name',     label: 'Parent Name' },
      { key: 'phone',           label: 'Phone' },
      { key: 'application_date',label: 'Applied On' },
      { key: 'status',          label: 'Status' },
    ],
    fetchFn: makeFetch('application-list'),
    exportName: 'application-list',
  }} />;
}

// ─── 3. Call Register ─────────────────────────────────────────────────────────
export function CallRegisterReportPage() {
  return <GenericReportPage config={{
    title: 'Call Register Report',
    subtitle: 'Log of all enquiry calls received',
    filters: [...dateFilters, statusFilter, categoryFilter],
    columns: [
      { key: 'call_id',         label: 'Call ID' },
      { key: 'date',            label: 'Date' },
      { key: 'parent_name',     label: 'Parent Name' },
      { key: 'phone',           label: 'Phone' },
      { key: 'student_name',    label: 'Student Name' },
      { key: 'class_interested',label: 'Class Interested' },
      { key: 'purpose',         label: 'Purpose' },
      { key: 'category',        label: 'Category' },
      { key: 'status',          label: 'Status' },
      { key: 'handled_by',      label: 'Handled By' },
      { key: 'remarks',         label: 'Remarks' },
    ],
    fetchFn: makeFetch('call-register'),
    exportName: 'call-register',
  }} />;
}

// ─── 4. Enquiry Status Report ─────────────────────────────────────────────────
export function EnquiryStatusReportPage() {
  return <GenericReportPage config={{
    title: 'Enquiry Status Report',
    subtitle: 'Current status of all enquiries',
    filters: [...dateFilters, statusFilter, classFilter],
    columns: [
      { key: 'enquiry_id',      label: 'Enquiry ID' },
      { key: 'parent_name',     label: 'Parent Name' },
      { key: 'phone',           label: 'Phone' },
      { key: 'class_interested',label: 'Class Interested' },
      { key: 'status',          label: 'Status', render: (v) => (
          <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
            v === 'Converted' ? 'bg-green-100 text-green-700' :
            v === 'Closed' ? 'bg-gray-100 text-gray-600' :
            'bg-yellow-100 text-yellow-700'
          }`}>{v || '—'}</span>
        )},
      { key: 'assigned_to',     label: 'Assigned To' },
      { key: 'last_followup',   label: 'Last Follow-up' },
      { key: 'next_followup',   label: 'Next Follow-up' },
      { key: 'remarks',         label: 'Remarks' },
    ],
    fetchFn: makeFetch('enquiry-status'),
    exportName: 'enquiry-status-report',
  }} />;
}

// ─── 5. Enquiry List Report ───────────────────────────────────────────────────
export function EnquiryListReportPage() {
  return <GenericReportPage config={{
    title: 'Enquiry List Report',
    subtitle: 'Complete list of all admission enquiries',
    filters: [
      ...dateFilters,
      classFilter,
      statusFilter,
      { key: 'source', label: 'Enquiry Source', type: 'select', options: ['Walk-in', 'Phone', 'Email', 'Website', 'Referral', 'Social Media'] },
    ],
    columns: [
      { key: 'enquiry_id',      label: 'Enquiry ID' },
      { key: 'date',            label: 'Date' },
      { key: 'student_name',    label: 'Student Name' },
      { key: 'parent_name',     label: 'Parent Name' },
      { key: 'phone',           label: 'Phone' },
      { key: 'email',           label: 'Email' },
      { key: 'class_interested',label: 'Class Interested' },
      { key: 'source',          label: 'Source' },
      { key: 'purpose',         label: 'Purpose' },
      { key: 'status',          label: 'Status' },
    ],
    fetchFn: makeFetch('enquiry-list'),
    exportName: 'enquiry-list',
  }} />;
}

// ─── 6. Draft Application Report ─────────────────────────────────────────────
export function DraftApplicationReportPage() {
  return <GenericReportPage config={{
    title: 'Draft Application Report',
    subtitle: 'Applications saved as draft (incomplete submissions)',
    filters: [...dateFilters, classFilter, yearFilter],
    columns: [
      { key: 'draft_id',       label: 'Draft ID' },
      { key: 'applicant_name', label: 'Applicant Name' },
      { key: 'class_applying', label: 'Class' },
      { key: 'parent_name',    label: 'Parent Name' },
      { key: 'phone',          label: 'Phone' },
      { key: 'last_saved',     label: 'Last Saved' },
      { key: 'completion_pct', label: 'Completion %', render: v => `${v ?? 0}%` },
      { key: 'missing_fields', label: 'Missing Fields' },
    ],
    fetchFn: makeFetch('draft-applications'),
    exportName: 'draft-application-report',
  }} />;
}

// ─── 7. Gate Pass Report ──────────────────────────────────────────────────────
export function GatePassReportPage() {
  return <GenericReportPage config={{
    title: 'Gate Pass Report',
    subtitle: 'Log of all gate passes issued',
    filters: [
      ...dateFilters,
      { key: 'pass_type', label: 'Pass Type', type: 'select', options: ['Student', 'Visitor', 'Staff'] },
      { key: 'purpose',   label: 'Purpose',   type: 'text', placeholder: 'e.g. Medical, Early leave' },
    ],
    columns: [
      { key: 'pass_no',    label: 'Pass No.' },
      { key: 'date',       label: 'Date' },
      { key: 'time_out',   label: 'Time Out' },
      { key: 'time_in',    label: 'Time In' },
      { key: 'name',       label: 'Name' },
      { key: 'type',       label: 'Type' },
      { key: 'class_dept', label: 'Class / Dept' },
      { key: 'purpose',    label: 'Purpose' },
      { key: 'issued_by',  label: 'Issued By' },
      { key: 'authorized_by', label: 'Authorized By' },
    ],
    fetchFn: makeFetch('gate-pass'),
    exportName: 'gate-pass-report',
  }} />;
}
