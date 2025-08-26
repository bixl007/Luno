import * as cheerio from 'cheerio';
import axios from 'axios';

export async function scrapeUrlContent(url: string): Promise<string> {
  try {
    if (url.match(/\.(pdf|jpg|jpeg|png|gif|mp4|mp3|zip|exe|dmg)$/i)) {
      return `Cannot extract text content from ${url} - file type not supported for text extraction.`;
    }

    const response = await axios.get(url, {
      timeout: 15000, // 15 second timeout
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'DNT': '1',
        'Connection': 'keep-alive'
      },
      maxRedirects: 5,
      validateStatus: function (status) {
        return status >= 200 && status < 400; 
      }
    });

    const html = response.data;
    const $ = cheerio.load(html);

    $('script, style, nav, footer, header, aside, form, noscript, iframe, object, embed, canvas, svg').remove();
    
    $('.ad, .advertisement, .ads, .sponsor, #ads, .sidebar, .menu, .navigation, .social, .share').remove();
    
    let text = '';
    
    const mainContentSelectors = [
      'article',
      'main', 
      '[role="main"]',
      '.main-content',
      '.content',
      '.post-content',
      '.entry-content', 
      '.article-content',
      '.page-content',
      '#content',
      '#main-content'
    ];
    
    for (const selector of mainContentSelectors) {
      const mainContent = $(selector);
      if (mainContent.length > 0) {
        text = mainContent.text();
        break;
      }
    }
    
    if (!text || text.trim().length < 50) {
      text = '';
      $('h1, h2, h3, h4, h5, h6, p, li, blockquote, .text, .description').each((i, elem) => {
        const elemText = $(elem).text().trim();
        if (elemText.length > 10) { 
          text += elemText + '\n\n';
        }
      });
    }

    if (!text || text.trim().length < 50) {
      text = $('body').text();
    }

    let cleanedText = text
      .replace(/\s\s+/g, ' ') 
      .replace(/\n\s*\n/g, '\n') 
      .trim();

    if (cleanedText.length > 4000) {
      cleanedText = cleanedText.substring(0, 4000) + '... (content truncated)';
    }

    if (cleanedText.length < 50) {
      return `The content from ${url} appears to be dynamically loaded or has minimal text content. The page may require JavaScript to display content properly.`;
    }

    return cleanedText;
  } catch (error: any) {
    console.error(`Error scraping ${url}:`, error.message);
    
    if (error.code === 'ENOTFOUND') {
      return `Could not connect to ${url} - the website may be down or the URL may be incorrect.`;
    } else if (error.code === 'ETIMEDOUT') {
      return `Request to ${url} timed out - the website may be slow or temporarily unavailable.`;
    } else if (error.response?.status === 403) {
      return `Access denied to ${url} - the website is blocking automated requests.`;
    } else if (error.response?.status === 404) {
      return `Page not found at ${url} - the URL may be incorrect or the page may have been moved.`;
    } else if (error.response?.status >= 500) {
      return `Server error at ${url} - the website is experiencing technical difficulties.`;
    } else {
      return `Failed to scrape content from ${url} - ${error.message}`;
    }
  }
}
