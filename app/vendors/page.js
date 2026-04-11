"use client";

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import VendorForm from '../components/VendorForm';

export default function VendorsPage() {
  const [vendors, setVendors] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportDateFrom, setExportDateFrom] = useState("");
  const [exportDateTo, setExportDateTo] = useState("");
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceVendor, setInvoiceVendor] = useState(null);
  const [invoiceForm, setInvoiceForm] = useState({
    invoice_number: "",
    amount: "",
    date: "",
    notes: ""
  });
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [expandedVendor, setExpandedVendor] = useState(null);

  const fetchAll = async () => {
    setLoading(true);

    const [{ data: vData }, { data: iData }] = await Promise.all([
      supabase.from("vendors").select("*").order("name", { ascending: true }),
      supabase.from("invoices").select("*").order("date", { ascending: false }),
    ]);

    setVendors(vData || []);
    setInvoices(iData || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const deleteVendor = async (vendor) => {
    if (!confirm(`Delete "${vendor.name}"?`)) return;

    const { error } = await supabase.from("vendors").delete().eq("id", vendor.id);

    if (error) {
      alert("Error: " + error.message);
    }
    else {
      fetchAll();
    }
  };

  const openEditForm = (vendor) => {
    setEditingVendor(vendor);
    setShowForm(true);
  };

  const closeForm = () => {
    setEditingVendor(null);
    setShowForm(false);
  };

  const openInvoiceModal = (vendor) => {
    setInvoiceVendor(vendor);
    setInvoiceForm({
      invoice_number: "",
      amount: "",
      date: new Date().toISOString().slice(0, 10),
      notes: ""
    });
    setShowInvoiceModal(true);
  };

  const handleAddInvoice = async () => {
    if (!invoiceForm.invoice_number.trim() || !invoiceForm.date) {
      alert("Invoice number and date are required");
      return;
    }

    setInvoiceLoading(true);

    try {
      const { error } = await supabase.from("invoices").insert({
        vendor_id: invoiceVendor.id,
        invoice_number: invoiceForm.invoice_number.trim(),
        amount: invoiceForm.amount !== "" ? Number(invoiceForm.amount) : null,
        date: invoiceForm.date,
        notes: invoiceForm.notes.trim() || null,
      });

      if (error) throw error;

      setShowInvoiceModal(false);
      fetchAll();
    }
    catch (err) {
      alert("Error adding invoice: " + err.message);
    }
    finally {
      setInvoiceLoading(false);
    }
  };

  const deleteInvoice = async (id) => {
    if (!confirm("Delete this invoice?")) return;

    const { error } = await supabase.from("invoices").delete().eq("id", id);

    if (error) {
      alert("Error: " + error.message);
    }
    else {
      fetchAll();
    }
  };

  const exportCSV = () => {
    let exportVendors = [...vendors];

    if (exportDateFrom) {
      const from = new Date(`${exportDateFrom}T00:00:00`);
      exportVendors = exportVendors.filter(
        (v) => v.created_at && new Date(v.created_at) >= from
      );
    }

    if (exportDateTo) {
      const to = new Date(`${exportDateTo}T23:59:59.999`);
      exportVendors = exportVendors.filter(
        (v) => v.created_at && new Date(v.created_at) <= to
      );
    }

    const headers = ["Name", "Contact", "Notes", "Date Added"];

    const rows = exportVendors.map((v) => [
      v.name ?? "",
      v.contact ?? "",
      v.notes ?? "",
      v.created_at ? new Date(v.created_at).toLocaleDateString() : "",
    ]);

    const csv = [headers, ...rows]
      .map((row) =>
        row.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `vt-pantry-vendors-${new Date().toISOString().slice(0, 10)}.csv`
    );
    link.style.display = "none";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      window.URL.revokeObjectURL(url);
    }, 100);

    setShowExportModal(false);
  };

  const vendorInvoices = (vendorId) =>
    invoices.filter((i) => i.vendor_id === vendorId);

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Vendors</h1>
          <p className="subtitle">VT Food Pantry · Supplier Directory</p>
        </div>

        <div className="header-actions">
          <button
            className="btn btn-secondary"
            onClick={() => setShowExportModal(true)}
          >
            Export CSV
          </button>
          <button
            className="btn btn-primary"
            onClick={() => setShowForm(true)}
          >
            + Add Vendor
          </button>
        </div>
      </header>

      {loading ? (
        <div className="loading-state">
          <div className="spinner" />
          <p>Loading vendors…</p>
        </div>
      ) : vendors.length === 0 ? (
        <div className="empty-state">
          <p>No vendors yet.</p>
          <button
            className="btn btn-primary"
            onClick={() => setShowForm(true)}
          >
            + Add Vendor
          </button>
        </div>
      ) : (
        <div className="vendor-grid">
          {vendors.map((v) => {
            const vInvoices = vendorInvoices(v.id);
            const totalInvoiced = vInvoices.reduce(
              (sum, invoice) => sum + (invoice.amount || 0),
              0
            );

            return (
              <div key={v.id} className="vendor-card">
                <div className="vendor-card-header">
                  <span className="vendor-name">{v.name}</span>

                  <div className="vendor-actions">
                    <button
                      className="btn-action btn-edit"
                      onClick={() => openEditForm(v)}
                    >
                      Edit
                    </button>
                    <button
                      className="btn-action btn-delete"
                      onClick={() => deleteVendor(v)}
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {v.contact && <p className="vendor-detail">👤 {v.contact}</p>}
                {v.notes && <p className="vendor-notes">{v.notes}</p>}
                <p className="vendor-meta">
                  Added {new Date(v.created_at).toLocaleDateString()}
                </p>

                <div className="invoice-summary">
                  <div className="invoice-summary-row">
                    <span className="invoice-count">
                      {vInvoices.length} invoice{vInvoices.length !== 1 ? "s" : ""}
                    </span>

                    {totalInvoiced > 0 && (
                      <span className="invoice-total">
                        ${totalInvoiced.toFixed(2)} total
                      </span>
                    )}

                    <button
                      className="btn-action btn-invoice"
                      onClick={() => openInvoiceModal(v)}
                    >
                      + Invoice
                    </button>

                    {vInvoices.length > 0 && (
                      <button
                        className="btn-action btn-view"
                        onClick={() =>
                          setExpandedVendor(expandedVendor === v.id ? null : v.id)
                        }
                      >
                        {expandedVendor === v.id ? "Hide" : "View"}
                      </button>
                    )}
                  </div>

                  {expandedVendor === v.id && (
                    <div className="invoice-list">
                      {vInvoices.map((inv) => (
                        <div key={inv.id} className="invoice-row">
                          <div className="invoice-info">
                            <span className="invoice-num">
                              #{inv.invoice_number}
                            </span>
                            <span className="invoice-date">
                              {new Date(inv.date).toLocaleDateString()}
                            </span>
                            {inv.amount && (
                              <span className="invoice-amt">
                                ${Number(inv.amount).toFixed(2)}
                              </span>
                            )}
                            {inv.notes && (
                              <span className="invoice-note">{inv.notes}</span>
                            )}
                          </div>

                          <button
                            className="btn-action btn-delete"
                            onClick={() => deleteInvoice(inv.id)}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={closeForm}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingVendor ? "Edit Vendor" : "Add Vendor"}</h2>
              <button className="modal-close" onClick={closeForm}>
                ✕
              </button>
            </div>

            <VendorForm
              vendor={editingVendor}
              onSuccess={() => {
                closeForm();
                fetchAll();
              }}
              onCancel={closeForm}
            />
          </div>
        </div>
      )}

      {showInvoiceModal && invoiceVendor && (
        <div
          className="modal-overlay"
          onClick={() => setShowInvoiceModal(false)}
        >
          <div
            className="modal-box modal-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>Add Invoice — {invoiceVendor.name}</h2>
              <button
                className="modal-close"
                onClick={() => setShowInvoiceModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="inv-body">
              <label>
                Invoice Number *
                <input
                  placeholder="e.g. INV-1042"
                  value={invoiceForm.invoice_number}
                  onChange={(e) =>
                    setInvoiceForm((f) => ({
                      ...f,
                      invoice_number: e.target.value,
                    }))
                  }
                />
              </label>

              <label>
                Date *
                <input
                  type="date"
                  value={invoiceForm.date}
                  onChange={(e) =>
                    setInvoiceForm((f) => ({
                      ...f,
                      date: e.target.value,
                    }))
                  }
                />
              </label>

              <label>
                Amount ($)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="e.g. 125.00"
                  value={invoiceForm.amount}
                  onChange={(e) =>
                    setInvoiceForm((f) => ({
                      ...f,
                      amount: e.target.value,
                    }))
                  }
                />
              </label>

              <label>
                Notes (optional)
                <input
                  placeholder="e.g. Canned goods delivery"
                  value={invoiceForm.notes}
                  onChange={(e) =>
                    setInvoiceForm((f) => ({
                      ...f,
                      notes: e.target.value,
                    }))
                  }
                />
              </label>

              <div className="modal-actions">
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowInvoiceModal(false)}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleAddInvoice}
                  disabled={invoiceLoading}
                >
                  {invoiceLoading ? "Saving…" : "Add Invoice"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showExportModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowExportModal(false)}
        >
          <div
            className="modal-box modal-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>Export Vendors CSV</h2>
              <button
                className="modal-close"
                onClick={() => setShowExportModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="inv-body">
              <p
                style={{
                  fontSize: "0.875rem",
                  color: "#4b5563",
                  margin: 0,
                }}
              >
                Filter by date added. Leave blank to export all vendors.
              </p>

              <label>
                From date
                <input
                  type="date"
                  value={exportDateFrom}
                  onChange={(e) => setExportDateFrom(e.target.value)}
                />
              </label>

              <label>
                To date
                <input
                  type="date"
                  value={exportDateTo}
                  onChange={(e) => setExportDateTo(e.target.value)}
                />
              </label>

              <div className="modal-actions">
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowExportModal(false)}
                >
                  Cancel
                </button>
                <button className="btn btn-primary" onClick={exportCSV}>
                  Download CSV
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

        .btn-primary {
          background: #861f41;
          color: #fff;
        }

        .btn-primary:hover:not(:disabled) {
          background: #6e1835;
        }

        .btn-secondary {
          background: #fff;
          color: #374151;
          border: 1.5px solid #d1d5db;
        }

        .btn-secondary:hover {
          background: #f3f4f6;
        }

        .btn:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .vendor-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 16px;
          padding: 24px 36px;
        }

        .vendor-card {
          background: #fff;
          border-radius: 12px;
          padding: 18px;
          border: 1px solid #e5e7eb;
        }

        .vendor-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 10px;
        }

        .vendor-name {
          font-size: 1rem;
          font-weight: 700;
          color: #1a1a2e;
        }

        .vendor-actions {
          display: flex;
          gap: 6px;
        }

        .vendor-detail {
          font-size: 0.85rem;
          color: #4b5563;
          margin: 4px 0;
        }

        .vendor-notes {
          font-size: 0.82rem;
          color: #6b7280;
          margin: 6px 0;
          font-style: italic;
        }

        .vendor-meta {
          font-size: 0.75rem;
          color: #9ca3af;
          margin: 8px 0 0;
        }

        .btn-action {
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 0.78rem;
          font-weight: 600;
          cursor: pointer;
          border: none;
        }

        .btn-edit {
          background: #eff6ff;
          color: #2563eb;
        }

        .btn-delete {
          background: #fef2f2;
          color: #dc2626;
        }

        .btn-invoice {
          background: #f0fdf4;
          color: #16a34a;
        }

        .btn-view {
          background: #f5f3ff;
          color: #7c3aed;
        }

        .invoice-summary {
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid #f0f0f0;
        }

        .invoice-summary-row {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .invoice-count {
          font-size: 0.78rem;
          color: #6b7280;
        }

        .invoice-total {
          font-size: 0.78rem;
          font-weight: 700;
          color: #059669;
          background: #ecfdf5;
          padding: 2px 8px;
          border-radius: 999px;
        }

        .invoice-list {
          margin-top: 10px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .invoice-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #f9fafb;
          border-radius: 8px;
          padding: 8px 10px;
        }

        .invoice-info {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
          flex: 1;
        }

        .invoice-num {
          font-weight: 700;
          font-size: 0.82rem;
          color: #1a1a2e;
        }

        .invoice-date {
          font-size: 0.78rem;
          color: #6b7280;
        }

        .invoice-amt {
          font-size: 0.82rem;
          font-weight: 600;
          color: #059669;
        }

        .invoice-note {
          font-size: 0.78rem;
          color: #9ca3af;
          font-style: italic;
        }

        .loading-state,
        .empty-state {
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
          max-width: 480px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
        }

        .modal-sm {
          max-width: 380px;
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

        .inv-body {
          padding: 20px 24px 24px;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .inv-body label {
          display: flex;
          flex-direction: column;
          gap: 5px;
          font-size: 0.8rem;
          font-weight: 600;
          color: #374151;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }

        .inv-body input {
          padding: 9px 12px;
          border: 1.5px solid #d1d5db;
          border-radius: 8px;
          font-size: 0.9rem;
          font-family: inherit;
          outline: none;
        }

        .inv-body input:focus {
          border-color: #861f41;
        }

        .modal-actions {
          display: flex;
          gap: 10px;
          justify-content: flex-end;
          margin-top: 4px;
        }
      `}</style>
    </div>
  );
}