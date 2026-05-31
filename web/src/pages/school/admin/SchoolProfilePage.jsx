import { useState, useEffect } from 'react';
import api from '../../../services/api';

export default function SchoolProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    logo_url: '',
    affiliation_no: '',
    board_type: '',
    principal_name: '',
    established_year: '',
  });

  useEffect(() => {
    fetchSchoolInfo();
  }, []);

  const fetchSchoolInfo = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/schools/info');
      const data = res.data.data || res.data || {};
      setForm({
        name: data.name || '',
        address: data.address || '',
        phone: data.phone || '',
        email: data.email || '',
        logo_url: data.logo_url || '',
        affiliation_no: data.affiliation_no || '',
        board_type: data.board_type || '',
        principal_name: data.principal_name || '',
        established_year: data.established_year || '',
      });
    } catch (err) {
      console.error('Failed to fetch school info:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await api.patch('/api/schools/info', form);
      alert('School profile updated successfully!');
    } catch (err) {
      console.error('Failed to update school info:', err);
      alert('Failed to update school profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0891B2]"></div>
        <span className="ml-3 text-gray-600">Loading school profile...</span>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">School Profile</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your school's information and branding</p>
      </div>

      <form onSubmit={handleSave}>
        {/* Logo Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">School Logo</h2>
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50 overflow-hidden">
              {form.logo_url ? (
                <img src={form.logo_url} alt="School Logo" className="w-full h-full object-cover rounded-xl" />
              ) : (
                <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              )}
            </div>
            <div>
              <button
                type="button"
                className="inline-flex items-center px-4 py-2 bg-[#0891B2] text-white text-sm font-medium rounded-lg hover:bg-[#0891B2]/90 transition-colors shadow-sm"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Upload Logo
              </button>
              <p className="text-xs text-gray-500 mt-2">PNG, JPG up to 2MB. Recommended: 200×200px</p>
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Logo URL</label>
            <input
              type="text"
              value={form.logo_url}
              onChange={(e) => handleChange('logo_url', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0891B2] focus:border-[#0891B2]"
              placeholder="https://example.com/logo.png"
            />
          </div>
        </div>

        {/* School Information */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">School Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">School Name *</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0891B2] focus:border-[#0891B2]"
                placeholder="Enter school name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Principal Name</label>
              <input
                type="text"
                value={form.principal_name}
                onChange={(e) => handleChange('principal_name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0891B2] focus:border-[#0891B2]"
                placeholder="Enter principal name"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <textarea
                value={form.address}
                onChange={(e) => handleChange('address', e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0891B2] focus:border-[#0891B2] resize-none"
                placeholder="Full school address"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0891B2] focus:border-[#0891B2]"
                placeholder="+91 98765 43210"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0891B2] focus:border-[#0891B2]"
                placeholder="info@school.edu.in"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Affiliation No.</label>
              <input
                type="text"
                value={form.affiliation_no}
                onChange={(e) => handleChange('affiliation_no', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0891B2] focus:border-[#0891B2]"
                placeholder="e.g., 2130045"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Board Type</label>
              <select
                value={form.board_type}
                onChange={(e) => handleChange('board_type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0891B2] focus:border-[#0891B2]"
              >
                <option value="">Select Board</option>
                <option value="CBSE">CBSE</option>
                <option value="ICSE">ICSE</option>
                <option value="State">State Board</option>
                <option value="IB">IB</option>
                <option value="Cambridge">Cambridge (IGCSE)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Established Year</label>
              <input
                type="number"
                value={form.established_year}
                onChange={(e) => handleChange('established_year', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0891B2] focus:border-[#0891B2]"
                placeholder="e.g., 1995"
                min="1800"
                max="2099"
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center px-6 py-2.5 bg-[#0891B2] text-white text-sm font-medium rounded-lg hover:bg-[#0891B2]/90 disabled:opacity-50 transition-colors shadow-sm"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Save Profile
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
