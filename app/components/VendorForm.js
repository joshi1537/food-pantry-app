"use client";

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function VendorForm({ vendor, onSuccess, onCancel }) {
  // If vendor is passed in, we're editing. Otherwise, adding new.
  const [name, setName] = useState(vendor?.name || "");
  const [contact, setContact] = useState(vendor?.contact || "");
  const [notes, setNotes] = useState(vendor?.notes || "");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) { alert("Name is required"); return; }
    setLoading(true);
     try {
      const payload = {
        name: name.trim(),
        contact: contact.trim() || null,
        notes: notes.trim() || null,
      };

      if (vendor) {
        // Editing existing vendor — UPDATE
        const { error } = await supabase.from("vendors").update(payload).eq("id", vendor.id);
        if (error) throw error;
      } else {
        // New vendor — INSERT
        const { error } = await supabase.from("vendors").insert(payload);
        if (error) throw error;
      }
        onSuccess();
        } catch (error) {
            alert("Error saving vendor: " + error.message);
        } finally {
            setLoading(false);
        }
    };
    return (
    <div className="form-body">
      <label>
        Vendor Name *
        <input
          type="text"
          placeholder="e.g. Feeding America"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
      </label>
      <label>
        Contact Person
        <input
          type="text"
          placeholder="e.g. Jane Smith, 540-000-0000"
          value={contact}
          onChange={(e) => setContact(e.target.value)}
        />
      </label>
      <label>
        Notes
        <textarea
          placeholder="Any extra info about this vendor…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
        />
      </label>

      <div className="form-actions">
        <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
          {loading ? "Saving…" : vendor ? "Save Changes" : "Add Vendor"}
        </button>
      </div>

      <style jsx>{`
        .form-body { padding: 20px 24px 24px; display: flex; flex-direction: column; gap: 14px; font-family: "DM Sans", sans-serif; }
        label { display: flex; flex-direction: column; gap: 5px; font-size: 0.8rem; font-weight: 600; color: #374151; text-transform: uppercase; letter-spacing: 0.03em; }
        input, textarea { padding: 9px 12px; border: 1.5px solid #d1d5db; border-radius: 8px; font-size: 0.9rem; font-family: inherit; outline: none; resize: vertical; }
        input:focus, textarea:focus { border-color: #861f41; }
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