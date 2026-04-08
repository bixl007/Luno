import axios from "axios";

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const GEMINI_API_KEY = process.env.BOT_API!;

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


export async function generateGeminiResponse(prompt: string, context?: string | null) {
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
${queryNeedsCreatorDetails ? 'IMPORTANT: This query is asking for detailed creator information - provide a comprehensive answer using known information.' : ''}
When users specifically ask for the following, provide as much detail as possible from your known information:
- "More information about the creator"
- "Recent projects by Bishal"
- "GitHub activity" or "GitHub projects"
- "Resume" or "CV" or "qualifications"
- "Portfolio" or "work experience"
- "Skills" or "technical expertise"

Respond warmly and provide comprehensive information when users ask about your creator or developer.`;

  const capabilityInstruction = "You do not have access to external websites or real-time web search. You can only answer based on your training data (which goes up to mid-2025). If the user asks for current information, real-time data, or recent events, politely explain that you cannot access current information and suggest they check reliable sources for up-to-date information.";

  const contextPrompt = context ? `Here is the conversation history:\n${context}\n\n` : "";
  const fullPrompt = `System instructions:\n- ${personaInstruction}\n- ${introductionInstruction}\n- ${formatInstruction}\n- ${creatorInstruction}\n- ${capabilityInstruction}\n\n${contextPrompt}User prompt: ${prompt}`;

  try {
    console.log("🤖 Sending request to Gemini API");
    
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