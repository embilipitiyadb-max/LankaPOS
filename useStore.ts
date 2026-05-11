import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import type { User as FirebaseUser } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { addDoc_, updateDoc_, deleteDoc_, subscribeToCollection } from '../lib/firestore';
import type { Product, Category, Customer, Supplier, Transaction, TransactionItem, GRN, PurchaseOrder, Expense, Employee, Attendance, StockAdjustment, AppSettings } from '../types';
import { generateId, generateInvoiceNo, generateGRNNo, generatePONo } from '../lib/utils';

interface CartItem extends TransactionItem { maxStock: number; }

interface AppState {
  currentUser: { id: string; email: string; name: string; role: 'admin' | 'cashier' | 'employee' } | null;
  firebaseUser: FirebaseUser | null; authLoading: boolean;
  setCurrentUser: (u: AppState['currentUser']) => void;
  login: (e: string, p: string) => Promise<void>;
  register: (e: string, p: string, n: string, r: string) => Promise<void>;
  logout: () => Promise<void>;
  initAuth: () => () => void;
  syncStarted: boolean; startSync: () => () => void;
  settings: AppSettings; updateSettings: (s: Partial<AppSettings>) => void;
  products: Product[]; addProduct: (p: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateProduct: (id: string, p: Partial<Product>) => Promise<void>; deleteProduct: (id: string) => Promise<void>;
  categories: Category[]; addCategory: (c: Omit<Category, 'id' | 'productCount'>) => Promise<void>;
  updateCategory: (id: string, c: Partial<Category>) => Promise<void>; deleteCategory: (id: string) => Promise<void>;
  customers: Customer[]; addCustomer: (c: Omit<Customer, 'id' | 'createdAt' | 'loyaltyPoints' | 'creditUsed' | 'totalPurchases'>) => Promise<void>;
  updateCustomer: (id: string, c: Partial<Customer>) => Promise<void>;
  suppliers: Supplier[]; addSupplier: (s: Omit<Supplier, 'id' | 'createdAt' | 'dueBalance' | 'totalPurchases'>) => Promise<void>;
  updateSupplier: (id: string, s: Partial<Supplier>) => Promise<void>;
  transactions: Transaction[]; addTransaction: (t: Omit<Transaction, 'id' | 'invoiceNo' | 'createdAt'>) => Promise<void>;
  updateTransaction: (id: string, t: Partial<Transaction>) => Promise<void>;
  grns: GRN[]; addGRN: (g: Omit<GRN, 'id' | 'grnNo' | 'createdAt'>) => Promise<void>;
  purchaseOrders: PurchaseOrder[]; addPurchaseOrder: (p: Omit<PurchaseOrder, 'id' | 'poNo' | 'createdAt'>) => Promise<void>;
  updatePurchaseOrder: (id: string, p: Partial<PurchaseOrder>) => Promise<void>;
  expenses: Expense[]; addExpense: (e: Omit<Expense, 'id'>) => Promise<void>;
  employees: Employee[]; addEmployee: (e: Omit<Employee, 'id'>) => Promise<void>;
  updateEmployee: (id: string, e: Partial<Employee>) => Promise<void>;
  attendance: Attendance[]; addAttendance: (a: Omit<Attendance, 'id'>) => Promise<void>;
  stockAdjustments: StockAdjustment[]; addStockAdjustment: (a: Omit<StockAdjustment, 'id' | 'adjustedAt'>) => Promise<void>;
  cart: CartItem[]; cartDiscount: number; cartCustomer: string | null;
  heldBills: { id: string; cart: CartItem[]; discount: number; customer: string | null; time: string }[];
  draftBills: { id: string; cart: CartItem[]; discount: number; customer: string | null; time: string }[];
  addToCart: (i: CartItem) => void; removeFromCart: (pid: string) => void;
  updateCartItem: (pid: string, q: number) => void; setCartDiscount: (d: number) => void;
  setCartCustomer: (id: string | null) => void; clearCart: () => void;
  holdBill: () => void; recallHeldBill: (id: string) => void; removeHeldBill: (id: string) => void;
  saveDraft: () => void; recallDraft: (id: string) => void; removeDraft: (id: string) => void;
  sidebarOpen: boolean; setSidebarOpen: (o: boolean) => void;
}

const now = new Date().toISOString();
const dayAgo = new Date(Date.now() - 86400000).toISOString();
const twoDaysAgo = new Date(Date.now() - 172800000).toISOString();
const threeDaysAgo = new Date(Date.now() - 259200000).toISOString();

const defaultCategories: Category[] = [
  { id: 'cat-1', name: 'Beverages', nameLocal: 'පාන', color: '#ef4444', productCount: 0 },
  { id: 'cat-2', name: 'Snacks', nameLocal: 'කෑම', color: '#f59e0b', productCount: 0 },
  { id: 'cat-3', name: 'Dairy', nameLocal: 'කිරි නිෂ්පාදන', color: '#3b82f6', productCount: 0 },
  { id: 'cat-4', name: 'Grocery', nameLocal: 'සිල්ලර භාණ්ඩ', color: '#22c55e', productCount: 0 },
  { id: 'cat-5', name: 'Personal Care', nameLocal: 'පෞද්ගලික රැකවරණ', color: '#8b5cf6', productCount: 0 },
  { id: 'cat-6', name: 'Household', nameLocal: 'ගෘහ භාණ්ඩ', color: '#ec4899', productCount: 0 },
  { id: 'cat-7', name: 'Stationery', nameLocal: 'ස්ථානීය', color: '#06b6d4', productCount: 0 },
  { id: 'cat-8', name: 'Confectionery', nameLocal: 'මිහිරි අතුරු', color: '#f97316', productCount: 0 },
];

const defaultProducts: Product[] = [
  { id: 'p1', name: 'Coca-Cola 500ml', nameLocal: 'කොකාකෝලා 500ml', barcode: '4900000001', category: 'cat-1', costPrice: 85, sellingPrice: 110, stock: 150, minStock: 20, unit: 'bottle', tax: 0, hasVariants: false, damagedStock: 0, isActive: true, createdAt: now, updatedAt: now },
  { id: 'p2', name: 'Sprite 500ml', nameLocal: 'ස්ප්රයිට් 500ml', barcode: '4900000002', category: 'cat-1', costPrice: 85, sellingPrice: 110, stock: 120, minStock: 20, unit: 'bottle', tax: 0, hasVariants: false, damagedStock: 0, isActive: true, createdAt: now, updatedAt: now },
  { id: 'p3', name: 'Fanta Orange 500ml', nameLocal: 'ෆැන්ටා 500ml', barcode: '4900000003', category: 'cat-1', costPrice: 85, sellingPrice: 110, stock: 90, minStock: 20, unit: 'bottle', tax: 0, hasVariants: false, damagedStock: 0, isActive: true, createdAt: now, updatedAt: now },
  { id: 'p4', name: 'Munna Biscuit', nameLocal: 'මුන්නා බිස්කට්', barcode: '4900000004', category: 'cat-2', costPrice: 30, sellingPrice: 50, stock: 200, minStock: 30, unit: 'pack', tax: 0, hasVariants: false, damagedStock: 0, isActive: true, createdAt: now, updatedAt: now },
  { id: 'p5', name: 'Malgudi 100g', nameLocal: 'මාල්ගුඩි 100g', barcode: '4900000005', category: 'cat-2', costPrice: 45, sellingPrice: 70, stock: 180, minStock: 25, unit: 'pack', tax: 0, hasVariants: false, damagedStock: 0, isActive: true, createdAt: now, updatedAt: now },
  { id: 'p6', name: 'Munna Chocolate 25g', nameLocal: 'මුන්නා චොකලට්', barcode: '4900000006', category: 'cat-8', costPrice: 20, sellingPrice: 35, stock: 300, minStock: 50, unit: 'piece', tax: 0, hasVariants: false, damagedStock: 0, isActive: true, createdAt: now, updatedAt: now },
  { id: 'p7', name: 'Kotmale Fresh Milk 1L', nameLocal: 'කොට්මලේ කිරි 1L', barcode: '4900000007', category: 'cat-3', costPrice: 280, sellingPrice: 350, stock: 50, minStock: 10, unit: 'bottle', tax: 0, hasVariants: false, damagedStock: 0, isActive: true, createdAt: now, updatedAt: now },
  { id: 'p8', name: 'Anchor Butter 100g', nameLocal: 'ඇන්කර් බටර් 100g', barcode: '4900000008', category: 'cat-3', costPrice: 320, sellingPrice: 420, stock: 40, minStock: 8, unit: 'pack', tax: 0, hasVariants: false, damagedStock: 0, isActive: true, createdAt: now, updatedAt: now },
  { id: 'p9', name: 'Newdale Yogurt', nameLocal: 'නිව්ඩේල් යෝගට්', barcode: '4900000009', category: 'cat-3', costPrice: 55, sellingPrice: 80, stock: 60, minStock: 15, unit: 'cup', tax: 0, hasVariants: false, damagedStock: 0, isActive: true, createdAt: now, updatedAt: now },
  { id: 'p10', name: 'Basmati Rice 5kg', nameLocal: 'බාස්මති සහල් 5kg', barcode: '4900000010', category: 'cat-4', costPrice: 1200, sellingPrice: 1550, stock: 30, minStock: 5, unit: 'pack', tax: 0, hasVariants: false, damagedStock: 0, isActive: true, createdAt: now, updatedAt: now },
  { id: 'p11', name: 'Dhal 1kg', nameLocal: 'පරිප්පු 1kg', barcode: '4900000011', category: 'cat-4', costPrice: 350, sellingPrice: 480, stock: 60, minStock: 10, unit: 'kg', tax: 0, hasVariants: false, damagedStock: 0, isActive: true, createdAt: now, updatedAt: now },
  { id: 'p12', name: 'Coconut Oil 1L', nameLocal: 'පොල් තෙල් 1L', barcode: '4900000012', category: 'cat-4', costPrice: 520, sellingPrice: 680, stock: 25, minStock: 5, unit: 'bottle', tax: 0, hasVariants: false, damagedStock: 0, isActive: true, createdAt: now, updatedAt: now },
  { id: 'p13', name: 'Lifebuoy Soap', nameLocal: 'ලයිෆ්බෝයි සබන්', barcode: '4900000013', category: 'cat-5', costPrice: 65, sellingPrice: 95, stock: 100, minStock: 15, unit: 'piece', tax: 0, hasVariants: false, damagedStock: 0, isActive: true, createdAt: now, updatedAt: now },
  { id: 'p14', name: 'Sunlight 400g', nameLocal: 'සන්ලයිට් 400g', barcode: '4900000014', category: 'cat-6', costPrice: 180, sellingPrice: 250, stock: 80, minStock: 12, unit: 'pack', tax: 0, hasVariants: false, damagedStock: 0, isActive: true, createdAt: now, updatedAt: now },
  { id: 'p15', name: 'Elephant House Ice Cream', nameLocal: 'අලින් හවුස් අයිස්ක්‍රීම්', barcode: '4900000015', category: 'cat-1', costPrice: 120, sellingPrice: 180, stock: 5, minStock: 10, unit: 'cup', tax: 0, hasVariants: false, damagedStock: 2, isActive: true, createdAt: now, updatedAt: now },
  { id: 'p16', name: 'Ceylon Tea 200g', nameLocal: 'සිලෝන් තේ 200g', barcode: '4900000016', category: 'cat-1', costPrice: 290, sellingPrice: 380, stock: 45, minStock: 10, unit: 'pack', tax: 0, hasVariants: false, damagedStock: 0, isActive: true, createdAt: now, updatedAt: now },
  { id: 'p17', name: 'Ritzbury Chocolate 40g', nameLocal: 'රිට්ස්බරි චොකලට්', barcode: '4900000017', category: 'cat-8', costPrice: 50, sellingPrice: 80, stock: 150, minStock: 25, unit: 'piece', tax: 0, hasVariants: false, damagedStock: 0, isActive: true, createdAt: now, updatedAt: now },
  { id: 'p18', name: 'A4 Paper 500 sheets', nameLocal: 'A4 කොළ 500', barcode: '4900000018', category: 'cat-7', costPrice: 850, sellingPrice: 1100, stock: 20, minStock: 5, unit: 'ream', tax: 0, hasVariants: false, damagedStock: 0, isActive: true, createdAt: now, updatedAt: now },
  { id: 'p19', name: 'Signal Toothpaste 120g', nameLocal: 'සිග්නල් දත්තැම්බුම්', barcode: '4900000019', category: 'cat-5', costPrice: 190, sellingPrice: 260, stock: 55, minStock: 10, unit: 'tube', tax: 0, hasVariants: false, damagedStock: 0, isActive: true, createdAt: now, updatedAt: now },
  { id: 'p20', name: 'Maggie Noodles', nameLocal: 'මැගී නූඩ්ල්ස්', barcode: '4900000020', category: 'cat-4', costPrice: 35, sellingPrice: 55, stock: 200, minStock: 30, unit: 'pack', tax: 0, hasVariants: false, damagedStock: 0, isActive: true, createdAt: now, updatedAt: now },
];

const defaultCustomers: Customer[] = [
  { id: 'c1', name: 'Kamal Perera', phone: '0771234567', email: 'kamal@gmail.com', address: '45 Galle Road, Colombo 03', type: 'loyalty', loyaltyPoints: 250, creditLimit: 50000, creditUsed: 0, totalPurchases: 125000, createdAt: now },
  { id: 'c2', name: 'Nimal Silva', phone: '0779876543', email: 'nimal@yahoo.com', address: '12 Kandy Road, Kadawatha', type: 'credit', loyaltyPoints: 0, creditLimit: 100000, creditUsed: 35000, totalPurchases: 250000, createdAt: now },
  { id: 'c3', name: 'Sunethra Fernando', phone: '0712345678', email: 'sunethra@hotmail.com', address: '78 High Level Rd, Nugegoda', type: 'loyalty', loyaltyPoints: 180, creditLimit: 0, creditUsed: 0, totalPurchases: 89000, createdAt: now },
  { id: 'c4', name: 'Ranjith Kumara', phone: '0765432109', type: 'credit', loyaltyPoints: 0, creditLimit: 75000, creditUsed: 12000, totalPurchases: 180000, createdAt: now },
  { id: 'c5', name: 'Walk-in Customer', phone: '', type: 'regular', loyaltyPoints: 0, creditLimit: 0, creditUsed: 0, totalPurchases: 0, createdAt: now },
];

const defaultSuppliers: Supplier[] = [
  { id: 's1', name: 'Coca-Cola Beverages Sri Lanka', phone: '0112345678', email: 'orders@coca-cola.lk', contactPerson: 'Ravi Fernando', dueBalance: 45000, totalPurchases: 350000, createdAt: now },
  { id: 's2', name: 'Munna Biscuits Ltd', phone: '0113456789', email: 'supply@munna.lk', contactPerson: 'Sunil Jayasena', dueBalance: 22000, totalPurchases: 180000, createdAt: now },
  { id: 's3', name: 'Kotmale Dairy Products', phone: '0812345678', email: 'orders@kotmale.lk', contactPerson: 'Chaminda Kumara', dueBalance: 0, totalPurchases: 95000, createdAt: now },
  { id: 's4', name: 'Ceylon Agro Industries', phone: '0114567890', email: 'supply@agro.lk', contactPerson: 'Mahinda Rajapaksha', dueBalance: 15000, totalPurchases: 120000, createdAt: now },
  { id: 's5', name: 'Unilever Sri Lanka', phone: '0115678901', email: 'orders@unilever.lk', contactPerson: 'Dilini Perera', dueBalance: 0, totalPurchases: 280000, createdAt: now },
];

const defaultEmployees: Employee[] = [
  { id: 'e1', userId: 'u1', name: 'Admin User', email: 'admin@lankapos.lk', phone: '0770000001', role: 'admin', salary: 75000, joinedAt: now, active: true },
  { id: 'e2', userId: 'u2', name: 'Cashier Nimali', email: 'nimali@lankapos.lk', phone: '0770000002', role: 'cashier', salary: 35000, joinedAt: now, active: true },
  { id: 'e3', userId: 'u3', name: 'Kamal Bandara', email: 'kamal@lankapos.lk', phone: '0770000003', role: 'employee', salary: 25000, joinedAt: now, active: true },
  { id: 'e4', userId: 'u4', name: 'Saman Kumara', email: 'saman@lankapos.lk', phone: '0770000004', role: 'cashier', salary: 32000, joinedAt: now, active: true },
];

const sampleTransactions: Transaction[] = [
  { id: 't1', invoiceNo: 'INV-20260509-0001', items: [{ productId: 'p1', productName: 'Coca-Cola 500ml', barcode: '4900000001', quantity: 3, costPrice: 85, sellingPrice: 110, discount: 0, total: 330 }, { productId: 'p4', productName: 'Munna Biscuit', barcode: '4900000004', quantity: 2, costPrice: 30, sellingPrice: 50, discount: 0, total: 100 }], subtotal: 430, discount: 0, tax: 0, total: 430, paymentMethod: 'cash', cashAmount: 500, changeAmount: 70, cashierId: 'e2', cashierName: 'Cashier Nimali', status: 'completed', createdAt: threeDaysAgo },
  { id: 't2', invoiceNo: 'INV-20260510-0001', items: [{ productId: 'p10', productName: 'Basmati Rice 5kg', barcode: '4900000010', quantity: 1, costPrice: 1200, sellingPrice: 1550, discount: 0, total: 1550 }, { productId: 'p11', productName: 'Dhal 1kg', barcode: '4900000011', quantity: 2, costPrice: 350, sellingPrice: 480, discount: 0, total: 960 }], subtotal: 2510, discount: 110, tax: 0, total: 2400, paymentMethod: 'card', cardAmount: 2400, cashierId: 'e2', cashierName: 'Cashier Nimali', customerId: 'c1', customerName: 'Kamal Perera', status: 'completed', createdAt: twoDaysAgo },
  { id: 't3', invoiceNo: 'INV-20260510-0002', items: [{ productId: 'p7', productName: 'Kotmale Fresh Milk 1L', barcode: '4900000007', quantity: 2, costPrice: 280, sellingPrice: 350, discount: 0, total: 700 }, { productId: 'p9', productName: 'Newdale Yogurt', barcode: '4900000009', quantity: 4, costPrice: 55, sellingPrice: 80, discount: 0, total: 320 }], subtotal: 1020, discount: 0, tax: 0, total: 1020, paymentMethod: 'cash', cashAmount: 1100, changeAmount: 80, cashierId: 'e4', cashierName: 'Saman Kumara', status: 'completed', createdAt: dayAgo },
  { id: 't4', invoiceNo: 'INV-20260511-0001', items: [{ productId: 'p13', productName: 'Lifebuoy Soap', barcode: '4900000013', quantity: 3, costPrice: 65, sellingPrice: 95, discount: 0, total: 285 }, { productId: 'p14', productName: 'Sunlight 400g', barcode: '4900000014', quantity: 1, costPrice: 180, sellingPrice: 250, discount: 0, total: 250 }], subtotal: 535, discount: 35, tax: 0, total: 500, paymentMethod: 'cash', cashAmount: 500, changeAmount: 0, cashierId: 'e2', cashierName: 'Cashier Nimali', customerId: 'c3', customerName: 'Sunethra Fernando', status: 'completed', createdAt: now },
  { id: 't5', invoiceNo: 'INV-20260511-0002', items: [{ productId: 'p16', productName: 'Ceylon Tea 200g', barcode: '4900000016', quantity: 2, costPrice: 290, sellingPrice: 380, discount: 0, total: 760 }, { productId: 'p20', productName: 'Maggie Noodles', barcode: '4900000020', quantity: 5, costPrice: 35, sellingPrice: 55, discount: 0, total: 275 }], subtotal: 1035, discount: 0, tax: 0, total: 1035, paymentMethod: 'credit', cashierId: 'e2', cashierName: 'Cashier Nimali', customerId: 'c2', customerName: 'Nimal Silva', status: 'completed', createdAt: now },
];

const sampleExpenses: Expense[] = [
  { id: 'ex1', category: 'Utilities', description: 'Electricity Bill - May', amount: 8500, date: now, recordedBy: 'e1' },
  { id: 'ex2', category: 'Rent', description: 'Shop Rent - May 2026', amount: 25000, date: now, recordedBy: 'e1' },
  { id: 'ex3', category: 'Transport', description: 'Delivery van fuel', amount: 3500, date: dayAgo, recordedBy: 'e1' },
  { id: 'ex4', category: 'Salaries', description: 'Staff advance payments', amount: 15000, date: twoDaysAgo, recordedBy: 'e1' },
  { id: 'ex5', category: 'Maintenance', description: 'AC repair', amount: 7500, date: threeDaysAgo, recordedBy: 'e1' },
];

const sampleAttendance: Attendance[] = [
  { id: 'a1', employeeId: 'e1', employeeName: 'Admin User', date: now, checkIn: '08:00', checkOut: '17:00', status: 'present' },
  { id: 'a2', employeeId: 'e2', employeeName: 'Cashier Nimali', date: now, checkIn: '09:00', checkOut: '18:00', status: 'present' },
  { id: 'a3', employeeId: 'e3', employeeName: 'Kamal Bandara', date: now, checkIn: '09:30', checkOut: '18:00', status: 'late' },
  { id: 'a4', employeeId: 'e4', employeeName: 'Saman Kumara', date: now, checkIn: '08:00', checkOut: '13:00', status: 'half-day' },
];

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      currentUser: null, firebaseUser: null, authLoading: true,
      setCurrentUser: (u) => set({ currentUser: u }),
      login: async (e, p) => { const c = await signInWithEmailAndPassword(auth, e, p); set({ firebaseUser: c.user, authLoading: false }); },
      register: async (e, p, n, r) => { const c = await createUserWithEmailAndPassword(auth, e, p); set({ currentUser: { id: c.user.uid, email: e, name: n, role: r as 'admin' | 'cashier' | 'employee' }, firebaseUser: c.user, authLoading: false }); },
      logout: async () => { await signOut(auth); set({ currentUser: null, firebaseUser: null, syncStarted: false }); },
      initAuth: () => {
        const unsub = onAuthStateChanged(auth, (fb) => {
          if (fb) { const s = get(); set({ currentUser: s.currentUser || { id: fb.uid, email: fb.email || '', name: fb.displayName || 'User', role: 'admin' }, firebaseUser: fb, authLoading: false }); }
          else { set({ currentUser: null, firebaseUser: null, authLoading: false }); }
        });
        return unsub;
      },
      syncStarted: false,
      startSync: () => {
        if (get().syncStarted) return () => {};
        set({ syncStarted: true });
        const u: (() => void)[] = [];
        u.push(subscribeToCollection<Product>('products', (d) => set({ products: d })));
        u.push(subscribeToCollection<Category>('categories', (d) => set({ categories: d })));
        u.push(subscribeToCollection<Customer>('customers', (d) => set({ customers: d })));
        u.push(subscribeToCollection<Supplier>('suppliers', (d) => set({ suppliers: d })));
        u.push(subscribeToCollection<Transaction>('transactions', (d) => set({ transactions: d })));
        u.push(subscribeToCollection<GRN>('grns', (d) => set({ grns: d })));
        u.push(subscribeToCollection<PurchaseOrder>('purchaseOrders', (d) => set({ purchaseOrders: d })));
        u.push(subscribeToCollection<Expense>('expenses', (d) => set({ expenses: d })));
        u.push(subscribeToCollection<Employee>('employees', (d) => set({ employees: d })));
        u.push(subscribeToCollection<Attendance>('attendance', (d) => set({ attendance: d })));
        u.push(subscribeToCollection<StockAdjustment>('stockAdjustments', (d) => set({ stockAdjustments: d })));
        return () => { u.forEach((f) => f()); set({ syncStarted: false }); };
      },
      settings: { language: 'en', currency: 'LKR', taxRate: 0, businessName: 'LankaPOS Store', businessAddress: '45 Galle Road, Colombo 03', businessPhone: '011-2345678', receiptFooter: 'Thank you for shopping with us! Come again!', autoBackup: true },
      updateSettings: (s) => set((st) => ({ settings: { ...st.settings, ...s } })),
      products: defaultProducts,
      addProduct: async (p) => { const id = await addDoc_('products', p as Record<string, unknown>); set((s) => ({ products: [{ ...p, id, createdAt: now, updatedAt: now }, ...s.products] })); },
      updateProduct: async (id, p) => { await updateDoc_('products', id, p as Record<string, unknown>); set((s) => ({ products: s.products.map((x) => x.id === id ? { ...x, ...p, updatedAt: now } : x) })); },
      deleteProduct: async (id) => { await deleteDoc_('products', id); set((s) => ({ products: s.products.filter((x) => x.id !== id) })); },
      categories: defaultCategories,
      addCategory: async (c) => { const id = await addDoc_('categories', c as Record<string, unknown>); set((s) => ({ categories: [...s.categories, { ...c, id, productCount: 0 }] })); },
      updateCategory: async (id, c) => { await updateDoc_('categories', id, c as Record<string, unknown>); set((s) => ({ categories: s.categories.map((x) => x.id === id ? { ...x, ...c } : x) })); },
      deleteCategory: async (id) => { await deleteDoc_('categories', id); set((s) => ({ categories: s.categories.filter((x) => x.id !== id) })); },
      customers: defaultCustomers,
      addCustomer: async (c) => { const id = await addDoc_('customers', c as Record<string, unknown>); set((s) => ({ customers: [...s.customers, { ...c, id, createdAt: now, loyaltyPoints: 0, creditUsed: 0, totalPurchases: 0 }] })); },
      updateCustomer: async (id, c) => { await updateDoc_('customers', id, c as Record<string, unknown>); set((s) => ({ customers: s.customers.map((x) => x.id === id ? { ...x, ...c } : x) })); },
      suppliers: defaultSuppliers,
      addSupplier: async (s) => { const id = await addDoc_('suppliers', s as Record<string, unknown>); set((st) => ({ suppliers: [...st.suppliers, { ...s, id, createdAt: now, dueBalance: 0, totalPurchases: 0 }] })); },
      updateSupplier: async (id, s) => { await updateDoc_('suppliers', id, s as Record<string, unknown>); set((st) => ({ suppliers: st.suppliers.map((x) => x.id === id ? { ...x, ...s } : x) })); },
      transactions: sampleTransactions,
      addTransaction: async (t) => {
        const s = get(); const tx = { ...t, id: generateId(), invoiceNo: generateInvoiceNo(), createdAt: now };
        await addDoc_('transactions', tx as unknown as Record<string, unknown>).catch(() => {});
        const pu: Record<string, number> = {}; t.items.forEach((i) => { pu[i.productId] = (pu[i.productId] || 0) + i.quantity; });
        const up = s.products.map((p) => { const d = pu[p.id] || 0; return d > 0 ? { ...p, stock: Math.max(0, p.stock - d) } : p; });
        const uc = s.customers.map((c) => c.id === t.customerId ? { ...c, totalPurchases: c.totalPurchases + t.total, loyaltyPoints: c.loyaltyPoints + Math.floor(t.total / 100) } : c);
        set({ transactions: [tx, ...s.transactions], products: up, customers: uc });
        for (const [pid] of Object.entries(pu)) { const p = up.find((x) => x.id === pid); if (p) await updateDoc_('products', pid, { stock: p.stock }).catch(() => {}); }
        if (t.customerId) { const cu = uc.find((c) => c.id === t.customerId); if (cu) await updateDoc_('customers', t.customerId, { totalPurchases: cu.totalPurchases, loyaltyPoints: cu.loyaltyPoints }).catch(() => {}); }
      },
      updateTransaction: async (id, t) => { await updateDoc_('transactions', id, t as Record<string, unknown>).catch(() => {}); set((s) => ({ transactions: s.transactions.map((x) => x.id === id ? { ...x, ...t } : x) })); },
      grns: [],
      addGRN: async (g) => {
        const s = get(); const grn = { ...g, id: generateId(), grnNo: generateGRNNo(), createdAt: now };
        await addDoc_('grns', grn as unknown as Record<string, unknown>).catch(() => {});
        const pu: Record<string, number> = {}; g.items.forEach((i) => { pu[i.productId] = (pu[i.productId] || 0) + i.quantity; });
        const up = s.products.map((p) => { const a = pu[p.id] || 0; return a > 0 ? { ...p, stock: p.stock + a, costPrice: g.items.find((i) => i.productId === p.id)?.costPrice || p.costPrice } : p; });
        const us = s.suppliers.map((x) => x.id === g.supplierId ? { ...x, totalPurchases: x.totalPurchases + g.total, dueBalance: x.dueBalance + g.total } : x);
        set({ grns: [grn, ...s.grns], products: up, suppliers: us });
        for (const [pid] of Object.entries(pu)) { const p = up.find((x) => x.id === pid); if (p) await updateDoc_('products', pid, { stock: p.stock, costPrice: p.costPrice }).catch(() => {}); }
        if (g.supplierId) { const su = us.find((x) => x.id === g.supplierId); if (su) await updateDoc_('suppliers', g.supplierId, { totalPurchases: su.totalPurchases, dueBalance: su.dueBalance }).catch(() => {}); }
      },
      purchaseOrders: [],
      addPurchaseOrder: async (p) => { const id = (await addDoc_('purchaseOrders', { ...p, poNo: generatePONo() } as unknown as Record<string, unknown>).catch(() => '')) || generateId(); set((s) => ({ purchaseOrders: [...s.purchaseOrders, { ...p, id, poNo: generatePONo(), createdAt: now }] })); },
      updatePurchaseOrder: async (id, p) => { await updateDoc_('purchaseOrders', id, p as Record<string, unknown>).catch(() => {}); set((s) => ({ purchaseOrders: s.purchaseOrders.map((x) => x.id === id ? { ...x, ...p } : x) })); },
      expenses: sampleExpenses,
      addExpense: async (e) => { const id = (await addDoc_('expenses', e as Record<string, unknown>).catch(() => '')) || generateId(); set((s) => ({ expenses: [...s.expenses, { ...e, id }] })); },
      employees: defaultEmployees,
      addEmployee: async (e) => { const id = (await addDoc_('employees', e as Record<string, unknown>).catch(() => '')) || generateId(); set((s) => ({ employees: [...s.employees, { ...e, id }] })); },
      updateEmployee: async (id, e) => { await updateDoc_('employees', id, e as Record<string, unknown>).catch(() => {}); set((s) => ({ employees: s.employees.map((x) => x.id === id ? { ...x, ...e } : x) })); },
      attendance: sampleAttendance,
      addAttendance: async (a) => { const id = (await addDoc_('attendance', a as Record<string, unknown>).catch(() => '')) || generateId(); set((s) => ({ attendance: [...s.attendance, { ...a, id }] })); },
      stockAdjustments: [],
      addStockAdjustment: async (a) => {
        const s = get(); const adj = { ...a, id: generateId(), adjustedAt: now };
        await addDoc_('stockAdjustments', adj as unknown as Record<string, unknown>).catch(() => {});
        const up = s.products.map((p) => {
          if (p.id === a.productId) { const d = a.type === 'add' ? a.quantity : -a.quantity; return { ...p, stock: Math.max(0, p.stock + d), damagedStock: a.type === 'damage' ? p.damagedStock + a.quantity : p.damagedStock }; }
          return p;
        });
        set({ stockAdjustments: [adj, ...s.stockAdjustments], products: up });
        const p = up.find((x) => x.id === a.productId); if (p) await updateDoc_('products', a.productId, { stock: p.stock, damagedStock: p.damagedStock }).catch(() => {});
      },
      cart: [], cartDiscount: 0, cartCustomer: null, heldBills: [], draftBills: [],
      addToCart: (item) => set((s) => {
        const ex = s.cart.find((c) => c.productId === item.productId);
        if (ex) { const nq = ex.quantity + item.quantity; if (nq > item.maxStock) return s; return { cart: s.cart.map((c) => c.productId === item.productId ? { ...c, quantity: nq, total: nq * c.sellingPrice - c.discount } : c) }; }
        return { cart: [...s.cart, item] };
      }),
      removeFromCart: (pid) => set((s) => ({ cart: s.cart.filter((c) => c.productId !== pid) })),
      updateCartItem: (pid, q) => set((s) => ({ cart: s.cart.map((c) => c.productId === pid ? { ...c, quantity: q, total: q * c.sellingPrice - c.discount } : c) })),
      setCartDiscount: (d) => set({ cartDiscount: d }),
      setCartCustomer: (id) => set({ cartCustomer: id }),
      clearCart: () => set({ cart: [], cartDiscount: 0, cartCustomer: null }),
      holdBill: () => set((s) => ({ heldBills: [...s.heldBills, { id: generateId(), cart: [...s.cart], discount: s.cartDiscount, customer: s.cartCustomer, time: now }], cart: [], cartDiscount: 0, cartCustomer: null })),
      recallHeldBill: (id) => { const b = get().heldBills.find((x) => x.id === id); if (b) set({ cart: b.cart, cartDiscount: b.discount, cartCustomer: b.customer, heldBills: get().heldBills.filter((x) => x.id !== id) }); },
      removeHeldBill: (id) => set((s) => ({ heldBills: s.heldBills.filter((x) => x.id !== id) })),
      saveDraft: () => set((s) => ({ draftBills: [...s.draftBills, { id: generateId(), cart: [...s.cart], discount: s.cartDiscount, customer: s.cartCustomer, time: now }], cart: [], cartDiscount: 0, cartCustomer: null })),
      recallDraft: (id) => { const d = get().draftBills.find((x) => x.id === id); if (d) set({ cart: d.cart, cartDiscount: d.discount, cartCustomer: d.customer, draftBills: get().draftBills.filter((x) => x.id !== id) }); },
      removeDraft: (id) => set((s) => ({ draftBills: s.draftBills.filter((x) => x.id !== id) })),
      sidebarOpen: false, setSidebarOpen: (o) => set({ sidebarOpen: o }),
    }),
    { name: 'lankapos-store', partialize: (s) => ({ products: s.products, categories: s.categories, customers: s.customers, suppliers: s.suppliers, transactions: s.transactions, grns: s.grns, purchaseOrders: s.purchaseOrders, expenses: s.expenses, employees: s.employees, attendance: s.attendance, stockAdjustments: s.stockAdjustments, settings: s.settings, heldBills: s.heldBills, draftBills: s.draftBills, currentUser: s.currentUser }) }
  )
);
