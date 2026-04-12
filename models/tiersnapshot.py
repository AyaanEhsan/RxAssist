from pydantic import BaseModel
from typing import List, Optional

from models.costpoint import CostPoint

class TierSnapshot(BaseModel):
    tier: int
    data_date: str
    costs: List[CostPoint]
    plans_with_deductible: int
    plans_specialty_tier: int
    total_rows: int