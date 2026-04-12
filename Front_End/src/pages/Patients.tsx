import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ShieldCheck } from "lucide-react";

export default function Patients() {
  const [patientName, setPatientName] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName.trim()) return;
    sessionStorage.setItem("rxassist_patient", patientName.trim());
    navigate("/patient_report");
  };

  const isValid = patientName.trim().length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-300 via-teal-200 to-green-300 flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute top-1/4 -left-10 w-[30rem] h-[30rem] bg-gradient-to-br from-emerald-600/60 to-green-500/50 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 -right-10 w-[30rem] h-[30rem] bg-gradient-to-br from-green-600/55 to-emerald-500/60 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40rem] h-[40rem] bg-gradient-to-br from-emerald-500/50 via-green-600/40 to-teal-500/45 rounded-full blur-3xl" />

      <Card className="relative w-full max-w-md shadow-2xl border overflow-hidden ring-1 ring-primary/10 backdrop-blur-sm">
        <div className="h-1.5 bg-gradient-to-r from-teal-500 via-primary to-emerald-400" />
        <CardHeader className="text-center pb-2 pt-8">
          <div className="flex flex-col items-center gap-3">
            <div className="rounded-full bg-primary/10 p-4 ring-4 ring-primary/5">
              <ShieldCheck className="h-10 w-10 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight">RxAssist</h1>
              <p className="text-sm text-muted-foreground mt-1">Patient Portal</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6 pb-8 px-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="patientName" className="text-sm font-medium">Patient Name</Label>
              <Input
                id="patientName"
                placeholder="John Doe"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                className="h-11"
                autoFocus
              />
            </div>

            <Button type="submit" size="lg" className="w-full mt-2" disabled={!isValid}>
              Sign In
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
