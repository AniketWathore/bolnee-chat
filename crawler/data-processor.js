import fs from 'fs';
import path from 'path';

class DataProcessor {
  constructor(rawData) {
    this.rawData = rawData;
    this.knowledge = {
      metadata: {
        domain: rawData.domain,
        crawled_at: rawData.crawled_at,
        processed_at: new Date().toISOString(),
        product_count: 0,
      },
      products: [],
      policies: {},
      about: {},
      contact: {},
      site_faq: [],
      social_media: {},
      content_by_type: {},
    };
  }

  process() {
    console.log('🔄 Processing raw crawler data...');

    this._normalizeData();
    this._organizeByType();
    this._extractProducts();
    this._extractPolicies();
    this._extractAbout();
    this._extractContactInfo();
    this._extractFAQs();
    this._extractSocialMedia();
    this._generateSearchableText();
    this._cleanup();

    console.log('✅ Processing complete!');
    return this.knowledge;
  }

  _normalizeData() {
    const pages = [];

    // Only treat genuine product URLs (/products/, /item/, /p/, /detail/, etc.) as products
    const _PRODUCT_PATH_RE = /\/(products?|item|p\/|detail|pd\/|dp\/|sku|goods)\//i;

    for (const [slug, data] of Object.entries(this.rawData.products || {})) {
      const url = data.url || '';
      const isRealProduct = _PRODUCT_PATH_RE.test(url);

      if (isRealProduct) {
        pages.push({
          url: url,
          title: data.title || '',
          type: 'product',
          price: data.price || null,
          variants: data.variants || {},
          content_blocks: (data.content || []).map(c => ({
            tag: c.tag,
            text: c.text,
            type: this._inferBlockType(c, data),
          })),
        });
      } else {
        // Misclassified page — route to proper page type
        const type = this._detectPageTypeFromUrl(url);
        pages.push({
          url: url,
          title: data.title || '',
          type: type,
          content_blocks: (data.content || []).map(c => ({
            tag: c.tag,
            text: c.text,
            type: 'text',
          })),
        });
      }
    }

    // Skip categories entirely

    for (const [slug, data] of Object.entries(this.rawData.pages || {})) {
      const type = this._detectPageTypeFromUrl(data.url || '');
      pages.push({
        url: data.url,
        title: data.title || '',
        type: type,
        content_blocks: (data.content || []).map(c => ({ tag: c.tag, text: c.text, type: 'text' })),
      });
    }

    this.rawData.pages = pages;
  }

  _isProductUrl(url) {
    return /\/(products?|item|p\/|detail|pd\/|dp\/|sku|goods)\//i.test(url);
  }

  _inferBlockType(block, productData) {
    if (block.tag === 'h1') return 'title';
    if (/[$£€₹]\s?[\d,]|price|cost|mrp/i.test(block.text)) return 'price';
    if (block.tag === 'p' && block.text.length > 30) return 'description';
    if (['h2','h3','h4','h5','h6','li','div','section'].includes(block.tag) && block.text.length > 30) return 'description';
    return 'text';
  }

  _detectPageTypeFromUrl(url) {
    const u = url.toLowerCase();
    // Match whole words (with optional plurals) in URL path segments to avoid false positives
    if (/\b(polic(?:y|ies)|refund(?:s)?|return(?:s)?|shipping|terms?|conditions?|privacy)\b/.test(u)) return 'policy';
    if (/\b(about|story|company|team)\b/.test(u)) return 'about';
    if (/\b(faq|help|support|questions?)\b/.test(u)) return 'faq';
    if (/\b(contact|location|visit|store|find|hours)\b/.test(u)) return 'contact';
    return 'page';
  }

  _organizeByType() {
    console.log('  Organizing content by type...');
    for (const page of this.rawData.pages) {
      if (!this.knowledge.content_by_type[page.type]) {
        this.knowledge.content_by_type[page.type] = [];
      }
      this.knowledge.content_by_type[page.type].push(page);
    }
  }

  _extractProducts() {
    console.log('  Extracting products...');
    const productPages = this.knowledge.content_by_type.product || [];

    for (const page of productPages) {
      const product = this._parseProductPage(page);
      if (product && product.name) {
        this.knowledge.products.push(product);
      }
    }

    this.knowledge.metadata.product_count = this.knowledge.products.length;
  }

  _parseProductPage(page) {
    const blocks = page.content_blocks;

    // Skip 404 pages
    const title = (page.title || '').trim();
    if (/404|not found/i.test(title) && (!page.price || page.price === null)) {
      return null;
    }

    const product = {
      id: this._generateId('prod'),
      name: title,
      description: '',
      price: page.price,
      url: page.url,
      variants: [],
      keywords: [],
    };

    // Use variants already discovered by crawler from HTML structure
    if (page.variants && typeof page.variants === 'object' && Object.keys(page.variants).length > 0) {
      for (const [vid, vdata] of Object.entries(page.variants)) {
        const v = {
          option: vdata.title || vid,
          price: vdata.price || null,
          url: vdata.url || '',
        };
        product.variants.push(v);
      }
    }

    if (!product.name || product.name.length < 3) {
      const titleBlock = blocks.find(b => b.type === 'title' || b.tag === 'h1' || b.tag === 'h2');
      if (titleBlock && titleBlock.text.length > 3) {
        product.name = titleBlock.text;
      } else {
        const pathMatch = page.url.match(/\/([^\/]+?)(?:\/|$)(?:#|\?|$)/);
        if (pathMatch) {
          product.name = pathMatch[1].replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        }
      }
    }

    // Extract price from blocks if not already set
    for (const block of blocks) {
      if (block.type === 'price' && !product.price) {
        const price = this._extractPrice(block.text);
        if (price) {
          product.price = price.value;
          product.currency = price.currency;
        }
      }
    }
    if (product.price === null) {
      const allText = blocks.map(b => b.text).join(' ');
      const price = this._extractPrice(allText);
      if (price) {
        product.price = price.value;
        product.currency = price.currency;
      }
    }

    // Description is all non-FAQ text blocks
    product.description = blocks
      .filter(b => b.type === 'description' || b.type === 'text')
      .map(b => b.text)
      .join(' ')
      .trim();

    // Keywords only from name + description + price
    const keywordSource = [
      product.name,
      product.description,
      product.price ? String(product.price) : '',
    ].join(' ');
    product.keywords = this._extractKeywords(keywordSource).slice(0, 20);

    return product;
  }

  _parseQAFromBlocks(blocks) {
    const faq = [];
    let currentQ = '';

    for (const block of blocks) {
      const text = block.text.trim();
      if (!text || text.length < 5) continue;

      // A question must end with a question mark
      if (text.endsWith('?')) {
        if (currentQ) {
          faq.push({ question: currentQ, answer: '' });
        }
        currentQ = text;
      } else if (currentQ && text.length > 20) {
        // Answer found — pair it with the question
        faq.push({ question: currentQ, answer: text });
        currentQ = '';
      }
    }
    if (currentQ) {
      faq.push({ question: currentQ, answer: '' });
    }
    return faq;
  }

  _extractPolicies() {
    console.log('  Extracting policies...');
    const policyPages = this.knowledge.content_by_type.policy || [];

    for (const page of policyPages) {
      const policyType = this._detectPolicyType(page.url, page.content_blocks);
      if (!policyType) continue;

      // Skip if we already have a policy of this type with content
      if (this.knowledge.policies[policyType] && this.knowledge.policies[policyType].content) {
        continue;
      }

      const content = page.content_blocks
        .map(b => b.text)
        .join(' ')
        .substring(0, 3000);

      const title = page.content_blocks.find(b => b.tag === 'h1' || b.tag === 'h2');

      // Only store if there's actual content, or if we don't have this type yet
      if (content || !this.knowledge.policies[policyType]) {
        this.knowledge.policies[policyType] = {
          id: this._generateId('policy'),
          type: policyType,
          title: title ? title.text : policyType.charAt(0).toUpperCase() + policyType.slice(1),
          url: page.url,
          content: content,
        };
      }
    }
  }

  _detectPolicyType(url, blocks) {
    const urlLower = url.toLowerCase();
    if (urlLower.includes('refund') || urlLower.includes('return')) return 'refund';
    if (urlLower.includes('shipping') || urlLower.includes('delivery')) return 'shipping';
    if (urlLower.includes('term') || urlLower.includes('condition')) return 'terms';
    if (urlLower.includes('privacy')) return 'privacy';

    // Only fall back to text content if the page title/URL strongly suggests policy
    const fullText = blocks.map(b => b.text.toLowerCase()).join(' ');
    const refundCount = (fullText.match(/refund/g) || []).length;
    const shippingCount = (fullText.match(/shipping/g) || []).length;

    // Require multiple mentions to avoid false positives
    if (refundCount >= 3 && fullText.includes('return policy')) return 'refund';
    if (shippingCount >= 3 && fullText.includes('shipping policy')) return 'shipping';

    return null;
  }

  _extractAbout() {
    console.log('  Extracting about/company info...');
    const aboutPages = this.knowledge.content_by_type.about || [];

    for (const page of aboutPages) {
      const content = page.content_blocks
        .map(b => b.text)
        .join(' ')
        .substring(0, 2000)
        .trim();

      // Skip empty pages if we already have content
      if (!content && this.knowledge.about.content) {
        continue;
      }

      this.knowledge.about = {
        url: page.url,
        content: content,
      };
    }
  }

  _extractContactInfo() {
    console.log('  Extracting contact info...');
    const contactPages = [
      ...(this.knowledge.content_by_type.page || []),
      ...(this.knowledge.content_by_type.about || []),
      ...(this.knowledge.content_by_type.policy || []),
      ...(this.knowledge.content_by_type.contact || []),
    ];

    const allText = contactPages.flatMap(p => p.content_blocks.map(b => b.text)).join(' ');

    const emails = [...new Set(allText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [])];
    const phones = [...new Set(allText.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g) || [])];
    const socialLinks = this._extractSocialFromText(allText);

    const addressPatterns = [
      ...allText.matchAll(/\b(\d{1,5}\s+[a-zA-Z0-9\s,.#]+(?:street|st|avenue|ave|road|rd|drive|dr|lane|ln|blvd|boulevard|way|place|pl|court|ct|square|sq|parkway|pkwy|highway|hwy)\s*,?\s*[a-zA-Z\s]+,?\s*[A-Z]{2}\s*\d{5}(?:-\d{4})?)\b/gi),
    ];
    const addresses = [...new Set(addressPatterns.map(m => m[1].trim()))];

    const classified = { emails: [] };
    for (const e of emails) {
      const lower = e.toLowerCase();
      if (/(support|help|info|contact|team|hello|hi)/i.test(lower)) {
        if (!classified.support_email) classified.support_email = e;
      } else if (/(sales|order|purchase|buy)/i.test(lower)) {
        if (!classified.sales_email) classified.sales_email = e;
      } else if (/(press|media|pr|public|relations)/i.test(lower)) {
        if (!classified.press_email) classified.press_email = e;
      } else if (/(career|job|hr|recruit|hiring|work)/i.test(lower)) {
        if (!classified.careers_email) classified.careers_email = e;
      } else {
        classified.emails.push(e);
      }
    }

    this.knowledge.contact = {
      emails: classified.emails.length > 0 ? classified.emails : undefined,
      support_email: classified.support_email,
      sales_email: classified.sales_email,
      press_email: classified.press_email,
      careers_email: classified.careers_email,
      phones: phones.length > 0 ? phones : undefined,
      addresses: addresses.length > 0 ? addresses : undefined,
      social_links: Object.keys(socialLinks).length > 0 ? socialLinks : undefined,
    };
    Object.keys(this.knowledge.contact).forEach(k => {
      if (this.knowledge.contact[k] === undefined) delete this.knowledge.contact[k];
    });
  }

  _extractFAQs() {
    console.log('  Extracting FAQ pages...');
    const faqPages = this.knowledge.content_by_type.faq || [];

    for (const page of faqPages) {
      const blocks = page.content_blocks;
      const faqItems = this._parseQAFromBlocks(blocks);
      if (faqItems.length > 0) {
        this.knowledge.site_faq.push({
          url: page.url,
          title: page.title,
          items: faqItems,
        });
      }
    }
  }

  _extractSocialMedia() {
    console.log('  Extracting social media links...');
    const socialDomains = [
      { key: 'facebook', patterns: [/facebook\.com\/([^/\s?]+)/i] },
      { key: 'instagram', patterns: [/instagram\.com\/([^/\s?]+)/i] },
      { key: 'twitter', patterns: [/twitter\.com\/([^/\s?]+)/i, /x\.com\/([^/\s?]+)/i] },
      { key: 'tiktok', patterns: [/tiktok\.com\/(?:@)?([^/\s?]+)/i] },
      { key: 'linkedin', patterns: [/linkedin\.com\/(company|in)\/([^/\s?]+)/i] },
      { key: 'youtube', patterns: [/youtube\.com\/(?:@|channel\/|c\/|user\/)?([^/\s?]+)/i] },
      { key: 'pinterest', patterns: [/pinterest\.(?:com|ca|uk|au|de|fr)\/([^/\s?]+)/i] },
      { key: 'snapchat', patterns: [/snapchat\.com\/add\/([^/\s?]+)/i] },
      { key: 'reddit', patterns: [/reddit\.com\/(?:r|user)\/([^/\s?]+)/i] },
    ];

    const allPages = Object.values(this.knowledge.content_by_type).flat();
    const allText = allPages.flatMap(p => p.content_blocks.map(b => b.text)).join(' ');
    const allUrls = allPages.map(p => p.url).join(' ');

    const combined = (allText + ' ' + allUrls).toLowerCase();

    const found = {};
    for (const platform of socialDomains) {
      for (const pattern of platform.patterns) {
        const matches = combined.match(pattern);
        if (matches) {
          found[platform.key] = matches[0];
          break;
        }
      }
    }

    // Also check contact section social_links
    if (this.knowledge.contact.social_links) {
      Object.assign(found, this.knowledge.contact.social_links);
    }

    this.knowledge.social_media = found;
  }

  _extractSocialFromText(text) {
    const socialDomains = [
      { key: 'facebook', re: /facebook\.com\/([^/\s?]+)/i },
      { key: 'instagram', re: /instagram\.com\/([^/\s?]+)/i },
      { key: 'twitter', re: /twitter\.com\/([^/\s?]+)/i },
      { key: 'tiktok', re: /tiktok\.com\/(?:@)?([^/\s?]+)/i },
      { key: 'linkedin', re: /linkedin\.com\/(company|in)\/([^/\s?]+)/i },
      { key: 'youtube', re: /youtube\.com\/(?:@|channel\/|c\/|user\/)?([^/\s?]+)/i },
    ];
    const found = {};
    for (const s of socialDomains) {
      const m = text.match(s.re);
      if (m) found[s.key] = m[0];
    }
    return found;
  }

  _generateSearchableText() {
    console.log('  Generating searchable text...');
    for (const product of this.knowledge.products) {
      const parts = [
        product.name,
        product.description,
        product.keywords.join(' '),
        product.variants.map(v => v.option).join(' '),
      ];

      product.searchable_text = parts
        .join(' ')
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }
  }

  _cleanup() {
    delete this.knowledge.content_by_type;
    // Clean empty contact fields
    if (this.knowledge.contact && Object.keys(this.knowledge.contact).length === 0) {
      delete this.knowledge.contact;
    }
    if (this.knowledge.site_faq && this.knowledge.site_faq.length === 0) {
      delete this.knowledge.site_faq;
    }
    if (this.knowledge.social_media && Object.keys(this.knowledge.social_media).length === 0) {
      delete this.knowledge.social_media;
    }
  }

  // ── helpers ────────────────────────────────────────────────────────────

  _extractPrice(text) {
    const patterns = [
      /[$£€₹]\s?([\d,]+(?:\.\d{1,2})?)/,
      /([\d,]+(?:\.\d{1,2})?)\s?(?:USD|EUR|GBP|INR)/i,
      /(?:USD|EUR|GBP|INR)\s?([\d,]+(?:\.\d{1,2})?)/i,
      /^([\d]{1,3}(?:[\d,]*)(?:\.\d{1,2})?)$/,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const value = parseFloat(match[1].replace(/,/g, ''));
        const currency = text.match(/[$£€₹]/) ? 'USD' : 'INR';
        return { value, currency };
      }
    }
    return null;
  }

  _parseVariant(text) {
    const sizeMatch = text.match(/\b(\d+(?:\s*x\s*\d+)?(?:\s*in|["']?)|XS|S|M|L|XL|XXL)\b/i);
    const colorMatch = text.match(/\b(red|blue|black|white|gold|silver|green|yellow|pink|purple|navy|teal|grey|gray|brown|tan|ivory|cream|beige|charcoal|blush|dusk)\b/i);
    if (sizeMatch || colorMatch) {
      return {
        option: text,
        size: sizeMatch ? sizeMatch[1] : null,
        color: colorMatch ? colorMatch[1] : null,
      };
    }
    return null;
  }

  _extractKeywords(text) {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3 && !this._isStopword(word))
      .slice(0, 10);
  }

  _isStopword(word) {
    const stopwords = new Set([
      'this', 'that', 'with', 'from', 'have', 'been', 'were', 'more',
      'about', 'just', 'also', 'only', 'than', 'very', 'such', 'like',
    ]);
    return stopwords.has(word);
  }

  _generateId(prefix) {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

function main() {
  const inputFile = process.argv[2] || 'raw_data.json';
  const outputFile = process.argv[3] || 'knowledge_data.json';

  if (!fs.existsSync(inputFile)) {
    console.error(`Input file not found: ${inputFile}`);
    process.exit(1);
  }

  console.log(`\n📖 Data Processor v1.0`);
  console.log(`   Input:  ${inputFile}`);
  console.log(`   Output: ${outputFile}\n`);

  const rawData = JSON.parse(fs.readFileSync(inputFile, 'utf-8'));
  const processor = new DataProcessor(rawData);
  const knowledge = processor.process();

  const outDir = path.dirname(outputFile);
  if (outDir) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  fs.writeFileSync(outputFile, JSON.stringify(knowledge, null, 2));

  console.log(`\n📊 Summary:`);
  console.log(`   Domain: ${knowledge.metadata.domain}`);
  console.log(`   Products: ${knowledge.metadata.product_count}`);
  console.log(`   Policies: ${Object.keys(knowledge.policies).length}`);
  console.log(`   File size: ${(fs.statSync(outputFile).size / 1024).toFixed(2)} KB\n`);
}

main();

export default DataProcessor;
