import React, { useState, useEffect, useCallback } from 'react';
import api from '../../../services/api';

const CHANNELS = ['SMS', 'WhatsApp', 'Email'];

const TRIGGER_EVENTS = [
  { value: 'absent_marked', label: 'Absent Marked' },
  { value: 'fee_due', label: 'Fee Due' },
  { value: 'fee_received', label: 'Fee Received' },
  { value: 'exam_result', label: 'Exam Result' },
  { value: 'admission_confirm', label: 'Admission Confirmation' },
  { value: 'custom', label: 'Custom' },
];

const VARIABLES = [
  { key: '{{student_name}}', label: 'Student Name' },
  { key: '{{parent_name}}', label: 'Parent Name' },
  { key: '{{class_name}}', label: 'Class Name' },
  { key: '{{amount}}', label: 'Amount' },
  { key: '{{date}}', label: 'Date' },
  { key: '{{school_name}}', label: 'School Name' },
];

const TemplatesPage = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterChannel, setFilterChannel] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [formData, setFormData] = useState({
    template_name: '',
    channel: 'SMS',
    trigger_event: 'custom',
    subject: '',
    message_body: '',
    is_active: true,
  });

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {};
      if (filterChannel) params.channel = filterChannel;
      const response = await api.get('/school/communication-extended/templates', { params });
      if (response.data.success) {
        setTemplates(response.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  }, [filterChannel]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const resetForm = () => {
    setFormData({
      template_name: '',
      channel: 'SMS',
      trigger_event: 'custom',
      subject: '',
      message_body: '',
      is_active: true,
    });
    setEditingTemplate(null);
  };

  const openAddModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (template) => {
    setEditingTemplate(template);
    setFormData({
      template_name: template.template_name,
      channel: template.channel,
      trigger_event: template.trigger_event,
      subject: template.subject || '',
      message_body: template.message_body,
      is_active: template.is_active,
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this template?')) return;
    try {
      setDeleting(id);
      const response = await api.delete(`/school/communication-extended/templates/${id}`);
      if (response.data.success) {
        fetchTemplates();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete template');
    } finally {
      setDeleting(null);
    }
  };

  const handleSave = async () => {
    if (!formData.template_name.trim() || !formData.message_body.trim()) return;

    try {
      setSaving(true);
      if (editingTemplate) {
        await api.put(`/school/communication-extended/templates/${editingTemplate.id}`, formData);
      } else {
        await api.post('/school/communication-extended/templates', formData);
      }
      setShowModal(false);
      resetForm();
      fetchTemplates();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const insertVariable = (variable) => {
    setFormData((prev) => ({
      ...prev,
      message_body: prev.message_body + variable,
    }));
  };

  const renderPreview = () => {
    let preview = formData.message_body;
    const sampleData = {
      '{{student_name}}': 'John Doe',
      '{{parent_name}}': 'Jane Doe',
      '{{class_name}}': 'Class 10-A',
      '{{amount}}': '₹5,000',
      '{{date}}': '30 May 2026',
      '{{school_name}}': 'ABC School',
    };
    Object.entries(sampleData).forEach(([key, value]) => {
      preview = preview.replaceAll(key, value);
    });
    return preview;
  };

  const getChannelBadge = (channel) => {
    const colors = {
      SMS: 'bg-blue-50 text-blue-700',
      WhatsApp: 'bg-green-50 text-green-700',
      Email: 'bg-purple-50 text-purple-700',
    };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[channel] || 'bg-gray-50 text-gray-700'}`}>
        {channel}
      </span>
    );
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#0e3a5c]">Message Templates</h1>
          <p className="text-sm text-gray-500 mt-1">Manage templates for SMS, WhatsApp, and Email communications</p>
        </div>
        <button
          onClick={openAddModal}
          className="px-5 py-2.5 bg-[#0891B2] text-white rounded-lg text-sm font-medium hover:bg-[#0e7490] transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Template
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
          <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700">×</button>
        </div>
      )}

      {/* Filter */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-4">
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">Filter by channel:</span>
          <div className="flex gap-2">
            <button
              onClick={() => setFilterChannel('')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                !filterChannel ? 'bg-[#0891B2] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            {CHANNELS.map((ch) => (
              <button
                key={ch}
                onClick={() => setFilterChannel(ch)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  filterChannel === ch ? 'bg-[#0891B2] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {ch}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <svg className="animate-spin h-8 w-8 text-[#0891B2]" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : templates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 rounded-full bg-cyan-50 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">No Templates Found</h3>
            <p className="text-gray-500 text-sm mb-6">Create your first message template to get started.</p>
            <button
              onClick={openAddModal}
              className="px-5 py-2.5 bg-[#0891B2] text-white rounded-lg text-sm font-medium hover:bg-[#0e7490] transition-colors"
            >
              Add Template
            </button>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Template Name</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Channel</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Trigger Event</th>
                <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {templates.map((template) => (
                <tr key={template.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-4">
                    <p className="text-sm font-medium text-gray-800">{template.template_name}</p>
                  </td>
                  <td className="px-5 py-4">
                    {getChannelBadge(template.channel)}
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-sm text-gray-600">
                      {TRIGGER_EVENTS.find((t) => t.value === template.trigger_event)?.label || template.trigger_event}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      template.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {template.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEditModal(template)}
                        className="p-1.5 text-gray-400 hover:text-[#0891B2] transition-colors rounded-md hover:bg-cyan-50"
                        title="Edit"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(template.id)}
                        disabled={deleting === template.id}
                        className="p-1.5 text-gray-400 hover:text-red-600 transition-colors rounded-md hover:bg-red-50 disabled:opacity-50"
                        title="Delete"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 overflow-y-auto py-8">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 rounded-t-xl">
              <h3 className="text-lg font-semibold text-[#0e3a5c]">
                {editingTemplate ? 'Edit Template' : 'Add Template'}
              </h3>
            </div>

            <div className="p-6 space-y-5">
              {/* Template Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Template Name</label>
                <input
                  type="text"
                  value={formData.template_name}
                  onChange={(e) => setFormData({ ...formData, template_name: e.target.value })}
                  placeholder="e.g., Absence Notification"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                />
              </div>

              {/* Channel */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Channel</label>
                <div className="flex gap-3">
                  {CHANNELS.map((ch) => (
                    <label key={ch} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="channel"
                        value={ch}
                        checked={formData.channel === ch}
                        onChange={(e) => setFormData({ ...formData, channel: e.target.value })}
                        className="text-[#0891B2] focus:ring-cyan-500"
                      />
                      <span className="text-sm text-gray-700">{ch}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Trigger Event */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Trigger Event</label>
                <select
                  value={formData.trigger_event}
                  onChange={(e) => setFormData({ ...formData, trigger_event: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                >
                  {TRIGGER_EVENTS.map((evt) => (
                    <option key={evt.value} value={evt.value}>{evt.label}</option>
                  ))}
                </select>
              </div>

              {/* Subject (Email only) */}
              {formData.channel === 'Email' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Subject Line</label>
                  <input
                    type="text"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    placeholder="e.g., Attendance Alert for {{student_name}}"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  />
                </div>
              )}

              {/* Message Body */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Message Body</label>
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {VARIABLES.map((v) => (
                    <button
                      key={v.key}
                      type="button"
                      onClick={() => insertVariable(v.key)}
                      className="px-2 py-1 bg-cyan-50 text-cyan-700 rounded text-xs font-medium hover:bg-cyan-100 transition-colors"
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
                <textarea
                  value={formData.message_body}
                  onChange={(e) => setFormData({ ...formData, message_body: e.target.value })}
                  placeholder="Type your message here. Use variable buttons above to insert dynamic content."
                  rows={5}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent resize-none"
                />
              </div>

              {/* Preview */}
              {formData.message_body && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Preview</label>
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{renderPreview()}</p>
                  </div>
                </div>
              )}

              {/* Active Toggle */}
              <div className="flex items-center justify-between py-3 border-t border-gray-100">
                <div>
                  <p className="text-sm font-medium text-gray-700">Active</p>
                  <p className="text-xs text-gray-500">Enable this template for automatic triggers</p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    formData.is_active ? 'bg-[#0891B2]' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      formData.is_active ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 rounded-b-xl flex items-center justify-end gap-3">
              <button
                onClick={() => { setShowModal(false); resetForm(); }}
                className="px-4 py-2.5 text-sm text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !formData.template_name.trim() || !formData.message_body.trim()}
                className="px-5 py-2.5 bg-[#0891B2] text-white rounded-lg text-sm font-medium hover:bg-[#0e7490] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : editingTemplate ? 'Update Template' : 'Create Template'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TemplatesPage;
