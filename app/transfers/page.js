"use client";

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import TransferForm  from '../components/TransferForm';

export default function TransfersPage() {
    const [transfers, setTransfers] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const fetchTransfers = async () => {
   setLoading(true);
    const [{ data: tData }, { data: pData }] = await Promise.all([
      supabase
        .from("transactions")
        .select("*, items(name), from_program:programs!transactions_from_program_fkey(name), to_program:programs!transactions_to_program_fkey(name)")
        .eq("type", "transfer")
        .order("created_at", { ascending: false })
        .limit(100),
      supabase.from("programs").select("*"),
    ]);
    setTransfers(tData || []);
    setPrograms(pData || []);
    setLoading(false);
  };

    useEffect(() => {
    fetchTransfers();
  }, []);

  //STYLE
  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Transfers</h1>
          <p className="subtitle">VT Food Pantry · Move Stock Between Programs</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ New Transfer</button>
      </header>

      {loading ? (
        <div className="loading-state"><div className="spinner" /><p>Loading transfers…</p></div>
      ) : (
        <div className="table-wrap">
          {transfers.length === 0 ? (
            <div className="empty-state"><p>No transfers yet.</p></div>
          ) : (
            <table className="t-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Item</th>
                  <th>Qty</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Note</th>
                </tr>
              </thead>
              <tbody>
                {transfers.map((t) => (
                  <tr key={t.id}>
                    <td className="td-date">{new Date(t.created_at).toLocaleDateString()}</td>
                    <td className="td-name">{t.items?.name ?? "—"}</td>
                    <td><span className="qty-badge">{t.quantity}</span></td>
                    <td>{t.from_program?.name ?? "—"}</td>
                    <td>{t.to_program?.name ?? "—"}</td>
                    <td className="td-note">{t.note ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>New Transfer</h2>
              <button className="modal-close" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <TransferForm programs={programs} onSuccess={() => { setShowForm(false); fetchData(); }} onCancel={() => setShowForm(false)} />
          </div>
        </div>
      )}

      <style jsx>{`
        .page { min-height: 100vh; background: #f7f8fa; font-family: "DM Sans", sans-serif; padding: 0 0 60px; }
        .page-header { display: flex; align-items: center; justify-content: space-between; padding: 28px 36px 20px; background: #fff; border-bottom: 2px solid #e8eaed; }
        .page-header h1 { font-size: 1.75rem; font-weight: 700; color: #1a1a2e; margin: 0; }
        .subtitle { margin: 2px 0 0; font-size: 0.85rem; color: #6b7280; }
        .btn { padding: 9px 18px; border-radius: 8px; font-size: 0.875rem; font-weight: 600; cursor: pointer; border: none; }
        .btn-primary { background: #861f41; color: #fff; }
        .btn-primary:hover { background: #6e1835; }
        .table-wrap { padding: 24px 36px; overflow-x: auto; }
        .t-table { width: 100%; border-collapse: collapse; font-size: 0.875rem; background: #fff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb; }
        .t-table th { padding: 11px 14px; text-align: left; font-size: 0.75rem; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.04em; background: #f3f4f6; border-bottom: 2px solid #e5e7eb; }
        .t-table td { padding: 11px 14px; border-bottom: 1px solid #f0f0f0; color: #1f2937; }
        .t-table tbody tr:last-child td { border-bottom: none; }
        .t-table tbody tr:hover { background: #fafafa; }
        .td-date { color: #6b7280; font-size: 0.82rem; white-space: nowrap; }
        .td-name { font-weight: 600; }
        .td-note { color: #6b7280; font-style: italic; }
        .qty-badge { display: inline-block; padding: 2px 10px; background: #f3f4f6; border-radius: 999px; font-weight: 700; }
        .loading-state, .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 80px 20px; gap: 16px; color: #6b7280; }
        .spinner { width: 36px; height: 36px; border: 3px solid #e5e7eb; border-top-color: #861f41; border-radius: 50%; animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 20px; }
        .modal-box { background: #fff; border-radius: 14px; width: 100%; max-width: 480px; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.25); }
        .modal-header { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px 0; }
        .modal-header h2 { font-size: 1.1rem; font-weight: 700; color: #1a1a2e; margin: 0; }
        .modal-close { background: none; border: none; font-size: 1.1rem; cursor: pointer; color: #6b7280; padding: 4px 8px; border-radius: 6px; }
      `}</style>
    </div>
  );
}
