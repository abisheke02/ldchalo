import React, { useState, useCallback } from 'react';
import DataTable from './DataTable';
import { toast } from 'react-hot-toast';

/**
 * GenericReportPage — renders a filter + table + export report page.
 *
 * Config shape:
 * {
 *   title:      string
 *   subtitle:   string
 *   filters:    [{ key, label, type: 'date'|'select'|'text', options? }]
 *   columns:    [{ key, label, render? }]
 *   fetchFn:    async (filters) => []
 *   exportName: string   — filename for CSV export
 * }
 */
export default function GenericReportPage({ config }) {
  const { title, subtitle, filters: filterDefs = [], columns, fetchFn, exportName } = config;

  const initFilters = () => {
    const f = {};
    filterDefs.forEach(fd => { f[fd.key] = fd.default ?? ''; });
    return f;
  };

  const [filters,  setFilters]  = useState(initFilters);
  const [rows,     setRows]     = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [searched, setSearched] = useState(false);

  const handleFilter = (key, val) => setFilters(prev => ({ ...prev, [key]: val }));

  const runReport = useCallback(async () => {
    setLoading(true);
    setSearched(true);
    try {
      const data = await fetchFn(filters);
      setRows(data || []);
    } catch {
      toast.error('Failed to load report');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [fetchFn, filters]);

  const resetFilters = () => { setFilters(initFilters()); setRows([]); setSearched(false); };

  const exportCSV = () => {
    if (!rows.length) { toast.error('No data to export'); return; }
    const headers = columns.map(c => c.label).join(',');
    const csvRows = rows.map(row =>
      columns.map(c => {
        const val = row[c.key] ?? '';
        return `"${String(val).replace(/"/g, '""')}"`;
      }).join(',')
    );
    const csv   = [headers, ...csvRows].join('\n');
    const blob  = new Blob([csv], { type: 'text/csv' });
    const url   = URL.createObjectURL(blob);
    const a     = document.createElement('a');
    a.href      = url;
    a.download  = `${exportName || title.replace(/\s+/g,'-').toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported to CSV');
  };

  const inputBase = "px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white";

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-xl font-bold text-gray-900">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
      </div>

      {/* Filter card */}
      <div className="bg-white border border-gray-100 rounded-xl p-4 mb-4 shadow-sm">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Filter Options</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filterDefs.map(fd => (
            <div key={fd.key}>
              <label className="block text-xs font-semibold text-gray-600 mb-1">{fd.label}</label>
              {fd.type === 'select' ? (
                <select value={filters[fd.key]} onChange={e => handleFilter(fd.key, e.target.value)} className={`w-full ${inputBase}`}>
                  <option value="">All</option>
                  {(fd.options || []).map(opt => (
                    <option key={typeof opt === 'string' ? opt : opt.value} value={typeof opt === 'string' ? opt : opt.value}>
                      {typeof opt === 'string' ? opt : opt.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type={fd.type || 'text'}
                  value={filters[fd.key]}
                  onChange={e => handleFilter(fd.key, e.target.value)}
                  placeholder={fd.placeholder || `Select ${fd.label}`}
                  className={`w-full ${inputBase}`}
                />
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100">
          <button
            onClick={runReport}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition-colors shadow-sm"
          >
            {loading ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            )}
            {loading ? 'Loading...' : 'Search'}
          </button>

          <button onClick={resetFilters} className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
            Reset
          </button>

          {rows.length > 0 && (
            <button
              onClick={exportCSV}
              className="ml-auto flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 transition-colors shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export CSV
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      {searched && (
        <>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-gray-500">
              {loading ? 'Loading...' : `${rows.length} record${rows.length !== 1 ? 's' : ''} found`}
            </p>
          </div>
          <DataTable
            columns={columns}
            data={rows}
            loading={loading}
            emptyMessage="No records found for the selected filters."
          />
        </>
      )}

      {!searched && !loading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-gray-400">
            <svg className="w-12 h-12 mx-auto mb-3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-sm font-medium">Set filters and click Search to load the report</p>
          </div>
        </div>
      )}
    </div>
  );
}
