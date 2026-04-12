from __future__ import annotations

from fastapi import FastAPI
from fastapi.exceptions import HTTPException

from datetime import date
import os
from typing import Dict, List, Optional, Set, TypedDict
from supabase import Client, create_client
from pydantic import BaseModel


from formulary_diff import get_tier_changes
from models.checkforupdaterequest import CheckForUpdateRequest
from models.tierchange import TierChange

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


# @app.post("/check_for_updates")
# def check_for_updates(payload: UpdateRequest) -> list:
#     rxcuis = {x.strip() for x in payload.rxcuis if x.strip()}
#     fids = {x.strip() for x in payload.formulary_ids if x.strip()}
#     if not rxcuis or not fids:
#         return []
#     return check_tier_updates_for_date_range(
#         supabase_client,
#         data_date_start=payload.data_date_start,
#         data_date_end=payload.data_date_end,
#         rxcuis=rxcuis,
#         formulary_ids=fids,
#     )






@app.post("/check_for_updates")
def check_for_updates(payload: CheckForUpdateRequest):
    """
    Checks for tier changes across a list of RXCUIs and Formulary IDs
    between two specific dates.
    """
    # Clean and validate input
    rxcui_list = [x.strip() for x in payload.rxcuis if x.strip()]
    
    if not rxcui_list:
        raise HTTPException(status_code=400, detail="No valid RXCUIs provided.")

    all_results = []

    # Since get_tier_changes (as written in your script) takes a single RXCUI,
    # we loop through the provided RXCUIs.
    for rxcui in rxcui_list:
        result: TierChange = get_tier_changes(
            supabase=supabase_client,
            formulary_id=payload.formulary_id,
            rxcui=rxcui,
            initial_date=payload.data_date_start.isoformat(),
            final_date=payload.data_date_end.isoformat()
        )
        
        # If result is a list (changes found), filter by formulary_ids if they were provided
        print(result)
        all_results.append(result)

        
    # Return results or an empty list if no changes found
    return {
        "status": "success",
        "start_date": payload.data_date_start,
        "end_date": payload.data_date_end,
        "changes": all_results
    }