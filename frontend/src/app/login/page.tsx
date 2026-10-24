"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ShieldCheck,
  Lock,
  Mail,
  ArrowRight,
  UserCheck,
  AlertCircle,
  Building2,
  Droplets,
} from "lucide-react";
import { useAuth, DEMO_CREDENTIALS } from "@/context/AuthContext";

export default function LoginPage() {
  const router = useRouter();
  const { login, switchDemoRole } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Failed to authenticate. Verify credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = async (role: keyof typeof DEMO_CREDENTIALS) => {
    setError(null);
    setLoading(true);
    try {
      await switchDemoRole(role);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Demo login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link href="/" className="inline-flex items-center gap-2.5 mb-3">
          <div className="w-10 h-10 rounded-xl bg-blood-600 flex items-center justify-center text-white shadow-md shadow-blood-600/30">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
              <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
            </svg>
          </div>
          <span className="font-bold text-2xl tracking-tight text-slate-900">BloodBridge AI</span>
        </Link>
        <h2 className="text-xl font-bold text-slate-900">Sign in to Hospital Intelligence Portal</h2>
        <p className="text-xs text-slate-500 mt-1">Authorized clinical & administrative staff access only</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg px-4 sm:px-0 space-y-6">
        {/* 1-Click Demo Persona Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-bold text-blood-700 uppercase tracking-wider mb-3">
            <UserCheck className="w-4 h-4 text-blood-600" />
            <span>Hackathon & Demo 1-Click Access</span>
          </div>
          <p className="text-xs text-slate-600 mb-4">
            Select a seeded persona to instantly authenticate with preconfigured role permissions:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {(Object.keys(DEMO_CREDENTIALS) as Array<keyof typeof DEMO_CREDENTIALS>).map((k) => {
              const c = DEMO_CREDENTIALS[k];
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => handleQuickDemo(k)}
                  disabled={loading}
                  className="text-left p-3 rounded-xl border border-slate-200 hover:border-blood-300 hover:bg-blood-50/50 transition group flex flex-col justify-between"
                >
                  <div>
                    <div className="text-xs font-bold text-slate-900 group-hover:text-blood-700 flex items-center justify-between">
                      <span>{c.label}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blood-600 transition" />
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">{c.desc}</div>
                  </div>
                  <div className="text-[10px] font-mono text-slate-400 mt-2 truncate">{c.email}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Standard Credentials Form */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">
            Or Sign in with Credentials
          </div>

          {error && (
            <div className="p-3 mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@bloodbridge.ai"
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blood-500 text-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blood-500 text-slate-900"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-lg transition shadow-xs flex items-center justify-center gap-2"
            >
              {loading ? "Authenticating..." : "Sign In to Dashboard"}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>

        <div className="text-center text-xs text-slate-500">
          <Link href="/" className="hover:text-blood-600 underline">
            ← Return to BloodBridge Homepage
          </Link>
        </div>
      </div>
    </div>
  );
}
