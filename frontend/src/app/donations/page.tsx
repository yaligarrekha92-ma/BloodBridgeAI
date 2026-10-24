"use client";

import React, { useState, useEffect } from "react";
import {
  PackageCheck,
  Plus,
  UserCheck,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Droplets,
  Building2,
  X,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export default function DonationsPage() {
  const { user, selectedHospitalId, hospitals } = useAuth();
  const [donations, setDonations] = useState<any[]>([]);
  const [donors, setDonors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [bloodGroupFilter, setBloodGroupFilter] = useState("");
  const [screeningFilter, setScreeningFilter] = useState("");

  const [showDonationModal, setShowDonationModal] = useState(false);
  const [showDonorModal, setShowDonorModal] = useState(false);

  // New Donation form
  const [donationForm, setDonationForm] = useState({
    donor_id: 1,
    hospital_id: selectedHospitalId || 1,
    blood_group: "O+",
    component_type: "Whole Blood",
    volume_ml: 450,
    screening_status: "Passed",
    notes: "Voluntary donor. Negative for viral pathogens.",
  });

  // New Donor form
  const [donorForm, setDonorForm] = useState({
    donor_code: `DNR-2024-${Math.floor(1000 + Math.random() * 9000)}`,
    age_group: "26-35",
    gender: "Female",
    blood_group: "O-",
    eligibility_status: "Eligible",
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [dons, dnrs] = await Promise.all([
        api.getDonations({
          hospital_id: selectedHospitalId,
          blood_group: bloodGroupFilter,
          screening_status: screeningFilter,
        }),
        api.getDonors(),
      ]);
      setDonations(dons || []);
      setDonors(dnrs || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedHospitalId, bloodGroupFilter, screeningFilter]);

  const handleRegisterDonation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createDonation({
        ...donationForm,
        donor_id: Number(donationForm.donor_id),
        hospital_id: Number(donationForm.hospital_id),
        volume_ml: Number(donationForm.volume_ml),
      }, true);
      setShowDonationModal(false);
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to register donation");
    }
  };

  const handleRegisterDonor = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createDonor(donorForm);
      setShowDonorModal(false);
      setDonorForm({
        donor_code: `DNR-2024-${Math.floor(1000 + Math.random() * 9000)}`,
        age_group: "26-35",
        gender: "Male",
        blood_group: "A+",
        eligibility_status: "Eligible",
      });
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to create donor");
    }
  };

  const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Blood Donation & Donor Intake</h1>
          <p className="text-xs text-slate-500 mt-1">
            Log voluntary donations, trace derived blood units, and track laboratory screening clearance
          </p>
        </div>

        {user?.role !== "READ_ONLY_ANALYST" && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowDonorModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-xs transition"
            >
              <UserCheck className="w-4 h-4 text-slate-600" />
              <span>Register New Donor</span>
            </button>
            <button
              onClick={() => setShowDonationModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-blood-600 hover:bg-blood-700 text-white rounded-lg text-xs font-semibold shadow-xs transition"
            >
              <Plus className="w-4 h-4" />
              <span>Record Donation Intake</span>
            </button>
          </div>
        )}
      </div>

      {/* Filter Bar */}
      <div className="card-healthcare p-4 bg-white border-slate-200 flex flex-wrap gap-3 items-center">
        <div className="text-xs font-bold text-slate-500 uppercase">Filters:</div>
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
          value={screeningFilter}
          onChange={(e) => setScreeningFilter(e.target.value)}
          className="text-xs border border-slate-300 rounded-lg p-2 bg-slate-50 text-slate-700 font-medium"
        >
          <option value="">All Screening Statuses</option>
          <option value="Passed">Passed</option>
          <option value="Pending">Pending</option>
          <option value="Failed">Failed</option>
        </select>
      </div>

      {/* Donations Table */}
      <div className="card-healthcare bg-white border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Donation Code</th>
                <th className="py-3 px-4">Donor Ref</th>
                <th className="py-3 px-4">Blood Group</th>
                <th className="py-3 px-4">Component</th>
                <th className="py-3 px-4">Volume (mL)</th>
                <th className="py-3 px-4">Collection Date</th>
                <th className="py-3 px-4">Screening Status</th>
                <th className="py-3 px-4">Clinical Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">Loading donation records...</td>
                </tr>
              ) : donations.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">No donation records found.</td>
                </tr>
              ) : (
                donations.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{d.donation_code}</td>
                    <td className="py-3 px-4 font-mono text-slate-600">DNR-#{d.donor_id}</td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-blood-700 bg-blood-50 border border-blood-200 px-2 py-0.5 rounded text-xs">
                        {d.blood_group}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-700">{d.component_type}</td>
                    <td className="py-3 px-4 text-slate-600">{d.volume_ml} mL</td>
                    <td className="py-3 px-4 text-slate-500">{new Date(d.donation_date).toLocaleDateString()}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          d.screening_status === "Passed"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {d.screening_status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 max-w-xs truncate">{d.notes}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Donation Modal */}
      {showDonationModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-base text-slate-900">Record Donation Intake</h3>
              <button onClick={() => setShowDonationModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRegisterDonation} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select Donor</label>
                <select
                  value={donationForm.donor_id}
                  onChange={(e) => {
                    const sel = donors.find((dn) => dn.id === Number(e.target.value));
                    setDonationForm({
                      ...donationForm,
                      donor_id: Number(e.target.value),
                      blood_group: sel ? sel.blood_group : donationForm.blood_group,
                    });
                  }}
                  className="w-full p-2 border border-slate-300 rounded-lg bg-slate-50 font-medium"
                >
                  {donors.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.donor_code} ({d.blood_group} • {d.gender} • {d.age_group})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Hospital Facility</label>
                <select
                  value={donationForm.hospital_id}
                  onChange={(e) => setDonationForm({ ...donationForm, hospital_id: Number(e.target.value) })}
                  className="w-full p-2 border border-slate-300 rounded-lg bg-slate-50 font-medium"
                >
                  {hospitals.map((h) => (
                    <option key={h.id} value={h.id}>{h.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Component</label>
                  <select
                    value={donationForm.component_type}
                    onChange={(e) => setDonationForm({ ...donationForm, component_type: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-slate-50 font-medium"
                  >
                    <option value="Whole Blood">Whole Blood</option>
                    <option value="Red Blood Cells">Red Blood Cells</option>
                    <option value="Platelets">Platelets</option>
                    <option value="Plasma">Plasma</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Volume (mL)</label>
                  <input
                    type="number"
                    value={donationForm.volume_ml}
                    onChange={(e) => setDonationForm({ ...donationForm, volume_ml: Number(e.target.value) })}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Lab Screening Status</label>
                <select
                  value={donationForm.screening_status}
                  onChange={(e) => setDonationForm({ ...donationForm, screening_status: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg bg-slate-50 font-medium"
                >
                  <option value="Passed">Passed (Release into Inventory)</option>
                  <option value="Pending">Pending Testing (Quarantine)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Notes</label>
                <textarea
                  value={donationForm.notes}
                  onChange={(e) => setDonationForm({ ...donationForm, notes: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg h-16"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDonationModal(false)}
                  className="px-3.5 py-1.5 border border-slate-300 rounded-lg text-slate-600 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blood-600 hover:bg-blood-700 text-white rounded-lg font-semibold"
                >
                  Submit & Derive Unit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Register Donor Modal */}
      {showDonorModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-base text-slate-900">Register Anonymized Donor</h3>
              <button onClick={() => setShowDonorModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRegisterDonor} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Donor Reference Identifier</label>
                <input
                  type="text"
                  required
                  value={donorForm.donor_code}
                  onChange={(e) => setDonorForm({ ...donorForm, donor_code: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Blood Group</label>
                  <select
                    value={donorForm.blood_group}
                    onChange={(e) => setDonorForm({ ...donorForm, blood_group: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-slate-50 font-semibold"
                  >
                    {bloodGroups.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Age Group</label>
                  <select
                    value={donorForm.age_group}
                    onChange={(e) => setDonorForm({ ...donorForm, age_group: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-slate-50 font-medium"
                  >
                    <option value="18-25">18-25</option>
                    <option value="26-35">26-35</option>
                    <option value="36-45">36-45</option>
                    <option value="46-55">46-55</option>
                    <option value="56+">56+</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Gender</label>
                <select
                  value={donorForm.gender}
                  onChange={(e) => setDonorForm({ ...donorForm, gender: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg bg-slate-50 font-medium"
                >
                  <option value="Female">Female</option>
                  <option value="Male">Male</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDonorModal(false)}
                  className="px-3.5 py-1.5 border border-slate-300 rounded-lg text-slate-600 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold"
                >
                  Register Donor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
