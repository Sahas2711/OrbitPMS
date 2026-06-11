"""
Error response schemas for OrbitPMS API.

Provides standardized error response models for consistent
API error handling across all endpoints.
"""

from pydantic import BaseModel, Field


class ErrorDetail(BaseModel):
    """A single error detail with field-level information."""

    field: str | None = Field(
        default=None,
        description="The input field that caused the error, if applicable",
        examples=["email"],
    )
    message: str = Field(
        ...,
        description="Human-readable error description",
        examples=["Invalid credentials."],

    )


class ErrorResponse(BaseModel):
    """Standard API error response body."""

    detail: ErrorDetail | str | list[ErrorDetail] = Field(
        ...,
        description="Error message or field-level error details",
        examples=[
            "Invalid credentials.",

        ],
    )
