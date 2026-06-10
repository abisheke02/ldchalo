import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const LEVEL_LABELS = ['', 'Basic Recognition', 'Simple Matching', 'Words & Math', 'Sentences', 'Complex Patterns'];

export default function TestCertificate() {
  const location = useLocation();
  const navigate = useNavigate();
  const cert = location.state?.certificate || {
    studentName: 'Demo Student',
    level: 2,
    score: 90,
    date: new Date().toISOString(),
    schoolName: 'LD Schools',
    id: 'CERT-001',
  };

  const formattedDate = new Date(cert.date).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Print/Download buttons */}
        <div className="flex items-center justify-between mb-4 print:hidden">
          <button onClick={() => navigate('/ld/tests')} className="text-sm text-gray-500 hover:text-gray-700">← Back to Tests</button>
          <div className="flex gap-2">
            <button onClick={() => window.print()} className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700">
              🖨️ Print
            </button>
            <button className="px-4 py-2 bg-gray-200 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-300">
              📤 Share
            </button>
          </div>
        </div>

        {/* Certificate */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden print:shadow-none print:rounded-none">
          {/* Gold border frame */}
          <div className="p-2 bg-gradient-to-br from-yellow-300 via-yellow-400 to-yellow-500">
            <div className="p-2 bg-white">
              <div className="border-4 border-double border-yellow-400 p-8 md:p-12 text-center">
                {/* Header */}
                <div className="mb-6">
                  <div className="text-4xl mb-2">🏆</div>
                  <h1 className="text-3xl md:text-4xl font-serif font-bold text-gray-800 tracking-wide">
                    CERTIFICATE
                  </h1>
                  <p className="text-sm text-gray-500 tracking-widest uppercase mt-1">of Achievement</p>
                </div>

                {/* Divider */}
                <div className="w-32 h-0.5 bg-yellow-400 mx-auto mb-6" />

                {/* Body */}
                <p className="text-gray-500 text-sm mb-2">This is to certify that</p>
                <h2 className="text-2xl md:text-3xl font-bold text-indigo-700 mb-4 font-serif">
                  {cert.studentName}
                </h2>

                <p className="text-gray-600 mb-6 leading-relaxed max-w-md mx-auto">
                  has successfully passed the <strong>Level {cert.level}</strong> assessment
                  in the Learning Support Program with a score of
                </p>

                {/* Score badge */}
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full border-4 border-green-400 bg-green-50 mb-6">
                  <span className="text-2xl font-bold text-green-600">{cert.score}%</span>
                </div>

                {/* Level info */}
                <div className="bg-gray-50 rounded-xl p-4 inline-block mb-8">
                  <p className="text-xs text-gray-400 uppercase">Level Achieved</p>
                  <p className="text-xl font-bold text-gray-800">Level {cert.level}: {LEVEL_LABELS[cert.level]}</p>
                </div>

                {/* Date and ID */}
                <div className="flex items-center justify-between text-xs text-gray-400 mt-8 pt-6 border-t border-gray-200">
                  <div className="text-left">
                    <p>Date: {formattedDate}</p>
                    <p>Certificate ID: {cert.id}</p>
                  </div>
                  <div className="text-right">
                    <p>{cert.schoolName || 'LD Schools'}</p>
                    <p className="text-indigo-500 font-medium">Learning Support Program</p>
                  </div>
                </div>

                {/* Seal */}
                <div className="mt-6 flex justify-center">
                  <div className="w-16 h-16 rounded-full border-2 border-yellow-400 flex items-center justify-center bg-yellow-50">
                    <span className="text-xs font-bold text-yellow-600 text-center leading-tight">VERIFIED<br/>✓</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Below certificate */}
        <div className="text-center mt-6 print:hidden">
          <p className="text-sm text-gray-400 mb-4">Congratulations on your achievement! 🌟</p>
          <button
            onClick={() => navigate('/ld/practice')}
            className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
          >
            Continue Practicing →
          </button>
        </div>
      </div>
    </div>
  );
}
