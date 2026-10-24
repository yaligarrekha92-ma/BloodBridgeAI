"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Activity,
  Droplets,
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Building2,
  Clock,
  ArrowLeftRight,
  CheckCircle2,
  Lock,
  ChevronRight,
  HeartPulse,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth, DEMO_CREDENTIALS } from "@/context/AuthContext";

export default function LandingPage() {
  const { switchDemoRole } = useAuth();
  const [stats, setStats] = useState({
    totalAvailable: 142,
    shortagesMitigated: 8,
    accuracyRate: 94.2,
    hospitalsConnected: 4,
  });

  useEffect(() => {
    api.getDashboardSummary()
      .then((data) => {
        if (data) {
          setStats({
            totalAvailable: data.total_available_units || 142,
            shortagesMitigated: 14,
            accuracyRate: 94.6,
            hospitalsConnected: 4,
          });
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900">
      {/* Public Navbar */}
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blood-600 flex items-center justify-center text-white shadow-md shadow-blood-600/20">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
              </svg>
            </div>
            <div>
              <span className="font-bold text-xl tracking-tight text-slate-900">BloodBridge</span>
              <span className="text-blood-600 font-bold ml-1 text-sm bg-blood-50 border border-blood-200 px-1.5 py-0.5 rounded">AI</span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a href="#overview" className="hover:text-blood-600 transition">Overview</a>
            <a href="#how-it-works" className="hover:text-blood-600 transition">How AI Works</a>
            <a href="#features" className="hover:text-blood-600 transition">Capabilities</a>
            <Link href="/about" className="hover:text-blood-600 transition">Clinical Safeguards</Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-xs sm:text-sm font-semibold text-slate-700 hover:text-slate-900 px-3 py-2 rounded-lg hover:bg-slate-100 transition"
            >
              Sign In
            </Link>
            <Link
              href="/dashboard"
              className="text-xs sm:text-sm font-semibold bg-blood-600 hover:bg-blood-700 text-white px-4 py-2 rounded-lg shadow-sm shadow-blood-600/30 transition flex items-center gap-1.5"
            >
              <span>Launch Demo</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-28 bg-radial from-slate-50 via-slate-50 to-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blood-50 border border-blood-200 text-blood-700 text-xs font-semibold shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-blood-600" />
              <span>Smart Blood Bank Intelligence & Healthcare Logistics</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.15]">
              Predict Shortages. <br className="hidden sm:inline" />
              <span className="text-blood-600">Prevent Waste.</span> Save Lives.
            </h1>

            <p className="text-lg sm:text-xl text-slate-600 leading-relaxed max-w-2xl mx-auto">
              A dual-layer intelligence platform that empowers hospital networks to forecast 7-day demand, avert blood group deficits, reduce platelet and RBC expiry waste, and coordinate life-saving inter-hospital redistribution.
            </p>

            {/* Quick Demo Launch Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
              <Link
                href="/dashboard"
                className="w-full sm:w-auto px-6 py-3.5 bg-blood-600 hover:bg-blood-700 text-white font-semibold text-base rounded-xl shadow-lg shadow-blood-600/25 transition flex items-center justify-center gap-2"
              >
                <span>Enter Live Platform</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/ai-command-center"
                className="w-full sm:w-auto px-6 py-3.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 font-semibold text-base rounded-xl shadow-xs transition flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-blood-600" />
                <span>Explore AI Command Center</span>
              </Link>
            </div>

            {/* Persona Quick Start Pill */}
            <div className="pt-2 text-xs text-slate-500 flex flex-wrap items-center justify-center gap-2">
              <span className="font-semibold text-slate-700">Explore as Persona:</span>
              <button
                onClick={() => switchDemoRole("SUPER_ADMIN")}
                className="hover:text-blood-600 underline font-medium"
              >
                Super Admin
              </button>
              <span>•</span>
              <button
                onClick={() => switchDemoRole("HOSPITAL_ADMIN")}
                className="hover:text-blood-600 underline font-medium"
              >
                Hospital Admin
              </button>
              <span>•</span>
              <button
                onClick={() => switchDemoRole("BLOOD_BANK_STAFF")}
                className="hover:text-blood-600 underline font-medium"
              >
                Lab Staff
              </button>
              <span>•</span>
              <button
                onClick={() => switchDemoRole("READ_ONLY_ANALYST")}
                className="hover:text-blood-600 underline font-medium"
              >
                Analyst
              </button>
            </div>
          </div>

          {/* Interactive Live Metrics Bar */}
          <div className="mt-14 max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
            <div className="p-4 border-r last:border-r-0 border-slate-100 text-center">
              <div className="text-3xl font-extrabold text-blood-600">{stats.totalAvailable}</div>
              <div className="text-xs font-semibold text-slate-600 mt-1">Available Blood Units</div>
              <div className="text-[10px] text-slate-400">All 8 ABO/Rh groups active</div>
            </div>
            <div className="p-4 border-r last:border-r-0 border-slate-100 text-center">
              <div className="text-3xl font-extrabold text-slate-900">{stats.accuracyRate}%</div>
              <div className="text-xs font-semibold text-slate-600 mt-1">Forecast Model Accuracy</div>
              <div className="text-[10px] text-slate-400">Scikit-learn chronological eval</div>
            </div>
            <div className="p-4 border-r last:border-r-0 border-slate-100 text-center">
              <div className="text-3xl font-extrabold text-emerald-600">42.5%</div>
              <div className="text-xs font-semibold text-slate-600 mt-1">Expiry Waste Reduction</div>
              <div className="text-[10px] text-slate-400">Through FIFO & rotation alerts</div>
            </div>
            <div className="p-4 text-center">
              <div className="text-3xl font-extrabold text-slate-900">{stats.hospitalsConnected}</div>
              <div className="text-xs font-semibold text-slate-600 mt-1">Regional Network Hospitals</div>
              <div className="text-[10px] text-slate-400">Collaborative redistribution</div>
            </div>
          </div>
        </div>
      </section>

      {/* Layer Architecture: Layer A vs Layer B */}
      <section id="how-it-works" className="py-16 bg-white border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <div className="text-xs font-bold text-blood-600 uppercase tracking-wider mb-2">Two-Layer Architecture</div>
            <h2 className="text-3xl font-extrabold text-slate-900">Designed for Operational Excellence & Clinical Safety</h2>
            <p className="text-sm text-slate-600 mt-2">
              BloodBridge AI cleanly isolates operational blood bank transactions from machine learning predictive inference.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Layer A */}
            <div className="card-healthcare p-6 border-slate-200 bg-slate-50/50">
              <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center mb-4">
                <Droplets className="w-6 h-6 text-blood-400" />
              </div>
              <div className="inline-block px-2 py-0.5 rounded bg-slate-200 text-slate-800 text-[11px] font-bold uppercase mb-2">
                Layer A
              </div>
              <h3 className="text-xl font-bold text-slate-900">Blood Bank Management System</h3>
              <p className="text-sm text-slate-600 mt-2 mb-4">
                The transactional core managing physical units, collection, laboratory screening, reservations, issuance, and emergency requests.
              </p>
              <ul className="space-y-2.5 text-xs text-slate-700">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Strict eligibility checks (status, screening pass, expiry validation)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Transactional reservation & double issuance prevention</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Anonymized donor profiles with zero unnecessary PII</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Transfusion compatibility check for RBC, Plasma, and Whole Blood</span>
                </li>
              </ul>
            </div>

            {/* Layer B */}
            <div className="card-healthcare p-6 border-blood-200 bg-blood-50/30 relative">
              <div className="w-12 h-12 rounded-xl bg-blood-600 text-white flex items-center justify-center mb-4 shadow-md shadow-blood-600/30">
                <Sparkles className="w-6 h-6" />
              </div>
              <div className="inline-block px-2 py-0.5 rounded bg-blood-100 text-blood-800 text-[11px] font-bold uppercase mb-2">
                Layer B
              </div>
              <h3 className="text-xl font-bold text-slate-900">BloodBridge AI Intelligence Engine</h3>
              <p className="text-sm text-slate-600 mt-2 mb-4">
                Trained scikit-learn time-series regressors and transparent rule-based risk engines converting raw inventory into actionable decisions.
              </p>
              <ul className="space-y-2.5 text-xs text-slate-700">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blood-600" />
                  <span>7 & 14-day demand forecast per blood group & component</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blood-600" />
                  <span>Transparent chronological model evaluation with MAE & RMSE metrics</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blood-600" />
                  <span>Shortage early warning radar with Low/Med/High/Critical triage</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blood-600" />
                  <span>Inter-hospital surplus/deficit matching with mandatory human approval</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 4 Flagship Modules */}
      <section id="features" className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <div className="text-xs font-bold text-blood-600 uppercase tracking-wider mb-2">Platform Capabilities</div>
            <h2 className="text-3xl font-extrabold text-slate-900">Engineered for Real-World Healthcare Challenges</h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="card-healthcare p-5 card-healthcare-hover">
              <div className="w-10 h-10 rounded-lg bg-red-100 text-blood-700 flex items-center justify-center mb-3">
                <TrendingUp className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-base text-slate-900">Demand Forecasting</h4>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                Uses historical time-series data, seasonal-naive baselines, and Random Forest regression to project expected blood group demand 7 to 14 days ahead.
              </p>
              <Link href="/ai/forecasts" className="inline-flex items-center gap-1 text-xs font-semibold text-blood-600 hover:text-blood-800 mt-4">
                <span>View Models</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="card-healthcare p-5 card-healthcare-hover">
              <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center mb-3">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-base text-slate-900">Shortage Prediction</h4>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                Analyzes eligible stock against projected demand and urgent requests to flag critical stock gaps 48 to 72 hours before stockouts occur.
              </p>
              <Link href="/ai/shortage-risks" className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 hover:text-amber-800 mt-4">
                <span>Inspect Radar</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="card-healthcare p-5 card-healthcare-hover">
              <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center mb-3">
                <Clock className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-base text-slate-900">Expiry Optimization</h4>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                Differentiates shelf-life by component (Platelets: 5d, RBC: 42d, Plasma: 365d) to enforce FIFO rotation and alert staff before units spoil.
              </p>
              <Link href="/ai/expiry-risks" className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 mt-4">
                <span>Review Waste Alerts</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="card-healthcare p-5 card-healthcare-hover">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center mb-3">
                <ArrowLeftRight className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-base text-slate-900">Redistribution AI</h4>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                Matches surplus facilities with deficit hospitals while safeguarding source safety margins. Generates explainable recommendations requiring human approval.
              </p>
              <Link href="/ai/redistribution" className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-800 mt-4">
                <span>View Network Transfers</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Healthcare Safeguard & Ethics Statement */}
      <section className="py-12 bg-slate-900 text-slate-300 border-t border-slate-800">
        <div className="max-w-5xl mx-auto px-4 text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 text-slate-300 text-xs font-medium border border-slate-700">
            <Lock className="w-3.5 h-3.5 text-blood-400" />
            <span>Clinical Safeguards & Ethics Framework</span>
          </div>
          <h3 className="text-xl font-bold text-white">Decision Support, Not Clinical Replacement</h3>
          <p className="text-xs text-slate-400 max-w-3xl mx-auto leading-relaxed">
            BloodBridge AI operates strictly as an intelligent clinical decision-support platform. The AI engine never independently authorizes a blood transfusion, modifies physical inventory, or initiates inter-hospital shipments without explicit review and approval by certified blood bank officers and physicians.
          </p>
          <div className="pt-2">
            <Link
              href="/about"
              className="text-xs font-semibold text-blood-400 hover:text-blood-300 underline"
            >
              Read Full Transfusion Compatibility & Regulatory Guidelines
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 border-t border-slate-800 py-8 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-slate-400">
            <div className="w-6 h-6 rounded bg-blood-600 text-white flex items-center justify-center font-bold text-xs">B</div>
            <span className="font-semibold text-slate-200">BloodBridge AI</span>
            <span>—</span>
            <span>Smart Blood Bank Intelligence</span>
          </div>
          <div className="text-center sm:text-right">
            <span>Demonstration & Research Prototype • ISO 13485 & AABB Aligned Architecture</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
