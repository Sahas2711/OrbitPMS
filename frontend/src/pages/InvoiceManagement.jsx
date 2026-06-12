import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  HiOutlineMagnifyingGlass,
  HiOutlineDocumentArrowDown,
  HiOutlineEye,
  HiOutlineXMark,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineCalendarDays,
  HiOutlineReceiptPercent,
  HiOutlinePrinter,
} from 'react-icons/hi2';
import { LuLoader } from 'react-icons/lu';
import { format, parseISO } from 'date-fns';

import Button from '../components/Button';
import Table from '../components/Table';
import { getInvoices, downloadInvoicePdf } from '../services/api';

const PAGE_SIZE = 10;

export default function InvoiceManagement() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  // Detail modal state
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState({});

  // ── Fetch invoices ──────────────────────────────────────────

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

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  // ── Client-side search ──────────────────────────────────────

  const filteredInvoices = invoices.filter((inv) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      inv.invoice_number?.toLowerCase().includes(q) ||
      (inv.booking_id && inv.booking_id.toLowerCase().includes(q))
    );
  });

  // ── Pagination ──────────────────────────────────────────────

  const totalPages = hasMore ? page + 2 : page + 1;

  const goToPrevPage = () => {
    if (page > 0) setPage((p) => p - 1);
  };

  const goToNextPage = () => {
    if (hasMore) setPage((p) => p + 1);
  };

  // ── PDF download handler ─────────────────────────────────────

  const handleDownloadPdf = async (invoiceId, invoiceNumber) => {
    setDownloadingPdf((prev) => ({ ...prev, [invoiceId]: true }));
    try {
      const blob = await downloadInvoicePdf(invoiceId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${invoiceNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('PDF downloaded successfully');
    } catch (err) {
      const detail = err.response?.data?.detail;
      const message =
        typeof detail === 'object' && detail?.message
          ? detail.message
          : typeof detail === 'string'
            ? detail
            : 'Failed to download PDF.';
      toast.error(message);
    } finally {
      setDownloadingPdf((prev) => ({ ...prev, [invoiceId]: false }));
    }
  };

  // ── Detail modal ─────────────────────────────────────────────

  const openDetail = (invoice) => {
    setSelectedInvoice(invoice);
    setDetailVisible(true);
  };

  const closeDetail = () => {
    setDetailVisible(false);
    setTimeout(() => setSelectedInvoice(null), 200);
  };

  // ── Table columns ───────────────────────────────────────────

  const columns = [
    {
      header: 'Invoice #',
      accessor: 'invoice_number',
      sortable: true,
      width: '160px',
      render: (row) => (
        <span className="font-semibold text-brand font-mono text-small">
          {row.invoice_number}
        </span>
      ),
    },
    {
      header: 'Booking ID',
      accessor: 'booking_id',
      sortable: true,
      width: '120px',
      render: (row) => (
        <span className="text-caption font-mono text-text-muted">
          {row.booking_id?.slice(0, 8)}…
        </span>
      ),
    },
    {
      header: 'Subtotal',
      accessor: 'subtotal',
      sortable: true,
      width: '100px',
      render: (row) => (
        <span className="font-medium text-text-primary">
          ${parseFloat(row.subtotal).toFixed(2)}
        </span>
      ),
    },
    {
      header: 'Tax',
      accessor: 'tax_amount',
      sortable: true,
      width: '90px',
      render: (row) => (
        <span className="text-text-secondary">
          ${parseFloat(row.tax_amount).toFixed(2)}
        </span>
      ),
    },
    {
      header: 'Total',
      accessor: 'total_amount',
      sortable: true,
      width: '100px',
      render: (row) => (
        <span className="font-bold text-text-primary">
          ${parseFloat(row.total_amount).toFixed(2)}
        </span>
      ),
    },
    {
      header: 'Issued',
      accessor: 'issued_at',
      sortable: true,
      width: '120px',
      render: (row) => (
        <span className="text-small text-text-secondary">
          {format(parseISO(row.issued_at), 'MMM d, yyyy')}
        </span>
      ),
    },
    {
      header: 'PDF',
      accessor: 'pdf_url',
      sortable: false,
      width: '70px',
      render: (row) => (
        <div className="flex items-center gap-1">
          {row.pdf_url ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDownloadPdf(row.id, row.invoice_number);
              }}
              disabled={downloadingPdf[row.id]}
              className="p-1.5 rounded-md text-text-muted hover:text-brand hover:bg-brand-light transition-all disabled:opacity-40"
              title="Download PDF"
            >
              {downloadingPdf[row.id] ? (
                <LuLoader className="w-4 h-4 animate-spin" />
              ) : (
                <HiOutlineDocumentArrowDown className="w-4 h-4" />
              )}
            </button>
          ) : (
            <span className="text-caption text-text-muted">—</span>
          )}
        </div>
      ),
    },
    {
      header: '',
      accessor: 'actions',
      sortable: false,
      width: '50px',
      render: (row) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            openDetail(row);
          }}
          className="p-1.5 rounded-md text-text-muted hover:text-brand hover:bg-brand-light transition-all"
          title="View details"
        >
          <HiOutlineEye className="w-4 h-4" />
        </button>
      ),
    },
  ];

  // ── Render detail modal ─────────────────────────────────────

  const renderDetailModal = () => {
    if (!detailVisible || !selectedInvoice) return null;
    const inv = selectedInvoice;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
        <div className="absolute inset-0" onClick={closeDetail} />
        <div className="relative w-full max-w-lg bg-bg-card rounded-modal shadow-modal border border-border overflow-hidden max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-primary-900 text-white sticky top-0 z-10">
            <div className="flex items-center gap-3">
              <HiOutlineReceiptPercent className="w-5 h-5 text-brand" />
              <h3 className="text-body font-semibold m-0">Invoice Details</h3>
            </div>
            <button
              onClick={closeDetail}
              className="p-1 rounded-md text-white/70 hover:text-white hover:bg-white/10 transition-all"
            >
              <HiOutlineXMark className="w-5 h-5" />
            </button>
          </div>

          <div className="px-6 py-5 space-y-6">
            {/* Invoice header */}
            <div className="text-center pb-4 border-b border-border">
              <p className="text-caption text-text-muted uppercase tracking-wider font-medium mb-1">
                Invoice Number
              </p>
              <p className="text-section-title font-bold text-brand font-mono m-0">
                {inv.invoice_number}
              </p>
              <p className="text-small text-text-secondary mt-1">
                Issued {format(parseISO(inv.issued_at), 'MMMM d, yyyy')}
              </p>
            </div>

            {/* Booking & guest info */}
            <div>
              <p className="text-caption text-text-muted uppercase tracking-wider font-medium mb-2">
                Booking Reference
              </p>
              <div className="bg-bg-table-header/50 rounded-input p-3 space-y-1.5">
                <div className="flex items-center gap-2 text-small">
                  <HiOutlineCalendarDays className="w-4 h-4 text-text-muted shrink-0" />
                  <span className="text-text-secondary">Booking ID:</span>
                  <span className="font-mono text-text-primary text-caption break-all">
                    {inv.booking_id}
                  </span>
                </div>
              </div>
            </div>

            {/* PDF section */}
            <div>
              <p className="text-caption text-text-muted uppercase tracking-wider font-medium mb-2">
                Document
              </p>
              <div className="bg-bg-table-header/50 rounded-input p-4 flex flex-col items-center gap-3">
                <div className="w-14 h-14 rounded-full bg-brand-light flex items-center justify-center">
                  <HiOutlinePrinter className="w-7 h-7 text-brand" />
                </div>
                <div className="text-center">
                  <p className="text-small font-medium text-text-primary m-0">
                    {inv.pdf_url ? 'PDF invoice available' : 'PDF not yet generated'}
                  </p>
                  <p className="text-caption text-text-muted mt-0.5">
                    {inv.pdf_url
                      ? 'Download a printable copy of this invoice'
                      : 'The PDF will be generated during check-out'}
                  </p>
                </div>
                {inv.pdf_url && (
                  <Button
                    onClick={() => handleDownloadPdf(inv.id, inv.invoice_number)}
                    loading={downloadingPdf[inv.id]}
                    className="w-full sm:w-auto"
                  >
                    <HiOutlineDocumentArrowDown className="w-5 h-5" />
                    Download PDF
                  </Button>
                )}
              </div>
            </div>

            {/* Charges breakdown */}
            <div>
              <p className="text-caption text-text-muted uppercase tracking-wider font-medium mb-2">
                Charges Breakdown
              </p>
              <div className="rounded-input border border-border overflow-hidden">
                <div className="space-y-3 p-4">
                  <div className="flex items-center justify-between text-small">
                    <span className="text-text-secondary">Room Charges</span>
                    <span className="font-medium text-text-primary">
                      ${parseFloat(inv.subtotal).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-small">
                    <span className="text-text-secondary">Tax (10%)</span>
                    <span className="font-medium text-text-primary">
                      ${parseFloat(inv.tax_amount).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-3 mt-1 border-t border-border">
                    <span className="text-body font-bold text-text-primary">Total</span>
                    <span className="text-section-title font-bold text-brand">
                      ${parseFloat(inv.total_amount).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-bg-table-header/50">
            <Button variant="secondary" onClick={closeDetail}>
              Close
            </Button>
            {inv.pdf_url && (
              <Button
                onClick={() => handleDownloadPdf(inv.id, inv.invoice_number)}
                loading={downloadingPdf[inv.id]}
              >
                <HiOutlineDocumentArrowDown className="w-5 h-5" />
                Download PDF
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ── Render ──────────────────────────────────────────────────

  return (
    <div className="min-h-svh bg-bg-page">
      <header className="bg-primary-900 text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <HiOutlineReceiptPercent className="w-6 h-6 text-brand" />
          <h1 className="text-card-title font-semibold m-0">OrbitPMS</h1>
        </div>
      </header>

      <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        <div className="mb-6">
          <h2 className="text-section-title font-bold text-text-primary m-0">Invoice Management</h2>
          <p className="text-body text-text-secondary mt-1">
            View, search, and download guest invoices
          </p>
        </div>

        {/* Search */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted pointer-events-none" />
            <input
              type="text"
              placeholder="Search by invoice number or booking ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-[44px] pl-10 pr-4 py-2.5 text-body bg-bg-card border border-border rounded-input outline-none transition-all duration-150 focus:border-brand focus:ring-2 focus:ring-brand/20 placeholder:text-text-muted"
            />
          </div>
        </div>

        {/* Results summary */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-small text-text-muted">
            {loading
              ? 'Loading invoices...'
              : `${filteredInvoices.length} invoice${filteredInvoices.length !== 1 ? 's' : ''} found`}
          </p>
        </div>

        {/* Table */}
        <Table
          columns={columns}
          data={filteredInvoices}
          loading={loading}
          emptyMessage="No invoices found"
          emptyDescription={
            search
              ? 'Try adjusting your search terms.'
              : 'Invoices are created when guests are checked out.'
          }
          keyExtractor={(row) => row.id}
          onRowClick={(row) => openDetail(row)}
        />

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
            <p className="text-small text-text-muted">
              Page {page + 1} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={goToPrevPage}
                disabled={page === 0}
                className="h-[36px] px-3 py-1.5 text-small bg-bg-card border border-border rounded-button text-text-primary hover:bg-bg-table-header transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
              >
                <HiOutlineChevronLeft className="w-4 h-4" />
                Previous
              </button>
              <button
                onClick={goToNextPage}
                disabled={!hasMore}
                className="h-[36px] px-3 py-1.5 text-small bg-bg-card border border-border rounded-button text-text-primary hover:bg-bg-table-header transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
              >
                Next
                <HiOutlineChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Detail modal */}
      {renderDetailModal()}
    </div>
  );
}
