from __future__ import annotations

import json
from pathlib import Path
import httpx

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from datetime import date
import os
from typing import Dict, List, Optional, Set, TypedDict
from supabase import Client, create_client
from pydantic import BaseModel
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, SystemMessage

# from load_diffs import load_formulary_snapshot_for_rxcuis, diff_snapshots
# from load_diffs import check_tier_updates_for_date_range

from dotenv import load_dotenv

load_dotenv()

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_KEY")
RXNAV_BASE = os.getenv("RXNAV_URL_BASE_FOR_DRUG_NAME_TO_RXCUIS")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

llm = ChatGoogleGenerativeAI(
    model="gemini-3-flash-preview",
    google_api_key=GEMINI_API_KEY,
    temperature=0.3,
)

supabase_client: Client = create_client(url, key)
DRUGS: list[str] = []



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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class UpdateRequest(BaseModel):
    formulary_ids: List[str]
    rxcuis: List[str]
    data_date_start: date
    data_date_end: date


class PatientResponse(BaseModel):
    id: int
    patient_name: str
    contract_id: str
    plan_id: str
    segment_id: str
    formulary_id: str
    rxcuis: List[str]
    primary_diagnosis_code: Optional[str] = None
    primary_diagnosis_desc: Optional[str] = None
    history_of_present_illness: Optional[str] = None
    physical_exam_notes: Optional[str] = None
    previous_failed_therapies: Optional[List[str]] = None
    relevant_lab_results: Optional[dict] = None


class FormularyResponse(BaseModel):
    formulary_id: str
    rxcui: str
    ndc: str
    formulary_version: Optional[int] = None
    tier_level_value: Optional[int] = None
    quantity_limit_yn: Optional[str] = None
    quantity_limit_amount: Optional[str] = None
    quantity_limit_days: Optional[str] = None
    prior_authorization_yn: Optional[str] = None
    step_therapy_yn: Optional[str] = None


class PlanDetailsResponse(BaseModel):
    contract_name: Optional[str] = None
    plan_name: Optional[str] = None
    premium: Optional[float] = None
    deductible: Optional[float] = None
    state: Optional[str] = None
    plan_suppressed_yn: Optional[str] = None

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








@app.get("/patients")
def list_patients(offset: int = 0, limit: int = 20):
    response = (
        supabase_client
        .table("patients")
        .select("id, patient_name")
        .order("patient_name")
        .range(offset, offset + limit - 1)
        .execute()
    )
    return {"patients": response.data}


@app.get("/patients/{patient_id}", response_model=PatientResponse)
def get_patient(patient_id: int) -> PatientResponse:
    response = (
        supabase_client
        .table("patients")
        .select("*")
        .eq("id", patient_id)
        .single()
        .execute()
    )
    return PatientResponse(**response.data)


@app.get("/plans", response_model=PlanDetailsResponse)
def get_plan_details(
    contract_id: str,
    plan_id: str,
    segment_id: str,
    formulary_id: str,
) -> PlanDetailsResponse:
    response = (
        supabase_client
        .table("plans")
        .select("contract_name, plan_name, premium, deductible, state, plan_suppressed_yn")
        .eq("contract_id", contract_id)
        .eq("plan_id", plan_id)
        .eq("segment_id", segment_id)
        .eq("formulary_id", formulary_id)
        .order("data_date", desc=True)
        .limit(1)
        .execute()
    )

    if not response.data:
        raise HTTPException(
            status_code=404,
            detail=f"No plan found for contract_id={contract_id}, plan_id={plan_id}, "
                   f"segment_id={segment_id}, formulary_id={formulary_id}",
        )

    return PlanDetailsResponse(**response.data[0])


@app.get("/formulary_for_provider", response_model=List[FormularyResponse])
def get_formulary_coverage(
    formulary_id: str,
    rxcui: str,
) -> List[FormularyResponse]:
    response = (
        supabase_client
        .table("formulary")
        .select(
            "formulary_id, rxcui, ndc, formulary_version,"
            "tier_level_value, quantity_limit_yn, quantity_limit_amount, "
            "quantity_limit_days, prior_authorization_yn, step_therapy_yn"
        )
        .eq("formulary_id", formulary_id)
        .eq("rxcui", rxcui)
        .order("data_date", desc=True)
        .limit(10)
        .execute()
    )

    if not response.data:
        return []

    return [FormularyResponse(**row) for row in response.data]


@app.get("/formulary/{formulary_id}/rxcuis")
def get_rxcuis_by_formulary(formulary_id: str) -> dict:
    response = (
        supabase_client
        .table("formulary")
        .select("rxcui")
        .eq("formulary_id", formulary_id)
        .execute()
    )

    if not response.data:
        return {"formulary_id": formulary_id, "rxcuis": [], "count": 0}

    unique_rxcuis = sorted({row["rxcui"] for row in response.data})
    return {
        "formulary_id": formulary_id,
        "rxcuis": unique_rxcuis,
        "count": len(unique_rxcuis),
    }


@app.on_event("startup")
def load_drugs():
    global DRUGS
    drug_file = Path(__file__).parent / "assets" / "drugs.json"
    with open(drug_file) as f:
        DRUGS = json.load(f)["drugs"]


@app.get("/drugs")
def search_drugs(q: str = "", limit: int = 10) -> dict:
    if not q:
        return {"results": DRUGS[:limit]}

    query_lower = q.lower()
    matches = [drug for drug in DRUGS if drug.lower().startswith(query_lower)]
    return {"results": matches[:limit]}


@app.get("/drug-rxcuis/{drug_name}")
async def get_drug_rxcuis(drug_name: str):
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{RXNAV_BASE}{drug_name}")
        response.raise_for_status()
        data = response.json()
    results = []
    concept_groups = data.get("drugGroup", {}).get("conceptGroup", [])
    for group in concept_groups:
        for concept in group.get("conceptProperties", []):
            results.append({
                "rxcui": concept["rxcui"],
                "name": concept["name"],
                "synonym": concept["synonym"],
                "status": "active" if concept.get("suppress") == "N" else "obsolete",
            })
    return {"drug": drug_name, "results": results}


@app.get("/formulary/{formulary_id}/drug-lookup/{drug_name}")
async def get_formulary_drugs_by_name(formulary_id: str, drug_name: str):
    async with httpx.AsyncClient() as client:
        resp = await client.get(f"{RXNAV_BASE}{drug_name}")
        resp.raise_for_status()
        data = resp.json()

    all_drug_results = []
    concept_groups = data.get("drugGroup", {}).get("conceptGroup", [])
    for group in concept_groups:
        for concept in group.get("conceptProperties", []):
            all_drug_results.append({
                "rxcui": concept["rxcui"],
                "name": concept["name"],
                "synonym": concept["synonym"],
                "status": "active" if concept.get("suppress") == "N" else "obsolete",
            })

    formulary_resp = (
        supabase_client
        .table("formulary")
        .select("rxcui")
        .eq("formulary_id", formulary_id)
        .execute()
    )
    covered_rxcuis: Set[str] = {row["rxcui"] for row in (formulary_resp.data or [])}

    covered_drugs = [d for d in all_drug_results if d["rxcui"] in covered_rxcuis]

    return {
        "drug": drug_name,
        "formulary_id": formulary_id,
        "covered_results": covered_drugs,
        "total_rxcuis_found": len(all_drug_results),
        "covered_count": len(covered_drugs),
    }


# ── Prior Auth Draft ─────────────────────────────────────────────────


class PriorAuthDraftRequest(BaseModel):
    # Patient
    patient_name: str
    primary_diagnosis_code: Optional[str] = None
    primary_diagnosis_desc: Optional[str] = None
    history_of_present_illness: Optional[str] = None
    physical_exam_notes: Optional[str] = None
    previous_failed_therapies: Optional[List[str]] = None
    relevant_lab_results: Optional[dict] = None

    # Insurance / Plan
    contract_id: str
    plan_id: str
    segment_id: str
    formulary_id: str
    contract_name: Optional[str] = None
    plan_name: Optional[str] = None
    state: Optional[str] = None

    # Drug
    drug_name: str
    rxcui: str
    ndc: Optional[str] = None
    tier_level_value: Optional[int] = None

    # Coverage Rules
    prior_authorization_yn: Optional[str] = None
    step_therapy_yn: Optional[str] = None
    quantity_limit_yn: Optional[str] = None
    quantity_limit_amount: Optional[str] = None
    quantity_limit_days: Optional[str] = None


PRIOR_AUTH_SYSTEM_PROMPT = """\
You are a medical prior-authorization specialist AI.
Given the structured patient, insurance, drug, and coverage data below,
generate a **complete Prior Authorization request letter** that a physician's
office could submit to the insurance plan.

The letter MUST include all of the following sections:
1. **Header** – Date, physician/practice placeholder, insurer name & plan.
2. **Patient Information** – Name, diagnosis (ICD-10 code + description).
3. **Medication Requested** – Drug name, RxCUI, NDC, tier level.
4. **Clinical Justification** – Incorporate the history of present illness,
   physical exam notes, previous failed therapies, and relevant lab results
   to build a compelling medical-necessity argument.
5. **Insurance Coverage Context** – Reference the formulary tier, whether
   prior auth / step therapy / quantity limits apply, and the specific
   quantity-limit amounts/days if present.
6. **Conclusion** – A concise closing requesting approval.

Use professional, formal medical language.  Output the letter in Markdown.
"""


@app.post("/prior-auth/draft")
async def draft_prior_auth(req: PriorAuthDraftRequest):
    payload = req.model_dump()


    user_prompt = f"""\
                Generate a Prior Authorization request letter using the following data:

                ## Patient Information
                - Patient Name: {payload['patient_name']}
                - Primary Diagnosis Code (ICD-10): {payload['primary_diagnosis_code']}
                - Primary Diagnosis Description: {payload['primary_diagnosis_desc']}
                - History of Present Illness: {payload['history_of_present_illness']}
                - Physical Exam Notes: {payload['physical_exam_notes']}
                - Previous Failed Therapies: {payload['previous_failed_therapies']}
                - Relevant Lab Results: {json.dumps(payload['relevant_lab_results']) if payload['relevant_lab_results'] else 'N/A'}

                ## Insurance / Plan
                - Contract ID: {payload['contract_id']}
                - Plan ID: {payload['plan_id']}
                - Segment ID: {payload['segment_id']}
                - Formulary ID: {payload['formulary_id']}
                - Contract Name: {payload['contract_name']}
                - Plan Name: {payload['plan_name']}
                - State: {payload['state']}

                ## Medication Requested
                - Drug Name: {payload['drug_name']}
                - RxCUI: {payload['rxcui']}
                - NDC: {payload['ndc']}
                - Tier Level: {payload['tier_level_value']}

                ## Coverage Rules
                - Prior Authorization Required: {payload['prior_authorization_yn']}
                - Step Therapy Required: {payload['step_therapy_yn']}
                - Quantity Limit: {payload['quantity_limit_yn']}
                - Quantity Limit Amount: {payload['quantity_limit_amount']}
                - Quantity Limit Days: {payload['quantity_limit_days']}
            """

    messages = [
        SystemMessage(content=PRIOR_AUTH_SYSTEM_PROMPT),
        HumanMessage(content=user_prompt),
    ]

    response = await llm.ainvoke(messages)
    draft_letter = response.content

    print("\n── Generated Prior Auth Letter ──")
    print(draft_letter)
    print("── End of Letter ──\n")

    return {
        "status": "success",
        "draft_letter": draft_letter,
        "payload": payload,
    }

