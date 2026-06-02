import React from 'react';
import GenericMasterPage from '../../../components/common/GenericMasterPage';
import { master } from '../../../services/erp-api';

const makeFns = (resource) => ({
  fetchFn:  () => master.list(resource),
  saveFn:   (d) => master.save(resource, d),
  deleteFn: (id) => master.remove(resource, id),
});

export function CasteMasterPage() {
  return <GenericMasterPage config={{
    title: 'Caste Master', addLabel: 'Add Caste',
    columns: [{ key:'name', label:'Caste Name' }, { key:'category', label:'Category' }],
    fields: [
      { key:'name',     label:'Caste Name', required:true },
      { key:'category', label:'Category', type:'select', options:['General','OBC','SC','ST','EWS'] },
    ],
    ...makeFns('castes'),
  }} />;
}

export function CityMasterPage() {
  return <GenericMasterPage config={{
    title: 'City Master', addLabel: 'Add City',
    columns: [{ key:'name', label:'City Name' }, { key:'state_name', label:'State' }, { key:'pincode', label:'Pincode' }],
    fields: [
      { key:'name',     label:'City Name',  required:true },
      { key:'state_id', label:'State',      type:'select', options:[] },
      { key:'pincode',  label:'Pincode' },
    ],
    ...makeFns('cities'),
  }} />;
}

export function CommunityMasterPage() {
  return <GenericMasterPage config={{
    title: 'Community Master', addLabel: 'Add Community',
    columns: [{ key:'name', label:'Community Name' }, { key:'code', label:'Code' }],
    fields: [
      { key:'name', label:'Community Name', required:true },
      { key:'code', label:'Code' },
    ],
    ...makeFns('communities'),
  }} />;
}

export function CountryMasterPage() {
  return <GenericMasterPage config={{
    title: 'Country Master', addLabel: 'Add Country',
    columns: [{ key:'name', label:'Country Name' }, { key:'code', label:'ISO Code' }, { key:'phone_code', label:'Phone Code' }],
    fields: [
      { key:'name',       label:'Country Name', required:true },
      { key:'code',       label:'ISO Code (2-letter)', required:true, placeholder:'e.g. IN, US' },
      { key:'phone_code', label:'Phone Code',   placeholder:'e.g. +91, +1' },
    ],
    ...makeFns('countries'),
  }} />;
}

export function DistrictMasterPage() {
  return <GenericMasterPage config={{
    title: 'District Master', addLabel: 'Add District',
    columns: [{ key:'name', label:'District Name' }, { key:'state_name', label:'State' }],
    fields: [
      { key:'name',     label:'District Name', required:true },
      { key:'state_id', label:'State',         type:'select', options:[] },
    ],
    ...makeFns('districts'),
  }} />;
}

export function MotherTongueMasterPage() {
  return <GenericMasterPage config={{
    title: 'Mother Tongue Master', addLabel: 'Add Language',
    columns: [{ key:'name', label:'Language Name' }, { key:'code', label:'Code' }],
    fields: [
      { key:'name', label:'Language Name', required:true },
      { key:'code', label:'Code' },
    ],
    ...makeFns('mother-tongues'),
  }} />;
}

export function NationalityMasterPage() {
  return <GenericMasterPage config={{
    title: 'Nationality Master', addLabel: 'Add Nationality',
    columns: [{ key:'name', label:'Nationality' }, { key:'country_name', label:'Country' }],
    fields: [
      { key:'name',       label:'Nationality', required:true },
      { key:'country_id', label:'Country',     type:'select', options:[] },
    ],
    ...makeFns('nationalities'),
  }} />;
}

export function ReligionMasterPage() {
  return <GenericMasterPage config={{
    title: 'Religion Master', addLabel: 'Add Religion',
    columns: [{ key:'name', label:'Religion Name' }, { key:'code', label:'Code' }],
    fields: [
      { key:'name', label:'Religion Name', required:true },
      { key:'code', label:'Code' },
    ],
    ...makeFns('religions'),
  }} />;
}

export function StateMasterPage() {
  return <GenericMasterPage config={{
    title: 'State Master', addLabel: 'Add State',
    columns: [{ key:'name', label:'State Name' }, { key:'code', label:'State Code' }, { key:'country_name', label:'Country' }],
    fields: [
      { key:'name',       label:'State Name', required:true },
      { key:'code',       label:'State Code', required:true },
      { key:'country_id', label:'Country',    type:'select', options:[] },
    ],
    ...makeFns('states'),
  }} />;
}
