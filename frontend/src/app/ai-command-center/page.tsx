"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Clock,
  ArrowLeftRight,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Building2,
  ArrowRight,
  RefreshCw,
  Info,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export default function AICommandCenterPage() {
  const { user, selectedHospitalId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [shortageRisks, setShortageRisks] = useState<any[]>([]);
  const [expiryRisks, setExpiryRisks] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [forecasts, setForecasts] = useState<any[]>([]);
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [expandedWhy, setExpandedWhy] = useState<number | null>(null);

  const loadAIData = async () => {
    setRefreshing(true);
    try {
      const [shortages, expiry, recs, fcsts, evals] = await Promise.all([
        api.getShortageRisks(selectedHospitalId),
        api.getExpiryRisks(selectedHospitalId),
        api.getRedistributionRecommendations(),
        api.getForecasts({ hospital_id: selectedHospitalId, horizon_days: 7 }),
        api.getForecastEvaluations(),
      ]);
      setShortageRisks(shortages || []);
      setExpiryRisks(expiry?.insights || []);
      setRecommendations(recs || []);
      setForecasts(fcsts || []);
      setEvaluations(evals || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAIData();
  }, [selectedHospitalId]);

  const handleReview = async (recId: number, action: "approve" | "reject") => {
    try {
      await api.reviewRecommendation(recId, action, "Reviewed via AI Command Center");
      loadAIData();
    } catch (err: any) {
      alert(err.message || "Failed to update recommendation");
    }
  };

  const handleAcknowledge = async (alertId: number) => {
    try {
      await api.acknowledgeAlert(alertId, "Acknowledged by officer");
      loadAIData();
    } catch (err: any) {
      alert(err.message || "Failed to acknowledge");
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="card-healthcare p-6 bg-slate-900 text-white border-slate-800 relative overflow-hidden shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blood-950/80 border border-blood-800 text-blood-300 text-xs font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5 text-blood-400" />
              <span>Layer B — BloodBridge AI Intelligence Engine</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">AI Command Center</h1>
            <p className="text-xs text-slate-300 max-w-2xl mt-1 leading-relaxed">
              Synthesizing demand predictions, shelf-life deterioration, stockout risks, and cross-hospital redistribution opportunities with explainable AI (XAI) rationale.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadAIData}
              disabled={refreshing}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-blood-400" : ""}`} />
              <span>Rescan Engine</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800/80 text-xs">
          <div>
            <div className="text-slate-400 text-[11px]">Primary Model</div>
            <div className="font-bold text-white text-sm mt-0.5">BloodBridge-RF-v2.1</div>
            <div className="text-[10px] text-emerald-400">Random Forest Regressor</div>
          </div>
          <div>
            <div className="text-slate-400 text-[11px]">Evaluation Baseline</div>
            <div className="font-bold text-white text-sm mt-0.5">Seasonal Naive (7d)</div>
            <div className="text-[10px] text-slate-400">Chronological validation split</div>
          </div>
          <div>
            <div className="text-slate-400 text-[11px]">Active Shortage Alerts</div>
            <div className="font-bold text-blood-400 text-sm mt-0.5">{shortageRisks.length} Groups</div>
            <div className="text-[10px] text-slate-400">Low / Med / High / Critical</div>
          </div>
          <div>
            <div className="text-slate-400 text-[11px]">Inter-Hospital Suggestions</div>
            <div className="font-bold text-white text-sm mt-0.5">{recommendations.length} Pending</div>
            <div className="text-[10px] text-amber-400">Human Approval Required</div>
          </div>
        </div>
      </div>

      {/* Inter-Hospital Redistribution Recommendations with "Why this recommendation?" */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5 text-blood-600" />
            <h2 className="text-lg font-bold text-slate-900">Inter-Hospital Redistribution Suggestions</h2>
          </div>
          <span className="text-xs text-slate-500 font-medium">Safe Network Balancing</span>
        </div>

        {recommendations.length === 0 ? (
          <div className="card-healthcare p-8 text-center text-xs text-slate-400 bg-white">
            No inter-hospital transfers currently proposed. Regional stock is balanced within safety margins.
          </div>
        ) : (
          <div className="space-y-3">
            {recommendations.map((rec) => {
              const isExpanded = expandedWhy === rec.id;
              return (
                <div
                  key={rec.id}
                  className="card-healthcare bg-white border-slate-200 overflow-hidden shadow-xs hover:border-slate-300 transition"
                >
                  <div className="p-5">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      {/* Left: Transfer Flow */}
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blood-100 text-blood-800">
                            Proposed Transfer #{rec.id}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              rec.status === "Approved"
                                ? "bg-emerald-100 text-emerald-800"
                                : rec.status === "Rejected"
                                ? "bg-red-100 text-red-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {rec.status}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-sm font-bold text-slate-900">
                          <span className="text-slate-800">{rec.source_hospital_name}</span>
                          <ArrowRight className="w-4 h-4 text-blood-600 shrink-0" />
                          <span className="text-slate-800">{rec.destination_hospital_name}</span>
                        </div>

                        <div className="text-xs text-slate-600">
                          Suggested Volume: <strong className="text-blood-700">{rec.suggested_units} units</strong> of{" "}
                          <strong>{rec.blood_group} ({rec.component_type})</strong>
                        </div>
                      </div>

                      {/* Middle: Stock Balance Impact */}
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-[10px] text-slate-400 uppercase font-bold">Source Stock Impact</div>
                          <div className="font-semibold text-slate-800 mt-0.5">
                            {rec.source_stock_before} → <span className="text-emerald-700">{rec.source_stock_after} units</span>
                          </div>
                          <div className="text-[10px] text-slate-500">Maintains safe local buffer</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-400 uppercase font-bold">Destination Stock Impact</div>
                          <div className="font-semibold text-slate-800 mt-0.5">
                            {rec.dest_stock_before} → <span className="text-blood-700">{rec.dest_stock_after} units</span>
                          </div>
                          <div className="text-[10px] text-slate-500">Deficit resolved</div>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-2 whitespace-nowrap">
                        {rec.status === "Proposed" && user?.role !== "READ_ONLY_ANALYST" && (
                          <>
                            <button
                              onClick={() => handleReview(rec.id, "approve")}
                              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition"
                            >
                              Approve Transfer
                            </button>
                            <button
                              onClick={() => handleReview(rec.id, "reject")}
                              className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold transition"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => setExpandedWhy(isExpanded ? null : rec.id)}
                          className="flex items-center gap-1 text-xs text-blood-600 hover:text-blood-700 font-semibold px-2 py-1.5"
                        >
                          <span>{isExpanded ? "Hide Details" : "Why this recommendation?"}</span>
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* Expandable "Why this recommendation?" XAI Section */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-slate-100 bg-slate-50/70 p-4 rounded-xl text-xs space-y-3">
                        <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                          <HelpCircle className="w-4 h-4 text-blood-600" />
                          <span>Explainable AI (XAI) Recommendation Rationale</span>
                        </div>

                        <div className="grid md:grid-cols-2 gap-3 text-slate-700">
                          <div>
                            <span className="font-bold text-slate-900 block mb-0.5">1. What the system detected:</span>
                            <span>{rec.reason}</span>
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block mb-0.5">2. Supporting Data & Horizon:</span>
                            <span>
                              7-day machine-learning demand forecast, active eligible inventory with &ge; 5 days remaining shelf-life, and pending emergency requests.
                            </span>
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block mb-0.5">3. Why it matters:</span>
                            <span>
                              Averts an imminent stockout at {rec.destination_hospital_name} without creating a secondary deficit at {rec.source_hospital_name}.
                            </span>
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block mb-0.5">4. Clinical & Logistics Constraints:</span>
                            <span>
                              Requires temperature-controlled cold-chain transport (1°C to 6°C for RBCs) via MediExpress logistics with human sign-off.
                            </span>
                          </div>
                        </div>

                        <div className="p-2.5 rounded bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-medium flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0" />
                          <span>
                            Human in the loop: This suggestion remains strictly advisory. Physical inventory is never updated until an authorized administrator confirms the shipment.
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Grid: Shortage Risk Radar & Expiry Prevention */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Shortage Risk Radar */}
        <div className="card-healthcare p-5 bg-white border-slate-200 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-blood-600" />
              <h3 className="font-bold text-sm text-slate-900">Shortage Early Warning Radar</h3>
            </div>
            <Link href="/ai/shortage-risks" className="text-xs font-semibold text-blood-600 hover:underline">
              Full Radar View
            </Link>
          </div>

          <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
            {shortageRisks.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">
                No active shortage alerts. All blood groups exceed 7-day reserve buffers.
              </div>
            ) : (
              shortageRisks.map((a) => (
                <div
                  key={a.id}
                  className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                    a.severity === "Critical"
                      ? "bg-red-50/60 border-red-200"
                      : a.severity === "High"
                      ? "bg-amber-50/60 border-amber-200"
                      : "bg-slate-50 border-slate-200"
                  }`}
                >
                  <div className="flex items-center justify-between font-bold">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-extrabold text-blood-700 bg-white px-2 py-0.5 rounded border border-blood-200">
                        {a.blood_group}
                      </span>
                      <span className="text-slate-800">{a.component_type}</span>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        a.severity === "Critical"
                          ? "bg-red-100 text-red-800"
                          : a.severity === "High"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {a.severity} Shortage
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-700 leading-relaxed">{a.reason}</p>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/50 text-[10px]">
                    <span className="text-emerald-700 font-semibold">Action: {a.recommended_action}</span>
                    {!a.is_acknowledged && (
                      <button
                        onClick={() => handleAcknowledge(a.id)}
                        className="text-slate-500 hover:text-slate-800 underline font-medium"
                      >
                        Acknowledge
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Expiry Risk Prevention */}
        <div className="card-healthcare p-5 bg-white border-slate-200 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" />
              <h3 className="font-bold text-sm text-slate-900">Expiry Risk & FIFO Rotation Advice</h3>
            </div>
            <Link href="/ai/expiry-risks" className="text-xs font-semibold text-blood-600 hover:underline">
              Expiry Workbench
            </Link>
          </div>

          <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
            {expiryRisks.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">
                No units nearing critical expiration within 7 days.
              </div>
            ) : (
              expiryRisks.map((exp, idx) => (
                <div key={idx} className="p-3 rounded-xl border border-amber-200 bg-amber-50/40 text-xs space-y-1.5">
                  <div className="flex items-center justify-between font-bold">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-extrabold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                        {exp.blood_group}
                      </span>
                      <span className="text-slate-700">{exp.component_type}</span>
                    </div>
                    <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
                      {exp.hours_to_first_expiry}h to first expiry
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-600">
                    <strong>{exp.expiring_count} units</strong> expiring within 7 days (including {exp.expiring_in_3d} within 72h).
                  </div>

                  <div className="text-[10px] text-slate-800 bg-white p-2 rounded border border-amber-100">
                    <span className="font-bold text-blood-700">Recommendation:</span> {exp.recommended_action}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
