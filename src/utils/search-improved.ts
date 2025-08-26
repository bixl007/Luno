import { scrapeUrlContent } from './scraper';

interface SearchResult {
  title: string;
  link: string;
  snippet?: string;
}

export async function searchAndScrape(query: string): Promise<string> {
  console.log(`🔍 Starting improved search for: "${query}"`);
  
  try {
    let results: SearchResult[] = [];
    
    if (query.toLowerCase().includes('weather')) {
      const location = query.replace(/weather|in|for|of|current|today/gi, '').trim();
      console.log(`🌤️ Weather query detected for location: ${location}`);
      
      try {
        const weatherUrl = `https://wttr.in/${encodeURIComponent(location)}?format=j1`;
        const response = await fetch(weatherUrl);
        const weatherData = await response.json();
        
        if (weatherData.current_condition && weatherData.current_condition[0]) {
          const current = weatherData.current_condition[0];
          const locationInfo = weatherData.nearest_area?.[0] || { 
            areaName: [{ value: location }], 
            country: [{ value: 'Unknown' }] 
          };
          
          return `🌤️ **Current weather in ${locationInfo.areaName[0].value}, ${locationInfo.country[0].value}:**

**Temperature:** ${current.temp_C}°C (${current.temp_F}°F)
**Condition:** ${current.weatherDesc[0].value}
**Humidity:** ${current.humidity}%
**Wind:** ${current.windspeedKmph} km/h
**Feels like:** ${current.FeelsLikeC}°C (${current.FeelsLikeF}°F)

*Data provided by wttr.in*`;
        }
      } catch (weatherError) {
        console.error('Weather API error:', weatherError);
      }
    }
    
    if (query.toLowerCase().includes('time') || query.toLowerCase().includes('clock')) {
      const location = query.replace(/time|current|what|is|the|in|clock|now/gi, '').trim();
      console.log(`🕐 Time query detected for location: ${location}`);
      
      try {
        const timeUrl = `https://worldtimeapi.org/api/timezone/Asia/Kolkata`; 
        let finalUrl = timeUrl;
        
        const locationMap: { [key: string]: string } = {
          'delhi': 'Asia/Kolkata',
          'mumbai': 'Asia/Kolkata',
          'bangalore': 'Asia/Kolkata',
          'chennai': 'Asia/Kolkata',
          'kolkata': 'Asia/Kolkata',
          'india': 'Asia/Kolkata',
          'london': 'Europe/London',
          'new york': 'America/New_York',
          'tokyo': 'Asia/Tokyo',
          'paris': 'Europe/Paris',
          'sydney': 'Australia/Sydney',
          'los angeles': 'America/Los_Angeles',
          'chicago': 'America/Chicago',
          'dubai': 'Asia/Dubai',
          'singapore': 'Asia/Singapore',
          'hong kong': 'Asia/Hong_Kong',
          'beijing': 'Asia/Shanghai',
          'moscow': 'Europe/Moscow',
          'berlin': 'Europe/Berlin',
          'toronto': 'America/Toronto'
        };
        
        const lowerLocation = location.toLowerCase();
        for (const [key, timezone] of Object.entries(locationMap)) {
          if (lowerLocation.includes(key)) {
            finalUrl = `https://worldtimeapi.org/api/timezone/${timezone}`;
            break;
          }
        }
        
        console.log(`⏰ Fetching time from: ${finalUrl}`);
        const response = await fetch(finalUrl);
        
        if (!response.ok) {
          throw new Error(`Time API failed: ${response.status}`);
        }
        
        const timeData = await response.json();
        
        if (timeData.datetime) {
          const dateTime = new Date(timeData.datetime);
          const timeString = dateTime.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            second: '2-digit',
            hour12: true 
          });
          const dateString = dateTime.toLocaleDateString('en-US', { 
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });
          
          const locationName = location || 'Delhi, India';
          
          console.log(`✅ Time API successful for ${locationName}`);
          return `🕐 **Current time in ${locationName}:**

**Time:** ${timeString}
**Date:** ${dateString}
**Timezone:** ${timeData.timezone || 'Asia/Kolkata'}
**UTC Offset:** ${timeData.utc_offset || '+05:30'}

*Data provided by WorldTimeAPI*`;
        }
      } catch (timeError) {
        console.error('Time API error:', timeError);
        
        const now = new Date();
        const locationName = location || 'Delhi, India';
        let timeZoneOffset = 5.5; 
        let timeZoneName = 'IST';
        
        const timezoneOffsets: { [key: string]: { offset: number, name: string } } = {
          'delhi': { offset: 5.5, name: 'IST' },
          'mumbai': { offset: 5.5, name: 'IST' },
          'bangalore': { offset: 5.5, name: 'IST' },
          'chennai': { offset: 5.5, name: 'IST' },
          'kolkata': { offset: 5.5, name: 'IST' },
          'india': { offset: 5.5, name: 'IST' },
          'london': { offset: 0, name: 'GMT' },
          'new york': { offset: -5, name: 'EST' },
          'tokyo': { offset: 9, name: 'JST' },
          'paris': { offset: 1, name: 'CET' },
          'sydney': { offset: 10, name: 'AEST' },
          'los angeles': { offset: -8, name: 'PST' },
          'chicago': { offset: -6, name: 'CST' },
          'dubai': { offset: 4, name: 'GST' },
          'singapore': { offset: 8, name: 'SGT' },
          'hong kong': { offset: 8, name: 'HKT' },
          'beijing': { offset: 8, name: 'CST' },
          'moscow': { offset: 3, name: 'MSK' },
          'berlin': { offset: 1, name: 'CET' }
        };
        
        const lowerLocation = location.toLowerCase();
        for (const [key, tz] of Object.entries(timezoneOffsets)) {
          if (lowerLocation.includes(key)) {
            timeZoneOffset = tz.offset;
            timeZoneName = tz.name;
            break;
          }
        }
        
        const utcTime = new Date();
        const localTime = new Date(utcTime.getTime() + (timeZoneOffset * 60 * 60 * 1000));
        const timeString = localTime.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: true,
          timeZone: 'UTC'
        });
        const dateString = localTime.toLocaleDateString('en-US', { 
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          timeZone: 'UTC'
        });
        
        console.log(`⏰ Using fallback time calculation for ${locationName}`);
        return `🕐 **Current time in ${locationName}:**

**Time:** ${timeString} ${timeZoneName}
**Date:** ${dateString}
**Timezone:** ${timeZoneName} (UTC${timeZoneOffset >= 0 ? '+' : ''}${timeZoneOffset})

*Note: This is an approximate time calculation. For precise time, please check an official time source.*`;
      }
    }
    
    console.log(`📚 Trying Wikipedia search...`);
    const wikiResults = await searchWikipedia(query);
    if (wikiResults.length > 0) {
      results = wikiResults;
      console.log(`✅ Wikipedia found results`);
    }
    
    if (results.length === 0) {
      console.log(`🦆 Trying DuckDuckGo instant answers...`);
      const ddgResults = await duckDuckGoInstant(query);
      if (ddgResults.length > 0) {
        results = ddgResults;
        console.log(`✅ DuckDuckGo found results`);
      }
    }
    
    if (results.length > 0 && results[0].link) {
      const topResult = results[0];
      console.log(`📄 Processing result: ${topResult.link}`);
      
      if (topResult.link.includes('wikipedia.org') && topResult.snippet && topResult.snippet.length > 100) {
        return `📖 **${topResult.title}**\n\n${topResult.snippet}\n\n*Source: [Wikipedia](${topResult.link})*`;
      }
      
      const scrapedContent = await scrapeUrlContent(topResult.link);
      if (scrapedContent && scrapedContent.length > 100 && !scrapedContent.includes('Failed to')) {
        return `🔍 **Information found:**\n\n${scrapedContent}\n\n*Source: ${topResult.link}*`;
      }
      
      if (topResult.snippet && topResult.snippet.length > 20) {
        return `📝 **${topResult.title}**\n\n${topResult.snippet}\n\n*Source: ${topResult.link}*`;
      }
    }
    
    const fallbackResponse = getSpecializedResponse(query);
    if (fallbackResponse) {
      return fallbackResponse;
    }
    
    return `🔍 I couldn't find current information for "${query}" at the moment. This might be due to:

• **Search limitations:** Some information requires real-time access
• **Query specificity:** The search might be too specific or niche
• **Temporary issues:** Search services might be temporarily unavailable

**I can still help you with:**
- General information based on my training data (up to early 2024)
- Explanations of concepts and topics
- Analysis and discussion of the subject

**For current information, try:**
- Being more specific about what aspect you're interested in
- Asking about the general topic first
- Checking official sources directly

Would you like me to provide general information about this topic instead?`;
    
  } catch (error) {
    console.error('❌ Search error:', error);
    return `I encountered an issue while searching for "${query}". Please try rephrasing your question or ask me about the topic in general terms. I'm here to help with information from my training data!`;
  }
}

async function searchWikipedia(query: string): Promise<SearchResult[]> {
  try {
    const pageUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`;
    const pageResponse = await fetch(pageUrl);
    
    if (pageResponse.ok) {
      const pageData = await pageResponse.json();
      if (pageData.extract && pageData.content_urls?.desktop?.page) {
        return [{
          title: pageData.title,
          link: pageData.content_urls.desktop.page,
          snippet: pageData.extract
        }];
      }
    }
    
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*&srlimit=3`;
    const searchResponse = await fetch(searchUrl);
    
    if (searchResponse.ok) {
      const searchData = await searchResponse.json();
      const results: SearchResult[] = [];
      
      for (const page of searchData.query?.search || []) {
        if (page.title) {
          results.push({
            title: page.title,
            link: `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, '_'))}`,
            snippet: page.snippet ? page.snippet.replace(/<[^>]*>/g, '') : ''
          });
        }
      }
      
      return results;
    }
  } catch (error) {
    console.error('Wikipedia search error:', error);
  }
  
  return [];
}

async function duckDuckGoInstant(query: string): Promise<SearchResult[]> {
  try {
    const apiUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
    const response = await fetch(apiUrl);
    
    if (response.ok) {
      const data = await response.json();
      const results: SearchResult[] = [];
      
      if (data.AbstractURL && data.AbstractURL !== '') {
        results.push({
          title: data.Heading || query,
          link: data.AbstractURL,
          snippet: data.Abstract || ''
        });
      }
      
      if (data.RelatedTopics && data.RelatedTopics.length > 0) {
        for (const topic of data.RelatedTopics.slice(0, 2)) {
          if (topic.FirstURL && topic.Text) {
            results.push({
              title: topic.Text.split(' - ')[0] || topic.Text.substring(0, 100),
              link: topic.FirstURL,
              snippet: topic.Text
            });
          }
        }
      }
      
      return results;
    }
  } catch (error) {
    console.error('DuckDuckGo API error:', error);
  }
  
  return [];
}

function getSpecializedResponse(query: string): string | null {
  const lowerQuery = query.toLowerCase();
  
  if (lowerQuery.includes('time') && (lowerQuery.includes('current') || lowerQuery.includes('what'))) {
    return `🕐 **Current Time Information:**

I can help you get the current time for various locations! The time API service might be temporarily unavailable, but here's what you can do:

**For accurate current time:**
- **Delhi/India:** Search "current time in Delhi" on Google
- **Other locations:** Try "current time in [city name]"
- **World Clock:** Use timeanddate.com or worldclock.com

**Alternative approach:**
You can also ask me for time in specific cities like:
- "What time is it in London?"
- "Current time in New York"
- "Time in Tokyo right now"

I'll try to fetch the real-time information for you!`;
  }
  
  if (lowerQuery.includes('chatgpt') && (lowerQuery.includes('5') || lowerQuery.includes('latest') || lowerQuery.includes('new'))) {
    return `🤖 **About ChatGPT Updates:**

I don't have access to real-time information about the latest ChatGPT versions or updates. Here's what I recommend for current information:

**Official Sources:**
- **OpenAI Website:** [openai.com](https://openai.com)
- **OpenAI Blog:** Official announcements and updates
- **OpenAI Social Media:** Twitter/X (@OpenAI)

**What I know from my training data:**
- ChatGPT evolved through GPT-3.5, GPT-4, and other iterations
- OpenAI regularly improves their models with new capabilities
- Major updates are typically announced officially

**For the most current information about ChatGPT 5.0 or any new releases, please check the official OpenAI channels above.**`;
  }
  
  if (lowerQuery.includes('news') || lowerQuery.includes('breaking') || lowerQuery.includes('latest')) {
    return `📰 **For Current News:**

I cannot access real-time news feeds, but here are reliable sources for current information:

**General News:**
- BBC News, Reuters, Associated Press
- Major news websites and apps
- News aggregators like Google News

**Tech News:**
- TechCrunch, The Verge, Ars Technica
- Company official blogs and press releases

**For breaking news and current events, please check these sources directly for the most up-to-date information.**`;
  }
  
  return null;
}
