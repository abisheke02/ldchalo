import React, { useState, useEffect } from 'react';
import api from '../../../services/api';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function TimeConfigPage() {
  const [blocks, setBlocks] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [weekConfig, setWeekConfig] = useState(
    DAYS.map((day) => ({ day, status: 'working' }))
  );
  const [loading, setLoading] = useState({ blocks: false, periods: false, week: false });
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [editBlock, setEditBlock] = useState(null);
  const [editPeriod, setEditPeriod] = useState(null);
  const [blockForm, setBlockForm] = useState({ name: '', start_time: '', end_time: '', sort_order: 0 });
  const [periodForm, setPeriodForm] = useState({ name: '', block_id: '', start_time: '', end_time: '', is_break: false });

  useEffect(() => {
    fetchBlocks();
    fetchPeriods();
    fetchWeekConfig();
  }, []);

  const fetchBlocks = async () => {
    setLoading((l) => ({ ...l, blocks: true }));
    try {
      const res = await api.get('/api/school/masters/time-config/blocks');
      setBlocks(res.data?.data || res.data || []);
    } catch (err) {
      console.error('Failed to fetch blocks', err);
    } finally {
      setLoading((l) => ({ ...l, blocks: false }));
    }
  };

  const fetchPeriods = async () => {
    setLoading((l) => ({ ...l, periods: true }));
    try {
      const res = await api.get('/api/school/masters/time-config/periods');
      setPeriods(res.data?.data || res.data || []);
    } catch (err) {
      console.error('Failed to fetch periods', err);
    } finally {
      setLoading((l) => ({ ...l, periods: false }));
    }
  };

  const fetchWeekConfig = async () => {
    setLoading((l) => ({ ...l, week: true }));
    try {
      const res = await api.get('/api/school/masters/time-config/week-config');
      const data = res.data?.data || res.data;
      if (Array.isArray(data) && data.length > 0) {
        setWeekConfig(data);
      }
    } catch (err) {
      console.error('Failed to fetch week config', err);
    } finally {
      setLoading((l) => ({ ...l, week: false }));
    }
  };

  // Block CRUD
  const openAddBlock = () => {
    setEditBlock(null);
    setBlockForm({ name: '', start_time: '', end_time: '', sort_order: blocks.length + 1 });
    setShowBlockModal(true);
  };

  const openEditBlock = (block) => {
    setEditBlock(block);
    setBlockForm({
      name: block.name || '',
      start_time: block.start_time || '',
      end_time: block.end_time || '',
      sort_order: block.sort_order || 0,
    });
    setShowBlockModal(true);
  };

  const saveBlock = async () => {
    try {
      if (editBlock) {
        await api.put(`/api/school/masters/time-config/blocks/${editBlock._id || editBlock.id}`, blockForm);
      } else {
        await api.post('/api/school/masters/time-config/blocks', blockForm);
      }
      setShowBlockModal(false);
      fetchBlocks();
    } catch (err) {
      console.error('Save block failed', err);
    }
  };

  const deleteBlock = async (block) => {
    if (!window.confirm(`Delete block "${block.name}"?`)) return;
    try {
      await api.delete(`/api/school/masters/time-config/blocks/${block._id || block.id}`);
      fetchBlocks();
    } catch (err) {
      console.error('Delete block failed', err);
    }
  };

  // Period CRUD
  const openAddPeriod = () => {
    setEditPeriod(null);
    setPeriodForm({ name: '', block_id: '', start_time: '', end_time: '', is_break: false });
    setShowPeriodModal(true);
  };

  const openEditPeriod = (period) => {
    setEditPeriod(period);
    setPeriodForm({
      name: period.name || '',
      block_id: period.block_id || '',
      start_time: period.start_time || '',
      end_time: period.end_time || '',
      is_break: period.is_break || false,
    });
    setShowPeriodModal(true);
  };

  const savePeriod = async () => {
    try {
      if (editPeriod) {
        await api.put(`/api/school/masters/time-config/periods/${editPeriod._id || editPeriod.id}`, periodForm);
      } else {
        await api.post('/api/school/masters/time-config/periods', periodForm);
      }
      setShowPeriodModal(false);
      fetchPeriods();
    } catch (err) {
      console.error('Save period failed', err);
    }
  };

  const deletePeriod = async (period) => {
    if (!window.confirm(`Delete period "${period.name}"?`)) return;
    try {
      await api.delete(`/api/school/masters/time-config/periods/${period._id || period.id}`);
      fetchPeriods();
    } catch (err) {
      console.error('Delete period failed', err);
    }
  };

  // Week config
  const cycleStatus = (idx) => {
    const statusCycle = ['working', 'half-day', 'off'];
    setWeekConfig((prev) => {
      const updated = [...prev];
      const current = statusCycle.indexOf(updated[idx].status);
      updated[idx] = { ...updated[idx], status: statusCycle[(current + 1) % 3] };
      return updated;
    });
  };

  const saveWeekConfig = async () => {
    try {
      await api.post('/api/school/masters/time-config/week-config', { days: weekConfig });
    } catch (err) {
      console.error('Save week config failed', err);
    }
  };

  const statusColors = {
    working: 'bg-green-100 text-green-700 border-green-300',
    'half-day': 'bg-yellow-100 text-yellow-700 border-yellow-300',
    off: 'bg-red-100 text-red-700 border-red-300',
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#0e3a5c]">Time Configuration</h1>
        <p className="text-sm text-gray-500 mt-1">Manage time blocks, periods, and weekly schedule</p>
      </div>

      {/* Time Blocks */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[#0e3a5c]">⏰ Time Blocks</h2>
          <button
            onClick={openAddBlock}
            className="px-4 py-2 bg-[#0891B2] text-white text-sm font-medium rounded-lg hover:bg-[#0891B2]/90 transition-colors"
          >
            + Add Block
          </button>
        </div>

        {loading.blocks ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0891B2]"></div>
          </div>
        ) : blocks.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <p>No time blocks configured</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">Order</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">Name</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">Start Time</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">End Time</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {blocks.map((block) => (
                  <tr key={block._id || block.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="py-3 px-4 text-gray-400">{block.sort_order}</td>
                    <td className="py-3 px-4 font-medium text-gray-900">{block.name}</td>
                    <td className="py-3 px-4 text-gray-600">{block.start_time}</td>
                    <td className="py-3 px-4 text-gray-600">{block.end_time}</td>
                    <td className="py-3 px-4 text-right">
                      <button onClick={() => openEditBlock(block)} className="text-[#0891B2] hover:underline mr-3 text-sm">Edit</button>
                      <button onClick={() => deleteBlock(block)} className="text-red-500 hover:underline text-sm">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Periods */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[#0e3a5c]">📚 Periods</h2>
          <button
            onClick={openAddPeriod}
            className="px-4 py-2 bg-[#0891B2] text-white text-sm font-medium rounded-lg hover:bg-[#0891B2]/90 transition-colors"
          >
            + Add Period
          </button>
        </div>

        {loading.periods ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0891B2]"></div>
          </div>
        ) : periods.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <p>No periods configured</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">Name</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">Block</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">Start</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">End</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">Break?</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {periods.map((period) => (
                  <tr key={period._id || period.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="py-3 px-4 font-medium text-gray-900">{period.name}</td>
                    <td className="py-3 px-4 text-gray-600">{period.block_name || period.block_id || '—'}</td>
                    <td className="py-3 px-4 text-gray-600">{period.start_time}</td>
                    <td className="py-3 px-4 text-gray-600">{period.end_time}</td>
                    <td className="py-3 px-4">
                      {period.is_break ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">Break</span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Class</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button onClick={() => openEditPeriod(period)} className="text-[#0891B2] hover:underline mr-3 text-sm">Edit</button>
                      <button onClick={() => deletePeriod(period)} className="text-red-500 hover:underline text-sm">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Week Configuration */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[#0e3a5c]">📅 Week Configuration</h2>
          <button
            onClick={saveWeekConfig}
            className="px-4 py-2 bg-[#0891B2] text-white text-sm font-medium rounded-lg hover:bg-[#0891B2]/90 transition-colors"
          >
            Save Week Config
          </button>
        </div>
        <p className="text-sm text-gray-500 mb-4">Click each day to cycle through: Working → Half-day → Off</p>

        {loading.week ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0891B2]"></div>
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-3">
            {weekConfig.map((dayConf, idx) => (
              <button
                key={dayConf.day}
                onClick={() => cycleStatus(idx)}
                className={`p-4 rounded-lg border-2 text-center transition-all cursor-pointer hover:scale-105 ${statusColors[dayConf.status] || 'bg-gray-100 text-gray-600 border-gray-300'}`}
              >
                <p className="text-sm font-bold">{dayConf.day.slice(0, 3)}</p>
                <p className="text-xs mt-1 capitalize">{dayConf.status}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Block Modal */}
      {showBlockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-bold text-[#0e3a5c] mb-4">
              {editBlock ? 'Edit' : 'Add'} Time Block
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={blockForm.name}
                  onChange={(e) => setBlockForm({ ...blockForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0891B2] focus:border-transparent text-sm"
                  placeholder="e.g. Morning Block"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                  <input
                    type="time"
                    value={blockForm.start_time}
                    onChange={(e) => setBlockForm({ ...blockForm, start_time: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0891B2] focus:border-transparent text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                  <input
                    type="time"
                    value={blockForm.end_time}
                    onChange={(e) => setBlockForm({ ...blockForm, end_time: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0891B2] focus:border-transparent text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
                <input
                  type="number"
                  value={blockForm.sort_order}
                  onChange={(e) => setBlockForm({ ...blockForm, sort_order: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0891B2] focus:border-transparent text-sm"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowBlockModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveBlock}
                className="px-4 py-2 text-sm font-medium text-white bg-[#0891B2] rounded-lg hover:bg-[#0891B2]/90 transition-colors"
              >
                {editBlock ? 'Update' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Period Modal */}
      {showPeriodModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-bold text-[#0e3a5c] mb-4">
              {editPeriod ? 'Edit' : 'Add'} Period
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={periodForm.name}
                  onChange={(e) => setPeriodForm({ ...periodForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0891B2] focus:border-transparent text-sm"
                  placeholder="e.g. Period 1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Block</label>
                <select
                  value={periodForm.block_id}
                  onChange={(e) => setPeriodForm({ ...periodForm, block_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0891B2] focus:border-transparent text-sm"
                >
                  <option value="">Select Block</option>
                  {blocks.map((b) => (
                    <option key={b._id || b.id} value={b._id || b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                  <input
                    type="time"
                    value={periodForm.start_time}
                    onChange={(e) => setPeriodForm({ ...periodForm, start_time: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0891B2] focus:border-transparent text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                  <input
                    type="time"
                    value={periodForm.end_time}
                    onChange={(e) => setPeriodForm({ ...periodForm, end_time: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0891B2] focus:border-transparent text-sm"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_break"
                  checked={periodForm.is_break}
                  onChange={(e) => setPeriodForm({ ...periodForm, is_break: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-[#0891B2] focus:ring-[#0891B2]"
                />
                <label htmlFor="is_break" className="text-sm text-gray-700">This is a break period</label>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowPeriodModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={savePeriod}
                className="px-4 py-2 text-sm font-medium text-white bg-[#0891B2] rounded-lg hover:bg-[#0891B2]/90 transition-colors"
              >
                {editPeriod ? 'Update' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
