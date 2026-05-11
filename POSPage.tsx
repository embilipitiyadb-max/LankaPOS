import { useState, useRef, useEffect, useMemo } from 'react';
import { useStore } from '../../store/useStore';
import { formatLKR } from '../../lib/utils';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import {
  Search, Plus, Minus, Trash2, ShoppingCart, CreditCard, Banknote,
  Printer, Barcode, PauseCircle, FileText, XCircle, Receipt,
  HandCoins, Users, Tag
} from 'lucide-react';

type PaymentMode = 'cash' | 'card' | 'credit' | 'split';

export default function POSPage() {
  const {
    products, categories, customers, cart, cartDiscount, cartCustomer,
    heldBills, draftBills, settings, currentUser,
    addToCart, removeFromCart, updateCartItem, setCartDiscount,
    setCartCustomer, clearCart, holdBill, recallHeldBill, removeHeldBill,
    saveDraft, recallDraft, removeDraft, addTransaction,
  } = useStore();

  // Search & filter
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const searchRef = useRef<HTMLInputElement>(null);

  // Payment UI
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('cash');
  const [cashAmount, setCashAmount] = useState('');
  const [_cardAmount, setCardAmount] = useState('');
  void _cardAmount;
  const [splitCash, setSplitCash] = useState('');
  const [splitCard, setSplitCard] = useState('');
  const [discountInput, setDiscountInput] = useState('');
  const [discountType, setDiscountType] = useState<'rs' | 'percent'>('rs');

  // Modals
  const [showReceipt, setShowReceipt] = useState(false);
  const [showHeldBills, setShowHeldBills] = useState(false);
  const [showDraftBills, setShowDraftBills] = useState(false);
  const [lastTransaction, setLastTransaction] = useState<{
    invoiceNo: string; items: typeof cart; subtotal: number;
    discount: number; tax: number; total: number;
    paymentMethod: string; cashAmount?: number; cardAmount?: number;
    changeAmount?: number; customerName?: string;
  } | null>(null);

  // Mobile cart panel
  const [mobileCartOpen, setMobileCartOpen] = useState(false);

  // Auto-focus search on mount
  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  // Sync discount input with store
  useEffect(() => {
    if (cartDiscount === 0) setDiscountInput('');
  }, [cartDiscount]);

  // Filtered products
  const filteredProducts = useMemo(() => {
    let list = products.filter((p) => p.isActive);
    if (activeCategory !== 'all') {
      list = list.filter((p) => p.category === activeCategory);
    }
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.barcode.includes(q) ||
          (p.nameLocal && p.nameLocal.toLowerCase().includes(q))
      );
    }
    return list;
  }, [products, activeCategory, search]);

  // Barcode scan on Enter
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && search.trim()) {
      const barcode = search.trim();
      const product = products.find(
        (p) => p.barcode === barcode && p.isActive && p.stock > 0
      );
      if (product) {
        handleAddToCart(product);
        setSearch('');
      }
    }
  };

  // Add product to cart
  const handleAddToCart = (product: typeof products[0]) => {
    if (product.stock <= 0) return;
    const existing = cart.find((c) => c.productId === product.id);
    const currentQty = existing ? existing.quantity : 0;
    if (currentQty >= product.stock) return;
    addToCart({
      productId: product.id,
      productName: product.name,
      barcode: product.barcode,
      quantity: 1,
      costPrice: product.costPrice,
      sellingPrice: product.sellingPrice,
      discount: 0,
      total: product.sellingPrice,
      maxStock: product.stock,
    });
  };

  // Cart calculations
  const subtotal = cart.reduce((s, i) => s + i.sellingPrice * i.quantity, 0);
  const discountAmount = discountType === 'percent'
    ? Math.min(subtotal * (cartDiscount / 100), subtotal)
    : Math.min(cartDiscount, subtotal);
  const taxRate = settings.taxRate || 0;
  const taxableAmount = subtotal - discountAmount;
  const tax = taxableAmount * (taxRate / 100);
  const total = Math.round((taxableAmount + tax) * 100) / 100;

  // Handle discount input change
  const handleDiscountChange = (val: string) => {
    setDiscountInput(val);
    const num = parseFloat(val) || 0;
    setCartDiscount(num);
  };

  // Cash change calculation
  const cashNum = parseFloat(cashAmount) || 0;
  const changeAmount = paymentMode === 'cash' ? Math.max(0, cashNum - total) : 0;

  // Split change
  const splitCashNum = parseFloat(splitCash) || 0;
  const splitCardNum = parseFloat(splitCard) || 0;

  // Can pay?
  const canPay = cart.length > 0 && (() => {
    if (paymentMode === 'cash') return cashNum >= total;
    if (paymentMode === 'card') return true;
    if (paymentMode === 'credit') return !!cartCustomer;
    if (paymentMode === 'split') return (splitCashNum + splitCardNum) >= total;
    return false;
  })();

  // Pay & Print
  const handlePayAndPrint = async () => {
    if (!canPay || !currentUser) return;

    let payMethod: 'cash' | 'card' | 'credit' | 'multiple' = paymentMode as 'cash' | 'card' | 'credit' | 'multiple';
    if (paymentMode === 'split') payMethod = 'multiple';

    const customer = customers.find((c) => c.id === cartCustomer);

    const txData: Parameters<typeof addTransaction>[0] = {
      items: cart.map((i) => ({
        productId: i.productId,
        productName: i.productName,
        barcode: i.barcode,
        quantity: i.quantity,
        costPrice: i.costPrice,
        sellingPrice: i.sellingPrice,
        discount: i.discount,
        total: i.quantity * i.sellingPrice - i.discount,
      })),
      subtotal,
      discount: discountAmount,
      tax,
      total,
      paymentMethod: payMethod,
      cashAmount: paymentMode === 'cash' ? cashNum : paymentMode === 'split' ? splitCashNum : undefined,
      cardAmount: paymentMode === 'card' ? total : paymentMode === 'split' ? splitCardNum : undefined,
      changeAmount: paymentMode === 'cash' ? changeAmount : paymentMode === 'split' ? Math.max(0, splitCashNum + splitCardNum - total) : undefined,
      customerId: cartCustomer || undefined,
      customerName: customer?.name || undefined,
      cashierId: currentUser.id,
      cashierName: currentUser.name,
      status: 'completed',
    };

    await addTransaction(txData);

    setLastTransaction({
      invoiceNo: '',
      items: [...cart],
      subtotal,
      discount: discountAmount,
      tax,
      total,
      paymentMethod: payMethod,
      cashAmount: paymentMode === 'cash' ? cashNum : paymentMode === 'split' ? splitCashNum : undefined,
      cardAmount: paymentMode === 'card' ? total : paymentMode === 'split' ? splitCardNum : undefined,
      changeAmount: paymentMode === 'cash' ? changeAmount : paymentMode === 'split' ? Math.max(0, splitCashNum + splitCardNum - total) : undefined,
      customerName: customer?.name,
    });

    setShowReceipt(true);
    clearCart();
    setCashAmount('');
    setCardAmount('');
    setSplitCash('');
    setSplitCard('');
    setDiscountInput('');
    setCartDiscount(0);
    setPaymentMode('cash');
  };

  // Print receipt
  const handlePrint = () => {
    window.print();
  };

  // Quick cash amounts
  const quickCashAmounts = [
    Math.ceil(total / 100) * 100,
    Math.ceil(total / 500) * 500,
    Math.ceil(total / 1000) * 1000,
  ].filter((v, i, a) => v > 0 && a.indexOf(v) === i && v >= total).slice(0, 4);

  // Cart item count
  const cartItemCount = cart.reduce((s, i) => s + i.quantity, 0);

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col lg:flex-row gap-0 overflow-hidden">
      {/* LEFT SIDE - Product Browser */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Search Bar */}
        <div className="p-3 sm:p-4 shrink-0">
          <div className="relative">
            <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Scan barcode or search products..."
              className="w-full pl-11 pr-10 py-3 rounded-xl bg-dark-800 border border-white/10 text-white placeholder-dark-400 focus:outline-none focus:border-primary-600 focus:ring-1 focus:ring-primary-600/50 text-sm sm:text-base min-h-[44px]"
            />
            {search && (
              <button
                onClick={() => { setSearch(''); searchRef.current?.focus(); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400 hover:text-white"
              >
                <XCircle className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Category Pills */}
        <div className="px-3 sm:px-4 pb-3 shrink-0">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none" style={{ scrollbarWidth: 'none' }}>
            <button
              onClick={() => setActiveCategory('all')}
              className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all min-h-[40px] ${
                activeCategory === 'all'
                  ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/20'
                  : 'bg-dark-800 text-dark-300 border border-white/10 hover:border-white/20 hover:text-white'
              }`}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all min-h-[40px] ${
                  activeCategory === cat.id
                    ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/20'
                    : 'bg-dark-800 text-dark-300 border border-white/10 hover:border-white/20 hover:text-white'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto px-3 sm:px-4 pb-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
            {filteredProducts.map((product) => {
              const inCart = cart.find((c) => c.productId === product.id);
              const isLowStock = product.stock > 0 && product.stock <= product.minStock;
              const isOutOfStock = product.stock <= 0;

              return (
                <button
                  key={product.id}
                  onClick={() => !isOutOfStock && handleAddToCart(product)}
                  disabled={isOutOfStock}
                  className={`relative flex flex-col p-3 sm:p-4 rounded-xl transition-all min-h-[44px] text-left animate-scale-in ${
                    isOutOfStock
                      ? 'bg-dark-800/50 opacity-50 cursor-not-allowed border border-white/5'
                      : isLowStock
                      ? 'glass border-2 border-primary-600/60 hover:border-primary-500 active:scale-[0.97] cursor-pointer'
                      : 'glass hover:border-white/20 active:scale-[0.97] cursor-pointer'
                  }`}
                >
                  {/* Cart badge */}
                  {inCart && (
                    <span className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full bg-primary-600 text-white text-xs font-bold">
                      {inCart.quantity}
                    </span>
                  )}

                  {/* Product name */}
                  <span className={`text-sm font-medium leading-tight mb-1 ${isOutOfStock ? 'text-dark-400 line-through' : 'text-white'}`}>
                    {product.name}
                  </span>

                  {/* Price */}
                  <span className={`text-base sm:text-lg font-bold ${isOutOfStock ? 'text-dark-500' : 'text-primary-400'}`}>
                    {formatLKR(product.sellingPrice)}
                  </span>

                  {/* Stock */}
                  <span className={`text-xs mt-auto pt-1 ${
                    isOutOfStock ? 'text-dark-500' : isLowStock ? 'text-primary-500 font-medium' : 'text-dark-400'
                  }`}>
                    {isOutOfStock ? 'Out of stock' : isLowStock ? `Low: ${product.stock} left` : `${product.stock} in stock`}
                  </span>
                </button>
              );
            })}
          </div>

          {filteredProducts.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-dark-400">
              <Search className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-lg">No products found</p>
              <p className="text-sm">Try a different search or category</p>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT SIDE - Cart Panel */}
      <div className={`
        shrink-0 bg-dark-900 border-l border-white/5 flex flex-col overflow-hidden
        lg:w-[380px]
        ${mobileCartOpen ? 'fixed inset-0 z-40 w-full' : 'hidden lg:flex'}
      `}>
        {/* Mobile cart header */}
        <div className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-white/5 bg-dark-900">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-primary-500" />
            Cart ({cartItemCount})
          </h2>
          <button
            onClick={() => setMobileCartOpen(false)}
            className="p-2 rounded-lg text-dark-300 hover:text-white hover:bg-white/10 min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-dark-400">
              <ShoppingCart className="w-10 h-10 mb-2 opacity-30" />
              <p className="text-sm">Cart is empty</p>
              <p className="text-xs mt-1">Tap products to add</p>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.productId}
                className="glass-light rounded-xl p-3 animate-fade-in"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white truncate">{item.productName}</p>
                    <p className="text-xs text-dark-400">{formatLKR(item.sellingPrice)} each</p>
                  </div>
                  <button
                    onClick={() => removeFromCart(item.productId)}
                    className="p-1.5 rounded-lg text-dark-400 hover:text-primary-500 hover:bg-primary-600/10 min-w-[36px] min-h-[36px] flex items-center justify-center"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => updateCartItem(item.productId, Math.max(1, item.quantity - 1))}
                      className="w-9 h-9 flex items-center justify-center rounded-lg bg-dark-800 border border-white/10 text-dark-200 hover:text-white hover:border-white/20 active:scale-95 transition-all"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-10 text-center font-semibold text-white text-sm">{item.quantity}</span>
                    <button
                      onClick={() => {
                        if (item.quantity < item.maxStock) updateCartItem(item.productId, item.quantity + 1);
                      }}
                      disabled={item.quantity >= item.maxStock}
                      className="w-9 h-9 flex items-center justify-center rounded-lg bg-dark-800 border border-white/10 text-dark-200 hover:text-white hover:border-white/20 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <span className="font-bold text-white text-sm">{formatLKR(item.sellingPrice * item.quantity)}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Cart Footer - Totals and Actions */}
        <div className="border-t border-white/5 bg-dark-900 shrink-0">
          {/* Discount Input */}
          <div className="px-3 pt-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Tag className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
                <input
                  type="number"
                  value={discountInput}
                  onChange={(e) => handleDiscountChange(e.target.value)}
                  placeholder="Discount"
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-dark-800 border border-white/10 text-white placeholder-dark-400 focus:outline-none focus:border-primary-600 text-sm min-h-[44px]"
                />
              </div>
              <div className="flex rounded-lg overflow-hidden border border-white/10">
                <button
                  onClick={() => setDiscountType('rs')}
                  className={`px-3 text-xs font-medium transition-all min-h-[44px] ${
                    discountType === 'rs' ? 'bg-primary-600 text-white' : 'bg-dark-800 text-dark-300 hover:text-white'
                  }`}
                >
                  Rs
                </button>
                <button
                  onClick={() => setDiscountType('percent')}
                  className={`px-3 text-xs font-medium transition-all min-h-[44px] ${
                    discountType === 'percent' ? 'bg-primary-600 text-white' : 'bg-dark-800 text-dark-300 hover:text-white'
                  }`}
                >
                  %
                </button>
              </div>
            </div>
          </div>

          {/* Customer Select */}
          <div className="px-3 pt-2">
            <div className="relative">
              <Users className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
              <select
                value={cartCustomer || ''}
                onChange={(e) => setCartCustomer(e.target.value || null)}
                className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-dark-800 border border-white/10 text-white focus:outline-none focus:border-primary-600 text-sm appearance-none min-h-[44px]"
              >
                <option value="">Walk-in Customer</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} ({c.phone || 'no phone'})</option>
                ))}
              </select>
            </div>
          </div>

          {/* Totals */}
          <div className="px-3 pt-3 space-y-1">
            <div className="flex justify-between text-sm text-dark-300">
              <span>Subtotal</span>
              <span>{formatLKR(subtotal)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-sm text-primary-400">
                <span>Discount {discountType === 'percent' ? `(${cartDiscount}%)` : ''}</span>
                <span>-{formatLKR(discountAmount)}</span>
              </div>
            )}
            {tax > 0 && (
              <div className="flex justify-between text-sm text-dark-300">
                <span>Tax ({taxRate}%)</span>
                <span>{formatLKR(tax)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold text-white pt-1 border-t border-white/10">
              <span>Total</span>
              <span className="text-primary-400">{formatLKR(total)}</span>
            </div>
          </div>

          {/* Payment Mode Buttons */}
          <div className="px-3 pt-3">
            <div className="grid grid-cols-4 gap-1.5">
              {([
                { mode: 'cash' as PaymentMode, icon: Banknote, label: 'Cash' },
                { mode: 'card' as PaymentMode, icon: CreditCard, label: 'Card' },
                { mode: 'credit' as PaymentMode, icon: HandCoins, label: 'Credit' },
                { mode: 'split' as PaymentMode, icon: Receipt, label: 'Split' },
              ]).map(({ mode, icon: Icon, label }) => (
                <button
                  key={mode}
                  onClick={() => {
                    setPaymentMode(mode);
                    if (mode === 'card') setCardAmount(String(total));
                    if (mode === 'cash') { setCashAmount(''); }
                  }}
                  className={`flex flex-col items-center gap-1 py-2.5 rounded-xl transition-all min-h-[52px] ${
                    paymentMode === mode
                      ? 'bg-primary-600/20 border border-primary-600 text-primary-400'
                      : 'bg-dark-800 border border-white/10 text-dark-300 hover:border-white/20 hover:text-white'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-xs font-medium">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Cash Payment Section */}
          {paymentMode === 'cash' && cart.length > 0 && (
            <div className="px-3 pt-3 space-y-2 animate-fade-in">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400 text-sm">Rs</span>
                <input
                  type="number"
                  value={cashAmount}
                  onChange={(e) => setCashAmount(e.target.value)}
                  placeholder="Cash received"
                  className="w-full pl-10 pr-3 py-2.5 rounded-lg bg-dark-800 border border-white/10 text-white placeholder-dark-400 focus:outline-none focus:border-primary-600 text-sm min-h-[44px]"
                  autoFocus
                />
              </div>
              {/* Quick cash buttons */}
              {total > 0 && (
                <div className="flex gap-1.5 flex-wrap">
                  {quickCashAmounts.map((amt) => (
                    <button
                      key={amt}
                      onClick={() => setCashAmount(String(amt))}
                      className="px-3 py-2 rounded-lg bg-dark-800 border border-white/10 text-dark-200 hover:text-white hover:border-white/20 text-xs font-medium transition-all min-h-[36px]"
                    >
                      {formatLKR(amt)}
                    </button>
                  ))}
                  <button
                    onClick={() => setCashAmount(String(Math.ceil(total)))}
                    className="px-3 py-2 rounded-lg bg-dark-800 border border-white/10 text-dark-200 hover:text-white hover:border-white/20 text-xs font-medium transition-all min-h-[36px]"
                  >
                    Exact
                  </button>
                </div>
              )}
              {/* Change */}
              {cashNum > 0 && (
                <div className={`flex justify-between items-center p-3 rounded-xl ${
                  changeAmount > 0 ? 'glass-red' : 'bg-success-600/10 border border-success-600/20'
                }`}>
                  <span className="text-sm text-dark-300">Change</span>
                  <span className={`text-lg font-bold ${changeAmount > 0 ? 'text-primary-400' : 'text-success-400'}`}>
                    {formatLKR(changeAmount)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Card Payment Section */}
          {paymentMode === 'card' && cart.length > 0 && (
            <div className="px-3 pt-3 animate-fade-in">
              <div className="glass-red rounded-xl p-3 flex items-center gap-3">
                <CreditCard className="w-5 h-5 text-primary-400" />
                <div>
                  <p className="text-sm text-dark-300">Card Payment</p>
                  <p className="text-lg font-bold text-primary-400">{formatLKR(total)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Credit Payment Section */}
          {paymentMode === 'credit' && cart.length > 0 && (
            <div className="px-3 pt-3 animate-fade-in">
              <div className={`rounded-xl p-3 ${cartCustomer ? 'glass-red' : 'bg-warning-500/10 border border-warning-500/20'}`}>
                <div className="flex items-center gap-2">
                  <HandCoins className="w-5 h-5 text-primary-400" />
                  <span className="text-sm text-dark-300">Credit Sale</span>
                </div>
                {!cartCustomer && (
                  <p className="text-xs text-warning-400 mt-1">Select a customer to proceed</p>
                )}
                {cartCustomer && (() => {
                  const cust = customers.find((c) => c.id === cartCustomer);
                  if (!cust) return null;
                  return (
                    <p className="text-xs text-dark-400 mt-1">
                      Credit limit: {formatLKR(cust.creditLimit)} | Used: {formatLKR(cust.creditUsed)}
                    </p>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Split Payment Section */}
          {paymentMode === 'split' && cart.length > 0 && (
            <div className="px-3 pt-3 space-y-2 animate-fade-in">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-dark-400 mb-1 block">Cash</label>
                  <div className="relative">
                    <Banknote className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
                    <input
                      type="number"
                      value={splitCash}
                      onChange={(e) => setSplitCash(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-dark-800 border border-white/10 text-white placeholder-dark-400 focus:outline-none focus:border-primary-600 text-sm min-h-[44px]"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-dark-400 mb-1 block">Card</label>
                  <div className="relative">
                    <CreditCard className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
                    <input
                      type="number"
                      value={splitCard}
                      onChange={(e) => setSplitCard(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-dark-800 border border-white/10 text-white placeholder-dark-400 focus:outline-none focus:border-primary-600 text-sm min-h-[44px]"
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-between text-xs text-dark-400 p-2 rounded-lg bg-dark-800">
                <span>Total to pay</span>
                <span className={splitCashNum + splitCardNum >= total ? 'text-success-400' : 'text-primary-400'}>
                  {formatLKR(splitCashNum + splitCardNum)} / {formatLKR(total)}
                </span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="p-3 space-y-2">
            <Button
              variant="primary"
              size="lg"
              className="w-full min-h-[52px] text-base font-bold"
              disabled={!canPay}
              onClick={handlePayAndPrint}
            >
              <Printer className="w-5 h-5" />
              Pay & Print
            </Button>
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant="secondary"
                size="sm"
                className="w-full min-h-[44px]"
                disabled={cart.length === 0}
                onClick={() => { holdBill(); setMobileCartOpen(false); }}
              >
                <PauseCircle className="w-4 h-4" />
                Hold
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="w-full min-h-[44px]"
                disabled={cart.length === 0}
                onClick={() => { saveDraft(); setMobileCartOpen(false); }}
              >
                <FileText className="w-4 h-4" />
                Draft
              </Button>
              <Button
                variant="danger"
                size="sm"
                className="w-full min-h-[44px]"
                disabled={cart.length === 0}
                onClick={clearCart}
              >
                <XCircle className="w-4 h-4" />
                Clear
              </Button>
            </div>

            {/* Held & Draft badges */}
            <div className="flex gap-2">
              {heldBills.length > 0 && (
                <button
                  onClick={() => setShowHeldBills(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-warning-500/10 border border-warning-500/20 text-warning-400 text-xs font-medium hover:bg-warning-500/20 transition-all min-h-[36px]"
                >
                  <PauseCircle className="w-3.5 h-3.5" />
                  Held ({heldBills.length})
                </button>
              )}
              {draftBills.length > 0 && (
                <button
                  onClick={() => setShowDraftBills(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-info-500/10 border border-info-500/20 text-info-400 text-xs font-medium hover:bg-info-500/20 transition-all min-h-[36px]"
                >
                  <FileText className="w-3.5 h-3.5" />
                  Drafts ({draftBills.length})
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile FAB - Cart toggle */}
      {!mobileCartOpen && (
        <button
          onClick={() => setMobileCartOpen(true)}
          className="lg:hidden fixed bottom-6 right-6 z-30 w-14 h-14 flex items-center justify-center rounded-full bg-primary-600 text-white shadow-lg shadow-primary-600/30 active:scale-95 transition-all"
        >
          <ShoppingCart className="w-6 h-6" />
          {cartItemCount > 0 && (
            <span className="absolute -top-1 -right-1 w-6 h-6 flex items-center justify-center rounded-full bg-white text-primary-600 text-xs font-bold">
              {cartItemCount}
            </span>
          )}
        </button>
      )}

      {/* RECEIPT MODAL */}
      <Modal isOpen={showReceipt} onClose={() => setShowReceipt(false)} title="Receipt" size="sm">
        {lastTransaction && (
          <div>
            <div className="receipt-print bg-dark-800 rounded-xl p-4 text-white">
              <div className="text-center mb-3">
                <p className="text-base font-bold">{settings.businessName}</p>
                <p className="text-xs text-dark-300">{settings.businessAddress}</p>
                <p className="text-xs text-dark-300">{settings.businessPhone}</p>
                <div className="border-t border-dashed border-dark-600 my-2" />
                {lastTransaction.invoiceNo && (
                  <p className="text-xs text-dark-300">{lastTransaction.invoiceNo}</p>
                )}
                <p className="text-xs text-dark-300">{new Date().toLocaleString()}</p>
                {lastTransaction.customerName && (
                  <p className="text-xs text-dark-300">Customer: {lastTransaction.customerName}</p>
                )}
              </div>
              <div className="border-t border-dashed border-dark-600 my-2" />
              {lastTransaction.items.map((item) => (
                <div key={item.productId} className="flex justify-between text-xs py-0.5">
                  <span className="flex-1 truncate mr-2">{item.productName} x{item.quantity}</span>
                  <span>{formatLKR(item.sellingPrice * item.quantity)}</span>
                </div>
              ))}
              <div className="border-t border-dashed border-dark-600 my-2" />
              <div className="flex justify-between text-xs py-0.5">
                <span>Subtotal</span>
                <span>{formatLKR(lastTransaction.subtotal)}</span>
              </div>
              {lastTransaction.discount > 0 && (
                <div className="flex justify-between text-xs py-0.5 text-primary-400">
                  <span>Discount</span>
                  <span>-{formatLKR(lastTransaction.discount)}</span>
                </div>
              )}
              {lastTransaction.tax > 0 && (
                <div className="flex justify-between text-xs py-0.5">
                  <span>Tax</span>
                  <span>{formatLKR(lastTransaction.tax)}</span>
                </div>
              )}
              <div className="border-t border-dashed border-dark-600 my-2" />
              <div className="flex justify-between text-sm font-bold py-1">
                <span>TOTAL</span>
                <span>{formatLKR(lastTransaction.total)}</span>
              </div>
              <div className="border-t border-dashed border-dark-600 my-2" />
              <div className="flex justify-between text-xs py-0.5">
                <span>Payment</span>
                <span className="uppercase">{lastTransaction.paymentMethod}</span>
              </div>
              {lastTransaction.cashAmount !== undefined && lastTransaction.cashAmount > 0 && (
                <div className="flex justify-between text-xs py-0.5">
                  <span>Cash</span>
                  <span>{formatLKR(lastTransaction.cashAmount)}</span>
                </div>
              )}
              {lastTransaction.cardAmount !== undefined && lastTransaction.cardAmount > 0 && (
                <div className="flex justify-between text-xs py-0.5">
                  <span>Card</span>
                  <span>{formatLKR(lastTransaction.cardAmount)}</span>
                </div>
              )}
              {lastTransaction.changeAmount !== undefined && lastTransaction.changeAmount > 0 && (
                <div className="flex justify-between text-xs py-0.5 font-bold text-primary-400">
                  <span>Change</span>
                  <span>{formatLKR(lastTransaction.changeAmount)}</span>
                </div>
              )}
              <div className="border-t border-dashed border-dark-600 my-2" />
              <p className="text-center text-xs text-dark-300">{settings.receiptFooter}</p>
            </div>
            <div className="flex gap-2 mt-4">
              <Button variant="primary" size="md" className="flex-1" onClick={handlePrint}>
                <Printer className="w-4 h-4" />
                Print
              </Button>
              <Button variant="secondary" size="md" className="flex-1" onClick={() => setShowReceipt(false)}>
                New Bill
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* HELD BILLS MODAL */}
      <Modal isOpen={showHeldBills} onClose={() => setShowHeldBills(false)} title="Held Bills" size="md">
        {heldBills.length === 0 ? (
          <p className="text-dark-400 text-sm text-center py-8">No held bills</p>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {heldBills.map((bill) => {
              const cust = bill.customer ? customers.find((c) => c.id === bill.customer) : null;
              const billTotal = bill.cart.reduce((s, i) => s + i.sellingPrice * i.quantity, 0) - bill.discount;
              return (
                <div key={bill.id} className="glass-light rounded-xl p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">
                      {bill.cart.length} item{bill.cart.length !== 1 ? 's' : ''} - {formatLKR(billTotal)}
                    </p>
                    <p className="text-xs text-dark-400">
                      {cust ? cust.name : 'Walk-in'} | {new Date(bill.time).toLocaleTimeString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="primary" size="sm" onClick={() => { recallHeldBill(bill.id); setShowHeldBills(false); setMobileCartOpen(true); }}>
                      Recall
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => removeHeldBill(bill.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Modal>

      {/* DRAFT BILLS MODAL */}
      <Modal isOpen={showDraftBills} onClose={() => setShowDraftBills(false)} title="Draft Bills" size="md">
        {draftBills.length === 0 ? (
          <p className="text-dark-400 text-sm text-center py-8">No draft bills</p>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {draftBills.map((draft) => {
              const cust = draft.customer ? customers.find((c) => c.id === draft.customer) : null;
              const draftTotal = draft.cart.reduce((s, i) => s + i.sellingPrice * i.quantity, 0) - draft.discount;
              return (
                <div key={draft.id} className="glass-light rounded-xl p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">
                      {draft.cart.length} item{draft.cart.length !== 1 ? 's' : ''} - {formatLKR(draftTotal)}
                    </p>
                    <p className="text-xs text-dark-400">
                      {cust ? cust.name : 'Walk-in'} | {new Date(draft.time).toLocaleTimeString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="primary" size="sm" onClick={() => { recallDraft(draft.id); setShowDraftBills(false); setMobileCartOpen(true); }}>
                      Recall
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => removeDraft(draft.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Modal>
    </div>
  );
}
