import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiOutlineArrowsUpDown,
  HiOutlineChevronUp,
  HiOutlineChevronDown,
  HiOutlineMagnifyingGlass,
  HiOutlineDocumentArrowDown,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineInformationCircle,
} from 'react-icons/hi2';
import { LuLoader } from 'react-icons/lu';

export default function Table({
  columns = [],
  data = [],
  loading = false,
  emptyMessage = 'No data found',
  emptyDescription = 'There are no records to display.',
  emptyAction,
  onRowClick,
  keyExtractor = (row, i) => i,
  sortable = true,
  searchable = false,
  searchPlaceholder = 'Search...',
  onSearch,
  searchValue,
  pageSize = 10,
  serverPagination = false,
  totalPages: externalTotalPages,
  currentPage: externalPage,
  onPageChange,
  onNextPage,
  onPrevPage,
  hasMore,
  exportable = false,
  onExport,
  loadingSkeleton = false,
  selectable = false,
  selectedRows,
  onSelectRow,
  onSelectAll,
  compact = false,
}) {
  const [internalSortField, setInternalSortField] = useState(null);
  const [internalSortDir, setInternalSortDir] = useState('asc');
  const [internalPage, setInternalPage] = useState(0);
  const [internalSearch, setInternalSearch] = useState('');

  // ── Search handling ──────────────────────────────────────────

  const searchQuery = onSearch !== undefined ? searchValue : internalSearch;
  const setSearchQuery = onSearch || setInternalSearch;

  // ── Sorting ──────────────────────────────────────────────────

  const handleSort = (field) => {
    if (!sortable) return;
    if (internalSortField === field) {
      setInternalSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setInternalSortField(field);
      setInternalSortDir('asc');
    }
  };

  // ── Filtered & sorted data ──────────────────────────────────

  const processedData = useMemo(() => {
    let result = [...data];

    // Client-side search
    if (searchQuery && columns.length > 0) {
      const q = searchQuery.toLowerCase();
      result = result.filter((row) =>
        columns.some((col) => {
          const val = row[col.accessor];
          if (val == null) return false;
          return String(val).toLowerCase().includes(q);
        })
      );
    }

    // Client-side sort
    if (internalSortField) {
      const col = columns.find((c) => c.accessor === internalSortField);
      if (col && col.sortable !== false) {
        result.sort((a, b) => {
          let aVal = a[internalSortField];
          let bVal = b[internalSortField];

          if (aVal == null) return 1;
          if (bVal == null) return -1;

          if (typeof aVal === 'string') {
            return internalSortDir === 'asc'
              ? aVal.localeCompare(bVal)
              : bVal.localeCompare(aVal);
          }
          return internalSortDir === 'asc' ? aVal - bVal : bVal - aVal;
        });
      }
    }

    return result;
  }, [data, searchQuery, columns, internalSortField, internalSortDir]);

  // ── Pagination ───────────────────────────────────────────────

  const isUsingServerPagination = serverPagination;

  const totalItems = processedData.length;
  const totalPages = isUsingServerPagination
    ? externalTotalPages || 1
    : Math.max(1, Math.ceil(totalItems / pageSize));

  const currentPage = isUsingServerPagination ? (externalPage || 0) : internalPage;

  const paginatedData = isUsingServerPagination
    ? processedData
    : processedData.slice(currentPage * pageSize, (currentPage + 1) * pageSize);

  const goToPrevPage = () => {
    if (currentPage > 0) {
      if (isUsingServerPagination) {
        onPrevPage?.();
      } else {
        setInternalPage((p) => p - 1);
      }
    }
  };

  const goToNextPage = () => {
    if (isUsingServerPagination) {
      if (hasMore) onNextPage?.();
    } else if ((currentPage + 1) * pageSize < totalItems) {
      setInternalPage((p) => p + 1);
    }
  };

  // ── Export CSV ──────────────────────────────────────────────

  const handleExportCSV = () => {
    if (onExport) {
      onExport();
      return;
    }

    const headers = columns.map((c) => c.header).join(',');
    const rows = processedData.map((row) =>
      columns
        .map((col) => {
          const val = col.exportValue
            ? col.exportValue(row)
            : row[col.accessor];
          const str = val == null ? '' : String(val);
          return str.includes(',') ? `"${str}"` : str;
        })
        .join(',')
    );

    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `export-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Selection ────────────────────────────────────────────────

  const allSelected =
    selectable &&
    paginatedData.length > 0 &&
    selectedRows?.size === paginatedData.length;

  const handleSelectAll = () => {
    if (onSelectAll) {
      onSelectAll(allSelected ? new Set() : new Set(paginatedData.map((r) => r.id)));
    }
  };

  // ── Skeleton rows ────────────────────────────────────────────

  const renderSkeletonRows = () => {
    const rowCount = Math.min(pageSize, 8);
    return Array.from({ length: rowCount }).map((_, i) => (
      <tr key={`skeleton-${i}`}>
        {selectable && (
          <td className="px-4 py-3">
            <div className="w-4 h-4 skeleton rounded" />
          </td>
        )}
        {columns.map((col, j) => (
          <td key={j} className="px-4 py-3">
            <div className="skeleton h-4 rounded" style={{ width: `${60 + Math.random() * 30}%` }} />
          </td>
        ))}
      </tr>
    ));
  };

  // ── Render ──────────────────────────────────────────────────

  return (
    <div className="w-full">
      {/* Toolbar */}
      {(searchable || exportable) && (
        <div className="flex items-center gap-3 mb-4">
          {searchable && (
            <div className="relative flex-1 max-w-sm">
              <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (!isUsingServerPagination) setInternalPage(0);
                }}
                className="w-full h-[38px] pl-9 pr-4 py-2 text-small bg-bg-card border border-border rounded-input outline-none transition-all duration-150 focus:border-brand focus:ring-2 focus:ring-brand/20 placeholder:text-text-muted"
              />
            </div>
          )}
          {exportable && (
            <button
              onClick={handleExportCSV}
              className="h-[38px] px-3 rounded-input text-caption font-medium text-text-secondary border border-border hover:bg-bg-table-header hover:text-text-primary transition-all flex items-center gap-1.5"
            >
              <HiOutlineDocumentArrowDown className="w-4 h-4" />
              Export CSV
            </button>
          )}
        </div>
      )}

      {/* Table */}
      <div className="w-full overflow-x-auto rounded-card border border-border bg-bg-card shadow-card">
        <table className={`w-full border-collapse ${compact ? 'text-small' : ''}`}>
          <thead>
            <tr className="bg-bg-table-header">
              {selectable && (
                <th className="px-4 py-3 border-b border-border w-10">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-border text-brand focus:ring-brand/20 cursor-pointer"
                  />
                </th>
              )}
              {columns.map((col, i) => (
                <th
                  key={col.accessor || i}
                  className={`px-4 py-3 text-caption font-semibold text-text-secondary uppercase tracking-wider text-left border-b border-border ${
                    col.sortable !== false && sortable
                      ? 'cursor-pointer select-none hover:text-text-primary transition-colors'
                      : ''
                  }`}
                  style={{ width: col.width }}
                  onClick={() => col.sortable !== false && sortable && handleSort(col.accessor)}
                >
                  <div className="flex items-center gap-1.5">
                    <span>{col.header}</span>
                    {col.sortable !== false && sortable && (
                      <span className="text-text-muted shrink-0">
                        {internalSortField === col.accessor ? (
                          internalSortDir === 'asc' ? (
                            <HiOutlineChevronUp className="w-3.5 h-3.5 text-brand" />
                          ) : (
                            <HiOutlineChevronDown className="w-3.5 h-3.5 text-brand" />
                          )
                        ) : (
                          <HiOutlineArrowsUpDown className="w-3.5 h-3.5" />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {loading && loadingSkeleton ? (
              renderSkeletonRows()
            ) : loading ? (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0)} className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <LuLoader className="w-6 h-6 text-brand animate-spin" />
                    <p className="text-small text-text-muted">Loading...</p>
                  </div>
                </td>
              </tr>
            ) : paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0)} className="px-4 py-12 text-center">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center gap-2"
                  >
                    <HiOutlineInformationCircle className="w-10 h-10 text-text-muted" />
                    <p className="text-body font-medium text-text-secondary">{emptyMessage}</p>
                    <p className="text-small text-text-muted max-w-sm">{emptyDescription}</p>
                    {emptyAction && (
                      <div className="mt-2">{emptyAction}</div>
                    )}
                  </motion.div>
                </td>
              </tr>
            ) : (
              <AnimatePresence mode="popLayout">
                {paginatedData.map((row, idx) => (
                  <motion.tr
                    key={keyExtractor(row, idx)}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className={`border-t border-border/50 transition-colors ${
                      onRowClick
                        ? 'cursor-pointer hover:bg-brand-50/40'
                        : 'hover:bg-bg-table-header/20'
                    }`}
                    onClick={() => onRowClick?.(row)}
                  >
                    {selectable && (
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedRows?.has(row.id)}
                          onChange={() => onSelectRow?.(row.id)}
                          className="w-4 h-4 rounded border-border text-brand focus:ring-brand/20 cursor-pointer"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </td>
                    )}
                    {columns.map((col, i) => (
                      <td
                        key={col.accessor || i}
                        className={`${compact ? 'px-3 py-2.5' : 'px-4 py-3'} text-body text-text-primary`}
                      >
                        {col.render
                          ? col.render(row)
                          : row[col.accessor] ?? <span className="text-text-muted">—</span>}
                      </td>
                    ))}
                  </motion.tr>
                ))}
              </AnimatePresence>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && !loading && (
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
          <p className="text-small text-text-muted">
            {currentPage * pageSize + 1}–
            {Math.min((currentPage + 1) * pageSize, totalItems)} of {totalItems}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={goToPrevPage}
              disabled={currentPage === 0}
              className="h-[34px] px-3 text-small bg-bg-card border border-border rounded-button text-text-primary hover:bg-bg-table-header transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
            >
              <HiOutlineChevronLeft className="w-4 h-4" />
              Previous
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
                const pageNum = isUsingServerPagination
                  ? i
                  : Math.max(0, currentPage - 2) + i;
                if (pageNum >= totalPages) return null;
                return (
                  <button
                    key={pageNum}
                    onClick={() => {
                      if (isUsingServerPagination) {
                        onPageChange?.(pageNum);
                      } else {
                        setInternalPage(pageNum);
                      }
                    }}
                    className={`w-[34px] h-[34px] rounded-button text-caption font-medium transition-all ${
                      pageNum === currentPage
                        ? 'bg-brand text-white'
                        : 'text-text-secondary hover:bg-bg-table-header'
                    }`}
                  >
                    {pageNum + 1}
                  </button>
                );
              })}
            </div>
            <button
              onClick={goToNextPage}
              disabled={isUsingServerPagination ? !hasMore : (currentPage + 1) * pageSize >= totalItems}
              className="h-[34px] px-3 text-small bg-bg-card border border-border rounded-button text-text-primary hover:bg-bg-table-header transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
            >
              Next
              <HiOutlineChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
