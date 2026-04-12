from pydantic import BaseModel
from typing import List, Optional

class EmailDraftContext(BaseModel):
    patient_impact_summary: str
    worst_channel: str
    best_channel_recommendation: str
    annual_impact_estimate: Optional[float]
    deductible_now_applies: bool
    specialty_tier_now: bool