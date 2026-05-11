import { useState, useRef } from 'react';
import { useStore } from '../../store/useStore';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import { saveAs } from 'file-saver';
import {
  Save,
  Download,
  Upload,
  Trash2,
  Globe,
  Building2,
  Settings,
  AlertTriangle,
} from 'lucide-react';

type TabKey = 'general' | 'business' | 'language' | 'backup';

const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'general', label: 'General', icon: <Settings className="w-4 h-4" /> },
  { key: 'business', label: 'Business', icon: <Building2 className="w-4 h-4" /> },
  { key: 'language', label: 'Language', icon: <Globe className="w-4 h-4" /> },
  { key: 'backup', label: 'Backup', icon: <Download className="w-4 h-4" /> },
];

const translations: Record<string, Record<string, string>> = {
  en: {
    dashboard: 'Dashboard',
    products: 'Products',
    customers: 'Customers',
    settings: 'Settings',
    save: 'Save',
    search: 'Search...',
    totalSales: 'Total Sales',
    welcome: 'Welcome back!',
  },
  si: {
    dashboard: 'උපකරණ පුවරුව',
    products: 'නිෂ්පාදන',
    customers: 'පාරිභෝගිකයින්',
    settings: 'සැකසුම්',
    save: 'සුරකින්න',
    search: 'සොයන්න...',
    totalSales: 'මුළු විකුණුම්',
    welcome: 'ආපසු සාදරයෙන් පිළිගනිමු!',
  },
};

export default function SettingsPage() {
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);

  const [activeTab, setActiveTab] = useState<TabKey>('general');

  // General tab state
  const [taxRate, setTaxRate] = useState(String(settings.taxRate));
  const [autoBackup, setAutoBackup] = useState(settings.autoBackup);

  // Business tab state
  const [businessName, setBusinessName] = useState(settings.businessName);
  const [businessAddress, setBusinessAddress] = useState(settings.businessAddress);
  const [businessPhone, setBusinessPhone] = useState(settings.businessPhone);
  const [receiptFooter, setReceiptFooter] = useState(settings.receiptFooter);

  // Language tab state
  const [selectedLang, setSelectedLang] = useState<'en' | 'si'>(settings.language);

  // Backup tab state
  const [clearModalOpen, setClearModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Last backup timestamp from localStorage
  const lastBackup = (() => {
    try {
      const raw = localStorage.getItem('lankapos-store');
      if (raw) {
        const parsed = JSON.parse(raw);
        return parsed?.state?.lastBackupTimestamp || null;
      }
    } catch {
      /* ignore */
    }
    return null;
  })();

  // --- Handlers ---

  const handleSaveGeneral = () => {
    updateSettings({
      taxRate: parseFloat(taxRate) || 0,
      autoBackup,
    });
  };

  const handleSaveBusiness = () => {
    updateSettings({
      businessName,
      businessAddress,
      businessPhone,
      receiptFooter,
    });
  };

  const handleSaveLanguage = () => {
    updateSettings({ language: selectedLang });
  };

  const handleExportData = () => {
    const data = localStorage.getItem('lankapos-store');
    if (data) {
      const blob = new Blob([data], { type: 'application/json;charset=utf-8' });
      saveAs(blob, `lankapos-backup-${new Date().toISOString().slice(0, 10)}.json`);
    }
  };

  const handleImportData = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      try {
        JSON.parse(text); // validate JSON
        localStorage.setItem('lankapos-store', text);
        window.location.reload();
      } catch {
        alert('Invalid backup file. Please select a valid JSON backup.');
      }
    };
    reader.readAsText(file);
    // Reset input so same file can be re-selected
    e.target.value = '';
  };

  const handleClearAll = () => {
    localStorage.removeItem('lankapos-store');
    window.location.reload();
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 animate-fade-in">
      <h1 className="text-xl sm:text-2xl font-bold text-dark-100">Settings</h1>

      {/* Tab Navigation */}
      <div className="flex gap-1 p-1 glass rounded-xl overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`
              flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap
              transition-all duration-200
              ${
                activeTab === tab.key
                  ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/20'
                  : 'text-dark-300 hover:text-white hover:bg-white/5'
              }
            `}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="glass rounded-2xl p-5 sm:p-6 animate-slide-up">
        {/* ==================== GENERAL TAB ==================== */}
        {activeTab === 'general' && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-dark-100 flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary-500" />
              General Settings
            </h2>

            {/* Currency */}
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1.5">Currency</label>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-dark-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-dark-200">
                  LKR (Sri Lankan Rupee)
                </div>
                <Badge variant="info">Fixed</Badge>
              </div>
            </div>

            {/* Tax Rate */}
            <Input
              label="Tax Rate (%)"
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={taxRate}
              onChange={(e) => setTaxRate(e.target.value)}
              placeholder="0"
            />

            {/* Auto Backup Toggle */}
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1.5">Auto Backup</label>
              <button
                onClick={() => setAutoBackup(!autoBackup)}
                className={`
                  relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200
                  ${autoBackup ? 'bg-primary-600' : 'bg-dark-600'}
                `}
              >
                <span
                  className={`
                    inline-block h-4 w-4 rounded-full bg-white transition-transform duration-200
                    ${autoBackup ? 'translate-x-6' : 'translate-x-1'}
                  `}
                />
              </button>
              <p className="text-xs text-dark-400 mt-1">
                {autoBackup ? 'Automatic backup is enabled' : 'Automatic backup is disabled'}
              </p>
            </div>

            {/* Theme */}
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1.5">Theme</label>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-dark-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-dark-200 flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-dark-900 border border-white/20" />
                  Dark Mode
                </div>
                <Badge variant="info">Fixed</Badge>
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-2">
              <Button onClick={handleSaveGeneral}>
                <Save className="w-4 h-4" />
                Save Settings
              </Button>
            </div>
          </div>
        )}

        {/* ==================== BUSINESS TAB ==================== */}
        {activeTab === 'business' && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-dark-100 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary-500" />
              Business Information
            </h2>

            <Input
              label="Business Name"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Enter business name"
            />

            <Input
              label="Business Address"
              value={businessAddress}
              onChange={(e) => setBusinessAddress(e.target.value)}
              placeholder="Enter business address"
            />

            <Input
              label="Business Phone"
              value={businessPhone}
              onChange={(e) => setBusinessPhone(e.target.value)}
              placeholder="Enter phone number"
            />

            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1.5">
                Receipt Footer
              </label>
              <textarea
                value={receiptFooter}
                onChange={(e) => setReceiptFooter(e.target.value)}
                rows={3}
                className={`
                  w-full bg-dark-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white
                  placeholder:text-dark-400 focus:outline-none focus:border-primary-600/50
                  focus:ring-1 focus:ring-primary-600/30 transition-all duration-200 resize-none
                `}
                placeholder="Footer message on receipts"
              />
            </div>

            <div className="pt-2">
              <Button onClick={handleSaveBusiness}>
                <Save className="w-4 h-4" />
                Save Settings
              </Button>
            </div>
          </div>
        )}

        {/* ==================== LANGUAGE TAB ==================== */}
        {activeTab === 'language' && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-dark-100 flex items-center gap-2">
              <Globe className="w-5 h-5 text-primary-500" />
              Language
            </h2>

            {/* Language Selection Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={() => setSelectedLang('en')}
                className={`
                  p-5 rounded-xl border-2 transition-all duration-200 text-left
                  ${
                    selectedLang === 'en'
                      ? 'border-primary-500 bg-primary-500/10 shadow-lg shadow-primary-600/10'
                      : 'border-white/10 bg-dark-800/50 hover:border-white/20'
                  }
                `}
              >
                <div className="text-2xl mb-2">🇬🇧</div>
                <p className="text-sm font-semibold text-white">English</p>
                <p className="text-xs text-dark-400 mt-1">Default language</p>
              </button>

              <button
                onClick={() => setSelectedLang('si')}
                className={`
                  p-5 rounded-xl border-2 transition-all duration-200 text-left
                  ${
                    selectedLang === 'si'
                      ? 'border-primary-500 bg-primary-500/10 shadow-lg shadow-primary-600/10'
                      : 'border-white/10 bg-dark-800/50 hover:border-white/20'
                  }
                `}
              >
                <div className="text-2xl mb-2">🇱🇰</div>
                <p className="text-sm font-semibold text-white">Sinhala</p>
                <p className="text-xs text-dark-400 mt-1">සිංහල</p>
              </button>
            </div>

            {/* Preview */}
            <div>
              <p className="text-sm font-medium text-dark-300 mb-3">Preview</p>
              <div className="bg-dark-800/50 border border-white/5 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-3 border-b border-white/5 pb-3">
                  <div className="w-8 h-8 rounded-lg bg-primary-600/20 flex items-center justify-center">
                    <Globe className="w-4 h-4 text-primary-400" />
                  </div>
                  <span className="text-sm font-medium text-white">
                    {translations[selectedLang]?.dashboard ?? 'Dashboard'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {['products', 'customers', 'settings', 'totalSales'].map((key) => (
                    <div
                      key={key}
                      className="bg-dark-800/80 rounded-lg p-3 border border-white/5"
                    >
                      <p className="text-xs text-dark-400">
                        {translations[selectedLang]?.[key] ?? key}
                      </p>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-dark-200 pt-2">
                  {translations[selectedLang]?.welcome ?? 'Welcome back!'}
                </p>
                <div className="flex items-center gap-2 bg-dark-800 border border-white/10 rounded-lg px-3 py-2">
                  <svg className="w-4 h-4 text-dark-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <span className="text-sm text-dark-400">
                    {translations[selectedLang]?.search ?? 'Search...'}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <Button onClick={handleSaveLanguage}>
                <Save className="w-4 h-4" />
                Save Settings
              </Button>
            </div>
          </div>
        )}

        {/* ==================== BACKUP TAB ==================== */}
        {activeTab === 'backup' && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-dark-100 flex items-center gap-2">
              <Download className="w-5 h-5 text-primary-500" />
              Backup & Data
            </h2>

            {/* Last Backup Timestamp */}
            <div className="bg-dark-800/50 border border-white/5 rounded-xl p-4">
              <p className="text-sm text-dark-300">Last Backup</p>
              <p className="text-lg font-semibold text-white mt-1">
                {lastBackup
                  ? new Date(lastBackup).toLocaleString()
                  : 'No backup recorded'}
              </p>
            </div>

            {/* Export / Import Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Button onClick={handleExportData} variant="secondary" className="w-full">
                <Download className="w-4 h-4" />
                Export Data
              </Button>

              <Button onClick={handleImportData} variant="secondary" className="w-full">
                <Upload className="w-4 h-4" />
                Import Data
              </Button>
            </div>

            {/* Hidden file input for import */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileChange}
              className="hidden"
            />

            {/* Divider */}
            <div className="border-t border-white/5 pt-6">
              <h3 className="text-sm font-semibold text-primary-400 flex items-center gap-2 mb-4">
                <AlertTriangle className="w-4 h-4" />
                Danger Zone
              </h3>

              <div className="bg-primary-500/5 border border-primary-500/20 rounded-xl p-4">
                <p className="text-sm text-dark-200 mb-3">
                  This will permanently delete all your data including products, transactions,
                  customers, and settings. This action cannot be undone.
                </p>
                <Button variant="danger" onClick={() => setClearModalOpen(true)}>
                  <Trash2 className="w-4 h-4" />
                  Clear All Data
                </Button>
              </div>
            </div>

            {/* Clear Confirmation Modal */}
            <Modal
              isOpen={clearModalOpen}
              onClose={() => setClearModalOpen(false)}
              title="Clear All Data"
              size="sm"
            >
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-primary-400">
                  <AlertTriangle className="w-8 h-8 flex-shrink-0" />
                  <p className="text-sm text-dark-200">
                    Are you sure you want to clear all data? This will remove all products,
                    transactions, customers, and settings from this device. This action
                    <strong className="text-primary-400"> cannot be undone</strong>.
                  </p>
                </div>
                <div className="flex gap-3 justify-end">
                  <Button variant="ghost" onClick={() => setClearModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button variant="danger" onClick={handleClearAll}>
                    <Trash2 className="w-4 h-4" />
                    Clear All Data
                  </Button>
                </div>
              </div>
            </Modal>
          </div>
        )}
      </div>
    </div>
  );
}
