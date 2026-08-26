"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api, getToken, TOKEN_KEY } from "@/lib/api";

export type Member = {
  id: string;
  name: string;
  phone: string;
  memberCode: string;
  role: string;
  rank: string | null;
  status: string;
  position: string | null;
  activatedAt: string | null;
};

type AuthState = {
  token: string | null;
  member: Member | null;
  loading: boolean;
  login: (phone: string, password: string) => Promise<Member>;
  register: (input: {
    name: string;
    phone: string;
    password: string;
    sponsorCode: string;
  }) => Promise<Member>;
  logout: () => void;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadFromToken(nextToken: string) {
    const data = await api<{ member: Member }>("/member/me", { token: nextToken });
    setMember(data.member);
  }

  useEffect(() => {
    const stored = getToken();
    if (!stored) {
      setLoading(false);
      return;
    }
    setToken(stored);
    loadFromToken(stored)
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setMember(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      token,
      member,
      loading,
      async login(phone, password) {
        const data = await api<{ token: string; member: Member }>("/auth/login", {
          method: "POST",
          body: { phone, password },
        });
        localStorage.setItem(TOKEN_KEY, data.token);
        setToken(data.token);
        setMember(data.member);
        return data.member;
      },
      async register(input) {
        const data = await api<{ token: string; member: Member }>("/auth/register", {
          method: "POST",
          body: input,
        });
        localStorage.setItem(TOKEN_KEY, data.token);
        setToken(data.token);
        setMember(data.member);
        return data.member;
      },
      logout() {
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setMember(null);
      },
      async refresh() {
        const stored = getToken();
        if (!stored) return;
        await loadFromToken(stored);
      },
    }),
    [token, member, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
