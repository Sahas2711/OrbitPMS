import { Document, Page, View, Text, StyleSheet, Font } from '@react-pdf/renderer';
import { format, parseISO } from 'date-fns';

// ── Register font ──────────────────────────────────────────────

Font.register({
  family: 'Helvetica',
  fonts: [],
});

// ── Colors ──────────────────────────────────────────────────────

const PRIMARY = '#1a365d';
const ACCENT = '#2b6cb0';
const TEXT_DARK = '#2d3748';
const TEXT_MUTED = '#718096';
const BORDER = '#e2e8f0';
const LIGHT_BG = '#f7fafc';

// ── Styles ─────────────────────────────────────────────────────

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: TEXT_DARK,
  },
  // Header
  hotelName: {
    fontSize: 22,
    fontWeight: 700,
    color: PRIMARY,
    marginBottom: 2,
  },
  hotelDetails: {
    fontSize: 9,
    color: TEXT_MUTED,
    marginBottom: 12,
  },
  divider: {
    borderBottom: `1 solid ${ACCENT}`,
    marginBottom: 12,
  },
  // Invoice Meta
  invoiceTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: ACCENT,
    marginBottom: 4,
  },
  invoiceNumber: {
    fontSize: 10,
    fontWeight: 700,
    color: TEXT_DARK,
    marginBottom: 2,
  },
  invoiceDate: {
    fontSize: 9,
    color: TEXT_MUTED,
    marginBottom: 12,
  },
  // Section
  sectionLabel: {
    fontSize: 9,
    fontWeight: 700,
    color: TEXT_MUTED,
    textTransform: 'uppercase',
    marginBottom: 4,
    letterSpacing: 1,
  },
  // Billing Info
  billingRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  billingLabel: {
    fontSize: 9,
    fontWeight: 700,
    color: TEXT_MUTED,
    width: 80,
  },
  billingValue: {
    fontSize: 10,
    color: TEXT_DARK,
  },
  billingSection: {
    marginBottom: 16,
  },
  billingGrid: {
    flexDirection: 'row',
  },
  billingCol: {
    flex: 1,
  },
  // Table
  table: {
    marginTop: 8,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: PRIMARY,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottom: `1 solid ${PRIMARY}`,
  },
  tableHeaderCell: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: 700,
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottom: `0.5 solid ${BORDER}`,
  },
  tableRowAlt: {
    backgroundColor: LIGHT_BG,
  },
  tableCell: {
    fontSize: 9,
    textAlign: 'center',
  },
  tableCellLeft: {
    fontSize: 9,
    textAlign: 'left',
  },
  tableTotalRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderTop: `1.5 solid ${PRIMARY}`,
    borderBottom: `1.5 solid ${PRIMARY}`,
  },
  totalLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: TEXT_DARK,
    textAlign: 'right',
  },
  totalValue: {
    fontSize: 11,
    fontWeight: 700,
    color: PRIMARY,
    textAlign: 'right',
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 8,
    color: TEXT_MUTED,
  },
  footerDivider: {
    borderBottom: `1 solid ${BORDER}`,
    marginBottom: 4,
  },
});

// ── Column Widths ──────────────────────────────────────────────

const COL_DESC = '50%';
const COL_RATE = '18%';
const COL_QTY = '12%';
const COL_AMOUNT = '20%';

// ── Component ──────────────────────────────────────────────────

export default function InvoicePDF({ invoice, booking, guest }) {
  const issuedDate = invoice.issued_at
    ? format(parseISO(invoice.issued_at), 'MMMM d, yyyy')
    : format(new Date(), 'MMMM d, yyyy');

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Hotel Header */}
        <Text style={styles.hotelName}>OrbitPMS Hotel & Suites</Text>
        <Text style={styles.hotelDetails}>
          123 Hospitality Drive{'\n'}
          San Francisco, CA 94105{'\n'}
          Phone: +1-555-ORBIT (67248) | Email: stay@orbitpms.com
        </Text>
        <View style={styles.divider} />

        {/* Invoice Meta */}
        <Text style={styles.invoiceTitle}>INVOICE</Text>
        <Text style={styles.invoiceNumber}>Invoice #: {invoice.invoice_number}</Text>
        <Text style={styles.invoiceDate}>Date Issued: {issuedDate}</Text>

        {/* Billing Information */}
        <Text style={styles.sectionLabel}>BILLING INFORMATION</Text>
        <View style={styles.billingGrid}>
          <View style={styles.billingCol}>
            <View style={styles.billingRow}>
              <Text style={styles.billingLabel}>Guest Name</Text>
              <Text style={styles.billingValue}>{guest?.guest_name || guest?.name || '—'}</Text>
            </View>
            <View style={styles.billingRow}>
              <Text style={styles.billingLabel}>Email</Text>
              <Text style={styles.billingValue}>{guest?.guest_email || guest?.email || '—'}</Text>
            </View>
            <View style={styles.billingRow}>
              <Text style={styles.billingLabel}>Phone</Text>
              <Text style={styles.billingValue}>{guest?.guest_phone || guest?.phone || '—'}</Text>
            </View>
          </View>
          <View style={styles.billingCol}>
            <View style={styles.billingRow}>
              <Text style={styles.billingLabel}>Room</Text>
              <Text style={styles.billingValue}>
                {booking?.room_number || guest?.room_number || '—'}
                {booking?.room_type ? ` (${booking.room_type})` : ''}
              </Text>
            </View>
            <View style={styles.billingRow}>
              <Text style={styles.billingLabel}>Check-in</Text>
              <Text style={styles.billingValue}>
                {booking?.check_in_date
                  ? format(parseISO(booking.check_in_date), 'MMM d, yyyy')
                  : '—'}
              </Text>
            </View>
            <View style={styles.billingRow}>
              <Text style={styles.billingLabel}>Check-out</Text>
              <Text style={styles.billingValue}>
                {booking?.check_out_date
                  ? format(parseISO(booking.check_out_date), 'MMM d, yyyy')
                  : '—'}
              </Text>
            </View>
          </View>
        </View>

        {/* Charges Table */}
        <Text style={{ ...styles.sectionLabel, marginTop: 16 }}>CHARGES SUMMARY</Text>
        <View style={styles.table}>
          {/* Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, { width: COL_DESC, textAlign: 'left' }]}>Description</Text>
            <Text style={[styles.tableHeaderCell, { width: COL_RATE }]}>Rate</Text>
            <Text style={[styles.tableHeaderCell, { width: COL_QTY }]}>Qty</Text>
            <Text style={[styles.tableHeaderCell, { width: COL_AMOUNT }]}>Amount</Text>
          </View>

          {/* Room Charges */}
          <View style={[styles.tableRow, styles.tableRowAlt]}>
            <Text style={[styles.tableCellLeft, { width: COL_DESC }]}>Room Charges</Text>
            <Text style={[styles.tableCell, { width: COL_RATE }]}>
              ${parseFloat(invoice.room_rate || booking?.price_per_night || 0).toFixed(2)}
            </Text>
            <Text style={[styles.tableCell, { width: COL_QTY }]}>
              {booking?.nights || invoice.nights_stayed || '—'}
            </Text>
            <Text style={[styles.tableCell, { width: COL_AMOUNT }]}>
              ${parseFloat(invoice.subtotal).toFixed(2)}
            </Text>
          </View>

          {/* Accommodation */}
          <View style={styles.tableRow}>
            <Text style={[styles.tableCellLeft, { width: COL_DESC }]}>
              Accommodation ({booking?.nights || invoice.nights_stayed || 0}{' '}
              {(booking?.nights || invoice.nights_stayed || 0) === 1 ? 'Night' : 'Nights'})
            </Text>
            <Text style={[styles.tableCell, { width: COL_RATE }]} />
            <Text style={[styles.tableCell, { width: COL_QTY }]} />
            <Text style={[styles.tableCell, { width: COL_AMOUNT }]} />
          </View>

          {/* Spacer */}
          <View style={styles.tableRow}>
            <Text style={[styles.tableCellLeft, { width: COL_DESC }]} />
            <Text style={[styles.tableCell, { width: COL_RATE }]} />
            <Text style={[styles.tableCell, { width: COL_QTY }]} />
            <Text style={[styles.tableCell, { width: COL_AMOUNT }]} />
          </View>

          {/* Tax */}
          <View style={[styles.tableRow, styles.tableRowAlt]}>
            <Text style={[styles.tableCellLeft, { width: COL_DESC }]}>Tax (10%)</Text>
            <Text style={[styles.tableCell, { width: COL_RATE }]} />
            <Text style={[styles.tableCell, { width: COL_QTY }]} />
            <Text style={[styles.tableCell, { width: COL_AMOUNT }]}>
              ${parseFloat(invoice.tax_amount).toFixed(2)}
            </Text>
          </View>

          {/* Spacer */}
          <View style={styles.tableRow}>
            <Text style={[styles.tableCellLeft, { width: COL_DESC }]} />
            <Text style={[styles.tableCell, { width: COL_RATE }]} />
            <Text style={[styles.tableCell, { width: COL_QTY }]} />
            <Text style={[styles.tableCell, { width: COL_AMOUNT }]} />
          </View>

          {/* Total */}
          <View style={styles.tableTotalRow}>
            <Text style={[styles.tableCellLeft, { width: COL_DESC }]} />
            <Text style={[styles.tableCell, { width: COL_RATE }]} />
            <Text style={[styles.totalLabel, { width: COL_QTY }]}>TOTAL</Text>
            <Text style={[styles.totalValue, { width: COL_AMOUNT }]}>
              ${parseFloat(invoice.total_amount).toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.footerDivider} />
          <Text>
            OrbitPMS Hotel & Suites | 123 Hospitality Drive | San Francisco, CA 94105{'\n'}
            Phone: +1-555-ORBIT (67248) | Email: stay@orbitpms.com | www.orbitpms.com
          </Text>
        </View>
      </Page>
    </Document>
  );
}
