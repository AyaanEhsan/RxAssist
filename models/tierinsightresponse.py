from pydantic import BaseModel
from typing import List, Optional

from models.tiersnapshot import TierSnapshot
from models.tiercomparison import TierComparison
from models.emaildraftcontext import EmailDraftContext

class TierInsightResponse(BaseModel):
    contract_id: str
    tiers: List[int]
    latest_date: str
    tier_snapshots: List[TierSnapshot]
    tier_comparison: List[TierComparison]
    email_context: EmailDraftContext