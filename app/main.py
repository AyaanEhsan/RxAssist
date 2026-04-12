from __future__ import annotations

from fastapi import FastAPI

from datetime import date
import os
from typing import Dict, List, Optional, Set, TypedDict
from supabase import Client, create_client
from pydantic import BaseModel

# from load_diffs import load_formulary_snapshot_for_rxcuis, diff_snapshots
from load_diffs import check_tier_updates_for_date_range

from dotenv import load_dotenv

load_dotenv()

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_KEY")

supabase_client: Client = create_client(url, key)

if supabase_client:
    print("Supabase client created successfully")
else:
    print("Failed to create Supabase client")

# 1. Initialize the FastAPI app
app = FastAPI(
    title="My Starter API",
    description="A basic FastAPI backend setup",
    version="1.0.0"
)

class UpdateRequest(BaseModel):
    formulary_ids: List[str]
    rxcuis: List[str]
    data_date_start: date
    data_date_end: date

# 2. Define a basic GET route
@app.get("/")
def read_root():
    return {"message": "Welcome to your FastAPI backend!"}

# 3. Define a route with a path parameter
@app.get("/items/{item_id}")
def read_item(item_id: int, q: str = None):
    return {"item_id": item_id, "query_param": q}

# 4. Define a POST route (example for data submission)
@app.post("/submit")
def create_data(payload: dict):
    return {"status": "success", "received_data": payload}


# @app.post("/check_for_updates")
# def check_for_updates(
#     payload: UpdateRequest
# ) -> None:

#     rxcui_set = {x.strip() for x in payload.rxcuis if x.strip()}
#     label_a = payload.data_date_a.isoformat()
#     label_b = payload.data_date_b.isoformat()

#     map_a = load_formulary_snapshot_for_rxcuis(supabase_client, payload.data_date_a, rxcui_set)
#     map_b = load_formulary_snapshot_for_rxcuis(supabase_client, payload.data_date_b, rxcui_set)

#     print(
#         f"Comparing {label_a} ({len(map_a)} rows) vs {label_b} ({len(map_b)} rows) "
#         f"for RXCUIs: {', '.join(sorted(rxcui_set))}"
#     )
#     diff_snapshots(label_a, map_a, label_b, map_b, rxcui_set)


@app.post("/check_for_updates")
def check_for_updates(payload: UpdateRequest) -> list:
    rxcuis = {x.strip() for x in payload.rxcuis if x.strip()}
    fids = {x.strip() for x in payload.formulary_ids if x.strip()}
    if not rxcuis or not fids:
        return []
    return check_tier_updates_for_date_range(
        supabase_client,
        data_date_start=payload.data_date_start,
        data_date_end=payload.data_date_end,
        rxcuis=rxcuis,
        formulary_ids=fids,
    )