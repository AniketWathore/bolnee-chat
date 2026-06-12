#!/usr/bin/env node
/**
 * Universal Corpus Builder for BM25 Search
 * 
 * Works on ANY website - no industry templates or assumptions.
 * Converts crawled raw data into searchable documents for BM25.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Clean and normalize text for BM25 indexing
 */
function cleanText(text) {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s@.$€£₹-]/g, ' ')
    .trim();
}

/**
 * Extract keywords from text (top frequent meaningful words)
 */
function extractKeywords(text, limit = 10) {
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those', 'it', 'its', 'from', 'by', 'as', 'into', 'out']);
  
  const words = text.toLowerCase().match(/\b\w{3,}\b/g) || [];
  const freq = {};
  
  words.forEach(word => {
    if (!stopWords.has(word)) {
      freq[word] = (freq[word] || 0) + 1;
    }
  });
  
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word]) => word);
}

/**
 * Build documents from any page (products, services, articles, etc.)
 */
function buildPageDocuments(slug, pageData) {
  const docs = [];
  const title = pageData.title || '';
  const contentText = pageData.content
    ?.map(c => c.text)
    .join(' ') || '';
  
  const allText = `${title} ${contentText}`;
  const keywords = extractKeywords(allText, 15);
  
  // If page has price info, create price-focused document (PRIORITIZE THIS)
  if (pageData.price) {
    docs.push({
      id: `page_${slug}_price`,
      text: cleanText(`${title} price cost ${pageData.price} how much what is price of pricing rate charges fee`),
      meta: {
        type: 'page',
        slug,
        title,
        url: pageData.url,
        price: pageData.price,
        response_type: 'price'
      }
    });
  }
  
  // If page has variants, create variant document
  if (pageData.variants && Object.keys(pageData.variants).length > 0) {
    const variantTexts = Object.values(pageData.variants)
      .map(v => v.title || '')
      .filter(Boolean)
      .join(' ');
    
    docs.push({
      id: `page_${slug}_variants`,
      text: cleanText(`${title} ${variantTexts} options available sizes colors variants types models`),
      meta: {
        type: 'page',
        slug,
        title,
        url: pageData.url,
        response_type: 'variants'
      }
    });
  }
  
  // Main page document - full content (LAST so specific docs rank higher)
  docs.push({
    id: `page_${slug}_main`,
    text: cleanText(allText),
    meta: {
      type: 'page',
      slug,
      title,
      url: pageData.url,
      keywords,
      response_type: 'general'
    }
  });
  
  return docs;
}

/**
 * Build documents from contact information
 */
function buildContactDocuments(contactInfo) {
  if (!contactInfo || Object.keys(contactInfo).length === 0) return [];
  
  const docs = [];
  const parts = [];
  
  if (contactInfo.emails?.length) {
    parts.push('email ' + contactInfo.emails.join(' '));
    parts.push('contact support reach write message');
  }
  
  if (contactInfo.phones?.length) {
    parts.push('phone call ' + contactInfo.phones.join(' '));
    parts.push('telephone number contact');
  }
  
  if (contactInfo.addresses?.length) {
    parts.push('address location ' + contactInfo.addresses.join(' '));
    parts.push('visit where find');
  }
  
  if (parts.length > 0) {
    docs.push({
      id: 'contact_info',
      text: cleanText(parts.join(' ')),
      meta: {
        type: 'contact',
        data: contactInfo,
        response_type: 'contact'
      }
    });
  }
  
  return docs;
}

/**
 * Build documents from locations
 */
function buildLocationDocuments(locations) {
  if (!locations || locations.length === 0) return [];
  
  const docs = [];
  
  // Create one document per location
  locations.forEach((loc, idx) => {
    const parts = [
      loc.name || '',
      loc.address || '',
      loc.city || '',
      loc.state || '',
      loc.zip || '',
      loc.phone || '',
      'location store find where visit address'
    ];
    
    docs.push({
      id: `location_${idx}`,
      text: cleanText(parts.join(' ')),
      meta: {
        type: 'location',
        data: loc,
        response_type: 'location'
      }
    });
  });
  
  // Create aggregate location document for "where can I find" queries
  if (locations.length > 0) {
    const allLocationText = locations.map(loc => 
      `${loc.name || ''} ${loc.city || ''} ${loc.state || ''}`
    ).join(' ');
    
    docs.push({
      id: 'locations_all',
      text: cleanText(`${allLocationText} store location find where visit near me`),
      meta: {
        type: 'locations',
        count: locations.length,
        response_type: 'locations'
      }
    });
  }
  
  return docs;
}

/**
 * Main corpus builder - works on ANY crawled website
 */
function buildCorpus(rawDataPath, outputPath) {
  console.log('📖 Reading raw data:', rawDataPath);
  const rawData = JSON.parse(fs.readFileSync(rawDataPath, 'utf-8'));
  
  const documents = [];
  const seenTitles = new Map(); // Track duplicates by title
  const productNames = []; // Collect all product names
  const stats = {
    pages: 0,
    categories: 0,
    products: 0,
    contact: 0,
    locations: 0,
    duplicates_removed: 0
  };
  
  /**
   * Add documents with deduplication
   */
  function addDocuments(docs, category) {
    docs.forEach(doc => {
      const title = doc.meta.title?.toLowerCase().trim();
      const docType = doc.meta.response_type;
      const key = `${title}_${docType}`;
      
      // Skip if we've seen this exact title+type combo
      if (title && seenTitles.has(key)) {
        stats.duplicates_removed++;
        return;
      }
      
      if (title) {
        seenTitles.set(key, true);
      }
      
      documents.push(doc);
      stats[category]++;
      
      // Collect product names for product listing document
      if (category === 'products' && docType === 'general' && doc.meta.title) {
        productNames.push(doc.meta.title);
      }
    });
  }
  
  // Process all "products" (these could be actual products, services, articles, etc.)
  if (rawData.products) {
    Object.entries(rawData.products).forEach(([slug, data]) => {
      const pageDocs = buildPageDocuments(slug, data);
      addDocuments(pageDocs, 'products');
    });
  }
  
  // Process all "categories" (collections, service categories, article categories, etc.)
  if (rawData.categories) {
    Object.entries(rawData.categories).forEach(([slug, data]) => {
      const pageDocs = buildPageDocuments(slug, data);
      addDocuments(pageDocs, 'categories');
    });
  }
  
  // Process all "pages" (policies, about, FAQ, etc.)
  if (rawData.pages) {
    Object.entries(rawData.pages).forEach(([slug, data]) => {
      const pageDocs = buildPageDocuments(slug, data);
      addDocuments(pageDocs, 'pages');
    });
  }
  
  // Create a "product listing" document for "what products" queries
  if (productNames.length > 0) {
    const uniqueProducts = [...new Set(productNames)];
    documents.push({
      id: 'meta_product_listing',
      text: cleanText(`products sell offer available list show ${uniqueProducts.join(' ')} what do you sell what products what do you have`),
      meta: {
        type: 'meta',
        response_type: 'product_listing',
        product_count: uniqueProducts.length,
        products: uniqueProducts
      }
    });
  }
  
  // Process contact information (if available)
  if (rawData.contact_info) {
    const contactDocs = buildContactDocuments(rawData.contact_info);
    contactDocs.forEach(doc => documents.push(doc));
    stats.contact = contactDocs.length;
  }
  
  // Process locations (if available)
  if (rawData.locations) {
    const locationDocs = buildLocationDocuments(rawData.locations);
    locationDocs.forEach(doc => documents.push(doc));
    stats.locations = locationDocs.length;
  }
  
  // Build final corpus
  const corpus = {
    domain: rawData.domain,
    generated_at: new Date().toISOString(),
    document_count: documents.length,
    stats,
    documents
  };
  
  // Save corpus
  fs.writeFileSync(outputPath, JSON.stringify(corpus, null, 2));
  
  const sizeKB = (fs.statSync(outputPath).size / 1024).toFixed(1);
  
  console.log('\n✅ Corpus built successfully!');
  console.log(`📊 Statistics:`);
  console.log(`   - Total documents: ${documents.length}`);
  console.log(`   - Page documents: ${stats.pages}`);
  console.log(`   - Product/Service documents: ${stats.products}`);
  console.log(`   - Category documents: ${stats.categories}`);
  console.log(`   - Contact documents: ${stats.contact}`);
  console.log(`   - Location documents: ${stats.locations}`);
  console.log(`   - Duplicates removed: ${stats.duplicates_removed}`);
  console.log(`   - Corpus size: ${sizeKB} KB`);
  console.log(`💾 Saved to: ${outputPath}`);
  
  return corpus;
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.error('Usage: node build-corpus.js <input_raw_data.json> <output_corpus.json>');
    console.error('Example: node build-corpus.js ../crawler/seattlecider_raw_data.json ../data/seattlecider_corpus.json');
    process.exit(1);
  }
  
  const [inputPath, outputPath] = args;
  
  if (!fs.existsSync(inputPath)) {
    console.error(`❌ Input file not found: ${inputPath}`);
    process.exit(1);
  }
  
  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  try {
    buildCorpus(inputPath, outputPath);
  } catch (error) {
    console.error('❌ Error building corpus:', error.message);
    process.exit(1);
  }
}

export { buildCorpus, buildPageDocuments, buildContactDocuments, buildLocationDocuments };
