import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import api from '../../../services/api';

const MONTHS = [
  { value: 1, label: 'January' }, { value: 2, label: 'February' }, { value: 3, label: 'March' },
  { value: 4, label: 'April' }, { value: 5, label: 'May' }, { value: 6, label: 'June' },
  { value: 7, label: 'July' }, { value: 8, label: 'August' }, { value: 9, label: 'September' },
  { value: 10, label: 'October' }, { value: 11, label: 'November' }, { value: 12, label: 'December' },
];

const getStatusInfo = (percentage) => {
  if (percentage >= 85) return { label: 'Good', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  if (percentage >= 75) return { label: 'Warning', color: 'bg-amber-50 text-amber-700 border-amber-200' };
  return { label: 'Critical', color: 'bg-red-50 text-red-700 border-red-200' };
};

const getDayColor = (status) => {
  switch (status) {
    case 'present': return 'bg-emerald-500 text-white';
    case 'absent': return 'bg-red-500 text-white';
    case 'late': return 'bg-amber-400 text-white';
    case 'holiday': return 'bg-gray-200 text-gray-500';
    default: return 'bg-gray-100 text-gray-300';
  }
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
        <p className="text-sm font-medium text-gray-900">{label}</p>
        <p className="text-sm text-[#0891B2] font-semibold">{payload[0].value.toFixed(1)}% Attendance</p>
      </div>
    );
  }
  return null;
};

export default function AttendanceReportPage() {
  const now = new Date();
  // Filters
  const [classFilter, setClassFilter] = useState('all');
  const [sectionFilter, setSectionFilter] = useState('all');
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [searchQuery, setSearchQuery] = useState('');

  // Data
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [overview, setOverview] = useState(null);
  const [attendanceData, setAttendanceData] = useState([]);
  const [classWiseData, setClassWiseData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Table
  const [sortField, setSortField] = useState('percentage');
  const [sortDir, setSortDir] = useState('asc');
  const [expandedStudent, setExpandedStudent] = useState(null);
  const [studentCalendar, setStudentCalendar] = useState(null);
  const [calendarLoading, setCalendarLoading] = useState(false);

  useEffect(() => {
    fetchClasses();
    fetchOverview();
  }, []);

  useEffect(() => {
    fetchAttendance();
  }, [classFilter, sectionFilter, month, year]);

  const fetchClasses = async () => {
    try {
      const res = await api.get('/school/classes');
      const data = res.data?.data || res.data || [];
      setClasses(data);
      // Extract unique sections
      const allSections = [...new Set(data.flatMap(c => c.sections || []))];
      setSections(allSections);
    } catch (err) {
      console.error('Failed to fetch classes:', err);
    }
  };

  const fetchOverview = async () => {
    try {
      const res = await api.get('/school/attendance/overview');
      const data = res.data?.data || res.data || {};
      setOverview(data);
      setClassWiseData(data.class_wise || data.classWise || []);
    } catch (err) {
      console.error('Failed to fetch overview:', err);
    }
  };

  const fetchAttendance = async () => {
    setLoading(true);
    setError(null);
    try {
      const dateStr = `${year}-${String(month).padStart(2, '0')}`;
      let url = '/school/attendance/overview';
      const params = { date: dateStr };

      if (classFilter !== 'all') {
        url = `/school/attendance/class/${classFilter}`;
        params.date = dateStr;
        if (sectionFilter !== 'all') params.section = sectionFilter;
      }

      const res = await api.get(url, { params });
      const data = res.data?.data || res.data || {};
      
      if (classFilter !== 'all') {
        setAttendanceData(data.students || data || []);
      } else {
        setAttendanceData(data.students || []);
        if (data.class_wise || data.classWise) {
          setClassWiseData(data.class_wise || data.classWise || []);
        }
      }
    } catch (err) {
      setError('Failed to load attendance data. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentCalendar = async (studentId) => {
    setCalendarLoading(true);
    try {
      const res = await api.get(`/school/attendance/student/${studentId}/report`, {
        params: { month, year }
      });
      setStudentCalendar(res.data?.data || res.data || {});
    } catch (err) {
      console.error('Failed to fetch student calendar:', err);
      setStudentCalendar(null);
    } finally {
      setCalendarLoading(false);
    }
  };

  const handleStudentClick = (student) => {
    const studentId = student.student_id || student._id || student.id;
    if (expandedStudent === studentId) {
      setExpandedStudent(null);
      setStudentCalendar(null);
    } else {
      setExpandedStudent(studentId);
      fetchStudentCalendar(studentId);
    }
  };

  // Summary stats
  const summaryStats = useMemo(() => {
    if (overview) {
      return {
        workingDays: overview.working_days || overview.workingDays || 0,
        avgAttendance: overview.avg_attendance || overview.avgAttendance || 0,
        below75: overview.below_75 || overview.below75 || 0,
        perfectAttendance: overview.perfect_attendance || overview.perfectAttendance || 0,
      };
    }
    // Compute from attendanceData
    const workingDays = attendanceData.length > 0 ? (attendanceData[0]?.present_days || 0) + (attendanceData[0]?.absent_days || 0) + (attendanceData[0]?.late_days || 0) : 0;
    const avgAttendance = attendanceData.length > 0
      ? attendanceData.reduce((sum, s) => sum + (parseFloat(s.percentage) || 0), 0) / attendanceData.length
      : 0;
    const below75 = attendanceData.filter(s => (parseFloat(s.percentage) || 0) < 75).length;
    const perfectAttendance = attendanceData.filter(s => (parseFloat(s.percentage) || 0) === 100).length;

    return { workingDays, avgAttendance, below75, perfectAttendance };
  }, [overview, attendanceData]);

  // Filtered and sorted data
  const processedData = useMemo(() => {
    let data = [...attendanceData];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      data = data.filter(s => 
        (s.student_name || s.name || '').toLowerCase().includes(q) ||
        (s.admission_no || s.roll_no || '').toLowerCase().includes(q)
      );
    }

    if (sectionFilter !== 'all' && classFilter === 'all') {
      data = data.filter(s => s.section === sectionFilter);
    }

    data.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];
      if (['percentage', 'present_days', 'absent_days', 'late_days'].includes(sortField)) {
        aVal = parseFloat(aVal) || 0;
        bVal = parseFloat(bVal) || 0;
      }
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = (bVal || '').toLowerCase();
      }
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return data;
  }, [attendanceData, searchQuery, sectionFilter, classFilter, sortField, sortDir]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  // CSV Export
  const exportCSV = useCallback(() => {
    const headers = ['Sl No', 'Student Name', 'Class', 'Section', 'Present Days', 'Absent Days', 'Late Days', 'Total %', 'Status'];
    const rows = processedData.map((s, i) => {
      const pct = parseFloat(s.percentage) || 0;
      const status = getStatusInfo(pct);
      return [
        i + 1,
        s.student_name || s.name || '',
        s.class_name || s.class || '',
        s.section || '',
        s.present_days || 0,
        s.absent_days || 0,
        s.late_days || 0,
        pct.toFixed(1),
        status.label,
      ];
    });

    const csv = [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `attendance_report_${year}_${String(month).padStart(2, '0')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [processedData, year, month]);

  // Print
  const handlePrint = () => {
    window.print();
  };

  // Calendar rendering
  const renderCalendar = () => {
    if (!studentCalendar) return null;
    const days = studentCalendar.days || studentCalendar.calendar || [];
    const daysInMonth = new Date(year, month, 0).getDate();
    const firstDay = new Date(year, month - 1, 1).getDay();

    const calendarDays = [];
    // Fill empty cells for first day offset
    for (let i = 0; i < firstDay; i++) {
      calendarDays.push(null);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dayRecord = days.find(day => day.day === d || new Date(day.date).getDate() === d);
      calendarDays.push({
        day: d,
        status: dayRecord?.status || (new Date(year, month - 1, d).getDay() === 0 ? 'holiday' : 'none'),
      });
    }

    return (
      <div className="p-4 bg-gray-50 rounded-lg">
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} className="text-center text-xs font-medium text-gray-500 py-1">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((cell, idx) => (
            <div
              key={idx}
              className={`w-8 h-8 rounded-md flex items-center justify-center text-xs font-medium ${cell ? getDayColor(cell.status) : ''}`}
            >
              {cell?.day || ''}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-4 mt-4 pt-3 border-t border-gray-200">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-emerald-500" />
            <span className="text-xs text-gray-600">Present</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-red-500" />
            <span className="text-xs text-gray-600">Absent</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-amber-400" />
            <span className="text-xs text-gray-600">Late</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-gray-200" />
            <span className="text-xs text-gray-600">Holiday</span>
          </div>
        </div>
      </div>
    );
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <span className="text-gray-300 ml-1">↕</span>;
    return <span className="text-cyan-600 ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto print:p-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-[#0e3a5c]">Attendance Report</h1>
          <p className="text-sm text-gray-500 mt-1">Monitor and analyze student attendance patterns</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print
          </button>
          <button
            onClick={exportCSV}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#0891B2] text-white rounded-lg hover:bg-[#0e7490] transition-colors text-sm font-medium shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 print:hidden">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Class</label>
            <select
              value={classFilter}
              onChange={e => { setClassFilter(e.target.value); setExpandedStudent(null); }}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            >
              <option value="all">All Classes</option>
              {classes.map(cls => (
                <option key={cls._id || cls.id} value={cls._id || cls.id}>
                  {cls.name || cls.class_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Section</label>
            <select
              value={sectionFilter}
              onChange={e => { setSectionFilter(e.target.value); setExpandedStudent(null); }}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            >
              <option value="all">All Sections</option>
              {sections.map(sec => (
                <option key={sec} value={sec}>{sec}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Month</label>
            <select
              value={month}
              onChange={e => { setMonth(parseInt(e.target.value)); setExpandedStudent(null); }}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            >
              {MONTHS.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Year</label>
            <select
              value={year}
              onChange={e => { setYear(parseInt(e.target.value)); setExpandedStudent(null); }}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            >
              <option value={2026}>2026</option>
              <option value={2025}>2025</option>
              <option value={2024}>2024</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Search Student</label>
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Name or roll no..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Working Days</p>
              <p className="text-2xl font-bold text-[#0e3a5c]">{summaryStats.workingDays}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Average Attendance</p>
              <p className="text-2xl font-bold text-[#0e3a5c]">{summaryStats.avgAttendance.toFixed(1)}%</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Below 75%</p>
              <p className="text-2xl font-bold text-[#0e3a5c]">{summaryStats.below75}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-cyan-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-[#0891B2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Perfect Attendance</p>
              <p className="text-2xl font-bold text-[#0e3a5c]">{summaryStats.perfectAttendance}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bar Chart - Class-wise Attendance */}
      {classWiseData.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-lg font-semibold text-[#0e3a5c] mb-4">Class-wise Average Attendance</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={classWiseData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="class_name"
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  axisLine={{ stroke: '#e5e7eb' }}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  axisLine={{ stroke: '#e5e7eb' }}
                  tickLine={false}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="avg_attendance" radius={[6, 6, 0, 0]} maxBarSize={50}>
                  {classWiseData.map((entry, index) => {
                    const val = entry.avg_attendance || 0;
                    let fill = '#0891B2';
                    if (val < 75) fill = '#ef4444';
                    else if (val < 85) fill = '#f59e0b';
                    return <Cell key={index} fill={fill} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <svg className="w-5 h-5 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-red-700">{error}</p>
          <button onClick={fetchAttendance} className="ml-auto text-sm text-red-600 font-medium hover:underline">Retry</button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 flex flex-col items-center justify-center">
          <div className="w-8 h-8 border-4 border-cyan-200 border-t-[#0891B2] rounded-full animate-spin" />
          <p className="text-sm text-gray-500 mt-3">Loading attendance data...</p>
        </div>
      )}

      {/* Data Table */}
      {!loading && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-4 py-3 text-left font-medium text-gray-600 w-12">Sl</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 cursor-pointer hover:text-[#0891B2]" onClick={() => handleSort('student_name')}>
                    Student Name <SortIcon field="student_name" />
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Class/Section</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-600 cursor-pointer hover:text-[#0891B2]" onClick={() => handleSort('present_days')}>
                    Present <SortIcon field="present_days" />
                  </th>
                  <th className="px-4 py-3 text-center font-medium text-gray-600 cursor-pointer hover:text-[#0891B2]" onClick={() => handleSort('absent_days')}>
                    Absent <SortIcon field="absent_days" />
                  </th>
                  <th className="px-4 py-3 text-center font-medium text-gray-600 cursor-pointer hover:text-[#0891B2]" onClick={() => handleSort('late_days')}>
                    Late <SortIcon field="late_days" />
                  </th>
                  <th className="px-4 py-3 text-center font-medium text-gray-600 cursor-pointer hover:text-[#0891B2]" onClick={() => handleSort('percentage')}>
                    Total % <SortIcon field="percentage" />
                  </th>
                  <th className="px-4 py-3 text-center font-medium text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {processedData.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                      <svg className="w-12 h-12 mx-auto mb-3 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      No attendance records found
                    </td>
                  </tr>
                ) : (
                  processedData.map((student, idx) => {
                    const pct = parseFloat(student.percentage) || 0;
                    const status = getStatusInfo(pct);
                    const studentId = student.student_id || student._id || student.id;
                    const isExpanded = expandedStudent === studentId;
                    const rowBg = pct < 75 ? 'bg-red-50/40' : '';

                    return (
                      <React.Fragment key={studentId || idx}>
                        <tr
                          className={`${rowBg} hover:bg-gray-50/80 cursor-pointer transition-colors`}
                          onClick={() => handleStudentClick(student)}
                        >
                          <td className="px-4 py-3 text-gray-500">{idx + 1}</td>
                          <td className="px-4 py-3 font-medium text-gray-900">
                            <div className="flex items-center gap-2">
                              <svg className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                              {student.student_name || student.name}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {student.class_name || student.class}{student.section ? ` / ${student.section}` : ''}
                          </td>
                          <td className="px-4 py-3 text-center font-medium text-emerald-600">{student.present_days || 0}</td>
                          <td className="px-4 py-3 text-center font-medium text-red-500">{student.absent_days || 0}</td>
                          <td className="px-4 py-3 text-center font-medium text-amber-500">{student.late_days || 0}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`font-bold ${pct >= 85 ? 'text-emerald-600' : pct >= 75 ? 'text-amber-600' : 'text-red-600'}`}>
                              {pct.toFixed(1)}%
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${status.color}`}>
                              {status.label}
                            </span>
                          </td>
                        </tr>
                        {/* Expanded Calendar Row */}
                        {isExpanded && (
                          <tr>
                            <td colSpan={8} className="px-4 py-4 bg-gray-50/50">
                              <div className="max-w-md mx-auto">
                                <h4 className="text-sm font-semibold text-[#0e3a5c] mb-3">
                                  Daily Attendance — {MONTHS[month - 1]?.label} {year}
                                </h4>
                                {calendarLoading ? (
                                  <div className="flex items-center justify-center py-6">
                                    <div className="w-6 h-6 border-3 border-cyan-200 border-t-[#0891B2] rounded-full animate-spin" />
                                  </div>
                                ) : (
                                  renderCalendar()
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Results summary */}
          {processedData.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/50">
              <p className="text-xs text-gray-500">
                Showing {processedData.length} student{processedData.length !== 1 ? 's' : ''} • Click a row to view daily calendar
              </p>
            </div>
          )}
        </div>
      )}

      {/* Print Styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print\\:p-0, .print\\:p-0 * { visibility: visible; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
}
