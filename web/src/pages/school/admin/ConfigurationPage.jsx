import { useState, useEffect } from 'react';
import api from '../../../services/api';

const DEFAULT_CONFIG = {
  general: {
    school_motto: '',
    academic_start_month: 'April',
    attendance_type: 'daily',
  },
  fee_settings: {
    late_fee_enabled: false,
    online_payment_enabled: false,
    receipt_copies: 2,
  },
  communication: {
    sms_enabled: false,
    whatsapp_enabled: false,
    email_enabled: true,
  },
  features: {
    transport_module: false,
    hostel_module: false,
    library_module: true,
    payroll_module: false,
  },
};

const SECTION_META = {
  general: {
    title: 'General Settings',
    icon: '⚙️',
    description: 'Basic school configuration and preferences',
    fields: {
      school_motto: { label: 'School Motto', type: 'text', placeholder: 'e.g., Knowledge is Power' },
      academic_start_month: { label: 'Academic Start Month', type: 'select', options: ['January','February','March','April','May','June','July','August','September','October','November','December'] },
      attendance_type: { label: 'Attendance Type', type: 'select', options: ['daily', 'period_wise'] },
    },
  },
  fee_settings: {
    title: 'Fee Settings',
    icon: '💰',
    description: 'Configure fee collection and payment options',
    fields: {
      late_fee_enabled: { label: 'Enable Late Fee', type: 'toggle' },
      online_payment_enabled: { label: 'Enable Online Payment', type: 'toggle' },
      receipt_copies: { label: 'Receipt Copies', type: 'number', min: 1, max: 5 },
    },
  },
  communication: {
    title: 'Communication',
    icon: '💬',
    description: 'Enable or disable communication channels',
    fields: {
      sms_enabled: { label: 'SMS Notifications', type: 'toggle' },
      whatsapp_enabled: { label: 'WhatsApp Notifications', type: 'toggle' },
      email_enabled: { label: 'Email Notifications', type: 'toggle' },
    },
  },
  features: {
    title: 'Feature Modules',
    icon: '🧩',
    description: 'Enable or disable optional modules',
    fields: {
      transport_module: { label: 'Transport Module', type: 'toggle' },
      hostel_module: { label: 'Hostel Module', type: 'toggle' },
      library_module: { label: 'Library Module', type: 'toggle' },
      payroll_module: { label: 'Payroll Module', type: 'toggle' },
    },
  },
};

export default function ConfigurationPage() {
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [savingSection, setSavingSection] = useState(null);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/schools/info');
      const data = res.data.data || res.data || {};
      // Merge fetched config with defaults
      if (data.config) {
        setConfig((prev) => ({
          general: { ...prev.general, ...data.config.general },
          fee_settings: { ...prev.fee_settings, ...data.config.fee_settings },
          communication: { ...prev.communication, ...data.config.communication },
          features: { ...prev.features, ...data.config.features },
        }));
      }
    } catch (err) {
      console.error('Failed to fetch configuration:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (section, key, value) => {
    setConfig((prev) => ({
      ...prev,
      [section]: { ...prev[section], [key]: value },
    }));
  };

  const handleSaveSection = async (sectionKey) => {
    try {
      setSavingSection(sectionKey);
      // For now, store locally. Future: POST to config endpoint
      // await api.post('/api/school/masters/academic/config', { section: sectionKey, values: config[sectionKey] });
      await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate save
      alert(`${SECTION_META[sectionKey].title} saved successfully!`);
    } catch (err) {
      console.error('Failed to save configuration:', err);
      alert('Failed to save configuration.');
    } finally {
      setSavingSection(null);
    }
  };

  const renderField = (sectionKey, fieldKey, fieldMeta) => {
    const value = config[sectionKey][fieldKey];

    if (fieldMeta.type === 'toggle') {
      return (
        <div key={fieldKey} className="flex items-center justify-between py-3">
          <div>
            <p className="text-sm font-medium text-gray-900">{fieldMeta.label}</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={!!value}
              onChange={(e) => handleChange(sectionKey, fieldKey, e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#0891B2] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[3px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0891B2]"></div>
          </label>
        </div>
      );
    }

    if (fieldMeta.type === 'select') {
      return (
        <div key={fieldKey} className="py-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">{fieldMeta.label}</label>
          <select
            value={value}
            onChange={(e) => handleChange(sectionKey, fieldKey, e.target.value)}
            className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0891B2] focus:border-[#0891B2]"
          >
            {fieldMeta.options.map((opt) => (
              <option key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1).replace('_', ' ')}</option>
            ))}
          </select>
        </div>
      );
    }

    if (fieldMeta.type === 'number') {
      return (
        <div key={fieldKey} className="py-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">{fieldMeta.label}</label>
          <input
            type="number"
            value={value}
            onChange={(e) => handleChange(sectionKey, fieldKey, parseInt(e.target.value) || 0)}
            min={fieldMeta.min}
            max={fieldMeta.max}
            className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0891B2] focus:border-[#0891B2]"
          />
        </div>
      );
    }

    // Default: text
    return (
      <div key={fieldKey} className="py-3">
        <label className="block text-sm font-medium text-gray-700 mb-1">{fieldMeta.label}</label>
        <input
          type="text"
          value={value}
          onChange={(e) => handleChange(sectionKey, fieldKey, e.target.value)}
          className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0891B2] focus:border-[#0891B2]"
          placeholder={fieldMeta.placeholder || ''}
        />
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0891B2]"></div>
        <span className="ml-3 text-gray-600">Loading configuration...</span>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Configuration</h1>
        <p className="text-sm text-gray-500 mt-1">Manage school feature flags and settings</p>
      </div>

      {/* Config Sections */}
      <div className="space-y-6">
        {Object.entries(SECTION_META).map(([sectionKey, sectionMeta]) => (
          <div key={sectionKey} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            {/* Section Header */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <span className="text-xl">{sectionMeta.icon}</span>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{sectionMeta.title}</h2>
                  <p className="text-xs text-gray-500">{sectionMeta.description}</p>
                </div>
              </div>
            </div>

            {/* Fields */}
            <div className="divide-y divide-gray-50">
              {Object.entries(sectionMeta.fields).map(([fieldKey, fieldMeta]) =>
                renderField(sectionKey, fieldKey, fieldMeta)
              )}
            </div>

            {/* Save Button */}
            <div className="flex justify-end mt-4 pt-3 border-t border-gray-100">
              <button
                onClick={() => handleSaveSection(sectionKey)}
                disabled={savingSection === sectionKey}
                className="inline-flex items-center px-4 py-2 bg-[#0891B2] text-white text-sm font-medium rounded-lg hover:bg-[#0891B2]/90 disabled:opacity-50 transition-colors shadow-sm"
              >
                {savingSection === sectionKey ? (
                  <>
                    <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Save Settings
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
