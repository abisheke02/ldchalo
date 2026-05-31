import React from 'react';

/**
 * FilterBar — horizontal row of filter controls.
 *
 * @param {Array}    filters  - Array of { key, label, type: 'select'|'search'|'date', options?: [{value,label}] }
 * @param {Object}   values   - Current filter values keyed by filter key
 * @param {Function} onChange - Called with (key, newValue) when a filter changes
 */
export default function FilterBar({ filters = [], values = {}, onChange }) {
  const baseCls =
    'rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0891B2] focus:border-transparent';

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-wrap gap-3 items-center">
      {filters.map((filter) => {
        const value = values[filter.key] ?? '';

        if (filter.type === 'search') {
          return (
            <div key={filter.key} className="relative flex-1 min-w-[12rem]">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">
                🔍
              </span>
              <input
                type="text"
                className={`${baseCls} w-full pl-9`}
                placeholder={filter.label || 'Search…'}
                value={value}
                onChange={(e) => onChange(filter.key, e.target.value)}
              />
            </div>
          );
        }

        if (filter.type === 'date') {
          return (
            <input
              key={filter.key}
              type="date"
              className={baseCls}
              value={value}
              onChange={(e) => onChange(filter.key, e.target.value)}
              title={filter.label}
            />
          );
        }

        // Default: select
        return (
          <select
            key={filter.key}
            className={baseCls}
            value={value}
            onChange={(e) => onChange(filter.key, e.target.value)}
          >
            <option value="">{filter.label || 'All'}</option>
            {(filter.options || []).map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        );
      })}
    </div>
  );
}
