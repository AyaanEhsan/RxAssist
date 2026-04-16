import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
} from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AppShell } from "@/components/AppShell";
import Login from "@/pages/Login";
import Patients from "@/pages/Patients";
import PatientDetail from "@/pages/PatientDetail";
import PatientCoverage from "@/pages/PatientCoverage";
import PatientDraft from "@/pages/PatientDraft";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
});

function AuthenticatedLayout() {
  const { provider } = useAuth();
  if (!provider) return <Navigate to="/login" replace />;
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

function LoginRoute() {
  const { provider } = useAuth();
  if (provider) return <Navigate to="/patients" replace />;
  return <Login />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginRoute />} />
            <Route element={<AuthenticatedLayout />}>
              <Route index element={<Navigate to="/patients" replace />} />
              <Route path="/patients" element={<Patients />} />
              <Route path="/patients/:id" element={<PatientDetail />} />
              <Route
                path="/patients/:id/coverage"
                element={<PatientCoverage />}
              />
              <Route path="/patients/:id/draft" element={<PatientDraft />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
