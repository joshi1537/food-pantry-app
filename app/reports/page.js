"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";

export default function ReportsPage() {
  const [items, setItems] = useState([]);
  const [auditLog, setAuditLog] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [checkpoints, setCheckpoints] = useState([]);

  const [loading, setLoading] = useState(true);
  const [rollingOver, setRollingOver] = useState(false);
  const [expandedCheckpoint, setExpandedCheckpoint] = useState(null);
  const [showRolloverModal, setShowRolloverModal] = useState(false);
  const [error, setError] = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [
        { data: iData, error: iErr },
        { data: aData, error: aErr },
        { data: pData, error: pErr },
        { data: cData, error: cErr },
      ] = await Promise.all([
        supabase
          .from("items")
          .select("*, programs(name)")
          .order("name", { ascending: true }),
        supabase
          .from("audit_log")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(20),
        supabase
          .from("programs")
          .select("*")
          .order("name", { ascending: true }),
        supabase
          .from("checkpoints")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(10),
      ]);

      if (iErr) throw iErr;
      if (aErr) throw aErr;
      if (pErr) throw pErr;
      if (cErr) throw cErr;

      setItems(iData || []);
      setAuditLog(aData || []);
      setPrograms(pData || []);
      setCheckpoints(cData || []);
    }
    catch (err) {
      setError(err.message || "Failed to load reports.");
    }
    finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const totalItems = items.length;
  const totalUnits = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
  const totalWeight = items.reduce(
    (sum, item) => sum + (item.weight || 0) * (item.quantity || 0),
    0
  );
  const lowStock = items.filter(
    (item) => item.quantity <= (item.low_stock_threshold ?? 5)
  );

  const byCategory = items.reduce((acc, item) => {
    const category = item.category || "Other";
    acc[category] = (acc[category] || 0) + (item.quantity || 0);
    return acc;
  }, {});

  const byProgram = items.reduce((acc, item) => {
    const programName = item.programs?.name || "Unassigned";
    acc[programName] = (acc[programName] || 0) + (item.quantity || 0);
    return acc;
  }, {});

  const maxCatVal = Math.max(...Object.values(byCategory), 1);
  const maxProgVal = Math.max(...Object.values(byProgram), 1);

  const exportCSV = () => {
    const headers = [
      "Name",
      "Category",
      "Program",
      "Quantity",
      "Weight (lbs)",
      "Price/Unit",
      "Price/lb",
    ];

    const rows = items.map((item) => [
      item.name ?? "",
      item.category ?? "",
      item.programs?.name ?? "",
      item.quantity ?? "",
      item.weight ?? "",
      item.price_per_unit ?? "",
      item.price_per_weight ?? "",
    ]);

    const csv = [headers, ...rows]
      .map((row) =>
        row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `vt-pantry-report-${new Date().toISOString().slice(0, 10)}.csv`
    );
    link.style.display = "none";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      window.URL.revokeObjectURL(url);
    }, 100);
  };

  const handleYearRollover = async () => {
    setShowRolloverModal(false);
    setRollingOver(true);

    try {
      const snapshot = items.map((item) => ({
        item_id: item.id,
        item_name: item.name,
        quantity: item.quantity,
        category: item.category,
        program_id: item.program_id,
      }));

      const { error: checkpointError } = await supabase.from("checkpoints").insert({
        notes: `End-of-Year Rollover — ${new Date().getFullYear()}`,
        snapshot,
      });

      if (checkpointError) throw checkpointError;

      const { error: auditError } = await supabase.from("audit_log").insert({
        action: "rollover",
        details: {
          year: new Date().getFullYear(),
          items_count: items.length,
          total_units_carried_forward: totalUnits,
        },
      });

      if (auditError) throw auditError;

      alert(
        `Year rollover complete! A checkpoint was saved with all current stock. ${totalUnits} total units were carried forward into the new year.`
      );

      fetchAll();
    }
    catch (err) {
      alert("Error during rollover: " + err.message);
    }
    finally {
      setRollingOver(false);
    }
  };

  if (loading) {
    return (
      <div className="page">
        <div className="loading-state">
          <div className="spinner" />
          <p>Loading reports…</p>
        </div>

        <style jsx>{`
          .page {
            min-height: 100vh;
            background: #f7f8fa;
            font-family: "DM Sans", sans-serif;
          }
          .loading-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 80px 20px;
            gap: 16px;
            color: #6b7280;
          }
          .spinner {
            width: 36px;
            height: 36px;
            border: 3px solid #e5e7eb;
            border-top-color: #861f41;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }
          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Reports</h1>
          <p className="subtitle">VT Food Pantry · Inventory Summary</p>
        </div>

        <div className="header-actions">
          <button className="btn btn-secondary" onClick={exportCSV}>
            Export CSV
          </button>
          <button
            className="btn btn-danger"
            onClick={() => setShowRolloverModal(true)}
            disabled={rollingOver}
          >
            {rollingOver ? "Processing…" : "Year Rollover"}
          </button>
        </div>
      </header>

      <div className="stats-bar">
        <div className="stat">
          <span className="stat-value">{totalItems}</span>
          <span className="stat-label">Item Types</span>
        </div>
        <div className="stat">
          <span className="stat-value">{totalUnits.toLocaleString()}</span>
          <span className="stat-label">Total Units</span>
        </div>
        <div className="stat">
          <span className="stat-value">
            {totalWeight.toLocaleString(undefined, {
              maximumFractionDigits: 0,
            })}{" "}
            lbs
          </span>
          <span className="stat-label">Est. Weight</span>
        </div>
        <div className={`stat ${lowStock.length > 0 ? "stat-warn" : ""}`}>
          <span className="stat-value">{lowStock.length}</span>
          <span className="stat-label">Low Stock</span>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          Could not load reports: {error}
          <button onClick={fetchAll}>Retry</button>
        </div>
      )}

      <div className="content">
        <div className="card">
          <h2>Units by Category</h2>
          {Object.keys(byCategory).length === 0 ? (
            <p className="empty-note">No data yet.</p>
          ) : (
            <div className="bar-chart">
              {Object.entries(byCategory)
                .sort((a, b) => b[1] - a[1])
                .map(([category, qty]) => (
                  <div key={category} className="bar-row">
                    <span className="bar-label">{category}</span>
                    <div className="bar-track">
                      <div
                        className="bar-fill"
                        style={{ width: `${(qty / maxCatVal) * 100}%` }}
                      />
                    </div>
                    <span className="bar-value">{qty}</span>
                  </div>
                ))}
            </div>
          )}
        </div>

        <div className="card">
          <h2>Units by Program</h2>
          {Object.keys(byProgram).length === 0 ? (
            <p className="empty-note">No data yet.</p>
          ) : (
            <div className="bar-chart">
              {Object.entries(byProgram)
                .sort((a, b) => b[1] - a[1])
                .map(([program, qty]) => (
                  <div key={program} className="bar-row">
                    <span className="bar-label">{program}</span>
                    <div className="bar-track">
                      <div
                        className="bar-fill bar-fill-alt"
                        style={{ width: `${(qty / maxProgVal) * 100}%` }}
                      />
                    </div>
                    <span className="bar-value">{qty}</span>
                  </div>
                ))}
            </div>
          )}
        </div>

        {lowStock.length > 0 && (
          <div className="card card-full">
            <h2>Low Stock Items</h2>
            <table className="simple-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Category</th>
                  <th>Program</th>
                  <th>Current Qty</th>
                  <th>Threshold</th>
                </tr>
              </thead>
              <tbody>
                {lowStock.map((item) => (
                  <tr key={item.id}>
                    <td className="td-name">{item.name}</td>
                    <td>{item.category || "—"}</td>
                    <td>{item.programs?.name || "—"}</td>
                    <td className="td-low">{item.quantity}</td>
                    <td>{item.low_stock_threshold ?? 5}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="card card-full">
          <h2>Checkpoint History</h2>
          {checkpoints.length === 0 ? (
            <p className="empty-note">
              No checkpoints saved yet. Use "Save Checkpoint" on the Inventory
              page to create a baseline snapshot.
            </p>
          ) : (
            <div className="checkpoint-list">
              {checkpoints.map((checkpoint) => (
                <div key={checkpoint.id} className="checkpoint-row">
                  <div className="checkpoint-meta">
                    <span className="checkpoint-date">
                      {checkpoint.created_at
                        ? new Date(checkpoint.created_at).toLocaleDateString(
                            "en-US",
                            {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            }
                          )
                        : "Unknown date"}
                    </span>
                    <span className="checkpoint-note">
                      {checkpoint.notes || "No notes"}
                    </span>
                    <span className="checkpoint-count">
                      {checkpoint.snapshot?.length ?? 0} items
                    </span>
                  </div>

                  <button
                    className="btn-sm"
                    onClick={() =>
                      setExpandedCheckpoint(
                        expandedCheckpoint === checkpoint.id
                          ? null
                          : checkpoint.id
                      )
                    }
                  >
                    {expandedCheckpoint === checkpoint.id ? "Hide" : "View"}
                  </button>

                  {expandedCheckpoint === checkpoint.id && checkpoint.snapshot && (
                    <div className="checkpoint-detail">
                      <table className="simple-table">
                        <thead>
                          <tr>
                            <th>Item</th>
                            <th>Category</th>
                            <th>Qty at Snapshot</th>
                          </tr>
                        </thead>
                        <tbody>
                          {checkpoint.snapshot.map((snap, index) => (
                            <tr key={index}>
                              <td className="td-name">{snap.item_name}</td>
                              <td>{snap.category || "—"}</td>
                              <td>{snap.quantity}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card card-full">
          <h2>Recent Activity</h2>
          {auditLog.length === 0 ? (
            <p className="empty-note">No activity logged yet.</p>
          ) : (
            <table className="simple-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Action</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {auditLog.map((log) => (
                  <tr key={log.id}>
                    <td className="td-date">
                      {log.created_at
                        ? new Date(log.created_at).toLocaleString()
                        : "—"}
                    </td>
                    <td>
                      <span className={`action-badge action-${log.action}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="td-details">
                      {log.details?.item_name && <strong>{log.details.item_name}</strong>}
                      {log.details?.quantity_added != null &&
                        ` +${log.details.quantity_added}`}
                      {log.details?.notes && ` — ${log.details.notes}`}
                      {log.action === "rollover" &&
                        ` Year ${log.details?.year} — ${log.details?.items_count} items, ${log.details?.total_units_carried_forward} units carried forward`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showRolloverModal && (
        <div className="modal-overlay" onClick={() => setShowRolloverModal(false)}>
          <div className="modal-box modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Year Rollover</h2>
              <button
                className="modal-close"
                onClick={() => setShowRolloverModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <p className="warning-title">Ready to roll over to a new year?</p>
              <p className="warning-desc">This will:</p>

              <ul className="warning-list">
                <li>Save a checkpoint snapshot of all current stock</li>
                <li>Carry all remaining quantities forward into the new year</li>
                <li>Log the rollover in activity history</li>
              </ul>

              <p className="warning-desc">
                Current stock: <strong>{totalUnits}</strong> total units across{" "}
                <strong>{totalItems}</strong> item types will be carried forward.
              </p>

              <div className="modal-actions">
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowRolloverModal(false)}
                >
                  Cancel
                </button>
                <button className="btn btn-danger" onClick={handleYearRollover}>
                  Yes, Run Rollover
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .page {
          min-height: 100vh;
          background: #f7f8fa;
          font-family: "DM Sans", sans-serif;
          padding: 0 0 60px;
        }
        .page-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 28px 36px 20px;
          background: #fff;
          border-bottom: 2px solid #e8eaed;
          flex-wrap: wrap;
          gap: 12px;
        }
        .page-header h1 {
          font-size: 1.75rem;
          font-weight: 700;
          color: #1a1a2e;
          margin: 0;
        }
        .subtitle {
          margin: 2px 0 0;
          font-size: 0.85rem;
          color: #6b7280;
        }
        .header-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }
        .btn {
          padding: 9px 18px;
          border-radius: 8px;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          border: none;
          transition: all 0.15s;
          font-family: "DM Sans", sans-serif;
        }
        .btn-secondary {
          background: #fff;
          color: #374151;
          border: 1.5px solid #d1d5db;
        }
        .btn-secondary:hover {
          background: #f3f4f6;
        }
        .btn-danger {
          background: #861f41;
          color: #fff;
        }
        .btn-danger:hover:not(:disabled) {
          background: #6e1835;
        }
        .btn:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }
        .btn-sm {
          padding: 4px 12px;
          border-radius: 6px;
          font-size: 0.78rem;
          font-weight: 600;
          cursor: pointer;
          border: 1.5px solid #d1d5db;
          background: #fff;
          color: #374151;
          white-space: nowrap;
        }
        .btn-sm:hover {
          background: #f3f4f6;
        }
        .stats-bar {
          display: flex;
          background: #fff;
          border-bottom: 2px solid #e8eaed;
        }
        .stat {
          flex: 1;
          padding: 16px 24px;
          border-right: 1px solid #e8eaed;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .stat:last-child {
          border-right: none;
        }
        .stat-value {
          font-size: 1.5rem;
          font-weight: 700;
          color: #1a1a2e;
        }
        .stat-label {
          font-size: 0.75rem;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          margin-top: 2px;
        }
        .stat-warn .stat-value {
          color: #dc2626;
        }
        .content {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          padding: 24px 36px;
        }
        .card {
          background: #fff;
          border-radius: 12px;
          padding: 20px 24px;
          border: 1px solid #e5e7eb;
        }
        .card-full {
          grid-column: 1 / -1;
        }
        .card h2 {
          font-size: 1rem;
          font-weight: 700;
          color: #1a1a2e;
          margin: 0 0 16px;
        }
        .bar-chart {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .bar-row {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .bar-label {
          font-size: 0.78rem;
          color: #4b5563;
          width: 140px;
          flex-shrink: 0;
        }
        .bar-track {
          flex: 1;
          height: 10px;
          background: #f3f4f6;
          border-radius: 999px;
          overflow: hidden;
        }
        .bar-fill {
          height: 100%;
          background: #861f41;
          border-radius: 999px;
          transition: width 0.4s;
        }
        .bar-fill-alt {
          background: #e87722;
        }
        .bar-value {
          font-size: 0.78rem;
          font-weight: 700;
          color: #1a1a2e;
          width: 40px;
          text-align: right;
        }
        .simple-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.875rem;
        }
        .simple-table th {
          padding: 8px 12px;
          text-align: left;
          font-size: 0.72rem;
          font-weight: 700;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          border-bottom: 2px solid #e5e7eb;
        }
        .simple-table td {
          padding: 10px 12px;
          border-bottom: 1px solid #f0f0f0;
          color: #1f2937;
        }
        .simple-table tbody tr:last-child td {
          border-bottom: none;
        }
        .td-name {
          font-weight: 600;
        }
        .td-low {
          color: #dc2626;
          font-weight: 700;
        }
        .td-date {
          color: #6b7280;
          font-size: 0.8rem;
          white-space: nowrap;
        }
        .td-details {
          color: #4b5563;
          font-size: 0.85rem;
        }
        .action-badge {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 999px;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: capitalize;
        }
        .action-restock {
          background: #ecfdf5;
          color: #059669;
        }
        .action-transfer {
          background: #eff6ff;
          color: #2563eb;
        }
        .action-edit {
          background: #fefce8;
          color: #d97706;
        }
        .action-delete {
          background: #fef2f2;
          color: #dc2626;
        }
        .action-rollover {
          background: #f5f3ff;
          color: #7c3aed;
        }
        .empty-note {
          font-size: 0.875rem;
          color: #9ca3af;
          line-height: 1.5;
        }
        .checkpoint-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .checkpoint-row {
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          padding: 14px 16px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .checkpoint-meta {
          display: flex;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
        }
        .checkpoint-date {
          font-weight: 700;
          font-size: 0.875rem;
          color: #1a1a2e;
        }
        .checkpoint-note {
          font-size: 0.85rem;
          color: #6b7280;
          font-style: italic;
          flex: 1;
        }
        .checkpoint-count {
          font-size: 0.78rem;
          background: #f3f4f6;
          color: #374151;
          padding: 2px 10px;
          border-radius: 999px;
          font-weight: 600;
        }
        .checkpoint-detail {
          margin-top: 4px;
          border-top: 1px solid #f0f0f0;
          padding-top: 12px;
        }
        .error-banner {
          margin: 16px 36px;
          padding: 12px 16px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 8px;
          color: #b91c1c;
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 0.875rem;
        }
        .error-banner button {
          margin-left: auto;
          padding: 4px 12px;
          background: #b91c1c;
          color: #fff;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.8rem;
        }
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.45);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
          padding: 20px;
        }
        .modal-box {
          background: #fff;
          border-radius: 14px;
          width: 100%;
          max-width: 680px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
        }
        .modal-sm {
          max-width: 420px;
        }
        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 24px 0;
        }
        .modal-header h2 {
          font-size: 1.1rem;
          font-weight: 700;
          color: #1a1a2e;
          margin: 0;
        }
        .modal-close {
          background: none;
          border: none;
          font-size: 1.1rem;
          cursor: pointer;
          color: #6b7280;
          padding: 4px 8px;
          border-radius: 6px;
        }
        .modal-close:hover {
          background: #f3f4f6;
        }
        .modal-body {
          padding: 20px 24px 24px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .warning-title {
          font-size: 1rem;
          font-weight: 700;
          color: #1a1a2e;
          margin: 0;
        }
        .warning-desc {
          font-size: 0.875rem;
          color: #4b5563;
          margin: 0;
        }
        .warning-list {
          margin: 0;
          padding-left: 18px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .warning-list li {
          font-size: 0.875rem;
          color: #374151;
        }
        .modal-actions {
          display: flex;
          gap: 10px;
          justify-content: flex-end;
          margin-top: 4px;
        }
        @media (max-width: 640px) {
          .page-header {
            padding: 20px;
          }
          .stats-bar {
            flex-wrap: wrap;
          }
          .stat {
            flex: 1 1 45%;
          }
          .content {
            grid-template-columns: 1fr;
            padding: 20px;
          }
        }
      `}</style>
    </div>
  );
}
