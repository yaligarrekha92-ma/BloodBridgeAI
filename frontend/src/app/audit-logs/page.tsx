"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  Search,
  Filter,
  RefreshCw,
  Lock,
  User,
  Calendar,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export default function AuditLogsPage() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [resourceFilter, setResourceFilter] = useState("");

  const loadLogs = async () => {
    setLoading(true);
    try {
      const res = await api.getAuditLogs(resourceFilter);
      setLogs(res || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [resourceFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Audit Trail & Chain of Custody</h1>
          <p className="text-xs text-slate-500 mt-1">
            Immutable regulatory compliance log recording all unit state transitions, reservations, issuances, and transfers
          </p>
        </div>

        <button
          onClick={loadLogs}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-xs"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Logs</span>
        </button>
      </div>

      {/* Filter */}
      <div className="card-healthcare p-4 bg-white border-slate-200 flex items-center gap-3">
        <span className="text-xs font-bold text-slate-500 uppercase">Resource Filter:</span>
        <select
          value={resourceFilter}
          onChange={(e) => setResourceFilter(e.target.value)}
          className="text-xs border border-slate-300 rounded-lg p-2 bg-slate-50 text-slate-700 font-medium"
        >
          <option value="">All Audited Resources</option>
          <option value="BloodUnit">BloodUnit (Intake, Reserve, Issue)</option>
          <option value="BloodRequest">BloodRequest</option>
          <option value="TransferRecommendation">TransferRecommendation</option>
          <option value="BloodTransfer">BloodTransfer</option>
        </select>
      </div>

      {/* Logs Table */}
      <div className="card-healthcare bg-white border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Timestamp (UTC)</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Resource</th>
                <th className="py-3 px-4">User Officer</th>
                <th className="py-3 px-4">Audit Details</th>
                <th className="py-3 px-4">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">Loading audit trail...</td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">No audit records found.</td>
                </tr>
              ) : (
                logs.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 text-slate-500 font-mono">
                      {new Date(l.timestamp).toISOString().replace("T", " ").substring(0, 19)}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">{l.action}</td>
                    <td className="py-3 px-4">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                        {l.resource_type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-medium">{l.user_email || "System"}</td>
                    <td className="py-3 px-4 text-slate-600 max-w-md">{l.details}</td>
                    <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">{l.ip_address}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
