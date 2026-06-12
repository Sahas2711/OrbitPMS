"""
Cloudinary upload service for OrbitPMS.

Provides a thin wrapper around the Cloudinary Python SDK for uploading
PDF invoices (as raw files) and retrieving their secure URLs.
The SDK's synchronous upload call is offloaded to a thread pool so it
never blocks the async event loop.
"""

import asyncio
import logging
import time
from io import BytesIO

import cloudinary
import cloudinary.uploader
import cloudinary.utils

from app.core.config import settings

logger = logging.getLogger(__name__)


def configure_cloudinary() -> None:
    """Configure the Cloudinary SDK from application settings.

    Safe to call multiple times — reconfiguration is idempotent.
    """
    cloudinary.config(
        cloud_name=settings.cloudinary_cloud_name,
        api_key=settings.cloudinary_api_key,
        api_secret=settings.cloudinary_api_secret,
    )


def is_cloudinary_configured() -> bool:
    """Return True if all required Cloudinary env vars are set."""
    return bool(
        settings.cloudinary_cloud_name
        and settings.cloudinary_api_key
        and settings.cloudinary_api_secret
    )


def generate_cloudinary_signed_url(public_id: str) -> str | None:
    """Generate a fresh signed URL for a Cloudinary raw file.

    The URL is time-limited (1 hour) so it cannot be shared indefinitely.
    Call this dynamically when a user requests the PDF download.

    Args:
        public_id: The Cloudinary public ID of the uploaded file
            (e.g. ``invoices/INV-20260701-00001``).

    Returns:
        A signed URL valid for 1 hour, or ``None`` if Cloudinary
        is not configured.
    """
    if not is_cloudinary_configured():
        return None

    configure_cloudinary()

    try:
        expiry_ts = int(time.time()) + 3600  # 1 hour
        signed_url = cloudinary.utils.private_download_url(
            public_id,
            "pdf",
            resource_type="raw",
            type="upload",
            expires=expiry_ts,
            attachment=False,
        )
        return signed_url or None
    except Exception:
        logger.exception(
            "Failed to generate signed URL for public_id %s", public_id,
        )
        return None


def _sync_upload(buffer: BytesIO, invoice_number: str) -> str | None:
    """Synchronous Cloudinary upload — intended to run in a thread pool.

    Returns a marker string ``cloudinary:<public_id>`` that the API endpoint
    can later use to generate a fresh signed URL on each download request.
    """
    try:
        response = cloudinary.uploader.upload(
            buffer,
            resource_type="raw",
            public_id=f"invoices/{invoice_number}",
            overwrite=True,
        )
        public_id: str = response.get("public_id", "")
        if not public_id:
            logger.warning(
                "Cloudinary upload succeeded but no public_id returned for %s.",
                invoice_number,
            )
            return None

        logger.info(
            "PDF uploaded to Cloudinary: public_id=%s", public_id,
        )

        # Return a marker so we can generate fresh signed URLs later
        return f"cloudinary:{public_id}"
    except Exception:
        logger.exception(
            "Cloudinary upload failed for invoice %s", invoice_number,
        )
        return None


async def upload_pdf_to_cloudinary(
    pdf_bytes: bytes,
    invoice_number: str,
) -> str | None:
    """Upload a PDF invoice to Cloudinary as a raw file.

    Runs the (synchronous) Cloudinary SDK in a thread pool to avoid
    blocking the async event loop.

    Args:
        pdf_bytes: The raw PDF file contents.
        invoice_number: A human-readable identifier used as the
            public_id (e.g. ``INV-20260701-00001``).

    Returns:
        The secure Cloudinary URL of the uploaded PDF, or
        ``None`` if Cloudinary is not configured or the upload fails.
    """
    if not is_cloudinary_configured():
        logger.warning(
            "Cloudinary not configured. Skipping PDF upload for %s.",
            invoice_number,
        )
        return None

    configure_cloudinary()

    buffer = BytesIO(pdf_bytes)
    buffer.name = f"{invoice_number}.pdf"

    return await asyncio.to_thread(
        _sync_upload,
        buffer,
        invoice_number,
    )
