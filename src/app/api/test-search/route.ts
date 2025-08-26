import { NextRequest, NextResponse } from 'next/server';
import { searchAndScrape } from '@/utils/search-improved';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const query = searchParams.get('q');
  
  if (!query) {
    return NextResponse.json({ error: 'Query parameter "q" is required' }, { status: 400 });
  }
  
  try {
    console.log(`Testing search for: ${query}`);
    const result = await searchAndScrape(query);
    console.log(`Search result length: ${result.length}`);
    
    return NextResponse.json({ 
      query, 
      result,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Test search error:', error);
    return NextResponse.json({ 
      error: error.message, 
      query 
    }, { status: 500 });
  }
}
