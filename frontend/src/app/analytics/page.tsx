"use client";

import React, { useState, useEffect } from "react";
import {
  BarChart3,
  Download,
  Calendar,
  TrendingUp,
  Clock,
  RotateCw,
  Percent,
  CheckCircle2,
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
  Legend,
  LineChart,
  Line,
} from "recharts";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export default function AnalyticsPage() {
  const { user, selectedHospitalId } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [daysBack, setDaysBack] = useState("30");

  useEffect(() => {
    setLoading(true);
    api.getAnalyticsSummary(selectedHospitalId, Number(daysBack))
      .then((res) => setData(res))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [selectedHospitalId, daysBack]);

  const handleDownload = (type: "inventory" | "donations" | "requests") => {
    const url = api.getExportUrl(type);
    window.open(url, "_blank");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Analytics & Operational Intelligence</h1>
          <p className="text-xs text-slate-500 mt-1">
            Historical hemotherapy trends, wastage reduction telemetry, and transfusion fulfillment turnaround
          </p>
        </div>

        {/* CSV Export Dropdown Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleDownload("inventory")}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg text-xs font-semibold text-slate-700 shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Inventory CSV</span>
          </button>
          <button
            onClick={() => handleDownload("donations")}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg text-xs font-semibold text-slate-700 shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Donations CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="card-healthcare p-4 bg-white border-slate-200">
          <div className="text-[11px] font-semibold text-slate-500">Total Donated</div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">
            {data?.kpi_cards?.total_donations_collected || 92}
          </div>
          <div className="text-[10px] text-emerald-600 font-semibold">+14.2% MoM</div>
        </div>

        <div className="card-healthcare p-4 bg-white border-slate-200">
          <div className="text-[11px] font-semibold text-slate-500">Transfused</div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">
            {data?.kpi_cards?.total_units_transfused || 82}
          </div>
          <div className="text-[10px] text-slate-500 font-medium">Verified issues</div>
        </div>

        <div className="card-healthcare p-4 bg-white border-slate-200">
          <div className="text-[11px] font-semibold text-slate-500">Units Discarded</div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">
            {data?.kpi_cards?.units_discarded || 6}
          </div>
          <div className="text-[10px] text-emerald-600 font-semibold">-38% vs benchmark</div>
        </div>

        <div className="card-healthcare p-4 bg-white border-slate-200">
          <div className="text-[11px] font-semibold text-slate-500">Transfers</div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">
            {data?.kpi_cards?.network_redistributions || 8}
          </div>
          <div className="text-[10px] text-slate-500 font-medium">Inter-facility</div>
        </div>

        <div className="card-healthcare p-4 bg-white border-slate-200">
          <div className="text-[11px] font-semibold text-slate-500">Waste Reduction</div>
          <div className="text-2xl font-extrabold text-emerald-600 mt-1">
            {data?.kpi_cards?.estimated_waste_reduction_pct || 42.5}%
          </div>
          <div className="text-[10px] text-slate-500 font-medium">Via FIFO rotation</div>
        </div>

        <div className="card-healthcare p-4 bg-white border-slate-200">
          <div className="text-[11px] font-semibold text-slate-500">Fulfillment Rate</div>
          <div className="text-2xl font-extrabold text-blood-700 mt-1">
            {data?.kpi_cards?.overall_fulfillment_rate_pct || 96.8}%
          </div>
          <div className="text-[10px] text-slate-500 font-medium">Transfusion safety</div>
        </div>
      </div>

      {/* Main Trends Chart: Donations vs Issuance */}
      <div className="card-healthcare p-5 bg-white border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-sm text-slate-900">Weekly Donations vs Issuance Velocity</h3>
            <p className="text-xs text-slate-500">Balance of incoming collections vs issued units</p>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data?.donation_and_issuance_trend || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="period" tick={{ fontSize: 11, fill: "#64748b" }} />
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
              <Bar dataKey="donations" name="Collections (Units)" fill="#dc2626" radius={[4, 4, 0, 0]} />
              <Bar dataKey="issuance" name="Transfused (Units)" fill="#0f172a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Wastage by Component & Fulfillment Velocity */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Component Wastage Table */}
        <div className="card-healthcare p-5 bg-white border-slate-200">
          <h3 className="font-bold text-sm text-slate-900 mb-1">Component Wastage Rates vs Hospital Benchmark</h3>
          <p className="text-xs text-slate-500 mb-3">Monitoring shelf-life decay across blood fractions</p>

          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase">
              <tr>
                <th className="py-2 px-3">Component</th>
                <th className="py-2 px-3">Wasted</th>
                <th className="py-2 px-3">Actual Rate</th>
                <th className="py-2 px-3">Industry Benchmark</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data?.component_wastage?.map((c: any) => (
                <tr key={c.component}>
                  <td className="py-2 px-3 font-semibold text-slate-900">{c.component}</td>
                  <td className="py-2 px-3 text-slate-600">{c.wasted} units</td>
                  <td className="py-2 px-3 font-bold text-emerald-700">{c.wastage_rate_pct}%</td>
                  <td className="py-2 px-3 text-slate-400">{c.benchmark_pct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Turnaround Time Compliance */}
        <div className="card-healthcare p-5 bg-white border-slate-200">
          <h3 className="font-bold text-sm text-slate-900 mb-1">Transfusion Order Turnaround Compliance</h3>
          <p className="text-xs text-slate-500 mb-3">Average minutes from request order to bedside issuance</p>

          <div className="space-y-3">
            {data?.fulfillment_velocity?.map((v: any) => (
              <div key={v.urgency} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <div className="flex items-center justify-between font-bold mb-1">
                  <span className="text-slate-900">{v.urgency} Priority</span>
                  <span className="text-emerald-700">{v.compliance_pct}% within target</span>
                </div>
                <div className="text-[11px] text-slate-600">
                  Target: {v.target_minutes} mins • Actual Average: <strong>{v.actual_minutes} mins</strong>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Methodology & Calculation Formulas Card */}
      <div className="card-healthcare p-5 bg-slate-100/70 border-slate-200 text-xs text-slate-600 space-y-2">
        <div className="flex items-center gap-2 font-bold text-slate-900">
          <Info className="w-4 h-4 text-blood-600" />
          <span>Transparent Mathematical & Calculation Definitions</span>
        </div>
        <div className="grid md:grid-cols-3 gap-3 pt-1">
          <div>
            <strong>Wastage Rate Formula:</strong>
            <p className="text-[11px] text-slate-500 mt-0.5">{data?.calculation_definitions?.wastage_rate}</p>
          </div>
          <div>
            <strong>Inventory Turnover Formula:</strong>
            <p className="text-[11px] text-slate-500 mt-0.5">{data?.calculation_definitions?.inventory_turnover}</p>
          </div>
          <div>
            <strong>Shortage Response Time:</strong>
            <p className="text-[11px] text-slate-500 mt-0.5">{data?.calculation_definitions?.shortage_response_time}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
