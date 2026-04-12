from pydantic import BaseModel

class TierChange(BaseModel):
    rxcui: str
    ndc: str
    has_tier_changed: bool
    tier_before: int
    tier_after: int