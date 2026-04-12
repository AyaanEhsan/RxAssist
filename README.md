# RxAssist

RxAssist is a project that brings together insurance formulary data, plan data, patient context, and AI-assisted drafting to support medication coverage review and prior authorization work.

Based on the code in this repository, the main workflow is:

1. load healthcare plan and formulary data into Supabase,
2. retrieve patient and plan information,
3. search for a medication and match it to RxCUI values,
4. check whether that medication appears in the patient's formulary,
5. show coverage rules such as tier, prior authorization, step therapy, and quantity limits,
6. generate a prior authorization draft letter from structured patient, plan, and medication data.

## What The Project Is About

RxAssist is built around a practical problem: medication access is not only a clinical decision, but also an insurance and documentation workflow.

Even when a provider knows which medication a patient needs, there are still operational questions that can slow treatment down:

- Is the drug present in the patient's formulary?
- What tier is it on?
- Does the plan require prior authorization?
- Is step therapy required?
- Is there a quantity limit?
- What information should go into the authorization request?

This repository addresses that workflow by combining:

- an ETL layer for preparing insurance and formulary data,
- a FastAPI backend for querying and reasoning over that data,
- a frontend provider dashboard for patient selection, drug lookup, coverage review, and prior authorization draft generation.

## Why This App Is Useful

The benefit of RxAssist, as shown by the current codebase, is that it reduces fragmentation across the prior authorization process.

Instead of treating coverage lookup, drug normalization, patient context, and draft writing as separate tasks, the app places them into one sequence:

- choose a patient,
- inspect the patient's plan context,
- search for a drug,
- review formulary coverage,
- generate a draft when prior authorization is required.

That design is useful because it helps turn raw data into a workflow that is easier for providers and staff to act on.

The app also makes its reasoning more visible by returning concrete coverage details rather than only a simple yes/no answer. In the backend and frontend, the workflow surfaces:

- formulary matches by `formulary_id` and `rxcui`,
- tier level,
- prior authorization requirements,
- step therapy requirements,
- quantity limits,
- patient diagnosis and clinical notes used in the prior auth draft.

In practical terms, that means the application is trying to support both access checking and documentation preparation in one place.

## Project Structure

### `ETL/`

The `ETL/` directory contains the data preparation side of the project.

It currently includes:

- `db_schema.md`
- `parsing_data_to_db.ipynb`

The schema file documents three core Supabase tables:

- `formulary`: stores drug coverage information such as `formulary_id`, `rxcui`, `ndc`, tier level, prior authorization flags, step therapy flags, quantity limits, and `data_date`
- `plans`: stores plan-level information such as contract, plan, segment, formulary, premium, deductible, state, and `data_date`
- `costs`: stores cost-sharing details by plan and tier

This ETL layer matters because the backend depends on structured insurance and formulary data. The project can only answer questions like "is this RxCUI covered under this formulary?" if that data has already been cleaned, shaped, and loaded into the database.

The notebook, `parsing_data_to_db.ipynb`, is the implementation space for that process. It is where raw source data can be transformed into database-ready records.

In other words, `ETL/` is the data foundation of RxAssist.

### `app/`

The `app/` directory is the backend.

The backend is built with FastAPI and is centered in `app/main.py`. It connects to:

- Supabase for application data
- RxNav for drug-name-to-RxCUI lookup
- Gemini through `langchain-google-genai` for prior authorization letter drafting

The backend currently defines routes for:

- basic API test routes such as `/`, `/items/{item_id}`, and `/submit`
- `/patients` to list patients
- `/patients/{patient_id}` to retrieve a full patient record
- `/plans` to retrieve plan details for a contract, plan, segment, and formulary
- `/formulary_for_provider` to retrieve formulary coverage entries for a `formulary_id` and `rxcui`
- `/formulary/{formulary_id}/rxcuis` to list RxCUIs present in a formulary
- `/drugs` to search locally loaded drug names from `app/assets/drugs.json`
- `/drug-rxcuis/{drug_name}` to query RxNav and return RxCUI matches
- `/formulary/{formulary_id}/drug-lookup/{drug_name}` to combine RxNav results with formulary filtering
- `/check_for_updates` to compare formulary tier changes across a date range for selected `formulary_id` and `rxcui` values
- `/prior-auth/draft` to generate a prior authorization request letter

The backend is where the project logic lives. It is responsible for:

- reading structured data from Supabase,
- matching a searched medication to RxCUI values,
- narrowing drug results to the selected formulary,
- exposing plan and patient details to the UI,
- building the structured prompt used to generate the prior authorization draft.

The prior authorization feature is the clearest example of the backend's role. The code builds a request from:

- physician and practice information,
- patient name and diagnosis,
- history of present illness,
- physical exam notes,
- previous failed therapies,
- relevant lab results,
- plan identifiers,
- medication details,
- coverage-rule fields such as prior auth, step therapy, and quantity limits.

That payload is then sent to Gemini with a system prompt that asks for a complete prior authorization request letter in Markdown.

So, the backend is not only serving data. It is also assembling the reasoning context that turns raw insurance and clinical information into a usable draft.

### `Front_End/`

The `Front_End/` directory is the user-facing interface.

Based on `package.json` and the source files in `src/`, it is a React + TypeScript application built with Vite. It uses `@tanstack/react-query` for data fetching and includes UI components for the provider dashboard workflow.

The frontend currently contains:

- a login screen that collects physician name and practice name
- session-based provider state in `src/contexts/AuthContext.tsx`
- the main dashboard in `src/pages/Index.tsx`
- API helpers in `src/lib/api.ts`

From the current UI code, the dashboard workflow is:

1. sign in with physician and practice information,
2. select a patient,
3. load patient details,
4. load the patient's plan details,
5. search for a drug name,
6. choose the correct RxCUI from formulary-aware lookup results,
7. inspect formulary coverage,
8. if prior authorization is required, open a confirmation dialog,
9. request a generated prior authorization letter,
10. read the returned Markdown letter, copy it, or open it in an email draft.

The frontend is important because it turns the backend capabilities into a step-by-step workflow. It presents the patient context, plan context, drug search, formulary result, and prior authorization action in one place.

That makes `Front_End/` the part of the project that translates the data and backend logic into an actual provider-facing experience.

## Data And Application Flow

Putting the pieces together, the project currently works like this:

1. data is prepared and loaded through `ETL/`
2. the backend queries Supabase and external services
3. the frontend calls the backend on `http://127.0.0.1:8000`
4. the user works through patient selection, drug search, coverage review, and draft generation

This architecture is simple to follow because each part has a clear role:

- `ETL/` prepares the data,
- `app/` serves and reasons over the data,
- `Front_End/` presents the workflow to the user.

## Environment Variables

The repository includes `.env_sample`, which shows the backend expects these values in a `.env` file at the `RxAssist/` root:

```env
SUPABASE_URL=""
SUPABASE_KEY=""
RXNAV_URL_BASE_FOR_DRUG_NAME_TO_RXCUIS=""
GEMINI_API_KEY=""
```

These are used for:

- connecting to Supabase
- calling the RxNav drug lookup service
- calling Gemini for prior authorization letter generation

## How To Run The Project

Run the following from the `RxAssist/` directory unless noted otherwise.

### 1. Install backend dependencies

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 2. Create the environment file

Create a `.env` file in the project root and provide:

```env
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
RXNAV_URL_BASE_FOR_DRUG_NAME_TO_RXCUIS=your_rxnav_base_url
GEMINI_API_KEY=your_gemini_api_key
```

### 3. Start the FastAPI backend

```bash
uvicorn app.main:app --reload
```

The backend will run at:

- `http://127.0.0.1:8000`
- Swagger docs: `http://127.0.0.1:8000/docs`

### 4. Start the frontend

Open a second terminal, move into `Front_End/`, and run:

```bash
cd Front_End
npm install
npm run dev
```

The frontend code is configured to call the backend at `http://127.0.0.1:8000`, so the backend should be running before you use the UI.

### 5. Optional: work with the ETL notebook

If you want to inspect or rerun the data-loading flow, open:

```bash
ETL/parsing_data_to_db.ipynb
```

and use the same Python environment or a notebook environment with the required dependencies installed.
