import React from 'react';
import GenericMasterPage from '../../../components/common/GenericMasterPage';
import GenericReportPage from '../../../components/common/GenericReportPage';
import { master, schoolApi } from '../../../services/erp-api';

const makeFns = (resource) => ({
  fetchFn:  () => master.list(resource),
  saveFn:   (d) => master.save(resource, d),
  deleteFn: (id) => master.remove(resource, id),
});

export function SchoolMasterPage() {
  return <GenericMasterPage config={{
    title: 'School Master', addLabel: 'Add School',
    columns: [{ key:'name', label:'School Name' }, { key:'code', label:'Code' }, { key:'board_type', label:'Board' }, { key:'city', label:'City' }],
    fields: [
      { key:'name',      label:'School Name',  required:true },
      { key:'code',      label:'School Code',  required:true, hint:'Short unique code e.g. SVSV2024' },
      { key:'board_type',label:'Board Type',   type:'select', options:['CBSE','ICSE','IGCSE','State','IB'] },
      { key:'phone',     label:'Phone Number' },
      { key:'email',     label:'Email' },
      { key:'website',   label:'Website' },
      { key:'address_line1', label:'Address Line 1' },
      { key:'city',      label:'City' },
      { key:'state',     label:'State' },
      { key:'pincode',   label:'Pincode' },
    ],
    ...makeFns('schools-master'),
  }} />;
}

export function BranchMasterAdminPage() {
  return <GenericMasterPage config={{
    title: 'Branch Master', addLabel: 'Add Branch',
    columns: [{ key:'name', label:'Branch Name' }, { key:'city', label:'City' }, { key:'principal_name', label:'Principal' }],
    fields: [
      { key:'name',           label:'Branch Name',  required:true },
      { key:'code',           label:'Branch Code',  required:true },
      { key:'address',        label:'Address',      type:'textarea' },
      { key:'city',           label:'City' },
      { key:'phone',          label:'Phone' },
      { key:'principal_name', label:'Principal Name' },
    ],
    ...makeFns('branches'),
  }} />;
}

export function BranchMasterConfigPage() {
  return <GenericMasterPage config={{
    title: 'Branch Master Configuration', addLabel: 'Add Config',
    columns: [{ key:'branch_name', label:'Branch' }, { key:'config_key', label:'Config Key' }, { key:'config_value', label:'Value' }],
    fields: [
      { key:'branch_id',    label:'Branch',     type:'select', required:true, options:[] },
      { key:'config_key',   label:'Config Key', required:true },
      { key:'config_value', label:'Value',      required:true },
    ],
    ...makeFns('branch-configs'),
  }} />;
}

export function BlockConfigPage() {
  return <GenericMasterPage config={{
    title: 'Block Configuration', addLabel: 'Add Block',
    columns: [{ key:'name', label:'Block Name' }, { key:'floors', label:'Floors' }, { key:'rooms', label:'Rooms' }],
    fields: [
      { key:'name',   label:'Block Name',   required:true, placeholder:'e.g. Block A, Science Block' },
      { key:'floors', label:'No. of Floors',type:'number', default:1 },
      { key:'rooms',  label:'No. of Rooms', type:'number', default:10 },
    ],
    ...makeFns('blocks'),
  }} />;
}

export function CompanyMasterPage() {
  return <GenericMasterPage config={{
    title: 'Company Master', addLabel: 'Add Company',
    columns: [{ key:'name', label:'Company Name' }, { key:'gst_number', label:'GST Number' }, { key:'pan_number', label:'PAN' }],
    fields: [
      { key:'name',          label:'Company Name', required:true },
      { key:'gst_number',    label:'GST Number' },
      { key:'pan_number',    label:'PAN Number' },
      { key:'address',       label:'Registered Address', type:'textarea' },
      { key:'contact_email', label:'Contact Email' },
    ],
    ...makeFns('companies'),
  }} />;
}

export function ConfigurationMasterPage() {
  return <GenericMasterPage config={{
    title: 'Configuration Master', addLabel: 'Add Config',
    columns: [{ key:'config_key', label:'Key' }, { key:'config_value', label:'Value' }, { key:'module', label:'Module' }],
    fields: [
      { key:'module',       label:'Module',     type:'select', options:['General','Fees','Attendance','Exam','Communication'] },
      { key:'config_key',   label:'Config Key', required:true },
      { key:'config_value', label:'Value',      required:true },
      { key:'description',  label:'Description',type:'textarea' },
    ],
    ...makeFns('configurations'),
  }} />;
}

export function EventMasterPage() {
  return <GenericMasterPage config={{
    title: 'Event Master', addLabel: 'Add Event',
    columns: [{ key:'name', label:'Event Name' }, { key:'event_date', label:'Date' }, { key:'event_type', label:'Type' }],
    fields: [
      { key:'name',        label:'Event Name',  required:true },
      { key:'event_date',  label:'Event Date',  type:'date', required:true },
      { key:'event_type',  label:'Event Type',  type:'select', options:['Holiday','Sports','Cultural','Academic','Other'] },
      { key:'description', label:'Description', type:'textarea' },
      { key:'is_holiday',  label:'Is Holiday',  type:'toggle', default:false },
    ],
    ...makeFns('events'),
  }} />;
}

export function HolidayMasterAdminPage() {
  return <GenericMasterPage config={{
    title: 'Holiday Master', addLabel: 'Add Holiday',
    columns: [{ key:'name', label:'Holiday Name' }, { key:'holiday_date', label:'Date' }, { key:'holiday_type', label:'Type' }],
    fields: [
      { key:'name',         label:'Holiday Name', required:true },
      { key:'holiday_date', label:'Date',         type:'date', required:true },
      { key:'holiday_type', label:'Type',         type:'select', options:['National','Regional','School','Optional'] },
    ],
    ...makeFns('holidays-master'),
  }} />;
}

export function OnlinePaymentConfigPage() {
  return <GenericMasterPage config={{
    title: 'Online Payment Configuration', addLabel: 'Add Config',
    columns: [{ key:'gateway', label:'Gateway' }, { key:'mode', label:'Mode' }, { key:'is_active', label:'Active' }],
    fields: [
      { key:'gateway',   label:'Payment Gateway', type:'select', required:true, options:['Razorpay','PayU','Instamojo','CCAvenue'] },
      { key:'key_id',    label:'API Key ID',       required:true },
      { key:'key_secret',label:'API Key Secret',   required:true, hint:'Stored encrypted' },
      { key:'mode',      label:'Mode',             type:'select', options:['Test','Live'] },
      { key:'webhook_secret', label:'Webhook Secret' },
      { key:'is_active', label:'Active',           type:'toggle', default:true },
    ],
    ...makeFns('payment-configs'),
  }} />;
}

export function StorageConfigPage() {
  return <GenericMasterPage config={{
    title: 'Storage Configuration', addLabel: 'Add Config',
    columns: [{ key:'provider', label:'Provider' }, { key:'bucket', label:'Bucket' }, { key:'is_active', label:'Active' }],
    fields: [
      { key:'provider',   label:'Storage Provider', type:'select', options:['AWS S3','Cloudinary','Supabase Storage','Local'] },
      { key:'bucket',     label:'Bucket/Folder Name' },
      { key:'region',     label:'Region' },
      { key:'access_key', label:'Access Key', hint:'Stored encrypted' },
      { key:'secret_key', label:'Secret Key', hint:'Stored encrypted' },
      { key:'cdn_url',    label:'CDN URL' },
      { key:'is_active',  label:'Active', type:'toggle', default:true },
    ],
    ...makeFns('storage-configs'),
  }} />;
}

export function WhatsappConfigPage() {
  return <GenericMasterPage config={{
    title: 'WhatsApp Configuration', addLabel: 'Add Config',
    columns: [{ key:'phone_number', label:'Phone Number' }, { key:'provider', label:'Provider' }, { key:'is_active', label:'Active' }],
    fields: [
      { key:'provider',       label:'Provider',          type:'select', options:['WhatsApp Cloud API','Twilio','Gupshup','Interakt'] },
      { key:'phone_number',   label:'WhatsApp Phone No.', required:true },
      { key:'access_token',   label:'Access Token',       hint:'Stored encrypted' },
      { key:'phone_number_id',label:'Phone Number ID' },
      { key:'is_active',      label:'Active', type:'toggle', default:true },
    ],
    ...makeFns('whatsapp-configs'),
  }} />;
}

export function StudentProfileVerificationPage() {
  return <GenericReportPage config={{
    title: 'Student Profile Verification',
    subtitle: 'Review and approve student profile changes',
    filters: [
      { key:'class_id', label:'Class', type:'select', options:[] },
      { key:'status',   label:'Status', type:'select', options:['Pending','Approved','Rejected'] },
      { key:'from_date',label:'From Date', type:'date' },
    ],
    columns: [
      { key:'student_name',  label:'Student Name' },
      { key:'admission_no',  label:'Admission No.' },
      { key:'field_changed', label:'Field Changed' },
      { key:'old_value',     label:'Old Value' },
      { key:'new_value',     label:'New Value' },
      { key:'status',        label:'Status' },
      { key:'requested_at',  label:'Requested On' },
    ],
    fetchFn: (f) => master.list(`student-profile-verification?${new URLSearchParams(f)}`),
    exportName: 'student-profile-verification',
  }} />;
}

export function UsageAnalyticsReportPage() {
  return <GenericReportPage config={{
    title: 'Usage Analytics Report',
    subtitle: 'Monitor system usage across modules and users',
    filters: [
      { key:'from_date', label:'From Date', type:'date' },
      { key:'to_date',   label:'To Date',   type:'date' },
      { key:'module',    label:'Module', type:'select', options:['All','Attendance','Fees','Examinations','Communication','Library'] },
      { key:'role',      label:'Role', type:'select', options:['All','school_admin','teacher','parent','student'] },
    ],
    columns: [
      { key:'user_name',   label:'User' },
      { key:'role',        label:'Role' },
      { key:'module',      label:'Module' },
      { key:'action',      label:'Action' },
      { key:'count',       label:'Count' },
      { key:'last_used',   label:'Last Used' },
    ],
    fetchFn: (f) => master.list(`usage-analytics?${new URLSearchParams(f)}`),
    exportName: 'usage-analytics',
  }} />;
}
