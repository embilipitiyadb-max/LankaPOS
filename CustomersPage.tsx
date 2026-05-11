import { useState, useMemo } from 'react';
import { useStore } from '../../store/useStore';
import { formatLKR, formatDate } from '../../lib/utils';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Badge from '../../components/ui/Badge';
import StatCard from '../../components/ui/StatCard';
import {
  Plus,
  Search,
  User,
  Phone,
  CreditCard,
  Star,
  Edit2,
  Eye,
  Users,
  Mail,
  MapPin,
} from 'lucide-react';

type CustomerType = 'all' | 'regular' | 'credit' | 'loyalty';

interface CustomerForm {
  name: string;
  phone: string;
  email: string;
  address: string;
  type: 'regular' | 'credit' | 'loyalty';
  creditLimit: string;
}

const emptyCustomerForm: CustomerForm = {
  name: '',
  phone: '',
  email: '',
  address: '',
  type: 'regular',
  creditLimit: '0',
};

const typeFilterOptions = [
  { value: 'all', label: 'All Customers' },
  { value: 'regular', label: 'Regular' },
  { value: 'credit', label: 'Credit' },
  { value: 'loyalty', label: 'Loyalty' },
];

const typeOptions = [
  { value: 'regular', label: 'Regular' },
  { value: 'credit', label: 'Credit' },
  { value: 'loyalty', label: 'Loyalty' },
];

const typeBadgeVariant: Record<string, 'default' | 'info' | 'warning'> = {
  regular: 'default',
  credit: 'info',
  loyalty: 'warning',
};

export default function CustomersPage() {
  const { customers, transactions, addCustomer, updateCustomer } = useStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<CustomerType>('all');

  // Add/Edit modal state
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);
  const [customerForm, setCustomerForm] = useState<CustomerForm>(emptyCustomerForm);

  // Detail modal state
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailCustomerId, setDetailCustomerId] = useState<string | null>(null);

  // Stats
  const stats = useMemo(() => {
    const total = customers.length;
    const loyaltyMembers = customers.filter((c) => c.type === 'loyalty').length;
    const creditCustomers = customers.filter((c) => c.type === 'credit').length;
    const totalPurchases = customers.reduce((sum, c) => sum + c.totalPurchases, 0);
    return { total, loyaltyMembers, creditCustomers, totalPurchases };
  }, [customers]);

  // Filtered customers
  const filteredCustomers = useMemo(() => {
    let list = [...customers];
    if (typeFilter !== 'all') {
      list = list.filter((c) => c.type === typeFilter);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.phone.toLowerCase().includes(q) ||
          (c.email && c.email.toLowerCase().includes(q))
      );
    }
    return list;
  }, [customers, typeFilter, searchQuery]);

  // Customer purchase history
  const getCustomerTransactions = (customerId: string) =>
    transactions.filter((t) => t.customerId === customerId);

  // Add/Edit handlers
  const openAddCustomer = () => {
    setEditingCustomerId(null);
    setCustomerForm(emptyCustomerForm);
    setCustomerModalOpen(true);
  };

  const openEditCustomer = (id: string) => {
    const c = customers.find((x) => x.id === id);
    if (!c) return;
    setEditingCustomerId(id);
    setCustomerForm({
      name: c.name,
      phone: c.phone,
      email: c.email || '',
      address: c.address || '',
      type: c.type,
      creditLimit: String(c.creditLimit),
    });
    setCustomerModalOpen(true);
  };

  const handleSaveCustomer = async () => {
    const data = {
      name: customerForm.name,
      phone: customerForm.phone,
      email: customerForm.email || undefined,
      address: customerForm.address || undefined,
      type: customerForm.type,
      creditLimit: customerForm.type === 'credit' ? Number(customerForm.creditLimit) || 0 : 0,
    };
    if (editingCustomerId) {
      await updateCustomer(editingCustomerId, data);
    } else {
      await addCustomer(data);
    }
    setCustomerModalOpen(false);
  };

  // Detail handler
  const openDetail = (id: string) => {
    setDetailCustomerId(id);
    setDetailModalOpen(true);
  };

  const detailCustomer = customers.find((c) => c.id === detailCustomerId);
  const detailTransactions = detailCustomerId ? getCustomerTransactions(detailCustomerId) : [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-primary-600/10 border border-primary-600/20">
          <Users className="w-6 h-6 text-primary-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Customers</h1>
          <p className="text-sm text-dark-400">Manage your customer base</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Customers"
          value={String(stats.total)}
          icon={<Users className="w-7 h-7" />}
          color="text-primary-500"
        />
        <StatCard
          title="Loyalty Members"
          value={String(stats.loyaltyMembers)}
          icon={<Star className="w-7 h-7" />}
          color="text-warning-400"
        />
        <StatCard
          title="Credit Customers"
          value={String(stats.creditCustomers)}
          icon={<CreditCard className="w-7 h-7" />}
          color="text-info-400"
        />
        <StatCard
          title="Total Purchases"
          value={formatLKR(stats.totalPurchases)}
          icon={<User className="w-7 h-7" />}
          color="text-success-400"
        />
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={openAddCustomer} size="sm">
          <Plus className="w-4 h-4" />
          Add Customer
        </Button>
        <div className="flex-1 min-w-[200px]">
          <Input
            placeholder="Search customers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            icon={<Search className="w-4 h-4" />}
          />
        </div>
        <div className="min-w-[160px]">
          <Select
            options={typeFilterOptions}
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as CustomerType)}
          />
        </div>
      </div>

      {/* Customer Cards Grid */}
      {filteredCustomers.length === 0 ? (
        <div className="glass rounded-xl p-12 text-center text-dark-400">
          <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p>No customers found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredCustomers.map((customer) => (
            <div
              key={customer.id}
              className="glass rounded-xl p-5 hover:border-white/10 transition-all duration-200 group"
            >
              {/* Card Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary-600/10 border border-primary-600/20 flex items-center justify-center">
                    <User className="w-5 h-5 text-primary-500" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-white truncate">{customer.name}</h3>
                    {customer.phone && (
                      <div className="flex items-center gap-1 text-xs text-dark-400">
                        <Phone className="w-3 h-3" />
                        {customer.phone}
                      </div>
                    )}
                  </div>
                </div>
                <Badge variant={typeBadgeVariant[customer.type]}>
                  {customer.type.charAt(0).toUpperCase() + customer.type.slice(1)}
                </Badge>
              </div>

              {/* Card Details */}
              <div className="space-y-2 mb-4">
                {customer.type === 'loyalty' && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-dark-400 flex items-center gap-1.5">
                      <Star className="w-3.5 h-3.5" />
                      Loyalty Points
                    </span>
                    <span className="text-warning-400 font-medium">{customer.loyaltyPoints}</span>
                  </div>
                )}
                {customer.type === 'credit' && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-dark-400 flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5" />
                      Credit
                    </span>
                    <span className="text-info-400 font-medium">
                      {formatLKR(customer.creditUsed)} / {formatLKR(customer.creditLimit)}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-dark-400">Total Purchases</span>
                  <span className="text-white font-medium">{formatLKR(customer.totalPurchases)}</span>
                </div>
              </div>

              {/* Card Actions */}
              <div className="flex items-center gap-2 pt-3 border-t border-white/5">
                <button
                  onClick={() => openDetail(customer.id)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-dark-300 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  View
                </button>
                <button
                  onClick={() => openEditCustomer(customer.id)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-dark-300 hover:text-info-400 hover:bg-info-500/10 transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Customer Modal */}
      <Modal
        isOpen={customerModalOpen}
        onClose={() => setCustomerModalOpen(false)}
        title={editingCustomerId ? 'Edit Customer' : 'Add Customer'}
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Name"
            value={customerForm.name}
            onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
            placeholder="Enter customer name"
            icon={<User className="w-4 h-4" />}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Phone"
              value={customerForm.phone}
              onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
              placeholder="0771234567"
              icon={<Phone className="w-4 h-4" />}
            />
            <Input
              label="Email"
              type="email"
              value={customerForm.email}
              onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
              placeholder="customer@email.com"
              icon={<Mail className="w-4 h-4" />}
            />
          </div>
          <Input
            label="Address"
            value={customerForm.address}
            onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })}
            placeholder="Enter address"
            icon={<MapPin className="w-4 h-4" />}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Type"
              options={typeOptions}
              value={customerForm.type}
              onChange={(e) =>
                setCustomerForm({
                  ...customerForm,
                  type: e.target.value as CustomerForm['type'],
                })
              }
            />
            {customerForm.type === 'credit' && (
              <Input
                label="Credit Limit"
                type="number"
                value={customerForm.creditLimit}
                onChange={(e) =>
                  setCustomerForm({ ...customerForm, creditLimit: e.target.value })
                }
                placeholder="0.00"
                icon={<CreditCard className="w-4 h-4" />}
              />
            )}
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setCustomerModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveCustomer}
              disabled={!customerForm.name}
            >
              {editingCustomerId ? 'Update Customer' : 'Add Customer'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Customer Detail Modal */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title="Customer Details"
        size="xl"
      >
        {detailCustomer && (
          <div className="space-y-6">
            {/* Customer Info */}
            <div className="glass-light rounded-xl p-5">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary-600/10 border border-primary-600/20 flex items-center justify-center flex-shrink-0">
                  <User className="w-6 h-6 text-primary-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-bold text-white">{detailCustomer.name}</h3>
                    <Badge variant={typeBadgeVariant[detailCustomer.type]}>
                      {detailCustomer.type.charAt(0).toUpperCase() + detailCustomer.type.slice(1)}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                    {detailCustomer.phone && (
                      <div className="flex items-center gap-2 text-dark-300">
                        <Phone className="w-4 h-4 text-dark-400" />
                        {detailCustomer.phone}
                      </div>
                    )}
                    {detailCustomer.email && (
                      <div className="flex items-center gap-2 text-dark-300">
                        <Mail className="w-4 h-4 text-dark-400" />
                        {detailCustomer.email}
                      </div>
                    )}
                    {detailCustomer.address && (
                      <div className="flex items-center gap-2 text-dark-300 sm:col-span-2">
                        <MapPin className="w-4 h-4 text-dark-400" />
                        {detailCustomer.address}
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-dark-300">
                      <User className="w-4 h-4 text-dark-400" />
                      Customer since {formatDate(detailCustomer.createdAt)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="glass-light rounded-xl p-4 text-center">
                <p className="text-xs text-dark-400 mb-1">Total Purchases</p>
                <p className="text-lg font-bold text-white">{formatLKR(detailCustomer.totalPurchases)}</p>
              </div>
              <div className="glass-light rounded-xl p-4 text-center">
                <p className="text-xs text-dark-400 mb-1">Loyalty Points</p>
                <p className="text-lg font-bold text-warning-400">{detailCustomer.loyaltyPoints}</p>
              </div>
              {detailCustomer.type === 'credit' && (
                <>
                  <div className="glass-light rounded-xl p-4 text-center">
                    <p className="text-xs text-dark-400 mb-1">Credit Limit</p>
                    <p className="text-lg font-bold text-info-400">{formatLKR(detailCustomer.creditLimit)}</p>
                  </div>
                  <div className="glass-light rounded-xl p-4 text-center">
                    <p className="text-xs text-dark-400 mb-1">Credit Balance</p>
                    <p className="text-lg font-bold text-success-400">
                      {formatLKR(detailCustomer.creditLimit - detailCustomer.creditUsed)}
                    </p>
                  </div>
                </>
              )}
              {detailCustomer.type !== 'credit' && (
                <>
                  <div className="glass-light rounded-xl p-4 text-center">
                    <p className="text-xs text-dark-400 mb-1">Transactions</p>
                    <p className="text-lg font-bold text-white">{detailTransactions.length}</p>
                  </div>
                  <div className="glass-light rounded-xl p-4 text-center">
                    <p className="text-xs text-dark-400 mb-1">Customer Type</p>
                    <p className="text-lg font-bold text-dark-200 capitalize">{detailCustomer.type}</p>
                  </div>
                </>
              )}
            </div>

            {/* Purchase History */}
            <div>
              <h4 className="text-sm font-semibold text-dark-200 mb-3">Purchase History</h4>
              {detailTransactions.length === 0 ? (
                <div className="glass-light rounded-xl p-8 text-center text-dark-400">
                  <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No transactions found for this customer</p>
                </div>
              ) : (
                <div className="glass-light rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/5">
                          <th className="px-4 py-3 text-left text-dark-400 font-medium">Invoice</th>
                          <th className="px-4 py-3 text-left text-dark-400 font-medium">Date</th>
                          <th className="px-4 py-3 text-left text-dark-400 font-medium">Items</th>
                          <th className="px-4 py-3 text-left text-dark-400 font-medium">Payment</th>
                          <th className="px-4 py-3 text-right text-dark-400 font-medium">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detailTransactions.map((tx) => (
                          <tr
                            key={tx.id}
                            className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                          >
                            <td className="px-4 py-3 text-white font-mono text-xs">{tx.invoiceNo}</td>
                            <td className="px-4 py-3 text-dark-300">{formatDate(tx.createdAt)}</td>
                            <td className="px-4 py-3 text-dark-300">{tx.items.length} items</td>
                            <td className="px-4 py-3">
                              <Badge
                                variant={
                                  tx.paymentMethod === 'cash'
                                    ? 'success'
                                    : tx.paymentMethod === 'card'
                                    ? 'info'
                                    : tx.paymentMethod === 'credit'
                                    ? 'warning'
                                    : 'default'
                                }
                              >
                                {tx.paymentMethod.charAt(0).toUpperCase() + tx.paymentMethod.slice(1)}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-right text-white font-medium">
                              {formatLKR(tx.total)}
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
