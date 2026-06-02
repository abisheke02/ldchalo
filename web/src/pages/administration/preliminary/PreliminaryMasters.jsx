import React from 'react';
import GenericMasterPage from '../../../components/common/GenericMasterPage';
import { master } from '../../../services/erp-api';

const makeFns = (resource) => ({
  fetchFn:  () => master.list(resource),
  saveFn:   (d) => master.save(resource, d),
  deleteFn: (id) => master.remove(resource, id),
});

export function AdmissionCategoryPage() {
  return <GenericMasterPage config={{
    title: 'Admission Category', addLabel: 'Add Category',
    columns: [{ key:'name', label:'Category Name' }, { key:'code', label:'Code' }],
    fields: [
      { key:'name', label:'Category Name', required:true },
      { key:'code', label:'Code',          required:true },
      { key:'description', label:'Description', type:'textarea' },
    ],
    ...makeFns('admission-categories'),
  }} />;
}

export function AdmissionPriorityPage() {
  return <GenericMasterPage config={{
    title: 'Admission Priority', addLabel: 'Add Priority',
    columns: [{ key:'name', label:'Priority Name' }, { key:'order', label:'Order' }],
    fields: [
      { key:'name',  label:'Priority Name', required:true },
      { key:'order', label:'Sort Order',    type:'number', default:1 },
    ],
    ...makeFns('admission-priorities'),
  }} />;
}

export function AdmissionTypePage() {
  return <GenericMasterPage config={{
    title: 'Admission Type', addLabel: 'Add Type',
    columns: [{ key:'name', label:'Type Name' }, { key:'code', label:'Code' }],
    fields: [
      { key:'name', label:'Type Name', required:true },
      { key:'code', label:'Code',      required:true },
    ],
    ...makeFns('admission-types'),
  }} />;
}

export function CallCategoryPage() {
  return <GenericMasterPage config={{
    title: 'Call Category', addLabel: 'Add Category',
    columns: [{ key:'name', label:'Category Name' }],
    fields: [
      { key:'name',        label:'Category Name', required:true },
      { key:'description', label:'Description',   type:'textarea' },
    ],
    ...makeFns('call-categories'),
  }} />;
}

export function CallPurposePage() {
  return <GenericMasterPage config={{
    title: 'Call Purpose', addLabel: 'Add Purpose',
    columns: [{ key:'name', label:'Purpose' }, { key:'category_name', label:'Category' }],
    fields: [
      { key:'name',        label:'Purpose',  required:true },
      { key:'category_id', label:'Category', type:'select', options:[] },
    ],
    ...makeFns('call-purposes'),
  }} />;
}

export function CallStatusPage() {
  return <GenericMasterPage config={{
    title: 'Call Status', addLabel: 'Add Status',
    columns: [{ key:'name', label:'Status Name' }, { key:'color', label:'Color' }],
    fields: [
      { key:'name',  label:'Status Name', required:true },
      { key:'color', label:'Color',       type:'color' },
    ],
    ...makeFns('call-statuses'),
  }} />;
}

export function EnquiryModePage() {
  return <GenericMasterPage config={{
    title: 'Enquiry Mode', addLabel: 'Add Mode',
    columns: [{ key:'name', label:'Mode Name' }, { key:'icon', label:'Icon' }],
    fields: [
      { key:'name', label:'Mode Name', required:true },
      { key:'icon', label:'Icon/Emoji', placeholder:'e.g. 📱, 🌐, 📞' },
    ],
    ...makeFns('enquiry-modes'),
  }} />;
}

export function EnquirySourcePage() {
  return <GenericMasterPage config={{
    title: 'Enquiry Source', addLabel: 'Add Source',
    columns: [{ key:'name', label:'Source Name' }],
    fields: [
      { key:'name', label:'Source Name', required:true, placeholder:'e.g. Website, Referral, Walk-in' },
    ],
    ...makeFns('enquiry-sources'),
  }} />;
}

export function EnquiryStatusPage() {
  return <GenericMasterPage config={{
    title: 'Enquiry Status', addLabel: 'Add Status',
    columns: [{ key:'name', label:'Status Name' }, { key:'color', label:'Color' }, { key:'is_final', label:'Final' }],
    fields: [
      { key:'name',     label:'Status Name', required:true },
      { key:'color',    label:'Color',       type:'color' },
      { key:'is_final', label:'Is Final Status', type:'toggle', default:false },
    ],
    ...makeFns('enquiry-statuses'),
  }} />;
}

export function StaffDesignationPage() {
  return <GenericMasterPage config={{
    title: 'Staff Designation', addLabel: 'Add Designation',
    columns: [{ key:'name', label:'Designation' }, { key:'department', label:'Department' }, { key:'level', label:'Level' }],
    fields: [
      { key:'name',       label:'Designation', required:true },
      { key:'department', label:'Department' },
      { key:'level',      label:'Level/Grade' },
    ],
    ...makeFns('staff-designations'),
  }} />;
}

export function StaffTypePage() {
  return <GenericMasterPage config={{
    title: 'Staff Type', addLabel: 'Add Staff Type',
    columns: [{ key:'name', label:'Staff Type' }, { key:'code', label:'Code' }],
    fields: [
      { key:'name', label:'Staff Type', required:true },
      { key:'code', label:'Code',       required:true },
    ],
    ...makeFns('staff-types'),
  }} />;
}
