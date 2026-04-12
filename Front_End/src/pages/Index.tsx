import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Search, User, FileText, Pill, ShieldCheck, AlertTriangle, CheckCircle, Loader2 } from "lucide-react";
import {
  getPatients,
  getPatient,
  getPlanDetails,
  getDrugLookup,
  getFormularyCoverage,
  type PatientDetail,
  type PlanDetails,
  type DrugRxcuiResult,
  type DrugLookupResponse,
  type FormularyEntry,
} from "@/lib/api";

export default function Index() {
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [drugSearch, setDrugSearch] = useState("");
  const [submittedDrug, setSubmittedDrug] = useState<string | null>(null);
  const [selectedRxcui, setSelectedRxcui] = useState<string | null>(null);

  // Step 1: Load patients
  const { data: patients, isLoading: loadingPatients } = useQuery({
    queryKey: ["patients"],
    queryFn: getPatients,
  });

  // Step 2: Fetch patient detail
  const { data: patient, isLoading: loadingPatient } = useQuery({
    queryKey: ["patient", selectedPatientId],
    queryFn: () => getPatient(selectedPatientId!),
    enabled: !!selectedPatientId,
  });

  // Step 3: Fetch plan details
  const { data: plan, isLoading: loadingPlan } = useQuery({
    queryKey: ["plan", patient?.contract_id, patient?.plan_id, patient?.segment_id, patient?.formulary_id],
    queryFn: () =>
      getPlanDetails(patient!.contract_id, patient!.plan_id, patient!.segment_id, patient!.formulary_id),
    enabled: !!patient,
  });

  // Step 4: Search drug via formulary-aware lookup
  const { data: drugLookup, isLoading: loadingRxcuis } = useQuery({
    queryKey: ["drugLookup", patient?.formulary_id, submittedDrug],
    queryFn: () => getDrugLookup(patient!.formulary_id, submittedDrug!),
    enabled: !!submittedDrug && !!patient?.formulary_id,
  });

  const rxcuiOptions = drugLookup?.covered_results;

  // Step 5: Formulary check
  const { data: formularyResults, isLoading: loadingFormulary, isError: formularyError } = useQuery({
    queryKey: ["formulary", patient?.formulary_id, selectedRxcui],
    queryFn: () => getFormularyCoverage(patient!.formulary_id, selectedRxcui!),
    enabled: !!patient?.formulary_id && !!selectedRxcui,
    retry: false,
  });

  const handleDrugSearch = () => {
    const trimmed = drugSearch.trim();
    if (!trimmed) return;
    setSubmittedDrug(trimmed);
    setSelectedRxcui(null);
  };

  const handleSelectRxcui = (rxcui: string) => {
    setSelectedRxcui(rxcui);
  };

  const handlePatientChange = (value: string) => {
    setSelectedPatientId(Number(value));
    setSubmittedDrug(null);
    setDrugSearch("");
    setSelectedRxcui(null);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card px-6 py-4">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-7 w-7 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">RxAssist</h1>
          <span className="text-sm text-muted-foreground">Provider Dashboard</span>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6 max-w-7xl mx-auto">
        {/* ─── LEFT PANEL: Patient & Plan ─── */}
        <div className="space-y-6">
          {/* Patient Selector */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="h-5 w-5 text-primary" />
                Select Patient
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select onValueChange={handlePatientChange}>
                <SelectTrigger>
                  <SelectValue placeholder={loadingPatients ? "Loading patients..." : "Choose a patient"} />
                </SelectTrigger>
                <SelectContent>
                  {patients?.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.patient_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Patient Details */}
          {loadingPatient && (
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </CardContent>
            </Card>
          )}

          {patient && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileText className="h-5 w-5 text-primary" />
                  Patient Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <InfoRow label="Name" value={patient.patient_name} />
                <InfoRow label="Diagnosis" value={patient.primary_diagnosis_desc || "N/A"} />
                <InfoRow label="Diagnosis Code" value={patient.primary_diagnosis_code || "N/A"} />
                <InfoRow label="Formulary ID" value={patient.formulary_id} />
                <InfoRow label="Contract / Plan / Segment" value={`${patient.contract_id} / ${patient.plan_id} / ${patient.segment_id}`} />
                {patient.history_of_present_illness && (
                  <>
                    <Separator />
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">History of Present Illness</span>
                      <p className="text-sm mt-1">{patient.history_of_present_illness}</p>
                    </div>
                  </>
                )}
                {patient.previous_failed_therapies && patient.previous_failed_therapies.length > 0 && (
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Failed Therapies</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {patient.previous_failed_therapies.map((t) => (
                        <Badge key={t} variant="secondary">{t}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Plan Details */}
          {loadingPlan && patient && (
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </CardContent>
            </Card>
          )}

          {plan && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  Plan Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <InfoRow label="Contract" value={plan.contract_name || "N/A"} />
                <InfoRow label="Plan Name" value={plan.plan_name || "N/A"} />
                <InfoRow label="State" value={plan.state || "N/A"} />
                <InfoRow label="Premium" value={plan.premium != null ? `$${plan.premium.toFixed(2)}` : "N/A"} />
                <InfoRow label="Deductible" value={plan.deductible != null ? `$${plan.deductible.toFixed(2)}` : "N/A"} />
              </CardContent>
            </Card>
          )}
        </div>

        {/* ─── RIGHT PANEL: Drug Search & Formulary ─── */}
        <div className="space-y-6">
          {/* Drug Search */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Pill className="h-5 w-5 text-primary" />
                Drug Search
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Type a drug name (e.g. afatinib)..."
                    className="pl-9"
                    value={drugSearch}
                    onChange={(e) => {
                      setDrugSearch(e.target.value);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleDrugSearch();
                    }}
                    disabled={!patient}
                  />
                </div>
                <Button
                  onClick={handleDrugSearch}
                  disabled={!patient || !drugSearch.trim()}
                >
                  Search
                </Button>
              </div>

              {!patient && (
                <p className="text-sm text-muted-foreground">Select a patient first to search drugs.</p>
              )}
            </CardContent>
          </Card>

          {/* RxCUI Options */}
          {loadingRxcuis && (
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </CardContent>
            </Card>
          )}

          {rxcuiOptions && rxcuiOptions.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Select Medication Option</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {rxcuiOptions.map((opt) => (
                    <button
                      key={opt.rxcui}
                      onClick={() => handleSelectRxcui(opt.rxcui)}
                      className={`w-full text-left border rounded-md p-3 transition-colors ${
                        selectedRxcui === opt.rxcui
                          ? "border-primary bg-primary/5"
                          : "hover:bg-muted"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{opt.name}</span>
                        <Badge variant={opt.status === "active" ? "default" : "secondary"}>
                          {opt.status}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        RxCUI: {opt.rxcui}
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Formulary Results */}
          {loadingFormulary && (
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </CardContent>
            </Card>
          )}

          {formularyResults && formularyResults.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  Formulary Coverage
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {formularyResults.map((entry, i) => (
                  <div key={i} className="border rounded-md p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">NDC: {entry.ndc}</span>
                      <Badge variant="secondary">Tier {entry.tier_level_value ?? "N/A"}</Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <StatusBadge
                        label="Prior Auth"
                        value={entry.prior_authorization_yn}
                      />
                      <StatusBadge
                        label="Step Therapy"
                        value={entry.step_therapy_yn}
                      />
                      <StatusBadge
                        label="Qty Limit"
                        value={entry.quantity_limit_yn}
                      />
                      {entry.quantity_limit_yn === "Y" && (
                        <div className="text-xs text-muted-foreground">
                          {entry.quantity_limit_amount} units / {entry.quantity_limit_days} days
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {(formularyError || (formularyResults && formularyResults.length === 0)) && (
            <Card>
              <CardContent className="flex items-center gap-2 py-6 text-muted-foreground">
                <AlertTriangle className="h-5 w-5" />
                No formulary coverage found for this drug and plan.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right max-w-[60%]">{value}</span>
    </div>
  );
}

function StatusBadge({ label, value }: { label: string; value?: string }) {
  const isYes = value === "Y";
  return (
    <div className="flex items-center gap-1.5 text-sm">
      {isYes ? (
        <AlertTriangle className="h-4 w-4 text-destructive" />
      ) : (
        <CheckCircle className="h-4 w-4 text-primary" />
      )}
      <span>
        {label}: <span className="font-medium">{isYes ? "Required" : "No"}</span>
      </span>
    </div>
  );
}
