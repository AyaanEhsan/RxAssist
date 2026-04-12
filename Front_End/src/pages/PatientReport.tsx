import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Loader2,
  FileText,
  ShieldCheck,
  ArrowLeft,
  ArrowRight,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import {
  getPatients,
  getPatient,
  getPlanDetails,
  checkForUpdates,
  type TierCheckRow,
} from "@/lib/api";

export default function PatientReport() {
  const navigate = useNavigate();
  const patientName = sessionStorage.getItem("rxassist_patient");

  useEffect(() => {
    if (!patientName) navigate("/patients");
  }, [patientName, navigate]);

  const { data: patients, isLoading: loadingPatients } = useQuery({
    queryKey: ["patients"],
    queryFn: getPatients,
    enabled: !!patientName,
  });

  const matchedPatient = patients?.find(
    (p) => p.patient_name.toLowerCase() === patientName?.toLowerCase()
  );

  const { data: patient, isLoading: loadingPatient } = useQuery({
    queryKey: ["patient", matchedPatient?.id],
    queryFn: () => getPatient(matchedPatient!.id),
    enabled: !!matchedPatient,
  });

  const { data: plan, isLoading: loadingPlan } = useQuery({
    queryKey: [
      "plan",
      patient?.contract_id,
      patient?.plan_id,
      patient?.segment_id,
      patient?.formulary_id,
    ],
    queryFn: () =>
      getPlanDetails(
        patient!.contract_id,
        patient!.plan_id,
        patient!.segment_id,
        patient!.formulary_id
      ),
    enabled: !!patient,
  });

  const isLoading = loadingPatients || loadingPatient || loadingPlan;

  if (!patientName) return null;

  const handleContinue = () => {
    if (matchedPatient) {
      navigate("/", { state: { selectedPatientId: matchedPatient.id } });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      <header className="border-b bg-card px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-7 w-7 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">RxAssist</h1>
            <span className="text-sm text-muted-foreground">Patient Report</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate("/patients")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
      </header>

      {isLoading && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading patient report...</p>
        </div>
      )}

      {!isLoading && !matchedPatient && (
        <div className="max-w-3xl mx-auto p-6">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
              <p className="text-muted-foreground">
                No patient found matching "<span className="font-medium text-foreground">{patientName}</span>"
              </p>
              <Button variant="outline" onClick={() => navigate("/patients")}>
                Go Back
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {!isLoading && patient && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6 max-w-7xl mx-auto">
          {/* ─── LEFT PANEL: Patient & Plan ─── */}
          <div className="space-y-6">
            <Card className="shadow-lg border-0 ring-1 ring-border/50">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileText className="h-5 w-5 text-primary" />
                  Patient Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <ReportRow label="Name" value={patient.patient_name} />
                <ReportRow
                  label="Diagnosis"
                  value={
                    [patient.primary_diagnosis_desc, patient.primary_diagnosis_code ? `(${patient.primary_diagnosis_code})` : ""]
                      .filter(Boolean)
                      .join(" ") || "N/A"
                  }
                />
                <ReportRow label="Diagnosis Code" value={patient.primary_diagnosis_code || "N/A"} />
                <ReportRow label="Formulary ID" value={patient.formulary_id} />
                <ReportRow
                  label="Contract / Plan / Segment"
                  value={`${patient.contract_id} / ${patient.plan_id} / ${patient.segment_id}`}
                />

                {patient.history_of_present_illness && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="text-sm font-semibold text-muted-foreground mb-2">
                        History of Present Illness
                      </h3>
                      <p className="text-sm leading-relaxed">
                        {patient.history_of_present_illness}
                      </p>
                    </div>
                  </>
                )}

                {patient.previous_failed_therapies &&
                  patient.previous_failed_therapies.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <h3 className="text-sm font-semibold text-muted-foreground mb-2">
                          Failed Therapies
                        </h3>
                        <div className="flex flex-col gap-2">
                          {patient.previous_failed_therapies.map((t) => (
                            <Badge
                              key={t}
                              variant="outline"
                              className="w-fit text-sm py-1.5 px-3 border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-300"
                            >
                              {t}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
              </CardContent>
            </Card>

            {plan && (
              <Card className="shadow-lg border-0 ring-1 ring-border/50">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <ShieldCheck className="h-5 w-5 text-primary" />
                    Plan Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ReportRow label="Contract" value={plan.contract_name || "N/A"} />
                  <ReportRow label="Plan Name" value={plan.plan_name || "N/A"} />
                  <ReportRow label="State" value={plan.state || "N/A"} />
                  <ReportRow
                    label="Premium"
                    value={plan.premium != null ? `$${plan.premium.toFixed(2)}` : "N/A"}
                  />
                  <ReportRow
                    label="Deductible"
                    value={plan.deductible != null ? `$${plan.deductible.toFixed(2)}` : "N/A"}
                  />
                </CardContent>
              </Card>
            )}

            <div className="flex justify-end">
              <Button size="lg" onClick={handleContinue}>
                Continue to Dashboard
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>

          {/* ─── RIGHT PANEL: Formulary Tier Check ─── */}
          <div className="space-y-6">
            <TierCheckPanel
              formularyId={patient.formulary_id}
              rxcuis={patient.rxcuis}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function TierCheckPanel({
  formularyId,
  rxcuis,
}: {
  formularyId: string;
  rxcuis: string[];
}) {
  const [formFormularyId, setFormFormularyId] = useState(formularyId);
  const [formRxcuis, setFormRxcuis] = useState(rxcuis.join(", "));
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [results, setResults] = useState<TierCheckRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setFormFormularyId(formularyId);
    setFormRxcuis(rxcuis.join(", "));
  }, [formularyId, rxcuis]);

  const handleSubmit = async () => {
    setError(null);
    setResults(null);

    const parsedRxcuis = formRxcuis
      .split(/[\s,]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    if (!formFormularyId.trim() || parsedRxcuis.length === 0) {
      setError("Formulary ID and at least one RxCUI are required.");
      return;
    }
    if (!dateStart || !dateEnd) {
      setError("Both start and end dates are required.");
      return;
    }

    setLoading(true);
    try {
      const data = await checkForUpdates({
        formulary_ids: [formFormularyId.trim()],
        rxcuis: parsedRxcuis,
        data_date_start: dateStart,
        data_date_end: dateEnd,
      });
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Card className="shadow-lg border-0 ring-1 ring-border/50">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <RefreshCw className="h-5 w-5 text-primary" />
            Formulary Tier Check
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Check for tier changes across a date range for the patient's formulary and RxCUIs.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1.5 block">
              Formulary ID
            </label>
            <Input
              value={formFormularyId}
              onChange={(e) => setFormFormularyId(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1.5 block">
                Start Date
              </label>
              <Input
                type="date"
                value={dateStart}
                onChange={(e) => setDateStart(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1.5 block">
                End Date
              </label>
              <Input
                type="date"
                value={dateEnd}
                onChange={(e) => setDateEnd(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1.5 block">
              RxCUIs{" "}
              <span className="font-normal opacity-75">(comma or newline separated)</span>
            </label>
            <Textarea
              value={formRxcuis}
              onChange={(e) => setFormRxcuis(e.target.value)}
              className="font-mono text-sm min-h-[5rem]"
              spellCheck={false}
            />
          </div>

          <Button onClick={handleSubmit} disabled={loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Checking...
              </>
            ) : (
              "Send Request"
            )}
          </Button>

          {error && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span className="whitespace-pre-wrap break-words">{error}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {results && results.length > 0 && (
        <Card className="shadow-lg border-0 ring-1 ring-border/50">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {Object.keys(results[0]).map((key) => (
                      <TableHead key={key} className="text-xs uppercase tracking-wide whitespace-nowrap">
                        {key}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((row, i) => (
                    <TableRow key={i}>
                      {Object.entries(row).map(([key, value]) => (
                        <TableCell key={key} className={key === "ndc" ? "font-mono text-xs" : "text-sm"}>
                          {key === "has_tier_changed" ? (
                            <Badge
                              variant="outline"
                              className={
                                value
                                  ? "border-destructive/40 bg-destructive/10 text-destructive"
                                  : "border-primary/40 bg-primary/10 text-primary"
                              }
                            >
                              {value ? "Yes" : "No"}
                            </Badge>
                          ) : (
                            String(value ?? "")
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {results && results.length === 0 && (
        <Card className="shadow-lg border-0 ring-1 ring-border/50">
          <CardContent className="flex items-center gap-2 py-6 text-muted-foreground">
            <AlertTriangle className="h-5 w-5" />
            No tier changes found for the given parameters.
          </CardContent>
        </Card>
      )}

      {results && (
        <Card className="shadow-lg border-0 ring-1 ring-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Raw JSON</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="rounded-md border bg-muted/30 p-4 font-mono text-xs leading-relaxed overflow-auto max-h-[320px] whitespace-pre-wrap break-words">
              {JSON.stringify(results, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </>
  );
}

function ReportRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-start text-sm gap-4">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}
