import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Search, User, FileText, Pill, ShieldCheck, AlertTriangle, CheckCircle, Loader2, LogOut, Mail } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  getPatients,
  getPatient,
  getPlanDetails,
  getDrugLookup,
  getFormularyCoverage,
  draftPriorAuth,
  type PatientDetail,
  type PlanDetails,
  type DrugRxcuiResult,
  type DrugLookupResponse,
  type FormularyEntry,
  type PriorAuthDraftRequest,
} from "@/lib/api";

export default function Index() {
  const { provider, logout } = useAuth();
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [drugSearch, setDrugSearch] = useState("");
  const [submittedDrug, setSubmittedDrug] = useState<string | null>(null);
  const [selectedRxcui, setSelectedRxcui] = useState<string | null>(null);
  const [priorAuthDialogOpen, setPriorAuthDialogOpen] = useState(false);
  const [pendingEntry, setPendingEntry] = useState<FormularyEntry | null>(null);

  const [draftLoading, setDraftLoading] = useState(false);
  const [draftLetter, setDraftLetter] = useState<string | null>(null);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [letterDialogOpen, setLetterDialogOpen] = useState(false);
  const [sentDialogOpen, setSentDialogOpen] = useState(false);
  const [sentDetails, setSentDetails] = useState<{
    patientName: string;
    planName: string;
    drugName: string;
    rxcui: string;
  } | null>(null);

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

  const handleFormularyCardClick = (entry: FormularyEntry) => {
    if (entry.prior_authorization_yn === "Y") {
      setPendingEntry(entry);
      setPriorAuthDialogOpen(true);
    } else {
      // TODO: navigate or take action for non-PA entries
    }
  };

  const handleConfirmPriorAuth = async () => {
    if (!patient || !pendingEntry) return;

    const selectedDrugOption = rxcuiOptions?.find(
      (opt) => opt.rxcui === pendingEntry.rxcui
    );
    const drugName = selectedDrugOption?.name ?? submittedDrug ?? "Unknown";

    const body: PriorAuthDraftRequest = {
      physician_name: provider?.physicianName ?? "",
      practice_name: provider?.practiceName ?? "",

      patient_name: patient.patient_name,
      primary_diagnosis_code: patient.primary_diagnosis_code,
      primary_diagnosis_desc: patient.primary_diagnosis_desc,
      history_of_present_illness: patient.history_of_present_illness,
      physical_exam_notes: patient.physical_exam_notes,
      previous_failed_therapies: patient.previous_failed_therapies,
      relevant_lab_results: patient.relevant_lab_results,

      contract_id: patient.contract_id,
      plan_id: patient.plan_id,
      segment_id: patient.segment_id,
      formulary_id: patient.formulary_id,
      contract_name: plan?.contract_name,
      plan_name: plan?.plan_name,
      state: plan?.state,

      drug_name: drugName,
      rxcui: pendingEntry.rxcui,
      ndc: pendingEntry.ndc,
      tier_level_value: pendingEntry.tier_level_value,

      prior_authorization_yn: pendingEntry.prior_authorization_yn,
      step_therapy_yn: pendingEntry.step_therapy_yn,
      quantity_limit_yn: pendingEntry.quantity_limit_yn,
      quantity_limit_amount: pendingEntry.quantity_limit_amount,
      quantity_limit_days: pendingEntry.quantity_limit_days,
    };

    setPriorAuthDialogOpen(false);
    setPendingEntry(null);
    setDraftLoading(true);
    setDraftLetter(null);
    setDraftError(null);
    setLetterDialogOpen(true);

    try {
      const result = await draftPriorAuth(body);
      setDraftLetter(result.draft_letter);
    } catch (err) {
      setDraftError(err instanceof Error ? err.message : "Failed to generate PA letter.");
    } finally {
      setDraftLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-7 w-7 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">RxAssist</h1>
            <span className="text-sm text-muted-foreground">Provider Dashboard</span>
          </div>
          {provider && (
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium">{provider.physicianName}</p>
                <p className="text-xs text-muted-foreground">{provider.practiceName}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={logout} title="Sign out">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          )}
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
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleFormularyCardClick(entry)}
                    className="w-full text-left border rounded-lg p-4 space-y-4 transition-all hover:border-primary hover:shadow-md hover:bg-primary/5 cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <span className="text-sm font-semibold">NDC: {entry.ndc}</span>
                        <div className="text-xs text-muted-foreground">
                          RxCUI: {entry.rxcui} &middot; Version: {entry.formulary_version ?? "N/A"}
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-sm px-3 py-1">
                        Tier {entry.tier_level_value ?? "N/A"}
                      </Badge>
                    </div>

                    <Separator />

                    <div className="grid grid-cols-2 gap-x-6 gap-y-2">
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
                        <div className="flex items-center text-sm text-muted-foreground">
                          {entry.quantity_limit_amount} units / {entry.quantity_limit_days} days
                        </div>
                      )}
                    </div>

                    {entry.prior_authorization_yn === "Y" && (
                      <div className="flex items-center gap-1.5 text-xs text-destructive pt-1">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Click to initiate Prior Authorization
                      </div>
                    )}
                  </button>
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

      <AlertDialog open={priorAuthDialogOpen} onOpenChange={setPriorAuthDialogOpen}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Prior Authorization Required</AlertDialogTitle>
            <AlertDialogDescription>
              Would you like me to draft a personalized Prior Auth Form — based on patient history?
            </AlertDialogDescription>
          </AlertDialogHeader>
          {pendingEntry && (
            <div className="rounded-md border p-4 space-y-2 text-sm">
              <DetailRow label="Formulary ID" value={pendingEntry.formulary_id} />
              <DetailRow label="RxCUI" value={pendingEntry.rxcui} />
              <DetailRow label="NDC" value={pendingEntry.ndc} />
              <DetailRow label="Formulary Version" value={pendingEntry.formulary_version != null ? String(pendingEntry.formulary_version) : "N/A"} />
              <Separator />
              <DetailRow label="Tier Level" value={pendingEntry.tier_level_value != null ? String(pendingEntry.tier_level_value) : "N/A"} />
              <DetailRow label="Prior Authorization" value={pendingEntry.prior_authorization_yn === "Y" ? "Required" : "No"} highlight={pendingEntry.prior_authorization_yn === "Y"} />
              <DetailRow label="Step Therapy" value={pendingEntry.step_therapy_yn === "Y" ? "Required" : "No"} highlight={pendingEntry.step_therapy_yn === "Y"} />
              <DetailRow label="Quantity Limit" value={pendingEntry.quantity_limit_yn === "Y" ? "Required" : "No"} highlight={pendingEntry.quantity_limit_yn === "Y"} />
              {pendingEntry.quantity_limit_yn === "Y" && (
                <DetailRow label="Qty Allowance" value={`${pendingEntry.quantity_limit_amount ?? "—"} units / ${pendingEntry.quantity_limit_days ?? "—"} days`} />
              )}
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingEntry(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmPriorAuth}>
              Yes, Draft PA Form
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={letterDialogOpen} onOpenChange={setLetterDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Prior Authorization Draft Letter
            </DialogTitle>
          </DialogHeader>

          {draftLoading && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                Generating Prior Authorization letter...
              </p>
            </div>
          )}

          {draftError && (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-destructive">
              <AlertTriangle className="h-8 w-8" />
              <p className="text-sm font-medium">{draftError}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLetterDialogOpen(false)}
              >
                Close
              </Button>
            </div>
          )}

          {draftLetter && (
            <>
              <div className="overflow-y-auto max-h-[calc(90vh-12rem)] rounded-md border p-6">
                <article className="prose prose-sm max-w-none dark:prose-invert">
                  <ReactMarkdown>{draftLetter}</ReactMarkdown>
                </article>
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(draftLetter);
                  }}
                >
                  Copy to Clipboard
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    const selectedDrugOpt = rxcuiOptions?.find(
                      (o) => o.rxcui === selectedRxcui
                    );
                    setSentDetails({
                      patientName: patient?.patient_name ?? "N/A",
                      planName: plan?.plan_name ?? "N/A",
                      drugName: selectedDrugOpt?.name ?? submittedDrug ?? "N/A",
                      rxcui: selectedRxcui ?? "N/A",
                    });
                    setLetterDialogOpen(false);
                    setSentDialogOpen(true);
                  }}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Send Email for PA
                </Button>
                <Button onClick={() => setLetterDialogOpen(false)}>
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── PA Sent Confirmation Dialog ─── */}
      <Dialog open={sentDialogOpen} onOpenChange={setSentDialogOpen}>
        <DialogContent className="max-w-md">
          <div className="flex flex-col items-center text-center gap-4 py-4">
            <div className="flex items-center justify-center h-14 w-14 rounded-full bg-green-100 dark:bg-green-900/30">
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>

            <div className="space-y-1">
              <h2 className="text-xl font-semibold tracking-tight">
                Prior Authorization Sent
              </h2>
              <p className="text-sm text-muted-foreground">
                The PA request has been submitted to the insurance plan for review.
              </p>
            </div>

            <div className="w-full rounded-lg border bg-muted/40 p-4 text-left space-y-2.5 text-sm">
              {sentDetails && (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Patient</span>
                    <span className="font-medium">{sentDetails.patientName}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Plan</span>
                    <span className="font-medium text-right max-w-[60%]">{sentDetails.planName}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Drug</span>
                    <span className="font-medium text-right max-w-[60%]">{sentDetails.drugName}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">RxCUI</span>
                    <span className="font-medium">{sentDetails.rxcui}</span>
                  </div>
                  <Separator />
                </>
              )}
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Status</span>
                <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800">
                  Pending Review
                </Badge>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              You will be notified once the insurance provider responds. Typical turnaround is 2–5 business days.
            </p>
          </div>

          <DialogFooter>
            <Button className="w-full" onClick={() => setSentDialogOpen(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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

function DetailRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-medium ${highlight ? "text-destructive" : ""}`}>{value}</span>
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
