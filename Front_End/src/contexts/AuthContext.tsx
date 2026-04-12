import { createContext, useContext, useState, type ReactNode } from "react";

interface ProviderInfo {
  physicianName: string;
  practiceName: string;
}

interface AuthContextType {
  provider: ProviderInfo | null;
  login: (info: ProviderInfo) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [provider, setProvider] = useState<ProviderInfo | null>(() => {
    const saved = sessionStorage.getItem("rxassist_provider");
    return saved ? JSON.parse(saved) : null;
  });

  const login = (info: ProviderInfo) => {
    setProvider(info);
    sessionStorage.setItem("rxassist_provider", JSON.stringify(info));
  };

  const logout = () => {
    setProvider(null);
    sessionStorage.removeItem("rxassist_provider");
  };

  return (
    <AuthContext.Provider value={{ provider, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
