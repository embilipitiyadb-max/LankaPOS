import { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Menu, Search, Bell, ChevronDown, LogOut, User } from 'lucide-react';
import { useStore } from '../../store/useStore';

const routeTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/pos': 'Point of Sale',
  '/inventory': 'Inventory',
  '/grn': 'Goods Receipt Note',
  '/customers': 'Customers',
  '/suppliers': 'Suppliers',
  '/reports': 'Reports',
  '/employees': 'Employees',
  '/settings': 'Settings',
};

function getPageTitle(pathname: string): string {
  if (routeTitles[pathname]) return routeTitles[pathname];
  const match = Object.keys(routeTitles)
    .sort((a, b) => b.length - a.length)
    .find((key) => pathname.startsWith(key + '/'));
  return match ? routeTitles[match] : 'LankaPOS';
}

export default function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const { setSidebarOpen, currentUser, logout } = useStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const pageTitle = getPageTitle(location.pathname);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClick);
      return () => document.removeEventListener('mousedown', handleClick);
    }
  }, [dropdownOpen]);

  const handleLogout = async () => {
    setDropdownOpen(false);
    await logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-20 glass h-16 flex items-center justify-between px-4 lg:px-6 border-b border-white/[0.06]">
      {/* Left: hamburger + title */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setSidebarOpen(true)}
          className="lg:hidden p-2 rounded-lg text-dark-300 hover:text-dark-100 hover:bg-white/[0.04] transition-colors"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-semibold text-dark-50">{pageTitle}</h1>
      </div>

      {/* Right: search + notifications + user */}
      <div className="flex items-center gap-2">
        {/* Search bar - md+ only */}
        <div className="hidden md:flex items-center gap-2 bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-2">
          <Search className="w-4 h-4 text-dark-400" />
          <input
            type="text"
            placeholder="Search..."
            className="bg-transparent text-sm text-dark-100 placeholder-dark-400 outline-none w-48"
          />
        </div>

        {/* Notification bell */}
        <button className="relative p-2 rounded-lg text-dark-300 hover:text-dark-100 hover:bg-white/[0.04] transition-colors" aria-label="Notifications">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary-500" />
        </button>

        {/* User dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 p-1.5 pr-2 rounded-lg hover:bg-white/[0.04] transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-primary-500/20 flex items-center justify-center">
              <User className="w-4 h-4 text-primary-400" />
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-medium text-dark-100 leading-tight">
                {currentUser?.name || 'User'}
              </p>
              <p className="text-xs text-dark-400 capitalize leading-tight">
                {currentUser?.role || 'admin'}
              </p>
            </div>
            <ChevronDown className={`w-4 h-4 text-dark-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-48 glass rounded-lg py-1 shadow-xl shadow-black/30 animate-scale-in">
              <div className="px-3 py-2 border-b border-white/[0.06]">
                <p className="text-sm font-medium text-dark-100">{currentUser?.name || 'User'}</p>
                <p className="text-xs text-dark-400 capitalize">{currentUser?.role || 'admin'}</p>
              </div>
              <button
                onClick={() => {
                  setDropdownOpen(false);
                  navigate('/settings');
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-dark-300 hover:text-dark-100 hover:bg-white/[0.04] transition-colors"
              >
                <User className="w-4 h-4" />
                Profile
              </button>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-primary-400 hover:bg-primary-500/10 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
