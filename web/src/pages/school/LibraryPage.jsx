import React, { useEffect, useState } from 'react';
import api from '../../services/api';

const inputCls = "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
const Tab = ({ id, label, icon, active, onClick }) => (
  <button onClick={() => onClick(id)} className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${active ? 'border-[#0891B2] text-[#0891B2]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
    <span>{icon}</span>{label}
  </button>
);

function Books() {
  const [books, setBooks] = useState([]);
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);
  const [form, setForm]     = useState({});
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  useEffect(() => {
    api.get('/school/library/books', { params: search ? { search } : {} }).then((r) => setBooks(r.data)).catch(() => {});
  }, [search]);

  const save = async () => {
    try {
      const { data } = await api.post('/school/library/books', form);
      setBooks((p) => [data, ...p]);
      setAdding(false); setForm({});
    } catch { alert('Failed'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-3 justify-between items-center">
        <input className="flex-1 max-w-sm rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="🔍 Search books…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <button onClick={() => setAdding(true)} className="px-4 py-2 bg-[#0891B2] text-white text-sm font-semibold rounded-lg hover:bg-[#0e7490]">
          + Add Book
        </button>
      </div>

      <table className="w-full text-sm bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <thead><tr className="bg-gray-50 border-b text-xs text-gray-500 uppercase">
          <th className="px-4 py-3 text-left">Title</th><th className="px-4 py-3 text-left">Author</th><th className="px-4 py-3 text-left">Subject</th><th className="px-4 py-3 text-left">Total</th><th className="px-4 py-3 text-left">Available</th><th className="px-4 py-3 text-left">ISBN</th>
        </tr></thead>
        <tbody className="divide-y divide-gray-50">
          {books.length === 0
            ? <tr><td colSpan={6} className="text-center py-10 text-gray-400">No books found</td></tr>
            : books.map((b) => (
              <tr key={b.id} className="hover:bg-blue-50/30">
                <td className="px-4 py-3 font-medium text-gray-900">{b.title}</td>
                <td className="px-4 py-3 text-gray-600">{b.author}</td>
                <td className="px-4 py-3 text-gray-600">{b.subject_name || b.subject || '—'}</td>
                <td className="px-4 py-3 text-gray-600">{b.total_copies}</td>
                <td className="px-4 py-3">
                  <span className={`font-semibold ${b.available_copies > 0 ? 'text-green-600' : 'text-red-600'}`}>{b.available_copies}</span>
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs">{b.isbn || '—'}</td>
              </tr>
            ))
          }
        </tbody>
      </table>

      {adding && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-lg font-bold">Add Book</h3>
            <input className={inputCls} placeholder="Book title *" onChange={set('title')} />
            <input className={inputCls} placeholder="Author" onChange={set('author')} />
            <input className={inputCls} placeholder="ISBN" onChange={set('isbn')} />
            <input className={inputCls} type="number" placeholder="Total copies" onChange={set('total_copies')} />
            <div className="flex gap-3 justify-end">
              <button onClick={() => setAdding(false)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700">Cancel</button>
              <button onClick={save} className="px-5 py-2 bg-[#0891B2] text-white text-sm font-semibold rounded-lg">Add</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Issuance() {
  const [issues, setIssues] = useState([]);
  const [issuing, setIssuing] = useState(false);
  const [form, setForm] = useState({});
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  useEffect(() => {
    api.get('/school/library/issues').then((r) => setIssues(r.data)).catch(() => {});
  }, []);

  const issue = async () => {
    try {
      const { data } = await api.post('/school/library/issue', form);
      setIssues((p) => [data, ...p]);
      setIssuing(false); setForm({});
    } catch (err) { alert(err?.error || 'Issue failed'); }
  };

  const returnBook = async (id) => {
    await api.post('/school/library/return', { issue_id: id }).catch(() => {});
    setIssues((p) => p.map((i) => i.id === id ? { ...i, status: 'returned', returned_at: new Date() } : i));
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setIssuing(true)} className="px-4 py-2 bg-[#0891B2] text-white text-sm font-semibold rounded-lg hover:bg-[#0e7490]">
          Issue Book
        </button>
      </div>
      <table className="w-full text-sm bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <thead><tr className="bg-gray-50 border-b text-xs text-gray-500 uppercase">
          <th className="px-4 py-3 text-left">Book</th><th className="px-4 py-3 text-left">Borrower</th><th className="px-4 py-3 text-left">Issue Date</th><th className="px-4 py-3 text-left">Due Date</th><th className="px-4 py-3 text-left">Status</th><th className="px-4 py-3 text-left">Action</th>
        </tr></thead>
        <tbody className="divide-y divide-gray-50">
          {issues.length === 0
            ? <tr><td colSpan={6} className="text-center py-10 text-gray-400">No book issues</td></tr>
            : issues.map((i) => (
              <tr key={i.id} className="hover:bg-blue-50/30">
                <td className="px-4 py-3 font-medium text-gray-900">{i.book_title || i.book_id}</td>
                <td className="px-4 py-3 text-gray-600">{i.borrower_name || i.user_id}</td>
                <td className="px-4 py-3 text-gray-600">{new Date(i.issue_date || i.created_at).toLocaleDateString('en-IN')}</td>
                <td className="px-4 py-3 text-gray-600">{i.due_date ? new Date(i.due_date).toLocaleDateString('en-IN') : '—'}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${i.status === 'returned' ? 'bg-green-50 text-green-700' : i.fine_amount > 0 ? 'bg-red-50 text-red-700' : 'bg-yellow-50 text-yellow-700'}`}>
                    {i.status === 'returned' ? 'Returned' : 'Issued'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {i.status !== 'returned' && (
                    <button onClick={() => returnBook(i.id)} className="text-xs text-[#0891B2] font-medium border border-[#0891B2]/30 px-3 py-1 rounded hover:bg-blue-50">
                      Return
                    </button>
                  )}
                </td>
              </tr>
            ))
          }
        </tbody>
      </table>

      {issuing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h3 className="text-lg font-bold">Issue Book</h3>
            <input className={inputCls} placeholder="Book ID or ISBN" onChange={set('book_id')} />
            <input className={inputCls} placeholder="Student/Staff ID or Email" onChange={set('borrower_id')} />
            <input className={inputCls} type="date" placeholder="Due date"
              onChange={set('due_date')}
              defaultValue={new Date(Date.now() + 14*24*60*60*1000).toISOString().slice(0,10)}
            />
            <div className="flex gap-3 justify-end">
              <button onClick={() => setIssuing(false)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700">Cancel</button>
              <button onClick={issue} className="px-5 py-2 bg-[#0891B2] text-white text-sm font-semibold rounded-lg">Issue</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LibraryPage() {
  const [tab, setTab] = useState('books');
  const TABS = [
    { id: 'books',   label: 'Book Catalog', icon: '📚' },
    { id: 'issue',   label: 'Issue / Return', icon: '🔄' },
  ];
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-gray-900">Library</h1>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex border-b border-gray-100 overflow-x-auto">
          {TABS.map((t) => <Tab key={t.id} {...t} active={tab === t.id} onClick={setTab} />)}
        </div>
        <div className="p-5">
          {tab === 'books' && <Books />}
          {tab === 'issue' && <Issuance />}
        </div>
      </div>
    </div>
  );
}
