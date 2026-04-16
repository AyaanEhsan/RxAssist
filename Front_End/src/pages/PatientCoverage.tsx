import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search, X, ArrowRight, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  getPatient,
  getDrugLookup,
  getFormularyCoverage,
  type DrugRxcuiResult,
  type FormularyEntry,
} from "@/lib/api";
import {
  PageHeader,
  Section,
  InlineAlert,
  SkeletonLine,
  StatusPill,
  TierPill,
} from "@/components/clinical";
import { cn } from "@/lib/utils";

/* Simple debounce hook — 250ms default, per the design brief. */
function useDebounced<T>(value: T, ms = 250): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

export default function PatientCoverage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const patientId = id ? Number(id) : undefined;

  const {
    data: patient,
    isLoading: loadingPatient,
    isError: patientError,
  } = useQuery({
    queryKey: ["patient", patientId],
    queryFn: () => getPatient(patientId!),
    enabled: !!patientId,
  });

  /* ----------------- Drug combobox state ----------------- */
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounced(query, 250);
  const [comboOpen, setComboOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [selected, setSelected] = useState<DrugRxcuiResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = "drug-combobox-listbox";

  const shouldSearch =
    !!patient?.formulary_id &&
    debouncedQuery.trim().length >= 2 &&
    !selected;

  const {
    data: lookup,
    isFetching: loadingLookup,
    isError: lookupError,
  } = useQuery({
    queryKey: ["drugLookup", patient?.formulary_id, debouncedQuery.trim()],
    queryFn: () =>
      getDrugLookup(patient!.formulary_id, debouncedQuery.trim()),
    enabled: shouldSearch,
  });

  const options = lookup?.covered_results ?? [];

  useEffect(() => {
    setActiveIndex(0);
  }, [options.length, debouncedQuery]);

  const pickOption = (opt: DrugRxcuiResult) => {
    setSelected(opt);
    setQuery("");
    setComboOpen(false);
    inputRef.current?.blur();
  };

  const clearSelected = () => {
    setSelected(null);
    setQuery("");
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!comboOpen || options.length === 0) {
      if (e.key === "ArrowDown" && options.length > 0) setComboOpen(true);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % options.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + options.length) % options.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      pickOption(options[activeIndex]);
    } else if (e.key === "Escape") {
      setComboOpen(false);
    }
  };

  /* ----------------- Formulary coverage query ------------- */
  const {
    data: coverage,
    isFetching: loadingCoverage,
    isError: coverageError,
  } = useQuery({
    queryKey: ["formulary", patient?.formulary_id, selected?.rxcui],
    queryFn: () =>
      getFormularyCoverage(patient!.formulary_id, selected!.rxcui),
    enabled: !!patient?.formulary_id && !!selected,
    retry: false,
  });

  const topEntry = coverage?.[0];

  return (
    <div>
      <PageHeader
        eyebrow="Coverage check"
        title="Formulary coverage"
        description={
          patient
            ? `Verify plan coverage for ${patient.patient_name} on formulary ${patient.formulary_id}.`
            : "Verify plan coverage for the selected patient."
        }
        backTo={
          patient
            ? { to: `/patients/${patient.id}`, label: "Back to patient" }
            : { to: "/patients", label: "All patients" }
        }
      />

      {patientError ? (
        <InlineAlert title="Unable to load patient">
          Please go back and try again.
        </InlineAlert>
      ) : null}

      {/* Drug search */}
      <Section label="Medication" description="Search the plan formulary by drug name.">
        {selected ? (
          <div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-surface px-3 py-2.5">
            <span className="inline-flex items-center gap-2 rounded-md border border-border bg-surface-muted py-1 pl-2.5 pr-1 text-sm">
              <span className="font-medium text-foreground">
                {selected.name}
              </span>
              <span className="font-mono text-[11px] text-muted-foreground">
                RxCUI {selected.rxcui}
              </span>
              <button
                type="button"
                onClick={clearSelected}
                aria-label={`Remove ${selected.name}`}
                className="inline-flex h-5 w-5 items-center justify-center rounded-sm text-muted-foreground hover:bg-surface hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          </div>
        ) : (
          <div className="relative">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={inputRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setComboOpen(true);
                }}
                onFocus={() => setComboOpen(true)}
                onBlur={() => setTimeout(() => setComboOpen(false), 120)}
                onKeyDown={handleKeyDown}
                disabled={loadingPatient || !patient}
                placeholder={
                  loadingPatient
                    ? "Loading patient…"
                    : "Search medication (e.g. afatinib)"
                }
                className="pl-9"
                role="combobox"
                aria-expanded={comboOpen && options.length > 0}
                aria-controls={listboxId}
                aria-autocomplete="list"
                aria-activedescendant={
                  options.length > 0
                    ? `${listboxId}-option-${activeIndex}`
                    : undefined
                }
              />
            </div>

            {comboOpen &&
            (loadingLookup || options.length > 0 || debouncedQuery.trim().length >= 2) ? (
              <ul
                id={listboxId}
                role="listbox"
                className="absolute left-0 right-0 top-[calc(100%+4px)] z-10 max-h-72 overflow-auto rounded-md border border-border bg-surface py-1"
              >
                {loadingLookup ? (
                  <li className="px-3 py-2 text-sm text-muted-foreground">
                    Searching…
                  </li>
                ) : options.length === 0 ? (
                  <li className="px-3 py-2 text-sm text-muted-foreground">
                    {lookupError
                      ? "Search failed. Try again."
                      : "No matches on this formulary."}
                  </li>
                ) : (
                  options.map((opt, i) => (
                    <li
                      key={opt.rxcui}
                      id={`${listboxId}-option-${i}`}
                      role="option"
                      aria-selected={i === activeIndex}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        pickOption(opt);
                      }}
                      onMouseEnter={() => setActiveIndex(i)}
                      className={cn(
                        "flex cursor-pointer items-center justify-between gap-4 px-3 py-2 text-sm",
                        i === activeIndex
                          ? "bg-primary-soft text-foreground"
                          : "text-foreground"
                      )}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="truncate font-medium">{opt.name}</span>
                        <StatusPill tone={opt.status === "active" ? "success" : "neutral"}>
                          {opt.status}
                        </StatusPill>
                      </span>
                      <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                        RxCUI {opt.rxcui}
                      </span>
                    </li>
                  ))
                )}
              </ul>
            ) : null}

            <p className="mt-2 text-xs text-muted-foreground">
              Use <kbd className="rounded border border-border bg-surface-muted px-1 text-[10px]">↑</kbd>{" "}
              <kbd className="rounded border border-border bg-surface-muted px-1 text-[10px]">↓</kbd>{" "}
              to navigate results and{" "}
              <kbd className="rounded border border-border bg-surface-muted px-1 text-[10px]">Enter</kbd>{" "}
              to select.
            </p>
          </div>
        )}
      </Section>

      {/* Coverage */}
      {selected ? (
        <Section label="Coverage">
          {coverageError ? (
            <InlineAlert title="Coverage check failed">
              We couldn&rsquo;t retrieve formulary coverage for this medication.
              Verify the formulary ID and try again.
            </InlineAlert>
          ) : null}

          {loadingCoverage ? (
            <CoverageSkeleton />
          ) : coverage && coverage.length > 0 ? (
            <CoverageList entries={coverage} />
          ) : coverage && coverage.length === 0 ? (
            <EmptyCoverage drugName={selected.name} />
          ) : null}
        </Section>
      ) : null}

      {/* Next step */}
      {topEntry && patient ? (
        <div className="sticky bottom-6 z-10 -mx-2 mt-10 flex items-center justify-between gap-4 rounded-md border border-border bg-surface px-5 py-3">
          <div className="min-w-0 text-sm">
            <p className="font-medium text-foreground">
              Ready to draft?
            </p>
            <p className="text-muted-foreground">
              {topEntry.prior_authorization_yn === "Y"
                ? "Prior authorization is required on this plan."
                : topEntry.step_therapy_yn === "Y"
                  ? "Step therapy applies — document prior failed therapies in the draft."
                  : "This medication is on the formulary. You can still prepare a PA draft."}
            </p>
          </div>
          <Button
            onClick={() =>
              navigate(`/patients/${patient.id}/draft`, {
                state: {
                  rxcui: selected?.rxcui,
                  drugName: selected?.name,
                  entry: topEntry,
                },
              })
            }
          >
            Generate draft
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function CoverageList({ entries }: { entries: FormularyEntry[] }) {
  return (
    <div className="divide-y divide-border rounded-md border border-border bg-surface">
      {entries.map((entry, i) => (
        <CoverageRow key={`${entry.ndc}-${i}`} entry={entry} />
      ))}
    </div>
  );
}

function CoverageRow({ entry }: { entry: FormularyEntry }) {
  const paRequired = entry.prior_authorization_yn === "Y";
  const stRequired = entry.step_therapy_yn === "Y";
  const qlRequired = entry.quantity_limit_yn === "Y";

  return (
    <article className="flex flex-col gap-3 px-5 py-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2">
            <span className="font-mono text-sm text-foreground">
              NDC {entry.ndc}
            </span>
            <span className="text-xs text-muted-foreground">
              RxCUI {entry.rxcui}
            </span>
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Formulary version{" "}
            <span className="tabular-nums">
              {entry.formulary_version ?? "—"}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <TierPill tier={entry.tier_level_value ?? null} />
          {!paRequired && !stRequired ? (
            <StatusPill tone="success">
              <Check className="h-3 w-3" />
              Covered
            </StatusPill>
          ) : null}
        </div>
      </header>

      {/* Plain-English restrictions — no tooltips */}
      {paRequired || stRequired ? (
        <div className="space-y-2">
          {paRequired ? (
            <RestrictionLine
              badgeLabel="Prior authorization required"
              copy="The payer requires clinical justification before this medication is approved."
            />
          ) : null}
          {stRequired ? (
            <RestrictionLine
              badgeLabel="Step therapy required"
              copy="Document previous failed therapies to satisfy step therapy rules."
            />
          ) : null}
        </div>
      ) : null}

      {qlRequired ? (
        <p className="text-xs text-muted-foreground">
          Quantity limit:{" "}
          <span className="font-medium text-foreground tabular-nums">
            {entry.quantity_limit_amount ?? "—"} units
          </span>{" "}
          per{" "}
          <span className="font-medium text-foreground tabular-nums">
            {entry.quantity_limit_days ?? "—"} days
          </span>
          .
        </p>
      ) : null}
    </article>
  );
}

function RestrictionLine({
  badgeLabel,
  copy,
}: {
  badgeLabel: string;
  copy: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <StatusPill tone="warning" className="mt-0.5 shrink-0">
        {badgeLabel}
      </StatusPill>
      <p className="text-xs leading-relaxed text-muted-foreground">{copy}</p>
    </div>
  );
}

function CoverageSkeleton() {
  return (
    <div className="divide-y divide-border rounded-md border border-border bg-surface">
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="space-y-3 px-5 py-4">
          <div className="flex items-center justify-between">
            <SkeletonLine width="45%" className="h-4" />
            <SkeletonLine width="80px" className="h-5" />
          </div>
          <SkeletonLine width="70%" />
          <SkeletonLine width="40%" />
        </div>
      ))}
    </div>
  );
}

function EmptyCoverage({ drugName }: { drugName: string }) {
  return (
    <div className="rounded-md border border-border bg-surface px-5 py-10 text-center">
      <p className="text-sm font-medium text-foreground">
        Not on this formulary.
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        {drugName} was not found in the patient&rsquo;s plan formulary. You can
        still prepare a prior authorization draft with supporting clinical
        justification.
      </p>
    </div>
  );
}
