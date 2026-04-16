<div align="center">

# RxAssist

**Formulary intelligence and AI-assisted prior authorization drafting for providers.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python 3](https://img.shields.io/badge/python-3.10+-blue.svg)](https://www.python.org/downloads/)
[![FastAPI](https://img.shields.io/badge/API-FastAPI-009688.svg)](https://fastapi.tiangolo.com/)

</div>

RxAssist combines **insurance formulary data**, **plan context**, and **patient-friendly workflows** in one stack: load structured coverage into Supabase, normalize drugs with **RxNav (RxCUI)**, surface tier / PA / step therapy / quantity limits, and when needed generate a **prior authorization draft**—with **PII masked before** any cloud LLM call and **restored after**.

> **Note:** This project is a **technical demonstration**. It is not medical or legal advice, does not replace clinical judgment or payer processes, and should not be used for real patient care without appropriate review, compliance, and data agreements.

---

## Quickstart

From the **`RxAssist/`** directory:

**Backend**

```bash
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

Create **`.env`** (see [Environment variables](#environment-variables)), then:

```bash
uvicorn app.main:app --reload
```

- API: [http://127.0.0.1:8000](http://127.0.0.1:8000)
- Docs: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

**Frontend** (second terminal)

```bash
cd Front_End
npm install
npm run dev
```

The UI expects the backend at `http://127.0.0.1:8000`.

**ETL (optional)** — open `ETL/parsing_data_to_db.ipynb` to inspect or rerun data loading into Supabase.

---

## What it does

| Capability | Description |
|------------|-------------|
| **Coverage lookup** | Match medications to **RxCUI**, filter by **formulary_id**, return tier, PA, step therapy, quantity limits. |
| **Plan & patient context** | Read plan and patient records from Supabase for the dashboard workflow. |
| **Provider workflow** | React (Vite + TypeScript) dashboard: sign-in, patient selection, drug search, coverage review, draft generation. |
| **AI drafting** | Structured prompt to **Gemini** via LangChain; output is Markdown suitable for copy or email. |

End-to-end flow: **ETL → Supabase → FastAPI → frontend**, with external **RxNav** for drug normalization and **Gemini** for letter drafting.

---

## Privacy-first LLM calls (PII masking)

On **`/prior-auth/draft`** (`app/main.py`), RxAssist uses **Microsoft Presidio** with LangChain’s **`PresidioReversibleAnonymizer`**: detect **names, phone numbers, and emails**, substitute reversible placeholders for the API request, then **deanonymize** the model response. A **fresh anonymizer per request** avoids cross-request state between users.

This reduces exposure of common identifiers to third-party inference APIs while still using a hosted model—useful as a pragmatic layer; it is **not** a complete HIPAA program by itself.

---

## Repository layout

| Path | Role |
|------|------|
| **`ETL/`** | Schema (`db_schema.md`), notebook for parsing/loading **`formulary`**, **`plans`**, **`costs`** into Supabase. |
| **`app/`** | FastAPI app (`main.py`): Supabase, RxNav, Gemini, Presidio-backed draft route; local drug list in `app/assets/drugs.json`. |
| **`Front_End/`** | Provider dashboard (React, TanStack Query, `src/lib/api.ts` → backend). |

Product overview slides (if present): **`RxAssist-Presentation.pptx`**.

---

## Environment variables

Copy **`.env_sample`** to **`.env`** at the repo root:

```env
SUPABASE_URL=""
SUPABASE_KEY=""
RXNAV_URL_BASE_FOR_DRUG_NAME_TO_RXCUIS=""
GEMINI_API_KEY=""
```

| Variable | Purpose |
|----------|---------|
| `SUPABASE_URL` / `SUPABASE_KEY` | Application and formulary data |
| `RXNAV_URL_BASE_FOR_DRUG_NAME_TO_RXCUIS` | RxNav drug-name → RxCUI |
| `GEMINI_API_KEY` | Prior authorization letter generation |

---

## API surface (high level)

Key routes include: **`/patients`**, **`/patients/{patient_id}`**, **`/plans`**, **`/formulary_for_provider`**, **`/formulary/{formulary_id}/rxcuis`**, **`/drugs`**, **`/drug-rxcuis/{drug_name}`**, **`/formulary/{formulary_id}/drug-lookup/{drug_name}`**, **`/check_for_updates`**, **`/prior-auth/draft`**. See **`/docs`** for the full OpenAPI spec.

---

## License

[MIT](LICENSE) — Copyright (c) 2026 AyaanEhsan
