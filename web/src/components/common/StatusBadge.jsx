import React from 'react';

const DEFAULT_COLOR_MAP = {
  active: 'bg-green-50 text-green-700',
  approved: 'bg-green-50 text-green-700',
  paid: 'bg-green-50 text-green-700',
  completed: 'bg-green-50 text-green-700',
  pending: 'bg-yellow-50 text-yellow-700',
  processing: 'bg-yellow-50 text-yellow-700',
  rejected: 'bg-red-50 text-red-700',
  inactive: 'bg-red-50 text-red-700',
  failed: 'bg-red-50 text-red-700',
  overdue: 'bg-red-50 text-red-700',
  draft: 'bg-gray-100 text-gray-600',
  unknown: 'bg-gray-100 text-gray-600',
};

/**
 * StatusBadge — small rounded pill for status display.
 *
 * @param {string} status   - Status text (also used as key for color lookup)
 * @param {Object} colorMap - Optional custom mapping { status: 'tailwind-classes' }
 */
export default function StatusBadge({ status, colorMap }) {
  if (!status) return null;

  const map = { ...DEFAULT_COLOR_MAP, ...colorMap };
  const key = status.toLowerCase();
  const colorCls = map[key] || 'bg-gray-100 text-gray-600';

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${colorCls}`}
    >
      {status}
    </span>
  );
}
