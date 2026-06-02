import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { attendanceApi, master } from '../../services/erp-api';

const today = () => new Date().toISOString().split('T')[0];

const STATUS_CONFIG = {
  P: { label: 'Present', active: 'bg-green-500 text-white border-green-500', base: 'bg-green-50 text-green-700 border-green-300' },
  A: { label: 'Absent',  active: 'bg-red-500 text-white border-red-500',     base: 'bg-red-50 text-red-700 border-red-300' },
  L: { label: 'Late',    active: 'bg-yellow-500 text-white border-yellow-500', base: 'bg-yellow-50 text-yellow-700 border-yellow-300' },
};

export default function StaffAttendanceEntry() {
  const [departments, setDepartments] = useState([]);
  const [departmentId, setDepartmentId] = useState('');
  const [date, setDate] = useState(today());
  const [staffList, setStaffList] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [checkIn, setCheckIn] = useState({});
  const [checkOut, setCheckOut] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    master.list('departments').then(data => setDepartments(data || [])).catch(() => {});
  }, []);

  const loadStaff = async () => {
    if (!date) { toast.error('Please select a date'); return; }
    setLoading(true);
    try {
      const url = departmentId ? `${date}&department_id=${departmentId}` : date;
      const data = await attendanceApi.getStaff(url);
      const list = data || [];
      setStaffList(list);
      const initStatus = {}, initIn = {}, initOut = {};
      list.forEach(s => {
        initStatus[s.id] = s.status || 'P';
        initIn[s.id] = s.check_in || '';
        initOut[s.id] = s.check_out || '';
      });
      setAttendance(initStatus);
      setCheckIn(initIn);
      setCheckOut(initOut);
      setLoaded(true);
      toast.success(`Loaded ${list.length} staff members`);
    } catch (err) {
      toast.error(err.message || 'Failed to load staff');
    } finally {
      setLoading(false);
    }
  };

  const setStatus = (id, status) => setAttendance(prev => ({ ...prev, [id]: status }));
  const markAll = (status) => {
    const next = {};
    staffList.forEach(s => { next[s.id] = status; });
    setAttendance(next);
  };

  const counts = staffList.reduce((acc, s) => {
    const st = attendance[s.id] || 'P';
    acc[st] = (acc[st] || 0) + 1;
    return acc;
  }, { P: 0, A: 0, L: 0 });

  const handleSave = async () => {
    if (!loaded || staffList.length === 0) { toast.error('Load staff first'); return; }
    setSaving(true);
    try {
      const records = staffList.map(s => ({
        staff_id: s.id,
        date,
        department_id: departmentId || null,
        status: attendance[s.id] || 'P',
        check_in: checkIn[s.id] || null,
        check_out: checkOut[s.id] || null,
      }));
      await attendanceApi.markStaff({ date, department_id: departmentId || null, records });
      toast.success('Staff attendance saved successfully');
    } catch (err) {
      toast.error(err.message || 'Failed to save attendance');
    } finally {
      setSaving(false);
    }
  };

  const inputCls = 'w-28 px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-300 bg-white';

  return (
    <div className="flex flex-col h-full">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-gray-900">Staff Attendance Entry</h1>
        <p className="text-sm text-gray-500 mt-0.5">Mark daily attendance for staff members</p>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-100 rounded-xl p-4 mb-4 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Department</label>
            <select
              value={departmentId}
              onChange={e => { setDepartmentId(e.target.value); setLoaded(false); }}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
            >
              <option value="">All Departments</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Date <span className="text-red-500">*</span></label>
            <input
              type="date"
              value={date}
              max={today()}
              onChange={e => { setDate(e.target.value); setLoaded(false); }}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-2 flex items-end">
            <button
              onClick={loadStaff}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition-colors shadow-sm"
            >
              {loading ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              )}
              {loading ? 'Loading...' : 'Load Staff'}
            </button>
          </div>
        </div>
      </div>

      {/* Summary */}
      {loaded && staffList.length > 0 && (
        <div className="grid grid-cols-4 gap-3 mb-4">
          {[
            { label: 'Total',   value: staffList.length, color: 'bg-gray-50 border-gray-200 text-gray-700' },
            { label: 'Present', value: counts.P || 0,    color: 'bg-green-50 border-green-200 text-green-700' },
            { label: 'Absent',  value: counts.A || 0,    color: 'bg-red-50 border-red-200 text-red-700' },
            { label: 'Late',    value: counts.L || 0,    color: 'bg-yellow-50 border-yellow-200 text-yellow-700' },
          ].map(stat => (
            <div key={stat.label} className={`border rounded-xl p-3 text-center ${stat.color}`}>
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="text-xs font-semibold mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Bulk Actions */}
      {loaded && staffList.length > 0 && (
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-semibold text-gray-500 mr-1">Mark All:</span>
          {Object.entries(STATUS_CONFIG).map(([s, cfg]) => (
            <button key={s} onClick={() => markAll(s)} className={`px-3 py-1 text-xs font-semibold rounded-lg border transition-colors ${cfg.base} hover:opacity-80`}>
              {cfg.label}
            </button>
          ))}
        </div>
      )}

      {/* Staff Table */}
      {loaded && staffList.length > 0 && (
        <div className="flex-1 overflow-auto bg-white border border-gray-100 rounded-xl shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider w-10">#</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Staff Name</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Department</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Designation</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Check In</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Check Out</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody>
              {staffList.map((staff, idx) => (
                <tr key={staff.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-400 text-xs">{idx + 1}</td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-800">{staff.name || `${staff.first_name || ''} ${staff.last_name || ''}`.trim()}</div>
                    <div className="text-xs text-gray-400">{staff.employee_code || staff.emp_id || ''}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{staff.department_name || '—'}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{staff.designation || '—'}</td>
                  <td className="px-4 py-3">
                    <input
                      type="time"
                      value={checkIn[staff.id] || ''}
                      onChange={e => setCheckIn(prev => ({ ...prev, [staff.id]: e.target.value }))}
                      className={inputCls}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="time"
                      value={checkOut[staff.id] || ''}
                      onChange={e => setCheckOut(prev => ({ ...prev, [staff.id]: e.target.value }))}
                      className={inputCls}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {Object.entries(STATUS_CONFIG).map(([s, cfg]) => {
                        const isActive = attendance[staff.id] === s;
                        return (
                          <button
                            key={s}
                            onClick={() => setStatus(staff.id, s)}
                            className={`w-9 h-9 text-xs font-bold rounded-lg border transition-all ${isActive ? cfg.active : cfg.base} hover:opacity-90 active:scale-95`}
                          >
                            {s}
                          </button>
                        );
                      })}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty State */}
      {!loaded && !loading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-gray-400">
            <svg className="w-12 h-12 mx-auto mb-3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <p className="text-sm font-medium">Select filters and click Load Staff</p>
          </div>
        </div>
      )}

      {loaded && staffList.length === 0 && !loading && (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-gray-400">No staff found for the selected filters.</p>
        </div>
      )}

      {/* Save */}
      {loaded && staffList.length > 0 && (
        <div className="mt-4 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition-colors shadow-sm"
          >
            {saving && <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
            {saving ? 'Saving...' : 'Save Attendance'}
          </button>
        </div>
      )}
    </div>
  );
}
