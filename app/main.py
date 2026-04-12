from __future__ import annotations

from fastapi import FastAPI
from fastapi.exceptions import HTTPException

from datetime import date
import os
from typing import Dict, List, Optional, Set, TypedDict
from supabase import Client, create_client
from pydantic import BaseModel


from formulary_diff import get_tier_changes
from costs_diff import safe_float, safe_pct, build_email_context
from email_generator import generate_and_send_email


from models.checkforupdaterequest import CheckForUpdateRequest
from models.tierinsightrequest import TierInsightRequest
from models.tierchange import TierChange
from models.tiersnapshot import TierSnapshot
from models.costpoint import CostPoint
from models.tiersnapshot import TierSnapshot
from models.tiercomparison import TierComparison
from models.emaildraftcontext import EmailDraftContext
from models.tierinsightresponse import TierInsightResponse

from dotenv import load_dotenv

load_dotenv()



class CheckForUpdateRequest(BaseModel):
    rxcuis: list[str]
    formulary_id: str
    data_date_start: date
    data_date_end: date
    patient_name: str    # e.g. "John Doe"
    patient_email: str   # e.g. "john.doe@gmail.com"

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


@app.post("/check_for_updates")
def check_for_updates(payload: CheckForUpdateRequest):
    """
    Checks for tier changes across a list of RXCUIs and Formulary IDs
    between two specific dates, then emails the patient if any changes are found.
    """
    rxcui_list = [x.strip() for x in payload.rxcuis if x.strip()]

    if not rxcui_list:
        raise HTTPException(status_code=400, detail="No valid RXCUIs provided.")

    all_results = []

    for rxcui in rxcui_list:
        result = get_tier_changes(
            supabase=supabase_client,
            formulary_id=payload.formulary_id,
            rxcui=rxcui,
            initial_date=payload.data_date_start.isoformat(),
            final_date=payload.data_date_end.isoformat()
        )

        # Handle error cases
        if isinstance(result, str):
            print(f"No data for RXCUI {rxcui}: {result}")
            continue
        if isinstance(result, dict) and "error" in result:
            print(f"Error for RXCUI {rxcui}: {result['error']}")
            continue

        # result is a list of TierChange objects — extend, not append
        all_results.extend(result)  # 👈 KEY FIX: was append(), now extend()

    # Generate and send email
    generate_and_send_email(
        recipient_email=payload.patient_email,
        patient_name=payload.patient_name,
        tier_changes=all_results  # now a flat list of TierChange objects ✅
    )




@app.post("/tier-insights", response_model=TierInsightResponse)
def get_tier_insights(request: TierInsightRequest):
    contract_id = request.contract_id
    tiers = request.tiers

    # --- Fetch all rows for given contract + tiers ---
    response = (
        supabase_client.table("costs")
        .select("*")
        .eq("contract_id", contract_id)
        .in_("tier", tiers)
        .execute()
    )

    rows = response.data
    if not rows:
        raise HTTPException(status_code=404, detail="No data found for given contract_id and tiers.")

    # --- Latest date ---
    latest_date = max(r["data_date"] for r in rows)
    latest_rows = [r for r in rows if r["data_date"] == latest_date]

    # --- Build tier snapshots ---
    tier_snapshots: List[TierSnapshot] = []

    for tier in tiers:
        tier_rows = [r for r in latest_rows if r["tier"] == tier]
        if not tier_rows:
            continue

        # Aggregate by days_supply
        days_map = {}
        for r in tier_rows:
            ds = r["days_supply"]
            if ds not in days_map:
                days_map[ds] = []
            days_map[ds].append(r)

        cost_points = []
        for ds, group in sorted(days_map.items()):
            def avg(field):
                vals = [r[field] for r in group if r.get(field) is not None]
                return round(sum(vals) / len(vals), 2) if vals else None

            cost_points.append(CostPoint(
                days_supply=ds,
                avg_pref_copay=avg("cost_amt_pref"),
                avg_nonpref_copay=avg("cost_amt_nonpref"),
                avg_mail_pref_copay=avg("cost_amt_mail_pref"),
                avg_mail_nonpref_copay=avg("cost_amt_mail_nonpref"),
            ))

        plans_with_ded = sum(1 for r in tier_rows if r.get("ded_applies_yn") == "Y")
        plans_specialty = sum(1 for r in tier_rows if r.get("tier_specialty_yn") == "Y")

        tier_snapshots.append(TierSnapshot(
            tier=tier,
            data_date=latest_date,
            costs=cost_points,
            plans_with_deductible=plans_with_ded,
            plans_specialty_tier=plans_specialty,
            total_rows=len(tier_rows),
        ))

    # --- Build tier comparisons (sequential: tier[0]→tier[1], tier[1]→tier[2], ...) ---
    tier_comparisons: List[TierComparison] = []
    sorted_tiers = sorted(tiers)

    # Build a lookup: tier → days_supply → aggregated costs
    def build_tier_lookup(tier_rows_all):
        lookup = {}
        for r in tier_rows_all:
            t  = r["tier"]
            ds = r["days_supply"]
            lookup.setdefault(t, {}).setdefault(ds, []).append(r)
        return lookup

    lookup = build_tier_lookup(latest_rows)

    for i in range(len(sorted_tiers) - 1):
        from_tier = sorted_tiers[i]
        to_tier   = sorted_tiers[i + 1]

        from_map = lookup.get(from_tier, {})
        to_map   = lookup.get(to_tier, {})
        all_days = sorted(set(from_map.keys()) | set(to_map.keys()))

        for ds in all_days:
            def avg_field(tier_map, ds, field):
                group = tier_map.get(ds, [])
                vals  = [r[field] for r in group if r.get(field) is not None]
                return round(sum(vals) / len(vals), 2) if vals else None

            pref_before = avg_field(from_map, ds, "cost_amt_pref")
            pref_after  = avg_field(to_map,   ds, "cost_amt_pref")
            pref_delta  = safe_float((pref_after or 0) - (pref_before or 0))

            nonpref_before = avg_field(from_map, ds, "cost_amt_nonpref")
            nonpref_after  = avg_field(to_map,   ds, "cost_amt_nonpref")
            nonpref_delta  = safe_float((nonpref_after or 0) - (nonpref_before or 0))

            mail_pref_before = avg_field(from_map, ds, "cost_amt_mail_pref")
            mail_pref_after  = avg_field(to_map,   ds, "cost_amt_mail_pref")
            mail_pref_delta  = safe_float((mail_pref_after or 0) - (mail_pref_before or 0))

            # Cost type shift check
            from_types = set(r["cost_type_pref"] for r in from_map.get(ds, []) if r.get("cost_type_pref") is not None)
            to_types   = set(r["cost_type_pref"] for r in to_map.get(ds,   []) if r.get("cost_type_pref") is not None)
            cost_type_changed = from_types != to_types

            tier_comparisons.append(TierComparison(
                days_supply=ds,
                from_tier=from_tier,
                to_tier=to_tier,
                pref_copay_before=pref_before,
                pref_copay_after=pref_after,
                pref_delta=pref_delta,
                pref_pct_change=safe_pct(pref_after, pref_before),
                nonpref_delta=nonpref_delta,
                mail_pref_delta=mail_pref_delta,
                annual_pref_impact=safe_float(pref_delta * 12) if ds == 30 and pref_delta else None,
                cost_type_changed=cost_type_changed,
            ))

    # --- Build email context ---
    email_context = build_email_context(tier_comparisons, tier_snapshots)

    return TierInsightResponse(
        contract_id=contract_id,
        tiers=tiers,
        latest_date=latest_date,
        tier_snapshots=tier_snapshots,
        tier_comparison=tier_comparisons,
        email_context=email_context,
    )