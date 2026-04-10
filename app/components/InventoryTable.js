"use client";

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function InventoryTable({items, sortField, sortDir, onSort, onRestock, onRefresh, programs}) {
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);

  const arrow = (field) => {
    if (sortField !== field) return " ↕";
    return sortDir === "asc" ? " ↑" : " ↓";
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setEditData({
      name: item.name,
      category: item.category,
      program_id: item.program_id,
      quantity: item.quantity,
      unit: item.unit,
      weight: item.weight ?? "",
      price_per_unit: item.price_per_unit ?? "",
      price_per_weight: item.price_per_weight ?? "",
      low_stock_threshold: item.low_stock_threshold ?? 5,
    });
  };

  const saveEdit = async (item) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("items")
        .update({
          name: editData.name,
          category: editData.category,
          program_id: editData.program_id,
          quantity: Number(editData.quantity),
          unit: editData.unit,
          weight: editData.weight !== "" ? Number(editData.weight) : null,
          price_per_unit: editData.price_per_unit !== "" ? Number(editData.price_per_unit) : null,
          price_per_weight: editData.price_per_weight !== "" ? Number(editData.price_per_weight) : null,
          low_stock_threshold: Number(editData.low_stock_threshold),
        })
        .eq("id", item.id);

      if (error) throw error;

      await supabase.from("audit_log").insert({
        action: "edit",
        item_id: item.id,
        details: { item_id: item.id, item_name: item.name, changes: editData },
      });

      setEditingId(null);
      onRefresh();
    } catch (error) {
      alert("Error saving edit: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData({});
  };

  const deleteItem = async (item) => {
    if (!confirm(`Are you sure you want to delete ${item.name}?`)) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("items").delete().eq("id", item.id);
      if (error) throw error;
      
      await supabase.from("audit_log").insert({
        action: "delete",
        item_id: item.id,
        details: { item_id: item.id, item_name: item.name },
      });

      onRefresh();
    } catch (error) {
      alert("Error deleting item: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const field = (key) => (
    <input
      className="edit-input"
      value={editData[key] ?? ""}
      onChange={(e) => setEditData((d) => ({ ...d, [key]: e.target.value }))}
    />
  );

  return (
    <div className="table-wrap">
      <table className="inv-table">
        <thead>
          <tr>
            <th onClick={() => onSort("name")} className="sortable">Name{arrow("name")}</th>
            <th onClick={() => onSort("category")} className="sortable">Category{arrow("category")}</th>
            <th>Program</th>
            <th onClick={() => onSort("quantity")} className="sortable">Qty{arrow("quantity")}</th>
            <th>Unit</th>
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
            const isEditing = editingId === item.id;

            return (
              <tr key={item.id} className={isLow ? "row-low" : ""}>
                <td>{isEditing ? field("name") : <span className="item-name">{item.name}</span>}</td>
                <td>
                  {isEditing ? (
                    <input className="edit-input" value={editData.category} onChange={(e) => setEditData((d) => ({ ...d, category: e.target.value }))} />
                  ) : (
                    <span className="badge">{item.category}</span>
                  )}
                </td>
                <td>
                  {isEditing ? (
                    <select className="edit-input" value={editData.program_id} onChange={(e) => setEditData((d) => ({ ...d, program_id: e.target.value }))}>
                      {programs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  ) : (
                    item.programs?.name ?? "—"
                  )}
                </td>
                <td className={isLow ? "qty-low" : "qty"}>{isEditing ? field("quantity") : item.quantity}</td>
                <td>{isEditing ? field("unit") : item.unit}</td>
                <td>{isEditing ? field("weight") : (item.weight ?? "—")}</td>
                <td>{isEditing ? field("price_per_unit") : (item.price_per_unit != null ? `$${item.price_per_unit}` : "—")}</td>
                <td>{isEditing ? field("price_per_weight") : (item.price_per_weight != null ? `$${item.price_per_weight}` : "—")}</td>
                <td>{item.vendors?.name ?? "—"}</td>
                <td>{isEditing ? field("low_stock_threshold") : (item.low_stock_threshold ?? 5)}</td>
                <td className="actions-cell">
                  {isEditing ? (
                    <>
                      <button className="btn-action btn-save" onClick={() => saveEdit(item)} disabled={saving}>
                        {saving ? "…" : "✓ Save"}
                      </button>
                      <button className="btn-action btn-cancel" onClick={cancelEdit}>Cancel</button>
                    </>
                  ) : (
                    <>
                      <button className="btn-action btn-restock" onClick={() => onRestock(item)}>+ Restock</button>
                      <button className="btn-action btn-edit" onClick={() => startEdit(item)}>Edit</button>
                      <button className="btn-action btn-delete" onClick={() => deleteItem(item)}>Delete</button>
                    </>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

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
        .actions-cell { display: flex; gap: 6px; align-items: center; flex-wrap: nowrap; }
        .btn-action { padding: 5px 10px; border-radius: 6px; font-size: 0.78rem; font-weight: 600; cursor: pointer; border: none; white-space: nowrap; transition: all 0.12s; }
        .btn-restock { background: #ecfdf5; color: #059669; }
        .btn-restock:hover { background: #d1fae5; }
        .btn-edit { background: #eff6ff; color: #2563eb; }
        .btn-edit:hover { background: #dbeafe; }
        .btn-delete { background: #fef2f2; color: #dc2626; }
        .btn-delete:hover { background: #fee2e2; }
        .btn-save { background: #861f41; color: #fff; }
        .btn-save:hover:not(:disabled) { background: #6e1835; }
        .btn-cancel { background: #f3f4f6; color: #374151; }
        .btn-cancel:hover { background: #e5e7eb; }
        .btn-action:disabled { opacity: 0.5; cursor: not-allowed; }
        .edit-input { width: 100%; padding: 4px 7px; border: 1.5px solid #861f41; border-radius: 5px; font-size: 0.85rem; font-family: inherit; outline: none; min-width: 60px; }
      `}</style>
    </div>
  );
}