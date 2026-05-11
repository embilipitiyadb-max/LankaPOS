import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

export default function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Listen for sidebar collapse state changes via a custom event so AppLayout
  // can react to the Sidebar's internal collapsed state without lifting it.
  useEffect(() => {
    function handleCollapse(e: Event) {
      setSidebarCollapsed((e as CustomEvent<boolean>).detail);
    }
    window.addEventListener('sidebar-collapse', handleCollapse as EventListener);
    return () => window.removeEventListener('sidebar-collapse', handleCollapse as EventListener);
  }, []);

  return (
    <div className="min-h-screen bg-dark-950">
      <Sidebar />
      <Header />
      <main
        className={`transition-all duration-300 pt-16 ${
          sidebarCollapsed ? 'lg:ml-[72px]' : 'lg:ml-64'
        }`}
      >
        <div className="p-4 lg:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
