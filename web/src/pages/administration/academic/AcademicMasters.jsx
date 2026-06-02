import React from 'react';
import GenericMasterPage from '../../../components/common/GenericMasterPage';
import { master } from '../../../services/erp-api';

// ─── Shared helpers ───────────────────────────────────────────────────────────
const makeFns = (resource) => ({
  fetchFn:   () => master.list(resource),
  saveFn:    (d) => master.save(resource, d),
  deleteFn:  (id) => master.remove(resource, id),
});

// ─── 1. Attendance Reason Master ──────────────────────────────────────────────
export function AttendanceReasonMasterPage() {
  return <GenericMasterPage config={{
    title: 'Attendance Reason Master', addLabel: 'Add Reason',
    columns: [{ key:'name', label:'Reason Name' }, { key:'code', label:'Code' }, { key:'applies_to', label:'Applies To' }],
    fields: [
      { key:'name', label:'Reason Name', required:true },
      { key:'code', label:'Short Code', required:true, hint:'e.g. SL, ML, CL' },
      { key:'applies_to', label:'Applies To', type:'select', options:['Students','Staff','Both'] },
      { key:'is_active', label:'Active', type:'toggle', default: true },
    ],
    ...makeFns('attendance-reasons'),
  }} />;
}

// ─── 2. Checklist Master ─────────────────────────────────────────────────────
export function ChecklistMasterPage() {
  return <GenericMasterPage config={{
    title: 'Checklist Master', addLabel: 'Add Checklist',
    columns: [{ key:'name', label:'Checklist Name' }, { key:'category', label:'Category' }, { key:'is_mandatory', label:'Mandatory' }],
    fields: [
      { key:'name', label:'Checklist Name', required:true },
      { key:'category', label:'Category', type:'select', options:['Admission','Staff Joining','TC','Exam'] },
      { key:'description', label:'Description', type:'textarea' },
      { key:'is_mandatory', label:'Mandatory', type:'toggle', default:false },
    ],
    ...makeFns('checklists'),
  }} />;
}

// ─── 3. Class Master ─────────────────────────────────────────────────────────
export function ClassMasterPage() {
  return <GenericMasterPage config={{
    title: 'Class Master', addLabel: 'Add Class',
    columns: [{ key:'name', label:'Class Name' }, { key:'numeric_grade', label:'Grade No.' }, { key:'stream', label:'Stream' }],
    fields: [
      { key:'name', label:'Class Name', required:true, placeholder:'e.g. Grade 6, Class X' },
      { key:'numeric_grade', label:'Grade Number', type:'number' },
      { key:'stream', label:'Stream', type:'select', options:['General','Science','Commerce','Arts','Vocational'] },
    ],
    ...makeFns('classes'),
  }} />;
}

// ─── 4. Class Section Mapping ─────────────────────────────────────────────────
export function ClassSectionMappingPage() {
  return <GenericMasterPage config={{
    title: 'Class Section Mapping', addLabel: 'Add Mapping',
    columns: [{ key:'class_name', label:'Class' }, { key:'section_name', label:'Section' }, { key:'capacity', label:'Capacity' }],
    fields: [
      { key:'class_id',     label:'Class',           type:'select', required:true, options:[] },
      { key:'section_name', label:'Section Name',    required:true, placeholder:'e.g. A, B, C' },
      { key:'capacity',     label:'Student Capacity',type:'number', default:40 },
      { key:'room_number',  label:'Room Number' },
    ],
    ...makeFns('class-section-mappings'),
  }} />;
}

// ─── 5. Class Subject Mapping ─────────────────────────────────────────────────
export function ClassSubjectMappingPage() {
  return <GenericMasterPage config={{
    title: 'Class Subject Mapping', addLabel: 'Add Mapping',
    columns: [{ key:'class_name', label:'Class' }, { key:'section_name', label:'Section' }, { key:'subject_name', label:'Subject' }, { key:'teacher_name', label:'Teacher' }],
    fields: [
      { key:'class_id',    label:'Class',   type:'select', required:true, options:[] },
      { key:'section_id',  label:'Section', type:'select', required:true, options:[] },
      { key:'subject_id',  label:'Subject', type:'select', required:true, options:[] },
      { key:'teacher_id',  label:'Teacher', type:'select', options:[] },
    ],
    ...makeFns('class-subject-mappings'),
  }} />;
}

// ─── 6. House Master ─────────────────────────────────────────────────────────
export function HouseMasterPage() {
  return <GenericMasterPage config={{
    title: 'House Master', addLabel: 'Add House',
    columns: [{ key:'name', label:'House Name' }, { key:'color', label:'Color' }, { key:'incharge', label:'Incharge' }],
    fields: [
      { key:'name',     label:'House Name', required:true, placeholder:'e.g. Red House, Blue House' },
      { key:'color',    label:'Color',      type:'color' },
      { key:'incharge', label:'Incharge Teacher', placeholder:'Teacher name' },
      { key:'motto',    label:'Motto' },
    ],
    ...makeFns('houses'),
  }} />;
}

// ─── 7. Immigration Status Master ─────────────────────────────────────────────
export function ImmigrationStatusMasterPage() {
  return <GenericMasterPage config={{
    title: 'Immigration Status Master', addLabel: 'Add Status',
    columns: [{ key:'name', label:'Status Name' }, { key:'code', label:'Code' }],
    fields: [
      { key:'name', label:'Status Name', required:true },
      { key:'code', label:'Code',        required:true },
      { key:'description', label:'Description', type:'textarea' },
    ],
    ...makeFns('immigration-statuses'),
  }} />;
}

// ─── 8. Level Master ─────────────────────────────────────────────────────────
export function LevelMasterPage() {
  return <GenericMasterPage config={{
    title: 'Level Master', addLabel: 'Add Level',
    columns: [{ key:'name', label:'Level Name' }, { key:'code', label:'Code' }, { key:'sort_order', label:'Order' }],
    fields: [
      { key:'name',       label:'Level Name', required:true },
      { key:'code',       label:'Code',       required:true },
      { key:'sort_order', label:'Sort Order', type:'number', default:0 },
    ],
    ...makeFns('levels'),
  }} />;
}

// ─── 9. Section Master ────────────────────────────────────────────────────────
export function SectionMasterPage() {
  return <GenericMasterPage config={{
    title: 'Section Master', addLabel: 'Add Section',
    columns: [{ key:'name', label:'Section Name' }, { key:'description', label:'Description' }],
    fields: [
      { key:'name',        label:'Section Name', required:true, placeholder:'e.g. A, B, C' },
      { key:'description', label:'Description', type:'textarea' },
    ],
    ...makeFns('sections-master'),
  }} />;
}

// ─── 10. Stream Master ────────────────────────────────────────────────────────
export function StreamMasterPage() {
  return <GenericMasterPage config={{
    title: 'Stream Master', addLabel: 'Add Stream',
    columns: [{ key:'name', label:'Stream Name' }, { key:'code', label:'Code' }],
    fields: [
      { key:'name', label:'Stream Name', required:true },
      { key:'code', label:'Code', required:true },
    ],
    ...makeFns('streams'),
  }} />;
}

// ─── 11. Student Fee Category ─────────────────────────────────────────────────
export function StudentFeeCategoryMasterPage() {
  return <GenericMasterPage config={{
    title: 'Student Fee Category', addLabel: 'Add Category',
    columns: [{ key:'name', label:'Category Name' }, { key:'discount_pct', label:'Discount %' }],
    fields: [
      { key:'name',         label:'Category Name', required:true },
      { key:'discount_pct', label:'Discount %',    type:'number', default:0 },
      { key:'description',  label:'Description',   type:'textarea' },
    ],
    ...makeFns('student-fee-categories'),
  }} />;
}

// ─── 12. Subject Combination ──────────────────────────────────────────────────
export function SubjectCombinationPage() {
  return <GenericMasterPage config={{
    title: 'Subject Combination', addLabel: 'Add Combination',
    columns: [{ key:'name', label:'Combination Name' }, { key:'class_name', label:'Class' }, { key:'subjects', label:'Subjects' }],
    fields: [
      { key:'name',       label:'Combination Name', required:true },
      { key:'class_id',   label:'Class', type:'select', required:true, options:[] },
      { key:'subjects',   label:'Subjects (comma separated)', hint:'Enter subject codes separated by commas' },
    ],
    ...makeFns('subject-combinations'),
  }} />;
}

// ─── 13. Subject Master ───────────────────────────────────────────────────────
export function SubjectMasterAdminPage() {
  return <GenericMasterPage config={{
    title: 'Subject Master', addLabel: 'Add Subject',
    columns: [{ key:'name', label:'Subject Name' }, { key:'code', label:'Code' }, { key:'subject_type', label:'Type' }],
    fields: [
      { key:'name',         label:'Subject Name', required:true },
      { key:'code',         label:'Subject Code', required:true },
      { key:'subject_type', label:'Subject Type', type:'select', options:['Core','Elective','Language','Activity'] },
      { key:'department',   label:'Department' },
      { key:'is_elective',  label:'Is Elective', type:'toggle', default:false },
    ],
    ...makeFns('subjects-master'),
  }} />;
}

// ─── 14. Subject Type Master ──────────────────────────────────────────────────
export function SubjectTypeMasterPage() {
  return <GenericMasterPage config={{
    title: 'Subject Type Master', addLabel: 'Add Type',
    columns: [{ key:'name', label:'Type Name' }, { key:'code', label:'Code' }],
    fields: [
      { key:'name', label:'Type Name', required:true },
      { key:'code', label:'Code',      required:true },
    ],
    ...makeFns('subject-types'),
  }} />;
}

// ─── 15. Term Master ─────────────────────────────────────────────────────────
export function TermMasterPage() {
  return <GenericMasterPage config={{
    title: 'Term Master', addLabel: 'Add Term',
    columns: [{ key:'name', label:'Term Name' }, { key:'starts_on', label:'Start Date' }, { key:'ends_on', label:'End Date' }],
    fields: [
      { key:'name',      label:'Term Name', required:true, placeholder:'e.g. Term 1, Q1' },
      { key:'starts_on', label:'Start Date', type:'date', required:true },
      { key:'ends_on',   label:'End Date',   type:'date', required:true },
    ],
    ...makeFns('terms-master'),
  }} />;
}
