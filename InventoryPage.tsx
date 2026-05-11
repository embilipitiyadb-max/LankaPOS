import { useState, useMemo } from 'react';
import { useStore } from '../../store/useStore';
import { formatLKR, generateBarcode, formatDate } from '../../lib/utils';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Badge from '../../components/ui/Badge';
import {
  Plus,
  Edit2,
  Trash2,
  Search,
  Package,
  QrCode,
  ArrowUpDown,
  Tag,
  ClipboardList,
  Printer,
  Shuffle,
} from 'lucide-react';

type TabKey = 'products' | 'categories' | 'adjustments' | 'barcode';

interface ProductForm {
  name: string;
  nameLocal: string;
  barcode: string;
  category: string;
  costPrice: string;
  sellingPrice: string;
  stock: string;
  minStock: string;
  unit: string;
  tax: string;
  hasVariants: boolean;
}

interface CategoryForm {
  name: string;
  nameLocal: string;
  color: string;
}

interface AdjustmentForm {
  productId: string;
  type: 'add' | 'remove' | 'damage' | 'transfer';
  quantity: string;
  reason: string;
}

const emptyProductForm: ProductForm = {
  name: '',
  nameLocal: '',
  barcode: '',
  category: '',
  costPrice: '',
  sellingPrice: '',
  stock: '',
  minStock: '',
  unit: 'piece',
  tax: '0',
  hasVariants: false,
};

const emptyCategoryForm: CategoryForm = {
  name: '',
  nameLocal: '',
  color: '#ef4444',
};

const emptyAdjustmentForm: AdjustmentForm = {
  productId: '',
  type: 'add',
  quantity: '',
  reason: '',
};

const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'products', label: 'Products', icon: <Package className="w-4 h-4" /> },
  { key: 'categories', label: 'Categories', icon: <Tag className="w-4 h-4" /> },
  { key: 'adjustments', label: 'Stock Adjustments', icon: <ClipboardList className="w-4 h-4" /> },
  { key: 'barcode', label: 'Barcode Generator', icon: <QrCode className="w-4 h-4" /> },
];

const unitOptions = [
  { value: 'piece', label: 'Piece' },
  { value: 'pack', label: 'Pack' },
  { value: 'bottle', label: 'Bottle' },
  { value: 'kg', label: 'Kg' },
  { value: 'g', label: 'Gram' },
  { value: 'L', label: 'Liter' },
  { value: 'ml', label: 'Milliliter' },
  { value: 'box', label: 'Box' },
  { value: 'carton', label: 'Carton' },
  { value: 'ream', label: 'Ream' },
  { value: 'tube', label: 'Tube' },
  { value: 'cup', label: 'Cup' },
];

const adjustmentTypeOptions = [
  { value: 'add', label: 'Add Stock' },
  { value: 'remove', label: 'Remove Stock' },
  { value: 'damage', label: 'Damaged' },
  { value: 'transfer', label: 'Transfer' },
];

function BarcodeSVG({ barcode }: { barcode: string }) {
  const digits = barcode.split('').map(Number);
  const quietZone = 14;
  const moduleWidth = 2;
  const barHeight = 70;
  const startX = quietZone;

  const encodeDigit = (d: number, isEven: boolean): number[] => {
    const parityTable: Record<number, number[]> = {
      0: [0, 0, 0, 1, 1, 0, 1],
      1: [0, 0, 1, 0, 1, 1, 0],
      2: [0, 0, 1, 1, 0, 1, 0],
      3: [0, 1, 0, 0, 1, 1, 0],
      4: [0, 1, 1, 0, 0, 1, 0],
      5: [0, 1, 1, 1, 0, 0, 0],
      6: [0, 1, 0, 0, 1, 0, 1],
      7: [0, 1, 1, 0, 1, 0, 0],
      8: [0, 1, 0, 1, 0, 0, 1],
      9: [0, 1, 0, 1, 1, 0, 0],
    };
    const rParity: Record<number, number[]> = {
      0: [1, 1, 1, 0, 0, 1, 0],
      1: [1, 1, 0, 1, 0, 0, 1],
      2: [1, 1, 0, 0, 1, 0, 1],
      3: [1, 0, 1, 1, 0, 0, 1],
      4: [1, 0, 0, 1, 1, 0, 1],
      5: [1, 0, 0, 0, 1, 1, 1],
      6: [1, 0, 1, 1, 1, 0, 0],
      7: [1, 0, 0, 1, 0, 1, 1],
      8: [1, 0, 1, 0, 1, 1, 0],
      9: [1, 0, 1, 0, 0, 1, 1],
    };
    return isEven ? rParity[d] : parityTable[d];
  };

  const modules: number[] = [];
  // Start guard
  modules.push(1, 0, 1);
  // Left side (digits 0-5)
  for (let i = 0; i < 6; i++) {
    const enc = encodeDigit(digits[i], i % 2 !== 0);
    modules.push(...enc);
  }
  // Center guard
  modules.push(0, 1, 0, 1, 0);
  // Right side (digits 6-11)
  for (let i = 6; i < 12; i++) {
    const enc = encodeDigit(digits[i], true);
    modules.push(...enc);
  }
  // End guard
  modules.push(1, 0, 1);

  const totalWidth = (modules.length + quietZone * 2) * moduleWidth;
  let x = startX;

  const bars: { x: number; w: number; h: number; y: number }[] = [];
  for (let i = 0; i < modules.length; i++) {
    if (modules[i] === 1) {
      const isGuard = i < 3 || (i >= 45 && i <= 49) || i >= 62;
      bars.push({
        x: x * moduleWidth,
        w: moduleWidth,
        h: isGuard ? barHeight + 5 : barHeight,
        y: 0,
      });
    }
    x++;
  }

  return (
    <svg
      width={totalWidth}
      height={barHeight + 30}
      viewBox={`0 0 ${totalWidth} ${barHeight + 30}`}
      className="mx-auto"
    >
      <rect width={totalWidth} height={barHeight + 30} fill="white" rx="4" />
      {bars.map((bar, i) => (
        <rect key={i} x={bar.x} y={bar.y} width={bar.w} height={bar.h} fill="black" />
      ))}
      <text
        x={totalWidth / 2}
        y={barHeight + 20}
        textAnchor="middle"
        fontSize="12"
        fontFamily="monospace"
        fill="black"
      >
        {barcode}
      </text>
    </svg>
  );
}

export default function InventoryPage() {
  const {
    products,
    categories,
    stockAdjustments,
    addProduct,
    updateProduct,
    deleteProduct,
    addCategory,
    updateCategory,
    deleteCategory,
    addStockAdjustment,
    currentUser,
  } = useStore();

  const [activeTab, setActiveTab] = useState<TabKey>('products');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sortField, setSortField] = useState<string>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Product modal state
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  const [productForm, setProductForm] = useState<ProductForm>(emptyProductForm);
  const [deleteProductModalOpen, setDeleteProductModalOpen] = useState(false);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);

  // Category modal state
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [categoryForm, setCategoryForm] = useState<CategoryForm>(emptyCategoryForm);
  const [deleteCategoryModalOpen, setDeleteCategoryModalOpen] = useState(false);
  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(null);

  // Adjustment modal state
  const [adjustmentModalOpen, setAdjustmentModalOpen] = useState(false);
  const [adjustmentForm, setAdjustmentForm] = useState<AdjustmentForm>(emptyAdjustmentForm);

  // Barcode state
  const [barcodeProductId, setBarcodeProductId] = useState('');

  const categoryOptions = useMemo(
    () => [
      { value: '', label: 'All Categories' },
      ...categories.map((c) => ({ value: c.id, label: c.name })),
    ],
    [categories]
  );

  const productOptions = useMemo(
    () => [
      { value: '', label: 'Select Product' },
      ...products.map((p) => ({ value: p.id, label: `${p.name} (${p.barcode})` })),
    ],
    [products]
  );

  const categoryOptionsNoAll = useMemo(
    () => [
      { value: '', label: 'Select Category' },
      ...categories.map((c) => ({ value: c.id, label: c.name })),
    ],
    [categories]
  );

  // Filtered and sorted products
  const filteredProducts = useMemo(() => {
    let list = [...products];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.barcode.includes(q) ||
          (p.nameLocal && p.nameLocal.toLowerCase().includes(q))
      );
    }
    if (categoryFilter) {
      list = list.filter((p) => p.category === categoryFilter);
    }
    list.sort((a, b) => {
      const aVal = a[sortField as keyof typeof a] ?? '';
      const bVal = b[sortField as keyof typeof b] ?? '';
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDir === 'asc'
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });
    return list;
  }, [products, searchQuery, categoryFilter, sortField, sortDir]);

  const getCategoryName = (id: string) => categories.find((c) => c.id === id)?.name || '—';
  const getCategoryColor = (id: string) => categories.find((c) => c.id === id)?.color || '#737373';

  const getStockStatus = (stock: number, minStock: number) => {
    if (stock === 0) return { label: 'Out of Stock', variant: 'danger' as const };
    if (stock <= minStock) return { label: 'Low Stock', variant: 'warning' as const };
    return { label: 'In Stock', variant: 'success' as const };
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  // Product CRUD
  const openAddProduct = () => {
    setEditingProduct(null);
    setProductForm({ ...emptyProductForm, barcode: generateBarcode() });
    setProductModalOpen(true);
  };

  const openEditProduct = (id: string) => {
    const p = products.find((x) => x.id === id);
    if (!p) return;
    setEditingProduct(id);
    setProductForm({
      name: p.name,
      nameLocal: p.nameLocal || '',
      barcode: p.barcode,
      category: p.category,
      costPrice: String(p.costPrice),
      sellingPrice: String(p.sellingPrice),
      stock: String(p.stock),
      minStock: String(p.minStock),
      unit: p.unit,
      tax: String(p.tax),
      hasVariants: p.hasVariants,
    });
    setProductModalOpen(true);
  };

  const handleSaveProduct = async () => {
    const data = {
      name: productForm.name,
      nameLocal: productForm.nameLocal || undefined,
      barcode: productForm.barcode,
      category: productForm.category,
      costPrice: Number(productForm.costPrice) || 0,
      sellingPrice: Number(productForm.sellingPrice) || 0,
      stock: Number(productForm.stock) || 0,
      minStock: Number(productForm.minStock) || 0,
      unit: productForm.unit,
      tax: Number(productForm.tax) || 0,
      hasVariants: productForm.hasVariants,
      damagedStock: 0,
      isActive: true,
    };
    if (editingProduct) {
      await updateProduct(editingProduct, data);
    } else {
      await addProduct(data);
    }
    setProductModalOpen(false);
  };

  const openDeleteProduct = (id: string) => {
    setDeletingProductId(id);
    setDeleteProductModalOpen(true);
  };

  const handleDeleteProduct = async () => {
    if (deletingProductId) {
      await deleteProduct(deletingProductId);
      setDeleteProductModalOpen(false);
      setDeletingProductId(null);
    }
  };

  // Category CRUD
  const openAddCategory = () => {
    setEditingCategory(null);
    setCategoryForm(emptyCategoryForm);
    setCategoryModalOpen(true);
  };

  const openEditCategory = (id: string) => {
    const c = categories.find((x) => x.id === id);
    if (!c) return;
    setEditingCategory(id);
    setCategoryForm({
      name: c.name,
      nameLocal: c.nameLocal || '',
      color: c.color || '#ef4444',
    });
    setCategoryModalOpen(true);
  };

  const handleSaveCategory = async () => {
    const data = {
      name: categoryForm.name,
      nameLocal: categoryForm.nameLocal || undefined,
      color: categoryForm.color,
    };
    if (editingCategory) {
      await updateCategory(editingCategory, data);
    } else {
      await addCategory(data);
    }
    setCategoryModalOpen(false);
  };

  const openDeleteCategory = (id: string) => {
    setDeletingCategoryId(id);
    setDeleteCategoryModalOpen(true);
  };

  const handleDeleteCategory = async () => {
    if (deletingCategoryId) {
      await deleteCategory(deletingCategoryId);
      setDeleteCategoryModalOpen(false);
      setDeletingCategoryId(null);
    }
  };

  // Stock Adjustment
  const openAddAdjustment = () => {
    setAdjustmentForm(emptyAdjustmentForm);
    setAdjustmentModalOpen(true);
  };

  const handleSaveAdjustment = async () => {
    const p = products.find((x) => x.id === adjustmentForm.productId);
    if (!p) return;
    await addStockAdjustment({
      productId: p.id,
      productName: p.name,
      type: adjustmentForm.type,
      quantity: Number(adjustmentForm.quantity) || 0,
      reason: adjustmentForm.reason,
      adjustedBy: currentUser?.name || 'Admin',
    });
    setAdjustmentModalOpen(false);
  };

  // Barcode
  const selectedBarcodeProduct = products.find((p) => p.id === barcodeProductId);

  const handlePrintBarcode = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow || !selectedBarcodeProduct) return;
    const svgEl = document.getElementById('barcode-svg-container');
    if (!svgEl) return;
    printWindow.document.write(`
      <html>
        <head><title>Print Barcode</title></head>
        <body style="display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;">
          <div style="text-align:center;">
            <div style="font-weight:bold;font-size:16px;margin-bottom:4px;">${selectedBarcodeProduct.name}</div>
            ${svgEl.innerHTML}
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const getAdjustmentBadge = (type: string) => {
    switch (type) {
      case 'add':
        return <Badge variant="success">Add</Badge>;
      case 'remove':
        return <Badge variant="danger">Remove</Badge>;
      case 'damage':
        return <Badge variant="warning">Damage</Badge>;
      case 'transfer':
        return <Badge variant="info">Transfer</Badge>;
      default:
        return <Badge>{type}</Badge>;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-primary-600/10 border border-primary-600/20">
          <Package className="w-6 h-6 text-primary-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Inventory Management</h1>
          <p className="text-sm text-dark-400">Manage products, categories, and stock</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 glass rounded-xl">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 flex-1 justify-center ${
              activeTab === tab.key
                ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/20'
                : 'text-dark-300 hover:text-white hover:bg-white/5'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Products Tab */}
      {activeTab === 'products' && (
        <div className="space-y-4 animate-fade-in">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={openAddProduct} size="sm">
              <Plus className="w-4 h-4" />
              Add Product
            </Button>
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                icon={<Search className="w-4 h-4" />}
              />
            </div>
            <div className="min-w-[180px]">
              <Select
                options={categoryOptions}
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              />
            </div>
          </div>

          {/* Products Table */}
          <div className="glass rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5">
                    {[
                      { key: 'name', label: 'Name' },
                      { key: 'barcode', label: 'Barcode' },
                      { key: 'category', label: 'Category' },
                      { key: 'costPrice', label: 'Cost' },
                      { key: 'sellingPrice', label: 'Price' },
                      { key: 'stock', label: 'Stock' },
                      { key: 'status', label: 'Status' },
                    ].map((col) => (
                      <th
                        key={col.key}
                        className="px-4 py-3 text-left text-dark-400 font-medium cursor-pointer hover:text-white transition-colors"
                        onClick={() => col.key !== 'status' && handleSort(col.key)}
                      >
                        <span className="inline-flex items-center gap-1">
                          {col.label}
                          {sortField === col.key && (
                            <ArrowUpDown className="w-3 h-3 text-primary-500" />
                          )}
                        </span>
                      </th>
                    ))}
                    <th className="px-4 py-3 text-right text-dark-400 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-dark-400">
                        <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
                        <p>No products found</p>
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((p) => {
                      const status = getStockStatus(p.stock, p.minStock);
                      return (
                        <tr
                          key={p.id}
                          className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                        >
                          <td className="px-4 py-3">
                            <div className="font-medium text-white">{p.name}</div>
                            {p.nameLocal && (
                              <div className="text-xs text-dark-400">{p.nameLocal}</div>
                            )}
                          </td>
                          <td className="px-4 py-3 font-mono text-dark-300 text-xs">
                            {p.barcode}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className="inline-flex items-center gap-1.5 text-xs"
                            >
                              <span
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: getCategoryColor(p.category) }}
                              />
                              {getCategoryName(p.category)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-dark-300">{formatLKR(p.costPrice)}</td>
                          <td className="px-4 py-3 text-white font-medium">
                            {formatLKR(p.sellingPrice)}
                          </td>
                          <td className="px-4 py-3 text-dark-200">{p.stock}</td>
                          <td className="px-4 py-3">
                            <Badge variant={status.variant}>{status.label}</Badge>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => openEditProduct(p.id)}
                                className="p-1.5 rounded-lg text-dark-400 hover:text-info-400 hover:bg-info-500/10 transition-colors"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => openDeleteProduct(p.id)}
                                className="p-1.5 rounded-lg text-dark-400 hover:text-primary-400 hover:bg-primary-500/10 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Add/Edit Product Modal */}
          <Modal
            isOpen={productModalOpen}
            onClose={() => setProductModalOpen(false)}
            title={editingProduct ? 'Edit Product' : 'Add Product'}
            size="lg"
          >
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Product Name"
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  placeholder="Enter product name"
                />
                <Input
                  label="Local Name"
                  value={productForm.nameLocal}
                  onChange={(e) => setProductForm({ ...productForm, nameLocal: e.target.value })}
                  placeholder="Name in local language"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Input
                      label="Barcode"
                      value={productForm.barcode}
                      onChange={(e) => setProductForm({ ...productForm, barcode: e.target.value })}
                      placeholder="Barcode"
                    />
                  </div>
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={() =>
                      setProductForm({ ...productForm, barcode: generateBarcode() })
                    }
                    className="mb-0.5"
                  >
                    <Shuffle className="w-4 h-4" />
                  </Button>
                </div>
                <Select
                  label="Category"
                  options={categoryOptionsNoAll}
                  value={productForm.category}
                  onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Cost Price"
                  type="number"
                  value={productForm.costPrice}
                  onChange={(e) => setProductForm({ ...productForm, costPrice: e.target.value })}
                  placeholder="0.00"
                />
                <Input
                  label="Selling Price"
                  type="number"
                  value={productForm.sellingPrice}
                  onChange={(e) =>
                    setProductForm({ ...productForm, sellingPrice: e.target.value })
                  }
                  placeholder="0.00"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input
                  label="Stock"
                  type="number"
                  value={productForm.stock}
                  onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })}
                  placeholder="0"
                />
                <Input
                  label="Min Stock"
                  type="number"
                  value={productForm.minStock}
                  onChange={(e) => setProductForm({ ...productForm, minStock: e.target.value })}
                  placeholder="0"
                />
                <Select
                  label="Unit"
                  options={unitOptions}
                  value={productForm.unit}
                  onChange={(e) => setProductForm({ ...productForm, unit: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Tax %"
                  type="number"
                  value={productForm.tax}
                  onChange={(e) => setProductForm({ ...productForm, tax: e.target.value })}
                  placeholder="0"
                />
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <div
                      className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
                        productForm.hasVariants ? 'bg-primary-600' : 'bg-dark-600'
                      }`}
                      onClick={() =>
                        setProductForm({
                          ...productForm,
                          hasVariants: !productForm.hasVariants,
                        })
                      }
                    >
                      <div
                        className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${
                          productForm.hasVariants ? 'translate-x-5.5' : 'translate-x-0.5'
                        }`}
                      />
                    </div>
                    <span className="text-sm text-dark-200">Has Variants</span>
                  </label>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="secondary" onClick={() => setProductModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveProduct}
                  disabled={!productForm.name || !productForm.barcode || !productForm.category}
                >
                  {editingProduct ? 'Update Product' : 'Add Product'}
                </Button>
              </div>
            </div>
          </Modal>

          {/* Delete Product Modal */}
          <Modal
            isOpen={deleteProductModalOpen}
            onClose={() => setDeleteProductModalOpen(false)}
            title="Delete Product"
            size="sm"
          >
            <div className="space-y-4">
              <p className="text-dark-200 text-sm">
                Are you sure you want to delete{' '}
                <span className="text-white font-medium">
                  {products.find((p) => p.id === deletingProductId)?.name}
                </span>
                ? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <Button variant="secondary" onClick={() => setDeleteProductModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="danger" onClick={handleDeleteProduct}>
                  <Trash2 className="w-4 h-4" />
                  Delete
                </Button>
              </div>
            </div>
          </Modal>
        </div>
      )}

      {/* Categories Tab */}
      {activeTab === 'categories' && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex justify-end">
            <Button onClick={openAddCategory} size="sm">
              <Plus className="w-4 h-4" />
              Add Category
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="glass rounded-xl p-5 hover:border-white/10 transition-all duration-200 group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: cat.color + '20' }}
                    >
                      <Tag className="w-5 h-5" style={{ color: cat.color }} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{cat.name}</h3>
                      {cat.nameLocal && (
                        <p className="text-xs text-dark-400">{cat.nameLocal}</p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-dark-400">
                    {products.filter((p) => p.category === cat.id).length} products
                  </span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEditCategory(cat.id)}
                      className="p-1.5 rounded-lg text-dark-400 hover:text-info-400 hover:bg-info-500/10 transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => openDeleteCategory(cat.id)}
                      className="p-1.5 rounded-lg text-dark-400 hover:text-primary-400 hover:bg-primary-500/10 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div
                  className="mt-3 h-1 rounded-full"
                  style={{ backgroundColor: cat.color, opacity: 0.3 }}
                />
              </div>
            ))}
          </div>

          {/* Add/Edit Category Modal */}
          <Modal
            isOpen={categoryModalOpen}
            onClose={() => setCategoryModalOpen(false)}
            title={editingCategory ? 'Edit Category' : 'Add Category'}
            size="md"
          >
            <div className="space-y-4">
              <Input
                label="Category Name"
                value={categoryForm.name}
                onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                placeholder="Enter category name"
              />
              <Input
                label="Local Name"
                value={categoryForm.nameLocal}
                onChange={(e) => setCategoryForm({ ...categoryForm, nameLocal: e.target.value })}
                placeholder="Name in local language"
              />
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1.5">
                  Color
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={categoryForm.color}
                    onChange={(e) => setCategoryForm({ ...categoryForm, color: e.target.value })}
                    className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-0"
                  />
                  <div className="flex gap-2">
                    {['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'].map(
                      (color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setCategoryForm({ ...categoryForm, color })}
                          className={`w-7 h-7 rounded-full border-2 transition-transform ${
                            categoryForm.color === color
                              ? 'border-white scale-110'
                              : 'border-transparent hover:scale-105'
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      )
                    )}
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="secondary" onClick={() => setCategoryModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveCategory}
                  disabled={!categoryForm.name}
                >
                  {editingCategory ? 'Update Category' : 'Add Category'}
                </Button>
              </div>
            </div>
          </Modal>

          {/* Delete Category Modal */}
          <Modal
            isOpen={deleteCategoryModalOpen}
            onClose={() => setDeleteCategoryModalOpen(false)}
            title="Delete Category"
            size="sm"
          >
            <div className="space-y-4">
              <p className="text-dark-200 text-sm">
                Are you sure you want to delete{' '}
                <span className="text-white font-medium">
                  {categories.find((c) => c.id === deletingCategoryId)?.name}
                </span>
                ? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <Button variant="secondary" onClick={() => setDeleteCategoryModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="danger" onClick={handleDeleteCategory}>
                  <Trash2 className="w-4 h-4" />
                  Delete
                </Button>
              </div>
            </div>
          </Modal>
        </div>
      )}

      {/* Stock Adjustments Tab */}
      {activeTab === 'adjustments' && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex justify-end">
            <Button onClick={openAddAdjustment} size="sm">
              <Plus className="w-4 h-4" />
              New Adjustment
            </Button>
          </div>

          <div className="glass rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="px-4 py-3 text-left text-dark-400 font-medium">Product</th>
                    <th className="px-4 py-3 text-left text-dark-400 font-medium">Type</th>
                    <th className="px-4 py-3 text-left text-dark-400 font-medium">Quantity</th>
                    <th className="px-4 py-3 text-left text-dark-400 font-medium">Reason</th>
                    <th className="px-4 py-3 text-left text-dark-400 font-medium">Adjusted By</th>
                    <th className="px-4 py-3 text-left text-dark-400 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {stockAdjustments.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-dark-400">
                        <ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-30" />
                        <p>No stock adjustments yet</p>
                      </td>
                    </tr>
                  ) : (
                    stockAdjustments.map((adj) => (
                      <tr
                        key={adj.id}
                        className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                      >
                        <td className="px-4 py-3 text-white font-medium">
                          {adj.productName}
                        </td>
                        <td className="px-4 py-3">{getAdjustmentBadge(adj.type)}</td>
                        <td className="px-4 py-3 text-dark-200">{adj.quantity}</td>
                        <td className="px-4 py-3 text-dark-300">{adj.reason || '—'}</td>
                        <td className="px-4 py-3 text-dark-300">{adj.adjustedBy}</td>
                        <td className="px-4 py-3 text-dark-400 text-xs">
                          {formatDate(adj.adjustedAt)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* New Adjustment Modal */}
          <Modal
            isOpen={adjustmentModalOpen}
            onClose={() => setAdjustmentModalOpen(false)}
            title="New Stock Adjustment"
            size="md"
          >
            <div className="space-y-4">
              <Select
                label="Product"
                options={productOptions}
                value={adjustmentForm.productId}
                onChange={(e) =>
                  setAdjustmentForm({ ...adjustmentForm, productId: e.target.value })
                }
              />
              <Select
                label="Adjustment Type"
                options={adjustmentTypeOptions}
                value={adjustmentForm.type}
                onChange={(e) =>
                  setAdjustmentForm({
                    ...adjustmentForm,
                    type: e.target.value as AdjustmentForm['type'],
                  })
                }
              />
              <Input
                label="Quantity"
                type="number"
                value={adjustmentForm.quantity}
                onChange={(e) =>
                  setAdjustmentForm({ ...adjustmentForm, quantity: e.target.value })
                }
                placeholder="0"
              />
              <Input
                label="Reason"
                value={adjustmentForm.reason}
                onChange={(e) =>
                  setAdjustmentForm({ ...adjustmentForm, reason: e.target.value })
                }
                placeholder="Enter reason for adjustment"
              />
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="secondary" onClick={() => setAdjustmentModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveAdjustment}
                  disabled={
                    !adjustmentForm.productId || !adjustmentForm.quantity || Number(adjustmentForm.quantity) <= 0
                  }
                >
                  Save Adjustment
                </Button>
              </div>
            </div>
          </Modal>
        </div>
      )}

      {/* Barcode Generator Tab */}
      {activeTab === 'barcode' && (
        <div className="space-y-4 animate-fade-in">
          <div className="glass rounded-xl p-6">
            <div className="max-w-md mx-auto space-y-6">
              <Select
                label="Select Product"
                options={productOptions}
                value={barcodeProductId}
                onChange={(e) => setBarcodeProductId(e.target.value)}
              />

              {selectedBarcodeProduct && (
                <div className="space-y-4 animate-scale-in">
                  <div className="text-center">
                    <h3 className="text-lg font-semibold text-white mb-1">
                      {selectedBarcodeProduct.name}
                    </h3>
                    {selectedBarcodeProduct.nameLocal && (
                      <p className="text-sm text-dark-400 mb-4">
                        {selectedBarcodeProduct.nameLocal}
                      </p>
                    )}
                  </div>
                  <div
                    id="barcode-svg-container"
                    className="p-4 bg-white rounded-xl inline-block w-full"
                  >
                    <BarcodeSVG barcode={selectedBarcodeProduct.barcode} />
                  </div>
                  <div className="text-center text-sm text-dark-400">
                    <p>
                      Category: {getCategoryName(selectedBarcodeProduct.category)} | Price:{' '}
                      {formatLKR(selectedBarcodeProduct.sellingPrice)}
                    </p>
                  </div>
                  <div className="flex justify-center">
                    <Button onClick={handlePrintBarcode}>
                      <Printer className="w-4 h-4" />
                      Print Barcode
                    </Button>
                  </div>
                </div>
              )}

              {!selectedBarcodeProduct && (
                <div className="text-center py-8 text-dark-400">
                  <QrCode className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>Select a product to generate its barcode</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
