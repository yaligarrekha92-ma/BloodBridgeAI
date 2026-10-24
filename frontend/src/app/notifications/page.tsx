"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Send,
  ArrowLeftRight,
  Clock,
  Check,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadOnly, setUnreadOnly] = useState(false);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const res = await api.getNotifications(unreadOnly);
      setNotifications(res || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, [unreadOnly]);

  const handleMarkRead = async (id: number) => {
    try {
      await api.markNotificationRead(id);
      loadNotifications();
    } catch (err: any) {
      alert(err.message || "Failed to mark read");
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      loadNotifications();
    } catch (err: any) {
      alert(err.message || "Failed to mark all read");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Notification Center</h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time alerts for critical shortages, urgent transfusions, expiry warnings, and transfer dispatches
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setUnreadOnly(!unreadOnly)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
              unreadOnly
                ? "bg-blood-50 border-blood-300 text-blood-700"
                : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
            }`}
          >
            {unreadOnly ? "Showing Unread" : "Show Unread Only"}
          </button>
          <button
            onClick={handleMarkAllRead}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Mark All as Read</span>
          </button>
        </div>
      </div>

      <div className="card-healthcare bg-white border-slate-200 overflow-hidden shadow-xs divide-y divide-slate-100">
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400">Loading notification center...</div>
        ) : notifications.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">No notifications to display.</div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              className={`p-4 flex items-start justify-between gap-4 transition ${
                !n.is_read ? "bg-blood-50/20" : "hover:bg-slate-50/60"
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      n.severity === "Critical"
                        ? "bg-red-100 text-red-800 animate-pulse"
                        : n.severity === "Warning"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-blue-100 text-blue-800"
                    }`}
                  >
                    {n.severity}
                  </span>
                  <span className="font-bold text-xs text-slate-900">{n.title}</span>
                  <span className="text-[10px] text-slate-400">• {new Date(n.created_at).toLocaleString()}</span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed max-w-3xl">{n.message}</p>

                {n.related_link && (
                  <Link
                    href={n.related_link}
                    className="inline-block text-[11px] font-semibold text-blood-600 hover:underline pt-0.5"
                  >
                    Open Related Workflow →
                  </Link>
                )}
              </div>

              {!n.is_read && (
                <button
                  onClick={() => handleMarkRead(n.id)}
                  title="Mark as read"
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 shrink-0"
                >
                  <CheckCircle2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
