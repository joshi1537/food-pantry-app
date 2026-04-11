"use client";
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function TransferForm({ programs, onSuccess, onCancel }) {
  const [items, setItems] = useState([]);
  const [itemId, setItemId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [fromProgram, setFromProgram] = useState("");
  const [toProgram, setToProgram] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.from("items").select("id, name, quantity").order("name").then(({ data }) => {
      setItems(data || []);
    });
  }, []);

  const selectedItem = items.find((i) => i.id === itemId);

  const handleSubmit = async () => {
    if (!itemId || !quantity || !fromProgram || !toProgram) {
      alert("Please fill in all fields");
      return;
    }
    if (fromProgram === toProgram) {
      alert("From and To programs cannot be the same");
      return;
    }
    const qtyNum = Number(quantity);
    if (isNaN(qtyNum) || qtyNum <= 0) {
      alert("Quantity must be a positive number");
      return;
    }
    if (selectedItem && qtyNum > selectedItem.quantity) {
      alert(`Not enough stock. Current quantity: ${selectedItem.quantity}`);
      return;
    }
    setLoading(true);
    try {
      const { error: transferError } = await supabase.from("transactions").insert({
        item_id: itemId,
        type: "transfer",
        quantity: qtyNum,
        from_program: fromProgram,
        to_program: toProgram,
        note,
      });
      if (transferError) throw transferError;

      const { error: updateError } = await supabase.from("items")
        .update({ quantity: selectedItem.quantity - qtyNum })
        .eq("id", itemId);
      if (updateError) throw updateError;

      await supabase.from("audit_log").insert({
        action: "transfer",
        details: {
          item_id: itemId,
          item_name: selectedItem.name,
          quantity: qtyNum,
          from_program: fromProgram,
          to_program: toProgram,
          note,
        },
      });

      onSuccess();
    } catch (error) {
      alert("Error processing transfer: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-body">
      <label>
        Item *
        <select value={itemId} onChange={(e) => setItemId(e.target.value)}>
          <option value="">Select an item…</option>
          {items.map((i) => (
            <option key={i.id} value={i.id}>{i.name} (stock: {i.quantity})</option>
          ))}
        </select>
      </label>

      <label>
        Quantity to Transfer *
        <input
          type="number"
          min="1"
          placeholder="e.g. 10"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
        />
      </label>
      {selectedItem && quantity && !isNaN(Number(quantity)) && (
        <p className="stock-note">
          Remaining after transfer: <strong>{selectedItem.quantity - Number(quantity)}</strong>
        </p>
      )}

      <label>
        From Program *
        <select value={fromProgram} onChange={(e) => setFromProgram(e.target.value)}>
          <option value="">Select program…</option>
          {programs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </label>

      <label>
        To Program *
        <select value={toProgram} onChange={(e) => setToProgram(e.target.value)}>
          <option value="">Select program…</option>
          {programs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </label>

      <label>
        Note (optional)
        <input
          type="text"
          placeholder="e.g. Overflow from donation drive"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </label>

      <div className="form-actions">
        <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
          {loading ? "Processing…" : "Submit Transfer"}
        </button>
      </div>

      <style jsx>{`
        .form-body { padding: 20px 24px 24px; display: flex; flex-direction: column; gap: 14px; font-family: "DM Sans", sans-serif; }
        label { display: flex; flex-direction: column; gap: 5px; font-size: 0.8rem; font-weight: 600; color: #374151; text-transform: uppercase; letter-spacing: 0.03em; }
        input, select { padding: 9px 12px; border: 1.5px solid #d1d5db; border-radius: 8px; font-size: 0.9rem; font-family: inherit; outline: none; background: #fff; }
        input:focus, select:focus { border-color: #861f41; }
        .stock-note { font-size: 0.85rem; color: #059669; background: #ecfdf5; padding: 8px 12px; border-radius: 6px; margin: 0; }
        .form-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 4px; }
        .btn { padding: 9px 18px; border-radius: 8px; font-size: 0.875rem; font-weight: 600; cursor: pointer; border: none; }
        .btn-primary { background: #861f41; color: #fff; }
        .btn-primary:hover:not(:disabled) { background: #6e1835; }
        .btn-secondary { background: #fff; color: #374151; border: 1.5px solid #d1d5db; }
        .btn:disabled { opacity: 0.55; cursor: not-allowed; }
      `}</style>
    </div>
  );
}