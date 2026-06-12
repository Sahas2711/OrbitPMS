"""
Invoice management API routes for OrbitPMS v1.

Provides endpoints to list, fetch, and download invoices generated
during the guest checkout process.
"""

import logging
import os
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_user
from app.database.session import get_session
from app.models.user import User
from app.schemas.error import ErrorDetail, ErrorResponse
from app.schemas.invoice import InvoiceResponse
from app.services.invoice import InvoiceService
from app.services.invoice_pdf import get_pdf_path

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/invoices", tags=["invoices"])


@router.get(
    "",
    response_model=list[InvoiceResponse],
    status_code=status.HTTP_200_OK,
    summary="List all invoices",
    description=(
        "Retrieve a paginated list of invoices. "
        "Results are ordered by issue date (newest first)."
    ),
    responses={
        200: {"description": "List of invoices returned successfully"},
    },
)
async def list_invoices(
    skip: int = Query(
        default=0,
        ge=0,
        description="Number of records to skip (pagination)",
    ),
    limit: int = Query(
        default=100,
        ge=1,
        le=500,
        description="Maximum number of records to return",
    ),
    db: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> list[InvoiceResponse]:
    """Get all invoices with pagination (newest first)."""
    service = InvoiceService(session=db)
    return await service.get_all_invoices(skip=skip, limit=limit)


@router.get(
    "/{invoice_id}",
    response_model=InvoiceResponse,
    status_code=status.HTTP_200_OK,
    summary="Get an invoice by ID",
    description="Retrieve a single invoice's details by its UUID.",
    responses={
        200: {"description": "Invoice found and returned successfully"},
        404: {"model": ErrorResponse, "description": "Invoice not found"},
        422: {"model": ErrorResponse, "description": "Invalid UUID format"},
    },
)
async def get_invoice(
    invoice_id: uuid.UUID,
    db: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> InvoiceResponse:
    """Get a single invoice by its unique identifier."""
    service = InvoiceService(session=db)

    try:
        return await service.get_invoice(invoice_id)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorDetail(
                field="invoice_id",
                message=str(exc),
            ).model_dump(),
        )


@router.get(
    "/by-booking/{booking_id}",
    response_model=InvoiceResponse,
    status_code=status.HTTP_200_OK,
    summary="Get invoice by booking ID",
    description=(
        "Retrieve the invoice associated with a specific booking. "
        "Returns 404 if no invoice has been generated for the booking."
    ),
    responses={
        200: {"description": "Invoice found and returned successfully"},
        404: {
            "model": ErrorResponse,
            "description": "No invoice found for this booking",
        },
        422: {"model": ErrorResponse, "description": "Invalid UUID format"},
    },
)
async def get_invoice_by_booking(
    booking_id: uuid.UUID,
    db: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> InvoiceResponse:
    """Get the invoice associated with a specific booking."""
    service = InvoiceService(session=db)

    try:
        return await service.get_invoice_by_booking(booking_id)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorDetail(
                field="booking_id",
                message=str(exc),
            ).model_dump(),
        )


@router.get(
    "/{invoice_id}/pdf",
    status_code=status.HTTP_200_OK,
    summary="Download invoice PDF",
    description=(
        "Download a generated PDF invoice. "
        "Returns 404 if the invoice or PDF file does not exist."
    ),
    responses={
        200: {
            "description": "PDF invoice file returned successfully",
            "content": {"application/pdf": {}},
        },
        404: {"model": ErrorResponse, "description": "Invoice or PDF not found"},
        422: {"model": ErrorResponse, "description": "Invalid UUID format"},
    },
)
async def download_invoice_pdf(
    invoice_id: uuid.UUID,
    db: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> FileResponse:
    """Download a PDF invoice by invoice UUID.

    Looks up the invoice, resolves the file path, and streams
    the PDF back to the client.
    """
    service = InvoiceService(session=db)

    try:
        invoice_response = await service.get_invoice(invoice_id)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorDetail(
                field="invoice_id",
                message=str(exc),
            ).model_dump(),
        )

    if not invoice_response.pdf_url:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorDetail(
                field="invoice_id",
                message="PDF has not been generated for this invoice yet.",
            ).model_dump(),
        )

    pdf_path = get_pdf_path(invoice_response.pdf_url)
    if not os.path.exists(pdf_path):
        logger.warning("PDF file not found on disk: %s", pdf_path)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorDetail(
                field="invoice_id",
                message="PDF file not found on disk.",
            ).model_dump(),
        )

    file_name = f"{invoice_response.invoice_number}.pdf"
    return FileResponse(
        path=pdf_path,
        media_type="application/pdf",
        filename=file_name,
        headers={
            "Content-Disposition": f'attachment; filename="{file_name}"',
        },
    )
