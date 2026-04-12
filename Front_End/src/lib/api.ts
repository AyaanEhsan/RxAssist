const BASE_URL = "http://127.0.0.1:8000";

export interface PatientSummary {
  id: number;
  patient_name: string;
}

export interface PatientDetail {
  id: number;
  patient_name: string;
  contract_id: string;
  plan_id: string;
  segment_id: string;
  formulary_id: string;
  rxcuis: string[];
  primary_diagnosis_code?: string;
  primary_diagnosis_desc?: string;
  history_of_present_illness?: string;
  physical_exam_notes?: string;
  previous_failed_therapies?: string[];
  relevant_lab_results?: Record<string, unknown>;
}

export interface PlanDetails {
  contract_name?: string;
  plan_name?: string;
  premium?: number;
  deductible?: number;
  state?: string;
  plan_suppressed_yn?: string;
}

export interface DrugRxcuiResult {
  rxcui: string;
  name: string;
  synonym: string;
  status: string;
}

export interface FormularyEntry {
  formulary_id: string;
  rxcui: string;
  ndc: string;
  formulary_version?: number;
  tier_level_value?: number;
  quantity_limit_yn?: string;
  quantity_limit_amount?: string;
  quantity_limit_days?: string;
  prior_authorization_yn?: string;
  step_therapy_yn?: string;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function getPatients(): Promise<PatientSummary[]> {
  const data = await fetchJson<{ patients: PatientSummary[] }>(`${BASE_URL}/patients`);
  return data.patients;
}

export async function getPatient(id: number): Promise<PatientDetail> {
  return fetchJson<PatientDetail>(`${BASE_URL}/patients/${id}`);
}

export async function getPlanDetails(
  contract_id: string,
  plan_id: string,
  segment_id: string,
  formulary_id: string
): Promise<PlanDetails> {
  const params = new URLSearchParams({ contract_id, plan_id, segment_id, formulary_id });
  return fetchJson<PlanDetails>(`${BASE_URL}/plans?${params}`);
}

export interface DrugLookupResponse {
  drug: string;
  formulary_id: string;
  covered_results: DrugRxcuiResult[];
  total_rxcuis_found: number;
  covered_count: number;
}

export async function getDrugLookup(
  formularyId: string,
  drugName: string
): Promise<DrugLookupResponse> {
  return fetchJson<DrugLookupResponse>(
    `${BASE_URL}/formulary/${encodeURIComponent(formularyId)}/drug-lookup/${encodeURIComponent(drugName)}`
  );
}

export async function getFormularyCoverage(
  formulary_id: string,
  rxcui: string
): Promise<FormularyEntry[]> {
  const params = new URLSearchParams({ formulary_id, rxcui });
  return fetchJson<FormularyEntry[]>(`${BASE_URL}/formulary_for_provider?${params}`);
}

export interface PriorAuthDraftRequest {
  physician_name: string;
  practice_name: string;

  patient_name: string;
  primary_diagnosis_code?: string;
  primary_diagnosis_desc?: string;
  history_of_present_illness?: string;
  physical_exam_notes?: string;
  previous_failed_therapies?: string[];
  relevant_lab_results?: Record<string, unknown>;

  contract_id: string;
  plan_id: string;
  segment_id: string;
  formulary_id: string;
  contract_name?: string;
  plan_name?: string;
  state?: string;

  drug_name: string;
  rxcui: string;
  ndc?: string;
  tier_level_value?: number;

  prior_authorization_yn?: string;
  step_therapy_yn?: string;
  quantity_limit_yn?: string;
  quantity_limit_amount?: string;
  quantity_limit_days?: string;
}

export interface PriorAuthDraftResponse {
  status: string;
  draft_letter: string;
  payload: Record<string, unknown>;
}

export async function draftPriorAuth(
  body: PriorAuthDraftRequest
): Promise<PriorAuthDraftResponse> {
  const res = await fetch(`${BASE_URL}/prior-auth/draft`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}
