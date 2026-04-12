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