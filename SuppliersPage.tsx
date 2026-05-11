import { useState, useMemo } from 'react';
import { useStore } from '../../store/useStore';
import { formatLKR, formatDate } from '../../lib/utils';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import {
  Plus,
  Search,
  Building2,
  Phone,
  Mail,
  Edit2,
  Eye,
  DollarSign,
  User,
  MapPin,
  CheckCircle2,
} from 'lucide-react';

interface SupplierForm {
  name: string;
  phone: string;
  email: string;
  address: string;
  contactPerson: string;
}

const emptyForm: SupplierForm = {
  name: '',
  phone: '',
  email: '',
  address: '',
  contactPerson: '',
};

export default function SuppliersPage() {
  const { suppliers, grns, addSupplier, updateSupplier } = useStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<SupplierForm>(emptyForm);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);

  // Stats
  const totalSuppliers = suppliers.length;
  const totalDueBalance = useMemo(() => suppliers.reduce((s, sup) => s + sup.dueBalance, 0), [suppliers]);
  const totalPurchases = useMemo(() => suppliers.reduce((s, sup) => s + sup.totalPurchases, 0), [suppliers]);

  // Filtered suppliers
  const filteredSuppliers = useMemo(() => {
    if (!searchQuery) return suppliers;
    const q = searchQuery.toLowerCase();
    return suppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.contactPerson && s.contactPerson.toLowerCase().includes(q)) ||
        s.phone.includes(q) ||
        (s.email && s.email.toLowerCase().includes(q))
    );
  }, [suppliers, searchQuery]);

  // Selected supplier details
  const selectedSupplier = suppliers.find((s) => s.id === selectedSupplierId) || null;
  const supplierGrns = useMemo(
    () => (selectedSupplierId ? grns.filter((g) => g.supplierId === selectedSupplierId) : []),
    [grns, selectedSupplierId]
  );

  // Handlers
  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormModalOpen(true);
  };

  const openEdit = (id: string) => {
    const s = suppliers.find((x) => x.id === id);
    if (!s) return;
    setEditingId(id);
    setForm({
      name: s.name,
      phone: s.phone,
      email: s.email || '',
      address: s.address || '',
      contactPerson: s.contactPerson || '',
    });
    setFormModalOpen(true);
  };

  const openDetail = (id: string) => {
    setSelectedSupplierId(id);
    setDetailModalOpen(true);
  };

  const handleSave = async () => {
    const data = {
      name: form.name,
      phone: form.phone,
      email: form.email || undefined,
      address: form.address || undefined,
      contactPerson: form.contactPerson || undefined,
    };
    if (editingId) {
      await updateSupplier(editingId, data);
    } else {
      await addSupplier(data);
    }
    setFormModalOpen(false);
  };

  const handleMarkAsPaid = async () => {
    if (selectedSupplierId) {
      await updateSupplier(selectedSupplierId, { dueBalance: 0 });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-primary-600/10 border border-primary-600/20">
          <Building2 className="w-6 h-6 text-primary-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Supplier Management</h1>
          <p className="text-sm text-dark-400">Manage suppliers and track purchase history</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-light rounded-2xl p-5 animate-slide-up">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-sm text-dark-300 mb-1">Total Suppliers</p>
              <p className="text-2xl font-bold text-white">{totalSuppliers}</p>
            </div>
            <div className="text-dark-400 opacity-50">
              <Building2 className="w-6 h-6" />
            </div>
          </div>
        </div>
        <div className="glass-light rounded-2xl p-5 animate-slide-up">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-sm text-dark-300 mb-1">Total Due Balance</p>
              <p className="text-2xl font-bold text-primary-500">{formatLKR(totalDueBalance)}</p>
            </div>
            <div className="text-primary-500 opacity-50">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>
        </div>
        <div className="glass-light rounded-2xl p-5 animate-slide-up">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-sm text-dark-300 mb-1">Total Purchases</p>
              <p className="text-2xl font-bold text-success-400">{formatLKR(totalPurchases)}</p>
            </div>
            <div className="text-success-400 opacity-50">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={openAdd} size="sm">
          <Plus className="w-4 h-4" />
          Add Supplier
        </Button>
        <div className="flex-1 min-w-[200px]">
          <Input
            placeholder="Search suppliers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            icon={<Search className="w-4 h-4" />}
          />
        </div>
      </div>

      {/* Supplier Cards Grid */}
      {filteredSuppliers.length === 0 ? (
        <div className="glass rounded-xl p-12 text-center">
          <Building2 className="w-12 h-12 mx-auto mb-3 text-dark-400 opacity-30" />
          <p className="text-dark-400">No suppliers found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSuppliers.map((supplier) => (
            <div
              key={supplier.id}
              className="glass rounded-xl p-5 hover:border-white/10 transition-all duration-200 group"
            >
              {/* Supplier Name */}
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-xl bg-primary-600/10 border border-primary-600/20">
                  <Building2 className="w-5 h-5 text-primary-500" />
                </div>
                <h3 className="font-semibold text-white truncate flex-1">{supplier.name}</h3>
              </div>

              {/* Contact Info */}
              <div className="space-y-2 mb-4">
                {supplier.contactPerson && (
                  <div className="flex items-center gap-2 text-sm text-dark-300">
                    <User className="w-4 h-4 text-dark-400 flex-shrink-0" />
                    <span className="truncate">{supplier.contactPerson}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-dark-300">
                  <Phone className="w-4 h-4 text-dark-400 flex-shrink-0" />
                  <span>{supplier.phone}</span>
                </div>
                {supplier.email && (
                  <div className="flex items-center gap-2 text-sm text-dark-300">
                    <Mail className="w-4 h-4 text-dark-400 flex-shrink-0" />
                    <span className="truncate">{supplier.email}</span>
                  </div>
                )}
              </div>

              {/* Financials */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-dark-800/50 rounded-lg p-3">
                  <p className="text-xs text-dark-400 mb-1">Due Balance</p>
                  <p className={`text-sm font-semibold ${supplier.dueBalance > 0 ? 'text-primary-500' : 'text-success-400'}`}>
                    {formatLKR(supplier.dueBalance)}
                  </p>
                </div>
                <div className="bg-dark-800/50 rounded-lg p-3">
                  <p className="text-xs text-dark-400 mb-1">Total Purchases</p>
                  <p className="text-sm font-semibold text-white">
                    {formatLKR(supplier.totalPurchases)}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-3 border-t border-white/5">
                <button
                  onClick={() => openEdit(supplier.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-dark-300 hover:text-info-400 hover:bg-info-500/10 transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Edit
                </button>
                <button
                  onClick={() => openDetail(supplier.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-dark-300 hover:text-primary-400 hover:bg-primary-500/10 transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" />
                  View
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Supplier Modal */}
      <Modal
        isOpen={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        title={editingId ? 'Edit Supplier' : 'Add Supplier'}
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Supplier Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Enter supplier name"
            icon={<Building2 className="w-4 h-4" />}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="Phone number"
              icon={<Phone className="w-4 h-4" />}
            />
            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="Email address"
              icon={<Mail className="w-4 h-4" />}
            />
          </div>
          <Input
            label="Address"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            placeholder="Supplier address"
            icon={<MapPin className="w-4 h-4" />}
          />
          <Input
            label="Contact Person"
            value={form.contactPerson}
            onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
            placeholder="Contact person name"
            icon={<User className="w-4 h-4" />}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setFormModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!form.name || !form.phone}>
              {editingId ? 'Update Supplier' : 'Add Supplier'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Supplier Detail Modal */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title="Supplier Details"
        size="xl"
      >
        {selectedSupplier && (
          <div className="space-y-5">
            {/* Supplier Info */}
            <div className="glass-light rounded-xl p-5">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-primary-600/10 border border-primary-600/20">
                  <Building2 className="w-6 h-6 text-primary-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-white mb-3">{selectedSupplier.name}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedSupplier.contactPerson && (
                      <div className="flex items-center gap-2 text-sm text-dark-200">
                        <User className="w-4 h-4 text-dark-400" />
                        <span>{selectedSupplier.contactPerson}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm text-dark-200">
                      <Phone className="w-4 h-4 text-dark-400" />
                      <span>{selectedSupplier.phone}</span>
                    </div>
                    {selectedSupplier.email && (
                      <div className="flex items-center gap-2 text-sm text-dark-200">
                        <Mail className="w-4 h-4 text-dark-400" />
                        <span>{selectedSupplier.email}</span>
                      </div>
                    )}
                    {selectedSupplier.address && (
                      <div className="flex items-center gap-2 text-sm text-dark-200">
                        <MapPin className="w-4 h-4 text-dark-400" />
                        <span>{selectedSupplier.address}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Financial Summary */}
            <div className="grid grid-cols-2 gap-4">
              <div className="glass-light rounded-xl p-4">
                <p className="text-sm text-dark-400 mb-1">Due Balance</p>
                <p className={`text-xl font-bold ${selectedSupplier.dueBalance > 0 ? 'text-primary-500' : 'text-success-400'}`}>
                  {formatLKR(selectedSupplier.dueBalance)}
                </p>
                {selectedSupplier.dueBalance > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 text-success-400 hover:text-success-300 hover:bg-success-500/10"
                    onClick={handleMarkAsPaid}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Mark as Paid
                  </Button>
                )}
                {selectedSupplier.dueBalance === 0 && (
                  <div className="mt-2 flex items-center gap-1.5 text-success-400 text-sm">
                    <CheckCircle2 className="w-4 h-4" />
                    Paid
                  </div>
                )}
              </div>
              <div className="glass-light rounded-xl p-4">
                <p className="text-sm text-dark-400 mb-1">Total Purchases</p>
                <p className="text-xl font-bold text-white">
                  {formatLKR(selectedSupplier.totalPurchases)}
                </p>
                <p className="text-xs text-dark-400 mt-2">
                  Added on {formatDate(selectedSupplier.createdAt)}
                </p>
              </div>
            </div>

            {/* Purchase History */}
            <div>
              <h4 className="text-sm font-medium text-dark-300 mb-3">Purchase History</h4>
              {supplierGrns.length === 0 ? (
                <div className="glass rounded-xl p-8 text-center">
                  <DollarSign className="w-8 h-8 mx-auto mb-2 text-dark-400 opacity-30" />
                  <p className="text-sm text-dark-400">No purchase records found</p>
                </div>
              ) : (
                <div className="glass rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/5">
                          <th className="px-4 py-3 text-left text-dark-400 font-medium">GRN No</th>
                          <th className="px-4 py-3 text-left text-dark-400 font-medium">Items</th>
                          <th className="px-4 py-3 text-left text-dark-400 font-medium">Total</th>
                          <th className="px-4 py-3 text-left text-dark-400 font-medium">Status</th>
                          <th className="px-4 py-3 text-left text-dark-400 font-medium">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {supplierGrns.map((grn) => (
                          <tr
                            key={grn.id}
                            className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                          >
                            <td className="px-4 py-3 font-mono text-white text-xs">{grn.grnNo}</td>
                            <td className="px-4 py-3 text-dark-200">{grn.items.length} items</td>
                            <td className="px-4 py-3 text-white font-medium">{formatLKR(grn.total)}</td>
                            <td className="px-4 py-3">
                              <Badge
                                variant={
                                  grn.status === 'received'
                                    ? 'success'
                                    : grn.status === 'partial'
                                    ? 'warning'
                                    : 'default'
                                }
                              >
                                {grn.status}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-dark-400 text-xs">
                              {formatDate(grn.createdAt)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
