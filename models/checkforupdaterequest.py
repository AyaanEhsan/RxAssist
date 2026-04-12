from pydantic import BaseModel
from typing import Dict, List, Optional, Set, TypedDict
from datetime import date

class CheckForUpdateRequest(BaseModel):
    formulary_id: str
    rxcuis: List[str]
    data_date_start: date
    data_date_end: date