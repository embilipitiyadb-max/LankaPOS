export function formatLKR(n: number): string {
  return `Rs. ${n.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}
export function generateInvoiceNo(): string {
  const d = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `INV-${d}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
}
export function generateGRNNo(): string {
  const d = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `GRN-${d}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
}
export function generatePONo(): string {
  const d = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `PO-${d}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
}
export function generateBarcode(): string {
  return '490' + Math.floor(Math.random() * 10000000000).toString().padStart(10, '0');
}
export function formatDate(d: string | Date): string {
  return new Date(d).toLocaleDateString('en-LK', { year: 'numeric', month: 'short', day: 'numeric' });
}
export function formatTime(d: string | Date): string {
  return new Date(d).toLocaleTimeString('en-LK', { hour: '2-digit', minute: '2-digit' });
}
export function cn(...c: (string | boolean | undefined | null)[]): string {
  return c.filter(Boolean).join(' ');
}
