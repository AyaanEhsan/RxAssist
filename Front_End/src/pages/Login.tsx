import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { InlineAlert } from "@/components/clinical";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [physicianName, setPhysicianName] = useState("");
  const [practiceName, setPracticeName] = useState("");
  const [touched, setTouched] = useState<{ physician?: boolean; practice?: boolean }>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  const physicianError =
    touched.physician && !physicianName.trim()
      ? "Physician name is required."
      : null;
  const practiceError =
    touched.practice && !practiceName.trim()
      ? "Practice name is required."
      : null;
  const isValid =
    physicianName.trim().length > 0 && practiceName.trim().length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ physician: true, practice: true });
    if (!isValid) {
      setSubmitError("Please enter your physician and practice name to continue.");
      return;
    }
    setSubmitError(null);
    login({
      physicianName: physicianName.trim(),
      practiceName: practiceName.trim(),
    });
    navigate("/patients", { replace: true });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto grid min-h-screen w-full max-w-6xl grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* Left — identity rail */}
        <aside className="hidden flex-col justify-between border-r border-border bg-surface px-12 py-12 lg:flex">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <span className="text-sm font-bold leading-none">Rx</span>
            </div>
            <span className="text-base font-semibold tracking-tight">
              RxAssist
            </span>
          </div>

          <div className="max-w-sm space-y-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-strong">
              Prior authorization, drafted faster
            </p>
            <h2 className="text-[26px] font-semibold leading-[1.25] tracking-tight text-foreground">
              Check formulary coverage and draft prior authorization letters
              grounded in your patient&rsquo;s record.
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              RxAssist sits alongside your EHR. Patient identifiers are masked
              before any model call, and every draft is returned as editable
              text for review before submission.
            </p>
          </div>

          <p className="text-[11px] leading-relaxed text-muted-foreground">
            RxAssist is a clinical workflow tool. It does not replace payer
            processes or clinical judgment.
          </p>
        </aside>

        {/* Right — sign in */}
        <section className="flex items-center justify-center px-6 py-16">
          <div className="w-full max-w-[360px]">
            <div className="mb-8 lg:hidden">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
                  <span className="text-sm font-bold leading-none">Rx</span>
                </div>
                <span className="text-base font-semibold tracking-tight">
                  RxAssist
                </span>
              </div>
            </div>

            <h1 className="text-[22px] font-semibold tracking-tight text-foreground">
              Sign in to RxAssist
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Enter your credentials to access the provider workspace.
            </p>

            {submitError ? (
              <div className="mt-6">
                <InlineAlert>{submitError}</InlineAlert>
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate>
              <FieldLabel htmlFor="physicianName" label="Physician name">
                <Input
                  id="physicianName"
                  placeholder="Dr. Jane Smith"
                  value={physicianName}
                  onChange={(e) => setPhysicianName(e.target.value)}
                  onBlur={() =>
                    setTouched((t) => ({ ...t, physician: true }))
                  }
                  autoComplete="name"
                  aria-invalid={!!physicianError}
                  aria-describedby={
                    physicianError ? "physicianName-error" : undefined
                  }
                  autoFocus
                />
                {physicianError ? (
                  <FieldError id="physicianName-error">
                    {physicianError}
                  </FieldError>
                ) : null}
              </FieldLabel>

              <FieldLabel htmlFor="practiceName" label="Practice name">
                <Input
                  id="practiceName"
                  placeholder="Downtown Medical Group"
                  value={practiceName}
                  onChange={(e) => setPracticeName(e.target.value)}
                  onBlur={() =>
                    setTouched((t) => ({ ...t, practice: true }))
                  }
                  autoComplete="organization"
                  aria-invalid={!!practiceError}
                  aria-describedby={
                    practiceError ? "practiceName-error" : undefined
                  }
                />
                {practiceError ? (
                  <FieldError id="practiceName-error">
                    {practiceError}
                  </FieldError>
                ) : null}
              </FieldLabel>

              <Button
                type="submit"
                size="default"
                className="mt-2 w-full"
                disabled={!isValid}
              >
                Sign in
              </Button>
            </form>

            <p className="mt-10 text-[11px] leading-relaxed text-muted-foreground lg:hidden">
              RxAssist is a clinical workflow tool. It does not replace payer
              processes or clinical judgment.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

function FieldLabel({
  htmlFor,
  label,
  children,
}: {
  htmlFor: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label
        htmlFor={htmlFor}
        className="text-[13px] font-medium text-foreground"
      >
        {label}
      </Label>
      {children}
    </div>
  );
}

function FieldError({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  return (
    <p id={id} className="text-xs text-destructive-text" role="alert">
      {children}
    </p>
  );
}
