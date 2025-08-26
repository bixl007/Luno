import google from 'google-it';
import { scrapeUrlContent } from './scraper';

interface SearchResult {
  title: string;
  link: string;
  snippet?: string;
}

async function duckDuckGoSearch(query: string): Promise<SearchResult[]> {
  try {
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    const html = await response.text();
    
    const results: SearchResult[] = [];
    const linkRegex = /<a rel="nofollow" href="([^"]+)"[^>]*>([^<]+)<\/a>/g;
    let match;
    let count = 0;
    
    while ((match = linkRegex.exec(html)) !== null && count < 3) {
      const url = match[1];
      const title = match[2];
      
      if (url.startsWith('http') && !url.includes('duckduckgo.com')) {
        results.push({
          title: title.replace(/<[^>]*>/g, ''), 
          link: url,
          snippet: ''
        });
        count++;
      }
    }
    
    return results;
  } catch (error) {
    console.error('DuckDuckGo search error:', error);
    return [];
  }
}

async function bingSearch(query: string): Promise<SearchResult[]> {
  try {
    const searchUrl = `https://www.bing.com/search?q=${encodeURIComponent(query)}`;
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Cache-Control': 'no-cache'
      }
    });
    const html = await response.text();
    
    const results: SearchResult[] = [];
    
    const linkRegex1 = /<h2><a href="([^"]+)"[^>]*>([^<]+)<\/a><\/h2>/g;
    const linkRegex2 = /<a href="([^"]+)"[^>]*><h2[^>]*>([^<]+)<\/h2><\/a>/g;
    
    const patterns = [linkRegex1, linkRegex2];
    
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(html)) !== null && results.length < 3) {
        const url = match[1];
        const title = match[2];
        
        if (url.startsWith('http') && !url.includes('bing.com') && !url.includes('microsoft.com')) {
          results.push({
            title: title.replace(/<[^>]*>/g, ''), 
            link: url,
            snippet: ''
          });
        }
      }
      
      if (results.length > 0) break; 
    }
    
    return results;
  } catch (error) {
    console.error('Bing search error:', error);
    return [];
  }
}

async function searchForCurrentInfo(query: string): Promise<SearchResult[]> {
  const lowerQuery = query.toLowerCase();
  
  if (lowerQuery.includes('weather')) {
    const location = query.replace(/weather|in|for|of/gi, '').trim();
    return [
      {
        title: `Weather for ${location}`,
        link: `https://wttr.in/${encodeURIComponent(location)}?format=j1`,
        snippet: 'Weather information'
      }
    ];
  }
  
  if (lowerQuery.includes('news') || lowerQuery.includes('latest')) {
    return [];
  }
  
  return [];
}

async function searxSearch(query: string): Promise<SearchResult[]> {
  try {
    const searxUrl = `https://searx.be/search?q=${encodeURIComponent(query)}&format=json&categories=general`;
    
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Search timeout')), 8000)
    );
    
    const fetchPromise = fetch(searxUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json'
      }
    });
    
    const response = await Promise.race([fetchPromise, timeoutPromise]) as Response;
    
    if (!response.ok) {
      throw new Error(`SearX request failed: ${response.status}`);
    }
    
    const data = await response.json();
    const results: SearchResult[] = [];
    
    if (data.results && Array.isArray(data.results)) {
      for (const result of data.results.slice(0, 3)) {
        if (result.url && result.title) {
          results.push({
            title: result.title,
            link: result.url,
            snippet: result.content || ''
          });
        }
      }
    }
    
    return results;
  } catch (error) {
    console.error('SearX search error:', error);
    return [];
  }
}

export async function searchAndScrape(query: string): Promise<string> {
  console.log(`🔍 Starting search for: "${query}"`);
  
  try {
    let results: SearchResult[] = [];
    
    const currentInfoResults = await searchForCurrentInfo(query);
    if (currentInfoResults.length > 0) {
      console.log(`📊 Using specialized handler for query type`);
      results = currentInfoResults;
    }
    
    if (results.length === 0) {
      try {
        console.log(`🌐 Attempting Google search...`);
        const googleResults = await google({ query, 'no-display': true });
        if (googleResults && googleResults.length > 0) {
          console.log(`✅ Google search found ${googleResults.length} results`);
          results = googleResults.slice(0, 3).map((result: any) => ({
            title: result.title || '',
            link: result.link || '',
            snippet: result.snippet || ''
          }));
        } else {
          console.log(`⚠️ Google search returned no results`);
        }
      } catch (googleError) {
        console.log('❌ Google search failed:', googleError);
        console.log('🔄 Trying fallback methods...');
      }
    }
    
    if (results.length === 0) {
      console.log(`🔍 Attempting SearX search...`);
      results = await searxSearch(query);
      if (results.length > 0) {
        console.log(`✅ SearX found ${results.length} results`);
      } else {
        console.log(`⚠️ SearX search returned no results`);
      }
    }
    
    if (results.length === 0) {
      console.log(`🦆 Attempting DuckDuckGo search...`);
      results = await duckDuckGoSearch(query);
      if (results.length > 0) {
        console.log(`✅ DuckDuckGo found ${results.length} results`);
      } else {
        console.log(`⚠️ DuckDuckGo search returned no results`);
      }
    }
    
    if (results.length === 0) {
      console.log(`🔍 Attempting Bing search...`);
      results = await bingSearch(query);
      if (results.length > 0) {
        console.log(`✅ Bing found ${results.length} results`);
      } else {
        console.log(`⚠️ Bing search returned no results`);
      }
    }
    
    if (results.length > 0 && results[0].link) {
      const topResultUrl = results[0].link;
      console.log(`📄 Scraping content from: ${topResultUrl}`);
      
      if (topResultUrl.includes('wttr.in')) {
        try {
          const response = await fetch(topResultUrl);
          const weatherData = await response.json();
          
          if (weatherData.current_condition && weatherData.current_condition[0]) {
            const current = weatherData.current_condition[0];
            const location = weatherData.nearest_area?.[0] || { areaName: [{ value: 'Unknown' }], country: [{ value: 'Unknown' }] };
            
            console.log(`🌤️ Weather data retrieved successfully`);
            return `Current weather in ${location.areaName[0].value}, ${location.country[0].value}:
Temperature: ${current.temp_C}°C (${current.temp_F}°F)
Condition: ${current.weatherDesc[0].value}
Humidity: ${current.humidity}%
Wind: ${current.windspeedKmph} km/h
Feels like: ${current.FeelsLikeC}°C (${current.FeelsLikeF}°F)`;
          }
        } catch (weatherError) {
          console.error('❌ Weather API error:', weatherError);
        }
      }
      
      const content = await scrapeUrlContent(topResultUrl);
      if (content && content.length > 50 && !content.includes('Failed to scrape')) {
        console.log(`✅ Successfully scraped ${content.length} characters`);
        return `Based on the content from ${topResultUrl}, here is the information found:\n\n${content}`;
      } else {
        console.log(`⚠️ Scraping failed or returned insufficient content`);
      }
    }
    
    console.log(`🔄 All methods failed, trying simple search approach...`);
    const fallbackResult = await simpleFallbackSearch(query);
    if (fallbackResult) {
      return fallbackResult;
    }
    
    console.log(`❌ All search methods failed for query: "${query}"`);
    return `I couldn't find any relevant information for "${query}". This might be due to:
    
• Search rate limits or connectivity issues
• The query might be too specific or unusual
• Temporary issues with search providers

**Suggestions:**
- Try rephrasing your question
- Be more specific about what you're looking for
- Check your internet connection
- Try asking about a more general topic first

I'm working with my training data which goes up to early 2024, so I might still be able to help with general information about your topic.`;
    
  } catch (error) {
    console.error('❌ Critical error during search:', error);
    return `I encountered a technical error while searching for "${query}". Please try again in a moment, or rephrase your question. I can still answer questions based on my training data.`;
  }
}

async function simpleFallbackSearch(query: string): Promise<string | null> {
  try {
    const lowerQuery = query.toLowerCase();
    if (lowerQuery.includes('chatgpt') || lowerQuery.includes('gpt') || lowerQuery.includes('openai')) {
      return `I don't have access to real-time information about ChatGPT updates or new versions. For the most current information about ChatGPT, including any announcements about new versions like ChatGPT 5.0, I recommend:

**Official Sources:**
- OpenAI's official website (openai.com)
- OpenAI's blog and announcements
- OpenAI's social media accounts

**What I know from my training data:**
- ChatGPT has gone through several iterations (GPT-3.5, GPT-4, etc.)
- OpenAI typically announces major updates through their official channels
- New model releases usually include improved capabilities and performance

The search functionality appears to be experiencing issues right now, but you can check these official sources for the latest information.`;
    }
    
    return null;
  } catch (error) {
    console.error('Fallback search error:', error);
    return null;
  }
}
