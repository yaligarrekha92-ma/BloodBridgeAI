"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Droplets,
  PackageCheck,
  AlertTriangle,
  Clock,
  TrendingUp,
  Activity,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Send,
  Building2,
  RefreshCw,
  Info,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
} from "recharts";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const COMPONENT_COLORS: Record<string, string> = {
  "Red Blood Cells": "#dc2626",
  "Whole Blood": "#991b1b",
  "Platelets": "#f59e0b",
  "Plasma": "#3b82f6",
};

export default function DashboardPage() {
  const { user, selectedHospitalId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      setRefreshing(true);
      const res = await api.getDashboardSummary(selectedHospitalId);
      setData(res);
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedHospitalId]);

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
        <div className="w-8 h-8 border-3 border-blood-600 border-t-transparent rounded-full animate-spin"></div>
        <div className="text-xs font-semibold text-slate-500">Loading BloodBank Intelligence Dashboard...</div>
      </div>
    );
  }

  // Transform stock by blood group for BarChart
  const bgChartData: { group: string; units: number }[] = data?.stock_by_blood_group
    ? Object.entries(data.stock_by_blood_group).map(([group, count]) => ({
        group,
        units: Number(count),
      }))
    : [];

  // Transform component breakdown for Donut
  const compChartData: { name: string; value: number }[] = data?.stock_by_component
    ? Object.entries(data.stock_by_component).map(([component, count]) => ({
        name: component,
        value: Number(count),
      }))
    : [];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Executive Intelligence Dashboard</h1>
            <span className="text-[11px] font-semibold bg-blood-50 text-blood-700 border border-blood-200 px-2 py-0.5 rounded-full">
              Live Overview
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time blood reserves, shortage forecasting, expiry risks, and AI recommendations
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-semibold text-slate-700 shadow-xs transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-blood-600" : ""}`} />
            <span>Refresh Data</span>
          </button>
          <Link
            href="/ai-command-center"
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blood-600 hover:bg-blood-700 text-white rounded-lg text-xs font-semibold shadow-xs transition"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Command Center</span>
          </Link>
        </div>
      </div>

      {/* Top 6 KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Total Available Units */}
        <div className="card-healthcare p-4 bg-white border-slate-200">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-semibold">Available Units</span>
            <Droplets className="w-4 h-4 text-blood-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{data?.total_available_units || 0}</div>
          <div className="text-[10px] text-emerald-600 font-medium mt-1">Eligible & screened</div>
        </div>

        {/* Units Reserved */}
        <div className="card-healthcare p-4 bg-white border-slate-200">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-semibold">Reserved Units</span>
            <PackageCheck className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{data?.units_reserved || 0}</div>
          <div className="text-[10px] text-slate-500 font-medium mt-1">Held for approved cases</div>
        </div>

        {/* Units Approaching Expiry */}
        <div className="card-healthcare p-4 bg-white border-slate-200">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-semibold">Expiring ≤ 7d</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-extrabold text-amber-600">{data?.units_approaching_expiry || 0}</div>
          <div className="text-[10px] text-amber-700 font-medium mt-1">Priority for rotation</div>
        </div>

        {/* Open Emergency Requests */}
        <div className="card-healthcare p-4 bg-white border-slate-200">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-semibold">Emergency Requests</span>
            <Send className="w-4 h-4 text-red-600" />
          </div>
          <div className="text-2xl font-extrabold text-red-600">{data?.open_emergency_requests || 0}</div>
          <div className="text-[10px] text-red-600 font-medium mt-1">Requires triage</div>
        </div>

        {/* Shortage Risk Groups */}
        <div className="card-healthcare p-4 bg-white border-slate-200">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-semibold">Shortage Alerts</span>
            <AlertTriangle className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-extrabold text-purple-700">{data?.shortage_risk_groups_count || 0}</div>
          <div className="text-[10px] text-purple-600 font-medium mt-1">Deficit groups flagged</div>
        </div>

        {/* Predicted 7-day Demand */}
        <div className="card-healthcare p-4 bg-white border-slate-200">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-semibold">Predicted 7d Demand</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{Math.round(data?.predicted_7d_demand || 48)}</div>
          <div className="text-[10px] text-slate-500 font-medium mt-1">Machine learning estimate</div>
        </div>
      </div>

      {/* AI Top Insights Banner */}
      {data?.ai_top_insights && data.ai_top_insights.length > 0 && (
        <div className="card-healthcare p-4 bg-gradient-to-r from-blood-900 via-slate-900 to-slate-900 text-white border-slate-800 shadow-md">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blood-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-blood-300">
                AI Intelligence Engine — Real-Time Priority Recommendations
              </span>
            </div>
            <Link
              href="/ai-command-center"
              className="text-[11px] font-semibold text-blood-300 hover:text-white flex items-center gap-1"
            >
              <span>View All Insights in AI Command Center</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid md:grid-cols-3 gap-3">
            {data.ai_top_insights.map((ins: any, idx: number) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/80 hover:border-slate-600 transition"
              >
                <div className="flex items-center justify-between text-[10px] font-bold mb-1">
                  <span className="text-blood-400 uppercase">{ins.category}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded ${
                      ins.urgency === "High"
                        ? "bg-red-950 text-red-300 border border-red-800"
                        : "bg-amber-950 text-amber-300 border border-amber-800"
                    }`}
                  >
                    {ins.urgency} Urgency
                  </span>
                </div>
                <div className="font-bold text-xs text-white mb-1">{ins.title}</div>
                <div className="text-[11px] text-slate-300 leading-relaxed mb-2 line-clamp-2">{ins.message}</div>
                <div className="text-[10px] text-emerald-400 font-medium bg-slate-900/60 p-1.5 rounded border border-slate-800">
                  <span className="font-bold">Next Action:</span> {ins.recommended_action}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Charts Section */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Demand vs Stock by Blood Group */}
        <div className="lg:col-span-2 card-healthcare p-5 bg-white border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm text-slate-900">Current Stock vs 7-Day Predicted Demand</h3>
              <p className="text-xs text-slate-500">Inventory reserve balance per ABO/Rh blood group</p>
            </div>
            <span className="text-[10px] font-semibold text-slate-400 uppercase">Unit Counts</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.demand_vs_stock || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="blood_group" tick={{ fontSize: 11, fill: "#64748b" }} />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    border: "none",
                    borderRadius: "0.5rem",
                    color: "#fff",
                    fontSize: "12px",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                <Bar dataKey="current_stock" name="Current Available Stock" fill="#dc2626" radius={[4, 4, 0, 0]} />
                <Bar dataKey="forecasted_demand" name="7-Day Predicted Demand" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Component Distribution (Donut Chart) */}
        <div className="card-healthcare p-5 bg-white border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm text-slate-900">Inventory by Component</h3>
              <p className="text-xs text-slate-500">Distribution across active units</p>
            </div>
          </div>

          <div className="h-48 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={compChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {compChartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COMPONENT_COLORS[entry.name] || "#64748b"}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    border: "none",
                    borderRadius: "0.5rem",
                    color: "#fff",
                    fontSize: "12px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-slate-100">
            {compChartData.map((c) => (
              <div key={c.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: COMPONENT_COLORS[c.name] || "#64748b" }}
                  />
                  <span className="text-slate-600 font-medium">{c.name}</span>
                </div>
                <span className="font-bold text-slate-900">{c.value} units</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Lower Section: Urgent Requests & Expiry Risk Tracker */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Urgent Emergency Requests */}
        <div className="card-healthcare p-5 bg-white border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Send className="w-4 h-4 text-blood-600" />
              <h3 className="font-bold text-sm text-slate-900">Urgent & Emergency Requests</h3>
            </div>
            <Link href="/requests" className="text-xs font-semibold text-blood-600 hover:underline">
              View All
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {(!data?.recent_emergency_requests || data.recent_emergency_requests.length === 0) ? (
              <div className="p-4 text-center text-xs text-slate-400">No open emergency requests.</div>
            ) : (
              data.recent_emergency_requests.map((r: any) => (
                <div key={r.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{r.request_code}</span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          r.urgency_level === "Emergency"
                            ? "bg-red-100 text-red-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {r.urgency_level}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Patient Ref: {r.patient_ref} • Needed by: {r.required_by}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-blood-700 text-sm bg-blood-50 border border-blood-200 px-2 py-0.5 rounded">
                      {r.units_requested}x {r.blood_group}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Expiry Risk Overview */}
        <div className="card-healthcare p-5 bg-white border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" />
              <h3 className="font-bold text-sm text-slate-900">Units Approaching Expiration</h3>
            </div>
            <Link href="/ai/expiry-risks" className="text-xs font-semibold text-blood-600 hover:underline">
              Manage Expiry
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {(!data?.expiry_risk_summary || data.expiry_risk_summary.length === 0) ? (
              <div className="p-4 text-center text-xs text-slate-400">All inventory units within safe expiry buffers.</div>
            ) : (
              data.expiry_risk_summary.map((item: any, idx: number) => (
                <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 px-2 py-0.5 bg-slate-100 rounded text-xs">
                      {item.blood_group}
                    </span>
                    <span className="text-slate-600 font-medium">{item.component_type}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                      {item.units_expiring} units ≤ 7d
                    </span>
                    <Link
                      href="/inventory"
                      className="text-[11px] text-slate-400 hover:text-slate-700 font-semibold"
                    >
                      Locate →
                    </Link>
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
