import { useState } from 'react';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Search } from 'lucide-react';

export interface Column<T> {
  key: string;
  label: string;
  render?: (value: unknown, row: T) => React.ReactNode;
  sortable?: boolean;
  className?: string;
  /** Se true, la colonna NON appare nelle card mobile (es. azioni accessibili tramite tap riga) */
  hideOnMobile?: boolean;
  /** Se true, mostra come titolo principale della card mobile (di solito la prima colonna) */
  primaryOnMobile?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  total?: number;
  page?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  onSearch?: (q: string) => void;
  searchValue?: string;
  onRowClick?: (row: T) => void;
  actions?: React.ReactNode;
  emptyText?: string;
}

export default function DataTable<T extends { id?: string }>({
  columns,
  data,
  loading = false,
  total = 0,
  page = 1,
  pageSize = 20,
  onPageChange,
  onSearch,
  searchValue = '',
  onRowClick,
  actions,
  emptyText = 'Nessun risultato trovato',
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const totalPages = Math.ceil(total / pageSize);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sortedData = [...data].sort((a, b) => {
    if (!sortKey) return 0;
    const av = (a as Record<string, unknown>)[sortKey];
    const bv = (b as Record<string, unknown>)[sortKey];
    if (av == null) return 1;
    if (bv == null) return -1;
    const cmp = String(av).localeCompare(String(bv), 'it', { numeric: true });
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const primaryCol = columns.find((c) => c.primaryOnMobile) ?? columns[0];
  const mobileCols = columns.filter((c) => !c.hideOnMobile && c.key !== primaryCol?.key);

  const renderCell = (col: Column<T>, row: T) =>
    col.render
      ? col.render((row as Record<string, unknown>)[col.key], row)
      : String((row as Record<string, unknown>)[col.key] ?? '');

  return (
    <div className="flex flex-col gap-3 sm:gap-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
        {onSearch !== undefined ? (
          <div className="relative flex-1 sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={searchValue}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="Cerca..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>
        ) : <div className="hidden sm:block" />}
        {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
      </div>

      {/* Container */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={`text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap ${col.sortable ? 'cursor-pointer select-none hover:text-gray-900' : ''} ${col.className ?? ''}`}
                    onClick={() => col.sortable && handleSort(col.key)}
                  >
                    <div className="flex items-center gap-1">
                      {col.label}
                      {col.sortable && (
                        <span className="flex flex-col">
                          <ChevronUp className={`w-3 h-3 -mb-1 ${sortKey === col.key && sortDir === 'asc' ? 'text-blue-600' : 'text-gray-300'}`} />
                          <ChevronDown className={`w-3 h-3 ${sortKey === col.key && sortDir === 'desc' ? 'text-blue-600' : 'text-gray-300'}`} />
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    {columns.map((col) => (
                      <td key={col.key} className="px-4 py-3">
                        <div className="h-4 bg-gray-200 rounded animate-pulse" style={{ width: `${60 + (i * 7) % 30}%` }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : sortedData.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-12 text-center text-gray-400">
                    {emptyText}
                  </td>
                </tr>
              ) : (
                sortedData.map((row, i) => (
                  <tr
                    key={(row as { id?: string }).id ?? i}
                    className={`border-b border-gray-100 last:border-0 transition-colors ${onRowClick ? 'cursor-pointer hover:bg-blue-50' : 'hover:bg-gray-50'}`}
                    onClick={() => onRowClick?.(row)}
                  >
                    {columns.map((col) => (
                      <td key={col.key} className={`px-4 py-3 ${col.className ?? ''}`}>
                        {renderCell(col, row)}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden">
          {loading ? (
            <div className="divide-y divide-gray-100">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="p-4 space-y-2">
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-2/3" />
                  <div className="h-3 bg-gray-100 rounded animate-pulse w-1/2" />
                  <div className="h-3 bg-gray-100 rounded animate-pulse w-1/3" />
                </div>
              ))}
            </div>
          ) : sortedData.length === 0 ? (
            <div className="px-4 py-12 text-center text-gray-400 text-sm">{emptyText}</div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {sortedData.map((row, i) => (
                <li
                  key={(row as { id?: string }).id ?? i}
                  className={`p-4 ${onRowClick ? 'cursor-pointer active:bg-blue-50 transition-colors' : ''}`}
                  onClick={() => onRowClick?.(row)}
                >
                  {primaryCol && (
                    <div className="text-sm font-semibold text-gray-900 mb-1.5 break-words">
                      {renderCell(primaryCol, row)}
                    </div>
                  )}
                  {mobileCols.length > 0 && (
                    <dl className="space-y-1">
                      {mobileCols.map((col) => {
                        const val = renderCell(col, row);
                        // skip empty
                        if (val === '' || val === null || val === undefined) return null;
                        return (
                          <div key={col.key} className="flex items-baseline gap-2 text-xs">
                            <dt className="text-gray-500 flex-shrink-0">{col.label}:</dt>
                            <dd className="text-gray-700 min-w-0 break-words">{val}</dd>
                          </div>
                        );
                      })}
                    </dl>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-4 py-3 border-t border-gray-100 bg-gray-50">
            <span className="text-xs sm:text-sm text-gray-500 text-center sm:text-left">
              {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} di {total}
            </span>
            <div className="flex items-center justify-center gap-1">
              <button
                onClick={() => onPageChange?.(page - 1)}
                disabled={page <= 1}
                className="p-2 rounded-lg text-gray-500 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Pagina precedente"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const maxBtns = 5;
                const p = totalPages <= maxBtns
                  ? i + 1
                  : page <= 3
                    ? i + 1
                    : page >= totalPages - 2
                      ? totalPages - (maxBtns - 1) + i
                      : page - 2 + i;
                return (
                  <button
                    key={p}
                    onClick={() => onPageChange?.(p)}
                    className={`min-w-[32px] h-8 px-2 rounded-lg text-sm font-medium ${p === page ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-200'}`}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                onClick={() => onPageChange?.(page + 1)}
                disabled={page >= totalPages}
                className="p-2 rounded-lg text-gray-500 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Pagina successiva"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
