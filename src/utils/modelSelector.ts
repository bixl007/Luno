import axios from "axios";
import { searchAndScrape } from "./search-improved";
import { scrapeUrlContent } from "./scraper";

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";
const GEMINI_API_KEY = process.env.BOT_API!;

function needsWebSearch(prompt: string): boolean {
  const lowerPrompt = prompt.toLowerCase();
  
  const currentInfoKeywords = [
    'weather', 'current', 'now', 'today', 'latest', 'recent', 'news', 
    'price', 'stock', 'rate', 'score', 'result', 'update', 'status',
    'what is happening', 'what happened', 'live', 'real-time', 'breaking',
    'current events', 'this week', 'this month', 'this year', '2024', '2025',
    'trending', 'popular now', 'recent developments', 'time', 'clock',
    'what time', 'current time'
  ];
  
  const timeSensitivePhrases = [
    'what time', 'when is', 'how much does', 'where is', 'who is currently',
    'current price of', 'latest news about', 'recent update on', 'status of',
    'current time in', 'time in', 'what is the time'
  ];
  
  const versionIndicators = [
    /\d+\.\d+/,
    /version \d+/, /v\d+/, /model \d+/,
    /(gpt|chatgpt|claude|gemini|llama)[-\s]*\d+/,
    /\b(pro|plus|premium|advanced|next|new)\b/
  ];
  
  for (const keyword of currentInfoKeywords) {
    if (lowerPrompt.includes(keyword)) {
      return true;
    }
  }
  
  for (const phrase of timeSensitivePhrases) {
    if (lowerPrompt.includes(phrase)) {
      return true;
    }
  }
  
  for (const pattern of versionIndicators) {
    if (pattern.test(lowerPrompt)) {
      return true;
    }
  }
  
  const questionWords = ['what', 'who', 'where', 'when', 'how', 'why'];
  const hasQuestionWord = questionWords.some(word => lowerPrompt.includes(word));
  
  if (hasQuestionWord) {
    const hasProperNoun = /[A-Z][a-z]+\s+[A-Z][a-z]+/.test(prompt);
    if (hasProperNoun) {
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

function needsCreatorDetails(prompt: string): boolean {
  const lowerPrompt = prompt.toLowerCase();
  
  const creatorKeywords = ['creator', 'developer', 'made', 'built', 'author', 'founder'];
  const detailKeywords = ['more', 'details', 'projects', 'github', 'resume', 'cv', 'portfolio', 'experience', 'skills', 'qualifications'];
  
  const hasCreatorKeyword = creatorKeywords.some(keyword => lowerPrompt.includes(keyword));
  const hasDetailKeyword = detailKeywords.some(keyword => lowerPrompt.includes(keyword));
  
  if (hasCreatorKeyword && hasDetailKeyword) {
    return true;
  }
  
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


export async function generateGeminiResponse(prompt: string, context?: string | null, isScrapingEnabled?: boolean) {
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
    ? `You have access to real-time web search capabilities. When the user asks questions that require current information, recent events, live data, weather, news, prices, or any information that might have changed recently, you should automatically use the special command \`[search: QUERY]\` to search the web. For example:
    - For "What is the weather in London?" → use \`[search: weather in London]\`
    - For "Latest news about Tesla" → use \`[search: latest news Tesla]\`
    - For "Current price of Bitcoin" → use \`[search: Bitcoin price today]\`
    - For "What happened in the world today?" → use \`[search: world news today]\`
    
    ${queryNeedsCurrentInfo ? 'IMPORTANT: This query appears to need current information - consider searching before responding.' : 'This query appears to be general knowledge that may not require search.'}
    
    If the user provides a specific URL, use the \`[scrape: URL]\` command instead.`
    : `You do not have access to external websites or web search capabilities. You can only answer based on your training data (which goes up to mid-2025). If the user asks for current information, real-time data, or recent events, politely explain that you cannot access current information and suggest they check reliable sources for up-to-date information.`;

  const contextPrompt = context ? `Here is the conversation history:\n${context}\n\n` : "";
  const fullPrompt = `System instructions:\n- ${personaInstruction}\n- ${introductionInstruction}\n- ${formatInstruction}\n- ${creatorInstruction}\n- ${scrapingInstruction}\n\n${contextPrompt}User prompt: ${prompt}`;

  try {
    console.log("🤖 Sending request to Gemini API");
    console.log("🔍 Web search enabled:", shouldUseWebSearch);
    
    const response = await axios.post(
      `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
      {
        contents: [
          { role: "user", parts: [{ text: fullPrompt }] }
        ],
      }
    );
    const content = response.data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    console.log("🤖 AI Response received");

    const searchMatch = content.match(/\[search:\s*([^\]]+)\s*\]/);
    if (shouldUseWebSearch && searchMatch) {
      const query = searchMatch[1];
      console.log(`🔍 Performing web search for: ${query}`);
      const searchResult = await searchAndScrape(query);
      const newPrompt = `Based on the following search results, please answer the user's original question: "${prompt}"\n\nSearch Results:\n${searchResult}\n\nPlease provide a comprehensive answer based on this information.`;
      return generateGeminiResponse(newPrompt, context, false); 
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
      return generateGeminiResponse(newPrompt, context, false); 
    }

    return content;
  } catch (error: any) {
    console.error("Gemini API error:", error?.response?.data || error.message);
    
    if (error?.response?.status === 429) {
      console.log("Rate limit exceeded. Providing fallback response.");
      return `I apologize, but I'm currently experiencing high demand and have reached my rate limits. Please try again in a few moments. 

In the meantime, here's what I can tell you based on my training data:

${prompt.toLowerCase().includes('creator') || prompt.toLowerCase().includes('developer') ? 
  `**About Luno's Creator:**
  
  Luno was created by **Bishal Baira**, a skilled web developer who specializes in building modern, responsive, and user-friendly web applications.
  
  - **Website:** https://xyrix.xyz/
  - **Philosophy:** Clean code, scalable systems, and seamless UI
  - **Focus:** Making technology work beautifully
  
  For more detailed information about Bishal's projects and experience, please visit his website or try asking again in a few minutes.` :
  'I\'m unable to process your request right now due to high demand. Please try again in a few moments, and I\'ll be happy to help you with a detailed response.'
}`;
    }
    
    if (error?.response?.status === 503 || error?.response?.status === 'UNAVAILABLE') {
      console.log("Model overloaded. Providing fallback response with retry suggestion.");
      return `I apologize, but the AI model is currently experiencing high demand and is temporarily overloaded. Please try again in a few moments.

${prompt.toLowerCase().includes('creator') || prompt.toLowerCase().includes('developer') ? 
  `**About Luno's Creator:**
  
  Luno was created by **Bishal Baira**, a skilled web developer who specializes in building modern, responsive, and user-friendly web applications.
  
  - **Website:** https://xyrix.xyz/
  - **GitHub:** https://github.com/xyrix
  - **Philosophy:** Clean code, scalable systems, and seamless UI
  - **Focus:** Making technology work beautifully
  
  For more detailed information about Bishal's projects and experience, please visit his website or try asking again in a few minutes.` :
  'The AI service is temporarily busy. Please wait a moment and try your question again.'
}

*Tip: The system should be back to normal shortly. Thank you for your patience!*`;
    }
    
    if (error?.response?.status === 400) {
      console.log("Request too large, trying with shorter prompt");
      const shorterPrompt = `${personaInstruction} ${introductionInstruction}\n\nUser: ${prompt}`;
      try {
        const response = await axios.post(
          `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
          {
            contents: [
              { role: "user", parts: [{ text: shorterPrompt }] }
            ],
          }
        );
        return response.data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      } catch (retryError) {
        console.error("Retry also failed:", retryError);
      }
    }
    
    return `I apologize, but I'm experiencing technical difficulties right now. Please try your question again in a few moments. If the issue persists, you can visit https://xyrix.xyz/ for more information about Luno's creator, Bishal Baira.`;
  }
}