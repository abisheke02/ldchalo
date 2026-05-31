import { useState, useEffect } from 'react';
import api from '../../../services/api';
import useAuthStore from '../../../store/authStore';

export default function AcademicYearPage() {
  const { user } = useAuthStore();
  const [years, setYears] = useState([]);
  const [terms, setTerms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(null);
  const [showYearModal, setShowYearModal] = useState(false);
  const [showTermModal, setShowTermModal] = useState(false);
  const [editingYear, setEditingYear] = useState(null);
  const [editingTerm, setEditingTerm] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [yearForm, setYearForm] = useState({
    name: '',
    start_date: '',
    end_date: '',
    is_current: false,
  });
  const [termForm, setTermForm] = useState({
    name: '',
    start_date: '',
    end_date: '',
    academic_year_id: '',
  });

  useEffect(() => {
    fetchYears();
  }, []);

  useEffect(() => {
    if (selectedYear) {
      fetchTerms(selectedYear.id);
    }
  }, [selectedYear]);

  const fetchYears = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/school/masters/academic/years');
      const data = res.data.data || res.data || [];
      setYears(data);
      // Auto-select current year
      const current = data.find((y) => y.is_current);
      if (current) setSelectedYear(current);
      else if (data.length > 0) setSelectedYear(data[0]);
    } catch (err) {
      console.error('Failed to fetch academic years:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTerms = async (yearId) => {
    try {
      const res = await api.get('/api/school/masters/academic/terms', { params: { academic_year_id: yearId } });
      setTerms(res.data.data || res.data || []);
    } catch (err) {
      console.error('Failed to fetch terms:', err);
      setTerms([]);
    }
  };

  const openAddYearModal = () => {
    setEditingYear(null);
    setYearForm({ name: '', start_date: '', end_date: '', is_current: false });
    setShowYearModal(true);
  };

  const openEditYearModal = (year) => {
    setEditingYear(year);
    setYearForm({
      name: year.name || '',
      start_date: year.start_date ? year.start_date.split('T')[0] : '',
      end_date: year.end_date ? year.end_date.split('T')[0] : '',
      is_current: year.is_current || false,
    });
    setShowYearModal(true);
  };

  const openAddTermModal = () => {
    setEditingTerm(null);
    setTermForm({ name: '', start_date: '', end_date: '', academic_year_id: selectedYear?.id || '' });
    setShowTermModal(true);
  };

  const openEditTermModal = (term) => {
    setEditingTerm(term);
    setTermForm({
      name: term.name || '',
      start_date: term.start_date ? term.start_date.split('T')[0] : '',
      end_date: term.end_date ? term.end_date.split('T')[0] : '',
      academic_year_id: term.academic_year_id || selectedYear?.id || '',
    });
    setShowTermModal(true);
  };

  const handleYearSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      if (editingYear) {
        await api.post('/api/school/masters/academic/years', { ...yearForm, id: editingYear.id });
      } else {
        await api.post('/api/school/masters/academic/years', yearForm);
      }
      setShowYearModal(false);
      fetchYears();
    } catch (err) {
      console.error('Failed to save academic year:', err);
      alert('Failed to save academic year. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTermSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const payload = { ...termForm, academic_year_id: selectedYear?.id };
      if (editingTerm) {
        await api.post('/api/school/masters/academic/terms', { ...payload, id: editingTerm.id });
      } else {
        await api.post('/api/school/masters/academic/terms', payload);
      }
      setShowTermModal(false);
      fetchTerms(selectedYear.id);
    } catch (err) {
      console.error('Failed to save term:', err);
      alert('Failed to save term. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteYear = async (id) => {
    if (!window.confirm('Are you sure you want to delete this academic year? All associated terms will also be removed.')) return;
    try {
      await api.delete(`/api/school/masters/academic/years/${id}`);
      fetchYears();
      if (selectedYear?.id === id) setSelectedYear(null);
    } catch (err) {
      console.error('Failed to delete year:', err);
      alert('Failed to delete academic year.');
    }
  };

  const handleDeleteTerm = async (id) => {
    if (!window.confirm('Are you sure you want to delete this term?')) return;
    try {
      await api.delete(`/api/school/masters/academic/terms/${id}`);
      fetchTerms(selectedYear.id);
    } catch (err) {
      console.error('Failed to delete term:', err);
      alert('Failed to delete term.');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <span className="ml-3 text-gray-600">Loading academic years...</span>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Academic Years</h1>
          <p className="text-sm text-gray-500 mt-1">Manage academic years and their terms</p>
        </div>
        <button
          onClick={openAddYearModal}
          className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Year
        </button>
      </div>

      {/* Academic Years List */}
      {years.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No academic years</h3>
          <p className="mt-1 text-sm text-gray-500">Create your first academic year to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {years.map((year) => (
            <div
              key={year.id}
              onClick={() => setSelectedYear(year)}
              className={`relative cursor-pointer rounded-lg border-2 p-4 transition-all ${
                selectedYear?.id === year.id
                  ? 'border-indigo-500 bg-indigo-50 shadow-md'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
              }`}
            >
              {year.is_current && (
                <span className="absolute top-2 right-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Current
                </span>
              )}
              <h3 className="text-lg font-semibold text-gray-900">{year.name}</h3>
              <p className="text-sm text-gray-500 mt-1">
                {formatDate(year.start_date)} — {formatDate(year.end_date)}
              </p>
              <div className="mt-3 flex items-center space-x-2">
                <button
                  onClick={(e) => { e.stopPropagation(); openEditYearModal(year); }}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  Edit
                </button>
                <span className="text-gray-300">|</span>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteYear(year.id); }}
                  className="text-xs text-red-600 hover:text-red-800 font-medium"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Terms Section */}
      {selectedYear && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Terms — {selectedYear.name}
              </h2>
              <p className="text-sm text-gray-500">Academic terms/semesters for the selected year</p>
            </div>
            <button
              onClick={openAddTermModal}
              className="inline-flex items-center px-3 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Term
            </button>
          </div>
          {terms.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-gray-500">No terms defined for this academic year.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Term Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">End Date</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {terms.map((term) => (
                    <tr key={term.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{term.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{formatDate(term.start_date)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{formatDate(term.end_date)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <button
                          onClick={() => openEditTermModal(term)}
                          className="text-indigo-600 hover:text-indigo-900 font-medium mr-3"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteTerm(term.id)}
                          className="text-red-600 hover:text-red-900 font-medium"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Year Modal */}
      {showYearModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowYearModal(false)}></div>
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6 z-10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {editingYear ? 'Edit Academic Year' : 'Add Academic Year'}
                </h3>
                <button onClick={() => setShowYearModal(false)} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <form onSubmit={handleYearSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Year Name *</label>
                  <input
                    type="text"
                    required
                    value={yearForm.name}
                    onChange={(e) => setYearForm({ ...yearForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="e.g., 2025-2026"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
                    <input
                      type="date"
                      required
                      value={yearForm.start_date}
                      onChange={(e) => setYearForm({ ...yearForm, start_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Date *</label>
                    <input
                      type="date"
                      required
                      value={yearForm.end_date}
                      onChange={(e) => setYearForm({ ...yearForm, end_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_current"
                    checked={yearForm.is_current}
                    onChange={(e) => setYearForm({ ...yearForm, is_current: e.target.checked })}
                    className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <label htmlFor="is_current" className="ml-2 text-sm text-gray-700">
                    Set as current academic year
                  </label>
                </div>
                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => setShowYearModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                  >
                    {submitting ? 'Saving...' : editingYear ? 'Update Year' : 'Add Year'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Term Modal */}
      {showTermModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowTermModal(false)}></div>
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6 z-10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {editingTerm ? 'Edit Term' : 'Add New Term'}
                </h3>
                <button onClick={() => setShowTermModal(false)} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <form onSubmit={handleTermSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Term Name *</label>
                  <input
                    type="text"
                    required
                    value={termForm.name}
                    onChange={(e) => setTermForm({ ...termForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="e.g., Term 1, Semester 1"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
                    <input
                      type="date"
                      required
                      value={termForm.start_date}
                      onChange={(e) => setTermForm({ ...termForm, start_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Date *</label>
                    <input
                      type="date"
                      required
                      value={termForm.end_date}
                      onChange={(e) => setTermForm({ ...termForm, end_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => setShowTermModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                  >
                    {submitting ? 'Saving...' : editingTerm ? 'Update Term' : 'Add Term'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
