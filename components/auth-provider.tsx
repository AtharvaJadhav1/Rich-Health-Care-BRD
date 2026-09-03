"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { api, clearToken, getToken, persistToken } from "@/lib/api";

export type Member = {
  id: string;
  name: string;
  phone: string;
  memberCode: string;
  role: string;
  rank: string | null;
  status: string;
  kycStatus: string;
  panNumber?: string;
  photoUrl: string | null;
  address: string | null;
  city?: string | null;
  state?: string | null;
  position: string | null;
  activatedAt: string | null;
  createdAt: string;
  accountName?: string | null;
  bankName?: string | null;
  accountNumber?: string | null;
  ifsc?: string | null;
  upiId?: string | null;
};

export type IssuedCredentials = { memberCode: string; password: string };

type AuthState = {
  token: string | null;
  member: Member | null;
  loading: boolean;
  login: (memberCode: string, password: string) => Promise<Member>;
  register: (input: {
    name: string;
    phone: string;
    panNumber: string;
    password: string;
    sponsorCode: string;
    placementCode: string;
    position: "LEFT" | "RIGHT";
    dateOfBirth: string;
    at: string;
    city: string;
    state: string;
    agreeTerms: true;
    pinCode?: string;
  }) => Promise<{ member: Member; credentials: IssuedCredentials }>;
  logout: () => void;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const sessionRef = useRef(0);

  async function loadFromToken(nextToken: string, session: number) {
    const data = await api<{ member: Member }>("/member/me", { token: nextToken });
    if (session !== sessionRef.current) return;
    setMember(data.member);
  }

  useEffect(() => {
    const stored = getToken();
    if (!stored) {
      setLoading(false);
      return;
    }
    const session = ++sessionRef.current;
    setToken(stored);
    loadFromToken(stored, session)
      .catch(() => {
        if (session !== sessionRef.current) return;
        clearToken();
        setToken(null);
        setMember(null);
      })
      .finally(() => {
        if (session !== sessionRef.current) return;
        setLoading(false);
      });
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      token,
      member,
      loading,
      async login(memberCode, password) {
        const session = ++sessionRef.current;
        const data = await api<{ token: string; member: Member }>("/auth/login", {
          method: "POST",
          body: { memberCode, password },
        });
        persistToken(data.token);
        setToken(data.token);
        setMember(data.member);
        setLoading(false);
        void session;
        return data.member;
      },
      async register(input) {
        const data = await api<{
          token: string;
          member: Member;
          credentials: IssuedCredentials;
        }>("/auth/register", {
          method: "POST",
          body: input,
        });
        persistToken(data.token);
        setToken(data.token);
        setMember(data.member);
        return { member: data.member, credentials: data.credentials };
      },
      logout() {
        clearToken();
        setToken(null);
        setMember(null);
      },
      async refresh() {
        const stored = getToken();
        if (!stored) return;
        await loadFromToken(stored, sessionRef.current);
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
