import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ShieldCheck } from "lucide-react";
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
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="w-full max-w-md shadow-2xl border">
        <CardHeader className="text-center pb-2 pt-8">
          <div className="flex flex-col items-center gap-3">
            <div className="rounded-full bg-primary/10 p-4">
              <ShieldCheck className="h-10 w-10 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">RxAssist</h1>
              <p className="text-sm text-muted-foreground mt-1">Provider Dashboard</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6 pb-8 px-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="physicianName">Physician Name</Label>
              <Input
                id="physicianName"
                placeholder="Dr. Jane Smith"
                value={physicianName}
                onChange={(e) => setPhysicianName(e.target.value)}
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="practiceName">Practice Name</Label>
              <Input
                id="practiceName"
                placeholder="Downtown Medical Group"
                value={practiceName}
                onChange={(e) => setPracticeName(e.target.value)}
              />
            </div>

            <Button type="submit" className="w-full mt-2" disabled={!isValid}>
              Sign In
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
