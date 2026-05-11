import { useState, useMemo } from 'react';
import { useStore } from '../../store/useStore';
import { formatLKR, formatDate } from '../../lib/utils';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import StatCard from '../../components/ui/StatCard';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';
import { Download, FileSpreadsheet, TrendingUp, DollarSign, Package, Calendar } from 'lucide-react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

// ─── Constants ────────────────────────────────────────────────────────────────

const PIE_COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#22c55e', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

type TabKey = 'sales' | 'profit' | 'stock' | 'grn' | 'expenses';
type DateRange = 'today' | 'week' | 'month' | 'custom';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'sales', label: 'Sales' },
  { key: 'profit', label: 'Profit' },
  { key: 'stock', label: 'Stock' },
  { key: 'grn', label: 'GRN' },
  { key: 'expenses', label: 'Expenses' },
];

const DATE_RANGES: { key: DateRange; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'custom', label: 'Custom' },
];

const tooltipStyle = {
  background: 'rgba(26,26,26,0.9)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '8px',
  color: '#e5e5e5',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getRangeStart(range: DateRange, customFrom?: string): string {
  const d = new Date();
  if (range === 'today') {
    d.setHours(0, 0, 0, 0);
  } else if (range === 'week') {
    const day = d.getDay();
    d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
    d.setHours(0, 0, 0, 0);
  } else if (range === 'month') {
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
  } else if (range === 'custom' && customFrom) {
    return new Date(customFrom).toISOString();
  }
  return d.toISOString();
}

function getRangeEnd(range: DateRange, customTo?: string): string {
  if (range === 'custom' && customTo) {
    const d = new Date(customTo);
    d.setHours(23, 59, 59, 999);
    return d.toISOString();
  }
  return new Date().toISOString();
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('sales');
  const [dateRange, setDateRange] = useState<DateRange>('month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const transactions = useStore((s) => s.transactions);
  const products = useStore((s) => s.products);
  const categories = useStore((s) => s.categories);
  const grns = useStore((s) => s.grns);
  const expenses = useStore((s) => s.expenses);
  const employees = useStore((s) => s.employees);

  const rangeStart = useMemo(() => getRangeStart(dateRange, customFrom), [dateRange, customFrom]);
  const rangeEnd = useMemo(() => getRangeEnd(dateRange, customTo), [dateRange, customTo]);

  // ─── Filtered data ─────────────────────────────────────────────────────────

  const filteredTransactions = useMemo(
    () =>
      transactions.filter(
        (t) => t.status === 'completed' && t.createdAt >= rangeStart && t.createdAt <= rangeEnd,
      ),
    [transactions, rangeStart, rangeEnd],
  );

  const filteredExpenses = useMemo(
    () => expenses.filter((e) => e.date >= rangeStart && e.date <= rangeEnd),
    [expenses, rangeStart, rangeEnd],
  );

  const filteredGRNs = useMemo(
    () => grns.filter((g) => g.createdAt >= rangeStart && g.createdAt <= rangeEnd),
    [grns, rangeStart, rangeEnd],
  );

  // ─── Sales data ────────────────────────────────────────────────────────────

  const totalSales = useMemo(
    () => filteredTransactions.reduce((sum, t) => sum + t.total, 0),
    [filteredTransactions],
  );

  const totalTransactions = filteredTransactions.length;

  const averageSale = totalTransactions > 0 ? totalSales / totalTransactions : 0;

  const topCategory = useMemo(() => {
    const catMap: Record<string, number> = {};
    filteredTransactions.forEach((t) => {
      t.items.forEach((item) => {
        const product = products.find((p) => p.id === item.productId);
        if (product) {
          const cat = categories.find((c) => c.id === product.category);
          const catName = cat?.name || 'Other';
          catMap[catName] = (catMap[catName] || 0) + item.total;
        }
      });
    });
    const sorted = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
    return sorted.length > 0 ? sorted[0][0] : 'N/A';
  }, [filteredTransactions, products, categories]);

  const salesByDayChart = useMemo(() => {
    const days: { name: string; sales: number }[] = [];
    const start = new Date(rangeStart);
    const end = new Date(rangeEnd);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dayStart = new Date(d);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(d);
      dayEnd.setHours(23, 59, 59, 999);
      const dayLabel = dayStart.toLocaleDateString('en-LK', { month: 'short', day: 'numeric' });
      const daySales = filteredTransactions
        .filter((t) => t.createdAt >= dayStart.toISOString() && t.createdAt <= dayEnd.toISOString())
        .reduce((sum, t) => sum + t.total, 0);
      days.push({ name: dayLabel, sales: daySales });
    }
    return days;
  }, [filteredTransactions, rangeStart, rangeEnd]);

  const salesTableData = useMemo(
    () =>
      filteredTransactions.map((t) => ({
        date: t.createdAt,
        invoice: t.invoiceNo,
        customer: t.customerName || 'Walk-in',
        items: t.items.length,
        total: t.total,
        payment: t.paymentMethod,
      })),
    [filteredTransactions],
  );

  // ─── Profit data ───────────────────────────────────────────────────────────

  const totalRevenue = totalSales;

  const totalCost = useMemo(
    () =>
      filteredTransactions.reduce(
        (sum, t) => sum + t.items.reduce((c, i) => c + i.costPrice * i.quantity, 0),
        0,
      ),
    [filteredTransactions],
  );

  const grossProfit = totalRevenue - totalCost;
  const profitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

  const profitLineChart = useMemo(() => {
    const days: { name: string; revenue: number; cost: number; profit: number }[] = [];
    const start = new Date(rangeStart);
    const end = new Date(rangeEnd);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dayStart = new Date(d);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(d);
      dayEnd.setHours(23, 59, 59, 999);
      const dayLabel = dayStart.toLocaleDateString('en-LK', { month: 'short', day: 'numeric' });
      const dayTxns = filteredTransactions.filter(
        (t) => t.createdAt >= dayStart.toISOString() && t.createdAt <= dayEnd.toISOString(),
      );
      const rev = dayTxns.reduce((s, t) => s + t.total, 0);
      const cost = dayTxns.reduce((s, t) => s + t.items.reduce((c, i) => c + i.costPrice * i.quantity, 0), 0);
      days.push({ name: dayLabel, revenue: rev, cost, profit: rev - cost });
    }
    return days;
  }, [filteredTransactions, rangeStart, rangeEnd]);

  const profitTableData = useMemo(() => {
    const productMap: Record<string, { soldQty: number; revenue: number; cost: number }> = {};
    filteredTransactions.forEach((t) => {
      t.items.forEach((item) => {
        if (!productMap[item.productId]) {
          productMap[item.productId] = { soldQty: 0, revenue: 0, cost: 0 };
        }
        productMap[item.productId].soldQty += item.quantity;
        productMap[item.productId].revenue += item.sellingPrice * item.quantity;
        productMap[item.productId].cost += item.costPrice * item.quantity;
      });
    });
    return Object.entries(productMap).map(([productId, data]) => {
      const product = products.find((p) => p.id === productId);
      return {
        product: product?.name || 'Unknown',
        soldQty: data.soldQty,
        revenue: data.revenue,
        cost: data.cost,
        profit: data.revenue - data.cost,
      };
    });
  }, [filteredTransactions, products]);

  // ─── Stock data ─────────────────────────────────────────────────────────────

  const totalProducts = products.length;
  const lowStockProducts = products.filter((p) => p.stock > 0 && p.stock < p.minStock);
  const outOfStockProducts = products.filter((p) => p.stock === 0);
  const totalStockValue = products.reduce((sum, p) => sum + p.stock * p.costPrice, 0);

  const stockByCategoryChart = useMemo(() => {
    const catMap: Record<string, number> = {};
    products.forEach((p) => {
      const cat = categories.find((c) => c.id === p.category);
      const catName = cat?.name || 'Other';
      catMap[catName] = (catMap[catName] || 0) + p.stock * p.costPrice;
    });
    return Object.entries(catMap).map(([name, value]) => ({ name, value }));
  }, [products, categories]);

  const stockTableData = useMemo(
    () =>
      products.map((p) => {
        const cat = categories.find((c) => c.id === p.category);
        const status: 'In Stock' | 'Low Stock' | 'Out of Stock' =
          p.stock === 0 ? 'Out of Stock' : p.stock < p.minStock ? 'Low Stock' : 'In Stock';
        return {
          product: p.name,
          category: cat?.name || 'Other',
          stock: p.stock,
          minStock: p.minStock,
          value: p.stock * p.costPrice,
          status,
        };
      }),
    [products, categories],
  );

  // ─── GRN data ──────────────────────────────────────────────────────────────

  const totalGRNs = filteredGRNs.length;
  const totalPurchaseValue = filteredGRNs.reduce((sum, g) => sum + g.total, 0);
  const pendingGRNs = filteredGRNs.filter((g) => g.status === 'pending').length;
  const totalCommission = filteredGRNs.reduce((sum, g) => sum + g.commission, 0);

  const grnTableData = useMemo(
    () =>
      filteredGRNs.map((g) => ({
        grnNo: g.grnNo,
        supplier: g.supplierName,
        items: g.items.length,
        total: g.total,
        commission: g.commission,
        transport: g.transportCharge,
        date: g.createdAt,
      })),
    [filteredGRNs],
  );

  // ─── Expenses data ─────────────────────────────────────────────────────────

  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

  const thisMonthExpenses = useMemo(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return expenses
      .filter((e) => e.date >= d.toISOString())
      .reduce((sum, e) => sum + e.amount, 0);
  }, [expenses]);

  const topExpenseCategory = useMemo(() => {
    const catMap: Record<string, number> = {};
    filteredExpenses.forEach((e) => {
      catMap[e.category] = (catMap[e.category] || 0) + e.amount;
    });
    const sorted = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
    return sorted.length > 0 ? sorted[0][0] : 'N/A';
  }, [filteredExpenses]);

  const dailyAverage = useMemo(() => {
    if (filteredExpenses.length === 0) return 0;
    const days = new Set(filteredExpenses.map((e) => new Date(e.date).toDateString())).size;
    return totalExpenses / Math.max(days, 1);
  }, [filteredExpenses, totalExpenses]);

  const expensesByCategoryChart = useMemo(() => {
    const catMap: Record<string, number> = {};
    filteredExpenses.forEach((e) => {
      catMap[e.category] = (catMap[e.category] || 0) + e.amount;
    });
    return Object.entries(catMap).map(([name, amount]) => ({ name, amount }));
  }, [filteredExpenses]);

  const expensesTableData = useMemo(
    () =>
      filteredExpenses.map((e) => {
        const emp = employees.find((em) => em.id === e.recordedBy);
        return {
          date: e.date,
          category: e.category,
          description: e.description,
          amount: e.amount,
          recordedBy: emp?.name || e.recordedBy,
        };
      }),
    [filteredExpenses, employees],
  );

  // ─── Export ─────────────────────────────────────────────────────────────────

  const exportExcel = () => {
    const wb = XLSX.utils.book_new();

    if (activeTab === 'sales') {
      const ws = XLSX.utils.json_to_sheet(
        salesTableData.map((r) => ({
          Date: formatDate(r.date),
          Invoice: r.invoice,
          Customer: r.customer,
          Items: r.items,
          Total: r.total,
          'Payment Method': r.payment,
        })),
      );
      XLSX.utils.book_append_sheet(wb, ws, 'Sales');
    } else if (activeTab === 'profit') {
      const ws = XLSX.utils.json_to_sheet(
        profitTableData.map((r) => ({
          Product: r.product,
          'Sold Qty': r.soldQty,
          Revenue: r.revenue,
          Cost: r.cost,
          Profit: r.profit,
        })),
      );
      XLSX.utils.book_append_sheet(wb, ws, 'Profit');
    } else if (activeTab === 'stock') {
      const ws = XLSX.utils.json_to_sheet(
        stockTableData.map((r) => ({
          Product: r.product,
          Category: r.category,
          Stock: r.stock,
          'Min Stock': r.minStock,
          Value: r.value,
          Status: r.status,
        })),
      );
      XLSX.utils.book_append_sheet(wb, ws, 'Stock');
    } else if (activeTab === 'grn') {
      const ws = XLSX.utils.json_to_sheet(
        grnTableData.map((r) => ({
          'GRN#': r.grnNo,
          Supplier: r.supplier,
          Items: r.items,
          Total: r.total,
          Commission: r.commission,
          Transport: r.transport,
          Date: formatDate(r.date),
        })),
      );
      XLSX.utils.book_append_sheet(wb, ws, 'GRN');
    } else if (activeTab === 'expenses') {
      const ws = XLSX.utils.json_to_sheet(
        expensesTableData.map((r) => ({
          Date: formatDate(r.date),
          Category: r.category,
          Description: r.description,
          Amount: r.amount,
          'Recorded By': r.recordedBy,
        })),
      );
      XLSX.utils.book_append_sheet(wb, ws, 'Expenses');
    }

    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([buf], { type: 'application/octet-stream' }), `${activeTab}-report.xlsx`);
  };

  const exportPDF = () => {
    window.print();
  };

  // ─── Render helpers ─────────────────────────────────────────────────────────

  const paymentBadge = (method: string) => {
    const variant = method === 'cash' ? 'success' as const : method === 'card' ? 'info' as const : 'warning' as const;
    return <Badge variant={variant}>{method}</Badge>;
  };

  const statusBadge = (status: string) => {
    const variant = status === 'In Stock' ? 'success' as const : status === 'Low Stock' ? 'warning' as const : 'danger' as const;
    return <Badge variant={variant}>{status}</Badge>;
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 sm:p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-dark-100">Reports</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="secondary" size="sm" onClick={exportPDF}>
            <Download className="w-4 h-4" />
            Export PDF
          </Button>
          <Button variant="primary" size="sm" onClick={exportExcel}>
            <FileSpreadsheet className="w-4 h-4" />
            Export Excel
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 glass rounded-xl overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`
              flex-1 min-w-[80px] px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap
              ${activeTab === tab.key
                ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/20'
                : 'text-dark-300 hover:text-white hover:bg-white/5'}
            `}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Date range filter */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex gap-1 p-1 glass rounded-xl overflow-x-auto">
          {DATE_RANGES.map((dr) => (
            <button
              key={dr.key}
              onClick={() => setDateRange(dr.key)}
              className={`
                px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap
                ${dateRange === dr.key
                  ? 'bg-dark-700 text-white'
                  : 'text-dark-400 hover:text-white hover:bg-white/5'}
              `}
            >
              {dr.label}
            </button>
          ))}
        </div>
        {dateRange === 'custom' && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="bg-dark-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-dark-100 focus:outline-none focus:border-primary-500"
            />
            <span className="text-dark-400 text-sm">to</span>
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="bg-dark-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-dark-100 focus:outline-none focus:border-primary-500"
            />
          </div>
        )}
        <div className="flex items-center gap-1.5 text-sm text-dark-400">
          <Calendar className="w-4 h-4" />
          <span>{formatDate(rangeStart)} - {formatDate(rangeEnd)}</span>
        </div>
      </div>

      {/* ─── SALES TAB ──────────────────────────────────────────────────────── */}
      {activeTab === 'sales' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Sales"
              value={formatLKR(totalSales)}
              icon={<DollarSign className="w-8 h-8" />}
              color="text-primary-500"
            />
            <StatCard
              title="Total Transactions"
              value={String(totalTransactions)}
              icon={<TrendingUp className="w-8 h-8" />}
              color="text-success-400"
            />
            <StatCard
              title="Average Sale"
              value={formatLKR(averageSale)}
              icon={<DollarSign className="w-8 h-8" />}
              color="text-info-400"
            />
            <StatCard
              title="Top Category"
              value={topCategory}
              icon={<Package className="w-8 h-8" />}
              color="text-warning-400"
            />
          </div>

          <div className="glass rounded-2xl p-5 animate-slide-up">
            <h2 className="text-lg font-semibold text-dark-100 mb-4">Sales by Day</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={salesByDayChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="name" stroke="#a3a3a3" fontSize={12} />
                <YAxis stroke="#a3a3a3" fontSize={12} />
                <Tooltip
                  formatter={(value: unknown) => [formatLKR(Number(value)), 'Sales']}
                  contentStyle={tooltipStyle}
                />
                <Bar dataKey="sales" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="glass rounded-2xl p-5 animate-slide-up overflow-x-auto">
            <h2 className="text-lg font-semibold text-dark-100 mb-4">Sales Transactions</h2>
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="border-b border-dark-700">
                  <th className="text-left py-2 px-3 text-dark-300 font-medium">Date</th>
                  <th className="text-left py-2 px-3 text-dark-300 font-medium">Invoice#</th>
                  <th className="text-left py-2 px-3 text-dark-300 font-medium">Customer</th>
                  <th className="text-right py-2 px-3 text-dark-300 font-medium">Items</th>
                  <th className="text-right py-2 px-3 text-dark-300 font-medium">Total</th>
                  <th className="text-left py-2 px-3 text-dark-300 font-medium">Payment Method</th>
                </tr>
              </thead>
              <tbody>
                {salesTableData.map((row, i) => (
                  <tr key={i} className="border-b border-dark-700/50 hover:bg-white/[0.02] transition-colors">
                    <td className="py-2.5 px-3 text-dark-300">{formatDate(row.date)}</td>
                    <td className="py-2.5 px-3 text-dark-100 font-medium">{row.invoice}</td>
                    <td className="py-2.5 px-3 text-dark-300">{row.customer}</td>
                    <td className="py-2.5 px-3 text-right text-dark-300">{row.items}</td>
                    <td className="py-2.5 px-3 text-right text-primary-400 font-medium">{formatLKR(row.total)}</td>
                    <td className="py-2.5 px-3">{paymentBadge(row.payment)}</td>
                  </tr>
                ))}
                {salesTableData.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-dark-400">No sales data for this period</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── PROFIT TAB ─────────────────────────────────────────────────────── */}
      {activeTab === 'profit' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Revenue"
              value={formatLKR(totalRevenue)}
              icon={<DollarSign className="w-8 h-8" />}
              color="text-primary-500"
            />
            <StatCard
              title="Total Cost"
              value={formatLKR(totalCost)}
              icon={<Package className="w-8 h-8" />}
              color="text-warning-400"
            />
            <StatCard
              title="Gross Profit"
              value={formatLKR(grossProfit)}
              icon={<TrendingUp className="w-8 h-8" />}
              color={grossProfit >= 0 ? 'text-success-400' : 'text-primary-500'}
            />
            <StatCard
              title="Profit Margin %"
              value={`${profitMargin.toFixed(1)}%`}
              icon={<TrendingUp className="w-8 h-8" />}
              color={profitMargin >= 0 ? 'text-success-400' : 'text-primary-500'}
            />
          </div>

          <div className="glass rounded-2xl p-5 animate-slide-up">
            <h2 className="text-lg font-semibold text-dark-100 mb-4">Revenue vs Cost vs Profit</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={profitLineChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="name" stroke="#a3a3a3" fontSize={12} />
                <YAxis stroke="#a3a3a3" fontSize={12} />
                <Tooltip
                  formatter={(value: unknown, name: unknown) => [formatLKR(Number(value)), String(name)]}
                  contentStyle={tooltipStyle}
                />
                <Legend />
                <Line type="monotone" dataKey="revenue" stroke="#ef4444" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="cost" stroke="#f59e0b" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="profit" stroke="#22c55e" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="glass rounded-2xl p-5 animate-slide-up overflow-x-auto">
            <h2 className="text-lg font-semibold text-dark-100 mb-4">Product-wise Profit</h2>
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="border-b border-dark-700">
                  <th className="text-left py-2 px-3 text-dark-300 font-medium">Product</th>
                  <th className="text-right py-2 px-3 text-dark-300 font-medium">Sold Qty</th>
                  <th className="text-right py-2 px-3 text-dark-300 font-medium">Revenue</th>
                  <th className="text-right py-2 px-3 text-dark-300 font-medium">Cost</th>
                  <th className="text-right py-2 px-3 text-dark-300 font-medium">Profit</th>
                </tr>
              </thead>
              <tbody>
                {profitTableData.map((row, i) => (
                  <tr key={i} className="border-b border-dark-700/50 hover:bg-white/[0.02] transition-colors">
                    <td className="py-2.5 px-3 text-dark-100 font-medium">{row.product}</td>
                    <td className="py-2.5 px-3 text-right text-dark-300">{row.soldQty}</td>
                    <td className="py-2.5 px-3 text-right text-dark-300">{formatLKR(row.revenue)}</td>
                    <td className="py-2.5 px-3 text-right text-dark-300">{formatLKR(row.cost)}</td>
                    <td className={`py-2.5 px-3 text-right font-medium ${row.profit >= 0 ? 'text-success-400' : 'text-primary-500'}`}>
                      {formatLKR(row.profit)}
                    </td>
                  </tr>
                ))}
                {profitTableData.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-dark-400">No profit data for this period</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── STOCK TAB ──────────────────────────────────────────────────────── */}
      {activeTab === 'stock' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Products"
              value={String(totalProducts)}
              icon={<Package className="w-8 h-8" />}
              color="text-primary-500"
            />
            <StatCard
              title="Low Stock"
              value={String(lowStockProducts.length)}
              icon={<TrendingUp className="w-8 h-8" />}
              color="text-warning-400"
            />
            <StatCard
              title="Out of Stock"
              value={String(outOfStockProducts.length)}
              icon={<Package className="w-8 h-8" />}
              color="text-primary-500"
            />
            <StatCard
              title="Total Value"
              value={formatLKR(totalStockValue)}
              icon={<DollarSign className="w-8 h-8" />}
              color="text-success-400"
            />
          </div>

          <div className="glass rounded-2xl p-5 animate-slide-up">
            <h2 className="text-lg font-semibold text-dark-100 mb-4">Stock Value by Category</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stockByCategoryChart}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {stockByCategoryChart.map((_, index) => (
                    <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: unknown) => [formatLKR(Number(value)), 'Value']}
                  contentStyle={tooltipStyle}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-3 mt-2 justify-center">
              {stockByCategoryChart.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-1.5 text-xs text-dark-300">
                  <span
                    className="w-2.5 h-2.5 rounded-full inline-block"
                    style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                  />
                  {entry.name}
                </div>
              ))}
            </div>
          </div>

          <div className="glass rounded-2xl p-5 animate-slide-up overflow-x-auto">
            <h2 className="text-lg font-semibold text-dark-100 mb-4">Stock Overview</h2>
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="border-b border-dark-700">
                  <th className="text-left py-2 px-3 text-dark-300 font-medium">Product</th>
                  <th className="text-left py-2 px-3 text-dark-300 font-medium">Category</th>
                  <th className="text-right py-2 px-3 text-dark-300 font-medium">Stock</th>
                  <th className="text-right py-2 px-3 text-dark-300 font-medium">Min Stock</th>
                  <th className="text-right py-2 px-3 text-dark-300 font-medium">Value</th>
                  <th className="text-left py-2 px-3 text-dark-300 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {stockTableData.map((row, i) => (
                  <tr key={i} className="border-b border-dark-700/50 hover:bg-white/[0.02] transition-colors">
                    <td className="py-2.5 px-3 text-dark-100 font-medium">{row.product}</td>
                    <td className="py-2.5 px-3 text-dark-300">{row.category}</td>
                    <td className="py-2.5 px-3 text-right text-dark-300">{row.stock}</td>
                    <td className="py-2.5 px-3 text-right text-dark-400">{row.minStock}</td>
                    <td className="py-2.5 px-3 text-right text-primary-400 font-medium">{formatLKR(row.value)}</td>
                    <td className="py-2.5 px-3">{statusBadge(row.status)}</td>
                  </tr>
                ))}
                {stockTableData.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-dark-400">No products found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── GRN TAB ───────────────────────────────────────────────────────── */}
      {activeTab === 'grn' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total GRNs"
              value={String(totalGRNs)}
              icon={<Package className="w-8 h-8" />}
              color="text-primary-500"
            />
            <StatCard
              title="Total Purchase Value"
              value={formatLKR(totalPurchaseValue)}
              icon={<DollarSign className="w-8 h-8" />}
              color="text-warning-400"
            />
            <StatCard
              title="Pending GRNs"
              value={String(pendingGRNs)}
              icon={<TrendingUp className="w-8 h-8" />}
              color="text-primary-500"
            />
            <StatCard
              title="Total Commission"
              value={formatLKR(totalCommission)}
              icon={<DollarSign className="w-8 h-8" />}
              color="text-success-400"
            />
          </div>

          <div className="glass rounded-2xl p-5 animate-slide-up overflow-x-auto">
            <h2 className="text-lg font-semibold text-dark-100 mb-4">Goods Received Notes</h2>
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="border-b border-dark-700">
                  <th className="text-left py-2 px-3 text-dark-300 font-medium">GRN#</th>
                  <th className="text-left py-2 px-3 text-dark-300 font-medium">Supplier</th>
                  <th className="text-right py-2 px-3 text-dark-300 font-medium">Items</th>
                  <th className="text-right py-2 px-3 text-dark-300 font-medium">Total</th>
                  <th className="text-right py-2 px-3 text-dark-300 font-medium">Commission</th>
                  <th className="text-right py-2 px-3 text-dark-300 font-medium">Transport</th>
                  <th className="text-left py-2 px-3 text-dark-300 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {grnTableData.map((row, i) => (
                  <tr key={i} className="border-b border-dark-700/50 hover:bg-white/[0.02] transition-colors">
                    <td className="py-2.5 px-3 text-dark-100 font-medium">{row.grnNo}</td>
                    <td className="py-2.5 px-3 text-dark-300">{row.supplier}</td>
                    <td className="py-2.5 px-3 text-right text-dark-300">{row.items}</td>
                    <td className="py-2.5 px-3 text-right text-primary-400 font-medium">{formatLKR(row.total)}</td>
                    <td className="py-2.5 px-3 text-right text-dark-300">{formatLKR(row.commission)}</td>
                    <td className="py-2.5 px-3 text-right text-dark-300">{formatLKR(row.transport)}</td>
                    <td className="py-2.5 px-3 text-dark-400">{formatDate(row.date)}</td>
                  </tr>
                ))}
                {grnTableData.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-dark-400">No GRNs found for this period</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── EXPENSES TAB ──────────────────────────────────────────────────── */}
      {activeTab === 'expenses' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Expenses"
              value={formatLKR(totalExpenses)}
              icon={<DollarSign className="w-8 h-8" />}
              color="text-primary-500"
            />
            <StatCard
              title="This Month"
              value={formatLKR(thisMonthExpenses)}
              icon={<Calendar className="w-8 h-8" />}
              color="text-warning-400"
            />
            <StatCard
              title="Top Category"
              value={topExpenseCategory}
              icon={<TrendingUp className="w-8 h-8" />}
              color="text-info-400"
            />
            <StatCard
              title="Daily Average"
              value={formatLKR(dailyAverage)}
              icon={<DollarSign className="w-8 h-8" />}
              color="text-success-400"
            />
          </div>

          <div className="glass rounded-2xl p-5 animate-slide-up">
            <h2 className="text-lg font-semibold text-dark-100 mb-4">Expenses by Category</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={expensesByCategoryChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="name" stroke="#a3a3a3" fontSize={12} />
                <YAxis stroke="#a3a3a3" fontSize={12} />
                <Tooltip
                  formatter={(value: unknown) => [formatLKR(Number(value)), 'Amount']}
                  contentStyle={tooltipStyle}
                />
                <Bar dataKey="amount" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="glass rounded-2xl p-5 animate-slide-up overflow-x-auto">
            <h2 className="text-lg font-semibold text-dark-100 mb-4">Expense Records</h2>
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="border-b border-dark-700">
                  <th className="text-left py-2 px-3 text-dark-300 font-medium">Date</th>
                  <th className="text-left py-2 px-3 text-dark-300 font-medium">Category</th>
                  <th className="text-left py-2 px-3 text-dark-300 font-medium">Description</th>
                  <th className="text-right py-2 px-3 text-dark-300 font-medium">Amount</th>
                  <th className="text-left py-2 px-3 text-dark-300 font-medium">Recorded By</th>
                </tr>
              </thead>
              <tbody>
                {expensesTableData.map((row, i) => (
                  <tr key={i} className="border-b border-dark-700/50 hover:bg-white/[0.02] transition-colors">
                    <td className="py-2.5 px-3 text-dark-300">{formatDate(row.date)}</td>
                    <td className="py-2.5 px-3">
                      <Badge variant="default">{row.category}</Badge>
                    </td>
                    <td className="py-2.5 px-3 text-dark-300">{row.description}</td>
                    <td className="py-2.5 px-3 text-right text-primary-400 font-medium">{formatLKR(row.amount)}</td>
                    <td className="py-2.5 px-3 text-dark-400">{row.recordedBy}</td>
                  </tr>
                ))}
                {expensesTableData.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-dark-400">No expenses found for this period</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
