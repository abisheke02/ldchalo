import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { schoolAPI } from '../../services/api';
import useAuthStore from '../../services/authStore';

const InviteAcceptPage = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { token: authToken, user } = useAuthStore();
  const [status, setStatus] = useState('pending'); // pending | accepting | done | error

  useEffect(() => {
    if (!authToken) {
      // Not logged in — redirect to login, then come back
      sessionStorage.setItem('pending_invite', token);
      navigate('/login');
      return;
    }
    acceptInvite();
  }, [authToken]);

  const acceptInvite = async () => {
    setStatus('accepting');
    try {
      await schoolAPI.acceptInvite(token);
      setStatus('done');
      toast.success('Welcome! You have joined the school.');
      setTimeout(() => navigate('/dashboard'), 1500);
    } catch (err) {
      setStatus('error');
      toast.error(err?.error || 'Invalid or expired invite link');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-8 text-center space-y-4">
        {status === 'pending' || status === 'accepting' ? (
          <>
            <div className="text-4xl animate-spin">⚙️</div>
            <p className="font-bold text-slate-700">Accepting invite…</p>
          </>
        ) : status === 'done' ? (
          <>
            <div className="text-5xl">🎉</div>
            <p className="font-bold text-slate-700 text-lg">You've joined the school!</p>
            <p className="text-slate-400 text-sm">Redirecting to dashboard…</p>
          </>
        ) : (
          <>
            <div className="text-5xl">❌</div>
            <p className="font-bold text-red-600">Invalid or expired invite</p>
            <p className="text-slate-400 text-sm">Ask your school admin to send a new invite link.</p>
            <button onClick={() => navigate('/dashboard')}
              className="text-blue-600 text-sm font-semibold underline">
              Go to Dashboard
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default InviteAcceptPage;
