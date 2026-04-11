import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function POST(request) {
  try {
    const { history, message } = await request.json();

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const chat = model.startChat({ history: history || [] });
    const result = await chat.sendMessage(message);
    const text = result.response.text();

    return Response.json({ text });
  } catch (err) {
    console.error("Gemini error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}