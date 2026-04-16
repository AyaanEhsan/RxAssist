import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import { Copy, Download, ShieldCheck, Check } from "lucide-react";
import {
  getPatient,
  getPlanDetails,
  draftPriorAuth,
  type FormularyEntry,
  type PriorAuthDraftRequest,
} from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  PageHeader,
  Section,
  InlineAlert,
  DraftSkeleton,
  DataRow,
  StatusPill,
  TierPill,
} from "@/components/clinical";

interface DraftNavState {
  rxcui?: string;
  drugName?: string;
  entry?: FormularyEntry;
}

export default function PatientDraft() {
  const { id } = useParams();
  const patientId = id ? Number(id) : undefined;
  const navigate = useNavigate();
  const location = useLocation();
  const navState = (location.state as DraftNavState) ?? {};
  const { provider } = useAuth();

  const { data: patient, isLoading: loadingPatient } = useQuery({
    queryKey: ["patient", patientId],
    queryFn: () => getPatient(patientId!),
    enabled: !!patientId,
  });

  const { data: plan } = useQuery({
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

  const [letter, setLetter] = useState<string | null>(null);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const ready = useMemo(
    () => !!patient && !!plan && !!navState.entry,
    [patient, plan, navState.entry]
  );

  const handleGenerate = async () => {
    if (!patient || !navState.entry) return;
    const entry = navState.entry;
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
      drug_name: navState.drugName ?? entry.rxcui,
      rxcui: entry.rxcui,
      ndc: entry.ndc,
      tier_level_value: entry.tier_level_value,
      prior_authorization_yn: entry.prior_authorization_yn,
      step_therapy_yn: entry.step_therapy_yn,
      quantity_limit_yn: entry.quantity_limit_yn,
      quantity_limit_amount: entry.quantity_limit_amount,
      quantity_limit_days: entry.quantity_limit_days,
    };

    setGenerating(true);
    setLetter(null);
    setDraftError(null);
    try {
      const res = await draftPriorAuth(body);
      setLetter(res.draft_letter);
    } catch (err) {
      setDraftError(
        err instanceof Error ? err.message : "Failed to generate draft letter."
      );
    } finally {
      setGenerating(false);
    }
  };

  /* Kick off generation as soon as all inputs are present. */
  const [autoStarted, setAutoStarted] = useState(false);
  useEffect(() => {
    if (ready && !autoStarted) {
      setAutoStarted(true);
      handleGenerate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, autoStarted]);

  const handleCopy = async () => {
    if (!letter) return;
    await navigator.clipboard.writeText(letter);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleDownload = () => {
    if (!letter || !patient) return;
    const blob = new Blob([letter], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `prior-auth-${sanitize(patient.patient_name)}-${navState.entry?.rxcui ?? "draft"}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  if (!navState.entry) {
    return (
      <div>
        <PageHeader
          eyebrow="Prior authorization"
          title="Draft prior authorization"
          backTo={
            patient
              ? { to: `/patients/${patient.id}/coverage`, label: "Back to coverage" }
              : { to: "/patients", label: "All patients" }
          }
        />
        <InlineAlert title="Select a medication first">
          Navigate back to the coverage page and choose a medication to draft a
          prior authorization letter.
        </InlineAlert>
        <div className="mt-4">
          <Button
            onClick={() =>
              patient
                ? navigate(`/patients/${patient.id}/coverage`)
                : navigate("/patients")
            }
          >
            Go to coverage
          </Button>
        </div>
      </div>
    );
  }

  const entry = navState.entry;

  return (
    <div>
      <PageHeader
        eyebrow="Prior authorization"
        title="Draft prior authorization"
        description={
          patient
            ? `For ${patient.patient_name} · ${navState.drugName ?? entry.rxcui}`
            : undefined
        }
        backTo={
          patient
            ? {
                to: `/patients/${patient.id}/coverage`,
                label: "Back to coverage",
              }
            : { to: "/patients", label: "All patients" }
        }
      />

      {/* Request summary */}
      <Section label="Request summary">
        <dl className="rounded-md border border-border bg-surface px-5">
          <DataRow
            label="Patient"
            value={loadingPatient ? "…" : patient?.patient_name}
          />
          <DataRow
            label="Medication"
            value={navState.drugName ?? entry.rxcui}
          />
          <DataRow label="RxCUI" mono value={entry.rxcui} />
          <DataRow label="NDC" mono value={entry.ndc} />
          <DataRow
            label="Tier"
            value={<TierPill tier={entry.tier_level_value ?? null} />}
          />
          <DataRow
            label="Payer"
            value={
              plan?.plan_name
                ? `${plan.contract_name ?? ""} · ${plan.plan_name}`
                : undefined
            }
          />
          <DataRow
            label="Restrictions"
            value={
              <div className="flex flex-wrap justify-end gap-1.5">
                {entry.prior_authorization_yn === "Y" ? (
                  <StatusPill tone="warning">PA required</StatusPill>
                ) : null}
                {entry.step_therapy_yn === "Y" ? (
                  <StatusPill tone="warning">Step therapy</StatusPill>
                ) : null}
                {entry.quantity_limit_yn === "Y" ? (
                  <StatusPill tone="neutral">
                    QL {entry.quantity_limit_amount}/{entry.quantity_limit_days}d
                  </StatusPill>
                ) : null}
                {entry.prior_authorization_yn !== "Y" &&
                entry.step_therapy_yn !== "Y" &&
                entry.quantity_limit_yn !== "Y" ? (
                  <span className="text-sm text-muted-foreground">None</span>
                ) : null}
              </div>
            }
          />
        </dl>
      </Section>

      {/* PII masking status */}
      <p className="mb-3 flex items-center gap-1.5 text-xs text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5" />
        Patient identifiers were masked before processing.
      </p>

      {/* Draft output */}
      <Section label="Draft letter">
        {draftError ? (
          <InlineAlert title="Draft generation failed">
            {draftError}
          </InlineAlert>
        ) : null}

        {generating ? (
          <DraftSkeleton />
        ) : letter ? (
          <div className="rounded-md border border-border bg-surface px-6 py-6">
            <article className="prose prose-sm max-w-none text-foreground prose-headings:text-foreground prose-headings:font-semibold prose-headings:tracking-tight prose-p:leading-relaxed prose-strong:text-foreground prose-a:text-primary">
              <ReactMarkdown>{letter}</ReactMarkdown>
            </article>
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-border bg-surface px-6 py-10 text-center">
            <p className="text-sm text-muted-foreground">
              {ready
                ? "Preparing to generate draft…"
                : "Waiting for patient and plan details…"}
            </p>
          </div>
        )}
      </Section>

      {/* Actions */}
      {letter ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
          <Button
            variant="ghost"
            onClick={() => {
              setLetter(null);
              setAutoStarted(false);
            }}
            disabled={generating}
          >
            Regenerate
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleCopy}>
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy to clipboard
                </>
              )}
            </Button>
            <Button variant="outline" onClick={handleDownload}>
              <Download className="h-4 w-4" />
              Download .txt
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function sanitize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
