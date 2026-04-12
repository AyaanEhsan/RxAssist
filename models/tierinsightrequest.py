from pydantic import BaseModel
from typing import List, Optional

class TierInsightRequest(BaseModel):
    contract_id: str
    tiers: List[int]