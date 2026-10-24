"use client";

import React, { useState, useEffect } from "react";
import {
  Building2,
  Phone,
  Mail,
  MapPin,
  Shield,
  Activity,
  Droplets,
  Plus,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export default function HospitalsPage() {
  const { user } = useAuth();
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getHospitals()
      .then((res) => setHospitals(res || []))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Participating Hospital Network</h1>
          <p className="text-xs text-slate-500 mt-1">
            Certified partner facilities sharing inventory telemetry, emergency requests, and redistribution logistics
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        {loading ? (
          <div className="col-span-2 text-center py-12 text-xs text-slate-400">Loading hospital facilities...</div>
        ) : (
          hospitals.map((h) => (
            <div
              key={h.id}
              className="card-healthcare p-5 bg-white border-slate-200 card-healthcare-hover space-y-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700">
                    <Building2 className="w-5 h-5 text-blood-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-slate-900">{h.name}</h3>
                    <div className="text-[11px] font-mono text-blood-700 font-bold uppercase">{h.code} Facility Code</div>
                  </div>
                </div>

                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                  {h.tier}
                </span>
              </div>

              <div className="space-y-2 text-xs text-slate-600 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{h.address}, {h.city}, {h.state}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{h.contact_phone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{h.contact_email}</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-700 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Active Telemetry Sync</span>
                </div>
                <span className="text-[10px] text-slate-400">ISO 15189 Certified</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
