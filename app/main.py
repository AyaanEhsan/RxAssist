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
    # Physician / Practice
    physician_name: str
    practice_name: str

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
    4. **History of Present Illness** – A dedicated narrative section describing
    the patient's current condition, symptom onset, progression, and relevant
    medical history as provided.
    5. **Physical Exam** – A dedicated section summarizing the physical exam
    findings, vitals, and any clinically significant observations.
    6. **Clinical Justification** – Incorporate previous failed therapies and
    relevant lab results to build a compelling medical-necessity argument
    for why this specific medication is required.
    7. **Insurance Coverage Context** – Reference the formulary tier, whether
    prior auth / step therapy / quantity limits apply, and the specific
    quantity-limit amounts/days if present.
    8. **Conclusion** – A concise closing requesting approval.

    IMPORTANT – Static patient identifiers to ALWAYS include in the letter:
    - Date of Birth: 1961-XX-XX
    - Member ID: 954XXXXXX

    TONE: Write as a real physician would — natural, direct, and human.
    Avoid overly polished or templated AI-sounding language. Vary sentence
    structure, use clinical shorthand where appropriate, and let the letter
    read as if a doctor personally dictated it.

    Use professional, formal medical language.

    FORMAT: Your entire response must be professionally formatted Markdown.
    - Use `#` / `##` / `###` headings to delineate each section.
    - Use **bold** for key labels, drug names, and diagnosis codes.
    - Use bullet lists or numbered lists for lab values, failed therapies,
    and coverage-rule details — never dump them as run-on prose.
    - Separate sections with blank lines so the document renders cleanly.
    - Do NOT wrap the output in a Markdown code fence (```); return raw
    Markdown text directly.

    # Please take the below as an example output format ONLY not the exact output:
    Example output Format:


        Prior Authorization Request: Ofev (nintedanib) | 100MG | 60 capsules per 30 days
            Date: October 24, 2023

            To: Prior Authorization Department SELECT HEALTH OF SOUTH CAROLINA, INC. First Choice VIP Care (HMO D-SNP)

            From: [Physician Name] [Practice Name] [Practice Address] [Phone/Fax Number]

            Patient Information
            Patient Name: John Doe
            Date of Birth: 1961-XX-XX
            Member ID: 954XXXXXX
            Primary Diagnosis: C34.90 – Malignant neoplasm of unspecified part of bronchus or lung
            Secondary Diagnosis: J84.112 – Idiopathic Pulmonary Fibrosis (IPF)
            Medication Requested
            Drug Name: nintedanib 100 MG Oral Capsule [Ofev]
            RxCUI: 1592748
            NDC: 597014360
            Formulary Tier: Tier 5
            Requested Quantity: 60 capsules per 30 days
            History of Present Illness
            Mr. Doe is a 68-year-old male presenting with a highly complex clinical profile involving concurrent metastatic non-small cell lung cancer (NSCLC) and progressive Idiopathic Pulmonary Fibrosis (IPF). Recent genomic profiling of his lung biopsy identified an EGFR Exon 19 deletion, necessitating targeted therapy with afatinib (Gilotrif).

            Simultaneously, his IPF has demonstrated significant progression over the last 12 months, characterized by a steady decline in forced vital capacity (FVC). The patient is currently struggling with severe medication-induced nausea and vomiting (MINV), graded as Grade 3 refractory. This has resulted in a 10 lb weight loss and episodes of dehydration. Given his dual pulmonary pathologies, stabilizing his lung function with nintedanib is critical to his overall survival and ability to tolerate his oncologic regimen.

            Physical Exam
            Vitals: BP 128/82, HR 88, RR 20, SpO2 91% on room air.
            General: Chronically ill-appearing and mildly cachectic; however, he is in no acute distress.
            Respiratory: Bilateral fine end-inspiratory "velcro-like" crackles are prominent at the lung bases. Breath sounds are notably decreased in the right upper lobe.
            Cardiovascular: Regular rate and rhythm; no murmurs noted.
            Extremities: 1+ pitting edema bilaterally; moderate digital clubbing is present, consistent with chronic hypoxia and interstitial disease.
            Clinical Justification
            The initiation of Ofev (nintedanib) is medically necessary for this patient to slow the decline of his pulmonary function. Mr. Doe has already failed the primary alternative for IPF due to significant adverse effects.

            Previous Failed Therapies:

            Pirfenidone: Discontinued due to severe GI intolerance and clinically significant elevation of LFTs.
            Erlotinib: Intolerant due to Grade 3 skin rash (relevant to his concurrent NSCLC management).
            Ondansetron 8mg & Prochlorperazine: Both failed to control his refractory nausea, necessitating a more aggressive anti-emetic strategy (aprepitant) alongside his oral oncolytics and the requested nintedanib.
            Relevant Lab & Diagnostic Results:

            FVC: 62% predicted (indicating significant restrictive impairment).
            DLCO: 55% predicted.
            EGFR Status: Positive (Exon 19 deletion).
            Liver Function: ALT 28 U/L, AST 32 U/L, Bilirubin 0.8 mg/dL (currently stable, making him a candidate for nintedanib after failing pirfenidone).
            Weight: Recent 10 lb loss due to GI distress.
            Nintedanib is the most appropriate choice for this patient given his history of hepatotoxicity and GI intolerance with pirfenidone. Stabilizing his FVC is paramount, as his respiratory reserve is already compromised (SpO2 91% RA).

            Insurance Coverage Context
            We acknowledge that Ofev is a Tier 5 medication under the First Choice VIP Care (HMO D-SNP) formulary and requires Prior Authorization.

            Prior Authorization Required: Yes
            Step Therapy Required: No
            Quantity Limit: Yes (60 capsules per 30 days)
            The requested dosage of 100 mg BID (60 capsules per 30 days) aligns exactly with the plan's quantity limit requirements and standard dosing for IPF.

            Conclusion
            Given Mr. Doe’s progressive interstitial lung disease, his concurrent metastatic NSCLC, and his failure of previous therapies, I am requesting an immediate approval for Ofev 100 mg. Delaying treatment risks further irreversible loss of pulmonary function.

            Please contact my office at [Phone Number] if any further clinical documentation is required.

            Best regards,

            [Physician Signature]

            [Physician Name, Credentials]
    """


@app.post("/prior-auth/draft")
async def draft_prior_auth(req: PriorAuthDraftRequest):
    payload = req.model_dump()


    user_prompt = f"""\
                Generate a Prior Authorization request letter using the following data:

                ## Physician / Practice
                - Physician Name: {payload['physician_name']}
                - Practice Name: {payload['practice_name']}

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
    content = response.content

    if isinstance(content, list):
        draft_letter = "\n".join(
            block["text"] for block in content if isinstance(block, dict) and block.get("type") == "text"
        )
    else:
        draft_letter = content

    print("\n── Generated Prior Auth Letter ──")
    print(draft_letter)
    print("── End of Letter ──\n")

    return {
        "status": "success",
        "draft_letter": draft_letter,
        "payload": payload,
    }

