'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', text: "Hey! I'm the VT Food Pantry assistant,  Ask me anything about the pantry or inventory!" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchInventoryContext = async () => {
    const [{ data: items }, { data: vendors }, { data: programs }] = await Promise.all([
      supabase.from('items').select('name, quantity, category, low_stock_threshold, price_per_unit, price_per_weight, weight').order('name'),
      supabase.from('vendors').select('name, contact'),
      supabase.from('programs').select('name'),
    ]);

    const lowStock = (items || []).filter(i => i.quantity <= (i.low_stock_threshold ?? 5));

    return `
You are a helpful assistant for the VT Food Pantry inventory system. Here is the current live data:

PROGRAMS: ${(programs || []).map(p => p.name).join(', ')}

VENDORS: ${(vendors || []).map(v => `${v.name}${v.contact ? ` (${v.contact})` : ''}`).join(', ')}

INVENTORY (${(items || []).length} items):
${(items || []).map(i => `- ${i.name}: ${i.quantity} units, category: ${i.category || 'uncategorized'}`).join('\n')}

LOW STOCK ITEMS (quantity at or below threshold):
${lowStock.length === 0 ? 'None' : lowStock.map(i => `- ${i.name}: only ${i.quantity} left`).join('\n')}

You can answer questions about:
- Current inventory levels and low stock
- Vendors and programs
- How to use the app (adding items, transfers, checkpoints, year rollover, export CSV)
- Food storage tips and categorization advice
Keep answers concise and friendly. You are embedded in the VT Food Pantry app used by volunteers.
    `.trim();
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    try {
      const context = await fetchInventoryContext();
      const history = messages.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.text }]
      }));

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.NEXT_PUBLIC_GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: context }] },
            contents: [
              ...history,
              { role: 'user', parts: [{ text: userMsg }] }
            ],
          }),
        }
      );

      const data = await response.json();
      const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I couldn't get a response. Try again!";
      setMessages(prev => [...prev, { role: 'assistant', text: reply }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', text: "Something went wrong. Please try again!" }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Floating button */}
      <button className="chat-fab" onClick={() => setOpen(o => !o)} title="Ask the pantry assistant">
        {open ? '✕' : ''}
      </button>

      {/* Chat window */}
      {open && (
        <div className="chat-window">
          <div className="chat-header">
            <span> Pantry Assistant</span>
            <button className="chat-close" onClick={() => setOpen(false)}>✕</button>
          </div>

          <div className="chat-messages">
            {messages.map((m, i) => (
              <div key={i} className={`bubble ${m.role}`}>
                {m.text}
              </div>
            ))}
            {loading && (
              <div className="bubble assistant typing">
                <span /><span /><span />
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="chat-input-row">
            <input
              placeholder="Ask anything…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              disabled={loading}
            />
            <button onClick={sendMessage} disabled={loading || !input.trim()}>
              ➤
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        .chat-fab {
          position: fixed;
          bottom: 24px;
          right: 24px;
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: #861f41;
          color: #fff;
          font-size: 1.5rem;
          border: none;
          cursor: pointer;
          box-shadow: 0 4px 20px rgba(0,0,0,0.2);
          z-index: 200;
          transition: transform 0.15s, background 0.15s;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .chat-fab:hover { background: #6e1835; transform: scale(1.08); }

        .chat-window {
          position: fixed;
          bottom: 90px;
          right: 24px;
          width: 340px;
          max-height: 480px;
          background: #fff;
          border-radius: 16px;
          box-shadow: 0 8px 40px rgba(0,0,0,0.18);
          z-index: 200;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          font-family: "DM Sans", sans-serif;
        }

        .chat-header {
          background: #861f41;
          color: #fff;
          padding: 14px 16px;
          font-weight: 700;
          font-size: 0.95rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .chat-close {
          background: none;
          border: none;
          color: #fff;
          cursor: pointer;
          font-size: 1rem;
          padding: 2px 6px;
          border-radius: 4px;
        }
        .chat-close:hover { background: rgba(255,255,255,0.15); }

        .chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: 14px 12px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .bubble {
          padding: 9px 13px;
          border-radius: 12px;
          font-size: 0.875rem;
          line-height: 1.5;
          max-width: 85%;
          white-space: pre-wrap;
        }
        .bubble.user {
          background: #861f41;
          color: #fff;
          align-self: flex-end;
          border-bottom-right-radius: 4px;
        }
        .bubble.assistant {
          background: #f3f4f6;
          color: #1f2937;
          align-self: flex-start;
          border-bottom-left-radius: 4px;
        }

        .bubble.typing {
          display: flex;
          gap: 4px;
          align-items: center;
          padding: 12px 16px;
        }
        .bubble.typing span {
          width: 7px;
          height: 7px;
          background: #9ca3af;
          border-radius: 50%;
          animation: bounce 1s infinite;
        }
        .bubble.typing span:nth-child(2) { animation-delay: 0.15s; }
        .bubble.typing span:nth-child(3) { animation-delay: 0.3s; }
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-6px); }
        }

        .chat-input-row {
          display: flex;
          gap: 8px;
          padding: 10px 12px;
          border-top: 1px solid #e5e7eb;
        }
        .chat-input-row input {
          flex: 1;
          padding: 8px 12px;
          border: 1.5px solid #d1d5db;
          border-radius: 8px;
          font-size: 0.875rem;
          font-family: inherit;
          outline: none;
        }
        .chat-input-row input:focus { border-color: #861f41; }
        .chat-input-row button {
          padding: 8px 12px;
          background: #861f41;
          color: #fff;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 1rem;
          transition: background 0.15s;
        }
        .chat-input-row button:hover:not(:disabled) { background: #6e1835; }
        .chat-input-row button:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>
    </>
  );
}