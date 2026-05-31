import React from 'react';

/**
 * DataTable — responsive table with loading skeleton, empty state, and optional pagination.
 *
 * @param {Array}    columns      - Array of { key, label, render? }
 * @param {Array}    data         - Array of row objects
 * @param {boolean}  loading      - Show loading skeleton
 * @param {string}   emptyMessage - Text shown when data is empty
 * @param {Function} onRowClick   - Optional row click handler (receives row object)
 * @param {Object}   pagination   - Optional { page, total, pageSize?, onPageChange }
 */
export default function DataTable({
  columns = [],
  data = [],
  loading = false,
  emptyMessage = 'No data found',
  onRowClick,
  pagination,
}) {
  const pageSize = pagination?.pageSize || 20;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="text-left px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              /* Loading skeleton — 5 rows */
              Array.from({ length: 5 }).map((_, rowIdx) => (
                <tr key={`skel-${rowIdx}`}>
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3">
                      <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="text-center py-12 text-gray-400"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, rowIdx) => (
                <tr
                  key={row.id || rowIdx}
                  className={`hover:bg-gray-50 transition-colors ${
                    onRowClick ? 'cursor-pointer' : ''
                  }`}
                  onClick={() => onRowClick && onRowClick(row)}
                >
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3 text-gray-700">
                      {col.render ? col.render(row[col.key], row) : row[col.key] ?? '—'}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && pagination.total > pageSize && (
        <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
          <p className="text-xs text-gray-500">
            Showing {pagination.page * pageSize + 1}–
            {Math.min((pagination.page + 1) * pageSize, pagination.total)} of{' '}
            {pagination.total}
          </p>
          <div className="flex gap-2">
            <button
              disabled={pagination.page === 0}
              onClick={() => pagination.onPageChange(pagination.page - 1)}
              className="text-xs px-3 py-1.5 rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-50"
            >
              ← Prev
            </button>
            <button
              disabled={(pagination.page + 1) * pageSize >= pagination.total}
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              className="text-xs px-3 py-1.5 rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-50"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
