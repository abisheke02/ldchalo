import React, { useEffect, useState } from 'react';
import api from '../../services/api';

const inputCls = "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

export default function TransportPage() {
  const [routes, setRoutes]   = useState([]);
  const [students, setStudents] = useState([]);
  const [selected, setSelected] = useState(null);
  const [stops, setStops]     = useState([]);
  const [adding, setAdding]   = useState(false);
  const [form, setForm]       = useState({});

  useEffect(() => {
    api.get('/school/transport/routes').then((r) => setRoutes(r.data)).catch(() => {});
  }, []);

  const loadRoute = (route) => {
    setSelected(route);
    api.get(`/school/transport/routes/${route.id}/stops`).then((r) => setStops(r.data)).catch(() => {});
    api.get(`/school/transport/routes/${route.id}/students`).then((r) => setStudents(r.data)).catch(() => {});
  };

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const saveRoute = async () => {
    try {
      const { data } = await api.post('/school/transport/routes', form);
      setRoutes((p) => [...p, data]);
      setAdding(false);
      setForm({});
    } catch { alert('Failed to add route'); }
  };

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Transport</h1>
        <button onClick={() => setAdding(true)} className="px-4 py-2 bg-[#0891B2] text-white text-sm font-semibold rounded-lg hover:bg-[#0e7490]">
          + Add Route
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Routes',   value: routes.length,                               icon: '🗺️' },
          { label: 'Total Stops',    value: routes.reduce((a, r) => a + (r.stop_count || 0), 0), icon: '📍' },
          { label: 'Students on Bus',value: routes.reduce((a, r) => a + (r.student_count || 0), 0), icon: '👨‍🎓' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-4">
            <span className="text-2xl">{s.icon}</span>
            <div>
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Routes list */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 font-semibold text-gray-900 text-sm">Routes</div>
          {routes.length === 0 ? (
            <p className="text-center text-gray-400 py-10 text-sm">No routes added yet</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {routes.map((r) => (
                <button key={r.id} onClick={() => loadRoute(r)}
                  className={`w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors ${selected?.id === r.id ? 'bg-blue-50 border-r-2 border-r-[#0891B2]' : ''}`}
                >
                  <p className="font-semibold text-gray-900 text-sm">{r.name || r.route_name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{r.stop_count || 0} stops · {r.student_count || 0} students</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Route detail */}
        <div className="lg:col-span-2 space-y-4">
          {selected ? (
            <>
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <h3 className="font-bold text-gray-900 mb-4">📍 Stops — {selected.name}</h3>
                {stops.length === 0
                  ? <p className="text-sm text-gray-400">No stops configured</p>
                  : (
                    <div className="space-y-2">
                      {stops.map((s, i) => (
                        <div key={s.id} className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-[#0891B2] text-white text-xs flex items-center justify-center font-bold shrink-0">{i + 1}</span>
                          <span className="text-sm text-gray-700">{s.name || s.stop_name}</span>
                          {s.pickup_time && <span className="text-xs text-gray-400 ml-auto">{s.pickup_time}</span>}
                        </div>
                      ))}
                    </div>
                  )
                }
              </div>
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <h3 className="font-bold text-gray-900 mb-4">👨‍🎓 Students on this route</h3>
                {students.length === 0
                  ? <p className="text-sm text-gray-400">No students assigned</p>
                  : (
                    <table className="w-full text-sm">
                      <thead><tr className="text-left text-xs text-gray-400 border-b"><th className="pb-2">Name</th><th className="pb-2">Class</th><th className="pb-2">Boarding Stop</th></tr></thead>
                      <tbody className="divide-y divide-gray-50">
                        {students.map((s) => (
                          <tr key={s.id}><td className="py-2 font-medium">{s.name}</td><td className="py-2 text-gray-500">{s.class_grade ? `Grade ${s.class_grade}` : '—'}</td><td className="py-2 text-gray-500">{s.stop_name || '—'}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  )
                }
              </div>
            </>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 text-center text-gray-400">
              <p className="text-3xl mb-3">🚌</p>
              <p>Select a route to view stops and students</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Route Modal */}
      {adding && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Add New Route</h3>
            <input className={inputCls} placeholder="Route name (e.g. Route A — North)" onChange={set('name')} />
            <input className={inputCls} placeholder="Vehicle number (optional)" onChange={set('vehicle_no')} />
            <input className={inputCls} placeholder="Driver name (optional)" onChange={set('driver_name')} />
            <input className={inputCls} placeholder="Driver phone (optional)" onChange={set('driver_phone')} />
            <div className="flex gap-3 justify-end">
              <button onClick={() => setAdding(false)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={saveRoute} className="px-5 py-2 bg-[#0891B2] text-white text-sm font-semibold rounded-lg hover:bg-[#0e7490]">Add Route</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
