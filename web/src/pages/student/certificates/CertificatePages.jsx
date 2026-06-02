import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import GenericMasterPage from '../../../components/common/GenericMasterPage';
import { studentApi, master } from '../../../services/erp-api';

const today = () => new Date().toISOString().split('T')[0];
const inputCls = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white';
const labelCls = 'block text-xs font-semibold text-gray-600 mb-1';

// ─── Certificate Template Page ────────────────────────────────────────────────
export function CertificateTemplatePage() {
  return (
    <GenericMasterPage config={{
      title: 'Certificate Templates',
      subtitle: 'Manage HTML templates for all certificate types',
      addLabel: 'Add Template',
      columns: [
        { key: 'name',         label: 'Template Name' },
        { key: 'type',         label: 'Certificate Type' },
        { key: 'is_default',   label: 'Default', render: v => v ? '✓ Default' : '—' },
        { key: 'updated_at',   label: 'Last Updated' },
      ],
      fields: [
        { key: 'name',         label: 'Template Name',     required: true },
        { key: 'type',         label: 'Certificate Type',  type: 'select', required: true,
          options: ['Bonafide', 'Attendance', 'Conduct', 'Course Completion', 'Fee Certificate', 'Study Certificate'] },
        { key: 'content',      label: 'HTML Content',      type: 'textarea', required: true,
          placeholder: 'Enter HTML template. Use {{student_name}}, {{class}}, {{admission_no}} etc. as placeholders.' },
        { key: 'is_default',   label: 'Set as Default',    type: 'toggle', default: false },
      ],
      fetchFn:  () => master.list('certificate-templates'),
      saveFn:   (d) => master.save('certificate-templates', d),
      deleteFn: (id) => master.remove('certificate-templates', id),
    }} />
  );
}

// ─── Generic Certificate Generator ───────────────────────────────────────────
function CertificateGenerator({ title, type, extraFields = [] }) {
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const [searching, setSearching] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [preview, setPreview] = useState(null);
  const [extras, setExtras] = useState({});

  const searchStudents = async () => {
    if (!search.trim()) return;
    setSearching(true);
    try { const data = await studentApi.list({ search }); setSearchResults(data || []); }
    catch { toast.error('Search failed'); }
    finally { setSearching(false); }
  };

  const generate = async () => {
    if (!selected) { toast.error('Select a student'); return; }
    setGenerating(true);
    try {
      const data = await studentApi.certificate(type, selected.id, extras);
      setPreview(data);
      toast.success('Certificate generated');
    } catch (err) { toast.error(err.message || 'Generation failed'); }
    finally { setGenerating(false); }
  };

  const handlePrint = () => {
    const win = window.open('', '_blank');
    if (win && preview?.html) {
      win.document.write(preview.html);
      win.document.close();
      win.print();
    } else {
      toast.error('No content to print');
    }
  };

  const handleDownload = async () => {
    if (!selected) return;
    try {
      await studentApi.certificate(`${type}-pdf`, selected.id, extras);
      toast.success('Certificate PDF downloading...');
    } catch (err) { toast.error(err.message || 'Download failed'); }
  };

  const setExtra = (key, value) => setExtras(prev => ({ ...prev, [key]: value }));

  return (
    <div className="flex flex-col h-full gap-5">
      <div><h1 className="text-xl font-bold text-gray-900">{title}</h1><p className="text-sm text-gray-500">Search student and generate certificate</p></div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 flex-1">
        {/* Form */}
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5 space-y-4">
          <h2 className="text-sm font-bold text-gray-800">Student Selection</h2>
          <div>
            <label className={labelCls}>Search Student</label>
            <div className="flex gap-2">
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && searchStudents()} className={inputCls} placeholder="Name or admission number" />
              <button onClick={searchStudents} disabled={searching} className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-60 whitespace-nowrap">Search</button>
            </div>
            {searchResults.length > 0 && !selected && (
              <div className="mt-2 border border-gray-200 rounded-lg overflow-hidden max-h-36 overflow-y-auto">
                {searchResults.map(s => (
                  <button key={s.id} onClick={() => { setSelected(s); setSearchResults([]); }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 border-b border-gray-100 last:border-0">
                    <span className="font-medium">{s.name || `${s.first_name} ${s.last_name}`}</span>
                    <span className="text-gray-400 text-xs ml-2">({s.class_name} {s.section_name} · {s.admission_no})</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          {selected && (
            <div className="bg-indigo-50 rounded-lg p-3 flex justify-between">
              <div>
                <p className="text-sm font-bold text-gray-800">{selected.name || `${selected.first_name} ${selected.last_name}`}</p>
                <p className="text-xs text-gray-500">{selected.class_name} {selected.section_name} · Adm: {selected.admission_no}</p>
              </div>
              <button onClick={() => { setSelected(null); setPreview(null); }} className="text-gray-400 hover:text-gray-600 text-lg">&times;</button>
            </div>
          )}
          {extraFields.map(field => (
            <div key={field.key}>
              <label className={labelCls}>{field.label}</label>
              {field.type === 'date' ? (
                <input type="date" value={extras[field.key] || ''} onChange={e => setExtra(field.key, e.target.value)} className={inputCls} />
              ) : field.type === 'textarea' ? (
                <textarea rows={2} value={extras[field.key] || ''} onChange={e => setExtra(field.key, e.target.value)} className={inputCls} placeholder={field.placeholder} />
              ) : (
                <input type="text" value={extras[field.key] || ''} onChange={e => setExtra(field.key, e.target.value)} className={inputCls} placeholder={field.placeholder} />
              )}
            </div>
          ))}
          <div className="flex gap-2 pt-2">
            <button onClick={generate} disabled={generating || !selected} className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition-colors">
              {generating && <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
              {generating ? 'Generating...' : 'Generate Certificate'}
            </button>
            {preview && (
              <>
                <button onClick={handlePrint} className="px-4 py-2 text-sm font-semibold border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                  Print
                </button>
                <button onClick={handleDownload} className="px-4 py-2 text-sm font-semibold bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  Download PDF
                </button>
              </>
            )}
          </div>
        </div>

        {/* Preview */}
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5 overflow-auto">
          <h2 className="text-sm font-bold text-gray-800 mb-4">Certificate Preview</h2>
          {!preview ? (
            <div className="flex flex-col items-center justify-center h-40 text-gray-400">
              <svg className="w-10 h-10 mb-2 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm">Select a student and generate to preview</p>
            </div>
          ) : preview.html ? (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <iframe title="certificate-preview" srcDoc={preview.html} className="w-full h-96 border-0" />
            </div>
          ) : (
            <div className="bg-gray-50 border border-dashed border-gray-300 rounded-lg p-6">
              <p className="text-xs font-bold text-gray-500 uppercase mb-2">{title}</p>
              <p className="text-lg font-bold text-gray-900 mb-3">
                {selected?.name || `${selected?.first_name} ${selected?.last_name}`}
              </p>
              <div className="space-y-1.5 text-sm text-gray-600">
                <p><span className="text-gray-400">Admission No.:</span> {selected?.admission_no}</p>
                <p><span className="text-gray-400">Class:</span> {selected?.class_name} {selected?.section_name}</p>
                <p><span className="text-gray-400">Father's Name:</span> {selected?.father_name || preview?.father_name || '—'}</p>
                {preview?.generated_on && <p><span className="text-gray-400">Generated On:</span> {preview.generated_on}</p>}
              </div>
              {Object.entries(extras).map(([k, v]) => v && (
                <p key={k} className="text-sm text-gray-600 mt-1"><span className="text-gray-400 capitalize">{k.replace(/_/g, ' ')}:</span> {v}</p>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Certificate Page Exports ─────────────────────────────────────────────────
export function BonafideCertificatePage() {
  return <CertificateGenerator title="Bonafide Certificate" type="bonafide" />;
}

export function AttendanceCertificatePage() {
  return <CertificateGenerator
    title="Attendance Certificate"
    type="attendance"
    extraFields={[
      { key: 'from_date', label: 'From Date', type: 'date' },
      { key: 'to_date',   label: 'To Date',   type: 'date' },
    ]}
  />;
}

export function ConductCertificatePage() {
  return <CertificateGenerator
    title="Conduct Certificate"
    type="conduct"
    extraFields={[
      { key: 'conduct_remarks', label: 'Conduct Remarks', type: 'textarea', placeholder: 'e.g. Good conduct and discipline' },
    ]}
  />;
}

export function CourseCompletionCertPage() {
  return <CertificateGenerator
    title="Course Completion Certificate"
    type="course-completion"
    extraFields={[
      { key: 'completion_date', label: 'Completion Date', type: 'date' },
      { key: 'course_name',     label: 'Course / Program',  placeholder: 'Course name' },
    ]}
  />;
}

export function FeeCertificatePage() {
  return <CertificateGenerator
    title="Fee Certificate"
    type="fee-certificate"
    extraFields={[
      { key: 'academic_year', label: 'Academic Year', placeholder: 'e.g. 2024-25' },
      { key: 'fee_paid_upto', label: 'Fee Paid Upto', type: 'date' },
    ]}
  />;
}

export function StudyCertificatePage() {
  return <CertificateGenerator
    title="Study Certificate"
    type="study-certificate"
    extraFields={[
      { key: 'purpose', label: 'Purpose', placeholder: 'e.g. For bank, scholarship, etc.' },
    ]}
  />;
}
