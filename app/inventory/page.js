"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import InventoryTable from "../components/InventoryTable";
import AddItemForm from "../components/AddItemForm";

const CATEGORIES = [
  "Grains", "Canned Goods", "Produce", "Dairy",
  "Protein", "Snacks", "Beverages", "Other",
];

export default function InventoryPage() {
  const [items, setItems] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showAddForm, setShowAddForm] = useState(false);
  const [showRestockModal, setShowRestockModal] = useState(false);
  const [restockItem, setRestockItem] = useState(null);
  const [restockQty, setRestockQty] = useState("");
  const [restockNotes, setRestockNotes] = useState("");
  const [restockLoading, setRestockLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterProgram, setFilterProgram] = useState("");
  const [filterLowStock, setFilterLowStock] = useState(false);
  const [sortField, setSortField] = useState("name");
  const [sortDir, setSortDir] = useState("asc");

  const [showCheckpointModal, setShowCheckpointModal] = useState(false);
  const [checkpointNotes, setCheckpointNotes] = useState("");
  const [checkpointLoading, setCheckpointLoading] = useState(false);

  const [showExportModal, setShowExportModal] = useState(false);
  const [exportDateFrom, setExportDateFrom] = useState("");
  const [exportDateTo, setExportDateTo] = useState("");

  useEffect(() => {
    supabase.from("programs").select("*").then(({ data }) => {
      if (data) setPrograms(data);
    });
  }, []);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from("items")
        .select("*, vendors(name), programs(name)")
        .order(sortField, { ascending: sortDir === "asc" });
      if (error) throw error;
      setItems(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [sortField, sortDir]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const filtered = items.filter((item) => {
    const vendorName = item.vendors?.name || "";
    const matchSearch =
      !search ||
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      vendorName.toLowerCase().includes(search.toLowerCase());
    const matchCat = !filterCategory || filterCategory === "All" || item.category === filterCategory;
    const matchProg = !filterProgram || filterProgram === "All" || item.program_id === filterProgram;
    const matchLow = !filterLowStock || item.quantity <= (item.low_stock_threshold ?? 5);
    return matchSearch && matchCat && matchProg && matchLow;
  });

  const totalItems = items.length;
  const totalUnits = items.reduce((s, i) => s + (i.quantity || 0), 0);
  const lowStockCount = items.filter((i) => i.quantity <= (i.low_stock_threshold ?? 5)).length;
  const totalWeight = items.reduce((s, i) => s + (i.weight || 0) * (i.quantity || 0), 0);

  const openRestock = (item) => {
    setRestockItem(item);
    setRestockQty("");
    setRestockNotes("");
    setShowRestockModal(true);
  };

  const handleRestock = async () => {
    if (!restockItem || !restockQty || isNaN(Number(restockQty))) return;
    setRestockLoading(true);
    try {
      const newQty = (restockItem.quantity || 0) + Number(restockQty);
      const { error: updateErr } = await supabase
        .from("items")
        .update({ quantity: newQty })
        .eq("id", restockItem.id);
      if (updateErr) throw updateErr;
      await supabase.from("audit_log").insert({
        action: "restock",
        details: {
          item_id: restockItem.id,
          item_name: restockItem.name,
          quantity_added: Number(restockQty),
          quantity_after: newQty,
          notes: restockNotes || null,
        },
      });
      setShowRestockModal(false);
      fetchItems();
    } catch (err) {
      alert("Error restocking: " + err.message);
    } finally {
      setRestockLoading(false);
    }
  };

  const handleCheckpoint = async () => {
    setCheckpointLoading(true);
    try {
      const snapshot = items.map((item) => ({
        item_id: item.id,
        item_name: item.name,
        quantity: item.quantity,
        category: item.category,
        program_id: item.program_id,
      }));
      const { error } = await supabase.from("checkpoints").insert({
        notes: checkpointNotes || null,
        snapshot,
      });
      if (error) throw error;
      setShowCheckpointModal(false);
      setCheckpointNotes("");
      alert("Checkpoint saved!");
    } catch (err) {
      alert("Error saving checkpoint: " + err.message);
    } finally {
      setCheckpointLoading(false);
    }
  };

  const toggleSort = (field) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("asc"); }
  };

  const exportCSV = () => {
    let exportItems = filtered;

    // Apply date range filter if set
    if (exportDateFrom) {
      exportItems = exportItems.filter((i) => new Date(i.created_at) >= new Date(exportDateFrom));
    }
    if (exportDateTo) {
      // Include the full end date by going to end of that day
      const end = new Date(exportDateTo);
      end.setHours(23, 59, 59, 999);
      exportItems = exportItems.filter((i) => new Date(i.created_at) <= end);
    }

    const headers = ["Name", "Category", "Program", "Quantity", "Weight (lbs)", "Price/Unit", "Price/lb", "Vendor", "Date Added"];
    const rows = exportItems.map((i) => [
      i.name,
      i.category ?? "",
      i.programs?.name ?? "",
      i.quantity ?? "",
      i.weight ?? "",
      i.price_per_unit ?? "",
      i.price_per_weight ?? "",
      i.vendors?.name ?? "",
      i.created_at ? new Date(i.created_at).toLocaleDateString() : "",
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vt-pantry-inventory-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportModal(false);
  };

  return (
    <div className="inventory-page">
      <header className="page-header">
        <div className="header-left">
          <h1>Inventory</h1>
          <p className="subtitle">VT Food Pantry · Stock Management</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={() => setShowCheckpointModal(true)}>Save Checkpoint</button>
          <button className="btn btn-secondary" onClick={() => setShowExportModal(true)}>Export CSV</button>
          <button className="btn btn-primary" onClick={() => setShowAddForm(true)}>+ Add Item</button>
        </div>
      </header>

      <div className="stats-bar">
        <div className="stat"><span className="stat-value">{totalItems}</span><span className="stat-label">Item Types</span></div>
        <div className="stat"><span className="stat-value">{totalUnits.toLocaleString()}</span><span className="stat-label">Total Units</span></div>
        <div className="stat"><span className="stat-value">{totalWeight.toLocaleString(undefined, { maximumFractionDigits: 0 })} lbs</span><span className="stat-label">Est. Weight</span></div>
        <div className={`stat ${lowStockCount > 0 ? "stat-warn" : ""}`}><span className="stat-value">{lowStockCount}</span><span className="stat-label">Low Stock</span></div>
      </div>

      <div className="filters-bar">
        <input className="search-input" placeholder="Search by name or vendor…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
          <option value="">All Categories</option>
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select value={filterProgram} onChange={(e) => setFilterProgram(e.target.value)}>
          <option value="">All Programs</option>
          {programs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <label className="toggle-label">
          <input type="checkbox" checked={filterLowStock} onChange={(e) => setFilterLowStock(e.target.checked)} />
          &nbsp;Low Stock Only
        </label>
        <span className="result-count">{filtered.length} items</span>
      </div>

      {error && (
        <div className="error-banner">
          Could not load inventory: {error}
          <button onClick={fetchItems}>Retry</button>
        </div>
      )}

      {loading ? (
        <div className="loading-state"><div className="spinner" /><p>Loading inventory…</p></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <p>{items.length === 0 ? "No items yet. Add your first item to get started." : "No items match your filters."}</p>
          {items.length === 0 && <button className="btn btn-primary" onClick={() => setShowAddForm(true)}>+ Add First Item</button>}
        </div>
      ) : (
        <InventoryTable items={filtered} sortField={sortField} sortDir={sortDir} onSort={toggleSort} onRestock={openRestock} onRefresh={fetchItems} programs={programs} />
      )}

      {/* Add Item Modal */}
      {showAddForm && (
        <div className="modal-overlay" onClick={() => setShowAddForm(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add New Item</h2>
              <button className="modal-close" onClick={() => setShowAddForm(false)}>✕</button>
            </div>
            <AddItemForm onSuccess={() => { setShowAddForm(false); fetchItems(); }} onCancel={() => setShowAddForm(false)} programs={programs} />
          </div>
        </div>
      )}

      {/* Restock Modal */}
      {showRestockModal && restockItem && (
        <div className="modal-overlay" onClick={() => setShowRestockModal(false)}>
          <div className="modal-box modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Quick Restock</h2>
              <button className="modal-close" onClick={() => setShowRestockModal(false)}>✕</button>
            </div>
            <div className="restock-body">
              <p className="restock-item-name">{restockItem.name}</p>
              <p className="restock-current">Current stock: <strong>{restockItem.quantity}</strong></p>
              <label>Add quantity<input type="number" min="1" placeholder="e.g. 24" value={restockQty} onChange={(e) => setRestockQty(e.target.value)} autoFocus /></label>
              <label>Notes (optional)<input type="text" placeholder="e.g. Invoice #1042" value={restockNotes} onChange={(e) => setRestockNotes(e.target.value)} /></label>
              {restockQty && !isNaN(Number(restockQty)) && (
                <p className="restock-preview">New total: <strong>{(restockItem.quantity || 0) + Number(restockQty)}</strong></p>
              )}
              <div className="modal-actions">
                <button className="btn btn-secondary" onClick={() => setShowRestockModal(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleRestock} disabled={restockLoading || !restockQty}>{restockLoading ? "Saving…" : "Add Stock"}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Checkpoint Modal */}
      {showCheckpointModal && (
        <div className="modal-overlay" onClick={() => setShowCheckpointModal(false)}>
          <div className="modal-box modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Save Checkpoint</h2>
              <button className="modal-close" onClick={() => setShowCheckpointModal(false)}>✕</button>
            </div>
            <div className="restock-body">
              <p>Saves a snapshot of all current stock as a new baseline.</p>
              <label>Notes (optional)<input type="text" placeholder="e.g. Start of Fall 2025" value={checkpointNotes} onChange={(e) => setCheckpointNotes(e.target.value)} /></label>
              <div className="modal-actions">
                <button className="btn btn-secondary" onClick={() => setShowCheckpointModal(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleCheckpoint} disabled={checkpointLoading}>{checkpointLoading ? "Saving…" : "Save Checkpoint"}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Export CSV Modal */}
      {showExportModal && (
        <div className="modal-overlay" onClick={() => setShowExportModal(false)}>
          <div className="modal-box modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Export CSV</h2>
              <button className="modal-close" onClick={() => setShowExportModal(false)}>✕</button>
            </div>
            <div className="restock-body">
              <p>Filter by date added. Leave blank to export all currently visible items.</p>
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
        .inventory-page { min-height: 100vh; background: #f7f8fa; font-family: "DM Sans", sans-serif; padding: 0 0 60px; }
        .page-header { display: flex; align-items: center; justify-content: space-between; padding: 28px 36px 20px; background: #fff; border-bottom: 2px solid #e8eaed; flex-wrap: wrap; gap: 12px; }
        .page-header h1 { font-size: 1.75rem; font-weight: 700; color: #1a1a2e; margin: 0; }
        .subtitle { margin: 2px 0 0; font-size: 0.85rem; color: #6b7280; }
        .header-actions { display: flex; gap: 10px; flex-wrap: wrap; }
        .btn { padding: 9px 18px; border-radius: 8px; font-size: 0.875rem; font-weight: 600; cursor: pointer; border: none; transition: all 0.15s; }
        .btn-primary { background: #861f41; color: #fff; }
        .btn-primary:hover:not(:disabled) { background: #6e1835; }
        .btn-secondary { background: #fff; color: #374151; border: 1.5px solid #d1d5db; }
        .btn-secondary:hover { background: #f3f4f6; }
        .btn:disabled { opacity: 0.55; cursor: not-allowed; }
        .stats-bar { display: flex; background: #fff; border-bottom: 2px solid #e8eaed; }
        .stat { flex: 1; padding: 16px 24px; border-right: 1px solid #e8eaed; display: flex; flex-direction: column; align-items: center; }
        .stat:last-child { border-right: none; }
        .stat-value { font-size: 1.5rem; font-weight: 700; color: #1a1a2e; }
        .stat-label { font-size: 0.75rem; color: #6b7280; text-transform: uppercase; letter-spacing: 0.04em; margin-top: 2px; }
        .stat-warn .stat-value { color: #dc2626; }
        .filters-bar { display: flex; align-items: center; gap: 10px; padding: 16px 36px; flex-wrap: wrap; background: #fff; border-bottom: 1px solid #e8eaed; }
        .search-input { flex: 1; min-width: 200px; padding: 9px 14px; border: 1.5px solid #d1d5db; border-radius: 8px; font-size: 0.875rem; font-family: inherit; outline: none; }
        .search-input:focus { border-color: #861f41; }
        .filters-bar select { padding: 9px 12px; border: 1.5px solid #d1d5db; border-radius: 8px; font-size: 0.875rem; font-family: inherit; background: #fff; cursor: pointer; outline: none; }
        .filters-bar select:focus { border-color: #861f41; }
        .toggle-label { display: flex; align-items: center; gap: 6px; font-size: 0.875rem; color: #374151; cursor: pointer; white-space: nowrap; }
        .result-count { margin-left: auto; font-size: 0.8rem; color: #9ca3af; }
        .loading-state, .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 80px 20px; gap: 16px; color: #6b7280; }
        .spinner { width: 36px; height: 36px; border: 3px solid #e5e7eb; border-top-color: #861f41; border-radius: 50%; animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .error-banner { margin: 16px 36px; padding: 12px 16px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; color: #b91c1c; display: flex; align-items: center; gap: 12px; font-size: 0.875rem; }
        .error-banner button { margin-left: auto; padding: 4px 12px; background: #b91c1c; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-size: 0.8rem; }
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 20px; }
        .modal-box { background: #fff; border-radius: 14px; width: 100%; max-width: 680px; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.25); }
        .modal-sm { max-width: 420px; }
        .modal-header { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px 0; }
        .modal-header h2 { font-size: 1.1rem; font-weight: 700; color: #1a1a2e; margin: 0; }
        .modal-close { background: none; border: none; font-size: 1.1rem; cursor: pointer; color: #6b7280; padding: 4px 8px; border-radius: 6px; }
        .modal-close:hover { background: #f3f4f6; }
        .restock-body { padding: 20px 24px 24px; display: flex; flex-direction: column; gap: 14px; }
        .restock-item-name { font-size: 1.1rem; font-weight: 700; color: #1a1a2e; margin: 0; }
        .restock-current { font-size: 0.875rem; color: #6b7280; margin: 0; }
        .restock-preview { font-size: 0.875rem; color: #059669; margin: 0; background: #ecfdf5; padding: 8px 12px; border-radius: 6px; }
        .restock-body label { display: flex; flex-direction: column; gap: 5px; font-size: 0.8rem; font-weight: 600; color: #374151; text-transform: uppercase; letter-spacing: 0.03em; }
        .restock-body input { padding: 9px 12px; border: 1.5px solid #d1d5db; border-radius: 8px; font-size: 0.9rem; font-family: inherit; outline: none; }
        .restock-body input:focus { border-color: #861f41; }
        .restock-body p { font-size: 0.875rem; color: #4b5563; margin: 0; line-height: 1.5; }
        .modal-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 4px; }
        @media (max-width: 640px) { .page-header { padding: 20px; } .stats-bar { flex-wrap: wrap; } .stat { flex: 1 1 45%; } .filters-bar { padding: 12px 20px; } }
      `}</style>
    </div>
  );
}