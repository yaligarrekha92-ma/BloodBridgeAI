"use client";

import React, { useState, useEffect } from "react";
import {
  Send,
  Plus,
  AlertCircle,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Search,
  Filter,
  PackageCheck,
  Building2,
  X,
  Droplets,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export default function RequestsPage() {
  const { user, selectedHospitalId, hospitals } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [urgencyFilter, setUrgencyFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showFulfillModal, setShowFulfillModal] = useState<any>(null);
  const [eligibleUnits, setEligibleUnits] = useState<any[]>([]);
  const [selectedUnitIds, setSelectedUnitIds] = useState<number[]>([]);

  // Request form state
  const [createForm, setCreateForm] = useState({
    requesting_hospital_id: selectedHospitalId || 1,
    patient_ref: "PT-SURG-8041",
    blood_group: "O-",
    component_type: "Red Blood Cells",
    units_requested: 2,
    urgency_level: "Emergency",
    required_by_hours: 2,
    staff_notes: "Stat surgical crossmatch. Patient in Trauma ICU.",
  });

  const loadRequests = async () => {
    setLoading(true);
    try {
      const res = await api.getRequests({
        hospital_id: selectedHospitalId,
        urgency_level: urgencyFilter,
        status: statusFilter,
      });
      setRequests(res || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, [selectedHospitalId, urgencyFilter, statusFilter]);

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const now = new Date();
      now.setHours(now.getHours() + Number(createForm.required_by_hours));

      await api.createRequest({
        requesting_hospital_id: Number(createForm.requesting_hospital_id),
        patient_ref: createForm.patient_ref,
        blood_group: createForm.blood_group,
        component_type: createForm.component_type,
        units_requested: Number(createForm.units_requested),
        urgency_level: createForm.urgency_level,
        required_by: now.toISOString(),
        staff_notes: createForm.staff_notes,
      });
      setShowCreateModal(false);
      loadRequests();
    } catch (err: any) {
      alert(err.message || "Failed to create request");
    }
  };

  const handleApprove = async (req: any) => {
    try {
      await api.approveRequest(req.id, "Approved by blood bank staff with automatic unit hold", true);
      loadRequests();
    } catch (err: any) {
      alert(err.message || "Failed to approve");
    }
  };

  const openFulfillModal = async (req: any) => {
    setShowFulfillModal(req);
    setSelectedUnitIds([]);
    try {
      // Find available units of matching or compatible blood group
      const inv = await api.getInventory({
        hospital_id: req.requesting_hospital_id,
        component_type: req.component_type,
        status: "Available",
      });
      setEligibleUnits(inv || []);
    } catch {
      setEligibleUnits([]);
    }
  };

  const handleFulfillSubmit = async () => {
    if (!showFulfillModal || selectedUnitIds.length === 0) return;
    try {
      await api.fulfillRequest(showFulfillModal.id, selectedUnitIds, "Fulfilled through blood bank dispensary");
      setShowFulfillModal(null);
      loadRequests();
    } catch (err: any) {
      alert(err.message || "Fulfillment failed");
    }
  };

  const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
  const components = ["Red Blood Cells", "Whole Blood", "Platelets", "Plasma"];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Blood Requests & Emergency Dispatch</h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage routine and stat emergency transfusion orders with strict clinical compatibility verification
          </p>
        </div>

        {user?.role !== "READ_ONLY_ANALYST" && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blood-600 hover:bg-blood-700 text-white rounded-lg text-xs font-semibold shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            <span>Create Blood Request</span>
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="card-healthcare p-4 bg-white border-slate-200 flex flex-wrap gap-3 items-center">
        <div className="text-xs font-bold text-slate-500 uppercase">Filter Requests:</div>
        <select
          value={urgencyFilter}
          onChange={(e) => setUrgencyFilter(e.target.value)}
          className="text-xs border border-slate-300 rounded-lg p-2 bg-slate-50 text-slate-700 font-medium"
        >
          <option value="">All Urgency Levels</option>
          <option value="Emergency">Emergency (Immediate)</option>
          <option value="Urgent">Urgent (Within 8h)</option>
          <option value="Routine">Routine (Scheduled)</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-xs border border-slate-300 rounded-lg p-2 bg-slate-50 text-slate-700 font-medium"
        >
          <option value="">All Statuses</option>
          <option value="Pending">Pending</option>
          <option value="Under_Review">Under Review</option>
          <option value="Partially_Fulfilled">Partially Fulfilled</option>
          <option value="Fulfilled">Fulfilled</option>
        </select>
      </div>

      {/* Requests Table */}
      <div className="card-healthcare bg-white border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Request Code</th>
                <th className="py-3 px-4">Patient Ref</th>
                <th className="py-3 px-4">Blood Group</th>
                <th className="py-3 px-4">Component</th>
                <th className="py-3 px-4">Units (Req/Alloc)</th>
                <th className="py-3 px-4">Urgency</th>
                <th className="py-3 px-4">Needed By</th>
                <th className="py-3 px-4">Compatibility</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400">Loading blood requests...</td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400">No requests match criteria.</td>
                </tr>
              ) : (
                requests.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{r.request_code}</td>
                    <td className="py-3 px-4 font-mono text-slate-600">{r.patient_ref}</td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-blood-700 bg-blood-50 border border-blood-200 px-2 py-0.5 rounded text-xs">
                        {r.blood_group}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-700">{r.component_type}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {r.units_allocated} / {r.units_requested}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          r.urgency_level === "Emergency"
                            ? "bg-red-100 text-red-800 animate-pulse"
                            : r.urgency_level === "Urgent"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {r.urgency_level}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {new Date(r.required_by).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", month: "short", day: "numeric" })}
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded flex items-center gap-1 w-fit">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Verified</span>
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          r.status === "Fulfilled"
                            ? "bg-emerald-100 text-emerald-800"
                            : r.status === "Under_Review"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {r.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                      {r.status === "Pending" && user?.role !== "READ_ONLY_ANALYST" && (
                        <button
                          onClick={() => handleApprove(r)}
                          className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded font-semibold text-[10px]"
                        >
                          Approve
                        </button>
                      )}
                      {r.status !== "Fulfilled" && user?.role !== "READ_ONLY_ANALYST" && (
                        <button
                          onClick={() => openFulfillModal(r)}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-semibold text-[10px]"
                        >
                          Fulfill & Issue
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

      {/* Create Request Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-base text-slate-900">Create Clinical Blood Request</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateRequest} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Requesting Facility</label>
                <select
                  value={createForm.requesting_hospital_id}
                  onChange={(e) => setCreateForm({ ...createForm, requesting_hospital_id: Number(e.target.value) })}
                  className="w-full p-2 border border-slate-300 rounded-lg bg-slate-50 font-medium"
                >
                  {hospitals.map((h) => (
                    <option key={h.id} value={h.id}>{h.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Patient Reference Identifier (Anonymized)</label>
                <input
                  type="text"
                  required
                  value={createForm.patient_ref}
                  onChange={(e) => setCreateForm({ ...createForm, patient_ref: e.target.value })}
                  placeholder="e.g., PT-SURG-8041"
                  className="w-full p-2 border border-slate-300 rounded-lg font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Required Blood Group</label>
                  <select
                    value={createForm.blood_group}
                    onChange={(e) => setCreateForm({ ...createForm, blood_group: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-slate-50 font-semibold"
                  >
                    {bloodGroups.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Component</label>
                  <select
                    value={createForm.component_type}
                    onChange={(e) => setCreateForm({ ...createForm, component_type: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-slate-50 font-medium"
                  >
                    {components.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Units Quantity</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={createForm.units_requested}
                    onChange={(e) => setCreateForm({ ...createForm, units_requested: Number(e.target.value) })}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Urgency Level</label>
                  <select
                    value={createForm.urgency_level}
                    onChange={(e) => setCreateForm({ ...createForm, urgency_level: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-slate-50 font-semibold text-red-600"
                  >
                    <option value="Emergency">Emergency (Immediate)</option>
                    <option value="Urgent">Urgent (Within 8h)</option>
                    <option value="Routine">Routine</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Staff Notes</label>
                <textarea
                  value={createForm.staff_notes}
                  onChange={(e) => setCreateForm({ ...createForm, staff_notes: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg h-16"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3.5 py-1.5 border border-slate-300 rounded-lg text-slate-600 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blood-600 hover:bg-blood-700 text-white rounded-lg font-semibold"
                >
                  Submit Blood Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Fulfill & Compatibility Match Modal */}
      {showFulfillModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  Fulfill Request {showFulfillModal.request_code}
                </h3>
                <div className="text-xs text-slate-500">
                  Select compatible blood units for {showFulfillModal.blood_group} ({showFulfillModal.component_type})
                </div>
              </div>
              <button onClick={() => setShowFulfillModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="text-xs font-semibold text-slate-700">Available Compatible Units:</div>
              <div className="max-h-60 overflow-y-auto space-y-2 border border-slate-200 rounded-xl p-2 bg-slate-50">
                {eligibleUnits.length === 0 ? (
                  <div className="text-center py-6 text-xs text-slate-400">
                    No available units found for this component. Check inventory or inter-hospital transfers.
                  </div>
                ) : (
                  eligibleUnits.map((u) => {
                    const isSelected = selectedUnitIds.includes(u.id);
                    return (
                      <div
                        key={u.id}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedUnitIds(selectedUnitIds.filter((id) => id !== u.id));
                          } else {
                            setSelectedUnitIds([...selectedUnitIds, u.id]);
                          }
                        }}
                        className={`p-2.5 rounded-lg border text-xs cursor-pointer flex items-center justify-between transition ${
                          isSelected
                            ? "bg-blood-50 border-blood-400 text-blood-950 font-semibold"
                            : "bg-white border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            readOnly
                            className="rounded text-blood-600"
                          />
                          <span className="font-mono">{u.unit_number}</span>
                          <span className="bg-blood-100 text-blood-800 px-1.5 py-0.2 rounded font-bold text-[10px]">
                            {u.blood_group}
                          </span>
                        </div>
                        <div className="text-slate-500 text-[11px]">
                          Exp: {new Date(u.expiry_date).toLocaleDateString()}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="flex items-center justify-between text-xs pt-2">
                <span className="text-slate-500">
                  Selected {selectedUnitIds.length} of {showFulfillModal.units_requested} required units
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowFulfillModal(null)}
                    className="px-3 py-1.5 border border-slate-300 rounded-lg text-slate-600 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleFulfillSubmit}
                    disabled={selectedUnitIds.length === 0}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg font-semibold"
                  >
                    Authorize & Issue Selected
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
