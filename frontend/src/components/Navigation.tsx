"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Droplets,
  PackageCheck,
  Send,
  Building2,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Clock,
  ArrowLeftRight,
  BarChart3,
  Bell,
  ShieldCheck,
  Settings,
  LogOut,
  ChevronDown,
  Menu,
  X,
  UserCheck,
  Info,
  CheckCircle2,
} from "lucide-react";
import { useAuth, DEMO_CREDENTIALS } from "@/context/AuthContext";
import { api } from "@/lib/api";

export function Navigation({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout, switchDemoRole, selectedHospitalId, setSelectedHospitalId, hospitals } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  // Fetch notifications for the bell dropdown
  useEffect(() => {
    if (user) {
      api.getNotifications(false)
        .then((res) => setNotifications(res.slice(0, 5)))
        .catch(() => {});
    }
  }, [user, pathname]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const navSections = [
    {
      title: "Core Operations",
      items: [
        { label: "Dashboard", href: "/dashboard", icon: Activity },
        { label: "Inventory", href: "/inventory", icon: Droplets },
        { label: "Donations", href: "/donations", icon: PackageCheck },
        { label: "Blood Requests", href: "/requests", icon: Send },
        { label: "Transfers", href: "/transfers", icon: ArrowLeftRight },
        { label: "Hospitals", href: "/hospitals", icon: Building2 },
      ],
    },
    {
      title: "AI Intelligence Layer",
      items: [
        { label: "AI Command Center", href: "/ai-command-center", icon: Sparkles, highlight: true },
        { label: "Demand Forecasts", href: "/ai/forecasts", icon: TrendingUp },
        { label: "Shortage Risks", href: "/ai/shortage-risks", icon: AlertTriangle },
        { label: "Expiry Risks", href: "/ai/expiry-risks", icon: Clock },
        { label: "Redistribution AI", href: "/ai/redistribution", icon: ArrowLeftRight },
      ],
    },
    {
      title: "Analytics & Governance",
      items: [
        { label: "Analytics & Reports", href: "/analytics", icon: BarChart3 },
        { label: "Notifications", href: "/notifications", icon: Bell },
        { label: "Audit & Compliance", href: "/audit-logs", icon: ShieldCheck },
        { label: "Settings", href: "/settings", icon: Settings },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 border-r border-slate-800 text-slate-300 select-none shrink-0 sticky top-0 h-screen">
        {/* Brand */}
        <div className="p-5 border-b border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blood-600 flex items-center justify-center text-white shadow-lg shadow-blood-900/30">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
              <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
            </svg>
          </div>
          <div>
            <div className="text-white font-bold text-lg tracking-tight flex items-center gap-1.5">
              BloodBridge <span className="text-blood-400 font-semibold text-xs px-1.5 py-0.5 rounded bg-blood-950/80 border border-blood-800">AI</span>
            </div>
            <div className="text-[10px] text-slate-400 leading-tight">Smart Blood Logistics</div>
          </div>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {navSections.map((sec, idx) => (
            <div key={idx}>
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-3 mb-2">
                {sec.title}
              </div>
              <div className="space-y-1">
                {sec.items.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-blood-600 text-white shadow-sm"
                          : item.highlight
                          ? "text-blood-300 hover:bg-slate-800/80 hover:text-white"
                          : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? "text-white" : item.highlight ? "text-blood-400" : "text-slate-400"}`} />
                      <span>{item.label}</span>
                      {item.highlight && !isActive && (
                        <span className="ml-auto text-[10px] font-semibold bg-blood-900/60 text-blood-300 border border-blood-800/60 px-1.5 py-0.5 rounded">
                          AI
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* User Card & Logout */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/60">
          <div className="flex items-center justify-between p-2 rounded-lg bg-slate-800/40 border border-slate-800">
            <div className="overflow-hidden">
              <div className="text-xs font-semibold text-white truncate">{user?.full_name || "Guest Demo"}</div>
              <div className="text-[10px] text-blood-400 truncate font-mono uppercase">{user?.role?.replace(/_/g, " ") || "ANONYMOUS"}</div>
            </div>
            <button
              onClick={logout}
              title="Logout"
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="h-16 bg-white border-b border-slate-200 px-4 md:px-8 flex items-center justify-between sticky top-0 z-20 shadow-xs">
          {/* Mobile menu toggle */}
          <div className="flex items-center gap-3 md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blood-600 flex items-center justify-center text-white">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                  <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
                </svg>
              </div>
              <span className="font-bold text-slate-900 text-sm">BloodBridge</span>
            </div>
          </div>

          {/* Left: Hospital Switcher / Scope */}
          <div className="hidden sm:flex items-center gap-3">
            <Building2 className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-medium text-slate-500">Facility Scope:</span>
            {user?.role === "SUPER_ADMIN" ? (
              <select
                value={selectedHospitalId || ""}
                onChange={(e) => setSelectedHospitalId(e.target.value ? Number(e.target.value) : null)}
                className="text-xs font-semibold bg-slate-50 border border-slate-300 rounded-md px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-blood-500"
              >
                <option value="">All Network Hospitals (Consolidated View)</option>
                {hospitals.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name} ({h.code})
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-xs font-semibold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                {user?.hospital_name || "Assigned Facility"}
              </span>
            )}
          </div>

          {/* Right: Demo Role Switcher, Simulation badge, Notifications */}
          <div className="flex items-center gap-3">
            {/* Demo Mode Badge */}
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
              <span>Simulated Demo Data</span>
            </div>

            {/* Quick Demo Role Switcher Dropdown */}
            <div className="relative">
              <button
                onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-medium border border-slate-200 transition"
              >
                <UserCheck className="w-3.5 h-3.5 text-blood-600" />
                <span className="hidden sm:inline">Role:</span>
                <span className="font-semibold text-slate-900 truncate max-w-[120px]">
                  {DEMO_CREDENTIALS[user?.role as keyof typeof DEMO_CREDENTIALS]?.label || user?.role || "Select Role"}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {roleDropdownOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 p-2 z-30 space-y-1">
                  <div className="px-3 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                    Switch Demo Persona (1-Click)
                  </div>
                  {(Object.keys(DEMO_CREDENTIALS) as Array<keyof typeof DEMO_CREDENTIALS>).map((k) => {
                    const c = DEMO_CREDENTIALS[k];
                    const isCurrent = user?.role === k;
                    return (
                      <button
                        key={k}
                        onClick={() => {
                          switchDemoRole(k);
                          setRoleDropdownOpen(false);
                        }}
                        className={`w-full text-left p-2 rounded-lg text-xs transition flex items-start gap-2.5 ${
                          isCurrent ? "bg-blood-50 text-blood-900 font-semibold border border-blood-200" : "hover:bg-slate-50 text-slate-700"
                        }`}
                      >
                        <div className={`w-2 h-2 rounded-full mt-1.5 ${isCurrent ? "bg-blood-600" : "bg-slate-300"}`} />
                        <div>
                          <div className="font-semibold">{c.label}</div>
                          <div className="text-[10px] text-slate-500 leading-tight">{c.desc}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Notification Bell Dropdown */}
            <div className="relative">
              <button
                onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
                className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-blood-600 text-white text-[9px] font-bold flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>

              {notifDropdownOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 z-30 overflow-hidden">
                  <div className="p-3 border-b border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">Notifications</span>
                    <Link
                      href="/notifications"
                      onClick={() => setNotifDropdownOpen(false)}
                      className="text-[11px] text-blood-600 hover:underline font-medium"
                    >
                      View all
                    </Link>
                  </div>
                  <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-400">No recent notifications</div>
                    ) : (
                      notifications.map((n) => (
                        <div key={n.id} className="p-3 hover:bg-slate-50 transition text-xs">
                          <div className="flex items-center justify-between mb-1">
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                n.severity === "Critical"
                                  ? "bg-red-100 text-red-700"
                                  : n.severity === "Warning"
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-blue-100 text-blue-700"
                              }`}
                            >
                              {n.severity}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {new Date(n.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                          <div className="font-semibold text-slate-800">{n.title}</div>
                          <div className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">{n.message}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Landing page link */}
            <Link
              href="/"
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition hidden md:inline-block"
            >
              Public Site
            </Link>
          </div>
        </header>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-slate-900 text-slate-200 border-b border-slate-800 p-4 space-y-4">
            {navSections.map((sec, idx) => (
              <div key={idx}>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{sec.title}</div>
                <div className="grid grid-cols-2 gap-1">
                  {sec.items.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-2 p-2 rounded text-xs ${
                        pathname === item.href ? "bg-blood-600 text-white font-medium" : "text-slate-300 hover:bg-slate-800"
                      }`}
                    >
                      <item.icon className="w-3.5 h-3.5" />
                      <span>{item.label}</span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Page Content */}
        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
