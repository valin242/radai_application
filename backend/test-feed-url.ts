/**
 * Test a specific feed URL to see why it's failing
 */

import { parseRSSFeed } from './src/lib/rss-parser';

async function main() {
  const feedUrl = 'https://www.bloomberg.com/feed/podcast/etf-report';
  
  console.log(`Testing feed URL: ${feedUrl}\n`);

  try {
    const result = await parseRSSFeed(feedUrl);
    
    if (result.success) {
      console.log('✓ Feed is valid!');
      console.log(`  Articles found: ${result.articles.length}`);
      if (result.articles.length > 0) {
        console.log(`  First article: ${result.articles[0].title}`);
      }
    } else {
      console.log('✗ Feed validation failed');
      console.log(`  Error: ${result.error}`);
    }
  } catch (error) {
    console.error('Exception occurred:');
    console.error(error);
  }
}

main();
