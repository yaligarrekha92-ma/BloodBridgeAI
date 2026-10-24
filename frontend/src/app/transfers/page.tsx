"use client";

import React, { useState, useEffect } from "react";
import {
  ArrowLeftRight,
  Truck,
  CheckCircle2,
  Clock,
  Building2,
  Plus,
  RefreshCw,
  PackageCheck,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export default function TransfersPage() {
  const { user, selectedHospitalId } = useAuth();
  const [transfers, setTransfers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTransfers = async () => {
    setLoading(true);
    try {
      const res = await api.getTransfers({ hospital_id: selectedHospitalId });
      setTransfers(res || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransfers();
  }, [selectedHospitalId]);

  const handleDispatch = async (id: number) => {
    try {
      await api.dispatchTransfer(id);
      loadTransfers();
    } catch (err: any) {
      alert(err.message || "Failed to dispatch");
    }
  };

  const handleReceive = async (id: number) => {
    try {
      await api.receiveTransfer(id);
      loadTransfers();
    } catch (err: any) {
      alert(err.message || "Failed to receive");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Inter-Hospital Logistics & Transfers</h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time cold-chain tracking of blood units in transit between regional health facilities
          </p>
        </div>

        <button
          onClick={loadTransfers}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg text-xs font-semibold text-slate-700 shadow-xs"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Tracking</span>
        </button>
      </div>

      <div className="card-healthcare bg-white border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Transfer Code</th>
                <th className="py-3 px-4">Origin Hospital</th>
                <th className="py-3 px-4">Destination Hospital</th>
                <th className="py-3 px-4">Blood Group</th>
                <th className="py-3 px-4">Component</th>
                <th className="py-3 px-4">Units</th>
                <th className="py-3 px-4">Carrier & Logistics</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">Loading transfers...</td>
                </tr>
              ) : transfers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">No active or past transfers recorded.</td>
                </tr>
              ) : (
                transfers.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{t.transfer_code}</td>
                    <td className="py-3 px-4 text-slate-700">{t.source_hospital_name}</td>
                    <td className="py-3 px-4 text-slate-700 font-semibold">{t.destination_hospital_name}</td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-blood-700 bg-blood-50 border border-blood-200 px-2 py-0.5 rounded text-xs">
                        {t.blood_group}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{t.component_type}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{t.units_count} units</td>
                    <td className="py-3 px-4 text-slate-500 flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5 text-slate-400" />
                      <span>{t.carrier_info}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          t.status === "Received"
                            ? "bg-emerald-100 text-emerald-800"
                            : t.status === "In_Transit"
                            ? "bg-blue-100 text-blue-800 animate-pulse"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {t.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                      {t.status === "Scheduled" && user?.role !== "READ_ONLY_ANALYST" && (
                        <button
                          onClick={() => handleDispatch(t.id)}
                          className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded font-semibold text-[10px]"
                        >
                          Dispatch
                        </button>
                      )}
                      {t.status === "In_Transit" && user?.role !== "READ_ONLY_ANALYST" && (
                        <button
                          onClick={() => handleReceive(t.id)}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-semibold text-[10px]"
                        >
                          Confirm Receipt
                        </button>
                      )}
                    </td>
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
