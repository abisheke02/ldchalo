import React from 'react';

const inputCls =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0891B2] focus:border-transparent';
const errorInputCls =
  'w-full rounded-lg border border-red-400 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent';

/**
 * FormField — label + input/select/textarea with validation error display.
 *
 * @param {string}   label       - Field label
 * @param {string}   type        - 'text' | 'number' | 'email' | 'select' | 'textarea' | 'date' | 'password'
 * @param {string}   value       - Controlled value
 * @param {Function} onChange    - Change handler (receives event)
 * @param {Array}    options     - For type='select' — [{value, label}]
 * @param {string}   placeholder - Input placeholder
 * @param {boolean}  required    - Show required indicator
 * @param {string}   error       - Error message to display
 * @param {string}   name        - Input name attribute
 * @param {boolean}  disabled    - Disabled state
 */
export default function FormField({
  label,
  type = 'text',
  value,
  onChange,
  options = [],
  placeholder = '',
  required = false,
  error,
  name,
  disabled = false,
}) {
  const cls = error ? errorInputCls : inputCls;

  const renderInput = () => {
    if (type === 'select') {
      return (
        <select
          className={cls}
          value={value || ''}
          onChange={onChange}
          name={name}
          disabled={disabled}
        >
          <option value="">{placeholder || 'Select…'}</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      );
    }

    if (type === 'textarea') {
      return (
        <textarea
          className={`${cls} resize-none`}
          rows={3}
          placeholder={placeholder}
          value={value || ''}
          onChange={onChange}
          name={name}
          disabled={disabled}
        />
      );
    }

    return (
      <input
        type={type}
        className={cls}
        placeholder={placeholder}
        value={value || ''}
        onChange={onChange}
        name={name}
        disabled={disabled}
      />
    );
  };

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      {renderInput()}
      {error && (
        <p className="text-xs text-red-500 mt-0.5">{error}</p>
      )}
    </div>
  );
}
