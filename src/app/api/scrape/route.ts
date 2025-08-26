import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import axios from 'axios';

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    const response = await axios.get(url);
    const html = response.data;
    const $ = cheerio.load(html);

    $('script, style, nav, footer, header, aside').remove();

    let text = '';
    $('h1, h2, h3, h4, h5, h6, p, li, a, pre, code, article, section, main').each((i, elem) => {
        text += $(elem).text() + '\n';
    });


    const cleanedText = text.replace(/\s\s+/g, ' ').trim();

    return NextResponse.json({ content: cleanedText });
  } catch (error) {
    console.error('Scraping error:', error);
    return NextResponse.json({ error: 'Failed to scrape the URL' }, { status: 500 });
  }
}
