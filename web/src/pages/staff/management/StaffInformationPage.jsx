import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { staffApi } from '../../../services/erp-api';

const TABS = [
  { id: 'personal',    label: 'Personal Info' },
  { id: 'employment',  label: 'Employment' },
  { id: 'documents',   label: 'Documents' },
  { id: 'salary',      label: 'Salary & Bank' },
];

export default function StaffInformationPage() {
  const [staffList, setStaffList] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [activeTab, setActiveTab] = useState('personal');
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadStaffList();
  }, []);

  const loadStaffList = async () => {
    setLoadingList(true);
    try {
      const data = await staffApi.list();
      setStaffList(data || []);
    } catch {
      toast.error('Failed to load staff list');
    } finally {
      setLoadingList(false);
    }
  };

  const loadProfile = useCallback(async (staffId) => {
    setLoadingProfile(true);
    setEditing(false);
    try {
      const data = await staffApi.get(staffId);
      setProfile(data);
      setForm(data || {});
    } catch {
      toast.error('Failed to load staff profile');
    } finally {
      setLoadingProfile(false);
    }
  }, []);

  const selectStaff = (staff) => {
    setSelectedStaff(staff);
    loadProfile(staff.id);
    setActiveTab('personal');
  };

  const handleEdit = () => {
    setForm({ ...profile });
    setEditing(true);
  };

  const handleCancel = () => {
    setForm({ ...profile });
    setEditing(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await staffApi.save({ ...form, id: profile.id });
      setProfile({ ...form, id: profile.id });
      setEditing(false);
      toast.success('Staff profile updated');
    } catch (err) {
      toast.error(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const set = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const filteredStaff = staffList.filter(s =>
    [s.name, s.first_name, s.last_name, s.employee_code, s.designation, s.department_name].some(v =>
      String(v || '').toLowerCase().includes(search.toLowerCase())
    )
  );

  const inputCls = `w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 ${editing ? 'border-indigo-200 bg-white' : 'border-transparent bg-gray-50 text-gray-700'}`;
  const labelCls = 'block text-xs font-semibold text-gray-500 mb-1';

  const InfoField = ({ label, value, fieldKey, type = 'text' }) => (
    <div>
      <label className={labelCls}>{label}</label>
      {editing
        ? type === 'textarea'
          ? <textarea rows={3} value={form[fieldKey] || ''} onChange={e => set(fieldKey, e.target.value)} className={inputCls} />
          : <input type={type} value={form[fieldKey] || ''} onChange={e => set(fieldKey, e.target.value)} className={inputCls} />
        : <p className="text-sm text-gray-800 bg-gray-50 px-3 py-2 rounded-lg">{value || <span className="text-gray-400">—</span>}</p>
      }
    </div>
  );

  return (
    <div className="flex h-full gap-4">
      {/* Left Sidebar - Staff List */}
      <div className="w-72 flex-shrink-0 bg-white border border-gray-100 rounded-xl shadow-sm flex flex-col overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-800 mb-3">Staff Members</h2>
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text" placeholder="Search staff..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loadingList ? (
            <div className="p-4 space-y-2">
              {[1,2,3,4,5].map(i => <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />)}
            </div>
          ) : filteredStaff.length === 0 ? (
            <div className="p-4 text-center text-gray-400 text-sm">No staff found</div>
          ) : (
            filteredStaff.map(staff => (
              <button
                key={staff.id}
                onClick={() => selectStaff(staff)}
                className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-indigo-50 transition-colors ${selectedStaff?.id === staff.id ? 'bg-indigo-50 border-l-4 border-l-indigo-500' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600 flex-shrink-0">
                    {(staff.name || staff.first_name || 'S').charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-gray-800 truncate">{staff.name || `${staff.first_name || ''} ${staff.last_name || ''}`.trim()}</div>
                    <div className="text-xs text-gray-400 truncate">{staff.designation || staff.department_name || '—'}</div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex flex-col min-w-0">
        {!selectedStaff ? (
          <div className="flex-1 flex items-center justify-center bg-white border border-gray-100 rounded-xl shadow-sm">
            <div className="text-center text-gray-400">
              <svg className="w-12 h-12 mx-auto mb-3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <p className="text-sm font-medium">Select a staff member to view profile</p>
            </div>
          </div>
        ) : loadingProfile ? (
          <div className="flex-1 flex items-center justify-center bg-white border border-gray-100 rounded-xl shadow-sm">
            <svg className="w-6 h-6 animate-spin text-indigo-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
          </div>
        ) : (
          <div className="flex-1 flex flex-col bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
            {/* Profile Header */}
            <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-white flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-lg font-bold text-indigo-600">
                  {(profile?.name || profile?.first_name || 'S').charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900">
                    {profile?.name || `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim()}
                  </h2>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-gray-500">{profile?.designation || '—'}</span>
                    {profile?.department_name && <span className="text-xs text-gray-400">· {profile.department_name}</span>}
                    {profile?.employee_code && <span className="text-xs font-mono bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">#{profile.employee_code}</span>}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                {editing ? (
                  <>
                    <button onClick={handleCancel} className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Cancel</button>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition-colors"
                    >
                      {saving && <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </>
                ) : (
                  <button onClick={handleEdit} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold border border-indigo-200 text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit
                  </button>
                )}
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-100 bg-white px-6">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-3 px-1 mr-6 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === tab.id ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {activeTab === 'personal' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  <InfoField label="First Name"       value={profile?.first_name}      fieldKey="first_name" />
                  <InfoField label="Last Name"        value={profile?.last_name}       fieldKey="last_name" />
                  <InfoField label="Date of Birth"    value={profile?.dob}             fieldKey="dob"         type="date" />
                  <InfoField label="Gender"           value={profile?.gender}          fieldKey="gender" />
                  <InfoField label="Blood Group"      value={profile?.blood_group}     fieldKey="blood_group" />
                  <InfoField label="Nationality"      value={profile?.nationality}     fieldKey="nationality" />
                  <InfoField label="Religion"         value={profile?.religion}        fieldKey="religion" />
                  <InfoField label="Marital Status"   value={profile?.marital_status}  fieldKey="marital_status" />
                  <InfoField label="Mobile Number"    value={profile?.mobile}          fieldKey="mobile"      type="tel" />
                  <InfoField label="Email"            value={profile?.email}           fieldKey="email"       type="email" />
                  <InfoField label="Emergency Contact"value={profile?.emergency_contact} fieldKey="emergency_contact" />
                  <div className="sm:col-span-2 lg:col-span-3">
                    <InfoField label="Address"        value={profile?.address}         fieldKey="address"     type="textarea" />
                  </div>
                </div>
              )}

              {activeTab === 'employment' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  <InfoField label="Employee Code"    value={profile?.employee_code}   fieldKey="employee_code" />
                  <InfoField label="Designation"      value={profile?.designation}     fieldKey="designation" />
                  <InfoField label="Department"       value={profile?.department_name} fieldKey="department_name" />
                  <InfoField label="Staff Type"       value={profile?.staff_type}      fieldKey="staff_type" />
                  <InfoField label="Date of Joining"  value={profile?.join_date}       fieldKey="join_date"   type="date" />
                  <InfoField label="Date of Confirmation" value={profile?.confirmation_date} fieldKey="confirmation_date" type="date" />
                  <InfoField label="Employment Type"  value={profile?.employment_type} fieldKey="employment_type" />
                  <InfoField label="Reporting To"     value={profile?.reporting_to}    fieldKey="reporting_to" />
                  <InfoField label="Work Location"    value={profile?.work_location}   fieldKey="work_location" />
                  <InfoField label="Qualification"    value={profile?.qualification}   fieldKey="qualification" />
                  <InfoField label="Experience (Yrs)" value={profile?.experience}      fieldKey="experience"  type="number" />
                  <InfoField label="Subject Expertise"value={profile?.subject_expertise} fieldKey="subject_expertise" />
                </div>
              )}

              {activeTab === 'documents' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <InfoField label="Aadhaar Number"   value={profile?.aadhaar}         fieldKey="aadhaar" />
                  <InfoField label="PAN Number"       value={profile?.pan}             fieldKey="pan" />
                  <InfoField label="Passport Number"  value={profile?.passport}        fieldKey="passport" />
                  <InfoField label="Driving Licence"  value={profile?.driving_licence} fieldKey="driving_licence" />
                  <InfoField label="Degree Certificate"value={profile?.degree_cert}    fieldKey="degree_cert" />
                  <InfoField label="Experience Certificate" value={profile?.exp_cert}  fieldKey="exp_cert" />
                  <InfoField label="TC / Migration Certificate" value={profile?.tc_cert} fieldKey="tc_cert" />
                  <InfoField label="Medical Certificate" value={profile?.medical_cert} fieldKey="medical_cert" />
                </div>
              )}

              {activeTab === 'salary' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  <InfoField label="Basic Salary"     value={profile?.basic_salary}    fieldKey="basic_salary"   type="number" />
                  <InfoField label="HRA"              value={profile?.hra}             fieldKey="hra"            type="number" />
                  <InfoField label="DA"               value={profile?.da}              fieldKey="da"             type="number" />
                  <InfoField label="Medical Allowance"value={profile?.medical_allowance} fieldKey="medical_allowance" type="number" />
                  <InfoField label="Transport Allowance" value={profile?.transport_allowance} fieldKey="transport_allowance" type="number" />
                  <InfoField label="Other Allowances" value={profile?.other_allowances} fieldKey="other_allowances" type="number" />
                  <InfoField label="PF Number"        value={profile?.pf_number}       fieldKey="pf_number" />
                  <InfoField label="ESI Number"       value={profile?.esi_number}      fieldKey="esi_number" />
                  <InfoField label="Bank Name"        value={profile?.bank_name}       fieldKey="bank_name" />
                  <InfoField label="Bank Account No." value={profile?.bank_account}    fieldKey="bank_account" />
                  <InfoField label="IFSC Code"        value={profile?.ifsc_code}       fieldKey="ifsc_code" />
                  <InfoField label="Bank Branch"      value={profile?.bank_branch}     fieldKey="bank_branch" />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
