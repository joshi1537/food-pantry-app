"use client";

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export default function DashboardPage() {
  const [stats, setStats] = useState({ items: 0, units: 0, weight: 0, lowStock: 0, vendors: 0 });
  const [lowStockItems, setLowStockItems] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [byCategory, setByCategory] = useState([]);
  const [byProgram, setByProgram] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [
        { data: items },
        { data: audit },
        { data: vendors },
      ] = await Promise.all([
        supabase.from("items").select("*, programs(name)"),
        supabase.from("audit_log").select("*").order("created_at", { ascending: false }).limit(8),
        supabase.from("vendors").select("id"),
      ]);

      const allItems = items || [];

      // Top-level stats
      const totalUnits = allItems.reduce((s, i) => s + (i.quantity || 0), 0);
      const totalWeight = allItems.reduce((s, i) => s + (i.weight || 0) * (i.quantity || 0), 0);
      const lowStock = allItems.filter((i) => i.quantity <= (i.low_stock_threshold ?? 5));

      setStats({
        items: allItems.length,
        units: totalUnits,
        weight: totalWeight,
        lowStock: lowStock.length,
        vendors: (vendors || []).length,
      });

      setLowStockItems(lowStock.slice(0, 5));

      // By category
      const catMap = {};
      allItems.forEach((i) => {
        const c = i.category || "Other";
        catMap[c] = (catMap[c] || 0) + (i.quantity || 0);
      });
      const catArr = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
      setByCategory(catArr);

      // By program
      const progMap = {};
      allItems.forEach((i) => {
        const p = i.programs?.name || "Unassigned";
        progMap[p] = (progMap[p] || 0) + (i.quantity || 0);
      });
      setByProgram(Object.entries(progMap).sort((a, b) => b[1] - a[1]));

      setRecentActivity(audit || []);
      setLoading(false);
    };
    load();
  }, []);

  const maxCat = byCategory[0]?.[1] || 1;

  const actionLabel = (action) => {
    switch (action) {
      case "restock": return { label: "Restock", color: "#059669", bg: "#ecfdf5" };
      case "edit":    return { label: "Edit",    color: "#2563eb", bg: "#eff6ff" };
      case "delete":  return { label: "Delete",  color: "#dc2626", bg: "#fef2f2" };
      case "transfer":return { label: "Transfer",color: "#7c3aed", bg: "#f5f3ff" };
      default:        return { label: action,    color: "#6b7280", bg: "#f3f4f6" };
    }
  };

  if (loading) return (
    <div className="dash loading-full">
      <div className="spinner" />
      <p>Loading dashboard…</p>
    </div>
  );

  return (
    <div className="dash">
      <header className="dash-header">
        <div>
          <h1>Dashboard</h1>
          <p className="subtitle">VT Food Pantry · Overview</p>
        </div>
        <span className="date-badge">{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</span>
      </header>

      {/* Stat cards */}
      <div className="stat-grid">
        {[
          { label: "Item Types",   value: stats.items,                                         icon: "📦" },
          { label: "Total Units",  value: stats.units.toLocaleString(),                         icon: "🔢" },
          { label: "Est. Weight",  value: `${stats.weight.toLocaleString(undefined, { maximumFractionDigits: 0 })} lbs`, icon: "⚖️" },
          { label: "Vendors",      value: stats.vendors,                                        icon: "🏪" },
          { label: "Low Stock",    value: stats.lowStock, warn: stats.lowStock > 0,             icon: "⚠️" },
        ].map((s) => (
          <div key={s.label} className={`stat-card ${s.warn ? "stat-warn" : ""}`}>
            <span className="stat-icon">{s.icon}</span>
            <span className="stat-value">{s.value}</span>
            <span className="stat-label">{s.label}</span>
          </div>
        ))}
      </div>

      <div className="two-col">
        {/* Units by Category */}
        <div className="card">
          <h2 className="card-title">Units by Category</h2>
          {byCategory.length === 0 ? (
            <p className="empty-text">No data yet.</p>
          ) : (
            <div className="bar-list">
              {byCategory.map(([cat, qty]) => (
                <div key={cat} className="bar-row">
                  <span className="bar-label">{cat}</span>
                  <div className="bar-track">
                    <div className="bar-fill" style={{ width: `${(qty / maxCat) * 100}%` }} />
                  </div>
                  <span className="bar-value">{qty}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Units by Program */}
        <div className="card">
          <h2 className="card-title">Units by Program</h2>
          {byProgram.length === 0 ? (
            <p className="empty-text">No data yet.</p>
          ) : (
            <div className="prog-list">
              {byProgram.map(([prog, qty]) => (
                <div key={prog} className="prog-row">
                  <span className="prog-name">{prog}</span>
                  <span className="prog-qty">{qty.toLocaleString()} units</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="two-col">
        {/* Low Stock Alerts */}
        <div className="card">
          <h2 className="card-title">⚠️ Low Stock Alerts</h2>
          {lowStockItems.length === 0 ? (
            <p className="empty-text all-good">✅ All items sufficiently stocked!</p>
          ) : (
            <div className="alert-list">
              {lowStockItems.map((item) => (
                <div key={item.id} className="alert-row">
                  <div>
                    <p className="alert-name">{item.name}</p>
                    <p className="alert-prog">{item.programs?.name ?? "Unassigned"}</p>
                  </div>
                  <div className="alert-right">
                    <span className="alert-qty">{item.quantity} left</span>
                    <span className="alert-thresh">threshold: {item.low_stock_threshold ?? 5}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="card">
          <h2 className="card-title">Recent Activity</h2>
          {recentActivity.length === 0 ? (
            <p className="empty-text">No activity logged yet.</p>
          ) : (
            <div className="activity-list">
              {recentActivity.map((log) => {
                const { label, color, bg } = actionLabel(log.action);
                const name = log.details?.item_name ?? "Unknown item";
                const date = new Date(log.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
                return (
                  <div key={log.id} className="activity-row">
                    <span className="action-badge" style={{ color, background: bg }}>{label}</span>
                    <span className="activity-name">{name}</span>
                    <span className="activity-date">{date}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .dash { min-height: 100vh; background: #f7f8fa; font-family: "DM Sans", sans-serif; padding: 0 0 60px; }
        .loading-full { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; color: #6b7280; }
        .spinner { width: 36px; height: 36px; border: 3px solid #e5e7eb; border-top-color: #861f41; border-radius: 50%; animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        .dash-header { display: flex; align-items: center; justify-content: space-between; padding: 28px 36px 20px; background: #fff; border-bottom: 2px solid #e8eaed; flex-wrap: wrap; gap: 12px; }
        .dash-header h1 { font-size: 1.75rem; font-weight: 700; color: #1a1a2e; margin: 0; }
        .subtitle { margin: 2px 0 0; font-size: 0.85rem; color: #6b7280; }
        .date-badge { font-size: 0.85rem; color: #6b7280; background: #f3f4f6; padding: 6px 14px; border-radius: 999px; font-weight: 500; }

        .stat-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 0; background: #fff; border-bottom: 2px solid #e8eaed; }
        .stat-card { display: flex; flex-direction: column; align-items: center; padding: 20px 16px; border-right: 1px solid #e8eaed; gap: 4px; }
        .stat-card:last-child { border-right: none; }
        .stat-icon { font-size: 1.4rem; }
        .stat-value { font-size: 1.5rem; font-weight: 700; color: #1a1a2e; }
        .stat-label { font-size: 0.72rem; color: #6b7280; text-transform: uppercase; letter-spacing: 0.04em; }
        .stat-warn .stat-value { color: #dc2626; }

        .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; padding: 24px 36px 0; }
        .card { background: #fff; border-radius: 12px; border: 1px solid #e5e7eb; padding: 20px 24px; }
        .card-title { font-size: 0.95rem; font-weight: 700; color: #1a1a2e; margin: 0 0 16px; }
        .empty-text { font-size: 0.875rem; color: #9ca3af; }
        .all-good { color: #059669; }

        .bar-list { display: flex; flex-direction: column; gap: 10px; }
        .bar-row { display: flex; align-items: center; gap: 10px; }
        .bar-label { font-size: 0.8rem; color: #374151; width: 100px; flex-shrink: 0; }
        .bar-track { flex: 1; background: #f3f4f6; border-radius: 999px; height: 8px; overflow: hidden; }
        .bar-fill { height: 100%; background: #861f41; border-radius: 999px; transition: width 0.4s; }
        .bar-value { font-size: 0.8rem; font-weight: 700; color: #1a1a2e; width: 36px; text-align: right; }

        .prog-list { display: flex; flex-direction: column; gap: 10px; }
        .prog-row { display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: #f7f8fa; border-radius: 8px; }
        .prog-name { font-size: 0.875rem; font-weight: 600; color: #1a1a2e; }
        .prog-qty { font-size: 0.82rem; color: #6b7280; }

        .alert-list { display: flex; flex-direction: column; gap: 8px; }
        .alert-row { display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: #fff9f9; border: 1px solid #fecaca; border-radius: 8px; }
        .alert-name { font-size: 0.875rem; font-weight: 600; color: #1a1a2e; margin: 0; }
        .alert-prog { font-size: 0.78rem; color: #6b7280; margin: 2px 0 0; }
        .alert-right { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; }
        .alert-qty { font-size: 0.875rem; font-weight: 700; color: #dc2626; }
        .alert-thresh { font-size: 0.75rem; color: #9ca3af; }

        .activity-list { display: flex; flex-direction: column; gap: 8px; }
        .activity-row { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px solid #f0f0f0; }
        .activity-row:last-child { border-bottom: none; }
        .action-badge { font-size: 0.72rem; font-weight: 700; padding: 3px 9px; border-radius: 999px; white-space: nowrap; text-transform: uppercase; letter-spacing: 0.03em; }
        .activity-name { font-size: 0.875rem; color: #1f2937; flex: 1; }
        .activity-date { font-size: 0.78rem; color: #9ca3af; white-space: nowrap; }

        @media (max-width: 900px) {
          .stat-grid { grid-template-columns: repeat(3, 1fr); }
          .two-col { grid-template-columns: 1fr; padding: 16px 20px 0; }
        }
        @media (max-width: 600px) {
          .stat-grid { grid-template-columns: repeat(2, 1fr); }
          .dash-header { padding: 20px; }
        }
      `}</style>
    </div>
  );
}