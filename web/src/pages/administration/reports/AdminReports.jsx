import React from 'react';
import GenericReportPage from '../../../components/common/GenericReportPage';
import { master } from '../../../services/erp-api';

const dateFilters = [
  { key:'from_date', label:'From Date', type:'date' },
  { key:'to_date',   label:'To Date',   type:'date' },
];

const branchFilter = { key:'branch_id', label:'Branch', type:'select', options:[] };
const classFilter  = { key:'class_id',  label:'Class',  type:'select', options:[] };

const fetchReport = (type) => (f) => master.list(`admin-reports/${type}?${new URLSearchParams(f)}`);

export function BranchNonLoggedReportPage() {
  return <GenericReportPage config={{
    title: 'Branch Level Non-Logged Report',
    subtitle: 'Users who have not logged in within the selected period',
    filters: [...dateFilters, branchFilter, { key:'role', label:'Role', type:'select', options:['All','teacher','parent','student'] }],
    columns: [
      { key:'user_name',   label:'User Name' }, { key:'role',        label:'Role' },
      { key:'branch_name', label:'Branch' },    { key:'last_login',  label:'Last Login' },
      { key:'days_inactive', label:'Days Inactive' },
    ],
    fetchFn: fetchReport('branch-non-logged'), exportName: 'branch-non-logged',
  }} />;
}

export function BranchLoginStatusReportPage() {
  return <GenericReportPage config={{
    title: 'Branch Portal Login Status Report',
    filters: [...dateFilters, branchFilter],
    columns: [
      { key:'branch_name', label:'Branch' }, { key:'total_users', label:'Total Users' },
      { key:'logged_in',   label:'Logged In' }, { key:'not_logged_in', label:'Not Logged' },
      { key:'login_pct',   label:'Login %' },
    ],
    fetchFn: fetchReport('branch-login-status'), exportName: 'branch-login-status',
  }} />;
}

export function HomeworkDeviationReportPage() {
  return <GenericReportPage config={{
    title: 'Homework Posting Deviation Report',
    filters: [...dateFilters, classFilter, { key:'section_id', label:'Section', type:'select', options:[] }],
    columns: [
      { key:'teacher_name', label:'Teacher' }, { key:'subject_name', label:'Subject' },
      { key:'class_name',   label:'Class' },   { key:'scheduled',    label:'Scheduled' },
      { key:'posted',       label:'Posted' },  { key:'deviation',    label:'Deviation' },
    ],
    fetchFn: fetchReport('homework-deviation'), exportName: 'homework-deviation',
  }} />;
}

export function HomeworkDeviationStatusPage() {
  return <GenericReportPage config={{
    title: 'Homework Posting Deviation Status',
    filters: [...dateFilters, classFilter],
    columns: [
      { key:'class_name',   label:'Class' },  { key:'section_name', label:'Section' },
      { key:'total',        label:'Total' },  { key:'on_time',      label:'On Time' },
      { key:'late',         label:'Late' },   { key:'missed',       label:'Missed' },
    ],
    fetchFn: fetchReport('homework-deviation-status'), exportName: 'homework-deviation-status',
  }} />;
}

export function HomeworkPostingStatusPage() {
  return <GenericReportPage config={{
    title: 'Homework Posting Status',
    filters: [...dateFilters, classFilter, { key:'subject_id', label:'Subject', type:'select', options:[] }],
    columns: [
      { key:'teacher_name', label:'Teacher' }, { key:'subject_name', label:'Subject' },
      { key:'date',         label:'Date' },    { key:'title',        label:'HW Title' },
      { key:'status',       label:'Status' },  { key:'posted_at',    label:'Posted At' },
    ],
    fetchFn: fetchReport('homework-posting-status'), exportName: 'homework-posting-status',
  }} />;
}

export function PortalUserMasterReportPage() {
  return <GenericReportPage config={{
    title: 'Portal User Master Report',
    filters: [{ key:'role', label:'Role', type:'select', options:['All','school_admin','teacher','parent','student'] }, ...dateFilters],
    columns: [
      { key:'name',       label:'Name' },       { key:'role',        label:'Role' },
      { key:'email',      label:'Email' },       { key:'phone',       label:'Phone' },
      { key:'is_active',  label:'Active' },      { key:'last_login',  label:'Last Login' },
      { key:'created_at', label:'Created On' },
    ],
    fetchFn: fetchReport('portal-user-master'), exportName: 'portal-user-master',
  }} />;
}

export function ProgressCardStatusReportPage() {
  return <GenericReportPage config={{
    title: 'Progress Card Establishment Status',
    filters: [
      { key:'academic_year_id', label:'Academic Year', type:'select', options:[] },
      { key:'term_id',          label:'Term',          type:'select', options:[] },
      classFilter,
    ],
    columns: [
      { key:'class_name', label:'Class' },   { key:'section_name', label:'Section' },
      { key:'total',      label:'Total' },   { key:'published',    label:'Published' },
      { key:'pending',    label:'Pending' }, { key:'pct',          label:'%' },
    ],
    fetchFn: fetchReport('progress-card-status'), exportName: 'progress-card-status',
  }} />;
}

export function AttendancePostingStatusReportPage() {
  return <GenericReportPage config={{
    title: 'Students / Staff Attendance Posting Status',
    filters: [...dateFilters, classFilter, { key:'type', label:'Type', type:'select', options:['Students','Staff'] }],
    columns: [
      { key:'name',        label:'Class/Dept' }, { key:'date',        label:'Date' },
      { key:'posted',      label:'Posted' },     { key:'not_posted',  label:'Not Posted' },
      { key:'posted_by',   label:'Posted By' },  { key:'posted_at',   label:'Posted At' },
    ],
    fetchFn: fetchReport('attendance-posting-status'), exportName: 'attendance-posting-status',
  }} />;
}

export function UserMasterReportPage() {
  return <GenericReportPage config={{
    title: 'User Master Report',
    filters: [
      { key:'role',      label:'Role',      type:'select', options:['All','school_admin','teacher','parent','student'] },
      { key:'is_active', label:'Status',    type:'select', options:['','Active','Inactive'] },
      ...dateFilters,
    ],
    columns: [
      { key:'name',       label:'Name' },      { key:'role',       label:'Role' },
      { key:'email',      label:'Email' },      { key:'phone',      label:'Phone' },
      { key:'is_active',  label:'Status' },     { key:'created_at', label:'Created On' },
    ],
    fetchFn: fetchReport('user-master'), exportName: 'user-master',
  }} />;
}
