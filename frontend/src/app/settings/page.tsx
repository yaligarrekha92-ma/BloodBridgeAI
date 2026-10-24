"use client";

import React, { useState } from "react";
import {
  Settings,
  RotateCcw,
  Sliders,
  ShieldAlert,
  Building2,
  CheckCircle2,
  AlertTriangle,
  Info,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export default function SettingsPage() {
  const { user } = useAuth();
  const [resetting, setResetting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  // Settings values
  const [shelfLifePlatelets, setShelfLifePlatelets] = useState("5");
  const [shelfLifeRBC, setShelfLifeRBC] = useState("42");
  const [shelfLifeWholeBlood, setShelfLifeWholeBlood] = useState("35");
  const [shelfLifePlasma, setShelfLifePlasma] = useState("365");

  const [criticalShortageRatio, setCriticalShortageRatio] = useState("0.35");
  const [highShortageRatio, setHighShortageRatio] = useState("0.65");

  const handleResetDemoDatabase = async () => {
    if (!confirm("Reset database to clean initial demonstration state? All synthetic transactions will reset to default.")) {
      return;
    }
    setResetting(true);
    setResetSuccess(false);
    try {
      await api.resetDatabase();
      setResetSuccess(true);
      setTimeout(() => setResetSuccess(false), 5000);
    } catch (err: any) {
      alert(err.message || "Failed to reset database");
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">System & Model Configuration</h1>
          <p className="text-xs text-slate-500 mt-1">
            Component shelf-life parameters, AI shortage thresholds, and demonstration state management
          </p>
        </div>
      </div>

      {resetSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>Database successfully reset and re-seeded with clean demonstration records.</span>
        </div>
      )}

      {/* Demo Reset Card */}
      <div className="card-healthcare p-5 bg-white border-slate-200 space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <RotateCcw className="w-4 h-4 text-blood-600" />
          <h3 className="font-bold text-sm text-slate-900">Demonstration State Reset</h3>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">
          Reset all hospitals, donors, blood units, emergency requests, forecasts, and redistribution logs back to the known baseline benchmark state for judge demonstrations.
        </p>
        <button
          onClick={handleResetDemoDatabase}
          disabled={resetting}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-xs transition"
        >
          {resetting ? "Resetting and Re-seeding Database..." : "Reset Demo Database to Initial State"}
        </button>
      </div>

      {/* Component Shelf-Life Policies */}
      <div className="card-healthcare p-5 bg-white border-slate-200 space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <Sliders className="w-4 h-4 text-slate-600" />
          <h3 className="font-bold text-sm text-slate-900">Component Shelf-Life Policies (Days)</h3>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Platelets (Days)</label>
            <input
              type="number"
              value={shelfLifePlatelets}
              onChange={(e) => setShelfLifePlatelets(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg text-slate-900 font-bold"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">Standard: 5 days</span>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Red Blood Cells (Days)</label>
            <input
              type="number"
              value={shelfLifeRBC}
              onChange={(e) => setShelfLifeRBC(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg text-slate-900 font-bold"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">Standard: 42 days</span>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Whole Blood (Days)</label>
            <input
              type="number"
              value={shelfLifeWholeBlood}
              onChange={(e) => setShelfLifeWholeBlood(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg text-slate-900 font-bold"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">Standard: 35 days</span>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Plasma (Days)</label>
            <input
              type="number"
              value={shelfLifePlasma}
              onChange={(e) => setShelfLifePlasma(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg text-slate-900 font-bold"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">Standard: 365 days</span>
          </div>
        </div>
      </div>

      {/* AI Risk Threshold Configuration */}
      <div className="card-healthcare p-5 bg-white border-slate-200 space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <ShieldAlert className="w-4 h-4 text-blood-600" />
          <h3 className="font-bold text-sm text-slate-900">Shortage Sensitivity Ratios</h3>
        </div>

        <p className="text-xs text-slate-600">
          Threshold ratios of (Available Stock / Forecasted 7-Day Demand) used by the shortage prediction radar:
        </p>

        <div className="grid sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Critical Deficit Ratio (&lt; x)</label>
            <input
              type="text"
              value={criticalShortageRatio}
              onChange={(e) => setCriticalShortageRatio(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg font-bold"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">Default: 0.35 (less than 2.5 days of supply)</span>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">High Shortage Risk Ratio (&lt; x)</label>
            <input
              type="text"
              value={highShortageRatio}
              onChange={(e) => setHighShortageRatio(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg font-bold"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">Default: 0.65 (less than 4.5 days of supply)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
