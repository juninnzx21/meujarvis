import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../services/api";
import type { User } from "../types";

type AuthContextValue = {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<{ mfaRequired: false } | { mfaRequired: true; challengeToken: string } | { mfaSetupRequired: true; setupToken: string }>;
  completeMfaLogin: (challengeToken: string, code: string) => Promise<void>;
  acceptSession: (session: { token: string; user: User }) => void;
  logout: () => void;
  ready: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("jarvis_token"));
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!token) {
      setReady(true);
      return;
    }
    api.get("/auth/me")
      .then((res) => setUser(res.data.user))
      .catch(() => {
        localStorage.removeItem("jarvis_token");
        setToken(null);
      })
      .finally(() => setReady(true));
  }, [token]);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    token,
    ready,
    async login(email, password) {
      const response = await api.post("/auth/login", { email, password });
      if (response.data.mfaRequired && typeof response.data.challengeToken === "string") {
        return { mfaRequired: true as const, challengeToken: response.data.challengeToken };
      }
      if (response.data.mfaSetupRequired && typeof response.data.setupToken === "string") {
        return { mfaSetupRequired: true as const, setupToken: response.data.setupToken };
      }
      localStorage.setItem("jarvis_token", response.data.token);
      setToken(response.data.token);
      setUser(response.data.user);
      return { mfaRequired: false as const };
    },
    async completeMfaLogin(challengeToken, code) {
      const response = await api.post("/auth/login/totp", { challengeToken, code });
      localStorage.setItem("jarvis_token", response.data.token);
      setToken(response.data.token);
      setUser(response.data.user);
    },
    acceptSession(session) {
      localStorage.setItem("jarvis_token", session.token);
      setToken(session.token);
      setUser(session.user);
    },
    logout() {
      localStorage.removeItem("jarvis_token");
      setToken(null);
      setUser(null);
    }
  }), [ready, token, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return ctx;
}
