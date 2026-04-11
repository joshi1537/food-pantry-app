'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const CATEGORIES = [
  "Grains", "Canned Goods", "Produce", "Dairy",
  "Protein", "Snacks", "Beverages", "Other",
];

export default function AddItemForm({ onSuccess, onCancel, programs: programsProp }) {
  const [vendors, setVendors] = useState([]);
  const [programs, setPrograms] = useState(programsProp || []);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const [form, setForm] = useState({
    name: "",
    category: "",
    vendor_id: "",
    weight: "",
    quantity: "",
    price_per_unit: "",
    price_per_weight: "",
    program_id: "",
    low_stock_threshold: "5",
  });

  useEffect(() => {
    supabase.from('vendors').select('*').then(({ data }) => setVendors(data || []));
    if (!programsProp?.length) {
      supabase.from('programs').select('*').then(({ data }) => setPrograms(data || []));
    }
  }, []);

  const set = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        name: form.name.trim(),
        category: form.category || null,
        vendor_id: form.vendor_id || null,
        weight: form.weight !== "" ? Number(form.weight) : null,
        quantity: form.quantity !== "" ? Number(form.quantity) : 0,
        price_per_unit: form.price_per_unit !== "" ? Number(form.price_per_unit) : null,
        price_per_weight: form.price_per_weight !== "" ? Number(form.price_per_weight) : null,
        program_id: form.program_id || null,
        low_stock_threshold: form.low_stock_threshold !== "" ? Number(form.low_stock_threshold) : 5,
      };
      const { error: err } = await supabase.from('items').insert([payload]);
      if (err) throw err;
      onSuccess?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="form-wrap">
      {error && <div className="form-error">⚠ {error}</div>}

      <form onSubmit={handleSubmit}>
        {/* Row 1 */}
        <div className="form-row">
          <div className="field field-wide">
            <label>Item Name *</label>
            <input name="name" placeholder="e.g. Canned Black Beans" value={form.name} onChange={set} required />
          </div>
          <div className="field">
            <label>Category</label>
            <select name="category" value={form.category} onChange={set}>
              <option value="">Select category</option>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {/* Row 2 */}
        <div className="form-row">
          <div className="field">
            <label>Quantity</label>
            <input name="quantity" type="number" min="0" placeholder="e.g. 48" value={form.quantity} onChange={set} />
          </div>
          <div className="field">
            <label>Weight per unit (lbs)</label>
            <input name="weight" type="number" min="0" step="any" placeholder="e.g. 1.5" value={form.weight} onChange={set} />
          </div>
        </div>

        {/* Row 3 */}
        <div className="form-row">
          <div className="field">
            <label>Price per unit ($)</label>
            <input name="price_per_unit" type="number" min="0" step="any" placeholder="e.g. 0.89" value={form.price_per_unit} onChange={set} />
          </div>
          <div className="field">
            <label>Price per lb ($)</label>
            <input name="price_per_weight" type="number" min="0" step="any" placeholder="e.g. 0.50" value={form.price_per_weight} onChange={set} />
          </div>
          <div className="field">
            <label>Low stock alert at</label>
            <input name="low_stock_threshold" type="number" min="0" placeholder="e.g. 5" value={form.low_stock_threshold} onChange={set} />
          </div>
        </div>

        {/* Row 4 */}
        <div className="form-row">
          <div className="field">
            <label>Vendor</label>
            <select name="vendor_id" value={form.vendor_id} onChange={set}>
              <option value="">Select vendor</option>
              {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Program</label>
            <select name="program_id" value={form.program_id} onChange={set}>
              <option value="">Select program</option>
              {programs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        </div>

        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={submitting || !form.name.trim()}>
            {submitting ? "Adding…" : "Add Item"}
          </button>
        </div>
      </form>

      <style jsx>{`
        .form-wrap { padding: 20px 24px 28px; }
        .form-error { background: #fef2f2; border: 1px solid #fecaca; color: #b91c1c; border-radius: 8px; padding: 10px 14px; font-size: 0.875rem; margin-bottom: 16px; }
        .form-row { display: flex; gap: 14px; margin-bottom: 16px; flex-wrap: wrap; }
        .field { display: flex; flex-direction: column; gap: 5px; flex: 1; min-width: 140px; }
        .field-wide { flex: 2; min-width: 200px; }
        .field label { font-size: 0.75rem; font-weight: 700; color: #374151; text-transform: uppercase; letter-spacing: 0.04em; }
        .field input, .field select {
          padding: 9px 12px;
          border: 1.5px solid #d1d5db;
          border-radius: 8px;
          font-size: 0.9rem;
          font-family: "DM Sans", sans-serif;
          color: #1f2937;
          background: #fff;
          outline: none;
          transition: border-color 0.15s;
          width: 100%;
          box-sizing: border-box;
        }
        .field input:focus, .field select:focus { border-color: #861f41; }
        .field input::placeholder { color: #9ca3af; }
        .form-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 8px; padding-top: 16px; border-top: 1px solid #f0f0f0; }
        .btn { padding: 9px 20px; border-radius: 8px; font-size: 0.875rem; font-weight: 600; cursor: pointer; border: none; transition: all 0.15s; font-family: "DM Sans", sans-serif; }
        .btn-primary { background: #861f41; color: #fff; }
        .btn-primary:hover:not(:disabled) { background: #6e1835; }
        .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn-secondary { background: #fff; color: #374151; border: 1.5px solid #d1d5db; }
        .btn-secondary:hover { background: #f3f4f6; }
      `}</style>
    </div>
  );
}