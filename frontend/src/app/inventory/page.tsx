"use client";

import React, { useState, useEffect } from "react";
import {
  Droplets,
  Plus,
  Search,
  Filter,
  PackageCheck,
  Send,
  Trash2,
  Clock,
  History,
  CheckCircle2,
  AlertCircle,
  X,
  Building2,
  Calendar,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export default function InventoryPage() {
  const { user, selectedHospitalId, hospitals } = useAuth();
  const [units, setUnits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [bloodGroupFilter, setBloodGroupFilter] = useState("");
  const [componentFilter, setComponentFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [expiryFilter, setExpiryFilter] = useState("");

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showReserveModal, setShowReserveModal] = useState<any>(null);
  const [showIssueModal, setShowIssueModal] = useState<any>(null);
  const [showAuditModal, setShowAuditModal] = useState<any>(null);
  const [unitTransactions, setUnitTransactions] = useState<any[]>([]);

  // Add Unit Form State
  const [addForm, setAddForm] = useState({
    hospital_id: selectedHospitalId || 1,
    blood_group: "O+",
    component_type: "Red Blood Cells",
    storage_location: "Cold Vault A - Bay 1",
    status: "Available",
    quality_screening_status: "Passed",
  });
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Reserve Form
  const [reserveRequestId, setReserveRequestId] = useState("1");
  const [reserveNotes, setReserveNotes] = useState("");

  // Issue Form
  const [issuePatientRef, setIssuePatientRef] = useState("PT-EMG-101");
  const [issueNotes, setIssueNotes] = useState("");

  const loadInventory = async () => {
    setLoading(true);
    try {
      const res = await api.getInventory({
        hospital_id: selectedHospitalId,
        blood_group: bloodGroupFilter,
        component_type: componentFilter,
        status: statusFilter,
        expiring_within_days: expiryFilter ? Number(expiryFilter) : undefined,
        search: search,
      });
      setUnits(res || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInventory();
  }, [selectedHospitalId, bloodGroupFilter, componentFilter, statusFilter, expiryFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadInventory();
  };

  const handleAddUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitting(true);
    setFormError(null);
    try {
      await api.createUnit({
        ...addForm,
        hospital_id: Number(addForm.hospital_id),
      });
      setShowAddModal(false);
      loadInventory();
    } catch (err: any) {
      setFormError(err.message || "Failed to create unit");
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleReserve = async () => {
    if (!showReserveModal) return;
    try {
      await api.reserveUnit(showReserveModal.id, {
        request_id: Number(reserveRequestId),
        notes: reserveNotes,
      });
      setShowReserveModal(null);
      loadInventory();
    } catch (err: any) {
      alert(err.message || "Reservation failed");
    }
  };

  const handleIssue = async () => {
    if (!showIssueModal) return;
    try {
      await api.issueUnit(showIssueModal.id, {
        patient_ref: issuePatientRef,
        notes: issueNotes,
      });
      setShowIssueModal(null);
      loadInventory();
    } catch (err: any) {
      alert(err.message || "Issuance failed");
    }
  };

  const handleDiscard = async (unit: any) => {
    const reason = prompt("Enter reason for discarding unit (e.g., Expired, Clotted, Hemolysis):", "Expired shelf life");
    if (!reason) return;
    try {
      await api.discardUnit(unit.id, reason);
      loadInventory();
    } catch (err: any) {
      alert(err.message || "Failed to discard");
    }
  };

  const handleViewAudit = async (unit: any) => {
    setShowAuditModal(unit);
    try {
      const txns = await api.getUnitTransactions(unit.id);
      setUnitTransactions(txns || []);
    } catch {
      setUnitTransactions([]);
    }
  };

  const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
  const components = ["Red Blood Cells", "Whole Blood", "Platelets", "Plasma"];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Blood Inventory Management</h1>
          <p className="text-xs text-slate-500 mt-1">
            Track blood units, laboratory quality screening, reservation status, and shelf-life expiration
          </p>
        </div>

        {user?.role !== "READ_ONLY_ANALYST" && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blood-600 hover:bg-blood-700 text-white rounded-lg text-xs font-semibold shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Inventory Unit</span>
          </button>
        )}
      </div>

      {/* Search & Filter Bar */}
      <div className="card-healthcare p-4 bg-white border-slate-200 space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by unit number, storage shelf, hospital..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-blood-500"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition"
          >
            Search
          </button>
        </form>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
          <select
            value={bloodGroupFilter}
            onChange={(e) => setBloodGroupFilter(e.target.value)}
            className="text-xs border border-slate-300 rounded-lg p-2 bg-slate-50 text-slate-700 font-medium"
          >
            <option value="">All Blood Groups</option>
            {bloodGroups.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>

          <select
            value={componentFilter}
            onChange={(e) => setComponentFilter(e.target.value)}
            className="text-xs border border-slate-300 rounded-lg p-2 bg-slate-50 text-slate-700 font-medium"
          >
            <option value="">All Components</option>
            {components.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs border border-slate-300 rounded-lg p-2 bg-slate-50 text-slate-700 font-medium"
          >
            <option value="">All Statuses</option>
            <option value="Available">Available</option>
            <option value="Reserved">Reserved</option>
            <option value="Issued">Issued</option>
            <option value="Discarded">Discarded</option>
          </select>

          <select
            value={expiryFilter}
            onChange={(e) => setExpiryFilter(e.target.value)}
            className="text-xs border border-slate-300 rounded-lg p-2 bg-slate-50 text-slate-700 font-medium"
          >
            <option value="">All Expiry Windows</option>
            <option value="3">Expiring in ≤ 3 Days</option>
            <option value="7">Expiring in ≤ 7 Days</option>
            <option value="14">Expiring in ≤ 14 Days</option>
          </select>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="card-healthcare bg-white border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Unit Identifier</th>
                <th className="py-3 px-4">Blood Group</th>
                <th className="py-3 px-4">Component</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4">Collection Date</th>
                <th className="py-3 px-4">Expiry Date</th>
                <th className="py-3 px-4">Screening</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    Loading inventory records...
                  </td>
                </tr>
              ) : units.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    No blood units match the specified filters.
                  </td>
                </tr>
              ) : (
                units.map((u) => {
                  const daysToExpiry = u.days_to_expiry ?? 0;
                  const isExpiringSoon = daysToExpiry <= 3 && u.status === "Available";
                  const isModerateExpiry = daysToExpiry <= 7 && daysToExpiry > 3 && u.status === "Available";

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {u.unit_number}
                        {u.hospital_name && (
                          <div className="text-[10px] text-slate-400 font-sans">{u.hospital_name}</div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-blood-700 bg-blood-50 border border-blood-200 px-2 py-0.5 rounded text-xs">
                          {u.blood_group}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-700">{u.component_type}</td>
                      <td className="py-3 px-4 text-slate-500">{u.storage_location}</td>
                      <td className="py-3 px-4 text-slate-500">
                        {new Date(u.collection_date).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`font-semibold ${
                              isExpiringSoon
                                ? "text-red-700 font-bold"
                                : isModerateExpiry
                                ? "text-amber-700"
                                : "text-slate-600"
                            }`}
                          >
                            {new Date(u.expiry_date).toLocaleDateString()}
                          </span>
                          {isExpiringSoon && (
                            <span className="text-[9px] bg-red-100 text-red-800 px-1 py-0.2 rounded font-bold">
                              {daysToExpiry}d left
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            u.quality_screening_status === "Passed"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {u.quality_screening_status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            u.status === "Available"
                              ? "bg-emerald-100 text-emerald-800"
                              : u.status === "Reserved"
                              ? "bg-blue-100 text-blue-800"
                              : u.status === "Issued"
                              ? "bg-slate-200 text-slate-700"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {u.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-1 whitespace-nowrap">
                        <button
                          onClick={() => handleViewAudit(u)}
                          title="View Unit Audit Trail"
                          className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100"
                        >
                          <History className="w-3.5 h-3.5 inline" />
                        </button>

                        {u.status === "Available" && user?.role !== "READ_ONLY_ANALYST" && (
                          <>
                            <button
                              onClick={() => setShowReserveModal(u)}
                              title="Reserve for Request"
                              className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded font-semibold text-[10px]"
                            >
                              Reserve
                            </button>
                            <button
                              onClick={() => setShowIssueModal(u)}
                              title="Issue for Transfusion"
                              className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded font-semibold text-[10px]"
                            >
                              Issue
                            </button>
                            <button
                              onClick={() => handleDiscard(u)}
                              title="Mark Discarded"
                              className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-700 rounded font-semibold text-[10px]"
                            >
                              Discard
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Unit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-base text-slate-900">Add Blood Inventory Record</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleAddUnit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Facility</label>
                <select
                  value={addForm.hospital_id}
                  onChange={(e) => setAddForm({ ...addForm, hospital_id: Number(e.target.value) })}
                  className="w-full p-2 border border-slate-300 rounded-lg bg-slate-50 font-medium"
                >
                  {hospitals.map((h) => (
                    <option key={h.id} value={h.id}>{h.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Blood Group</label>
                  <select
                    value={addForm.blood_group}
                    onChange={(e) => setAddForm({ ...addForm, blood_group: e.target.value })}
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
                    value={addForm.component_type}
                    onChange={(e) => setAddForm({ ...addForm, component_type: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-slate-50 font-medium"
                  >
                    {components.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Storage Location</label>
                <input
                  type="text"
                  required
                  value={addForm.storage_location}
                  onChange={(e) => setAddForm({ ...addForm, storage_location: e.target.value })}
                  placeholder="e.g., Cold Vault B - Shelf 3"
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Quality Screening</label>
                <select
                  value={addForm.quality_screening_status}
                  onChange={(e) => setAddForm({ ...addForm, quality_screening_status: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg bg-slate-50 font-medium"
                >
                  <option value="Passed">Passed (Approved for Transfusion)</option>
                  <option value="Pending">Pending Screening (Quarantine)</option>
                </select>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-500">
                <span className="font-semibold text-slate-700">Configured Shelf Life:</span> Expiry date will automatically calculate based on component standards ({addForm.component_type === "Platelets" ? "5 days" : addForm.component_type === "Plasma" ? "365 days" : "42 days"}).
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-2 border border-slate-300 rounded-lg text-slate-600 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-4 py-2 bg-blood-600 hover:bg-blood-700 text-white rounded-lg font-semibold"
                >
                  {formSubmitting ? "Saving..." : "Save Unit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reserve Unit Modal */}
      {showReserveModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="font-bold text-base text-slate-900 mb-2">
              Reserve Unit: {showReserveModal.unit_number}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Hold unit exclusively for an approved blood request.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Target Blood Request ID</label>
                <input
                  type="number"
                  value={reserveRequestId}
                  onChange={(e) => setReserveRequestId(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Staff Notes</label>
                <textarea
                  value={reserveNotes}
                  onChange={(e) => setReserveNotes(e.target.value)}
                  placeholder="e.g. Crossmatch held for OR Suite 3"
                  className="w-full p-2 border border-slate-300 rounded-lg h-20"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowReserveModal(null)}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-slate-600 font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReserve}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold"
                >
                  Confirm Reservation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Issue Unit Modal */}
      {showIssueModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="font-bold text-base text-slate-900 mb-2">
              Issue Unit for Transfusion: {showIssueModal.unit_number}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Mark unit as permanently issued to prevent double issuance.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Patient Reference Identifier</label>
                <input
                  type="text"
                  value={issuePatientRef}
                  onChange={(e) => setIssuePatientRef(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Clinical Notes</label>
                <textarea
                  value={issueNotes}
                  onChange={(e) => setIssueNotes(e.target.value)}
                  placeholder="e.g. Dispatched to Trauma Bay 1 with secondary verification completed"
                  className="w-full p-2 border border-slate-300 rounded-lg h-20"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowIssueModal(null)}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-slate-600 font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleIssue}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold"
                >
                  Confirm Issuance
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Unit Audit History Drawer / Modal */}
      {showAuditModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="font-bold text-base text-slate-900">Unit Audit Trail</h3>
                <div className="text-xs font-mono text-blood-700">{showAuditModal.unit_number}</div>
              </div>
              <button onClick={() => setShowAuditModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {unitTransactions.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400">No transaction records logged.</div>
              ) : (
                unitTransactions.map((t) => (
                  <div key={t.id} className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                    <div className="flex items-center justify-between font-bold mb-1">
                      <span className="text-slate-900">{t.transaction_type}</span>
                      <span className="text-[10px] text-slate-400">{new Date(t.timestamp).toLocaleString()}</span>
                    </div>
                    <div className="text-[11px] text-slate-600">{t.notes}</div>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100 mt-4">
              <button
                onClick={() => setShowAuditModal(null)}
                className="px-4 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold"
              >
                Close Audit View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
