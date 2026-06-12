import { useState } from 'react';
import Sidebar from './Sidebar';
import TopHeader from './TopHeader';

export default function AppLayout({ children }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const toggleSidebar = () => setSidebarCollapsed((prev) => !prev);
  const openMobileSidebar = () => setMobileSidebarOpen(true);
  const closeMobileSidebar = () => setMobileSidebarOpen(false);

  const sidebarWidth = sidebarCollapsed ? 80 : 280;

  return (
    <div className="min-h-svh bg-bg-page">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={toggleSidebar}
        mobileOpen={mobileSidebarOpen}
        onMobileClose={closeMobileSidebar}
      />
      <TopHeader
        collapsed={sidebarCollapsed}
        sidebarWidth={sidebarWidth}
        onMenuClick={openMobileSidebar}
      />

      <main
        className="pt-16 min-h-svh transition-all duration-300"
        style={{ marginLeft: sidebarWidth }}
      >
        <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
