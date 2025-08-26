import axios from "axios";
import { searchAndScrape } from "./search-improved";
import { scrapeUrlContent } from "./scraper";

// Use Gemini 2.0 Flash, which is free as of June 2025
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";
const GEMINI_API_KEY = process.env.BOT_API!;

// Function to detect if a query needs current/real-time information
function needsWebSearch(prompt: string): boolean {
  const lowerPrompt = prompt.toLowerCase();
  
  // Keywords that suggest current information is needed
  const currentInfoKeywords = [
    'weather', 'current', 'now', 'today', 'latest', 'recent', 'news', 
    'price', 'stock', 'rate', 'score', 'result', 'update', 'status',
    'what is happening', 'what happened', 'live', 'real-time', 'breaking',
    'current events', 'this week', 'this month', 'this year', '2024', '2025',
    'trending', 'popular now', 'recent developments', 'time', 'clock',
    'what time', 'current time'
  ];
  
  // Time-sensitive phrases
  const timeSensitivePhrases = [
    'what time', 'when is', 'how much does', 'where is', 'who is currently',
    'current price of', 'latest news about', 'recent update on', 'status of',
    'current time in', 'time in', 'what is the time'
  ];
  
  // Check for current info keywords
  for (const keyword of currentInfoKeywords) {
    if (lowerPrompt.includes(keyword)) {
      return true;
    }
  }
  
  // Check for time-sensitive phrases
  for (const phrase of timeSensitivePhrases) {
    if (lowerPrompt.includes(phrase)) {
      return true;
    }
  }
  
  // Check for questions about specific companies, people, or events
  const questionWords = ['what', 'who', 'where', 'when', 'how', 'why'];
  const hasQuestionWord = questionWords.some(word => lowerPrompt.includes(word));
  
  if (hasQuestionWord) {
    // If it's a question and mentions specific proper nouns, it might need search
    const hasProperNoun = /[A-Z][a-z]+\s+[A-Z][a-z]+/.test(prompt); // Simple proper noun detection
    if (hasProperNoun) {
      return true;
    }
  }
  
  return false;
}

export async function generateGeminiResponse(prompt: string, context?: string | null, isScrapingEnabled?: boolean) {
  // Only enable web search if explicitly enabled by user
  const shouldUseWebSearch = isScrapingEnabled === true;
  
  // System instruction to define Luno's persona
  const personaInstruction = "You are Luno, a helpful, friendly, and knowledgeable AI assistant. Answer clearly and concisely.";
  // Instruction for when to introduce as Luno
  const introductionInstruction = "If the user asks who you are or what your name is, introduce yourself as Luno.";
  // Instruction for response format
  const formatInstruction = "Always format your responses using GitHub Flavored Markdown. Ensure that headings, lists, code blocks, and other markdown elements are used appropriately to structure the information clearly.";
  
  // Dynamic instruction for web scraping and searching
  const scrapingInstruction = shouldUseWebSearch
    ? `You have access to real-time web search capabilities. When the user asks questions that require current information, recent events, live data, weather, news, prices, or any information that might have changed recently, you should automatically use the special command \`[search: QUERY]\` to search the web. For example:
    - For "What is the weather in London?" → use \`[search: weather in London]\`
    - For "Latest news about Tesla" → use \`[search: latest news Tesla]\`
    - For "Current price of Bitcoin" → use \`[search: Bitcoin price today]\`
    - For "What happened in the world today?" → use \`[search: world news today]\`
    
    If the user provides a specific URL, use the \`[scrape: URL]\` command instead.`
    : `You do not have access to external websites or web search capabilities. You can only answer based on your training data (which goes up to early 2024). If the user asks for current information, real-time data, or recent events, politely explain that you cannot access current information and suggest they check reliable sources for up-to-date information. You can still provide general knowledge and information that was available in your training data.`;

  // Combine instructions with the user prompt
  const contextPrompt = context ? `Here is the conversation history:\n${context}\n\n` : "";
  const fullPrompt = `System instructions:\n- ${personaInstruction}\n- ${introductionInstruction}\n- ${formatInstruction}\n- ${scrapingInstruction}\n\n${contextPrompt}User prompt: ${prompt}`;

  try {
    const response = await axios.post(
      `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
      {
        contents: [
          { role: "user", parts: [{ text: fullPrompt }] }
        ],
      }
    );
    const content = response.data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Check for search command
    const searchMatch = content.match(/\[search:\s*([^\]]+)\s*\]/);
    if (shouldUseWebSearch && searchMatch) {
      const query = searchMatch[1];
      console.log(`Performing web search for: ${query}`);
      const searchResult = await searchAndScrape(query);
      // Re-prompt the AI with the search result
      const newPrompt = `Based on the following search results, please answer the user's original question: "${prompt}"\n\nSearch Results:\n${searchResult}\n\nPlease provide a comprehensive answer based on this information.`;
      return generateGeminiResponse(newPrompt, context, false); // Disable further searching in the same turn
    }

    // Check for scrape command
    const scrapeMatch = content.match(/\[scrape:\s*([^\s\]]+)\s*\]/);
    if (shouldUseWebSearch && scrapeMatch) {
      let url = scrapeMatch[1];
      // Prepend https:// if no protocol is present
      if (!/^https?:\/\//i.test(url)) {
        url = `https://${url}`;
      }
      console.log(`Scraping content from: ${url}`);
      const scrapedContent = await scrapeUrlContent(url);
      // Re-prompt the AI with the scraped content
      const newPrompt = `Based on the following content from ${url}, please answer the user's original question: "${prompt}"\n\nScraped Content:\n${scrapedContent}`;
      return generateGeminiResponse(newPrompt, context, false); // Disable further scraping in the same turn
    }

    return content;
  } catch (error: any) {
    console.error("Gemini API error:", error?.response?.data || error.message);
    throw new Error("Failed to get response from Gemini API");
  }
}
