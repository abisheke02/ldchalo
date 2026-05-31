import React, { useState, useEffect } from 'react';
import api from '../../../services/api';

const TABS = [
  { key: 'countries', label: 'Countries' },
  { key: 'states', label: 'States' },
  { key: 'cities', label: 'Cities' },
  { key: 'religions', label: 'Religions' },
  { key: 'communities', label: 'Communities' },
  { key: 'castes', label: 'Castes' },
  { key: 'nationalities', label: 'Nationalities' },
];

export default function DemographicMastersPage() {
  const [activeTab, setActiveTab] = useState('countries');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [formData, setFormData] = useState({ name: '', code: '', country_id: '' });
  const [countries, setCountries] = useState([]);
  const [countryFilter, setCountryFilter] = useState('');

  useEffect(() => {
    fetchData();
    if (activeTab === 'states' || activeTab === 'cities') {
      fetchCountries();
    }
  }, [activeTab, countryFilter]);

  const fetchCountries = async () => {
    try {
      const res = await api.get('/api/school/masters/demographics/countries');
      setCountries(res.data?.data || res.data || []);
    } catch (err) {
      console.error('Failed to fetch countries', err);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      let url = `/api/school/masters/demographics/${activeTab}`;
      if (activeTab === 'states' && countryFilter) {
        url += `?country_id=${countryFilter}`;
      }
      const res = await api.get(url);
      setData(res.data?.data || res.data || []);
    } catch (err) {
      console.error('Failed to fetch data', err);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const openAdd = () => {
    setEditItem(null);
    setFormData({ name: '', code: '', country_id: '' });
    setShowModal(true);
  };

  const openEdit = (item) => {
    setEditItem(item);
    setFormData({ name: item.name || '', code: item.code || '', country_id: item.country_id || '' });
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      const payload = { name: formData.name, code: formData.code };
      if (activeTab === 'states' || activeTab === 'cities') {
        payload.country_id = formData.country_id;
      }
      if (editItem) {
        await api.put(`/api/school/masters/demographics/${activeTab}/${editItem._id || editItem.id}`, payload);
      } else {
        await api.post(`/api/school/masters/demographics/${activeTab}`, payload);
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      console.error('Save failed', err);
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Delete "${item.name}"?`)) return;
    try {
      await api.delete(`/api/school/masters/demographics/${activeTab}/${item._id || item.id}`);
      fetchData();
    } catch (err) {
      console.error('Delete failed', err);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0e3a5c]">Demographic Masters</h1>
          <p className="text-sm text-gray-500 mt-1">Manage countries, states, cities, religions, communities, castes & nationalities</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="border-b border-gray-200 px-5">
          <nav className="flex gap-1 -mb-px overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => { setActiveTab(tab.key); setCountryFilter(''); }}
                className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? 'border-[#0891B2] text-[#0891B2]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Filter + Actions */}
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {activeTab === 'states' && (
                <select
                  value={countryFilter}
                  onChange={(e) => setCountryFilter(e.target.value)}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0891B2] focus:border-transparent"
                >
                  <option value="">All Countries</option>
                  {countries.map((c) => (
                    <option key={c._id || c.id} value={c._id || c.id}>{c.name}</option>
                  ))}
                </select>
              )}
              <span className="text-sm text-gray-500">{data.length} items</span>
            </div>
            <button
              onClick={openAdd}
              className="px-4 py-2 bg-[#0891B2] text-white text-sm font-medium rounded-lg hover:bg-[#0891B2]/90 transition-colors"
            >
              + Add {TABS.find(t => t.key === activeTab)?.label.slice(0, -1) || 'Item'}
            </button>
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0891B2]"></div>
            </div>
          ) : data.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400 text-lg">📋</p>
              <p className="text-gray-500 mt-2">No {activeTab} found</p>
              <p className="text-gray-400 text-sm mt-1">Click "Add" to create one</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-600">#</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-600">Name</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-600">Code</th>
                    {(activeTab === 'states' || activeTab === 'cities') && (
                      <th className="text-left py-3 px-4 font-semibold text-gray-600">Country</th>
                    )}
                    <th className="text-right py-3 px-4 font-semibold text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((item, idx) => (
                    <tr key={item._id || item.id || idx} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="py-3 px-4 text-gray-400">{idx + 1}</td>
                      <td className="py-3 px-4 font-medium text-gray-900">{item.name}</td>
                      <td className="py-3 px-4 text-gray-500">{item.code || '—'}</td>
                      {(activeTab === 'states' || activeTab === 'cities') && (
                        <td className="py-3 px-4 text-gray-500">{item.country_name || item.country_id || '—'}</td>
                      )}
                      <td className="py-3 px-4 text-right">
                        <button onClick={() => openEdit(item)} className="text-[#0891B2] hover:underline mr-3 text-sm">Edit</button>
                        <button onClick={() => handleDelete(item)} className="text-red-500 hover:underline text-sm">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-bold text-[#0e3a5c] mb-4">
              {editItem ? 'Edit' : 'Add'} {TABS.find(t => t.key === activeTab)?.label.slice(0, -1)}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0891B2] focus:border-transparent text-sm"
                  placeholder="Enter name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Code</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0891B2] focus:border-transparent text-sm"
                  placeholder="Enter code (optional)"
                />
              </div>
              {(activeTab === 'states' || activeTab === 'cities') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                  <select
                    value={formData.country_id}
                    onChange={(e) => setFormData({ ...formData, country_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0891B2] focus:border-transparent text-sm"
                  >
                    <option value="">Select Country</option>
                    {countries.map((c) => (
                      <option key={c._id || c.id} value={c._id || c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 text-sm font-medium text-white bg-[#0891B2] rounded-lg hover:bg-[#0891B2]/90 transition-colors"
              >
                {editItem ? 'Update' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
