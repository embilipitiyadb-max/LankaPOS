import { useState, useMemo, type ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface Column {
  key: string;
  label: string;
  render?: (value: unknown, row: Record<string, unknown>) => ReactNode;
}

interface DataTableProps {
  columns: Column[];
  data: Record<string, unknown>[];
  searchPlaceholder?: string;
  onRowClick?: (row: Record<string, unknown>) => void;
  actions?: ReactNode;
  pageSize?: number;
}

export default function DataTable({
  columns,
  data,
  searchPlaceholder = 'Search...',
  onRowClick,
  actions,
  pageSize = 10,
}: DataTableProps) {
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const filtered = useMemo(() => {
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    return data.filter((row) =>
      columns.some((col) => {
        const val = row[col.key];
        return val !== undefined && val !== null && String(val).toLowerCase().includes(q);
      })
    );
  }, [data, search, columns]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const handleSearch = (value: string) => {
    setSearch(value);
    setCurrentPage(1);
  };

  return (
    <div className="glass rounded-2xl overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 border-b border-white/5">
        <div className="relative w-full sm:w-72">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full bg-dark-800 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder:text-dark-400 focus:outline-none focus:border-primary-600/50 focus:ring-1 focus:ring-primary-600/30 transition-all"
          />
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-4 py-3 text-left text-xs font-semibold text-dark-400 uppercase tracking-wider"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-dark-400">
                  No data found
                </td>
              </tr>
            ) : (
              paginated.map((row, idx) => (
                <tr
                  key={idx}
                  onClick={() => onRowClick?.(row)}
                  className={cn(
                    'border-b border-white/5 last:border-b-0 transition-colors',
                    onRowClick ? 'cursor-pointer hover:bg-white/[0.03]' : ''
                  )}
                >
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3 text-dark-100">
                      {col.render
                        ? col.render(row[col.key], row)
                        : (row[col.key] as ReactNode) ?? '—'}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-white/5 text-sm">
          <span className="text-dark-400">
            Showing {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, filtered.length)} of{' '}
            {filtered.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
              className="px-3 py-1.5 rounded-lg bg-dark-800 text-dark-300 hover:text-white hover:bg-dark-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Prev
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
              .reduce<(number | string)[]>((acc, p, i, arr) => {
                if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('...');
                acc.push(p);
                return acc;
              }, [])
              .map((item, i) =>
                typeof item === 'string' ? (
                  <span key={`ellipsis-${i}`} className="px-2 text-dark-400">
                    {item}
                  </span>
                ) : (
                  <button
                    key={item}
                    onClick={() => setCurrentPage(item)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg transition-colors',
                      safePage === item
                        ? 'bg-primary-600 text-white'
                        : 'bg-dark-800 text-dark-300 hover:text-white hover:bg-dark-700'
                    )}
                  >
                    {item}
                  </button>
                )
              )}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              className="px-3 py-1.5 rounded-lg bg-dark-800 text-dark-300 hover:text-white hover:bg-dark-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
