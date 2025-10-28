// Enhanced web scraping service with Puppeteer
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const source = searchParams.get('source') || 'all';
  
  if (!query) {
    return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
  }

  try {
    const products = await scrapeWithPuppeteer(query, source);
    
    return NextResponse.json({
      products,
      totalResults: products.length,
      source: source,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Puppeteer scraping error:', error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}

async function scrapeWithPuppeteer(query: string, source: string) {
  try {
    // Dynamic import for Puppeteer (only load when needed)
    const puppeteer = await import('puppeteer');
    
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });

    const page = await browser.newPage();
    
    // Set user agent and viewport
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    await page.setViewport({ width: 1920, height: 1080 });

    const products = [];

    if (source === 'all' || source === 'bigbasket') {
      try {
        const bigbasketProducts = await scrapeBigBasketWithPuppeteer(page, query);
        products.push(...bigbasketProducts);
      } catch (error) {
        console.error('BigBasket scraping failed:', error);
      }
    }

    if (source === 'all' || source === 'grofers') {
      try {
        const grofersProducts = await scrapeGrofersWithPuppeteer(page, query);
        products.push(...grofersProducts);
      } catch (error) {
        console.error('Grofers scraping failed:', error);
      }
    }

    if (source === 'all' || source === 'amazon') {
      try {
        const amazonProducts = await scrapeAmazonWithPuppeteer(page, query);
        products.push(...amazonProducts);
      } catch (error) {
        console.error('Amazon scraping failed:', error);
      }
    }

    await browser.close();
    
    return products;
  } catch (error) {
    console.error('Puppeteer error:', error);
    // Fallback to mock data
    return getMockData(query, source);
  }
}

async function scrapeBigBasketWithPuppeteer(page: any, query: string) {
  const searchUrl = `https://www.bigbasket.com/ps/?q=${encodeURIComponent(query)}`;
  
  await page.goto(searchUrl, { waitUntil: 'networkidle2' });
  
  // Wait for products to load
  await page.waitForSelector('[data-testid="product"]', { timeout: 10000 });
  
  const products = await page.evaluate((query: string) => {
    const productElements = document.querySelectorAll('[data-testid="product"]');
    const results: any[] = [];
    
    productElements.forEach((element, index) => {
      if (index >= 10) return; // Limit to 10 products
      
      const nameElement = element.querySelector('h6[class*="prod-name"]');
      const priceElement = element.querySelector('span[class*="price"]');
      const imageElement = element.querySelector('img');
      const brandElement = element.querySelector('span[class*="brand"]');
      
      const name = nameElement?.textContent?.trim() || `${query} - Product ${index + 1}`;
      const price = priceElement?.textContent?.replace(/[^\d.]/g, '') || '50';
      const image = (imageElement as HTMLImageElement)?.src || 'https://via.placeholder.com/200x200';
      const brand = brandElement?.textContent?.trim() || 'BigBasket';
      
      results.push({
        id: `bb_puppeteer_${Date.now()}_${index}`,
        name: name,
        brand: brand,
        category: categorizeProduct(name),
        packSizes: generatePackSizes(name, parseFloat(price)),
        image: image,
        description: `Fresh ${name} from BigBasket`,
        source: 'bigbasket'
      });
    });
    
    return results;
  }, query);
  
  return products;
}

async function scrapeGrofersWithPuppeteer(page: any, query: string) {
  const searchUrl = `https://grofers.com/s/?q=${encodeURIComponent(query)}`;
  
  await page.goto(searchUrl, { waitUntil: 'networkidle2' });
  
  // Wait for products to load
  await page.waitForSelector('.product-item', { timeout: 10000 });
  
  const products = await page.evaluate((query: string) => {
    const productElements = document.querySelectorAll('.product-item');
    const results: any[] = [];
    
    productElements.forEach((element, index) => {
      if (index >= 10) return; // Limit to 10 products
      
      const nameElement = element.querySelector('.product-name');
      const priceElement = element.querySelector('.price');
      const imageElement = element.querySelector('img');
      const brandElement = element.querySelector('.brand-name');
      
      const name = nameElement?.textContent?.trim() || `${query} - Fresh Daily ${index + 1}`;
      const price = priceElement?.textContent?.replace(/[^\d.]/g, '') || '60';
      const image = (imageElement as HTMLImageElement)?.src || 'https://via.placeholder.com/200x200';
      const brand = brandElement?.textContent?.trim() || 'Grofers';
      
      results.push({
        id: `gf_puppeteer_${Date.now()}_${index}`,
        name: name,
        brand: brand,
        category: categorizeProduct(name),
        variants: generateVariants(name, parseFloat(price)),
        image: image,
        description: `Fresh ${name} delivered daily by Grofers`,
        source: 'grofers'
      });
    });
    
    return results;
  }, query);
  
  return products;
}

async function scrapeAmazonWithPuppeteer(page: any, query: string) {
  const searchUrl = `https://www.amazon.in/s?k=${encodeURIComponent(query)}&ref=sr_pg_1`;
  
  await page.goto(searchUrl, { waitUntil: 'networkidle2' });
  
  // Wait for products to load
  await page.waitForSelector('[data-component-type="s-search-result"]', { timeout: 10000 });
  
  const products = await page.evaluate((query: string) => {
    const productElements = document.querySelectorAll('[data-component-type="s-search-result"]');
    const results: any[] = [];
    
    productElements.forEach((element, index) => {
      if (index >= 10) return; // Limit to 10 products
      
      const nameElement = element.querySelector('h2 span[class*="a-size-medium"]');
      const priceElement = element.querySelector('.a-price-whole');
      const imageElement = element.querySelector('.s-image');
      const brandElement = element.querySelector('span[class*="a-size-base"]');
      
      const name = nameElement?.textContent?.trim() || `${query} - Amazon Choice ${index + 1}`;
      const price = priceElement?.textContent?.replace(/[^\d.]/g, '') || '100';
      const image = (imageElement as HTMLImageElement)?.src || 'https://via.placeholder.com/200x200';
      const brand = brandElement?.textContent?.trim() || 'Amazon';
      
      results.push({
        id: `amz_puppeteer_${Date.now()}_${index}`,
        name: name,
        brand: brand,
        category: categorizeProduct(name),
        variations: generateVariations(name, parseFloat(price)),
        image: image,
        description: `Amazon's choice for ${name}`,
        source: 'amazon'
      });
    });
    
    return results;
  }, query);
  
  return products;
}

// Helper functions
function categorizeProduct(name: string): string {
  const nameLower = name.toLowerCase();
  
  if (nameLower.includes('maggi') || nameLower.includes('noodles')) return 'Instant Food';
  if (nameLower.includes('rice') || nameLower.includes('dal')) return 'Grains';
  if (nameLower.includes('oil')) return 'Cooking Oil';
  if (nameLower.includes('onion') || nameLower.includes('tomato') || nameLower.includes('potato')) return 'Vegetables';
  if (nameLower.includes('milk') || nameLower.includes('curd')) return 'Dairy';
  if (nameLower.includes('spice') || nameLower.includes('masala')) return 'Spices';
  
  return 'Grocery';
}

function generatePackSizes(name: string, basePrice: number) {
  const packSizes = [];
  const nameLower = name.toLowerCase();
  
  if (nameLower.includes('maggi') || nameLower.includes('noodles')) {
    packSizes.push(
      { quantity: 1, unit: 'pack', description: '70g', price: basePrice, isPopular: true },
      { quantity: 12, unit: 'pack', description: '70g each', price: basePrice * 10, isPopular: true }
    );
  } else if (nameLower.includes('rice') || nameLower.includes('dal')) {
    packSizes.push(
      { quantity: 1, unit: 'kg', description: '1kg', price: basePrice, isPopular: true },
      { quantity: 5, unit: 'kg', description: '5kg', price: basePrice * 4.2, isPopular: true }
    );
  } else {
    packSizes.push(
      { quantity: 1, unit: 'piece', description: '1 piece', price: basePrice, isPopular: true }
    );
  }
  
  return packSizes;
}

function generateVariants(name: string, basePrice: number) {
  return generatePackSizes(name, basePrice).map(ps => ({
    quantity: ps.quantity,
    unit: ps.unit,
    packSize: ps.description,
    price: ps.price,
    isPopular: ps.isPopular
  }));
}

function generateVariations(name: string, basePrice: number) {
  return generatePackSizes(name, basePrice).map(ps => ({
    quantity: ps.quantity,
    unit: ps.unit,
    packSize: ps.description,
    price: ps.price,
    isPopular: ps.isPopular
  }));
}

function getMockData(query: string, source: string) {
  // Enhanced mock data with better suggestions
  const queryLower = query.toLowerCase();
  
  // Common grocery items database
  const groceryDatabase = {
    'rice': [
      { name: 'Basmati Rice', brand: 'India Gate', price: 80, category: 'Grains' },
      { name: 'Sona Masoori Rice', brand: 'Kohinoor', price: 75, category: 'Grains' },
      { name: 'Brown Rice', brand: 'Organic', price: 120, category: 'Grains' }
    ],
    'oil': [
      { name: 'Sunflower Oil', brand: 'Fortune', price: 150, category: 'Cooking Oil' },
      { name: 'Mustard Oil', brand: 'Dhara', price: 140, category: 'Cooking Oil' },
      { name: 'Coconut Oil', brand: 'Parachute', price: 200, category: 'Cooking Oil' }
    ],
    'maggi': [
      { name: 'Maggi 2-Minute Noodles', brand: 'Nestle', price: 12, category: 'Instant Food' },
      { name: 'Maggi Masala Noodles', brand: 'Nestle', price: 14, category: 'Instant Food' },
      { name: 'Maggi Atta Noodles', brand: 'Nestle', price: 16, category: 'Instant Food' }
    ],
    'onion': [
      { name: 'Fresh Red Onions', brand: 'Farm Fresh', price: 30, category: 'Vegetables' },
      { name: 'Organic Onions', brand: 'Organic', price: 45, category: 'Vegetables' }
    ],
    'tomato': [
      { name: 'Fresh Tomatoes', brand: 'Farm Fresh', price: 50, category: 'Vegetables' },
      { name: 'Cherry Tomatoes', brand: 'Organic', price: 80, category: 'Vegetables' }
    ],
    'milk': [
      { name: 'Fresh Cow Milk', brand: 'Amul', price: 60, category: 'Dairy' },
      { name: 'Buffalo Milk', brand: 'Mother Dairy', price: 65, category: 'Dairy' },
      { name: 'Toned Milk', brand: 'Amul', price: 55, category: 'Dairy' }
    ],
    'dal': [
      { name: 'Toor Dal', brand: 'Tata', price: 90, category: 'Pulses' },
      { name: 'Moong Dal', brand: 'Tata', price: 85, category: 'Pulses' },
      { name: 'Chana Dal', brand: 'Tata', price: 95, category: 'Pulses' }
    ],
    'bread': [
      { name: 'White Bread', brand: 'Britannia', price: 25, category: 'Bakery' },
      { name: 'Brown Bread', brand: 'Britannia', price: 30, category: 'Bakery' },
      { name: 'Multigrain Bread', brand: 'Britannia', price: 35, category: 'Bakery' }
    ],
    'eggs': [
      { name: 'Farm Fresh Eggs', brand: 'Farm Fresh', price: 60, category: 'Dairy' },
      { name: 'Organic Eggs', brand: 'Organic', price: 80, category: 'Dairy' }
    ],
    'salt': [
      { name: 'Iodized Salt', brand: 'Tata', price: 20, category: 'Spices' },
      { name: 'Rock Salt', brand: 'Tata', price: 25, category: 'Spices' }
    ]
  };

  // Find matching items
  const matchingItems = [];
  for (const [key, items] of Object.entries(groceryDatabase)) {
    if (queryLower.includes(key) || key.includes(queryLower)) {
      matchingItems.push(...items);
    }
  }

  // If no matches found, create generic items
  if (matchingItems.length === 0) {
    matchingItems.push({
      name: `${query} - Fresh Daily`,
      brand: source.charAt(0).toUpperCase() + source.slice(1),
      price: 50,
      category: categorizeProduct(query)
    });
  }

  // Convert to DynamicProduct format
  return matchingItems.slice(0, 5).map((item, index) => ({
    id: `mock_${source}_${Date.now()}_${index}`,
    name: item.name,
    brand: item.brand,
    category: item.category,
    packSizes: generatePackSizes(item.name, item.price),
    image: `https://via.placeholder.com/200x200?text=${encodeURIComponent(item.name)}`,
    description: `Fresh ${item.name} from ${source}`,
    source: source
  }));
}
