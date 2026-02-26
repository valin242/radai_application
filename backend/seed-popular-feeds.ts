import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

const POPULAR_FEEDS = [
  // Technology
  {
    name: 'TechCrunch',
    url: 'https://techcrunch.com/feed/',
    category: 'technology',
    description: 'Latest technology news, startup funding, and tech industry analysis',
    isPopular: true,
  },
  {
    name: 'The Verge',
    url: 'https://www.theverge.com/rss/index.xml',
    category: 'technology',
    description: 'Technology, science, art, and culture news and reviews',
    isPopular: true,
  },
  {
    name: 'Ars Technica',
    url: 'https://feeds.arstechnica.com/arstechnica/index',
    category: 'technology',
    description: 'In-depth technology news, analysis, and reviews',
    isPopular: true,
  },
  
  // News
  {
    name: 'NPR News',
    url: 'https://feeds.npr.org/1001/rss.xml',
    category: 'news',
    description: 'National and international news from NPR',
    isPopular: true,
  },
  {
    name: 'BBC News',
    url: 'http://feeds.bbci.co.uk/news/rss.xml',
    category: 'news',
    description: 'Breaking news and analysis from the BBC',
    isPopular: true,
  },
  {
    name: 'Reuters',
    url: 'https://www.reutersagency.com/feed/',
    category: 'news',
    description: 'Global news and business information',
    isPopular: true,
  },
  
  // Finance
  {
    name: 'Bloomberg',
    url: 'https://www.bloomberg.com/feed/podcast/etf-report',
    category: 'finance',
    description: 'Financial news, market data, and business analysis',
    isPopular: true,
  },
  {
    name: 'Financial Times',
    url: 'https://www.ft.com/?format=rss',
    category: 'finance',
    description: 'Global business and financial news',
    isPopular: true,
  },
  
  // Science
  {
    name: 'Scientific American',
    url: 'http://rss.sciam.com/ScientificAmerican-Global',
    category: 'science',
    description: 'Science news, research, and discoveries',
    isPopular: true,
  },
  {
    name: 'Nature',
    url: 'https://www.nature.com/nature.rss',
    category: 'science',
    description: 'Leading international scientific journal',
    isPopular: true,
  },
];

async function seedPopularFeeds() {
  console.log('Starting popular feeds seeding...');

  try {
    // Get or create a system user for popular feeds
    // Popular feeds need to be associated with a user, but they should be available to all users
    // We'll create a system user for this purpose
    let systemUser = await prisma.user.findFirst({
      where: { email: 'system@radiai.internal' },
    });

    if (!systemUser) {
      console.log('Creating system user for popular feeds...');
      systemUser = await prisma.user.create({
        data: {
          email: 'system@radiai.internal',
          tier: 'free',
        },
      });
      console.log(`System user created with ID: ${systemUser.id}`);
    } else {
      console.log(`System user found with ID: ${systemUser.id}`);
    }

    // Seed popular feeds
    for (const feedData of POPULAR_FEEDS) {
      // Check if feed already exists for system user
      const existingFeed = await prisma.feed.findUnique({
        where: {
          userId_url: {
            userId: systemUser.id,
            url: feedData.url,
          },
        },
      });

      if (existingFeed) {
        console.log(`Feed already exists: ${feedData.name}`);
        // Update the feed to ensure it has the latest data
        await prisma.feed.update({
          where: { id: existingFeed.id },
          data: {
            name: feedData.name,
            category: feedData.category,
            description: feedData.description,
            isPopular: feedData.isPopular,
          },
        });
        console.log(`Updated feed: ${feedData.name}`);
      } else {
        // Create new feed
        await prisma.feed.create({
          data: {
            userId: systemUser.id,
            url: feedData.url,
            name: feedData.name,
            category: feedData.category,
            description: feedData.description,
            isPopular: feedData.isPopular,
          },
        });
        console.log(`Created feed: ${feedData.name}`);
      }
    }

    console.log('\nSeeding completed successfully!');
    console.log(`Total popular feeds: ${POPULAR_FEEDS.length}`);
    
    // Display summary by category
    const categories = [...new Set(POPULAR_FEEDS.map(f => f.category))];
    console.log('\nFeeds by category:');
    categories.forEach(category => {
      const count = POPULAR_FEEDS.filter(f => f.category === category).length;
      console.log(`  ${category}: ${count} feeds`);
    });

  } catch (error) {
    console.error('Error seeding popular feeds:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed function
seedPopularFeeds()
  .catch((error) => {
    console.error('Seeding failed:', error);
    process.exit(1);
  });
