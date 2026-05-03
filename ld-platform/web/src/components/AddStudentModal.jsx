import React from 'react';
import toast from 'react-hot-toast';

const AddStudentModal = ({ isOpen, onClose, classData }) => {
  if (!isOpen || !classData) return null;

  const copyCode = () => {
    navigator.clipboard.writeText(classData.join_code);
    toast.success('Join code copied!');
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden">
        <div className="p-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-black text-slate-800 tracking-tight">Add Student</h3>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="text-center space-y-6">
            <div className="bg-blue-50 rounded-3xl p-8 border-2 border-blue-100 border-dashed">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 mb-2">Class Join Code</p>
              <p className="text-5xl font-black text-blue-700 tracking-[0.1em] font-mono">{classData.join_code}</p>
            </div>

            <div className="space-y-4">
              <p className="text-slate-600 text-sm font-medium leading-relaxed">
                Students can join <span className="font-bold text-slate-800">{classData.class_name}</span> by entering this code in their app.
              </p>
              
              <button
                onClick={copyCode}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-blue-200 active:scale-95"
              >
                Copy Join Code
              </button>
            </div>
          </div>
        </div>

        <div className="bg-slate-50 px-8 py-6 border-t border-slate-100 text-center">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Secure Enrollment • Manual approval not required
          </p>
        </div>
      </div>
    </div>
  );
};

export default AddStudentModal;
