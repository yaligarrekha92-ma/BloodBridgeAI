"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeftRight,
  Sparkles,
  Building2,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  RefreshCw,
  ArrowRight,
  Info,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export default function RedistributionPage() {
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.getRedistributionRecommendations();
      setRecommendations(res || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleScan = async () => {
    setScanning(true);
    try {
      const res = await api.generateRedistributionRecommendations();
      setRecommendations(res || []);
    } catch (err: any) {
      alert(err.message || "Scan failed");
    } finally {
      setScanning(false);
    }
  };

  const handleReview = async (id: number, action: "approve" | "reject") => {
    try {
      await api.reviewRecommendation(id, action, "Reviewed via Redistribution AI Workbench");
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to update recommendation");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Inter-Hospital Redistribution Engine</h1>
          <p className="text-xs text-slate-500 mt-1">
            Algorithmic surplus-deficit pairing across regional hospital facilities with transit safety constraints
          </p>
        </div>

        {user?.role !== "READ_ONLY_ANALYST" && (
          <button
            onClick={handleScan}
            disabled={scanning}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blood-600 hover:bg-blood-700 text-white rounded-lg text-xs font-semibold shadow-xs transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${scanning ? "animate-spin" : ""}`} />
            <span>{scanning ? "Scanning Network..." : "Run Regional Redistribution Scan"}</span>
          </button>
        )}
      </div>

      {/* Constraints Callout */}
      <div className="card-healthcare p-4 bg-white border-slate-200 text-xs text-slate-600 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="space-y-1">
          <div className="font-bold text-slate-900 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Algorithm Operational Constraints</span>
          </div>
          <p className="text-slate-500">
            Source facilities must retain at least 90% of their own 7-day projected demand. Units transferred must have at least 5 days of remaining shelf life to survive transit.
          </p>
        </div>
        <Link
          href="/transfers"
          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold whitespace-nowrap transition"
        >
          View Active Shipments →
        </Link>
      </div>

      {/* Recommendations Cards */}
      <div className="space-y-3.5">
        {loading ? (
          <div className="text-center py-12 text-xs text-slate-400">Loading redistribution proposals...</div>
        ) : recommendations.length === 0 ? (
          <div className="card-healthcare p-10 text-center text-xs text-slate-400 bg-white">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <div className="font-bold text-slate-700 text-sm">No Urgent Transfers Needed</div>
            <div className="mt-1">All hospital facilities currently hold balanced reserves relative to demand.</div>
          </div>
        ) : (
          recommendations.map((rec) => (
            <div
              key={rec.id}
              className="card-healthcare p-5 bg-white border-slate-200 shadow-xs space-y-4"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-blood-700 bg-blood-50 border border-blood-200 px-2 py-0.5 rounded">
                    {rec.blood_group}
                  </span>
                  <span className="font-bold text-sm text-slate-900">{rec.component_type}</span>
                  <span className="text-xs text-slate-400">• Transfer #{rec.id}</span>
                </div>

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

              {/* Source vs Dest Grid */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Origin / Surplus Hospital</div>
                  <div className="font-bold text-slate-900 text-sm">{rec.source_hospital_name}</div>
                  <div className="text-slate-600 pt-1">
                    Reserve Impact: <strong>{rec.source_stock_before}</strong> → <span className="text-emerald-700 font-bold">{rec.source_stock_after} units</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-blood-50/40 border border-blood-200 text-xs space-y-1">
                  <div className="text-[10px] text-blood-700 uppercase font-bold">Destination / Deficit Hospital</div>
                  <div className="font-bold text-slate-900 text-sm">{rec.destination_hospital_name}</div>
                  <div className="text-slate-600 pt-1">
                    Reserve Impact: <strong>{rec.dest_stock_before}</strong> → <span className="text-blood-700 font-bold">{rec.dest_stock_after} units</span>
                  </div>
                </div>
              </div>

              <div className="text-xs text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <strong className="text-slate-900">Clinical Optimization Rationale:</strong> {rec.reason}
              </div>

              {/* Action Buttons */}
              {rec.status === "Proposed" && user?.role !== "READ_ONLY_ANALYST" && (
                <div className="flex items-center justify-between pt-2">
                  <span className="text-[11px] text-slate-400">Human approval is required to schedule dispatch.</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleReview(rec.id, "reject")}
                      className="px-3.5 py-1.5 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold"
                    >
                      Reject Proposal
                    </button>
                    <button
                      onClick={() => handleReview(rec.id, "approve")}
                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs"
                    >
                      Authorize Inter-Hospital Transfer
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
