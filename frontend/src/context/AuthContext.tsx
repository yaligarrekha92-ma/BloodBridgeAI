"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { api } from "@/lib/api";

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: "SUPER_ADMIN" | "HOSPITAL_ADMIN" | "BLOOD_BANK_STAFF" | "READ_ONLY_ANALYST";
  hospital_id: number | null;
  hospital_name: string;
}

export interface Hospital {
  id: number;
  name: string;
  code: string;
  tier: string;
  city: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  selectedHospitalId: number | null;
  hospitals: Hospital[];
  setSelectedHospitalId: (id: number | null) => void;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => void;
  switchDemoRole: (role: "SUPER_ADMIN" | "HOSPITAL_ADMIN" | "BLOOD_BANK_STAFF" | "READ_ONLY_ANALYST") => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const DEMO_CREDENTIALS = {
  SUPER_ADMIN: { email: "admin@bloodbridge.ai", pass: "AdminPass123!", label: "Super Admin", desc: "Cross-hospital network authority" },
  HOSPITAL_ADMIN: { email: "metro.admin@bloodbridge.ai", pass: "HospitalPass123!", label: "Hospital Admin", desc: "Metropolitan General administrator" },
  BLOOD_BANK_STAFF: { email: "staff@bloodbridge.ai", pass: "StaffPass123!", label: "Blood Bank Staff", desc: "Inventory & lab operations" },
  READ_ONLY_ANALYST: { email: "analyst@bloodbridge.ai", pass: "AnalystPass123!", label: "Healthcare Analyst", desc: "Read-only metrics & forecasting" },
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [selectedHospitalId, setSelectedHospitalId] = useState<number | null>(null);

  // Initialize from localStorage or auto-load Super Admin demo session
  useEffect(() => {
    async function init() {
      const storedToken = localStorage.getItem("bloodbridge_token");
      if (storedToken) {
        try {
          setToken(storedToken);
          const me = await api.getMe();
          setUser(me);
          setSelectedHospitalId(me.hospital_id || null);
        } catch {
          // Token expired or invalid, auto-login with default demo user
          await autoLoginDefaultDemo();
        }
      } else {
        await autoLoginDefaultDemo();
      }

      // Fetch hospitals
      try {
        const hosps = await api.getHospitals();
        setHospitals(hosps);
      } catch (err) {
        console.error("Failed to fetch hospitals list", err);
      } finally {
        setLoading(false);
      }
    }

    async function autoLoginDefaultDemo() {
      try {
        const res = await api.login({
          email: DEMO_CREDENTIALS.SUPER_ADMIN.email,
          password: DEMO_CREDENTIALS.SUPER_ADMIN.pass,
        });
        localStorage.setItem("bloodbridge_token", res.access_token);
        setToken(res.access_token);
        setUser(res.user);
        setSelectedHospitalId(res.user.hospital_id || null);
      } catch (e) {
        console.error("Auto demo login failed", e);
      }
    }

    init();
  }, []);

  const login = async (email: string, pass: string) => {
    setLoading(true);
    try {
      const res = await api.login({ email, password: pass });
      localStorage.setItem("bloodbridge_token", res.access_token);
      setToken(res.access_token);
      setUser(res.user);
      setSelectedHospitalId(res.user.hospital_id || null);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("bloodbridge_token");
    setToken(null);
    setUser(null);
    setSelectedHospitalId(null);
  };

  const switchDemoRole = async (role: keyof typeof DEMO_CREDENTIALS) => {
    const cred = DEMO_CREDENTIALS[role];
    await login(cred.email, cred.pass);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        selectedHospitalId,
        hospitals,
        setSelectedHospitalId,
        login,
        logout,
        switchDemoRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
