from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from supabase import create_client, Client
from typing import List, Optional
import os


from models.tiersnapshot import TierSnapshot
from models.costpoint import CostPoint
from models.tiersnapshot import TierSnapshot
from models.tiercomparison import TierComparison
from models.emaildraftcontext import EmailDraftContext
from models.tierinsightresponse import TierInsightResponse

# # ---------- Request ----------

# class TierInsightRequest(BaseModel):
#     contract_id: str
#     tiers: List[int]


# # ---------- Response Objects ----------

# class CostPoint(BaseModel):
#     days_supply: int
#     avg_pref_copay: Optional[float]
#     avg_nonpref_copay: Optional[float]
#     avg_mail_pref_copay: Optional[float]
#     avg_mail_nonpref_copay: Optional[float]


# class TierSnapshot(BaseModel):
#     tier: int
#     data_date: str
#     costs: List[CostPoint]
#     plans_with_deductible: int
#     plans_specialty_tier: int
#     total_rows: int


# class TierComparison(BaseModel):
#     days_supply: int
#     from_tier: int
#     to_tier: int
#     pref_copay_before: Optional[float]
#     pref_copay_after: Optional[float]
#     pref_delta: Optional[float]
#     pref_pct_change: Optional[float]
#     nonpref_delta: Optional[float]
#     mail_pref_delta: Optional[float]
#     annual_pref_impact: Optional[float]
#     cost_type_changed: bool


# class EmailDraftContext(BaseModel):
#     patient_impact_summary: str
#     worst_channel: str
#     best_channel_recommendation: str
#     annual_impact_estimate: Optional[float]
#     deductible_now_applies: bool
#     specialty_tier_now: bool


# class TierInsightResponse(BaseModel):
#     contract_id: str
#     tiers: List[int]
#     latest_date: str
#     tier_snapshots: List[TierSnapshot]
#     tier_comparison: List[TierComparison]
#     email_context: EmailDraftContext


# ---------- Helpers ----------

def safe_float(val) -> Optional[float]:
    try:
        return round(float(val), 2) if val is not None else None
    except Exception:
        return None


def safe_pct(after, before) -> Optional[float]:
    try:
        if before and before != 0:
            return round((after - before) / before * 100, 1)
        return None
    except Exception:
        return None


def build_email_context(comparisons: List[TierComparison], snapshots: List[TierSnapshot]) -> EmailDraftContext:
    if not comparisons:
        return EmailDraftContext(
            patient_impact_summary="No comparison data available.",
            worst_channel="N/A",
            best_channel_recommendation="N/A",
            annual_impact_estimate=None,
            deductible_now_applies=False,
            specialty_tier_now=False,
        )

    # Pick the 30-day comparison as the primary one for email
    primary = next((c for c in comparisons if c.days_supply == 30), comparisons[0])

    deltas = {
        "Preferred Retail":     primary.pref_delta or 0,
        "Non-Preferred Retail": primary.nonpref_delta or 0,
        "Preferred Mail":       primary.mail_pref_delta or 0,
    }

    worst_channel  = max(deltas, key=deltas.get)
    best_channel   = min(deltas, key=deltas.get)

    pct = primary.pref_pct_change
    pct_str = f"{pct}%" if pct is not None else "significantly"

    summary = (
        f"Your drug has moved from Tier {primary.from_tier} to Tier {primary.to_tier}. "
        f"Your preferred retail copay has increased by {pct_str} "
        f"(${primary.pref_copay_before} → ${primary.pref_copay_after} per 30-day fill)."
    )

    # Check flags from the highest tier snapshot
    highest_tier_snapshot = max(snapshots, key=lambda s: s.tier)
    deductible_now = highest_tier_snapshot.plans_with_deductible > 0
    specialty_now  = highest_tier_snapshot.plans_specialty_tier > 0

    return EmailDraftContext(
        patient_impact_summary=summary,
        worst_channel=worst_channel,
        best_channel_recommendation=f"Consider switching to {best_channel} to minimize out-of-pocket cost.",
        annual_impact_estimate=primary.annual_pref_impact,
        deductible_now_applies=deductible_now,
        specialty_tier_now=specialty_now,
    )


# ---------- Endpoint ----------

# @app.post("/tier-insights", response_model=TierInsightResponse)
# def get_tier_insights(request: TierInsightRequest):
#     contract_id = request.contract_id
#     tiers = request.tiers

#     # --- Fetch all rows for given contract + tiers ---
#     response = (
#         supabase.table("costs")
#         .select("*")
#         .eq("contract_id", contract_id)
#         .in_("tier", tiers)
#         .execute()
#     )

#     rows = response.data
#     if not rows:
#         raise HTTPException(status_code=404, detail="No data found for given contract_id and tiers.")

#     # --- Latest date ---
#     latest_date = max(r["data_date"] for r in rows)
#     latest_rows = [r for r in rows if r["data_date"] == latest_date]

#     # --- Build tier snapshots ---
#     tier_snapshots: List[TierSnapshot] = []

#     for tier in tiers:
#         tier_rows = [r for r in latest_rows if r["tier"] == tier]
#         if not tier_rows:
#             continue

#         # Aggregate by days_supply
#         days_map = {}
#         for r in tier_rows:
#             ds = r["days_supply"]
#             if ds not in days_map:
#                 days_map[ds] = []
#             days_map[ds].append(r)

#         cost_points = []
#         for ds, group in sorted(days_map.items()):
#             def avg(field):
#                 vals = [r[field] for r in group if r.get(field) is not None]
#                 return round(sum(vals) / len(vals), 2) if vals else None

#             cost_points.append(CostPoint(
#                 days_supply=ds,
#                 avg_pref_copay=avg("cost_amt_pref"),
#                 avg_nonpref_copay=avg("cost_amt_nonpref"),
#                 avg_mail_pref_copay=avg("cost_amt_mail_pref"),
#                 avg_mail_nonpref_copay=avg("cost_amt_mail_nonpref"),
#             ))

#         plans_with_ded = sum(1 for r in tier_rows if r.get("ded_applies_yn") == "Y")
#         plans_specialty = sum(1 for r in tier_rows if r.get("tier_specialty_yn") == "Y")

#         tier_snapshots.append(TierSnapshot(
#             tier=tier,
#             data_date=latest_date,
#             costs=cost_points,
#             plans_with_deductible=plans_with_ded,
#             plans_specialty_tier=plans_specialty,
#             total_rows=len(tier_rows),
#         ))

#     # --- Build tier comparisons (sequential: tier[0]→tier[1], tier[1]→tier[2], ...) ---
#     tier_comparisons: List[TierComparison] = []
#     sorted_tiers = sorted(tiers)

#     # Build a lookup: tier → days_supply → aggregated costs
#     def build_tier_lookup(tier_rows_all):
#         lookup = {}
#         for r in tier_rows_all:
#             t  = r["tier"]
#             ds = r["days_supply"]
#             lookup.setdefault(t, {}).setdefault(ds, []).append(r)
#         return lookup

#     lookup = build_tier_lookup(latest_rows)

#     for i in range(len(sorted_tiers) - 1):
#         from_tier = sorted_tiers[i]
#         to_tier   = sorted_tiers[i + 1]

#         from_map = lookup.get(from_tier, {})
#         to_map   = lookup.get(to_tier, {})
#         all_days = sorted(set(from_map.keys()) | set(to_map.keys()))

#         for ds in all_days:
#             def avg_field(tier_map, ds, field):
#                 group = tier_map.get(ds, [])
#                 vals  = [r[field] for r in group if r.get(field) is not None]
#                 return round(sum(vals) / len(vals), 2) if vals else None

#             pref_before = avg_field(from_map, ds, "cost_amt_pref")
#             pref_after  = avg_field(to_map,   ds, "cost_amt_pref")
#             pref_delta  = safe_float((pref_after or 0) - (pref_before or 0))

#             nonpref_before = avg_field(from_map, ds, "cost_amt_nonpref")
#             nonpref_after  = avg_field(to_map,   ds, "cost_amt_nonpref")
#             nonpref_delta  = safe_float((nonpref_after or 0) - (nonpref_before or 0))

#             mail_pref_before = avg_field(from_map, ds, "cost_amt_mail_pref")
#             mail_pref_after  = avg_field(to_map,   ds, "cost_amt_mail_pref")
#             mail_pref_delta  = safe_float((mail_pref_after or 0) - (mail_pref_before or 0))

#             # Cost type shift check
#             from_types = set(r["cost_type_pref"] for r in from_map.get(ds, []) if r.get("cost_type_pref") is not None)
#             to_types   = set(r["cost_type_pref"] for r in to_map.get(ds,   []) if r.get("cost_type_pref") is not None)
#             cost_type_changed = from_types != to_types

#             tier_comparisons.append(TierComparison(
#                 days_supply=ds,
#                 from_tier=from_tier,
#                 to_tier=to_tier,
#                 pref_copay_before=pref_before,
#                 pref_copay_after=pref_after,
#                 pref_delta=pref_delta,
#                 pref_pct_change=safe_pct(pref_after, pref_before),
#                 nonpref_delta=nonpref_delta,
#                 mail_pref_delta=mail_pref_delta,
#                 annual_pref_impact=safe_float(pref_delta * 12) if ds == 30 and pref_delta else None,
#                 cost_type_changed=cost_type_changed,
#             ))

#     # --- Build email context ---
#     email_context = build_email_context(tier_comparisons, tier_snapshots)

#     return TierInsightResponse(
#         contract_id=contract_id,
#         tiers=tiers,
#         latest_date=latest_date,
#         tier_snapshots=tier_snapshots,
#         tier_comparison=tier_comparisons,
#         email_context=email_context,
#     )