import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { frontOfficeApi } from '../../services/erp-api';

const STEPS = [
  { id: 1, label: 'Personal Details',       icon: '👤' },
  { id: 2, label: 'Parent / Guardian',      icon: '👨‍👩‍👧' },
  { id: 3, label: 'Academic & Documents',   icon: '📄' },
];

const GENDER_OPTIONS = ['Male', 'Female', 'Other'];
const CLASS_OPTIONS = ['Nursery', 'KG', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5',
  'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'];
const CATEGORY_OPTIONS = ['General', 'OBC', 'SC', 'ST', 'EWS', 'PH'];
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const EMPTY_FORM = {
  // Step 1
  applicant_name: '', dob: '', gender: '', class_applying: '',
  category: '', blood_group: '', religion: '', nationality: 'Indian',
  // Step 2
  father_name: '', mother_name: '', phone: '', email: '',
  address: '', city: '', state: '', pincode: '', parent_occupation: '',
  // Step 3
  previous_school: '', last_class: '', previous_board: '',
  percentage_marks: '', reason_for_leaving: '', tc_number: '',
  has_special_needs: false, medical_notes: '',
};

export default function ApplicationEntryPage() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [appId, setAppId] = useState(null);

  const set = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const validateStep = (stepNo) => {
    if (stepNo === 1) {
      if (!form.applicant_name.trim()) { toast.error('Applicant name is required'); return false; }
      if (!form.dob) { toast.error('Date of birth is required'); return false; }
      if (!form.gender) { toast.error('Gender is required'); return false; }
      if (!form.class_applying) { toast.error('Please select class applying for'); return false; }
    }
    if (stepNo === 2) {
      if (!form.father_name.trim() && !form.mother_name.trim()) { toast.error('At least one parent name is required'); return false; }
      if (!form.phone.trim()) { toast.error('Phone number is required'); return false; }
    }
    return true;
  };

  const nextStep = () => {
    if (validateStep(step)) setStep(s => Math.min(s + 1, 3));
  };
  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  const handleSubmit = async () => {
    if (!validateStep(3)) return;
    setSubmitting(true);
    try {
      const res = await frontOfficeApi.saveApplication(form);
      setAppId(res?.id || res?.application_id);
      setSubmitted(true);
      toast.success('Application submitted successfully!');
    } catch (err) {
      toast.error(err.message || 'Failed to submit application');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => { setForm(EMPTY_FORM); setStep(1); setSubmitted(false); setAppId(null); };

  const inputCls = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white';
  const labelCls = 'block text-xs font-semibold text-gray-600 mb-1';

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center gap-4">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
          <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Application Submitted!</h2>
          <p className="text-gray-500 mt-1">The admission application has been recorded successfully.</p>
          {appId && <p className="text-sm font-semibold text-indigo-600 mt-2">Application ID: #{appId}</p>}
        </div>
        <button onClick={resetForm} className="px-6 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors">
          Submit Another Application
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-gray-900">Admission Application Entry</h1>
        <p className="text-sm text-gray-500 mt-0.5">Fill in the applicant details to submit a new admission application</p>
      </div>

      {/* Progress Stepper */}
      <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5 mb-5">
        <div className="flex items-center">
          {STEPS.map((s, idx) => (
            <React.Fragment key={s.id}>
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${
                  step > s.id  ? 'bg-green-500 border-green-500 text-white' :
                  step === s.id ? 'bg-indigo-600 border-indigo-600 text-white' :
                  'bg-white border-gray-300 text-gray-400'
                }`}>
                  {step > s.id ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : s.id}
                </div>
                <div className="hidden sm:block">
                  <div className={`text-xs font-semibold ${step === s.id ? 'text-indigo-700' : step > s.id ? 'text-green-600' : 'text-gray-400'}`}>
                    Step {s.id}
                  </div>
                  <div className={`text-sm font-bold ${step === s.id ? 'text-gray-900' : 'text-gray-500'}`}>{s.label}</div>
                </div>
              </div>
              {idx < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-4 transition-all ${step > s.id ? 'bg-green-400' : 'bg-gray-200'}`} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Form Content */}
      <div className="flex-1 overflow-y-auto bg-white border border-gray-100 rounded-xl shadow-sm p-6">
        {/* Step 1: Personal Details */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-base font-bold text-gray-800 mb-4">Personal Details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className={labelCls}>Applicant Name <span className="text-red-500">*</span></label>
                <input type="text" value={form.applicant_name} onChange={e => set('applicant_name', e.target.value)} className={inputCls} placeholder="Full name of the applicant" />
              </div>
              <div>
                <label className={labelCls}>Date of Birth <span className="text-red-500">*</span></label>
                <input type="date" value={form.dob} onChange={e => set('dob', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Gender <span className="text-red-500">*</span></label>
                <select value={form.gender} onChange={e => set('gender', e.target.value)} className={inputCls}>
                  <option value="">Select Gender</option>
                  {GENDER_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Class Applying For <span className="text-red-500">*</span></label>
                <select value={form.class_applying} onChange={e => set('class_applying', e.target.value)} className={inputCls}>
                  <option value="">Select Class</option>
                  {CLASS_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Category</label>
                <select value={form.category} onChange={e => set('category', e.target.value)} className={inputCls}>
                  <option value="">Select Category</option>
                  {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Blood Group</label>
                <select value={form.blood_group} onChange={e => set('blood_group', e.target.value)} className={inputCls}>
                  <option value="">Select Blood Group</option>
                  {BLOOD_GROUPS.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Religion</label>
                <input type="text" value={form.religion} onChange={e => set('religion', e.target.value)} className={inputCls} placeholder="e.g. Hindu, Christian" />
              </div>
              <div>
                <label className={labelCls}>Nationality</label>
                <input type="text" value={form.nationality} onChange={e => set('nationality', e.target.value)} className={inputCls} />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Parent / Guardian */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-base font-bold text-gray-800 mb-4">Parent / Guardian Details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Father's Name</label>
                <input type="text" value={form.father_name} onChange={e => set('father_name', e.target.value)} className={inputCls} placeholder="Father's full name" />
              </div>
              <div>
                <label className={labelCls}>Mother's Name</label>
                <input type="text" value={form.mother_name} onChange={e => set('mother_name', e.target.value)} className={inputCls} placeholder="Mother's full name" />
              </div>
              <div>
                <label className={labelCls}>Phone Number <span className="text-red-500">*</span></label>
                <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} className={inputCls} placeholder="Primary contact number" />
              </div>
              <div>
                <label className={labelCls}>Email Address</label>
                <input type="email" value={form.email} onChange={e => set('email', e.target.value)} className={inputCls} placeholder="parent@email.com" />
              </div>
              <div>
                <label className={labelCls}>Parent Occupation</label>
                <input type="text" value={form.parent_occupation} onChange={e => set('parent_occupation', e.target.value)} className={inputCls} placeholder="Father's / Mother's occupation" />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Address</label>
                <textarea rows={2} value={form.address} onChange={e => set('address', e.target.value)} className={inputCls} placeholder="House No., Street, Locality" />
              </div>
              <div>
                <label className={labelCls}>City</label>
                <input type="text" value={form.city} onChange={e => set('city', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>State</label>
                <input type="text" value={form.state} onChange={e => set('state', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Pincode</label>
                <input type="text" value={form.pincode} onChange={e => set('pincode', e.target.value)} className={inputCls} maxLength={6} />
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Academic & Documents */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-base font-bold text-gray-800 mb-4">Academic Details & Documents</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className={labelCls}>Previous School Name</label>
                <input type="text" value={form.previous_school} onChange={e => set('previous_school', e.target.value)} className={inputCls} placeholder="Full name of previous school" />
              </div>
              <div>
                <label className={labelCls}>Last Class Attended</label>
                <input type="text" value={form.last_class} onChange={e => set('last_class', e.target.value)} className={inputCls} placeholder="e.g. Grade 5" />
              </div>
              <div>
                <label className={labelCls}>Previous Board</label>
                <input type="text" value={form.previous_board} onChange={e => set('previous_board', e.target.value)} className={inputCls} placeholder="CBSE / ICSE / State Board" />
              </div>
              <div>
                <label className={labelCls}>Marks / Percentage</label>
                <input type="text" value={form.percentage_marks} onChange={e => set('percentage_marks', e.target.value)} className={inputCls} placeholder="e.g. 85% or CGPA 8.5" />
              </div>
              <div>
                <label className={labelCls}>TC Number</label>
                <input type="text" value={form.tc_number} onChange={e => set('tc_number', e.target.value)} className={inputCls} placeholder="Transfer Certificate number" />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Reason for Leaving Previous School</label>
                <textarea rows={2} value={form.reason_for_leaving} onChange={e => set('reason_for_leaving', e.target.value)} className={inputCls} placeholder="Why the student is changing schools..." />
              </div>
              <div className="sm:col-span-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <div
                    onClick={() => set('has_special_needs', !form.has_special_needs)}
                    className={`w-10 h-6 rounded-full transition-colors ${form.has_special_needs ? 'bg-indigo-600' : 'bg-gray-300'} relative flex-shrink-0`}
                  >
                    <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.has_special_needs ? 'translate-x-5' : 'translate-x-1'}`} />
                  </div>
                  <span className="text-sm font-medium text-gray-700">Student has special educational needs</span>
                </label>
              </div>
              {form.has_special_needs && (
                <div className="sm:col-span-2">
                  <label className={labelCls}>Medical / Special Needs Notes</label>
                  <textarea rows={3} value={form.medical_notes} onChange={e => set('medical_notes', e.target.value)} className={inputCls} placeholder="Describe any special requirements, medical conditions, or support needed..." />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="mt-4 flex justify-between items-center">
        <button
          onClick={prevStep}
          disabled={step === 1}
          className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Previous
        </button>

        <span className="text-sm text-gray-400">Step {step} of {STEPS.length}</span>

        {step < 3 ? (
          <button
            onClick={nextStep}
            className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
          >
            Next
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 disabled:opacity-60 transition-colors shadow-sm"
          >
            {submitting && <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
            {submitting ? 'Submitting...' : 'Submit Application'}
          </button>
        )}
      </div>
    </div>
  );
}
