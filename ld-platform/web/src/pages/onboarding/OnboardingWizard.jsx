import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import useAuthStore from '../../services/authStore';
import { schoolAPI } from '../../services/api';

const STEPS = ['School Setup', 'Create Class', 'Share Codes'];

const Step1School = ({ onNext }) => {
  const [mode, setMode] = useState('create'); // 'create' | 'join'
  const [form, setForm] = useState({ name: '', location: '', board: 'CBSE', principalName: '', studentStrength: '' });
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.location.trim()) { toast.error('Name and location are required'); return; }
    setLoading(true);
    try {
      const { school } = await schoolAPI.registerSchool(form);
      toast.success('School registered!');
      onNext({ school });
    } catch (err) {
      toast.error(err?.error || 'Could not register school');
    } finally { setLoading(false); }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!joinCode.trim()) { toast.error('Enter join code'); return; }
    setLoading(true);
    try {
      const { schoolId } = await schoolAPI.joinByCode(joinCode.trim().toUpperCase());
      toast.success('Joined school!');
      onNext({ schoolId });
    } catch (err) {
      toast.error(err?.error || 'Invalid join code');
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex bg-slate-100 p-1 rounded-xl">
        {['create', 'join'].map((m) => (
          <button key={m} type="button" onClick={() => setMode(m)}
            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all capitalize
              ${mode === m ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500'}`}>
            {m === 'create' ? '🏫 Register New School' : '🔗 Join Existing School'}
          </button>
        ))}
      </div>

      {mode === 'create' ? (
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">School Name *</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Delhi Public School, Rohini" required
              className="w-full border-2 border-slate-100 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Location / City *</label>
            <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="New Delhi" required
              className="w-full border-2 border-slate-100 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Board</label>
              <select value={form.board} onChange={(e) => setForm({ ...form, board: e.target.value })}
                className="w-full border-2 border-slate-100 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500">
                {['CBSE', 'ICSE', 'State', 'Other'].map((b) => <option key={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Total Students</label>
              <input type="number" min="0" max="10000"
                value={form.studentStrength} onChange={(e) => setForm({ ...form, studentStrength: e.target.value })}
                placeholder="e.g. 500"
                className="w-full border-2 border-slate-100 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Principal Name</label>
            <input value={form.principalName} onChange={(e) => setForm({ ...form, principalName: e.target.value })}
              placeholder="Mrs. Sharma"
              className="w-full border-2 border-slate-100 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full bg-blue-700 text-white font-bold py-4 rounded-xl text-lg disabled:bg-blue-300 hover:bg-blue-800 transition">
            {loading ? 'Registering…' : 'Register School →'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleJoin} className="space-y-4">
          <p className="text-sm text-slate-500">Ask your school admin or principal for the 6-character school join code.</p>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">School Join Code</label>
            <input value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="e.g. DPS123" maxLength={8} required
              className="w-full border-2 border-slate-100 rounded-xl px-4 py-3 text-2xl tracking-widest font-mono text-center focus:outline-none focus:border-blue-500" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full bg-blue-700 text-white font-bold py-4 rounded-xl text-lg disabled:bg-blue-300 hover:bg-blue-800 transition">
            {loading ? 'Joining…' : 'Join School →'}
          </button>
        </form>
      )}
    </div>
  );
};

const Step2Class = ({ schoolId, onNext }) => {
  const [className, setClassName] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuthStore();

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!className.trim()) { toast.error('Enter class name'); return; }
    setLoading(true);
    try {
      const sid = schoolId || user?.school_id;
      const { class: cls } = await schoolAPI.createClass({ className: className.trim(), schoolId: sid });
      toast.success('Class created!');
      onNext({ class: cls });
    } catch (err) {
      toast.error(err?.error || 'Could not create class');
    } finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleCreate} className="space-y-4">
      <p className="text-sm text-slate-500">Create your first class. Students will join using the class join code.</p>
      <div>
        <label className="block text-sm font-bold text-slate-700 mb-1">Class Name *</label>
        <input value={className} onChange={(e) => setClassName(e.target.value)}
          placeholder="Grade 4 — Section A" required
          className="w-full border-2 border-slate-100 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500" />
      </div>
      <button type="submit" disabled={loading}
        className="w-full bg-blue-700 text-white font-bold py-4 rounded-xl text-lg disabled:bg-blue-300 hover:bg-blue-800 transition">
        {loading ? 'Creating…' : 'Create Class →'}
      </button>
    </form>
  );
};

const Step3Share = ({ school, classData, onFinish }) => {
  const copy = (text, label) => {
    navigator.clipboard.writeText(text).then(() => toast.success(`${label} copied!`));
  };

  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-500">
        Share these codes with the right people. Students join via the mobile app; teachers join via this web portal.
      </p>

      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5">
        <p className="text-xs font-bold text-blue-600 uppercase tracking-wide mb-1">For Students (mobile app)</p>
        <div className="flex items-center justify-between gap-3">
          <p className="text-3xl font-black tracking-widest text-blue-800">{classData?.join_code}</p>
          <button onClick={() => copy(classData?.join_code, 'Class code')}
            className="text-sm bg-blue-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-blue-700">
            Copy
          </button>
        </div>
        <p className="text-xs text-blue-500 mt-1">Class: {classData?.class_name}</p>
      </div>

      {school?.join_code && (
        <div className="bg-green-50 border border-green-100 rounded-2xl p-5">
          <p className="text-xs font-bold text-green-600 uppercase tracking-wide mb-1">For Other Teachers (web login)</p>
          <div className="flex items-center justify-between gap-3">
            <p className="text-3xl font-black tracking-widest text-green-800">{school.join_code}</p>
            <button onClick={() => copy(school.join_code, 'School code')}
              className="text-sm bg-green-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-green-700">
              Copy
            </button>
          </div>
          <p className="text-xs text-green-500 mt-1">School: {school.name}</p>
        </div>
      )}

      <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-sm text-amber-700">
        <strong>To link parents:</strong> Go to Settings → link a parent's phone/email to each student. They'll automatically see their child's report when they log in.
      </div>

      <button onClick={onFinish}
        className="w-full bg-green-600 text-white font-bold py-4 rounded-xl text-lg hover:bg-green-700 transition">
        Go to Dashboard →
      </button>
    </div>
  );
};

const OnboardingWizard = () => {
  const navigate = useNavigate();
  const { user, setDemoAuth } = useAuthStore();
  const [step, setStep] = useState(0);
  const [data, setData] = useState({});

  const handleStep1 = (result) => {
    setData((d) => ({ ...d, ...result }));
    setStep(1);
  };

  const handleStep2 = (result) => {
    setData((d) => ({ ...d, ...result }));
    setStep(2);
  };

  const handleFinish = () => {
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-8">
        {/* Header */}
        <div className="text-center mb-6">
          <p className="text-slate-400 text-sm font-medium mb-1">Welcome to LD Support Platform</p>
          <h1 className="text-2xl font-extrabold text-slate-800">Let's get you set up</h1>
        </div>

        {/* Step indicators */}
        <div className="flex items-center mb-8">
          {STEPS.map((s, i) => (
            <React.Fragment key={s}>
              <div className={`flex flex-col items-center ${i <= step ? 'opacity-100' : 'opacity-40'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                  ${i < step ? 'bg-green-500 text-white' : i === step ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                  {i < step ? '✓' : i + 1}
                </div>
                <span className="text-xs text-slate-500 mt-1 hidden sm:block">{s}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 ${i < step ? 'bg-green-400' : 'bg-slate-200'}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Step content */}
        <div className="text-lg font-bold text-slate-700 mb-4">{STEPS[step]}</div>

        {step === 0 && <Step1School onNext={handleStep1} />}
        {step === 1 && <Step2Class schoolId={data.school?.id || data.schoolId} onNext={handleStep2} />}
        {step === 2 && <Step3Share school={data.school} classData={data.class} onFinish={handleFinish} />}
      </div>
    </div>
  );
};

export default OnboardingWizard;
