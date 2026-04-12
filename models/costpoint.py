from pydantic import BaseModel
from typing import List, Optional

class CostPoint(BaseModel):
    days_supply: int
    avg_pref_copay: Optional[float]
    avg_nonpref_copay: Optional[float]
    avg_mail_pref_copay: Optional[float]
    avg_mail_nonpref_copay: Optional[float]