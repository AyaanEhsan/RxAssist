import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueries, useQuery } from "@tanstack/react-query";
import { Search, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  getPatients,
  getPatient,
  type PatientDetail,
} from "@/lib/api";
import {
  PageHeader,
  InlineAlert,
  SkeletonLine,
} from "@/components/clinical";

export default function Patients() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const {
    data: patients,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["patients"],
    queryFn: getPatients,
  });

  // Parallel-fetch detail for each patient to populate plan/formulary columns.
  // This is fine for the mock dataset; swap for a server-side summary endpoint later.
  const detailQueries = useQueries({
    queries: (patients ?? []).map((p) => ({
      queryKey: ["patient", p.id],
      queryFn: () => getPatient(p.id),
      staleTime: 60_000,
    })),
  });

  const rows = useMemo(() => {
    if (!patients) return [];
    return patients.map((p, i) => ({
      id: p.id,
      name: p.patient_name,
      detail: detailQueries[i]?.data,
      loading: detailQueries[i]?.isLoading,
    }));
  }, [patients, detailQueries]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.detail?.formulary_id?.toLowerCase().includes(q) ||
        r.detail?.primary_diagnosis_desc?.toLowerCase().includes(q)
    );
  }, [rows, query]);

  return (
    <div>
      <PageHeader
        eyebrow="Workspace"
        title="Patients"
        description="Select a patient to review plan details, check formulary coverage, or start a prior authorization draft."
        actions={
          <Button variant="outline" size="sm" disabled>
            <Plus className="h-4 w-4" />
            Add patient
          </Button>
        }
      />

      <div className="mb-5 flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, formulary, or diagnosis"
            className="pl-9"
            aria-label="Filter patients"
          />
        </div>
        <p className="text-xs tabular-nums text-muted-foreground">
          {isLoading
            ? "Loading…"
            : `${filtered.length} of ${rows.length} patients`}
        </p>
      </div>

      {isError ? (
        <InlineAlert title="Unable to load patients">
          {error instanceof Error ? error.message : "Please try again."}
        </InlineAlert>
      ) : null}

      <div className="overflow-hidden rounded-md border border-border bg-surface">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 bg-surface-muted">
            <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-strong">
              <th scope="col" className="px-4 py-2.5 font-semibold">
                Patient
              </th>
              <th scope="col" className="px-4 py-2.5 font-semibold">
                Diagnosis
              </th>
              <th scope="col" className="px-4 py-2.5 font-semibold">
                Formulary
              </th>
              <th scope="col" className="px-4 py-2.5 font-semibold">
                Contract / Plan
              </th>
              <th scope="col" className="px-4 py-2.5 text-right font-semibold">
                Last activity
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="px-4 py-3">
                      <SkeletonLine width="65%" />
                    </td>
                    <td className="px-4 py-3">
                      <SkeletonLine width="80%" />
                    </td>
                    <td className="px-4 py-3">
                      <SkeletonLine width="45%" />
                    </td>
                    <td className="px-4 py-3">
                      <SkeletonLine width="55%" />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <SkeletonLine width="40%" className="ml-auto" />
                    </td>
                  </tr>
                ))
              : filtered.map((row) => (
                  <PatientRow
                    key={row.id}
                    id={row.id}
                    name={row.name}
                    detail={row.detail}
                    loading={row.loading}
                    onOpen={(id) => navigate(`/patients/${id}`)}
                  />
                ))}
          </tbody>
        </table>

        {!isLoading && filtered.length === 0 ? (
          <div className="border-t border-border px-6 py-14 text-center">
            <p className="text-sm font-medium text-foreground">
              No patients found.
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {query ? (
                <>
                  Try a different search or{" "}
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    className="text-primary underline-offset-2 hover:underline"
                  >
                    clear the filter
                  </button>
                  .
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="text-primary underline-offset-2 hover:underline"
                    disabled
                  >
                    Add patient
                  </button>{" "}
                  to get started.
                </>
              )}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function PatientRow({
  id,
  name,
  detail,
  loading,
  onOpen,
}: {
  id: number;
  name: string;
  detail?: PatientDetail;
  loading?: boolean;
  onOpen: (id: number) => void;
}) {
  return (
    <tr
      tabIndex={0}
      role="link"
      onClick={() => onOpen(id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(id);
        }
      }}
      className="group cursor-pointer border-t border-border transition-colors hover:bg-surface-muted focus-visible:bg-surface-muted focus-visible:outline-none"
    >
      <td className="px-4 py-3 align-middle">
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-soft text-[11px] font-semibold text-primary">
            {getInitials(name)}
          </span>
          <span className="font-medium text-foreground">{name}</span>
        </div>
      </td>
      <td className="max-w-[220px] truncate px-4 py-3 text-muted-foreground">
        {loading ? (
          <SkeletonLine width="80%" />
        ) : detail?.primary_diagnosis_desc ? (
          <span title={detail.primary_diagnosis_desc}>
            {detail.primary_diagnosis_desc}
          </span>
        ) : (
          <span className="text-muted-foreground/60">—</span>
        )}
      </td>
      <td className="px-4 py-3 font-mono text-[12.5px] text-foreground">
        {loading ? (
          <SkeletonLine width="50%" />
        ) : (
          detail?.formulary_id ?? "—"
        )}
      </td>
      <td className="px-4 py-3 font-mono text-[12.5px] text-muted-foreground">
        {loading ? (
          <SkeletonLine width="60%" />
        ) : detail ? (
          <>
            {detail.contract_id}
            <span className="text-muted-foreground/50"> · </span>
            {detail.plan_id}
          </>
        ) : (
          "—"
        )}
      </td>
      <td className="px-4 py-3 text-right text-muted-foreground tabular-nums">
        <span className="text-muted-foreground/60">—</span>
      </td>
    </tr>
  );
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "··";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
