"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Clock,
  AlertTriangle,
  RotateCw,
  Droplets,
  Calendar,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Building2,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export default function ExpiryRisksPage() {
  const { user, selectedHospitalId } = useAuth();
  const [expiryData, setExpiryData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.getExpiryRisks(selectedHospitalId)
      .then((res) => setExpiryData(res))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [selectedHospitalId]);

  const policies = [
    { component: "Platelets", shelfLife: "5 Days", storage: "20°C - 24°C with continuous agitation", riskLevel: "Critical (Ultra-Short Shelf Life)" },
    { component: "Whole Blood", shelfLife: "35 Days", storage: "1°C - 6°C refrigerated vault", riskLevel: "Moderate" },
    { component: "Red Blood Cells (RBC)", shelfLife: "42 Days", storage: "1°C - 6°C with AS-1 / AS-3 additive", riskLevel: "Moderate" },
    { component: "Fresh Frozen Plasma (FFP)", shelfLife: "365 Days", storage: "-18°C or colder deep freeze", riskLevel: "Low" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Expiry Risk & Waste Reduction Engine</h1>
          <p className="text-xs text-slate-500 mt-1">
            Component-specific shelf-life tracking and automated First-In-First-Out (FIFO) stock rotation advice
          </p>
        </div>
      </div>

      {/* Component Shelf-Life Policies Banner */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {policies.map((p) => (
          <div key={p.component} className="card-healthcare p-4 bg-white border-slate-200 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-slate-900">{p.component}</span>
              <span className="font-extrabold text-blood-700 bg-blood-50 border border-blood-200 px-2 py-0.5 rounded text-[10px]">
                {p.shelfLife}
              </span>
            </div>
            <div className="text-[11px] text-slate-500">{p.storage}</div>
            <div className="text-[10px] text-amber-700 font-semibold pt-1 border-t border-slate-100">{p.riskLevel}</div>
          </div>
        ))}
      </div>

      {/* Active Expiry Bottlenecks List */}
      <div className="card-healthcare p-5 bg-white border-slate-200 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <h3 className="font-bold text-sm text-slate-900">Units Requiring Urgent Shelf Rotation</h3>
          </div>
          <span className="text-xs text-slate-500">Expiring in ≤ 7 Days</span>
        </div>

        {loading ? (
          <div className="text-center py-8 text-xs text-slate-400">Evaluating shelf-life status...</div>
        ) : (!expiryData?.insights || expiryData.insights.length === 0) ? (
          <div className="p-8 text-center text-xs text-slate-400">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <div className="font-bold text-slate-700 text-sm">No Units Approaching Critical Expiration</div>
            <div className="mt-1">All active units have safe remaining shelf-life buffers.</div>
          </div>
        ) : (
          <div className="space-y-3">
            {expiryData.insights.map((ins: any, idx: number) => (
              <div
                key={idx}
                className="p-4 rounded-xl border border-amber-200 bg-amber-50/40 text-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-blood-700 bg-white border border-blood-200 px-2 py-0.5 rounded">
                      {ins.blood_group}
                    </span>
                    <span className="font-bold text-slate-800 text-xs">{ins.component_type}</span>
                    <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
                      {ins.hours_to_first_expiry} hours remaining
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-600">
                    <strong>{ins.expiring_count} units</strong> expiring within 7 days (including {ins.expiring_in_3d} in next 72h).
                  </div>

                  <div className="text-[11px] text-slate-500">
                    Sample Tracked Unit IDs: {ins.sample_unit_numbers?.join(", ")}
                  </div>
                </div>

                <div className="space-y-1.5 md:max-w-md">
                  <div className="p-2 rounded bg-white border border-amber-100 text-[11px] text-slate-700">
                    <strong className="text-slate-900">Recommended Action:</strong> {ins.recommended_action}
                  </div>
                  <div className="flex justify-end gap-2">
                    <Link
                      href="/inventory"
                      className="px-3 py-1 bg-white border border-slate-300 text-slate-700 rounded font-semibold text-[11px] hover:bg-slate-50 transition"
                    >
                      Locate in Cold Room
                    </Link>
                    <Link
                      href="/ai/redistribution"
                      className="px-3 py-1 bg-blood-600 text-white rounded font-semibold text-[11px] hover:bg-blood-700 transition"
                    >
                      Evaluate Transfer
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
