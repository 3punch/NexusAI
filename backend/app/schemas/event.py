"""Calendar event schemas.

Time convention: inputs may be any ISO-8601 instant — they are normalized to
UTC here, at the API boundary, so the service layer only ever sees UTC.
SQLite stores naive values and the whole system agrees they mean UTC;
``EventOut`` re-attaches UTC on the way out so clients always receive
unambiguous ISO strings with an offset.
"""

from datetime import UTC, datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


def _normalize_to_utc(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)  # naive input means UTC
    return value.astimezone(UTC)


class EventCreate(BaseModel):
    workspace_id: int
    title: str = Field(min_length=1, max_length=200)
    description: str = Field(default="", max_length=2000)
    starts_at: datetime
    ends_at: datetime | None = None

    @field_validator("starts_at", "ends_at", mode="after")
    @classmethod
    def _normalize(cls, value: datetime | None) -> datetime | None:
        return _normalize_to_utc(value)

    @model_validator(mode="after")
    def _end_not_before_start(self) -> "EventCreate":
        if self.ends_at is not None and self.ends_at < self.starts_at:
            raise ValueError("ends_before_starts")
        return self


class EventUpdate(BaseModel):
    # None means "not provided" — v1 cannot clear an end time once set.
    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=2000)
    starts_at: datetime | None = None
    ends_at: datetime | None = None

    @field_validator("starts_at", "ends_at", mode="after")
    @classmethod
    def _normalize(cls, value: datetime | None) -> datetime | None:
        return _normalize_to_utc(value)


class EventOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: str
    starts_at: datetime
    ends_at: datetime | None
    workspace_id: int
    created_by_id: int | None
    created_at: datetime
    updated_at: datetime

    @field_validator("starts_at", "ends_at", "created_at", "updated_at", mode="after")
    @classmethod
    def _assume_utc(cls, value: datetime | None) -> datetime | None:
        if value is not None and value.tzinfo is None:
            return value.replace(tzinfo=UTC)
        return value
