"use client";

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import VendorForm from '../components/VendorForm';

export default function VendorsPage() {
    const [vendors, setVendors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingVendor, setEditingVendor] = useState(null);

    const [showExportModal, setShowExportModal] = useState(false);
    const [exportDateFrom, setExportDateFrom] = useState("");
    const [exportDateTo, setExportDateTo] = useState("");

    const fetchVendors = async () => {
        setLoading(true);
        const { data } = await supabase.from("vendors").select("*").order("name", { ascending: true });
        setVendors(data || []);
        setLoading(false);
    };

    useEffect(() => {
        fetchVendors();
    }, []);

    const deleteVendor = async (vendor) => {
        if (!confirm(`Delete "${vendor.name}"?`)) return;
        const { error } = await supabase.from("vendors").delete().eq("id", vendor.id);
        if (error) alert("Error: " + error.message);
        else fetchVendors();
    };

    const openEditForm = (vendor) => {
        setEditingVendor(vendor);
        setShowForm(true);
    };

    const closeForm = () => {
        setEditingVendor(null);
        setShowForm(false);
    };

    const exportCSV = () => {
        let exportVendors = [...vendors];

        if (exportDateFrom) {
            exportVendors = exportVendors.filter((v) => new Date(v.created_at) >= new Date(exportDateFrom));
        }
        if (exportDateTo) {
            const end = new Date(exportDateTo);
            end.setHours(23, 59, 59, 999);
            exportVendors = exportVendors.filter((v) => new Date(v.created_at) <= end);
        }

        const headers = ["Name", "Contact", "Notes", "Date Added"];
        const rows = exportVendors.map((v) => [
            v.name ?? "",
            v.contact ?? "",
            v.notes ?? "",
            v.created_at ? new Date(v.created_at).toLocaleDateString() : "",
        ]);
        const csv = [headers, ...rows]
            .map((r) => r.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(","))
            .join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `vt-pantry-vendors-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        setShowExportModal(false);
    };

    return (
        <div className="page">
            <header className="page-header">
                <div>
                    <h1>🏪 Vendors</h1>
                    <p className="subtitle">VT Food Pantry · Supplier Directory</p>
                </div>
                <div className="header-actions">
                    <button className="btn btn-secondary" onClick={() => setShowExportModal(true)}>Export CSV</button>
                    <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Add Vendor</button>
                </div>
            </header>

            {loading ? (
                <div className="loading-state"><div className="spinner" /><p>Loading vendors…</p></div>
            ) : vendors.length === 0 ? (
                <div className="empty-state">
                    <p>No vendors yet.</p>
                    <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Add Vendor</button>
                </div>
            ) : (
                <div className="vendor-grid">
                    {vendors.map((v) => (
                        <div key={v.id} className="vendor-card">
                            <div className="vendor-card-header">
                                <span className="vendor-name">{v.name}</span>
                                <div className="vendor-actions">
                                    <button className="btn-action btn-edit" onClick={() => openEditForm(v)}>Edit</button>
                                    <button className="btn-action btn-delete" onClick={() => deleteVendor(v)}>Delete</button>
                                </div>
                            </div>
                            {v.contact && <p className="vendor-detail">👤 {v.contact}</p>}
                            {v.notes && <p className="vendor-notes">{v.notes}</p>}
                            <p className="vendor-meta">Added {new Date(v.created_at).toLocaleDateString()}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* Add/Edit Vendor Modal */}
            {showForm && (
                <div className="modal-overlay" onClick={closeForm}>
                    <div className="modal-box" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editingVendor ? "Edit Vendor" : "Add Vendor"}</h2>
                            <button className="modal-close" onClick={closeForm}>✕</button>
                        </div>
                        <VendorForm vendor={editingVendor} onSuccess={() => { closeForm(); fetchVendors(); }} onCancel={closeForm} />
                    </div>
                </div>
            )}

            {/* Export CSV Modal */}
            {showExportModal && (
                <div className="modal-overlay" onClick={() => setShowExportModal(false)}>
                    <div className="modal-box modal-sm" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Export Vendors CSV</h2>
                            <button className="modal-close" onClick={() => setShowExportModal(false)}>✕</button>
                        </div>
                        <div className="export-body">
                            <p>Filter by date added. Leave blank to export all vendors.</p>
                            <label>From date
                                <input type="date" value={exportDateFrom} onChange={(e) => setExportDateFrom(e.target.value)} />
                            </label>
                            <label>To date
                                <input type="date" value={exportDateTo} onChange={(e) => setExportDateTo(e.target.value)} />
                            </label>
                            <div className="modal-actions">
                                <button className="btn btn-secondary" onClick={() => setShowExportModal(false)}>Cancel</button>
                                <button className="btn btn-primary" onClick={exportCSV}>Download CSV</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style jsx>{`
                .page { min-height: 100vh; background: #f7f8fa; font-family: "DM Sans", sans-serif; padding: 0 0 60px; }
                .page-header { display: flex; align-items: center; justify-content: space-between; padding: 28px 36px 20px; background: #fff; border-bottom: 2px solid #e8eaed; }
                .page-header h1 { font-size: 1.75rem; font-weight: 700; color: #1a1a2e; margin: 0; }
                .subtitle { margin: 2px 0 0; font-size: 0.85rem; color: #6b7280; }
                .header-actions { display: flex; gap: 10px; }
                .btn { padding: 9px 18px; border-radius: 8px; font-size: 0.875rem; font-weight: 600; cursor: pointer; border: none; transition: all 0.15s; font-family: "DM Sans", sans-serif; }
                .btn-primary { background: #861f41; color: #fff; }
                .btn-primary:hover { background: #6e1835; }
                .btn-secondary { background: #fff; color: #374151; border: 1.5px solid #d1d5db; }
                .btn-secondary:hover { background: #f3f4f6; }
                .vendor-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; padding: 24px 36px; }
                .vendor-card { background: #fff; border-radius: 12px; padding: 18px; border: 1px solid #e5e7eb; }
                .vendor-card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
                .vendor-name { font-size: 1rem; font-weight: 700; color: #1a1a2e; }
                .vendor-actions { display: flex; gap: 6px; }
                .vendor-detail { font-size: 0.85rem; color: #4b5563; margin: 4px 0; }
                .vendor-notes { font-size: 0.82rem; color: #6b7280; margin: 6px 0; font-style: italic; }
                .vendor-meta { font-size: 0.75rem; color: #9ca3af; margin: 8px 0 0; }
                .btn-action { padding: 4px 10px; border-radius: 6px; font-size: 0.78rem; font-weight: 600; cursor: pointer; border: none; }
                .btn-edit { background: #eff6ff; color: #2563eb; }
                .btn-delete { background: #fef2f2; color: #dc2626; }
                .loading-state, .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 80px 20px; gap: 16px; color: #6b7280; }
                .spinner { width: 36px; height: 36px; border: 3px solid #e5e7eb; border-top-color: #861f41; border-radius: 50%; animation: spin 0.8s linear infinite; }
                @keyframes spin { to { transform: rotate(360deg); } }
                .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 20px; }
                .modal-box { background: #fff; border-radius: 14px; width: 100%; max-width: 480px; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.25); }
                .modal-sm { max-width: 380px; }
                .modal-header { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px 0; }
                .modal-header h2 { font-size: 1.1rem; font-weight: 700; color: #1a1a2e; margin: 0; }
                .modal-close { background: none; border: none; font-size: 1.1rem; cursor: pointer; color: #6b7280; padding: 4px 8px; border-radius: 6px; }
                .modal-close:hover { background: #f3f4f6; }
                .export-body { padding: 20px 24px 24px; display: flex; flex-direction: column; gap: 14px; }
                .export-body p { font-size: 0.875rem; color: #4b5563; margin: 0; line-height: 1.5; }
                .export-body label { display: flex; flex-direction: column; gap: 5px; font-size: 0.8rem; font-weight: 600; color: #374151; text-transform: uppercase; letter-spacing: 0.03em; }
                .export-body input { padding: 9px 12px; border: 1.5px solid #d1d5db; border-radius: 8px; font-size: 0.9rem; font-family: inherit; outline: none; }
                .export-body input:focus { border-color: #861f41; }
                .modal-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 4px; }
            `}</style>
        </div>
    );
}