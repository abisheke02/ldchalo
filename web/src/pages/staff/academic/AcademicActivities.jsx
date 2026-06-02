import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import GenericMasterPage from '../../../components/common/GenericMasterPage';
import { master, staffApi } from '../../../services/erp-api';

// ─── Shared helpers ───────────────────────────────────────────────────────────
const today = () => new Date().toISOString().split('T')[0];
const inputCls = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white';
const labelCls = 'block text-xs font-semibold text-gray-600 mb-1';

// ─── 1. Circular Entry Page ───────────────────────────────────────────────────
export function CircularEntryPage() {
  const [form, setForm] = useState({ title: '', target_classes: [], content: '', publish_date: today(), file: null });
  const [classes, setClasses] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    master.list('classes').then(d => setClasses(d || [])).catch(() => {});
  }, []);

  const set = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const toggleClass = (id) => {
    setForm(prev => ({
      ...prev,
      target_classes: prev.target_classes.includes(id)
        ? prev.target_classes.filter(c => c !== id)
        : [...prev.target_classes, id],
    }));
  };

  const handleSend = async () => {
    if (!form.title.trim()) { toast.error('Title is required'); return; }
    if (!form.content.trim()) { toast.error('Content is required'); return; }
    setSubmitting(true);
    try {
      await master.create('circulars', form);
      toast.success('Circular published successfully');
      setForm({ title: '', target_classes: [], content: '', publish_date: today(), file: null });
    } catch (err) {
      toast.error(err.message || 'Failed to publish circular');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-gray-900">Circular Entry</h1>
        <p className="text-sm text-gray-500 mt-0.5">Create and publish circulars to students and parents</p>
      </div>

      <div className="flex-1 overflow-y-auto bg-white border border-gray-100 rounded-xl shadow-sm p-6 space-y-5">
        <div>
          <label className={labelCls}>Circular Title <span className="text-red-500">*</span></label>
          <input type="text" value={form.title} onChange={e => set('title', e.target.value)} className={inputCls} placeholder="e.g. Annual Day Celebration Notice" />
        </div>

        <div>
          <label className={labelCls}>Target Classes (select all that apply)</label>
          <div className="flex flex-wrap gap-2 mt-1">
            <button
              onClick={() => setForm(prev => ({ ...prev, target_classes: prev.target_classes.length === classes.length ? [] : classes.map(c => c.id) }))}
              className={`px-3 py-1 text-xs font-semibold rounded-lg border transition-colors ${form.target_classes.length === classes.length ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-indigo-300'}`}
            >
              All Classes
            </button>
            {classes.map(c => (
              <button
                key={c.id}
                onClick={() => toggleClass(c.id)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg border transition-colors ${form.target_classes.includes(c.id) ? 'bg-indigo-100 text-indigo-700 border-indigo-300' : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-indigo-300'}`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className={labelCls}>Content <span className="text-red-500">*</span></label>
          <textarea
            rows={8}
            value={form.content}
            onChange={e => set('content', e.target.value)}
            className={inputCls}
            placeholder="Write the circular content here..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Publish Date</label>
            <input type="date" value={form.publish_date} onChange={e => set('publish_date', e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Attachment (optional)</label>
            <input type="file" onChange={e => set('file', e.target.files?.[0] || null)} className="w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" />
          </div>
        </div>

        {/* Preview area */}
        {form.title && form.content && (
          <div className="border border-indigo-100 rounded-xl p-4 bg-indigo-50">
            <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-2">Preview</p>
            <p className="text-base font-bold text-gray-900 mb-2">{form.title}</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{form.content}</p>
            {form.target_classes.length > 0 && (
              <p className="text-xs text-gray-500 mt-3">
                Targets: {form.target_classes.length === classes.length ? 'All Classes' : `${form.target_classes.length} class(es) selected`}
              </p>
            )}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button onClick={() => setForm({ title: '', target_classes: [], content: '', publish_date: today(), file: null })} className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
            Clear
          </button>
          <button
            onClick={handleSend}
            disabled={submitting}
            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition-colors shadow-sm"
          >
            {submitting && <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
            {submitting ? 'Publishing...' : 'Preview & Publish'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── 2. Homework Assignment Page ──────────────────────────────────────────────
export function HomeworkAssignmentPage() {
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [recentHW, setRecentHW] = useState([]);
  const [form, setForm] = useState({ subject_id: '', class_id: '', section_id: '', due_date: '', description: '', file: null });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([
      master.list('classes').then(d => setClasses(d || [])),
      master.list('homework?limit=10').then(d => setRecentHW(d || [])).catch(() => {}),
    ]);
  }, []);

  useEffect(() => {
    if (form.class_id) {
      master.list(`sections?class_id=${form.class_id}`).then(d => setSections(d || [])).catch(() => {});
      master.list(`subjects?class_id=${form.class_id}`).then(d => setSubjects(d || [])).catch(() => {});
    }
  }, [form.class_id]);

  const set = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const handleSubmit = async () => {
    if (!form.subject_id) { toast.error('Please select subject'); return; }
    if (!form.class_id) { toast.error('Please select class'); return; }
    if (!form.due_date) { toast.error('Due date is required'); return; }
    if (!form.description.trim()) { toast.error('Description is required'); return; }
    setSubmitting(true);
    try {
      const res = await master.create('homework', form);
      toast.success('Homework assigned successfully');
      setRecentHW(prev => [res, ...prev].slice(0, 10));
      setForm({ subject_id: '', class_id: '', section_id: '', due_date: '', description: '', file: null });
    } catch (err) {
      toast.error(err.message || 'Failed to assign homework');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full gap-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Homework Assignment</h1>
        <p className="text-sm text-gray-500 mt-0.5">Assign homework to students</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 flex-1">
        {/* Form */}
        <div className="lg:col-span-2 bg-white border border-gray-100 rounded-xl shadow-sm p-6 space-y-4">
          <h2 className="text-base font-bold text-gray-800">New Homework</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Class <span className="text-red-500">*</span></label>
              <select value={form.class_id} onChange={e => set('class_id', e.target.value)} className={inputCls}>
                <option value="">Select Class</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Section</label>
              <select value={form.section_id} onChange={e => set('section_id', e.target.value)} className={inputCls}>
                <option value="">All Sections</option>
                {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Subject <span className="text-red-500">*</span></label>
              <select value={form.subject_id} onChange={e => set('subject_id', e.target.value)} className={inputCls}>
                <option value="">Select Subject</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Due Date <span className="text-red-500">*</span></label>
              <input type="date" value={form.due_date} onChange={e => set('due_date', e.target.value)} min={today()} className={inputCls} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Description / Instructions <span className="text-red-500">*</span></label>
            <textarea rows={5} value={form.description} onChange={e => set('description', e.target.value)} className={inputCls} placeholder="Write homework instructions and details..." />
          </div>
          <div>
            <label className={labelCls}>Attachment (optional)</label>
            <input type="file" onChange={e => set('file', e.target.files?.[0] || null)} className="w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" />
          </div>
          <div className="flex justify-end">
            <button onClick={handleSubmit} disabled={submitting} className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition-colors shadow-sm">
              {submitting && <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
              {submitting ? 'Submitting...' : 'Assign Homework'}
            </button>
          </div>
        </div>

        {/* Recent Homework */}
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5">
          <h2 className="text-base font-bold text-gray-800 mb-4">Recently Posted</h2>
          {recentHW.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No recent homework</p>
          ) : (
            <div className="space-y-3">
              {recentHW.map((hw, i) => (
                <div key={i} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{hw.subject_name || hw.subject_id}</p>
                      <p className="text-xs text-gray-500">{hw.class_name || ''} {hw.section_name || ''}</p>
                    </div>
                    <span className="text-xs text-orange-600 bg-orange-50 px-2 py-0.5 rounded font-medium whitespace-nowrap flex-shrink-0">Due: {hw.due_date}</span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1 line-clamp-2">{hw.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── 3. Notes of Lesson Page ──────────────────────────────────────────────────
export function NotesOfLessonPage() {
  const [subjects, setSubjects] = useState([]);
  const [notes, setNotes] = useState([]);
  const [form, setForm] = useState({ subject_id: '', chapter: '', topic: '', notes: '', date: today() });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    master.list('subjects').then(d => setSubjects(d || [])).catch(() => {});
    master.list('lesson-notes?limit=20').then(d => setNotes(d || [])).catch(() => {});
  }, []);

  const set = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const handleSubmit = async () => {
    if (!form.subject_id) { toast.error('Please select subject'); return; }
    if (!form.chapter.trim()) { toast.error('Chapter is required'); return; }
    if (!form.topic.trim()) { toast.error('Topic is required'); return; }
    if (!form.notes.trim()) { toast.error('Notes are required'); return; }
    setSubmitting(true);
    try {
      const res = await master.create('lesson-notes', form);
      toast.success('Lesson notes saved');
      setNotes(prev => [res, ...prev].slice(0, 20));
      setForm({ subject_id: '', chapter: '', topic: '', notes: '', date: today() });
    } catch (err) {
      toast.error(err.message || 'Failed to save notes');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full gap-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Notes of Lesson</h1>
        <p className="text-sm text-gray-500 mt-0.5">Record lesson notes and teaching content</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 flex-1">
        <div className="lg:col-span-2 bg-white border border-gray-100 rounded-xl shadow-sm p-6 space-y-4">
          <h2 className="text-base font-bold text-gray-800">New Lesson Note</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Subject <span className="text-red-500">*</span></label>
              <select value={form.subject_id} onChange={e => set('subject_id', e.target.value)} className={inputCls}>
                <option value="">Select Subject</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Date</label>
              <input type="date" value={form.date} onChange={e => set('date', e.target.value)} max={today()} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Chapter <span className="text-red-500">*</span></label>
              <input type="text" value={form.chapter} onChange={e => set('chapter', e.target.value)} className={inputCls} placeholder="Chapter name or number" />
            </div>
            <div>
              <label className={labelCls}>Topic <span className="text-red-500">*</span></label>
              <input type="text" value={form.topic} onChange={e => set('topic', e.target.value)} className={inputCls} placeholder="Specific topic taught" />
            </div>
          </div>
          <div>
            <label className={labelCls}>Lesson Notes <span className="text-red-500">*</span></label>
            <textarea rows={7} value={form.notes} onChange={e => set('notes', e.target.value)} className={inputCls} placeholder="Enter the lesson notes, key points covered, activities, etc." />
          </div>
          <div className="flex justify-end">
            <button onClick={handleSubmit} disabled={submitting} className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition-colors shadow-sm">
              {submitting && <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
              {submitting ? 'Saving...' : 'Save Notes'}
            </button>
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5">
          <h2 className="text-base font-bold text-gray-800 mb-4">Previous Notes</h2>
          {notes.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No previous notes</p>
          ) : (
            <div className="space-y-3 overflow-y-auto max-h-96">
              {notes.map((note, i) => (
                <div key={i} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="flex justify-between items-start gap-2">
                    <p className="text-sm font-semibold text-gray-800">{note.topic}</p>
                    <span className="text-xs text-gray-400 whitespace-nowrap">{note.date}</span>
                  </div>
                  <p className="text-xs text-indigo-600 mt-0.5">{note.subject_name || ''} — Ch. {note.chapter}</p>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{note.notes}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── 4. Special Classes Page ──────────────────────────────────────────────────
export function SpecialClassesPage() {
  return (
    <GenericMasterPage config={{
      title: 'Special Classes',
      subtitle: 'Schedule and manage extra / special class sessions',
      addLabel: 'Add Special Class',
      columns: [
        { key: 'subject_name', label: 'Subject' },
        { key: 'teacher_name', label: 'Teacher' },
        { key: 'class_name',   label: 'Class' },
        { key: 'section',      label: 'Section' },
        { key: 'date',         label: 'Date' },
        { key: 'time',         label: 'Time' },
        { key: 'room',         label: 'Room' },
        { key: 'reason',       label: 'Reason' },
      ],
      fields: [
        { key: 'subject_name', label: 'Subject',          required: true },
        { key: 'teacher_name', label: 'Teacher',          required: true },
        { key: 'class_name',   label: 'Class',            required: true },
        { key: 'section',      label: 'Section' },
        { key: 'date',         label: 'Date',             type: 'date', required: true },
        { key: 'time',         label: 'Time',             type: 'time', required: true },
        { key: 'duration',     label: 'Duration (mins)',  type: 'number', placeholder: '60' },
        { key: 'room',         label: 'Room / Venue' },
        { key: 'reason',       label: 'Reason / Remarks', type: 'textarea' },
      ],
      fetchFn:  () => master.list('special-classes'),
      saveFn:   (d) => master.save('special-classes', d),
      deleteFn: (id) => master.remove('special-classes', id),
    }} />
  );
}
