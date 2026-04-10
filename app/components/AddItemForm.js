/**
 * AddItemForm.js - form to add new items to inventory.
 * - loads vendors and programs from database for dropdowns
 * - saves new item to database on submit
 * - volunteer clicks "Add New Item" it shows a form where they can fill in.
 */
'use client'
//get database and react tools
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase' //bring database

export default function AddItemForm({ onItemAdded }) {
  
  // state variables for vendors and programs 
  const [vendors, setVendors] = useState([])
  const [programs, setPrograms] = useState([])
  
  // form that holds all the input values. 
  const [form, setForm] = useState({ 
    name: "", 
    category: "", 
    vendor_id: "", 
    weight: "", 
    units: "", 
    price_per_unit: "", 
    price_per_weight: "", 
    program_id: "", 
    low_stock_threshold: "" 
  })

  //load data from database 
  useEffect(() => {   
    const loadItems = async () => {
      const { data: vendorData } = await supabase.from('vendors').select('*')
      const { data: program } = await supabase.from('programs').select('*')
      setVendors(vendorData || [])
      setPrograms(program || [])
    }
    loadItems()
  }, []) // [] means run once on page loads

  // updates from change. 
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  //save to database when form is submitted (supabase insert)
  const handleSubmit = async (e) => {
    e.preventDefault() // stops page from reloading
    const { error } = await supabase.from('items').insert([form])
    if (error) {
      console.error('Error adding item:', error.message)
    } else {
      console.log('Item added successfully!')
      // clear the form after saving
      setForm({ 
        name: "", 
        category: "", 
        vendor_id: "", 
        weight: "", 
        units: "", 
        price_per_unit: "", 
        price_per_weight: "", 
        program_id: "", 
        low_stock_threshold: "" 
      })
      onItemAdded() // inventory page to refresh the table
    }
  }

  // what shows on screen
  return (
    <form onSubmit={handleSubmit}>
      <h2>Add New Item</h2>

      {/* text inputs - name matches supabase column */}
      <input name="name" placeholder="Item name" value={form.name} onChange={handleChange} required />
      <input name="category" placeholder="Category" value={form.category} onChange={handleChange} />
      <input name="weight" placeholder="Weight (lbs)" type="number" value={form.weight} onChange={handleChange} />
      <input name="units" placeholder="Units (count)" type="number" value={form.units} onChange={handleChange} />
      <input name="price_per_unit" placeholder="Price per unit ($)" type="number" value={form.price_per_unit} onChange={handleChange} />
      <input name="price_per_weight" placeholder="Price per weight ($)" type="number" value={form.price_per_weight} onChange={handleChange} />
      <input name="low_stock_threshold" placeholder="Low stock threshold" type="number" value={form.low_stock_threshold} onChange={handleChange} />

      {/* dropdowns - loads from database */}
      <select name="vendor_id" value={form.vendor_id} onChange={handleChange}>
        <option value="">Select Vendor</option>
        {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
      </select>

      <select name="program_id" value={form.program_id} onChange={handleChange}>
        <option value="">Select Program</option>
        {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>

      <button type="submit">Add Item</button>
    </form>
  )
}