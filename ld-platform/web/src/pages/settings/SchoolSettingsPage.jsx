import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import Layout from '../../components/Layout';
import { schoolAPI } from '../../services/api';
import useAuthStore from '../../services/authStore';

const CopyButton = ({ text, label }) => {
  const copy = () => navigator.clipboard.writeText(text).then(() => toast.success(`${label} copied!`));
  return (
    <button onClick={copy}
      className="text-xs border border-slate-200 rounded-lg px-3 py-1.5 text-slate-500 hover:bg-slate-50 font-semibold transition">
      Copy
    </button>
  );
};

const SchoolSettingsPage = () => {
  const { user } = useAuthStore();
  const [info, setInfo] = useState(null);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviteForm, setInviteForm] = useState({ phone: '', email: '' });
  const [linkForm, setLinkForm] = useState({ studentId: '', parentPhone: '', parentEmail: '' });
  const [students, setStudents] = useState([]);

  useEffect(() => {
    Promise.all([
      schoolAPI.getInfo().catch(() => null),
      schoolAPI.getMyClasses().catch(() => ({ classes: [] })),
    ]).then(([infoData, classData]) => {
      setInfo(infoData);
      setClasses(classData?.classes || []);
    }).finally(() => setLoading(false));
  }, []);

  // Load students when a class is selected for parent linking
  const loadStudentsForClass = async (classId) => {
    if (!classId) { setStudents([]); return; }
    try {
      const data = await schoolAPI.getClassStudents(classId);
      setStudents(data?.students || []);
    } catch { setStudents([]); }
  };

  const handleInviteTeacher = async (e) => {
    e.preventDefault();
    const body = {};
    if (inviteForm.phone.trim()) body.phone = inviteForm.phone.trim();
    else if (inviteForm.email.trim()) body.email = inviteForm.email.trim();
    else { toast.error('Enter phone or email'); return; }

    try {
      const data = await schoolAPI.inviteTeacher(body);
      toast.success('Invite link created!');
      navigator.clipboard.writeText(data.inviteLink);
      toast('Invite link copied to clipboard', { icon: '📋' });
      setInviteForm({ phone: '', email: '' });
    } catch (err) {
      toast.error(err?.error || 'Could not create invite');
    }
  };

  const handleLinkParent = async (e) => {
    e.preventDefault();
    const body = { studentId: linkForm.studentId };
    if (linkForm.parentPhone.trim()) body.parentPhone = linkForm.parentPhone.trim();
    else if (linkForm.parentEmail.trim()) body.parentEmail = linkForm.parentEmail.trim();
    else { toast.error('Enter parent phone or email'); return; }

    try {
      await schoolAPI.linkParent(body);
      toast.success('Parent linked! They can now log in to see the scorecard.');
      setLinkForm({ studentId: '', parentPhone: '', parentEmail: '' });
    } catch (err) {
      toast.error(err?.error || 'Could not link parent');
    }
  };

  if (loading) {
    return <Layout><div className="p-8 text-slate-400 text-center py-20">Loading…</div></Layout>;
  }

  const school = info?.school;
  const teachers = info?.teachers || [];

  return (
    <Layout>
      <div className="p-8 max-w-3xl space-y-6">
        <h1 className="text-2xl font-extrabold text-slate-800">School Settings</h1>

        {/* School info card */}
        {school ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-lg font-extrabold text-slate-800">{school.name}</h2>
                <p className="text-slate-400 text-sm">{school.location} · {school.board} · {school.plan_type?.toUpperCase()} plan</p>
              </div>
              <span className="text-2xl">🏫</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 rounded-xl p-4">
                <p className="text-xs text-blue-500 font-semibold uppercase tracking-wide mb-1">School Join Code</p>
                <p className="text-xs text-blue-400 mb-2">Share with other teachers so they can join this school</p>
                <div className="flex items-center gap-3">
                  <p className="text-2xl font-black tracking-widest text-blue-800">{school.join_code}</p>
                  <CopyButton text={school.join_code} label="School code" />
                </div>
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-1">Teachers</p>
                <p className="text-3xl font-black text-slate-700">{teachers.length}</p>
                <p className="text-xs text-slate-400">{school.max_students} max students</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-amber-800 text-sm font-medium">
            You're not assigned to a school yet. Complete onboarding to register or join a school.
          </div>
        )}

        {/* Class join codes */}
        {classes.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 p-6">
            <h3 className="font-bold text-slate-700 mb-4">Class Join Codes</h3>
            <p className="text-xs text-slate-400 mb-4">Give these 6-character codes to students to enter in the mobile app.</p>
            <div className="space-y-3">
              {classes.map((cls) => (
                <div key={cls.id} className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3">
                  <div>
                    <p className="font-semibold text-slate-700 text-sm">{cls.class_name}</p>
                    <p className="text-xs text-slate-400">{cls.student_count || 0} students</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-lg font-black tracking-widest text-slate-700">{cls.join_code}</p>
                    <CopyButton text={cls.join_code} label="Class code" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Link parent to student */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6">
          <h3 className="font-bold text-slate-700 mb-1">Link Parent to Student</h3>
          <p className="text-xs text-slate-400 mb-4">
            Enter the parent's phone or email. Once linked, the parent logs in via the Parent portal and automatically sees their child's report.
          </p>
          <form onSubmit={handleLinkParent} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Select Class</label>
              <select onChange={(e) => loadStudentsForClass(e.target.value)}
                className="w-full border-2 border-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500">
                <option value="">— pick a class —</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.class_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Select Student</label>
              <select value={linkForm.studentId} onChange={(e) => setLinkForm({ ...linkForm, studentId: e.target.value })}
                className="w-full border-2 border-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500">
                <option value="">— pick a student —</option>
                {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Parent Phone (+91…)</label>
                <input value={linkForm.parentPhone} onChange={(e) => setLinkForm({ ...linkForm, parentPhone: e.target.value, parentEmail: '' })}
                  placeholder="+919876543210" type="tel"
                  className="w-full border-2 border-slate-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">OR Parent Email</label>
                <input value={linkForm.parentEmail} onChange={(e) => setLinkForm({ ...linkForm, parentEmail: e.target.value, parentPhone: '' })}
                  placeholder="parent@email.com" type="email"
                  className="w-full border-2 border-slate-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500" />
              </div>
            </div>
            <button type="submit" disabled={!linkForm.studentId}
              className="bg-blue-600 text-white text-sm font-bold px-6 py-2.5 rounded-xl hover:bg-blue-700 transition disabled:opacity-50">
              Link Parent
            </button>
          </form>
        </div>

        {/* Invite teacher */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6">
          <h3 className="font-bold text-slate-700 mb-1">Invite a Teacher</h3>
          <p className="text-xs text-slate-400 mb-4">
            Generates a 7-day invite link. The teacher opens it after logging in and is automatically added to your school.
          </p>
          <form onSubmit={handleInviteTeacher} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Phone (+91…)</label>
                <input value={inviteForm.phone} onChange={(e) => setInviteForm({ ...inviteForm, phone: e.target.value, email: '' })}
                  placeholder="+919876543210" type="tel"
                  className="w-full border-2 border-slate-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">OR Email</label>
                <input value={inviteForm.email} onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value, phone: '' })}
                  placeholder="teacher@school.com" type="email"
                  className="w-full border-2 border-slate-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500" />
              </div>
            </div>
            <button type="submit"
              className="bg-green-600 text-white text-sm font-bold px-6 py-2.5 rounded-xl hover:bg-green-700 transition">
              Generate Invite Link
            </button>
          </form>
        </div>

        {/* Teachers list */}
        {teachers.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 p-6">
            <h3 className="font-bold text-slate-700 mb-4">Teachers in this School</h3>
            <div className="space-y-2">
              {teachers.map((t) => (
                <div key={t.id} className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-700">
                    {(t.name || '?')[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-700">{t.name || 'Unnamed'}</p>
                    <p className="text-xs text-slate-400">{t.phone || t.email || ''} · {t.role}</p>
                  </div>
                  {t.id === user?.id && <span className="ml-auto text-xs text-blue-600 font-bold">You</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default SchoolSettingsPage;
