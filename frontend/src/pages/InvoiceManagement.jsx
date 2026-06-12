import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import {
  HiOutlineMagnifyingGlass,
  HiOutlineDocumentArrowDown,
  HiOutlineEye,
  HiOutlineXMark,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineReceiptPercent,
  HiOutlinePrinter,
  HiOutlineCalendarDays,
} from 'react-icons/hi2';
import { LuLoader } from 'react-icons/lu';
import { format, parseISO } from 'date-fns';

import Button from '../components/Button';
import { getInvoices, downloadInvoicePdf } from '../services/api';

const PAGE_SIZE = 10;

export default function InvoiceManagement() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState({});

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const params = { skip: page * PAGE_SIZE, limit: PAGE_SIZE };
      const data = await getInvoices(params);
      setInvoices(data);
      setHasMore(data.length >= PAGE_SIZE);
    } catch {
      toast.error('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  const filteredInvoices = invoices.filter((inv) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      inv.invoice_number?.toLowerCase().includes(q) ||
      inv.booking_id?.toLowerCase().includes(q)
    );
  });

  const totalPages = hasMore ? page + 2 : page + 1;

  const handleDownloadPdf = async (invoiceId, invoiceNumber, pdfUrl) => {
    // Cloudinary URL — open in new tab (auto-download)
    if (pdfUrl?.startsWith('https://')) {
      window.open(pdfUrl, '_blank', 'noopener,noreferrer');
      toast.success('PDF opened in new tab');
      return;
    }

    setDownloadingPdf((prev) => ({ ...prev, [invoiceId]: true }));
    try {
      const blob = await downloadInvoicePdf(invoiceId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${invoiceNumber}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('PDF downloaded');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to download PDF');
    } finally {
      setDownloadingPdf((prev) => ({ ...prev, [invoiceId]: false }));
    }
  };

  const openDetail = (invoice) => {
    setSelectedInvoice(invoice);
    setDetailVisible(true);
  };

  const closeDetail = () => {
    setDetailVisible(false);
    setTimeout(() => setSelectedInvoice(null), 200);
  };

  const columns = [
    { header: 'Invoice #', accessor: 'invoice_number', width: '160px',
      render: (row) => <span className="font-semibold text-brand font-mono text-small">{row.invoice_number}</span> },
    { header: 'Booking ID', accessor: 'booking_id', width: '100px',
      render: (row) => <span className="text-caption font-mono text-text-muted">{row.booking_id?.slice(0, 8)}…</span> },
    { header: 'Subtotal', accessor: 'subtotal', width: '100px',
      render: (row) => <span className="font-medium">${parseFloat(row.subtotal).toFixed(2)}</span> },
    { header: 'Tax', accessor: 'tax_amount', width: '90px',
      render: (row) => <span className="text-text-secondary">${parseFloat(row.tax_amount).toFixed(2)}</span> },
    { header: 'Total', accessor: 'total_amount', width: '100px',
      render: (row) => <span className="font-bold text-text-primary">${parseFloat(row.total_amount).toFixed(2)}</span> },
    { header: 'Issued', accessor: 'issued_at', width: '120px',
      render: (row) => <span className="text-small text-text-secondary">{format(parseISO(row.issued_at), 'MMM d, yyyy')}</span> },
    { header: 'Actions', accessor: 'actions', width: '80px',
      render: (row) => (
        <div className="flex items-center gap-1">
          {row.pdf_url && (
            <button
              onClick={(e) => { e.stopPropagation(); handleDownloadPdf(row.id, row.invoice_number, row.pdf_url); }}
              disabled={downloadingPdf[row.id]}
              className="p-1.5 rounded-md text-text-muted hover:text-brand hover:bg-brand-50 transition-all"
              title={row.pdf_url?.startsWith('https://') ? 'Open PDF in new tab' : 'Download PDF'}
            >
              {downloadingPdf[row.id] ? <LuLoader className="w-4 h-4 animate-spin" /> : <HiOutlineDocumentArrowDown className="w-4 h-4" />}
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); openDetail(row); }}
            className="p-1.5 rounded-md text-text-muted hover:text-brand hover:bg-brand-50 transition-all"
            title="View details"
          >
            <HiOutlineEye className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-section-title font-bold text-text-primary m-0">Invoice Management</h2>
        <p className="text-body text-text-secondary mt-1">View, search, and download guest invoices</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
          <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
          <input
            type="text"
            placeholder="Search by invoice number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-[40px] pl-9 pr-4 py-2 text-small bg-bg-card border border-border rounded-input outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 placeholder:text-text-muted"
          />
        </div>
      </div>

      <p className="text-small text-text-muted mb-3">
        {loading ? 'Loading invoices...' : `${filteredInvoices.length} invoice${filteredInvoices.length !== 1 ? 's' : ''} found`}
      </p>

      {/* Table */}
      <div className="w-full overflow-x-auto rounded-card border border-border bg-bg-card shadow-card">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-bg-table-header">
              {columns.map((col, i) => (
                <th key={i} className="px-4 py-3 text-caption font-semibold text-text-secondary uppercase tracking-wider text-left border-b border-border" style={{ width: col.width }}>
                  {col.header}
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
            ) : filteredInvoices.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <HiOutlineReceiptPercent className="w-10 h-10 text-text-muted" />
                    <p className="text-body font-medium text-text-secondary">No invoices found</p>
                    <p className="text-small text-text-muted">
                      {search ? 'Try adjusting your search.' : 'Invoices are created when guests are checked out.'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredInvoices.map((inv, idx) => (
                <motion.tr
                  key={inv.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: idx * 0.02 }}
                  className="border-t border-border/50 cursor-pointer hover:bg-brand-50/40 transition-colors"
                  onClick={() => openDetail(inv)}
                >
                  {columns.map((col, i) => (
                    <td key={i} className="px-4 py-3 text-body text-text-primary">
                      {col.render ? col.render(inv) : inv[col.accessor]}
                    </td>
                  ))}
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
          <p className="text-small text-text-muted">Page {page + 1} of {totalPages}</p>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}
              className="h-[34px] px-3 text-small bg-bg-card border border-border rounded-button text-text-primary hover:bg-bg-table-header disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1">
              <HiOutlineChevronLeft className="w-4 h-4" />Previous
            </button>
            <button onClick={() => setPage((p) => p + 1)} disabled={!hasMore}
              className="h-[34px] px-3 text-small bg-bg-card border border-border rounded-button text-text-primary hover:bg-bg-table-header disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1">
              Next<HiOutlineChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {detailVisible && selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="absolute inset-0" onClick={closeDetail} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative w-full max-w-lg bg-bg-card rounded-modal shadow-modal border border-border overflow-hidden max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-primary-900 text-white sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <HiOutlineReceiptPercent className="w-5 h-5 text-brand" />
                <h3 className="text-body font-semibold m-0">Invoice Details</h3>
              </div>
              <button onClick={closeDetail} className="p-1 rounded-md text-white/70 hover:text-white hover:bg-white/10 transition-all">
                <HiOutlineXMark className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-6">
              <div className="text-center pb-4 border-b border-border">
                <p className="text-caption text-text-muted uppercase tracking-wider font-medium mb-1">Invoice Number</p>
                <p className="text-section-title font-bold text-brand font-mono m-0">{selectedInvoice.invoice_number}</p>
                <p className="text-small text-text-secondary mt-1">Issued {format(parseISO(selectedInvoice.issued_at), 'MMMM d, yyyy')}</p>
              </div>

              <div>
                <p className="text-caption text-text-muted uppercase tracking-wider font-medium mb-2">Booking Reference</p>
                <div className="bg-bg-table-header/30 rounded-input p-3 space-y-1.5">
                  <div className="flex items-center gap-2 text-small">
                    <HiOutlineCalendarDays className="w-4 h-4 text-text-muted shrink-0" />
                    <span className="text-text-secondary">Booking ID:</span>
                    <span className="font-mono text-caption text-text-primary break-all">{selectedInvoice.booking_id}</span>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-caption text-text-muted uppercase tracking-wider font-medium mb-2">Document</p>
                <div className="bg-bg-table-header/30 rounded-input p-4 flex flex-col items-center gap-3">
                  <div className="w-14 h-14 rounded-full bg-brand-50 flex items-center justify-center">
                    <HiOutlinePrinter className="w-7 h-7 text-brand" />
                  </div>
                  <div className="text-center">
                    <p className="text-small font-medium text-text-primary m-0">
                      {selectedInvoice.pdf_url ? 'PDF invoice available' : 'PDF not yet generated'}
                    </p>
                    <p className="text-caption text-text-muted mt-0.5">
                      {selectedInvoice.pdf_url ? 'Download a printable copy' : 'The PDF will be generated during check-out'}
                    </p>
                  </div>
                  {selectedInvoice.pdf_url && (
                    <Button onClick={() => handleDownloadPdf(selectedInvoice.id, selectedInvoice.invoice_number, selectedInvoice.pdf_url)}
                      loading={downloadingPdf[selectedInvoice.id]}>
                      <HiOutlineDocumentArrowDown className="w-5 h-5" />
                      {selectedInvoice.pdf_url?.startsWith('https://') ? 'Open PDF' : 'Download PDF'}
                    </Button>
                  )}
                </div>
              </div>

              {/* Charges */}
              <div>
                <p className="text-caption text-text-muted uppercase tracking-wider font-medium mb-2">Charges Breakdown</p>
                <div className="rounded-input border border-border overflow-hidden">
                  <div className="space-y-3 p-4">
                    <div className="flex items-center justify-between text-small">
                      <span className="text-text-secondary">Room Charges</span>
                      <span className="font-medium">${parseFloat(selectedInvoice.subtotal).toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between text-small">
                      <span className="text-text-secondary">Tax (10%)</span>
                      <span className="font-medium">${parseFloat(selectedInvoice.tax_amount).toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-border">
                      <span className="text-body font-bold text-text-primary">Total</span>
                      <span className="text-section-title font-bold text-brand">${parseFloat(selectedInvoice.total_amount).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-bg-table-header/30">
              <Button variant="secondary" onClick={closeDetail}>Close</Button>
              {selectedInvoice.pdf_url && (
                <Button onClick={() => handleDownloadPdf(selectedInvoice.id, selectedInvoice.invoice_number, selectedInvoice.pdf_url)}
                  loading={downloadingPdf[selectedInvoice.id]}>
                  <HiOutlineDocumentArrowDown className="w-5 h-5" />
                  {selectedInvoice.pdf_url?.startsWith('https://') ? 'Open PDF' : 'Download PDF'}
                </Button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
