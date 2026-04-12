from pydantic import BaseModel
from typing import List, Optional

class TierComparison(BaseModel):
    days_supply: int
    from_tier: int
    to_tier: int
    pref_copay_before: Optional[float]
    pref_copay_after: Optional[float]
    pref_delta: Optional[float]
    pref_pct_change: Optional[float]
    nonpref_delta: Optional[float]
    mail_pref_delta: Optional[float]
    annual_pref_impact: Optional[float]
    cost_type_changed: bool