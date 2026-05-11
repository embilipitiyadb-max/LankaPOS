import { useMemo } from 'react';
import { useStore } from '../../store/useStore';
import { formatLKR, formatTime } from '../../lib/utils';
import StatCard from '../../components/ui/StatCard';
import Badge from '../../components/ui/Badge';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, CartesianGrid,
} from 'recharts';
import { DollarSign, TrendingUp, Package, AlertTriangle } from 'lucide-react';

const PIE_COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#22c55e', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

export default function DashboardPage() {
  const transactions = useStore((s) => s.transactions);
  const products = useStore((s) => s.products);
  const categories = useStore((s) => s.categories);

  const todayStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }, []);

  const monthStart = useMemo(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }, []);

  const completedTransactions = useMemo(
    () => transactions.filter((t) => t.status === 'completed'),
    [transactions],
  );

  const todaySales = useMemo(
    () =>
      completedTransactions
        .filter((t) => t.createdAt >= todayStart)
        .reduce((sum, t) => sum + t.total, 0),
    [completedTransactions, todayStart],
  );

  const monthlySales = useMemo(
    () =>
      completedTransactions
        .filter((t) => t.createdAt >= monthStart)
        .reduce((sum, t) => sum + t.total, 0),
    [completedTransactions, monthStart],
  );

  const totalProfit = useMemo(
    () =>
      completedTransactions.reduce(
        (sum, t) =>
          sum + t.items.reduce((p, i) => p + (i.sellingPrice - i.costPrice) * i.quantity, 0),
        0,
      ),
    [completedTransactions],
  );

  const lowStockProducts = useMemo(
    () => products.filter((p) => p.stock < p.minStock),
    [products],
  );

  const last7DaysChartData = useMemo(() => {
    const days: { name: string; sales: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const dayStart = d.toISOString();
      d.setDate(d.getDate() + 1);
      const dayEnd = d.toISOString();
      const dayLabel = new Date(dayStart).toLocaleDateString('en-LK', { weekday: 'short' });
      const daySales = completedTransactions
        .filter((t) => t.createdAt >= dayStart && t.createdAt < dayEnd)
        .reduce((sum, t) => sum + t.total, 0);
      days.push({ name: dayLabel, sales: daySales });
    }
    return days;
  }, [completedTransactions]);

  const salesByCategoryData = useMemo(() => {
    const catMap: Record<string, number> = {};
    completedTransactions.forEach((t) => {
      t.items.forEach((item) => {
        const product = products.find((p) => p.id === item.productId);
        if (product) {
          const cat = categories.find((c) => c.id === product.category);
          const catName = cat?.name || 'Other';
          catMap[catName] = (catMap[catName] || 0) + item.total;
        }
      });
    });
    return Object.entries(catMap).map(([name, value]) => ({ name, value }));
  }, [completedTransactions, products, categories]);

  const recentTransactions = useMemo(
    () => [...completedTransactions].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5),
    [completedTransactions],
  );

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-dark-100">Dashboard</h1>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Today Sales"
          value={formatLKR(todaySales)}
          icon={<DollarSign className="w-8 h-8" />}
          color="text-primary-500"
          change={12}
          changeType="up"
        />
        <StatCard
          title="Monthly Sales"
          value={formatLKR(monthlySales)}
          icon={<TrendingUp className="w-8 h-8" />}
          color="text-success-400"
          change={8}
          changeType="up"
        />
        <StatCard
          title="Total Profit"
          value={formatLKR(totalProfit)}
          icon={<Package className="w-8 h-8" />}
          color="text-info-400"
          change={5}
          changeType="up"
        />
        <StatCard
          title="Low Stock"
          value={String(lowStockProducts.length)}
          icon={<AlertTriangle className="w-8 h-8" />}
          color="text-warning-400"
          change={lowStockProducts.length > 0 ? lowStockProducts.length : 0}
          changeType="down"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart - Last 7 Days Sales */}
        <div className="glass rounded-2xl p-5 animate-slide-up">
          <h2 className="text-lg font-semibold text-dark-100 mb-4">Last 7 Days Sales</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={last7DaysChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="name" stroke="#a3a3a3" fontSize={12} />
              <YAxis stroke="#a3a3a3" fontSize={12} />
              <Tooltip
                formatter={(value: unknown) => [formatLKR(Number(value)), 'Sales']}
                contentStyle={{
                  background: 'rgba(26,26,26,0.9)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  color: '#e5e5e5',
                }}
              />
              <Bar dataKey="sales" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart - Sales by Category */}
        <div className="glass rounded-2xl p-5 animate-slide-up">
          <h2 className="text-lg font-semibold text-dark-100 mb-4">Sales by Category</h2>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={salesByCategoryData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={3}
                dataKey="value"
              >
                {salesByCategoryData.map((_, index) => (
                  <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: unknown) => [formatLKR(Number(value)), 'Revenue']}
                contentStyle={{
                  background: 'rgba(26,26,26,0.9)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  color: '#e5e5e5',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-3 mt-2 justify-center">
            {salesByCategoryData.map((entry, index) => (
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
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <div className="glass rounded-2xl p-5 animate-slide-up">
          <h2 className="text-lg font-semibold text-dark-100 mb-4">Recent Transactions</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-dark-700">
                  <th className="text-left py-2 px-3 text-dark-300 font-medium">Invoice</th>
                  <th className="text-left py-2 px-3 text-dark-300 font-medium">Customer</th>
                  <th className="text-right py-2 px-3 text-dark-300 font-medium">Total</th>
                  <th className="text-left py-2 px-3 text-dark-300 font-medium">Payment</th>
                  <th className="text-left py-2 px-3 text-dark-300 font-medium">Time</th>
                </tr>
              </thead>
              <tbody>
                {recentTransactions.map((t) => (
                  <tr key={t.id} className="border-b border-dark-700/50 hover:bg-white/[0.02] transition-colors">
                    <td className="py-2.5 px-3 text-dark-100 font-medium">{t.invoiceNo}</td>
                    <td className="py-2.5 px-3 text-dark-300">{t.customerName || 'Walk-in'}</td>
                    <td className="py-2.5 px-3 text-right text-primary-400 font-medium">{formatLKR(t.total)}</td>
                    <td className="py-2.5 px-3">
                      <Badge variant={t.paymentMethod === 'cash' ? 'success' : t.paymentMethod === 'card' ? 'info' : 'warning'}>
                        {t.paymentMethod}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-3 text-dark-400">{formatTime(t.createdAt)}</td>
                  </tr>
                ))}
                {recentTransactions.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-dark-400">No transactions yet</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="glass rounded-2xl p-5 animate-slide-up">
          <h2 className="text-lg font-semibold text-dark-100 mb-4">Low Stock Alerts</h2>
          {lowStockProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-dark-400">
              <Package className="w-12 h-12 mb-2 opacity-30" />
              <p>All products are well stocked</p>
            </div>
          ) : (
            <div className="space-y-3">
              {lowStockProducts.map((p) => {
                const category = categories.find((c) => c.id === p.category);
                const stockRatio = p.stock / p.minStock;
                return (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-dark-800/50 border border-dark-700/50"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-dark-100 truncate">{p.name}</p>
                      <p className="text-xs text-dark-400">
                        {category?.name || 'Uncategorized'}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 ml-3">
                      <div className="text-right">
                        <p className="text-sm font-bold text-warning-400">{p.stock}</p>
                        <p className="text-xs text-dark-400">Min: {p.minStock}</p>
                      </div>
                      <Badge variant={stockRatio < 0.3 ? 'danger' : 'warning'}>
                        {stockRatio < 0.3 ? 'Critical' : 'Low'}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
