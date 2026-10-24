"use client";

import React, { useState, useEffect } from "react";
import {
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  Filter,
  Building2,
  Droplets,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export default function ShortageRisksPage() {
  const { user, selectedHospitalId } = useAuth();
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const loadAlerts = async (forceRefresh: boolean = false) => {
    if (forceRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await api.getShortageRisks(selectedHospitalId, severityFilter, forceRefresh);
      setAlerts(res || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAlerts(false);
  }, [selectedHospitalId, severityFilter]);

  const handleAcknowledge = async (id: number) => {
    try {
      await api.acknowledgeAlert(id, "Acknowledged by clinical supervisor");
      loadAlerts(false);
    } catch (err: any) {
      alert(err.message || "Failed to acknowledge");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Blood Shortage Early Warning Radar</h1>
          <p className="text-xs text-slate-500 mt-1">
            Algorithmic stock gap evaluation comparing current unreserved inventory against 7-day projected burn
          </p>
        </div>

        <button
          onClick={() => loadAlerts(true)}
          disabled={refreshing}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-xs transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-blood-600" : ""}`} />
          <span>Rescan Shortage Thresholds</span>
        </button>
      </div>

      {/* Filter */}
      <div className="card-healthcare p-4 bg-white border-slate-200 flex items-center gap-3">
        <span className="text-xs font-bold text-slate-500 uppercase">Severity Filter:</span>
        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="text-xs border border-slate-300 rounded-lg p-2 bg-slate-50 text-slate-700 font-medium"
        >
          <option value="">All Severity Levels</option>
          <option value="Critical">Critical Deficit</option>
          <option value="High">High Shortage Risk</option>
          <option value="Medium">Medium Warning</option>
        </select>
      </div>

      {/* Alerts Grid */}
      <div className="grid md:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-2 text-center py-12 text-xs text-slate-400">Scanning inventory buffers...</div>
        ) : alerts.length === 0 ? (
          <div className="col-span-2 card-healthcare p-10 text-center text-xs text-slate-400 bg-white">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <div className="font-bold text-slate-700 text-sm">No Active Shortage Risks Detected</div>
            <div className="mt-1">All blood groups and components maintain healthy safety buffers above forecasted demand.</div>
          </div>
        ) : (
          alerts.map((a) => (
            <div
              key={a.id}
              className={`card-healthcare p-5 border space-y-3 ${
                a.severity === "Critical"
                  ? "bg-red-50/40 border-red-200"
                  : a.severity === "High"
                  ? "bg-amber-50/40 border-amber-200"
                  : "bg-white border-slate-200"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-blood-700 bg-white border border-blood-200 px-2.5 py-0.5 rounded shadow-2xs">
                    {a.blood_group}
                  </span>
                  <div>
                    <div className="font-bold text-xs text-slate-900">{a.component_type}</div>
                    <div className="text-[10px] text-slate-400">{a.hospital_name || "Regional Network"}</div>
                  </div>
                </div>

                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    a.severity === "Critical"
                      ? "bg-red-100 text-red-800 animate-pulse"
                      : a.severity === "High"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-blue-100 text-blue-800"
                  }`}
                >
                  {a.severity}
                </span>
              </div>

              {/* Numbers Bar */}
              <div className="grid grid-cols-3 gap-2 p-2.5 rounded-lg bg-white/80 border border-slate-200/80 text-center text-xs">
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Available Stock</div>
                  <div className="font-extrabold text-slate-900 mt-0.5">{a.current_stock} units</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">7d Demand</div>
                  <div className="font-extrabold text-slate-900 mt-0.5">{a.expected_demand} units</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Projected Gap</div>
                  <div className="font-extrabold text-red-600 mt-0.5">-{a.stock_gap} units</div>
                </div>
              </div>

              <p className="text-xs text-slate-700 leading-relaxed">{a.reason}</p>

              <div className="p-2.5 rounded bg-slate-900 text-white text-[11px] font-medium flex items-center justify-between">
                <span>Action: {a.recommended_action}</span>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-[11px] text-slate-400">
                <span>Logged {new Date(a.created_at).toLocaleString()}</span>
                {a.is_acknowledged ? (
                  <span className="text-emerald-700 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Acknowledged</span>
                  </span>
                ) : (
                  <button
                    onClick={() => handleAcknowledge(a.id)}
                    className="font-semibold text-blood-600 hover:text-blood-800 underline"
                  >
                    Acknowledge Alert
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
