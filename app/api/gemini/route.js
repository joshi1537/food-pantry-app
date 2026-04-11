import { GoogleGenerativeAI } from "@google/generative-ai";
import { supabase } from "../../lib/supabase";

const apiKey = process.env.GEMINI_API_KEY;

function formatPantryAnswer(message, items) {
  const lower = message.toLowerCase();

  if (!items || items.length === 0) {
    return "I couldn’t find any matching inventory items.";
  }

  const totalUnits = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
  const names = items.map((item) => item.name).join(", ");

  if (lower.includes("how much") || lower.includes("how many")) {
    return `I found ${totalUnits} total units for: ${names}.`;
  }

  if (lower.includes("low stock")) {
    const lowStockItems = items.filter(
      (item) => item.quantity <= (item.low_stock_threshold ?? 5)
    );

    if (lowStockItems.length === 0) {
      return "None of the matching items are currently low stock.";
    }

    return `Low stock items: ${lowStockItems
      .map((item) => `${item.name} (${item.quantity})`)
      .join(", ")}.`;
  }

  return items
    .map((item) => {
      const program = item.programs?.name ? ` in ${item.programs.name}` : "";
      return `${item.name}: ${item.quantity || 0} units${program}`;
    })
    .join(". ");
}

async function tryInventoryAnswer(message) {
  const lower = message.toLowerCase().trim();

  const lowStockQuestion =
    lower.includes("low stock") ||
    lower.includes("running low") ||
    lower.includes("need restock");

  if (lowStockQuestion) {
    const { data, error } = await supabase
      .from("items")
      .select("*, programs(name)")
      .lte("quantity", 5)
      .order("quantity", { ascending: true })
      .limit(10);

    if (error) throw error;

    if (!data || data.length === 0) {
      return "There are currently no low-stock items.";
    }

    return `Current low-stock items: ${data
      .map((item) => `${item.name} (${item.quantity})`)
      .join(", ")}.`;
  }

  const words = lower
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .filter(
      (word) =>
        ![
          "how",
          "much",
          "many",
          "do",
          "we",
          "have",
          "what",
          "is",
          "the",
          "a",
          "an",
          "in",
          "on",
          "for",
          "of",
          "to",
          "show",
          "me",
          "items",
          "item",
          "stock",
          "quantity",
        ].includes(word)
    );

  if (words.length === 0) {
    return null;
  }

  let query = supabase.from("items").select("*, programs(name)").limit(10);

  for (const word of words) {
    query = query.ilike("name", `%${word}%`);
  }

  const { data, error } = await query;

  if (error) throw error;

  if (!data || data.length === 0) {
    return null;
  }

  return formatPantryAnswer(message, data);
}

export async function POST(request) {
  try {
    const { history, message } = await request.json();

    if (!message || !message.trim()) {
      return Response.json({ error: "Message is required." }, { status: 400 });
    }

    try {
      const inventoryReply = await tryInventoryAnswer(message);
      if (inventoryReply) {
        return Response.json({ text: inventoryReply });
      }
    } catch (dbErr) {
      console.error("Inventory lookup error:", dbErr);
    }

    if (!apiKey) {
      return Response.json(
        {
          text: "The pantry assistant is unavailable right now because the Gemini API key is missing.",
        },
        { status: 200 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const chat = model.startChat({
      history: Array.isArray(history) ? history : [],
    });

    const result = await chat.sendMessage(message);
    const text = result.response.text();

    return Response.json({ text });
  } catch (err) {
    console.error("Gemini error:", err);

    const errorMessage = err?.message || "";

    if (
      errorMessage.includes("429") ||
      errorMessage.toLowerCase().includes("quota") ||
      errorMessage.toLowerCase().includes("rate limit")
    ) {
      return Response.json({
        text: "I’m temporarily unavailable because the AI usage limit was reached. Please try again in a little bit.",
      });
    }

    return Response.json({
      text: "Something went wrong, so I couldn’t answer right now. Please try again.",
    });
  }
}