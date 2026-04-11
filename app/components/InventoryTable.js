"use client";

import { useState } from 'react'
import { supabase } from '../lib/supabase'

const CATEGORIES = [
  "Grains", "Canned Goods", "Produce", "Dairy",
  "Protein", "Snacks", "Beverages", "Other",
];

export default function InventoryTable({ items, sortField, sortDir, onSort, onRestock, onRefresh, programs }) {
  const [editingItem, setEditingItem] = useState(null);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);

  const arrow = (field) => {
    if (sortField !== field) return " ↕";
    return sortDir === "asc" ? " ↑" : " ↓";
  };

  const startEdit = (item) => {
    setEditingItem(item);
    setEditData({
      name: item.name,
      category: item.category ?? "",
      program_id: item.program_id ?? "",
      quantity: item.quantity ?? "",
      weight: item.weight ?? "",
      price_per_unit: item.price_per_unit ?? "",
      price_per_weight: item.price_per_weight ?? "",
      low_stock_threshold: item.low_stock_threshold ?? 5,
    });
  };

  const saveEdit = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("items")
        .update({
          name: editData.name,
          category: editData.category || null,
          program_id: editData.program_id || null,
          quantity: Number(editData.quantity),
          weight: editData.weight !== "" ? Number(editData.weight) : null,
          price_per_unit: editData.price_per_unit !== "" ? Number(editData.price_per_unit) : null,
          price_per_weight: editData.price_per_weight !== "" ? Number(editData.price_per_weight) : null,
          low_stock_threshold: Number(editData.low_stock_threshold),
        })
        .eq("id", editingItem.id);

      if (error) throw error;

      await supabase.from("audit_log").insert({
        action: "edit",
        details: { item_id: editingItem.id, item_name: editingItem.name, changes: editData },
      });

      setEditingItem(null);
      onRefresh();
    } catch (err) {
      alert("Error saving: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteItem = async (item) => {
    if (!confirm(`Delete "${item.name}"? This cannot be undone.`)) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("items").delete().eq("id", item.id);
      if (error) throw error;
      await supabase.from("audit_log").insert({
        action: "delete",
        details: { item_id: item.id, item_name: item.name },
      });
      onRefresh();
    } catch (err) {
      alert("Error deleting: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const set = (e) => setEditData((d) => ({ ...d, [e.target.name]: e.target.value }));

  return (
    <>
      <div className="table-wrap">
        <table className="inv-table">
          <thead>
            <tr>
              <th onClick={() => onSort("name")} className="sortable">Name{arrow("name")}</th>
              <th onClick={() => onSort("category")} className="sortable">Category{arrow("category")}</th>
              <th>Program</th>
              <th onClick={() => onSort("quantity")} className="sortable">Qty{arrow("quantity")}</th>
              <th>Weight (lbs)</th>
              <th>$/Unit</th>
              <th>$/lb</th>
              <th>Vendor</th>
              <th>Low Stock At</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const isLow = item.quantity <= (item.low_stock_threshold ?? 5);
              return (
                <tr key={item.id} className={isLow ? "row-low" : ""}>
                  <td><span className="item-name">{item.name}</span></td>
                  <td><span className="badge">{item.category ?? "—"}</span></td>
                  <td>{item.programs?.name ?? "—"}</td>
                  <td className={isLow ? "qty-low" : "qty"}>{item.quantity}</td>
                  <td>{item.weight ?? "—"}</td>
                  <td>{item.price_per_unit != null ? `$${item.price_per_unit}` : "—"}</td>
                  <td>{item.price_per_weight != null ? `$${item.price_per_weight}` : "—"}</td>
                  <td>{item.vendors?.name ?? "—"}</td>
                  <td>{item.low_stock_threshold ?? 5}</td>
                  <td className="actions-cell">
                    <button className="btn-action btn-restock" onClick={() => onRestock(item)}>+ Restock</button>
                    <button className="btn-action btn-edit" onClick={() => startEdit(item)}>Edit</button>
                    <button className="btn-action btn-delete" onClick={() => deleteItem(item)} disabled={saving}>Delete</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {editingItem && (
        <div className="modal-overlay" onClick={() => setEditingItem(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Item</h2>
              <button className="modal-close" onClick={() => setEditingItem(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="field field-wide">
                  <label>Item Name *</label>
                  <input name="name" value={editData.name} onChange={set} />
                </div>
                <div className="field">
                  <label>Category</label>
                  <select name="category" value={editData.category} onChange={set}>
                    <option value="">Select category</option>
                    {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="field">
                  <label>Quantity</label>
                  <input name="quantity" type="number" min="0" value={editData.quantity} onChange={set} />
                </div>
                <div className="field">
                  <label>Weight per unit (lbs)</label>
                  <input name="weight" type="number" min="0" step="any" value={editData.weight} onChange={set} />
                </div>
                <div className="field">
                  <label>Low stock alert at</label>
                  <input name="low_stock_threshold" type="number" min="0" value={editData.low_stock_threshold} onChange={set} />
                </div>
              </div>
              <div className="form-row">
                <div className="field">
                  <label>Price per unit ($)</label>
                  <input name="price_per_unit" type="number" min="0" step="any" value={editData.price_per_unit} onChange={set} />
                </div>
                <div className="field">
                  <label>Price per lb ($)</label>
                  <input name="price_per_weight" type="number" min="0" step="any" value={editData.price_per_weight} onChange={set} />
                </div>
              </div>
              <div className="form-row">
                <div className="field">
                  <label>Program</label>
                  <select name="program_id" value={editData.program_id} onChange={set}>
                    <option value="">Select program</option>
                    {programs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="modal-actions">
                <button className="btn btn-secondary" onClick={() => setEditingItem(null)}>Cancel</button>
                <button className="btn btn-primary" onClick={saveEdit} disabled={saving || !editData.name?.trim()}>
                  {saving ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .table-wrap { overflow-x: auto; margin: 0; }
        .inv-table { width: 100%; border-collapse: collapse; font-size: 0.875rem; font-family: "DM Sans", sans-serif; }
        .inv-table thead tr { background: #f3f4f6; border-bottom: 2px solid #e5e7eb; }
        .inv-table th { padding: 11px 14px; text-align: left; font-size: 0.75rem; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.04em; white-space: nowrap; }
        .sortable { cursor: pointer; user-select: none; }
        .sortable:hover { color: #861f41; }
        .inv-table td { padding: 10px 14px; border-bottom: 1px solid #f0f0f0; vertical-align: middle; color: #1f2937; }
        .inv-table tbody tr:hover { background: #fafafa; }
        .row-low { background: #fff9f9 !important; }
        .item-name { font-weight: 600; }
        .badge { display: inline-block; padding: 2px 8px; background: #f3f4f6; border-radius: 999px; font-size: 0.75rem; color: #374151; }
        .qty { font-weight: 700; color: #1a1a2e; }
        .qty-low { font-weight: 700; color: #dc2626; }
        .actions-cell { display: flex; gap: 6px; align-items: center; }
        .btn-action { padding: 5px 10px; border-radius: 6px; font-size: 0.78rem; font-weight: 600; cursor: pointer; border: none; white-space: nowrap; transition: all 0.12s; }
        .btn-restock { background: #ecfdf5; color: #059669; }
        .btn-restock:hover { background: #d1fae5; }
        .btn-edit { background: #eff6ff; color: #2563eb; }
        .btn-edit:hover { background: #dbeafe; }
        .btn-delete { background: #fef2f2; color: #dc2626; }
        .btn-delete:hover { background: #fee2e2; }
        .btn-action:disabled { opacity: 0.5; cursor: not-allowed; }
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center; z-index: 200; padding: 20px; }
        .modal-box { background: #fff; border-radius: 14px; width: 100%; max-width: 640px; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.25); }
        .modal-header { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px 0; }
        .modal-header h2 { font-size: 1.1rem; font-weight: 700; color: #1a1a2e; margin: 0; }
        .modal-close { background: none; border: none; font-size: 1.1rem; cursor: pointer; color: #6b7280; padding: 4px 8px; border-radius: 6px; }
        .modal-close:hover { background: #f3f4f6; }
        .modal-body { padding: 20px 24px 24px; display: flex; flex-direction: column; gap: 0; }
        .form-row { display: flex; gap: 14px; margin-bottom: 16px; flex-wrap: wrap; }
        .field { display: flex; flex-direction: column; gap: 5px; flex: 1; min-width: 130px; }
        .field-wide { flex: 2; min-width: 200px; }
        .field label { font-size: 0.75rem; font-weight: 700; color: #374151; text-transform: uppercase; letter-spacing: 0.04em; }
        .field input, .field select { padding: 9px 12px; border: 1.5px solid #d1d5db; border-radius: 8px; font-size: 0.9rem; font-family: "DM Sans", sans-serif; color: #1f2937; background: #fff; outline: none; transition: border-color 0.15s; width: 100%; box-sizing: border-box; }
        .field input:focus, .field select:focus { border-color: #861f41; }
        .modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 8px; padding-top: 16px; border-top: 1px solid #f0f0f0; }
        .btn { padding: 9px 20px; border-radius: 8px; font-size: 0.875rem; font-weight: 600; cursor: pointer; border: none; transition: all 0.15s; font-family: "DM Sans", sans-serif; }
        .btn-primary { background: #861f41; color: #fff; }
        .btn-primary:hover:not(:disabled) { background: #6e1835; }
        .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn-secondary { background: #fff; color: #374151; border: 1.5px solid #d1d5db; }
        .btn-secondary:hover { background: #f3f4f6; }
      `}</style>
    </>
  );
}