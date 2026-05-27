import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import ChatWidget from './ChatWidget';
import { useAuthStore } from '../services/authStore';

export default function Layout() {
  const user = useAuthStore((s) => s.user);

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-auto p-6">
        <Outlet />
      </main>
      <ChatWidget
        apiUrl="http://localhost:8000"
        apiKey="chalo-rag-secure-key-2026"
        schoolId={user?.schoolId || "SCH001"}
        role={user?.role || "admin"}
      />
    </div>
  );
}
