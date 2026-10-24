"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ShieldAlert,
  Droplets,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  FileText,
  Activity,
} from "lucide-react";
import { api } from "@/lib/api";

export default function AboutPage() {
  const [donorGroup, setDonorGroup] = useState("O-");
  const [recipientGroup, setRecipientGroup] = useState("AB+");
  const [component, setComponent] = useState("Red Blood Cells");
  const [checkResult, setCheckResult] = useState<any>(null);
  const [checking, setChecking] = useState(false);

  const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
  const components = ["Red Blood Cells", "Whole Blood", "Platelets", "Plasma"];

  const handleTestCompatibility = async () => {
    setChecking(true);
    try {
      const res = await api.checkCompatibility(donorGroup, recipientGroup, component);
      setCheckResult(res);
    } catch (err: any) {
      console.error(err);
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blood-600 flex items-center justify-center text-white font-bold">
              B
            </div>
            <span className="font-bold text-lg text-slate-900">BloodBridge AI</span>
          </Link>
          <div className="flex items-center gap-4 text-xs font-semibold">
            <Link href="/" className="text-slate-600 hover:text-slate-900">
              Home
            </Link>
            <Link
              href="/dashboard"
              className="bg-blood-600 hover:bg-blood-700 text-white px-3.5 py-1.5 rounded-lg transition"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-12 flex-1 space-y-12">
        {/* Title */}
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blood-50 border border-blood-200 text-blood-700 text-xs font-semibold mb-3">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Clinical Verification & Transfusion Safeguards</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900">
            Healthcare Safeguards & Compatibility Principles
          </h1>
          <p className="text-sm text-slate-600 mt-2 max-w-3xl leading-relaxed">
            BloodBridge AI is an AI-powered clinical decision-support platform designed to assist authorized healthcare professionals in forecasting blood demand, mitigating regional shortages, reducing shelf-life expiry waste, and coordinating inter-hospital logistics.
          </p>
        </div>

        {/* Interactive Clinical Compatibility Simulator */}
        <div className="card-healthcare p-6 border-slate-200 bg-white space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <Activity className="w-4 h-4 text-blood-600" />
            <span>Interactive Hemotherapy Compatibility Verification Simulator</span>
          </div>
          <p className="text-xs text-slate-600">
            Test how BloodBridge AI validates donor-recipient hemotherapy safety across different blood components according to AABB guidelines.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Donor Blood Group</label>
              <select
                value={donorGroup}
                onChange={(e) => setDonorGroup(e.target.value)}
                className="w-full text-xs p-2 border border-slate-300 rounded-lg bg-slate-50 font-semibold"
              >
                {bloodGroups.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Recipient Blood Group</label>
              <select
                value={recipientGroup}
                onChange={(e) => setRecipientGroup(e.target.value)}
                className="w-full text-xs p-2 border border-slate-300 rounded-lg bg-slate-50 font-semibold"
              >
                {bloodGroups.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Component Type</label>
              <select
                value={component}
                onChange={(e) => setComponent(e.target.value)}
                className="w-full text-xs p-2 border border-slate-300 rounded-lg bg-slate-50 font-semibold"
              >
                {components.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={handleTestCompatibility}
            disabled={checking}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-lg transition"
          >
            {checking ? "Checking Guidelines..." : "Run Compatibility Verification"}
          </button>

          {checkResult && (
            <div
              className={`p-4 rounded-xl border mt-4 text-xs space-y-2 ${
                checkResult.compatible
                  ? "bg-emerald-50 border-emerald-200 text-emerald-950"
                  : "bg-red-50 border-red-200 text-red-950"
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-sm">
                {checkResult.compatible ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span>CLINICALLY COMPATIBLE — Transfusion Approved</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5 text-red-600" />
                    <span>INCOMPATIBLE — Transfusion Contraindicated</span>
                  </>
                )}
              </div>
              <p className="leading-relaxed">{checkResult.clinical_explanation}</p>
              <div className="flex flex-wrap gap-4 pt-2 text-[11px] font-semibold opacity-85">
                <div>Risk Category: <span className="underline">{checkResult.transfusion_risk_category}</span></div>
                <div>Standard Reference: <span className="underline">{checkResult.guidelines_reference}</span></div>
              </div>
            </div>
          )}
        </div>

        {/* Clinical Guidelines Matrix */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="card-healthcare p-6 border-slate-200 bg-white">
            <h3 className="font-bold text-base text-slate-900 mb-2">Red Blood Cells (RBC) Guidelines</h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-3">
              Red blood cell compatibility focuses on recipient antibodies against donor red cell surface antigens (A, B, and RhD).
            </p>
            <ul className="text-xs text-slate-700 space-y-1.5 list-disc pl-4">
              <li><strong>O- is the Universal RBC Donor:</strong> Lacks A, B, and Rh antigens. Essential in emergency massive transfusion protocols prior to crossmatch completion.</li>
              <li><strong>AB+ is the Universal RBC Recipient:</strong> Expresses A, B, and Rh antigens and lacks circulating isohemagglutinins against donor cells.</li>
              <li>Rh-negative patients must receive Rh-negative RBCs whenever possible to prevent alloimmunization (especially females of childbearing potential).</li>
            </ul>
          </div>

          <div className="card-healthcare p-6 border-slate-200 bg-white">
            <h3 className="font-bold text-base text-slate-900 mb-2">Plasma & Platelet Rules (Reversal)</h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-3">
              Plasma compatibility operates in reverse of RBCs because the isohemagglutinins (antibodies) reside in the donor plasma rather than on cell membranes.
            </p>
            <ul className="text-xs text-slate-700 space-y-1.5 list-disc pl-4">
              <li><strong>AB is the Universal Plasma Donor:</strong> Contains neither anti-A nor anti-B antibodies, making it universally safe for all recipient groups.</li>
              <li><strong>O is the Universal Plasma Recipient:</strong> Can receive plasma from any blood group without antibody-induced hemolysis.</li>
              <li>Whole Blood transfusions strictly require identical ABO/Rh matching in standard clinical protocols.</li>
            </ul>
          </div>
        </div>

        {/* Regulatory & Ethical Notice */}
        <div className="card-healthcare p-6 border-amber-200 bg-amber-50/40 text-xs text-amber-900 space-y-3">
          <div className="flex items-center gap-2 font-bold text-sm text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-700" />
            <span>Important Regulatory & Clinical Notice</span>
          </div>
          <p className="leading-relaxed">
            BloodBridge AI is intended as operational intelligence and predictive clinical decision support. Transfusion decisions, blood unit reservations, unit issuance, and inter-hospital transfers require independent verification by qualified medical professionals according to local hospital regulations and accredited blood bank guidelines (such as AABB, FDA 21 CFR Part 606, or WHO Blood Transfusion Safety standards).
          </p>
          <p className="leading-relaxed">
            All patient records and donor identifiers displayed within this demonstration are synthetic, anonymized, and do not represent actual protected health information (PHI).
          </p>
        </div>
      </main>
    </div>
  );
}
