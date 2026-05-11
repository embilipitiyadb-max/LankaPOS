export interface Product {
  id: string; name: string; nameLocal?: string; barcode: string; category: string;
  costPrice: number; sellingPrice: number; stock: number; minStock: number;
  unit: string; tax: number; hasVariants: boolean; damagedStock: number;
  isActive: boolean; createdAt: string; updatedAt: string;
}
export interface Category {
  id: string; name: string; nameLocal?: string; color?: string; productCount: number;
}
export interface Customer {
  id: string; name: string; phone: string; email?: string; address?: string;
  type: 'regular' | 'credit' | 'loyalty'; loyaltyPoints: number;
  creditLimit: number; creditUsed: number; totalPurchases: number; createdAt: string;
}
export interface Supplier {
  id: string; name: string; phone: string; email?: string; address?: string;
  contactPerson?: string; dueBalance: number; totalPurchases: number; createdAt: string;
}
export interface TransactionItem {
  productId: string; productName: string; barcode: string; quantity: number;
  costPrice: number; sellingPrice: number; discount: number; total: number;
}
export interface Transaction {
  id: string; invoiceNo: string; items: TransactionItem[]; subtotal: number;
  discount: number; tax: number; total: number;
  paymentMethod: 'cash' | 'card' | 'credit' | 'multiple';
  cashAmount?: number; cardAmount?: number; changeAmount?: number;
  customerId?: string; customerName?: string; cashierId: string;
  cashierName: string; status: 'completed' | 'held' | 'draft' | 'returned'; createdAt: string;
}
export interface GRNItem {
  productId: string; productName: string; quantity: number; costPrice: number;
  total: number; batchNo?: string; expiryDate?: string;
}
export interface GRN {
  id: string; grnNo: string; supplierId: string; supplierName: string;
  items: GRNItem[]; subtotal: number; commission: number; transportCharge: number;
  total: number; status: 'pending' | 'received' | 'partial';
  receivedBy: string; receivedAt: string; createdAt: string;
}
export interface PurchaseOrder {
  id: string; poNo: string; supplierId: string; supplierName: string;
  items: GRNItem[]; total: number; status: 'draft' | 'sent' | 'received' | 'cancelled'; createdAt: string;
}
export interface Expense {
  id: string; category: string; description: string; amount: number; date: string; recordedBy: string;
}
export interface Employee {
  id: string; userId: string; name: string; email: string; phone: string;
  role: 'admin' | 'cashier' | 'employee'; salary: number; joinedAt: string; active: boolean;
}
export interface Attendance {
  id: string; employeeId: string; employeeName: string; date: string;
  checkIn: string; checkOut?: string; status: 'present' | 'absent' | 'late' | 'half-day';
}
export interface StockAdjustment {
  id: string; productId: string; productName: string; type: 'add' | 'remove' | 'damage' | 'transfer';
  quantity: number; reason: string; adjustedBy: string; adjustedAt: string;
}
export interface AppSettings {
  language: 'en' | 'si'; currency: string; taxRate: number;
  businessName: string; businessAddress: string; businessPhone: string;
  receiptFooter: string; autoBackup: boolean;
}
