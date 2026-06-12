"""
PDF invoice generation service for OrbitPMS.

Generates professional, downloadable PDF invoices using ReportLab.
Includes hotel branding, guest details, and an itemised charges breakdown.
"""

import logging
import os
from datetime import date, datetime, timezone
from decimal import Decimal
from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, mm
from reportlab.platypus import (
    Image,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from app.core.config import settings

logger = logging.getLogger(__name__)

# ── Colour palette ──────────────────────────────────────────────

PRIMARY_COLOR = colors.HexColor("#1a365d")      # Dark navy
ACCENT_COLOR = colors.HexColor("#2b6cb0")        # Medium blue
LIGHT_BG = colors.HexColor("#f7fafc")            # Very light grey
BORDER_COLOR = colors.HexColor("#e2e8f0")        # Light border
TEXT_DARK = colors.HexColor("#2d3748")           # Near black
TEXT_MUTED = colors.HexColor("#718096")          # Grey
WHITE = colors.white

# ── Page dimensions ─────────────────────────────────────────────

PAGE_WIDTH, PAGE_HEIGHT = A4
MARGIN_LEFT = 20 * mm
MARGIN_RIGHT = 20 * mm
MARGIN_TOP = 15 * mm
MARGIN_BOTTOM = 15 * mm

# ── Styles ──────────────────────────────────────────────────────

styles = getSampleStyleSheet()

style_hotel_name = ParagraphStyle(
    "HotelName",
    parent=styles["Heading1"],
    fontName="Helvetica-Bold",
    fontSize=22,
    textColor=PRIMARY_COLOR,
    spaceAfter=2,
)

style_invoice_title = ParagraphStyle(
    "InvoiceTitle",
    parent=styles["Heading2"],
    fontName="Helvetica-Bold",
    fontSize=16,
    textColor=ACCENT_COLOR,
    spaceAfter=4,
)

style_section_label = ParagraphStyle(
    "SectionLabel",
    parent=styles["Normal"],
    fontName="Helvetica-Bold",
    fontSize=9,
    textColor=TEXT_MUTED,
    spaceAfter=1,
)

style_field_value = ParagraphStyle(
    "FieldValue",
    parent=styles["Normal"],
    fontName="Helvetica",
    fontSize=10,
    textColor=TEXT_DARK,
    spaceAfter=4,
)

style_table_header = ParagraphStyle(
    "TableHeader",
    parent=styles["Normal"],
    fontName="Helvetica-Bold",
    fontSize=9,
    textColor=WHITE,
    alignment=TA_CENTER,
)

style_table_cell = ParagraphStyle(
    "TableCell",
    parent=styles["Normal"],
    fontName="Helvetica",
    fontSize=9,
    textColor=TEXT_DARK,
    alignment=TA_CENTER,
)

style_table_cell_left = ParagraphStyle(
    "TableCellLeft",
    parent=styles["Normal"],
    fontName="Helvetica",
    fontSize=9,
    textColor=TEXT_DARK,
    alignment=TA_LEFT,
)

style_total_label = ParagraphStyle(
    "TotalLabel",
    parent=styles["Normal"],
    fontName="Helvetica-Bold",
    fontSize=11,
    textColor=TEXT_DARK,
    alignment=TA_RIGHT,
)

style_total_value = ParagraphStyle(
    "TotalValue",
    parent=styles["Normal"],
    fontName="Helvetica-Bold",
    fontSize=11,
    textColor=PRIMARY_COLOR,
    alignment=TA_RIGHT,
)

style_footer = ParagraphStyle(
    "Footer",
    parent=styles["Normal"],
    fontName="Helvetica-Oblique",
    fontSize=8,
    textColor=TEXT_MUTED,
    alignment=TA_CENTER,
)


def _build_header() -> list:
    """Build the invoice header with hotel branding."""
    elements = []

    # Hotel name
    elements.append(Paragraph(settings.hotel_name, style_hotel_name))
    elements.append(
        Paragraph(
            f"{settings.hotel_address}<br/>"
            f"{settings.hotel_city_state_zip}<br/>"
            f"Phone: {settings.hotel_phone} | Email: {settings.hotel_email}",
            ParagraphStyle(
                "HotelDetails",
                parent=styles["Normal"],
                fontName="Helvetica",
                fontSize=9,
                textColor=TEXT_MUTED,
                spaceAfter=6,
            ),
        )
    )

    # Horizontal rule
    elements.append(Table(
        [[""]],
        colWidths=[PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT],
        style=TableStyle([
            ("LINEBELOW", (0, 0), (-1, 0), 1, ACCENT_COLOR),
            ("TOPPADDING", (0, 0), (-1, -1), 0),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ]),
    ))

    return elements


def _build_invoice_meta(invoice_number: str, issued_at: datetime) -> list:
    """Build the invoice metadata section (title, number, date)."""
    elements = []
    elements.append(Spacer(1, 8))
    elements.append(Paragraph("INVOICE", style_invoice_title))
    elements.append(
        Paragraph(
            f"Invoice #: {invoice_number}",
            ParagraphStyle(
                "InvoiceNumber",
                parent=styles["Normal"],
                fontName="Helvetica-Bold",
                fontSize=10,
                textColor=TEXT_DARK,
                spaceAfter=2,
            ),
        )
    )

    issued_local = issued_at.astimezone() if issued_at.tzinfo else issued_at
    date_str = issued_local.strftime("%B %d, %Y")
    elements.append(
        Paragraph(
            f"Date Issued: {date_str}",
            ParagraphStyle(
                "InvoiceDate",
                parent=styles["Normal"],
                fontName="Helvetica",
                fontSize=9,
                textColor=TEXT_MUTED,
                spaceAfter=4,
            ),
        )
    )

    return elements


def _build_billing_section(
    guest_name: str,
    guest_email: str | None,
    guest_phone: str | None,
    room_number: str,
    room_type: str,
    check_in_date: date,
    check_out_date: date,
    nights_stayed: int,
) -> list:
    """Build the billing information section."""
    elements = []
    elements.append(Spacer(1, 6))

    # Section header
    elements.append(Paragraph("BILLING INFORMATION", style_section_label))
    elements.append(Spacer(1, 3))

    # Details table
    left_data = [
        [Paragraph("Guest Name", style_section_label),
         Paragraph(guest_name, style_field_value)],
        [Paragraph("Email", style_section_label),
         Paragraph(guest_email or "—", style_field_value)],
        [Paragraph("Phone", style_section_label),
         Paragraph(guest_phone or "—", style_field_value)],
    ]

    right_data = [
        [Paragraph("Room", style_section_label),
         Paragraph(f"{room_number} ({room_type})", style_field_value)],
        [Paragraph("Check-in", style_section_label),
         Paragraph(check_in_date.strftime("%b %d, %Y"), style_field_value)],
        [Paragraph("Check-out", style_section_label),
         Paragraph(check_out_date.strftime("%b %d, %Y"), style_field_value)],
    ]

    # Combine into a two-column layout
    billing_table = Table(
        [
            [
                Table(left_data, colWidths=[60 * mm, 70 * mm]),
                Table(right_data, colWidths=[50 * mm, 70 * mm]),
            ]
        ],
        colWidths=[130 * mm, 120 * mm],
        style=TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("TOPPADDING", (0, 0), (-1, -1), 0),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
        ]),
    )
    elements.append(billing_table)

    return elements


def _build_charges_table(
    room_rate: Decimal,
    nights_stayed: int,
    subtotal: Decimal,
    tax_amount: Decimal,
    total_amount: Decimal,
) -> list:
    """Build the itemised charges table."""
    elements = []
    elements.append(Spacer(1, 10))
    elements.append(Paragraph("CHARGES SUMMARY", style_section_label))
    elements.append(Spacer(1, 4))

    night_label = "Night" if nights_stayed == 1 else "Nights"

    # Table data
    header = [
        Paragraph("Description", style_table_header),
        Paragraph("Rate", style_table_header),
        Paragraph("Qty", style_table_header),
        Paragraph("Amount", style_table_header),
    ]

    row1 = [
        Paragraph("Room Charges", style_table_cell_left),
        Paragraph(f"${room_rate:.2f}", style_table_cell),
        Paragraph(str(nights_stayed), style_table_cell),
        Paragraph(f"${subtotal:.2f}", style_table_cell),
    ]

    row2 = [
        Paragraph(f"Accommodation ({nights_stayed} {night_label})", style_table_cell_left),
        Paragraph("", style_table_cell),
        Paragraph("", style_table_cell),
        Paragraph("", style_table_cell),
    ]

    row3 = [
        Paragraph("Tax (10%)", style_table_cell_left),
        Paragraph("", style_table_cell),
        Paragraph("", style_table_cell),
        Paragraph(f"${tax_amount:.2f}", style_table_cell),
    ]

    spacer_row = [
        Paragraph("", style_table_cell),
        Paragraph("", style_table_cell),
        Paragraph("", style_table_cell),
        Paragraph("", style_table_cell),
    ]

    total_row = [
        Paragraph("", style_table_cell),
        Paragraph("", style_table_cell),
        Paragraph("TOTAL", style_total_label),
        Paragraph(f"${total_amount:.2f}", style_total_value),
    ]

    col_widths = [
        200 * mm,
        50 * mm,
        30 * mm,
        60 * mm,
    ]

    table = Table(
        [header, row1, row2, spacer_row, row3, spacer_row, total_row],
        colWidths=col_widths,
        style=TableStyle([
            # Header row
            ("BACKGROUND", (0, 0), (-1, 0), PRIMARY_COLOR),
            ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, 0), 9),
            ("ALIGN", (0, 0), (-1, 0), "CENTER"),
            # Body rows
            ("FONTNAME", (0, 1), (-1, -2), "Helvetica"),
            ("FONTSIZE", (0, 1), (-1, -2), 9),
            # Alternate row shading
            ("BACKGROUND", (0, 1), (-1, 1), LIGHT_BG),
            ("BACKGROUND", (0, 3), (-1, 3), LIGHT_BG),
            # Borders
            ("GRID", (0, 0), (-1, -3), 0.5, BORDER_COLOR),
            ("LINEBELOW", (0, 0), (-1, 0), 1, PRIMARY_COLOR),
            ("LINEABOVE", (0, -1), (-1, -1), 1.5, PRIMARY_COLOR),
            ("LINEBELOW", (0, -1), (-1, -1), 1.5, PRIMARY_COLOR),
            # Total row styling
            ("FONTNAME", (2, -1), (3, -1), "Helvetica-Bold"),
            ("FONTSIZE", (2, -1), (3, -1), 11),
            ("TEXTCOLOR", (2, -1), (2, -1), TEXT_DARK),
            ("TEXTCOLOR", (3, -1), (3, -1), PRIMARY_COLOR),
            # Spacing
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("TOPPADDING", (0, -1), (-1, -1), 10),
            ("BOTTOMPADDING", (0, -1), (-1, -1), 10),
        ]),
    )
    elements.append(table)

    return elements


def _build_footer() -> list:
    """Build the invoice footer."""
    elements = []
    elements.append(Spacer(1, 20))
    elements.append(Table(
        [[""]],
        colWidths=[PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT],
        style=TableStyle([
            ("LINEBELOW", (0, 0), (-1, 0), 1, BORDER_COLOR),
            ("TOPPADDING", (0, 0), (-1, -1), 0),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ]),
    ))
    elements.append(Spacer(1, 4))
    elements.append(
        Paragraph(
            f"{settings.hotel_name} | {settings.hotel_address} | "
            f"{settings.hotel_city_state_zip}<br/>"
            f"Phone: {settings.hotel_phone} | Email: {settings.hotel_email} | "
            f"{settings.hotel_website}",
            style_footer,
        )
    )
    return elements


def generate_invoice_pdf_bytes(
    invoice_number: str,
    issued_at: datetime,
    guest_name: str,
    guest_email: str | None,
    guest_phone: str | None,
    room_number: str,
    room_type: str,
    check_in_date: date,
    check_out_date: date,
    nights_stayed: int,
    room_rate: Decimal,
    subtotal: Decimal,
    tax_amount: Decimal,
    total_amount: Decimal,
) -> bytes:
    """Generate a professional PDF invoice and return the raw bytes.

    Args:
        invoice_number: Human-readable invoice number.
        issued_at: Timestamp when the invoice was issued.
        guest_name: Full name of the guest.
        guest_email: Guest email address.
        guest_phone: Guest phone number.
        room_number: Room number assigned.
        room_type: Room type description.
        check_in_date: Check-in date.
        check_out_date: Check-out date.
        nights_stayed: Number of nights billed.
        room_rate: Price per night.
        subtotal: Room charges before tax.
        tax_amount: Tax applied to the subtotal.
        total_amount: Grand total.

    Returns:
        The raw PDF file contents as bytes.
    """
    buffer = BytesIO()

    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=MARGIN_LEFT,
        rightMargin=MARGIN_RIGHT,
        topMargin=MARGIN_TOP,
        bottomMargin=MARGIN_BOTTOM,
    )

    elements = []
    elements.extend(_build_header())
    elements.extend(_build_invoice_meta(invoice_number, issued_at))
    elements.extend(_build_billing_section(
        guest_name=guest_name,
        guest_email=guest_email,
        guest_phone=guest_phone,
        room_number=room_number,
        room_type=room_type,
        check_in_date=check_in_date,
        check_out_date=check_out_date,
        nights_stayed=nights_stayed,
    ))
    elements.extend(_build_charges_table(
        room_rate=room_rate,
        nights_stayed=nights_stayed,
        subtotal=subtotal,
        tax_amount=tax_amount,
        total_amount=total_amount,
    ))
    elements.extend(_build_footer())

    doc.build(elements)
    pdf_bytes = buffer.getvalue()
    buffer.close()

    return pdf_bytes


def generate_invoice_pdf(
    invoice_number: str,
    issued_at: datetime,
    guest_name: str,
    guest_email: str | None,
    guest_phone: str | None,
    room_number: str,
    room_type: str,
    check_in_date: date,
    check_out_date: date,
    nights_stayed: int,
    room_rate: Decimal,
    subtotal: Decimal,
    tax_amount: Decimal,
    total_amount: Decimal,
) -> str:
    """Generate a PDF invoice and save it to the storage directory.

    Creates the storage directory if it does not exist. The PDF is
    saved as ``{storage_path}/{invoice_number}.pdf``.

    Returns:
        The relative file path to the generated PDF (e.g.
        ``/storage/invoices/INV-20260701-00001.pdf``).
    """
    pdf_bytes = generate_invoice_pdf_bytes(
        invoice_number=invoice_number,
        issued_at=issued_at,
        guest_name=guest_name,
        guest_email=guest_email,
        guest_phone=guest_phone,
        room_number=room_number,
        room_type=room_type,
        check_in_date=check_in_date,
        check_out_date=check_out_date,
        nights_stayed=nights_stayed,
        room_rate=room_rate,
        subtotal=subtotal,
        tax_amount=tax_amount,
        total_amount=total_amount,
    )

    # Ensure storage directory exists
    storage_path = settings.invoice_storage_path
    os.makedirs(storage_path, exist_ok=True)

    file_name = f"{invoice_number}.pdf"
    file_path = os.path.join(storage_path, file_name)
    with open(file_path, "wb") as f:
        f.write(pdf_bytes)

    logger.info("PDF invoice saved: %s (%d bytes)", file_path, len(pdf_bytes))

    # Return a URL-friendly path
    return f"/{storage_path.replace(os.sep, '/')}/{file_name}"


def get_pdf_path(pdf_url: str) -> str:
    """Resolve a PDF URL to an absolute filesystem path.

    The ``pdf_url`` stored in the database is a relative path like
    ``/storage/invoices/INV-20260701-00001.pdf``. This helper converts
    it to an absolute path relative to the project root.

    Args:
        pdf_url: The URL/path stored in the invoice record.

    Returns:
        The absolute filesystem path to the PDF file.
    """
    # Strip leading slash and resolve relative to backend directory
    relative = pdf_url.lstrip("/")
    return os.path.abspath(relative)
