import { type ReactNode } from "react";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ *
 * Small, opinionated primitives shared across RxAssist pages.
 * These enforce the design system's density, restraint and semantic
 * color discipline so page-level code stays short and consistent.
 * ------------------------------------------------------------------ */

export function PageHeader({
  eyebrow,
  title,
  description,
  backTo,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  backTo?: { to: string; label: string };
  actions?: ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-col gap-3">
      {backTo ? (
        <Link
          to={backTo.to}
          className="inline-flex w-fit items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {backTo.label}
        </Link>
      ) : null}
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0">
          {eyebrow ? (
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-strong">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="text-[22px] font-semibold leading-tight tracking-tight text-foreground">
            {title}
          </h1>
          {description ? (
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
    </header>
  );
}

export function Section({
  label,
  description,
  children,
  className,
}: {
  label: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("mb-10 last:mb-0", className)}>
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-strong">
          {label}
        </h2>
        {description ? (
          <p className="text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export function DataRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-6 border-b border-border py-3 last:border-b-0">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "text-right text-sm font-medium text-foreground",
          mono && "font-mono text-[13px]"
        )}
      >
        {value ?? <span className="text-muted-foreground">—</span>}
      </dd>
    </div>
  );
}

export function InlineAlert({
  title,
  children,
  tone = "error",
}: {
  title?: string;
  children: ReactNode;
  tone?: "error" | "warning";
}) {
  const palette =
    tone === "warning"
      ? "border-warning-border bg-warning-soft text-warning-text"
      : "border-destructive-border bg-destructive-soft text-destructive-text";
  return (
    <div
      role="alert"
      className={cn(
        "mb-4 flex items-start gap-2.5 rounded-md border px-3.5 py-2.5 text-sm",
        palette
      )}
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="min-w-0">
        {title ? <p className="font-semibold">{title}</p> : null}
        <div className="leading-relaxed">{children}</div>
      </div>
    </div>
  );
}

export function SkeletonLine({
  width = "100%",
  className,
}: {
  width?: string | number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "h-3 w-full animate-shimmer rounded-sm bg-shimmer bg-[length:200%_100%]",
        className
      )}
      style={{ width }}
      aria-hidden
    />
  );
}

export function DraftSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Generating prior authorization draft"
      className="space-y-6 rounded-md border border-border bg-surface px-6 py-6"
    >
      <div className="space-y-2">
        <SkeletonLine width="45%" className="h-4" />
        <SkeletonLine width="25%" className="h-3" />
      </div>
      <div className="space-y-2">
        <SkeletonLine width="100%" />
        <SkeletonLine width="96%" />
        <SkeletonLine width="88%" />
      </div>
      <div className="space-y-2">
        <SkeletonLine width="30%" className="h-3.5" />
        <SkeletonLine width="100%" />
        <SkeletonLine width="94%" />
        <SkeletonLine width="72%" />
      </div>
      <div className="space-y-2">
        <SkeletonLine width="100%" />
        <SkeletonLine width="80%" />
        <SkeletonLine width="50%" />
      </div>
    </div>
  );
}

/* ---------------------- Semantic status pills ---------------------- */

export type CoverageTone = "neutral" | "info" | "warning" | "success" | "danger";

export function StatusPill({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: CoverageTone;
  className?: string;
}) {
  const styles: Record<CoverageTone, string> = {
    neutral:
      "border-border bg-surface-muted text-muted-foreground",
    info: "border-primary-soft bg-primary-soft text-primary",
    warning:
      "border-warning-border bg-warning-soft text-warning-text",
    success: "border-success-soft bg-success-soft text-success",
    danger:
      "border-destructive-border bg-destructive-soft text-destructive-text",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
        styles[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

export function TierPill({ tier }: { tier?: number | null }) {
  if (tier == null) {
    return <StatusPill tone="neutral">Tier —</StatusPill>;
  }
  const tone: CoverageTone =
    tier <= 1 ? "neutral" : tier === 2 ? "info" : "warning";
  return <StatusPill tone={tone}>Tier {tier}</StatusPill>;
}
