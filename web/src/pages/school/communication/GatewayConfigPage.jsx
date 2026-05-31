import React, { useState, useEffect, useCallback } from 'react';
import api from '../../../services/api';

const CHANNELS = ['SMS', 'WhatsApp', 'Email'];

const PROVIDERS = {
  SMS: ['MSG91', 'Twilio', 'Gupshup'],
  WhatsApp: ['Gupshup', 'Twilio'],
  Email: ['SMTP', 'SendGrid'],
};

const GatewayConfigPage = () => {
  const [activeTab, setActiveTab] = useState('SMS');
  const [configs, setConfigs] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testRecipient, setTestRecipient] = useState('');
  const [showTestModal, setShowTestModal] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const fetchConfigs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/school/communication-extended/gateway-config');
      if (response.data.success) {
        const configMap = {};
        response.data.data.forEach((cfg) => {
          configMap[cfg.channel] = cfg;
        });
        setConfigs(configMap);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load gateway configurations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const handleConfigChange = (channel, field, value) => {
    setConfigs((prev) => ({
      ...prev,
      [channel]: {
        ...(prev[channel] || { channel, provider: PROVIDERS[channel][0], api_key: '', sender_id: '', daily_limit: 1000, monthly_limit: 30000, is_active: false }),
        [field]: value,
      },
    }));
  };

  const handleSave = async () => {
    const config = configs[activeTab];
    if (!config) return;

    try {
      setSaving(true);
      const response = await api.put('/school/communication-extended/gateway-config', {
        id: config.id,
        provider: config.provider,
        channel: config.channel || activeTab,
        api_key: config.api_key,
        sender_id: config.sender_id,
        daily_limit: config.daily_limit,
        monthly_limit: config.monthly_limit,
        is_active: config.is_active,
      });
      if (response.data.success) {
        setSuccessMessage('Configuration saved successfully!');
        fetchConfigs();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!testRecipient.trim()) return;

    try {
      setTesting(true);
      setTestResult(null);
      const response = await api.post('/school/communication-extended/gateway-config/test', {
        channel: activeTab,
        test_recipient: testRecipient.trim(),
      });
      if (response.data.success) {
        setTestResult({ success: true, message: 'Test message sent successfully!' });
      }
    } catch (err) {
      setTestResult({ success: false, message: err.response?.data?.message || 'Test failed. Please check your configuration.' });
    } finally {
      setTesting(false);
    }
  };

  const currentConfig = configs[activeTab];

  const maskApiKey = (key) => {
    if (!key) return '';
    if (key.length <= 8) return '••••••••';
    return key.substring(0, 4) + '••••••••' + key.substring(key.length - 4);
  };

  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="w-16 h-16 rounded-full bg-cyan-50 flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-gray-800 mb-2">Configure {activeTab}</h3>
      <p className="text-gray-500 text-sm mb-6 text-center max-w-sm">
        No gateway configuration found for {activeTab}. Set up your provider to start sending messages.
      </p>
      <button
        onClick={() => handleConfigChange(activeTab, 'provider', PROVIDERS[activeTab][0])}
        className="px-5 py-2.5 bg-[#0891B2] text-white rounded-lg text-sm font-medium hover:bg-[#0e7490] transition-colors"
      >
        Configure {activeTab} Gateway
      </button>
    </div>
  );

  const renderConfigForm = () => {
    const config = currentConfig || {};

    return (
      <div className="space-y-6">
        {/* Provider */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Provider</label>
          <select
            value={config.provider || PROVIDERS[activeTab][0]}
            onChange={(e) => handleConfigChange(activeTab, 'provider', e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
          >
            {PROVIDERS[activeTab].map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        {/* API Key */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">API Key</label>
          <div className="relative">
            <input
              type={showApiKey ? 'text' : 'password'}
              value={showApiKey ? (config.api_key || '') : maskApiKey(config.api_key || '')}
              onChange={(e) => handleConfigChange(activeTab, 'api_key', e.target.value)}
              placeholder="Enter API key"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent pr-10"
            />
            <button
              type="button"
              onClick={() => setShowApiKey(!showApiKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showApiKey ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Sender ID / From Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            {activeTab === 'Email' ? 'From Name / Email' : 'Sender ID'}
          </label>
          <input
            type="text"
            value={config.sender_id || ''}
            onChange={(e) => handleConfigChange(activeTab, 'sender_id', e.target.value)}
            placeholder={activeTab === 'Email' ? 'noreply@school.com' : 'SCHOOL'}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
          />
        </div>

        {/* Limits */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Daily Limit</label>
            <input
              type="number"
              value={config.daily_limit || ''}
              onChange={(e) => handleConfigChange(activeTab, 'daily_limit', parseInt(e.target.value) || 0)}
              placeholder="1000"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Monthly Limit</label>
            <input
              type="number"
              value={config.monthly_limit || ''}
              onChange={(e) => handleConfigChange(activeTab, 'monthly_limit', parseInt(e.target.value) || 0)}
              placeholder="30000"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Usage Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Sent Today</p>
            <p className="text-2xl font-bold text-[#0e3a5c]">{config.sent_today ?? 0}</p>
            <p className="text-xs text-gray-400 mt-1">of {config.daily_limit || 0} daily limit</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Sent This Month</p>
            <p className="text-2xl font-bold text-[#0e3a5c]">{config.sent_month ?? 0}</p>
            <p className="text-xs text-gray-400 mt-1">of {config.monthly_limit || 0} monthly limit</p>
          </div>
        </div>

        {/* Active Toggle */}
        <div className="flex items-center justify-between py-3 border-t border-gray-100">
          <div>
            <p className="text-sm font-medium text-gray-700">Active Status</p>
            <p className="text-xs text-gray-500">Enable or disable this gateway</p>
          </div>
          <button
            onClick={() => handleConfigChange(activeTab, 'is_active', !config.is_active)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              config.is_active ? 'bg-[#0891B2]' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                config.is_active ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 bg-[#0891B2] text-white rounded-lg text-sm font-medium hover:bg-[#0e7490] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                Saving...
              </span>
            ) : 'Save Config'}
          </button>
          <button
            onClick={() => setShowTestModal(true)}
            className="px-5 py-2.5 border border-[#0891B2] text-[#0891B2] rounded-lg text-sm font-medium hover:bg-cyan-50 transition-colors"
          >
            Test Connection
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#0e3a5c]">Gateway Configuration</h1>
        <p className="text-sm text-gray-500 mt-1">Configure SMS, WhatsApp, and Email gateways for messaging</p>
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

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
          <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700">×</button>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="border-b border-gray-100">
          <div className="flex">
            {CHANNELS.map((channel) => (
              <button
                key={channel}
                onClick={() => { setActiveTab(channel); setShowApiKey(false); }}
                className={`px-6 py-3.5 text-sm font-medium transition-colors relative ${
                  activeTab === channel
                    ? 'text-[#0891B2]'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {channel}
                {activeTab === channel && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0891B2]" />
                )}
                {configs[channel]?.is_active && (
                  <span className="ml-2 inline-block w-2 h-2 rounded-full bg-green-400" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <svg className="animate-spin h-8 w-8 text-[#0891B2]" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          ) : currentConfig ? (
            renderConfigForm()
          ) : (
            renderEmptyState()
          )}
        </div>
      </div>

      {/* Test Connection Modal */}
      {showTestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-semibold text-[#0e3a5c] mb-4">Test {activeTab} Connection</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {activeTab === 'Email' ? 'Test Email Address' : 'Test Phone Number'}
              </label>
              <input
                type={activeTab === 'Email' ? 'email' : 'tel'}
                value={testRecipient}
                onChange={(e) => setTestRecipient(e.target.value)}
                placeholder={activeTab === 'Email' ? 'test@example.com' : '+91XXXXXXXXXX'}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              />
            </div>

            {testResult && (
              <div className={`mb-4 p-3 rounded-lg text-sm ${
                testResult.success ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {testResult.message}
              </div>
            )}

            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={() => { setShowTestModal(false); setTestRecipient(''); setTestResult(null); }}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleTestConnection}
                disabled={testing || !testRecipient.trim()}
                className="px-5 py-2.5 bg-[#0891B2] text-white rounded-lg text-sm font-medium hover:bg-[#0e7490] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {testing ? 'Sending...' : 'Send Test'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GatewayConfigPage;
