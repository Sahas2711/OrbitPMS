import { useState } from 'react';
import Sidebar from './Sidebar';
import TopHeader from './TopHeader';

export default function AppLayout({ children }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const toggleSidebar = () => setSidebarCollapsed((prev) => !prev);

  const sidebarWidth = sidebarCollapsed ? 80 : 280;

  return (
    <div className="min-h-svh bg-bg-page">
      <Sidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />
      <TopHeader collapsed={sidebarCollapsed} sidebarWidth={sidebarWidth} />

      <main
        className="pt-16 transition-all duration-300"
        style={{ marginLeft: sidebarWidth }}
      >
        <div className="p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
