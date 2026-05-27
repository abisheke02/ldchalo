import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../services/api';

export default function StudentsPage() {
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/students', { params: { search } })
      .then(r => setStudents(r.data))
      .catch(() => toast.error('Failed to load students'))
      .finally(() => setLoading(false));
  }, [search]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Students</h2>
        <span className="text-sm text-gray-500">{students.length} students</span>
      </div>

      <input
        className="w-full max-w-sm border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="Search by name or admission number..."
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      {loading ? (
        <p className="text-center py-10 text-gray-400">Loading...</p>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-primary text-white">
              <tr>
                {['Adm. No', 'Name', 'Class', 'Section', 'Gender', 'Category', 'Status'].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {students.map((s, i) => (
                <tr key={s.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-4 py-2.5 font-mono text-xs">{s.admission_number}</td>
                  <td className="px-4 py-2.5 font-medium">{s.name}</td>
                  <td className="px-4 py-2.5">{s.class_name}</td>
                  <td className="px-4 py-2.5">{s.section}</td>
                  <td className="px-4 py-2.5 capitalize">{s.gender}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-500">{s.category || 'General'}</td>
                  <td className="px-4 py-2.5">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {s.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
              {!students.length && (
                <tr><td colSpan={7} className="text-center py-10 text-gray-400">No students found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
