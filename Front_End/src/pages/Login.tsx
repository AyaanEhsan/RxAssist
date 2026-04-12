import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ShieldCheck, Lock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const [physicianName, setPhysicianName] = useState("");
  const [practiceName, setPracticeName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!physicianName.trim() || !practiceName.trim()) return;
    login({ physicianName: physicianName.trim(), practiceName: practiceName.trim() });
  };

  const isValid = physicianName.trim().length > 0 && practiceName.trim().length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center px-4">
      <Card className="w-full max-w-md shadow-2xl border overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-primary via-primary/80 to-primary/60" />
        <CardHeader className="text-center pb-2 pt-8">
          <div className="flex flex-col items-center gap-3">
            <div className="rounded-full bg-primary/10 p-4 ring-4 ring-primary/5">
              <ShieldCheck className="h-10 w-10 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight">RxAssist</h1>
              <p className="text-sm text-muted-foreground mt-1">Provider Dashboard</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6 pb-8 px-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="physicianName" className="text-sm font-medium">Physician Name</Label>
              <Input
                id="physicianName"
                placeholder="Dr. Jane Smith"
                value={physicianName}
                onChange={(e) => setPhysicianName(e.target.value)}
                className="h-11"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="practiceName" className="text-sm font-medium">Practice Name</Label>
              <Input
                id="practiceName"
                placeholder="Downtown Medical Group"
                value={practiceName}
                onChange={(e) => setPracticeName(e.target.value)}
                className="h-11"
              />
            </div>

            <Button type="submit" size="lg" className="w-full mt-2" disabled={!isValid}>
              Sign In
            </Button>
          </form>

          <p className="text-xs text-muted-foreground text-center mt-6 flex items-center justify-center gap-1.5">
            <Lock className="h-3 w-3" />
            HIPAA-compliant secure access
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
