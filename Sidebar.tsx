import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ShoppingCart,
  LayoutDashboard,
  Monitor,
  Package,
  FileText,
  Users,
  Truck,
  BarChart3,
  UserCog,
  Settings,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { useStore } from '../../store/useStore';

const navItems = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { label: 'POS', path: '/pos', icon: Monitor },
  { label: 'Inventory', path: '/inventory', icon: Package },
  { label: 'GRN', path: '/grn', icon: FileText },
  { label: 'Customers', path: '/customers', icon: Users },
  { label: 'Suppliers', path: '/suppliers', icon: Truck },
  { label: 'Reports', path: '/reports', icon: BarChart3 },
  { label: 'Employees', path: '/employees', icon: UserCog },
  { label: 'Settings', path: '/settings', icon: Settings },
];

export default function Sidebar() {
  const location = useLocation();
  const { sidebarOpen, setSidebarOpen } = useStore();
  const [collapsed, setCollapsed] = useState(false);

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    window.dispatchEvent(new CustomEvent<boolean>('sidebar-collapse', { detail: next }));
  };

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

  const navLink = (item: (typeof navItems)[number]) => {
    const Icon = item.icon;
    const active = isActive(item.path);

    return (
      <Link
        key={item.path}
        to={item.path}
        onClick={() => {
          if (window.innerWidth < 1024) setSidebarOpen(false);
        }}
        className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${
          active
            ? 'bg-primary-500/10 text-primary-400'
            : 'text-dark-300 hover:text-dark-100 hover:bg-white/[0.04]'
        }`}
      >
        {active && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-primary-500" />
        )}
        <Icon className={`w-5 h-5 shrink-0 ${active ? 'text-primary-400' : 'text-dark-400 group-hover:text-dark-200'}`} />
        {!collapsed && <span className="text-sm font-medium truncate">{item.label}</span>}
      </Link>
    );
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Branding */}
      <div className={`flex items-center gap-3 px-4 h-16 border-b border-white/[0.06] shrink-0 ${collapsed ? 'justify-center' : ''}`}>
        <ShoppingCart className="w-7 h-7 text-primary-500 shrink-0" />
        {!collapsed && (
          <span className="text-lg font-bold tracking-tight text-dark-50">
            Lanka<span className="text-primary-500">POS</span>
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
        {navItems.map(navLink)}
      </nav>

      {/* Collapse toggle - desktop only */}
      <div className="hidden lg:flex items-center justify-end px-3 py-3 border-t border-white/[0.06]">
        <button
          onClick={toggleCollapsed}
          className="p-1.5 rounded-md text-dark-400 hover:text-dark-200 hover:bg-white/[0.04] transition-colors"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:flex flex-col fixed inset-y-0 left-0 z-30 glass transition-all duration-300 ${
          collapsed ? 'w-[72px]' : 'w-64'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 glass flex flex-col lg:hidden transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Close button */}
        <button
          onClick={() => setSidebarOpen(false)}
          className="absolute top-4 right-3 p-1.5 rounded-md text-dark-400 hover:text-dark-100 hover:bg-white/[0.06] transition-colors z-10"
          aria-label="Close sidebar"
        >
          <X className="w-4 h-4" />
        </button>
        {sidebarContent}
      </aside>
    </>
  );
}
