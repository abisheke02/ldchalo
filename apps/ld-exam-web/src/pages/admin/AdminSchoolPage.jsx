import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import Layout from '../../components/Layout';
import { adminAPI } from '../../services/api';

const AdminSchoolPage = () => {
  const { schoolId } = useParams();
  const navigate = useNavigate();
  const [school, setSchool] = useState(null);
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeClass, setActiveClass] = useState(null);

  const [showAddClass, setShowAddClass] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [addingClass, setAddingClass] = useState(false);

  const [showInvite, setShowInvite] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteClassId, setInviteClassId] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteLink, setInviteLink] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [schoolsRes, classesRes, studentsRes] = await Promise.all([
        adminAPI.getSchools(),
        adminAPI.getSchoolClasses(schoolId),
        adminAPI.getSchoolStudents(schoolId),
      ]);
      const found = (schoolsRes.schools || []).find((s) => s.id === schoolId);
      setSchool(found || null);
      setClasses(classesRes.classes || []);
      setStudents(studentsRes.students || []);
    } catch {
      toast.error('Could not load school data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [schoolId]);

  const handleAddClass = async (e) => {
    e.preventDefault();
    if (!newClassName.trim()) return;
    setAddingClass(true);
    try {
      await adminAPI.createSchoolClass(schoolId, { className: newClassName.trim() });
      toast.success('Class created');
      setNewClassName('');
      setShowAddClass(false);
      load();
    } catch (err) {
      toast.error(err.error || 'Failed to create class');
    } finally {
      setAddingClass(false);
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteName.trim() || !inviteEmail.trim()) return;
    setInviting(true);
    setInviteLink('');
    try {
      const res = await adminAPI.inviteStudent(schoolId, {
        name: inviteName.trim(),
        email: inviteEmail.trim(),
        classId: inviteClassId || undefined,
      });
      toast.success('Student invited!');
      if (res.inviteLink) setInviteLink(res.inviteLink);
      else { setShowInvite(false); setInviteName(''); setInviteEmail(''); setInviteClassId(''); }
      load();
    } catch (err) {
      toast.error(err.error || 'Failed to invite student');
    } finally {
      setInviting(false);
    }
  };

  const filteredStudents = activeClass
    ? students.filter((s) => s.class_id === activeClass)
    : students;

  return (
    <Layout>
      <div className="p-8 max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/admin')} className="text-slate-400 hover:text-blue-600 transition font-bold flex items-center gap-1">
              ← Admin
            </button>
            <span className="text-slate-300">/</span>
            <h2 className="text-2xl font-black text-slate-800">
              {loading ? 'Loading…' : (school?.name || 'School')}
            </h2>
          </div>
          <button
            onClick={() => { setShowInvite(true); setInviteLink(''); }}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-xl transition shadow-lg shadow-blue-200 text-sm"
          >
            + Invite Student
          </button>
        </div>

        {loading ? (
          <div className="text-center py-24 text-slate-400">Loading…</div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Classes', value: classes.length, color: 'text-blue-700' },
                { label: 'Students', value: students.length, color: 'text-purple-700' },
                { label: 'Plan', value: school?.plan_type || 'free', color: 'text-emerald-700' },
              ].map((s) => (
                <div key={s.label} className="bg-white rounded-xl border border-slate-100 p-4 text-center shadow-sm">
                  <p className={`text-2xl font-extrabold capitalize ${s.color}`}>{s.value}</p>
                  <p className="text-slate-500 text-xs mt-1">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Classes */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                <h3 className="font-black text-slate-800">Classes</h3>
                <button
                  onClick={() => setShowAddClass(true)}
                  className="text-blue-600 font-bold text-sm hover:underline"
                >
                  + Add Class
                </button>
              </div>
              {classes.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-sm">No classes yet. Add one above.</div>
              ) : (
                <div className="flex flex-wrap gap-3 p-6">
                  <button
                    onClick={() => setActiveClass(null)}
                    className={`px-4 py-2 rounded-xl text-sm font-bold border transition ${!activeClass ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 text-slate-600 hover:border-blue-400'}`}
                  >
                    All ({students.length})
                  </button>
                  {classes.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setActiveClass(activeClass === c.id ? null : c.id)}
                      className={`px-4 py-2 rounded-xl text-sm font-bold border transition ${activeClass === c.id ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 text-slate-600 hover:border-blue-400'}`}
                    >
                      {c.class_name} ({c.student_count})
                      <span className="ml-2 text-xs opacity-60 font-mono">{c.join_code}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Students table */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100">
                <h3 className="font-black text-slate-800">
                  Students {activeClass ? `— ${classes.find((c) => c.id === activeClass)?.class_name}` : '(All)'}
                </h3>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    {['Name', 'Email', 'Class', 'Joined'].map((h) => (
                      <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.length === 0 ? (
                    <tr><td colSpan={4} className="text-center py-10 text-slate-400">No students yet</td></tr>
                  ) : filteredStudents.map((s) => (
                    <tr key={s.id} className="border-b border-slate-50 hover:bg-blue-50/30 transition">
                      <td className="px-5 py-3 font-semibold text-slate-800">{s.name}</td>
                      <td className="px-5 py-3 text-slate-500">{s.email || '—'}</td>
                      <td className="px-5 py-3 text-slate-500">{s.class_name || '—'}</td>
                      <td className="px-5 py-3 text-slate-400 text-xs">
                        {s.created_at ? new Date(s.created_at).toLocaleDateString('en-IN') : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Add Class Modal */}
      {showAddClass && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-xl font-black text-slate-800 mb-4">Add Class</h3>
            <form onSubmit={handleAddClass} className="space-y-4">
              <input
                type="text"
                placeholder="e.g. Class 3A"
                value={newClassName}
                onChange={(e) => setNewClassName(e.target.value)}
                className="w-full border-2 border-slate-100 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition"
                required
                autoFocus
              />
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowAddClass(false)}
                  className="flex-1 border border-slate-200 text-slate-600 font-bold py-3 rounded-xl hover:bg-slate-50 transition">
                  Cancel
                </button>
                <button type="submit" disabled={addingClass}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition disabled:bg-blue-300">
                  {addingClass ? 'Creating…' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invite Student Modal */}
      {showInvite && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-xl font-black text-slate-800 mb-1">Invite Student</h3>
            <p className="text-slate-500 text-sm mb-4">An invite link will be sent to the student's Gmail.</p>

            {inviteLink ? (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <p className="text-xs font-bold text-blue-600 mb-2">SMTP not configured — share this link manually:</p>
                  <p className="text-xs font-mono break-all text-slate-700">{inviteLink}</p>
                </div>
                <button
                  onClick={() => { navigator.clipboard.writeText(inviteLink); toast.success('Link copied!'); }}
                  className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition"
                >
                  Copy Link
                </button>
                <button onClick={() => { setShowInvite(false); setInviteLink(''); setInviteName(''); setInviteEmail(''); setInviteClassId(''); }}
                  className="w-full border border-slate-200 text-slate-600 font-bold py-3 rounded-xl hover:bg-slate-50 transition">
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleInvite} className="space-y-3">
                <input
                  type="text"
                  placeholder="Student Name"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  className="w-full border-2 border-slate-100 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition"
                  required
                />
                <input
                  type="email"
                  placeholder="Student Gmail (student@gmail.com)"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full border-2 border-slate-100 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition"
                  required
                />
                <select
                  value={inviteClassId}
                  onChange={(e) => setInviteClassId(e.target.value)}
                  className="w-full border-2 border-slate-100 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition text-sm"
                >
                  <option value="">— Select Class (optional) —</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>{c.class_name}</option>
                  ))}
                </select>
                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={() => setShowInvite(false)}
                    className="flex-1 border border-slate-200 text-slate-600 font-bold py-3 rounded-xl hover:bg-slate-50 transition">
                    Cancel
                  </button>
                  <button type="submit" disabled={inviting}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition disabled:bg-blue-300">
                    {inviting ? 'Sending…' : 'Send Invite'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </Layout>
  );
};

export default AdminSchoolPage;
