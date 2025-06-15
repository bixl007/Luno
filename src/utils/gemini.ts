import axios from "axios";

// Use Gemini 2.0 Flash, which is free as of June 2025
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";
const GEMINI_API_KEY = process.env.BOT_API!;

export async function generateGeminiResponse(prompt: string) {
  // System instruction to define Luno's persona
  const personaInstruction = "You are Luno, a helpful, friendly, and knowledgeable AI assistant. Answer clearly and concisely.";
  // Instruction for when to introduce as Luno
  const introductionInstruction = "If the user asks who you are or what your name is, introduce yourself as Luno.";
  // Instruction for response format
  const formatInstruction = "Always format your responses using GitHub Flavored Markdown. Ensure that headings, lists, code blocks, and other markdown elements are used appropriately to structure the information clearly.";

  // Combine instructions with the user prompt
  const fullPrompt = `System instructions:\n- ${personaInstruction}\n- ${introductionInstruction}\n- ${formatInstruction}\n\nUser prompt: ${prompt}`;

  try {
    const response = await axios.post(
      `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
      {
        contents: [
          { role: "user", parts: [{ text: fullPrompt }] }
        ],
      }
    );
    return response.data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  } catch (error: any) {
    console.error("Gemini API error:", error?.response?.data || error.message);
    throw new Error("Failed to get response from Gemini API");
  }
}
