import { useState, useMemo } from 'react';
import { useStore } from '../../store/useStore';
import { formatLKR, formatDate } from '../../lib/utils';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Badge from '../../components/ui/Badge';
import { Plus, FileText, Truck, Package, X, Eye, ShoppingCart, ClipboardList } from 'lucide-react';
import type { GRNItem } from '../../types';

type TabKey = 'grn-list' | 'purchase-orders' | 'new-grn' | 'new-po';

interface GRNFormItem {
  productId: string;
  quantity: number;
  costPrice: number;
  batchNo: string;
  expiryDate: string;
}

interface POFormItem {
  productId: string;
  quantity: number;
  costPrice: number;
}

const statusBadgeVariant: Record<string, 'warning' | 'success' | 'info' | 'danger' | 'default'> = {
  pending: 'warning',
  received: 'success',
  partial: 'info',
  draft: 'default',
  sent: 'info',
  cancelled: 'danger',
};

export default function GRNPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('grn-list');

  // GRN detail modal
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedGRNId, setSelectedGRNId] = useState<string | null>(null);

  // Store data
  const grns = useStore((s) => s.grns);
  const purchaseOrders = useStore((s) => s.purchaseOrders);
  const suppliers = useStore((s) => s.suppliers);
  const products = useStore((s) => s.products);
  const addGRN = useStore((s) => s.addGRN);
  const addPurchaseOrder = useStore((s) => s.addPurchaseOrder);

  // --- New GRN Form State ---
  const [grnSupplierId, setGRNSupplierId] = useState('');
  const [grnItems, setGRNItems] = useState<GRNFormItem[]>([
    { productId: '', quantity: 1, costPrice: 0, batchNo: '', expiryDate: '' },
  ]);
  const [commissionValue, setCommissionValue] = useState(0);
  const [commissionType, setCommissionType] = useState<'percent' | 'fixed'>('percent');
  const [transportCharge, setTransportCharge] = useState(0);
  const [grnSubmitting, setGRNSubmitting] = useState(false);

  // --- New PO Form State ---
  const [poSupplierId, setPOSupplierId] = useState('');
  const [poItems, setPOItems] = useState<POFormItem[]>([
    { productId: '', quantity: 1, costPrice: 0 },
  ]);
  const [poSubmitting, setPOSubmitting] = useState(false);

  // Supplier options
  const supplierOptions = useMemo(
    () => [
      { value: '', label: 'Select Supplier' },
      ...suppliers.map((s) => ({ value: s.id, label: s.name })),
    ],
    [suppliers],
  );

  // Product options
  const productOptions = useMemo(
    () => [
      { value: '', label: 'Select Product' },
      ...products.map((p) => ({ value: p.id, label: p.name })),
    ],
    [products],
  );

  // GRN auto-calculations
  const grnSubtotal = useMemo(
    () => grnItems.reduce((sum, item) => sum + item.quantity * item.costPrice, 0),
    [grnItems],
  );
  const commissionAmount = useMemo(
    () => (commissionType === 'percent' ? (grnSubtotal * commissionValue) / 100 : commissionValue),
    [grnSubtotal, commissionValue, commissionType],
  );
  const grnGrandTotal = useMemo(
    () => grnSubtotal - commissionAmount + transportCharge,
    [grnSubtotal, commissionAmount, transportCharge],
  );

  // PO auto-calculations
  const poTotal = useMemo(
    () => poItems.reduce((sum, item) => sum + item.quantity * item.costPrice, 0),
    [poItems],
  );

  // Selected GRN for detail modal
  const selectedGRN = useMemo(
    () => grns.find((g) => g.id === selectedGRNId) || null,
    [grns, selectedGRNId],
  );

  // --- GRN Form Handlers ---
  const updateGRNItem = (index: number, field: keyof GRNFormItem, value: string | number) => {
    setGRNItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    );
  };

  const addGRNItemRow = () => {
    setGRNItems((prev) => [
      ...prev,
      { productId: '', quantity: 1, costPrice: 0, batchNo: '', expiryDate: '' },
    ]);
  };

  const removeGRNItemRow = (index: number) => {
    if (grnItems.length <= 1) return;
    setGRNItems((prev) => prev.filter((_, i) => i !== index));
  };

  const resetGRNForm = () => {
    setGRNSupplierId('');
    setGRNItems([{ productId: '', quantity: 1, costPrice: 0, batchNo: '', expiryDate: '' }]);
    setCommissionValue(0);
    setCommissionType('percent');
    setTransportCharge(0);
  };

  const handleCreateGRN = async () => {
    if (!grnSupplierId) return;
    const validItems = grnItems.filter((i) => i.productId && i.quantity > 0 && i.costPrice > 0);
    if (validItems.length === 0) return;

    setGRNSubmitting(true);
    try {
      const supplier = suppliers.find((s) => s.id === grnSupplierId);
      const items: GRNItem[] = validItems.map((item) => {
        const product = products.find((p) => p.id === item.productId);
        return {
          productId: item.productId,
          productName: product?.name || 'Unknown',
          quantity: item.quantity,
          costPrice: item.costPrice,
          total: item.quantity * item.costPrice,
          batchNo: item.batchNo || undefined,
          expiryDate: item.expiryDate || undefined,
        };
      });

      await addGRN({
        supplierId: grnSupplierId,
        supplierName: supplier?.name || 'Unknown',
        items,
        subtotal: grnSubtotal,
        commission: commissionAmount,
        transportCharge,
        total: grnGrandTotal,
        status: 'pending',
        receivedBy: '',
        receivedAt: '',
      });

      resetGRNForm();
      setActiveTab('grn-list');
    } finally {
      setGRNSubmitting(false);
    }
  };

  // --- PO Form Handlers ---
  const updatePOItem = (index: number, field: keyof POFormItem, value: string | number) => {
    setPOItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    );
  };

  const addPOItemRow = () => {
    setPOItems((prev) => [...prev, { productId: '', quantity: 1, costPrice: 0 }]);
  };

  const removePOItemRow = (index: number) => {
    if (poItems.length <= 1) return;
    setPOItems((prev) => prev.filter((_, i) => i !== index));
  };

  const resetPOForm = () => {
    setPOSupplierId('');
    setPOItems([{ productId: '', quantity: 1, costPrice: 0 }]);
  };

  const handleCreatePO = async () => {
    if (!poSupplierId) return;
    const validItems = poItems.filter((i) => i.productId && i.quantity > 0 && i.costPrice > 0);
    if (validItems.length === 0) return;

    setPOSubmitting(true);
    try {
      const supplier = suppliers.find((s) => s.id === poSupplierId);
      const items: GRNItem[] = validItems.map((item) => {
        const product = products.find((p) => p.id === item.productId);
        return {
          productId: item.productId,
          productName: product?.name || 'Unknown',
          quantity: item.quantity,
          costPrice: item.costPrice,
          total: item.quantity * item.costPrice,
        };
      });

      await addPurchaseOrder({
        supplierId: poSupplierId,
        supplierName: supplier?.name || 'Unknown',
        items,
        total: poTotal,
        status: 'draft',
      });

      resetPOForm();
      setActiveTab('purchase-orders');
    } finally {
      setPOSubmitting(false);
    }
  };

  // Tab config
  const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: 'grn-list', label: 'GRN List', icon: <ClipboardList className="w-4 h-4" /> },
    { key: 'purchase-orders', label: 'Purchase Orders', icon: <ShoppingCart className="w-4 h-4" /> },
    { key: 'new-grn', label: 'New GRN', icon: <Package className="w-4 h-4" /> },
    { key: 'new-po', label: 'New PO', icon: <FileText className="w-4 h-4" /> },
  ];

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-dark-100">Goods Received Notes</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`
              flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 whitespace-nowrap
              ${
                activeTab === tab.key
                  ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/20 glow-red'
                  : 'bg-dark-800 text-dark-300 border border-white/10 hover:border-white/20 hover:text-white'
              }
            `}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* GRN List Tab */}
      {activeTab === 'grn-list' && (
        <div className="glass rounded-2xl p-5 animate-slide-up">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-dark-700">
                  <th className="text-left py-3 px-3 text-dark-300 font-medium">GRN#</th>
                  <th className="text-left py-3 px-3 text-dark-300 font-medium">Supplier</th>
                  <th className="text-center py-3 px-3 text-dark-300 font-medium">Items</th>
                  <th className="text-right py-3 px-3 text-dark-300 font-medium">Total</th>
                  <th className="text-right py-3 px-3 text-dark-300 font-medium">Commission</th>
                  <th className="text-right py-3 px-3 text-dark-300 font-medium">Transport</th>
                  <th className="text-right py-3 px-3 text-dark-300 font-medium">Grand Total</th>
                  <th className="text-left py-3 px-3 text-dark-300 font-medium">Status</th>
                  <th className="text-left py-3 px-3 text-dark-300 font-medium">Date</th>
                  <th className="text-center py-3 px-3 text-dark-300 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {grns.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-dark-400">
                      <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
                      <p>No GRNs recorded yet</p>
                    </td>
                  </tr>
                ) : (
                  grns.map((grn) => (
                    <tr
                      key={grn.id}
                      className="border-b border-dark-700/50 hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="py-2.5 px-3 text-dark-100 font-medium">{grn.grnNo}</td>
                      <td className="py-2.5 px-3 text-dark-300">{grn.supplierName}</td>
                      <td className="py-2.5 px-3 text-center text-dark-300">{grn.items.length}</td>
                      <td className="py-2.5 px-3 text-right text-dark-200">{formatLKR(grn.subtotal)}</td>
                      <td className="py-2.5 px-3 text-right text-warning-400">
                        {formatLKR(grn.commission)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-info-400">
                        {formatLKR(grn.transportCharge)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-primary-400 font-medium">
                        {formatLKR(grn.total)}
                      </td>
                      <td className="py-2.5 px-3">
                        <Badge variant={statusBadgeVariant[grn.status] || 'default'}>
                          {grn.status}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-dark-400">{formatDate(grn.createdAt)}</td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          onClick={() => {
                            setSelectedGRNId(grn.id);
                            setDetailModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-dark-300 hover:text-white hover:bg-white/10 transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Purchase Orders Tab */}
      {activeTab === 'purchase-orders' && (
        <div className="glass rounded-2xl p-5 animate-slide-up">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-dark-700">
                  <th className="text-left py-3 px-3 text-dark-300 font-medium">PO#</th>
                  <th className="text-left py-3 px-3 text-dark-300 font-medium">Supplier</th>
                  <th className="text-right py-3 px-3 text-dark-300 font-medium">Total</th>
                  <th className="text-left py-3 px-3 text-dark-300 font-medium">Status</th>
                  <th className="text-left py-3 px-3 text-dark-300 font-medium">Date</th>
                  <th className="text-center py-3 px-3 text-dark-300 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {purchaseOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-dark-400">
                      <ShoppingCart className="w-10 h-10 mx-auto mb-2 opacity-30" />
                      <p>No purchase orders yet</p>
                    </td>
                  </tr>
                ) : (
                  purchaseOrders.map((po) => (
                    <tr
                      key={po.id}
                      className="border-b border-dark-700/50 hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="py-2.5 px-3 text-dark-100 font-medium">{po.poNo}</td>
                      <td className="py-2.5 px-3 text-dark-300">{po.supplierName}</td>
                      <td className="py-2.5 px-3 text-right text-primary-400 font-medium">
                        {formatLKR(po.total)}
                      </td>
                      <td className="py-2.5 px-3">
                        <Badge variant={statusBadgeVariant[po.status] || 'default'}>
                          {po.status}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-dark-400">{formatDate(po.createdAt)}</td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          onClick={() => {
                            setSelectedGRNId(po.id);
                          }}
                          className="p-1.5 rounded-lg text-dark-300 hover:text-white hover:bg-white/10 transition-colors"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* New GRN Tab */}
      {activeTab === 'new-grn' && (
        <div className="space-y-6 animate-slide-up">
          {/* Supplier Selection */}
          <div className="glass rounded-2xl p-5">
            <h2 className="text-lg font-semibold text-dark-100 mb-4 flex items-center gap-2">
              <Truck className="w-5 h-5 text-primary-500" />
              Supplier & Items
            </h2>
            <div className="mb-6">
              <Select
                label="Supplier"
                options={supplierOptions}
                value={grnSupplierId}
                onChange={(e) => setGRNSupplierId(e.target.value)}
              />
            </div>

            {/* Item Rows */}
            <div className="space-y-3">
              {grnItems.map((item, index) => (
                <div
                  key={index}
                  className="grid grid-cols-12 gap-3 items-end p-3 rounded-xl bg-dark-800/50 border border-dark-700/50"
                >
                  <div className="col-span-12 sm:col-span-3">
                    <Select
                      label="Product"
                      options={productOptions}
                      value={item.productId}
                      onChange={(e) => updateGRNItem(index, 'productId', e.target.value)}
                    />
                  </div>
                  <div className="col-span-6 sm:col-span-2">
                    <Input
                      label="Qty"
                      type="number"
                      min={1}
                      value={String(item.quantity)}
                      onChange={(e) =>
                        updateGRNItem(index, 'quantity', Math.max(0, Number(e.target.value)))
                      }
                    />
                  </div>
                  <div className="col-span-6 sm:col-span-2">
                    <Input
                      label="Cost Price"
                      type="number"
                      min={0}
                      step={0.01}
                      value={String(item.costPrice)}
                      onChange={(e) =>
                        updateGRNItem(index, 'costPrice', Math.max(0, Number(e.target.value)))
                      }
                    />
                  </div>
                  <div className="col-span-6 sm:col-span-2">
                    <Input
                      label="Batch No"
                      value={item.batchNo}
                      onChange={(e) => updateGRNItem(index, 'batchNo', e.target.value)}
                      placeholder="Optional"
                    />
                  </div>
                  <div className="col-span-5 sm:col-span-2">
                    <Input
                      label="Expiry"
                      type="date"
                      value={item.expiryDate}
                      onChange={(e) => updateGRNItem(index, 'expiryDate', e.target.value)}
                    />
                  </div>
                  <div className="col-span-1 sm:col-span-1 flex items-end justify-end pb-1">
                    <button
                      onClick={() => removeGRNItemRow(index)}
                      disabled={grnItems.length <= 1}
                      className="p-1.5 rounded-lg text-dark-400 hover:text-primary-400 hover:bg-primary-600/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Remove row"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              <Button variant="secondary" size="sm" onClick={addGRNItemRow}>
                <Plus className="w-4 h-4" />
                Add Item
              </Button>
            </div>
          </div>

          {/* Commission & Transport */}
          <div className="glass rounded-2xl p-5">
            <h2 className="text-lg font-semibold text-dark-100 mb-4 flex items-center gap-2">
              <Truck className="w-5 h-5 text-primary-500" />
              Charges & Summary
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1.5">Commission</label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={String(commissionValue)}
                      onChange={(e) => setCommissionValue(Math.max(0, Number(e.target.value)))}
                    />
                  </div>
                  <div className="flex rounded-xl overflow-hidden border border-white/10">
                    <button
                      onClick={() => setCommissionType('percent')}
                      className={`px-3 py-2.5 text-sm font-medium transition-colors ${
                        commissionType === 'percent'
                          ? 'bg-primary-600 text-white'
                          : 'bg-dark-800 text-dark-300 hover:text-white'
                      }`}
                    >
                      %
                    </button>
                    <button
                      onClick={() => setCommissionType('fixed')}
                      className={`px-3 py-2.5 text-sm font-medium transition-colors ${
                        commissionType === 'fixed'
                          ? 'bg-primary-600 text-white'
                          : 'bg-dark-800 text-dark-300 hover:text-white'
                      }`}
                    >
                      Fixed
                    </button>
                  </div>
                </div>
              </div>
              <Input
                label="Transport Charge"
                type="number"
                min={0}
                step={0.01}
                value={String(transportCharge)}
                onChange={(e) => setTransportCharge(Math.max(0, Number(e.target.value)))}
              />
              <div />
            </div>

            {/* Summary */}
            <div className="bg-dark-800/50 rounded-xl p-4 space-y-2 border border-dark-700/50">
              <div className="flex justify-between text-sm">
                <span className="text-dark-300">Subtotal</span>
                <span className="text-dark-100">{formatLKR(grnSubtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-dark-300">Commission</span>
                <span className="text-warning-400">-{formatLKR(commissionAmount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-dark-300">Transport</span>
                <span className="text-info-400">+{formatLKR(transportCharge)}</span>
              </div>
              <div className="border-t border-dark-700/50 pt-2 flex justify-between">
                <span className="text-dark-100 font-semibold">Grand Total</span>
                <span className="text-primary-400 font-bold text-lg">{formatLKR(grnGrandTotal)}</span>
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end">
            <Button
              variant="primary"
              size="lg"
              onClick={handleCreateGRN}
              loading={grnSubmitting}
              disabled={!grnSupplierId || grnItems.every((i) => !i.productId || i.costPrice <= 0)}
            >
              <Package className="w-5 h-5" />
              Create GRN
            </Button>
          </div>
        </div>
      )}

      {/* New PO Tab */}
      {activeTab === 'new-po' && (
        <div className="space-y-6 animate-slide-up">
          {/* Supplier Selection */}
          <div className="glass rounded-2xl p-5">
            <h2 className="text-lg font-semibold text-dark-100 mb-4 flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-primary-500" />
              Purchase Order Details
            </h2>
            <div className="mb-6">
              <Select
                label="Supplier"
                options={supplierOptions}
                value={poSupplierId}
                onChange={(e) => setPOSupplierId(e.target.value)}
              />
            </div>

            {/* Item Rows */}
            <div className="space-y-3">
              {poItems.map((item, index) => (
                <div
                  key={index}
                  className="grid grid-cols-12 gap-3 items-end p-3 rounded-xl bg-dark-800/50 border border-dark-700/50"
                >
                  <div className="col-span-12 sm:col-span-5">
                    <Select
                      label="Product"
                      options={productOptions}
                      value={item.productId}
                      onChange={(e) => updatePOItem(index, 'productId', e.target.value)}
                    />
                  </div>
                  <div className="col-span-5 sm:col-span-3">
                    <Input
                      label="Qty"
                      type="number"
                      min={1}
                      value={String(item.quantity)}
                      onChange={(e) =>
                        updatePOItem(index, 'quantity', Math.max(0, Number(e.target.value)))
                      }
                    />
                  </div>
                  <div className="col-span-6 sm:col-span-3">
                    <Input
                      label="Cost Price"
                      type="number"
                      min={0}
                      step={0.01}
                      value={String(item.costPrice)}
                      onChange={(e) =>
                        updatePOItem(index, 'costPrice', Math.max(0, Number(e.target.value)))
                      }
                    />
                  </div>
                  <div className="col-span-1 sm:col-span-1 flex items-end justify-end pb-1">
                    <button
                      onClick={() => removePOItemRow(index)}
                      disabled={poItems.length <= 1}
                      className="p-1.5 rounded-lg text-dark-400 hover:text-primary-400 hover:bg-primary-600/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Remove row"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              <Button variant="secondary" size="sm" onClick={addPOItemRow}>
                <Plus className="w-4 h-4" />
                Add Item
              </Button>
            </div>
          </div>

          {/* PO Summary */}
          <div className="glass rounded-2xl p-5">
            <h2 className="text-lg font-semibold text-dark-100 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary-500" />
              Summary
            </h2>
            <div className="bg-dark-800/50 rounded-xl p-4 border border-dark-700/50">
              <div className="flex justify-between">
                <span className="text-dark-100 font-semibold">Total</span>
                <span className="text-primary-400 font-bold text-lg">{formatLKR(poTotal)}</span>
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end">
            <Button
              variant="primary"
              size="lg"
              onClick={handleCreatePO}
              loading={poSubmitting}
              disabled={!poSupplierId || poItems.every((i) => !i.productId || i.costPrice <= 0)}
            >
              <FileText className="w-5 h-5" />
              Create PO
            </Button>
          </div>
        </div>
      )}

      {/* GRN Detail Modal */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title="GRN Details"
        size="lg"
      >
        {selectedGRN && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-dark-400 mb-1">GRN Number</p>
                <p className="text-sm font-medium text-dark-100">{selectedGRN.grnNo}</p>
              </div>
              <div>
                <p className="text-xs text-dark-400 mb-1">Supplier</p>
                <p className="text-sm font-medium text-dark-100">{selectedGRN.supplierName}</p>
              </div>
              <div>
                <p className="text-xs text-dark-400 mb-1">Status</p>
                <Badge variant={statusBadgeVariant[selectedGRN.status] || 'default'}>
                  {selectedGRN.status}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-dark-400 mb-1">Date</p>
                <p className="text-sm font-medium text-dark-100">
                  {formatDate(selectedGRN.createdAt)}
                </p>
              </div>
              {selectedGRN.receivedBy && (
                <div>
                  <p className="text-xs text-dark-400 mb-1">Received By</p>
                  <p className="text-sm font-medium text-dark-100">{selectedGRN.receivedBy}</p>
                </div>
              )}
              {selectedGRN.receivedAt && (
                <div>
                  <p className="text-xs text-dark-400 mb-1">Received At</p>
                  <p className="text-sm font-medium text-dark-100">
                    {formatDate(selectedGRN.receivedAt)}
                  </p>
                </div>
              )}
            </div>

            {/* Items Table */}
            <div>
              <p className="text-xs text-dark-400 mb-2">Items</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-dark-700">
                      <th className="text-left py-2 px-2 text-dark-300 font-medium">Product</th>
                      <th className="text-right py-2 px-2 text-dark-300 font-medium">Qty</th>
                      <th className="text-right py-2 px-2 text-dark-300 font-medium">Cost</th>
                      <th className="text-right py-2 px-2 text-dark-300 font-medium">Total</th>
                      <th className="text-left py-2 px-2 text-dark-300 font-medium">Batch</th>
                      <th className="text-left py-2 px-2 text-dark-300 font-medium">Expiry</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedGRN.items.map((item, idx) => (
                      <tr
                        key={idx}
                        className="border-b border-dark-700/50 hover:bg-white/[0.02] transition-colors"
                      >
                        <td className="py-2 px-2 text-dark-100">{item.productName}</td>
                        <td className="py-2 px-2 text-right text-dark-200">{item.quantity}</td>
                        <td className="py-2 px-2 text-right text-dark-200">
                          {formatLKR(item.costPrice)}
                        </td>
                        <td className="py-2 px-2 text-right text-primary-400 font-medium">
                          {formatLKR(item.total)}
                        </td>
                        <td className="py-2 px-2 text-dark-400">
                          {item.batchNo || '-'}
                        </td>
                        <td className="py-2 px-2 text-dark-400">
                          {item.expiryDate ? formatDate(item.expiryDate) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totals */}
            <div className="bg-dark-800/50 rounded-xl p-4 space-y-2 border border-dark-700/50">
              <div className="flex justify-between text-sm">
                <span className="text-dark-300">Subtotal</span>
                <span className="text-dark-100">{formatLKR(selectedGRN.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-dark-300">Commission</span>
                <span className="text-warning-400">-{formatLKR(selectedGRN.commission)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-dark-300">Transport</span>
                <span className="text-info-400">+{formatLKR(selectedGRN.transportCharge)}</span>
              </div>
              <div className="border-t border-dark-700/50 pt-2 flex justify-between">
                <span className="text-dark-100 font-semibold">Grand Total</span>
                <span className="text-primary-400 font-bold text-lg">
                  {formatLKR(selectedGRN.total)}
                </span>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
