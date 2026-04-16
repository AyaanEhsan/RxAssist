import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { FileText, Pill } from "lucide-react";
import { getPatient, getPlanDetails } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  PageHeader,
  Section,
  DataRow,
  InlineAlert,
  SkeletonLine,
  StatusPill,
} from "@/components/clinical";

export default function PatientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const patientId = id ? Number(id) : undefined;

  const {
    data: patient,
    isLoading: loadingPatient,
    isError: patientError,
    error: patientErrObj,
  } = useQuery({
    queryKey: ["patient", patientId],
    queryFn: () => getPatient(patientId!),
    enabled: !!patientId,
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

  if (patientError) {
    return (
      <div>
        <PageHeader
          title="Patient"
          backTo={{ to: "/patients", label: "All patients" }}
        />
        <InlineAlert title="Unable to load patient">
          {patientErrObj instanceof Error
            ? patientErrObj.message
            : "Please try again."}
        </InlineAlert>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow="Patient record"
        title={loadingPatient ? "Loading…" : patient?.patient_name ?? "Patient"}
        description={
          loadingPatient
            ? "Retrieving demographics and plan details."
            : patient?.primary_diagnosis_desc
              ? `${patient.primary_diagnosis_desc}${
                  patient.primary_diagnosis_code
                    ? ` · ${patient.primary_diagnosis_code}`
                    : ""
                }`
              : undefined
        }
        backTo={{ to: "/patients", label: "All patients" }}
        actions={
          patient ? (
            <Button
              onClick={() => navigate(`/patients/${patient.id}/coverage`)}
            >
              Check coverage
            </Button>
          ) : null
        }
      />

      {/* Demographics */}
      <Section label="Demographics">
        <dl className="rounded-md border border-border bg-surface px-5">
          <DataRow
            label="Name"
            value={loadingPatient ? <SkeletonLine width="40%" /> : patient?.patient_name}
          />
          <DataRow
            label="Primary diagnosis"
            value={
              loadingPatient ? (
                <SkeletonLine width="70%" />
              ) : patient?.primary_diagnosis_desc ? (
                patient.primary_diagnosis_desc
              ) : null
            }
          />
          <DataRow
            label="Diagnosis code"
            mono
            value={
              loadingPatient ? (
                <SkeletonLine width="30%" />
              ) : (
                patient?.primary_diagnosis_code
              )
            }
          />
        </dl>
      </Section>

      {/* Plan */}
      <Section
        label="Plan & formulary"
        description={
          patient && plan?.state ? `Jurisdiction: ${plan.state}` : undefined
        }
      >
        <dl className="rounded-md border border-border bg-surface px-5">
          <DataRow
            label="Contract"
            value={loadingPlan ? <SkeletonLine width="45%" /> : plan?.contract_name}
          />
          <DataRow
            label="Plan"
            value={loadingPlan ? <SkeletonLine width="50%" /> : plan?.plan_name}
          />
          <DataRow
            label="Formulary ID"
            mono
            value={
              loadingPatient ? <SkeletonLine width="30%" /> : patient?.formulary_id
            }
          />
          <DataRow
            label="Contract · Plan · Segment"
            mono
            value={
              loadingPatient || !patient ? (
                <SkeletonLine width="40%" />
              ) : (
                `${patient.contract_id} · ${patient.plan_id} · ${patient.segment_id}`
              )
            }
          />
          <DataRow
            label="Premium"
            value={
              loadingPlan ? (
                <SkeletonLine width="20%" />
              ) : plan?.premium != null ? (
                formatCurrency(plan.premium)
              ) : null
            }
          />
          <DataRow
            label="Deductible"
            value={
              loadingPlan ? (
                <SkeletonLine width="20%" />
              ) : plan?.deductible != null ? (
                formatCurrency(plan.deductible)
              ) : null
            }
          />
        </dl>
      </Section>

      {/* Clinical history */}
      <Section label="Clinical history">
        <div className="space-y-5 rounded-md border border-border bg-surface px-5 py-5">
          <ClinicalBlock
            title="History of present illness"
            loading={loadingPatient}
            value={patient?.history_of_present_illness}
          />
          <ClinicalBlock
            title="Physical exam notes"
            loading={loadingPatient}
            value={patient?.physical_exam_notes}
          />
          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-strong">
              Previous failed therapies
            </h3>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {loadingPatient ? (
                <>
                  <SkeletonLine width={80} className="h-6" />
                  <SkeletonLine width={110} className="h-6" />
                </>
              ) : patient?.previous_failed_therapies?.length ? (
                patient.previous_failed_therapies.map((t) => (
                  <StatusPill key={t} tone="warning">
                    {t}
                  </StatusPill>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  None on record.
                </p>
              )}
            </div>
          </div>
        </div>
      </Section>

      {/* Next action */}
      {patient ? (
        <div className="flex items-center justify-between border-t border-border pt-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Pill className="h-4 w-4" />
            Ready to verify formulary coverage for this patient.
          </div>
          <div className="flex items-center gap-2">
            <Button
              asChild
              variant="ghost"
              size="sm"
            >
              <Link to="/patients">Back to list</Link>
            </Button>
            <Button onClick={() => navigate(`/patients/${patient.id}/coverage`)}>
              <FileText className="h-4 w-4" />
              Check coverage
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ClinicalBlock({
  title,
  loading,
  value,
}: {
  title: string;
  loading?: boolean;
  value?: string | null;
}) {
  return (
    <div>
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-strong">
        {title}
      </h3>
      {loading ? (
        <div className="mt-2 space-y-1.5">
          <SkeletonLine width="100%" />
          <SkeletonLine width="90%" />
          <SkeletonLine width="60%" />
        </div>
      ) : value ? (
        <p className="mt-2 text-sm leading-relaxed text-foreground">{value}</p>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">Not documented.</p>
      )}
    </div>
  );
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}
