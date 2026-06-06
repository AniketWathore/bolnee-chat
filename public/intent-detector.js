/**
 * intent-detector.js
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Client-side intent detection for chatbot
 * Runs entirely in browser, no external API calls
 * 
 * Features:
 * ✅ 14 intent types (product search, price check, policy info, etc.)
 * ✅ Entity extraction (product name, price range, category)
 * ✅ Fuzzy matching for product/category names
 * ✅ Confidence scoring (0-1)
 */

class IntentDetector {
  constructor(knowledgeData) {
    this.knowledge = knowledgeData;
    this.productNames = this._extractProductNames();
    this.categoryNames = this._extractCategoryNames();
    
    // Intent patterns: [keywords] → intent_name
    this.intentPatterns = {
      PRODUCT_SEARCH: {
        keywords: ['show', 'find', 'list', 'display', 'give me', 'get', 'looking for', 'want'],
        requires_entity: false,
      },
      PRODUCT_INFO: {
        keywords: ['tell me', 'about', 'details', 'info', 'information', 'describe', 'what is'],
        requires_entity: true,
      },
      PRICE_CHECK: {
        keywords: ['price', 'cost', 'how much', 'expensive', 'expensive', 'charge'],
        requires_entity: true,
      },
      FILTER_BY_PRICE: {
        keywords: ['under', 'less than', 'below', 'cheaper', 'cheap', 'under $', 'under ₹', 'below ₹'],
        requires_entity: false,
      },
      FILTER_BY_CATEGORY: {
        keywords: ['show me', 'list', 'all', 'category', 'products in', 'items in'],
        requires_entity: true,
      },
      COMPARISON: {
        keywords: ['compare', 'vs', 'versus', 'difference', 'better', 'which is better', 'similar vs'],
        requires_entity: true,
      },
      SIMILAR_PRODUCTS: {
        keywords: ['similar', 'like this', 'same as', 'alternative', 'other', 'other options', 'alternatives'],
        requires_entity: true,
      },
      PRODUCT_VARIANTS: {
        keywords: ['size', 'color', 'option', 'available', 'what sizes', 'what colors', 'variant'],
        requires_entity: true,
      },
      REFUND_POLICY: {
        keywords: ['refund', 'return', 'money back', 'return period', 'refund policy', 'can i return'],
        requires_entity: false,
      },
      SHIPPING_POLICY: {
        keywords: ['shipping', 'delivery', 'how long', 'shipping cost', 'delivery time', 'how much shipping'],
        requires_entity: false,
      },
      TERMS: {
        keywords: ['terms', 'conditions', 'policy', 'agree', 'terms of service', 'tos'],
        requires_entity: false,
      },
      ABOUT_COMPANY: {
        keywords: ['about', 'company', 'story', 'team', 'who are you', 'tell me about'],
        requires_entity: false,
      },
      CONTACT_INFO: {
        keywords: ['contact', 'phone', 'email', 'address', 'how to contact', 'customer service'],
        requires_entity: false,
      },
      STOCK_AVAILABILITY: {
        keywords: ['stock', 'available', 'in stock', 'availability', 'do you have'],
        requires_entity: true,
      },
    };
  }

  /**
   * Main detection function
   * Returns: { intent, entities, confidence, raw_query }
   */
  detect(userQuery) {
    const normalizedQuery = userQuery.toLowerCase().trim();
    
    // Step 1: Find best matching intent
    const intentMatch = this._findBestIntent(normalizedQuery);
    
    // Step 2: Extract entities
    const entities = this._extractEntities(normalizedQuery, intentMatch.intent);
    
    return {
      intent: intentMatch.intent,
      confidence: intentMatch.confidence,
      entities: entities,
      raw_query: userQuery,
    };
  }

  /**
   * Find best matching intent based on keywords
   */
  _findBestIntent(query) {
    let bestIntent = null;
    let bestScore = 0;

    for (const [intent, config] of Object.entries(this.intentPatterns)) {
      let score = 0;

      // Check for keyword matches
      for (const keyword of config.keywords) {
        if (query.includes(keyword)) {
          score += 1;
        }
      }

      // Normalize score
      const normalizedScore = score > 0 ? Math.min(score / config.keywords.length, 1.0) : 0;

      if (normalizedScore > bestScore) {
        bestScore = normalizedScore;
        bestIntent = intent;
      }
    }

    // Default to PRODUCT_SEARCH if no intent found
    if (!bestIntent) {
      bestIntent = 'PRODUCT_SEARCH';
      bestScore = 0.3;
    }

    return {
      intent: bestIntent,
      confidence: bestScore,
    };
  }

  /**
   * Extract entities from query
   */
  _extractEntities(query, intent) {
    const entities = {};

    // Extract product name (fuzzy match)
    const product = this._findProductInQuery(query);
    if (product) {
      entities.product = product.name;
      entities.product_id = product.id;
    }

    // Extract category (fuzzy match)
    const category = this._findCategoryInQuery(query);
    if (category) {
      entities.category = category.name;
      entities.category_id = category.id;
    }

    // Extract price range
    const priceRange = this._extractPriceRange(query);
    if (priceRange) {
      entities.min_price = priceRange.min;
      entities.max_price = priceRange.max;
    }

    // Extract comparison products
    if (intent === 'COMPARISON') {
      const products = this._findAllProductsInQuery(query);
      if (products.length >= 2) {
        entities.product1 = products[0].name;
        entities.product1_id = products[0].id;
        entities.product2 = products[1].name;
        entities.product2_id = products[1].id;
      }
    }

    return entities;
  }

  /**
   * Fuzzy match a single product name in query
   */
  _findProductInQuery(query) {
    let bestMatch = null;
    let bestScore = 0;

    for (const product of this.knowledge.products || []) {
      const score = this._fuzzyMatch(query, product.name);
      if (score > bestScore && score > 0.6) {
        bestScore = score;
        bestMatch = product;
      }
    }

    return bestMatch;
  }

  /**
   * Find all product mentions in query (for comparisons)
   */
  _findAllProductsInQuery(query) {
    const matches = [];
    const threshold = 0.55;

    for (const product of this.knowledge.products || []) {
      const score = this._fuzzyMatch(query, product.name);
      if (score > threshold) {
        matches.push({
          name: product.name,
          id: product.id,
          score: score,
        });
      }
    }

    return matches.sort((a, b) => b.score - a.score);
  }

  /**
   * Fuzzy match a category in query
   */
  _findCategoryInQuery(query) {
    let bestMatch = null;
    let bestScore = 0;

    for (const [catName, category] of Object.entries(this.knowledge.categories || {})) {
      const score = this._fuzzyMatch(query, catName);
      if (score > bestScore && score > 0.6) {
        bestScore = score;
        bestMatch = category;
      }
    }

    return bestMatch;
  }

  /**
   * Fuzzy string matching (Levenshtein distance)
   * Returns 0-1 similarity score
   */
  _fuzzyMatch(str1, str2) {
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();

    // Exact substring match (highest priority)
    if (s1.includes(s2) || s2.includes(s1)) {
      return 1.0;
    }

    // Levenshtein distance
    const distance = this._levenshteinDistance(s1, s2);
    const maxLen = Math.max(s1.length, s2.length);
    const similarity = 1 - distance / maxLen;

    return Math.max(similarity, 0);
  }

  /**
   * Levenshtein distance algorithm
   */
  _levenshteinDistance(str1, str2) {
    const matrix = Array(str2.length + 1)
      .fill(null)
      .map(() => Array(str1.length + 1).fill(0));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator,
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Extract price range from query
   * Returns: { min: X, max: Y } or { max: X }
   */
  _extractPriceRange(query) {
    const pricePatterns = [
      /under\s*[$₹]\s*([\d,]+(?:\.\d{1,2})?)/i,
      /less than\s*[$₹]\s*([\d,]+(?:\.\d{1,2})?)/i,
      /below\s*[$₹]\s*([\d,]+(?:\.\d{1,2})?)/i,
      /between\s*[$₹]\s*([\d,]+(?:\.\d{1,2})?)\s*(?:and|to)\s*[$₹]\s*([\d,]+(?:\.\d{1,2})?)/i,
      /[$₹]\s*([\d,]+(?:\.\d{1,2})?)/i,
    ];

    for (const pattern of pricePatterns) {
      const match = query.match(pattern);
      if (match) {
        if (match[2]) {
          // Range found
          return {
            min: parseFloat(match[1].replace(/,/g, '')),
            max: parseFloat(match[2].replace(/,/g, '')),
          };
        } else {
          // Max price found
          return {
            max: parseFloat(match[1].replace(/,/g, '')),
          };
        }
      }
    }

    return null;
  }

  /**
   * Extract product names from knowledge base
   */
  _extractProductNames() {
    return (this.knowledge.products || []).map(p => ({
      name: p.name,
      id: p.id,
    }));
  }

  /**
   * Extract category names from knowledge base
   */
  _extractCategoryNames() {
    return Object.entries(this.knowledge.categories || {}).map(([name, cat]) => ({
      name: name,
      id: cat.id,
    }));
  }

  /**
   * Get all available intents (for debugging/UI)
   */
  getAvailableIntents() {
    return Object.keys(this.intentPatterns);
  }

  /**
   * Get intent description (for fallback messages)
   */
  getIntentDescription(intent) {
    const descriptions = {
      PRODUCT_SEARCH: 'Search for products',
      PRODUCT_INFO: 'Get information about a product',
      PRICE_CHECK: 'Check the price of a product',
      FILTER_BY_PRICE: 'Find products by price range',
      FILTER_BY_CATEGORY: 'Browse products by category',
      COMPARISON: 'Compare two products',
      SIMILAR_PRODUCTS: 'Find similar products',
      PRODUCT_VARIANTS: 'Check available sizes/colors',
      REFUND_POLICY: 'Learn about refund policy',
      SHIPPING_POLICY: 'Check shipping information',
      TERMS: 'Read terms and conditions',
      ABOUT_COMPANY: 'Learn about the company',
      CONTACT_INFO: 'Get contact information',
      STOCK_AVAILABILITY: 'Check product availability',
    };
    return descriptions[intent] || 'General query';
  }
}

// Export for use in browser and Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = IntentDetector;
}
