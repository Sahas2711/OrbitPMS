import { useState } from 'react';
import {
  HiOutlineArrowsUpDown,
  HiOutlineChevronUp,
  HiOutlineChevronDown,
  HiOutlineQuestionMarkCircle,
} from 'react-icons/hi2';
import { LuLoader } from 'react-icons/lu';

export default function Table({
  columns = [],
  data = [],
  loading = false,
  emptyMessage = 'No data found',
  emptyDescription = 'There are no records to display.',
  onRowClick,
  keyExtractor = (row, i) => i,
  sortable = true,
}) {
  const [sortField, setSortField] = useState(null);
  const [sortDir, setSortDir] = useState('asc');

  const handleSort = (field) => {
    if (!sortable) return;
    if (sortField === field) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const sortedData = [...data].sort((a, b) => {
    if (!sortField) return 0;
    const col = columns.find((c) => c.accessor === sortField);
    if (!col || col.sortable === false) return 0;

    let aVal = a[sortField];
    let bVal = b[sortField];

    if (aVal == null) return 1;
    if (bVal == null) return -1;

    if (typeof aVal === 'string') {
      return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
  });

  return (
    <div className="w-full overflow-x-auto rounded-card border border-border bg-bg-card shadow-card">
      <table className="w-full min-w-[650px] border-collapse text-left">
        <thead>
          <tr className="bg-bg-table-header">
            {columns.map((col, i) => (
              <th
                key={col.accessor || i}
                className={`px-4 py-3 text-small font-semibold text-text-secondary uppercase tracking-wider ${
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
                    <span className="text-text-muted">
                      {sortField === col.accessor ? (
                        sortDir === 'asc' ? (
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
          {loading ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-12 text-center">
                <div className="flex flex-col items-center gap-3">
                  <LuLoader className="w-6 h-6 text-brand animate-spin" />
                  <p className="text-small text-text-muted">Loading...</p>
                </div>
              </td>
            </tr>
          ) : sortedData.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-12 text-center">
                <div className="flex flex-col items-center gap-1">
                  <HiOutlineQuestionMarkCircle className="w-8 h-8 text-text-muted" />
                  <p className="text-body font-medium text-text-secondary">{emptyMessage}</p>
                  <p className="text-small text-text-muted">{emptyDescription}</p>
                </div>
              </td>
            </tr>
          ) : (
            sortedData.map((row, idx) => (
              <tr
                key={keyExtractor(row, idx)}
                className={`border-t border-border transition-colors ${
                  onRowClick
                    ? 'cursor-pointer hover:bg-bg-table-header/50'
                    : 'hover:bg-bg-table-header/30'
                }`}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((col, i) => (
                  <td key={col.accessor || i} className="px-4 py-3 text-body text-text-primary">
                    {col.render ? col.render(row) : row[col.accessor] ?? '—'}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
