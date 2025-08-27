import axios from "axios";
import { searchAndScrape } from "./search-improved";
import { scrapeUrlContent } from "./scraper";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_API_KEY = process.env.GROQ_API_KEY!;
const MODEL_NAME = "llama3-70b-8192"; 

function needsWebSearch(prompt: string): boolean {
  const lowerPrompt = prompt.toLowerCase();
  

  const currentInfoKeywords = [
    'current', 'latest', 'recent', 'now', 'today', 'this week', 'this month', 'this year',
    'new', 'updated', 'breaking', 'live', 'real-time', 'fresh', 'just released',
    'trending', 'popular now', 'happening now', 'right now'
  ];
  
  const timeSensitiveTypes = [
    'weather', 'temperature', 'forecast', 'climate',
    'price', 'cost', 'value', 'stock', 'crypto', 'exchange rate', 'currency',
    'news', 'headlines', 'update', 'announcement', 'release',
    'score', 'result', 'status', 'availability',
    'version', 'release', 'launch', 'debut'
  ];
  
  const versionIndicators = [
    /\d+\.\d+/,
    /version \d+/, /v\d+/, /model \d+/,
    /(gpt|chatgpt|claude|gemini|llama)[-\s]*\d+/,
    /\b(pro|plus|premium|advanced|next|new)\b/
  ];
  
  const recentYears = ['2024', '2025'];
  
  for (const keyword of currentInfoKeywords) {
    if (lowerPrompt.includes(keyword)) {
      return true;
    }
  }
  
  for (const type of timeSensitiveTypes) {
    if (lowerPrompt.includes(type)) {
      return true;
    }
  }
  
  for (const pattern of versionIndicators) {
    if (pattern.test(lowerPrompt)) {
      return true;
    }
  }
  
  for (const year of recentYears) {
    if (lowerPrompt.includes(year)) {
      return true;
    }
  }
  
  const questionPatterns = [
    /what.*(is|are).*(new|latest|current)/,
    /when.*(will|did).*(release|launch|come out)/,
    /how much.*(cost|price)/,
    /where.*(can i|to).*(buy|get|find)/,
    /who.*(won|is leading|currently)/
  ];
  
  for (const pattern of questionPatterns) {
    if (pattern.test(lowerPrompt)) {
      return true;
    }
  }
  
  return false;
}

// Function to detect if query is asking for detailed creator information
function needsCreatorDetails(prompt: string): boolean {
  const lowerPrompt = prompt.toLowerCase();
  
  const creatorKeywords = ['creator', 'developer', 'made', 'built', 'author', 'founder'];
  const detailKeywords = ['more', 'details', 'projects', 'github', 'resume', 'cv', 'portfolio', 'experience', 'skills', 'qualifications'];
  
  const hasCreatorKeyword = creatorKeywords.some(keyword => lowerPrompt.includes(keyword));
  const hasDetailKeyword = detailKeywords.some(keyword => lowerPrompt.includes(keyword));
  
  // If asking about creator AND wants more details
  if (hasCreatorKeyword && hasDetailKeyword) {
    return true;
  }
  
  // Direct requests for specific creator info
  const directPatterns = [
    /github.*bishal/,
    /bishal.*github/,
    /resume.*creator/,
    /creator.*resume/,
    /portfolio.*developer/,
    /developer.*portfolio/
  ];
  
  for (const pattern of directPatterns) {
    if (pattern.test(lowerPrompt)) {
      return true;
    }
  }
  
  return false;
}

export async function generateGroqResponse(prompt: string, context?: string | null, isScrapingEnabled?: boolean) {
  const shouldUseWebSearch = isScrapingEnabled === true;
  
  const queryNeedsCurrentInfo = needsWebSearch(prompt);
  const queryNeedsCreatorDetails = needsCreatorDetails(prompt);
  
  const personaInstruction = "You are a helpful, friendly, and knowledgeable AI assistant named Luno. Answer clearly and concisely without introducing yourself unless specifically asked.";
  const introductionInstruction = "Only introduce yourself as Luno if the user specifically asks who you are, what your name is, or asks for an introduction. Do not introduce yourself in regular conversations.";
  const formatInstruction = "Always format your responses using GitHub Flavored Markdown. Ensure that headings, lists, code blocks, and other markdown elements are used appropriately to structure the information clearly.";
  
  const creatorInstruction = `When asked about your creator, developer, or who made you, respond with information about Bishal Baira:

**Creator Information:**
- **Name:** Bishal Baira
- **Website:** https://xyrix.xyz/
- **Specialization:** Bishal specializes in building modern web applications, responsive web applications, and user-friendly web applications
- **Philosophy:** Centered around clean code, scalable systems, and seamless UI, emphasizing the importance of making technology work beautifully
- **Collaboration:** Supports client collaboration and fosters open communication
- **Additional Resources:** You can check out Bishal's coding activity and projects on his website

**For More Detailed Information:**
${queryNeedsCreatorDetails ? 'IMPORTANT: This query is asking for detailed creator information - use the scraping commands below.' : ''}
If the user asks for more details, recent projects, GitHub activity, or wants to see his resume/portfolio, automatically use these commands:
- For GitHub projects and activity: [scrape: https://github.com/bixl007]
- For detailed resume/CV information: [scrape: https://res.cloudinary.com/dqlku2tfk/image/upload/v1755164745/Bishal_Baira_EResume_cfitho.pdf]

Use these scraping commands when users specifically ask for:
- "More information about the creator"
- "Recent projects by Bishal"
- "GitHub activity" or "GitHub projects"
- "Resume" or "CV" or "qualifications"
- "Portfolio" or "work experience"
- "Skills" or "technical expertise"

Respond warmly and provide comprehensive information when users ask about your creator or developer.`;
  
  const scrapingInstruction = shouldUseWebSearch
   ? `You have access to real-time web search capabilities and should use them intelligently. 

SEARCH WHEN NEEDED: Analyze the user's query to determine if it requires current, real-time, or recent information. Use [search: query] for:
- Current events, news, or recent developments
- Real-time data (weather, prices, rates, etc.)
- Recent releases, updates, or versions
- Information that changes frequently
- Anything that might have occurred after your training data

FORMAT: [search: your search query here]

${queryNeedsCurrentInfo ? 'IMPORTANT: This query appears to need current information - consider searching before responding.' : 'This query appears to be general knowledge that may not require search.'}

For specific URLs, use [scrape: URL] instead.`
    : `You do not have access to external websites or web search capabilities. You can only answer based on your training data (which goes up to early 2024). If the user asks for current information, real-time data, or recent events, politely explain that you cannot access current information and suggest they check reliable sources for up-to-date information.`;

  const contextPrompt = context? `Here is the conversation history:\n${context}\n\n` : "";
  const fullPrompt = `System instructions:\n- ${personaInstruction}\n- ${introductionInstruction}\n- ${formatInstruction}\n- ${creatorInstruction}\n- ${scrapingInstruction}\n\n${contextPrompt}User prompt: ${prompt}`;

  try {
    const response = await axios.post(
      GROQ_API_URL,
      {
        model: MODEL_NAME,
        messages: [
          {
            role: "user",
            content: fullPrompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 4096,
      },
      {
        headers: {
          "Authorization": `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );
    const content = response.data.choices?.[0]?.message?.content || "";

    console.log("🤖 AI Response:", content);
    console.log("🔍 Web search enabled:", shouldUseWebSearch);

    const searchMatch = content.match(/\[search:\s*([^\]]+)\s*\]/);
    if (shouldUseWebSearch && searchMatch) {
      const query = searchMatch[1];
      console.log(`🔍 Performing web search for: ${query}`);
      const searchResult = await searchAndScrape(query);
      const newPrompt = `Based on the following search results, please answer the user's original question: "${prompt}"\n\nSearch Results:\n${searchResult}\n\nPlease provide a comprehensive answer based on this information.`;
      return generateGroqResponse(newPrompt, context, false);
    } else if (shouldUseWebSearch) {
      console.log("⚠️ Web search was enabled but AI didn't use search command");
    }

    const scrapeMatch = content.match(/\[scrape:\s*([^\s\]]+)\s*\]/);
    if (shouldUseWebSearch && scrapeMatch) {
      let url = scrapeMatch[1];
      if (!/^https?:\/\//i.test(url)) {
        url = `https://${url}`;
      }
      console.log(`Scraping content from: ${url}`);
      const scrapedContent = await scrapeUrlContent(url);
      const newPrompt = `Based on the following content from ${url}, please answer the user's original question: "${prompt}"\n\nScraped Content:\n${scrapedContent}`;
      return generateGroqResponse(newPrompt, context, false);
    }

    return content;
  } catch (error: any) {
    console.error("Groq API error:", error?.response?.data || error.message);
    throw new Error("Failed to get response from Groq API");
  }
}