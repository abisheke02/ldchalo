import React, { useState, useEffect, useCallback } from 'react';
import api from '../../../services/api';

const CHANNELS = ['SMS', 'WhatsApp', 'Email'];

const RECIPIENT_TYPES = [
  { value: 'all_parents', label: 'All Parents' },
  { value: 'class_wise', label: 'Class-wise' },
  { value: 'section_wise', label: 'Section-wise' },
  { value: 'custom', label: 'Custom List' },
];

const SendMessagePage = () => {
  const [mode, setMode] = useState('individual');
  const [channel, setChannel] = useState('SMS');
  const [templates, setTemplates] = useState([]);
  const [recentMessages, setRecentMessages] = useState([]);
  const [loadingRecent, setLoadingRecent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Individual mode state
  const [recipient, setRecipient] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [subject, setSubject] = useState('');

  // Bulk mode state
  const [recipientType, setRecipientType] = useState('all_parents');
  const [classId, setClassId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [customList, setCustomList] = useState('');
  const [bulkTemplate, setBulkTemplate] = useState('');
  const [scheduleMode, setScheduleMode] = useState('now');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [recipientCount, setRecipientCount] = useState(null);

  const fetchTemplates = useCallback(async () => {
    try {
      const response = await api.get('/school/communication-extended/templates', {
        params: { channel, is_active: true },
      });
      if (response.data.success) {
        setTemplates(response.data.data);
      }
    } catch (err) {
      // Silently handle - templates are optional for individual
    }
  }, [channel]);

  const fetchRecentMessages = useCallback(async () => {
    try {
      setLoadingRecent(true);
      const response = await api.get('/school/communication-extended/log', {
        params: { page: 1, limit: 10 },
      });
      if (response.data.success) {
        setRecentMessages(response.data.data);
      }
    } catch (err) {
      // Silently handle
    } finally {
      setLoadingRecent(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  useEffect(() => {
    fetchRecentMessages();
  }, [fetchRecentMessages]);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    setSelectedTemplate('');
    setBulkTemplate('');
    setCustomMessage('');
    setSubject('');
  }, [channel]);

  const handleStudentSearch = async (query) => {
    setStudentSearch(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      const response = await api.get('/school/students', { params: { search: query, limit: 5 } });
      if (response.data.success) {
        setSearchResults(response.data.data);
      }
    } catch (err) {
      setSearchResults([]);
    }
  };

  const selectStudent = (student) => {
    const contact = channel === 'Email' ? student.parent_email : student.parent_phone;
    setRecipient(contact || '');
    setStudentSearch(student.name);
    setSearchResults([]);
  };

  const handleTemplateSelect = (templateId, isBulk = false) => {
    if (isBulk) {
      setBulkTemplate(templateId);
    } else {
      setSelectedTemplate(templateId);
      const template = templates.find((t) => t.id === templateId);
      if (template) {
        setCustomMessage(template.message_body);
        if (template.subject) setSubject(template.subject);
      }
    }
  };

  const handleSendIndividual = async () => {
    if (!recipient.trim() || (!customMessage.trim() && !selectedTemplate)) return;

    try {
      setSending(true);
      setError(null);
      const body = {
        channel,
        recipient: recipient.trim(),
        message: customMessage,
        template_id: selectedTemplate || undefined,
      };
      if (channel === 'Email' && subject) {
        body.subject = subject;
      }
      const response = await api.post('/school/communication-extended/send', body);
      if (response.data.success) {
        setSuccessMessage('Message sent successfully!');
        setRecipient('');
        setCustomMessage('');
        setSubject('');
        setSelectedTemplate('');
        setStudentSearch('');
        fetchRecentMessages();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleSendBulk = async () => {
    setShowConfirmModal(false);

    try {
      setSending(true);
      setError(null);
      const body = {
        channel,
        recipients_type: recipientType,
        template_id: bulkTemplate,
      };
      if (recipientType === 'class_wise') body.class_id = classId;
      if (recipientType === 'section_wise') body.section_id = sectionId;
      if (recipientType === 'custom') body.custom_list = customList;
      if (scheduleMode === 'later' && scheduleDate && scheduleTime) {
        body.schedule_at = `${scheduleDate}T${scheduleTime}`;
      }

      const response = await api.post('/school/communication-extended/send-bulk', body);
      if (response.data.success) {
        setSuccessMessage(
          scheduleMode === 'later'
            ? 'Bulk message scheduled successfully!'
            : 'Bulk message sent successfully!'
        );
        setBulkTemplate('');
        setCustomList('');
        setScheduleDate('');
        setScheduleTime('');
        fetchRecentMessages();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send bulk message');
    } finally {
      setSending(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      sent: 'bg-blue-50 text-blue-700',
      delivered: 'bg-green-50 text-green-700',
      failed: 'bg-red-50 text-red-700',
      pending: 'bg-yellow-50 text-yellow-700',
      scheduled: 'bg-purple-50 text-purple-700',
    };
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-50 text-gray-600'}`}>
        {status?.charAt(0).toUpperCase() + status?.slice(1)}
      </span>
    );
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#0e3a5c]">Send Message</h1>
        <p className="text-sm text-gray-500 mt-1">Send individual or bulk messages via SMS, WhatsApp, or Email</p>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          {successMessage}
        </div>
      )}

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

      {/* Mode Toggle */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-4">
        <div className="flex items-center gap-4 mb-5">
          <div className="inline-flex rounded-lg border border-gray-200 p-1">
            <button
              onClick={() => setMode('individual')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                mode === 'individual' ? 'bg-[#0891B2] text-white' : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Individual
            </button>
            <button
              onClick={() => setMode('bulk')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                mode === 'bulk' ? 'bg-[#0891B2] text-white' : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Bulk
            </button>
          </div>
        </div>

        {/* Channel Selector */}
        <div className="mb-5">
          <label className="block text-sm font-medium text-gray-700 mb-2">Channel</label>
          <div className="flex gap-3">
            {CHANNELS.map((ch) => (
              <button
                key={ch}
                onClick={() => setChannel(ch)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
                  channel === ch
                    ? 'bg-[#0891B2] text-white border-[#0891B2]'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                }`}
              >
                {ch}
              </button>
            ))}
          </div>
        </div>

        {/* Individual Mode */}
        {mode === 'individual' && (
          <div className="space-y-4">
            {/* Recipient */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Recipient</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <input
                    type={channel === 'Email' ? 'email' : 'tel'}
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    placeholder={channel === 'Email' ? 'parent@email.com' : '+91XXXXXXXXXX'}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  />
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={studentSearch}
                    onChange={(e) => handleStudentSearch(e.target.value)}
                    placeholder="Or search student name..."
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  />
                  {searchResults.length > 0 && (
                    <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                      {searchResults.map((student) => (
                        <button
                          key={student.id}
                          onClick={() => selectStudent(student)}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-b-0"
                        >
                          <p className="font-medium text-gray-800">{student.name}</p>
                          <p className="text-xs text-gray-500">{student.class_name} • {channel === 'Email' ? student.parent_email : student.parent_phone}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Template Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Template (optional)</label>
              <select
                value={selectedTemplate}
                onChange={(e) => handleTemplateSelect(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              >
                <option value="">Custom message</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>{t.template_name}</option>
                ))}
              </select>
            </div>

            {/* Subject (Email) */}
            {channel === 'Email' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Subject</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Email subject"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                />
              </div>
            )}

            {/* Message */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Message</label>
              <textarea
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="Type your message here..."
                rows={4}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent resize-none"
              />
            </div>

            {/* Send Button */}
            <button
              onClick={handleSendIndividual}
              disabled={sending || !recipient.trim() || (!customMessage.trim() && !selectedTemplate)}
              className="px-6 py-2.5 bg-[#0891B2] text-white rounded-lg text-sm font-medium hover:bg-[#0e7490] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {sending ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  Sending...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  Send
                </>
              )}
            </button>
          </div>
        )}

        {/* Bulk Mode */}
        {mode === 'bulk' && (
          <div className="space-y-4">
            {/* Recipient Group */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Recipient Group</label>
              <select
                value={recipientType}
                onChange={(e) => setRecipientType(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              >
                {RECIPIENT_TYPES.map((rt) => (
                  <option key={rt.value} value={rt.value}>{rt.label}</option>
                ))}
              </select>
            </div>

            {/* Class Dropdown */}
            {recipientType === 'class_wise' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Select Class</label>
                <input
                  type="text"
                  value={classId}
                  onChange={(e) => setClassId(e.target.value)}
                  placeholder="Enter class ID or select"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                />
              </div>
            )}

            {/* Section Dropdown */}
            {recipientType === 'section_wise' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Select Section</label>
                <input
                  type="text"
                  value={sectionId}
                  onChange={(e) => setSectionId(e.target.value)}
                  placeholder="Enter section ID or select"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                />
              </div>
            )}

            {/* Custom List */}
            {recipientType === 'custom' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {channel === 'Email' ? 'Email Addresses' : 'Phone Numbers'} (comma-separated)
                </label>
                <textarea
                  value={customList}
                  onChange={(e) => setCustomList(e.target.value)}
                  placeholder={channel === 'Email' ? 'parent1@email.com, parent2@email.com' : '+919876543210, +919876543211'}
                  rows={3}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent resize-none"
                />
                {customList && (
                  <p className="text-xs text-gray-500 mt-1">
                    {customList.split(',').filter((i) => i.trim()).length} recipients entered
                  </p>
                )}
              </div>
            )}

            {/* Template Selector (Required) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Template <span className="text-red-500">*</span></label>
              <select
                value={bulkTemplate}
                onChange={(e) => handleTemplateSelect(e.target.value, true)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              >
                <option value="">Select a template</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>{t.template_name}</option>
                ))}
              </select>
            </div>

            {/* Schedule Toggle */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Schedule</label>
              <div className="flex gap-3 mb-3">
                <button
                  onClick={() => setScheduleMode('now')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    scheduleMode === 'now'
                      ? 'bg-[#0891B2] text-white border-[#0891B2]'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  Send Now
                </button>
                <button
                  onClick={() => setScheduleMode('later')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    scheduleMode === 'later'
                      ? 'bg-[#0891B2] text-white border-[#0891B2]'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  Schedule for Later
                </button>
              </div>
              {scheduleMode === 'later' && (
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="date"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  />
                  <input
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  />
                </div>
              )}
            </div>

            {/* Recipient Count Preview */}
            {recipientType === 'custom' && customList && (
              <div className="bg-cyan-50 rounded-lg p-3 border border-cyan-100">
                <p className="text-sm text-cyan-800">
                  This will send to <span className="font-bold">{customList.split(',').filter((i) => i.trim()).length}</span> recipients
                </p>
              </div>
            )}

            {/* Send Button */}
            <button
              onClick={() => setShowConfirmModal(true)}
              disabled={sending || !bulkTemplate}
              className="px-6 py-2.5 bg-[#0891B2] text-white rounded-lg text-sm font-medium hover:bg-[#0e7490] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {sending ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  Sending...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  {recipientType === 'custom' && customList
                    ? `Send to ${customList.split(',').filter((i) => i.trim()).length} recipients`
                    : 'Send to recipients'}
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Recent Messages */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mt-4">
        <h2 className="text-base font-semibold text-[#0e3a5c] mb-4">Recent Messages</h2>
        {loadingRecent ? (
          <div className="flex items-center justify-center py-8">
            <svg className="animate-spin h-6 w-6 text-[#0891B2]" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : recentMessages.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-gray-500">No recent messages</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentMessages.map((msg) => (
              <div
                key={msg.id}
                className="flex items-center justify-between py-3 px-4 rounded-lg hover:bg-gray-50 transition-colors border border-gray-50"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                    msg.channel === 'SMS' ? 'bg-blue-50 text-blue-600'
                      : msg.channel === 'WhatsApp' ? 'bg-green-50 text-green-600'
                      : 'bg-purple-50 text-purple-600'
                  }`}>
                    {msg.channel?.charAt(0)}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{msg.recipient}</p>
                    <p className="text-xs text-gray-500 truncate">{msg.message?.substring(0, 60)}...</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                  {getStatusBadge(msg.status)}
                  <span className="text-xs text-gray-400">{msg.sent_at ? new Date(msg.sent_at).toLocaleString() : ''}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bulk Confirm Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center">
                <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[#0e3a5c]">Confirm Bulk Send</h3>
                <p className="text-sm text-gray-500">This action cannot be undone</p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-5 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Channel:</span>
                <span className="font-medium text-gray-800">{channel}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Recipients:</span>
                <span className="font-medium text-gray-800">
                  {recipientType === 'custom' && customList
                    ? `${customList.split(',').filter((i) => i.trim()).length} contacts`
                    : RECIPIENT_TYPES.find((rt) => rt.value === recipientType)?.label}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Schedule:</span>
                <span className="font-medium text-gray-800">
                  {scheduleMode === 'now' ? 'Send immediately' : `${scheduleDate} at ${scheduleTime}`}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2.5 text-sm text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSendBulk}
                disabled={sending}
                className="px-5 py-2.5 bg-[#0891B2] text-white rounded-lg text-sm font-medium hover:bg-[#0e7490] transition-colors disabled:opacity-50"
              >
                {sending ? 'Sending...' : 'Confirm & Send'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SendMessagePage;
