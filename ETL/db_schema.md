# Supabase Table schema's

## 1. Formulary Table

CREATE TABLE formulary (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  formulary_id TEXT NOT NULL,
  formulary_version INTEGER,
  contract_year INTEGER,
  rxcui TEXT NOT NULL,
  ndc TEXT NOT NULL,
  tier_level_value INTEGER,
  quantity_limit_yn CHAR(1),
  quantity_limit_amount TEXT,
  quantity_limit_days TEXT,
  prior_authorization_yn CHAR(1),
  step_therapy_yn CHAR(1),
  selected_drug_yn CHAR(1),
  data_date DATE NOT NULL
);

CREATE INDEX idx_formulary_formulary_id ON formulary (formulary_id);
CREATE INDEX idx_formulary_rxcui ON formulary (rxcui);
CREATE INDEX idx_formulary_ndc ON formulary (ndc);
CREATE INDEX idx_formulary_data_date ON formulary (data_date);



## 2. Plans Table

CREATE TABLE plans (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  contract_id TEXT NOT NULL,
  plan_id TEXT NOT NULL,
  segment_id TEXT NOT NULL,
  contract_name TEXT,
  plan_name TEXT,
  formulary_id TEXT NOT NULL,
  premium NUMERIC(10, 2),
  deductible NUMERIC(10, 2),
  ma_region_code TEXT,
  pdp_region_code TEXT,
  state TEXT,
  county_code TEXT,
  snp TEXT,
  plan_suppressed_yn CHAR(1),
  data_date DATE NOT NULL
);

CREATE INDEX idx_plans_formulary_id ON plans (formulary_id);
CREATE INDEX idx_plans_contract_plan ON plans (contract_id, plan_id, segment_id);
CREATE INDEX idx_plans_state ON plans (state);
CREATE INDEX idx_plans_data_date ON plans (data_date);


## 3. Costs Table

CREATE TABLE costs (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  contract_id TEXT NOT NULL,
  plan_id TEXT NOT NULL,
  segment_id TEXT NOT NULL,
  coverage_level INTEGER,
  tier INTEGER NOT NULL,
  days_supply INTEGER,
  cost_type_pref INTEGER,
  cost_amt_pref NUMERIC(10, 2),
  cost_min_amt_pref NUMERIC(10, 2),
  cost_max_amt_pref NUMERIC(10, 2),
  cost_type_nonpref INTEGER,
  cost_amt_nonpref NUMERIC(10, 2),
  cost_min_amt_nonpref NUMERIC(10, 2),
  cost_max_amt_nonpref NUMERIC(10, 2),
  cost_type_mail_pref INTEGER,
  cost_amt_mail_pref NUMERIC(10, 2),
  cost_min_amt_mail_pref NUMERIC(10, 2),
  cost_max_amt_mail_pref NUMERIC(10, 2),
  cost_type_mail_nonpref INTEGER,
  cost_amt_mail_nonpref NUMERIC(10, 2),
  cost_min_amt_mail_nonpref NUMERIC(10, 2),
  cost_max_amt_mail_nonpref NUMERIC(10, 2),
  tier_specialty_yn CHAR(1),
  ded_applies_yn CHAR(1),
  data_date DATE NOT NULL
);

CREATE INDEX idx_costs_contract_plan ON costs (contract_id, plan_id, segment_id);
CREATE INDEX idx_costs_tier ON costs (tier);
CREATE INDEX idx_costs_data_date ON costs (data_date);


## 4. Dummy Patient Table
 
  CREATE TABLE patients (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    patient_name TEXT NOT NULL,
    contract_id TEXT NOT NULL,
    plan_id TEXT NOT NULL,
    segment_id TEXT NOT NULL,
    formulary_id TEXT NOT NULL,
    rxcuis TEXT[] NOT NULL,
    
    -- New EHR / Clinical Columns for Prior Auth
    primary_diagnosis_code TEXT,         -- ICD-10 code
    primary_diagnosis_desc TEXT,         -- Human readable diagnosis
    history_of_present_illness TEXT,     -- HPI clinical notes
    physical_exam_notes TEXT,            -- PE clinical notes
    previous_failed_therapies TEXT[],    -- For step-therapy requirements
    relevant_lab_results JSONB           -- Flexible storage for things like A1C, bone density, or genetic markers
  );


  INSERT INTO patients (
    patient_name,
    contract_id,
    plan_id,
    segment_id,
    formulary_id,
    rxcuis,
    primary_diagnosis_code,
    primary_diagnosis_desc,
    history_of_present_illness,
    physical_exam_notes,
    previous_failed_therapies,
    relevant_lab_results
  )
  VALUES
  (
    'John Doe',
    'H4739',
    '1',
    '0',
    '26321',
    ARRAY['1430453', '1592748', '644088'],
    'C34.90',
    'Malignant neoplasm of unspecified part of bronchus or lung, alongside Idiopathic Pulmonary Fibrosis (J84.112)',
    'Patient is a 68-year-old male with a complex dual diagnosis of metastatic non-small cell lung cancer (NSCLC) and progressive Idiopathic Pulmonary Fibrosis (IPF). Genomic profiling of the lung biopsy confirmed an EGFR Exon 19 deletion, making him a candidate for targeted therapy with afatinib (Gilotrif). Concurrently, his IPF has shown a progressive decline in forced vital capacity (FVC) over the last 12 months, warranting the initiation of nintedanib (Ofev) to slow pulmonary function decline. Patient has experienced severe, grade 3 refractory medication-induced nausea and vomiting (MINV) during previous therapy attempts, leading to a 10 lb weight loss and dehydration. He requires the addition of aprepitant to successfully tolerate his current oral oncolytic and fibrotic regimen.',
    'Vitals: BP 128/82, HR 88, RR 20, SpO2 91% on room air. General: Chronically ill-appearing, mildly cachectic, but in no acute distress. Respiratory: Bilateral fine end-inspiratory crackles (velcro-like) noted at the lung bases. Decreased breath sounds in the right upper lobe. Cardiovascular: Regular rate and rhythm. Extremities: 1+ pitting edema bilaterally, moderate digital clubbing present.',
    ARRAY['Erlotinib (intolerant due to Grade 3 skin rash)', 'Pirfenidone (discontinued due to severe GI intolerance and elevated LFTs)', 'Ondansetron 8mg (failed to control nausea)', 'Prochlorperazine (failed to control nausea)'],
    '{"EGFR_mutation_status": "Positive (Exon 19 deletion)", "FVC_percent_predicted": 62, "DLCO_percent_predicted": 55, "AST": "32 U/L", "ALT": "28 U/L", "Bilirubin": "0.8 mg/dL", "Recent_Weight_Loss_lbs": 10}'::jsonb
  ),
  (
    'Jane Smith',
    'H4739',
    '1',
    '0',
    '26321',
    ARRAY['644088', '1859000', '904932'],
    'E11.65',
    'Type 2 diabetes mellitus with hyperglycemia, and Postmenopausal Osteoporosis (M81.0)',
    'Patient is a 72-year-old female presenting for management of uncontrolled Type 2 Diabetes Mellitus and severe postmenopausal osteoporosis. Her diabetes has remained poorly controlled (most recent HbA1c 9.4%) despite maximization of oral therapies and a GLP-1 receptor agonist alone, necessitating a transition to a combination basal insulin/GLP-1 RA therapy via Soliqua pen injector. Furthermore, her recent DEXA scan revealed a T-score of -2.8 at the lumbar spine, indicating severe high-risk osteoporosis. She requires oral ibandronic acid (150mg monthly) to prevent fragility fractures. She has a documented history of severe medication-induced gastroparesis and nausea, requiring aprepitant for adequate symptom control to maintain oral intake and adherence to her osteoporosis regimen.',
    'Vitals: BP 138/86, HR 76, RR 16, BMI 32.4. General: Well-appearing, obese female. HEENT: Normocephalic, atraumatic. Respiratory: Clear to auscultation bilaterally. Neurological: Decreased monofilament sensation in bilateral plantar surfaces consistent with early diabetic peripheral neuropathy. Musculoskeletal: Mild dorsal kyphosis noted, no focal spinal tenderness. Normal gait.',
    ARRAY['Metformin 1000mg BID (inadequate glycemic control)', 'Glipizide 10mg (inadequate glycemic control)', 'Alendronate weekly (discontinued due to severe esophagitis and heartburn)', 'Promethazine (failed to control nausea)'],
    '{"HbA1c_percentage": 9.4, "Fasting_Plasma_Glucose_mg_dL": 198, "DEXA_T_Score_Lumbar_Spine": -2.8, "DEXA_T_Score_Total_Hip": -2.1, "Serum_Calcium_mg_dL": 9.2, "Vitamin_D_25_OH_ng_mL": 32}'::jsonb
  );