/**
 * response-generator.js
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Client-side response generation
 * Takes extracted data and formats it into user-friendly chat messages
 * 
 * Features:
 * ✅ Template-based responses
 * ✅ Rich formatting (prices, links, lists)
 * ✅ Fallback handling
 * ✅ Suggestion generation
 */

class ResponseGenerator {
  constructor(intentResult, extractionResult) {
    this.intent = intentResult.intent;
    this.entities = intentResult.entities;
    this.data = extractionResult.data;
    this.success = extractionResult.success;
    this.count = extractionResult.count;
  }

  /**
   * Main generation function
   * Returns: { text: string, suggestions: array, metadata: object }
   */
  generate() {
    if (!this.success) {
      return this._generateErrorResponse();
    }

    switch (this.intent) {
      case 'PRODUCT_SEARCH':
        return this._generateProductSearchResponse();
      case 'PRODUCT_INFO':
        return this._generateProductInfoResponse();
      case 'PRICE_CHECK':
        return this._generatePriceCheckResponse();
      case 'FILTER_BY_PRICE':
        return this._generateFilterByPriceResponse();
      case 'FILTER_BY_CATEGORY':
        return this._generateFilterByCategoryResponse();
      case 'COMPARISON':
        return this._generateComparisonResponse();
      case 'SIMILAR_PRODUCTS':
        return this._generateSimilarProductsResponse();
      case 'PRODUCT_VARIANTS':
        return this._generateVariantsResponse();
      case 'REFUND_POLICY':
        return this._generatePolicyResponse('refund');
      case 'SHIPPING_POLICY':
        return this._generatePolicyResponse('shipping');
      case 'TERMS':
        return this._generatePolicyResponse('terms');
      case 'ABOUT_COMPANY':
        return this._generateAboutResponse();
      case 'CONTACT_INFO':
        return this._generateContactResponse();
      case 'STOCK_AVAILABILITY':
        return this._generateStockResponse();
      default:
        return this._generateDefaultResponse();
    }
  }

  /**
   * PRODUCT_SEARCH response
   */
  _generateProductSearchResponse() {
    if (!this.data || this.data.length === 0) {
      return {
        text: 'Sorry, no products found. Would you like to browse by category or price?',
        suggestions: ['Show all products', 'Browse categories', 'Under $50'],
        metadata: { type: 'product_search', products: [] },
      };
    }

    const productList = this.data.slice(0, 5)
      .map((p, i) => `${i + 1}. **${p.name}** - $${p.price}`)
      .join('\n');

    const text = `Found ${this.count} product(s):\n\n${productList}\n\nWould you like more details about any product?`;

    return {
      text,
      suggestions: this.data.slice(0, 3).map(p => `Tell me about ${p.name}`),
      metadata: { type: 'product_search', products: this.data.slice(0, 10) },
    };
  }

  /**
   * PRODUCT_INFO response
   */
  _generateProductInfoResponse() {
    if (!this.data) {
      return {
        text: 'Product not found.',
        suggestions: ['Search for products', 'Show all products'],
        metadata: { type: 'product_info' },
      };
    }

    const p = this.data;
    const variantInfo = p.variants && p.variants.length > 0 
      ? `\n**Available variants:** ${p.variants.map(v => v.option).join(', ')}`
      : '';

    const text = `
**${p.name}**

💰 Price: $${p.price}
📝 ${p.description}${variantInfo}

Would you like to know about similar products or check the price?`;

    return {
      text: text.trim(),
      suggestions: [
        'What are similar products?',
        `Compare with another product`,
        'Check refund policy',
      ],
      metadata: { type: 'product_info', product: p },
    };
  }

  /**
   * PRICE_CHECK response
   */
  _generatePriceCheckResponse() {
    const p = this.data;
    
    let variantPrices = '';
    if (p.variants && p.variants.length > 0) {
      variantPrices = '\n**Other variants:**\n' + 
        p.variants.slice(0, 5)
          .map(v => `- ${v.option}: $${v.price || p.price}`)
          .join('\n');
    }

    const text = `
**${p.product_name}**
Base Price: **$${p.price}**${variantPrices}

Need anything else? I can show you similar products or find items under a specific price.`;

    return {
      text: text.trim(),
      suggestions: [
        'Show similar products',
        'Find items under $50',
        'Tell me more',
      ],
      metadata: { type: 'price_check', product: p },
    };
  }

  /**
   * FILTER_BY_PRICE response
   */
  _generateFilterByPriceResponse() {
    const min = this.entities.min_price || 0;
    const max = this.entities.max_price || '∞';

    if (!this.data || this.data.length === 0) {
      return {
        text: `Sorry, no products found between $${min} and $${max}. Try adjusting the price range.`,
        suggestions: ['Under $100', 'Under $50', 'Show all products'],
        metadata: { type: 'filter_by_price', products: [] },
      };
    }

    const productList = this.data.slice(0, 5)
      .map((p, i) => `${i + 1}. **${p.name}** - $${p.price}`)
      .join('\n');

    const text = `Found ${this.count} product(s) in your price range ($${min} - $${max}):\n\n${productList}`;

    return {
      text,
      suggestions: this.data.slice(0, 3).map(p => `Details about ${p.name}`),
      metadata: { type: 'filter_by_price', products: this.data.slice(0, 10) },
    };
  }

  /**
   * FILTER_BY_CATEGORY response
   */
  _generateFilterByCategoryResponse() {
    const { category, products } = this.data;

    if (!products || products.length === 0) {
      return {
        text: `No products in **${category.name}** category.`,
        suggestions: ['Browse all categories', 'Search products'],
        metadata: { type: 'filter_by_category', category },
      };
    }

    const productList = products.slice(0, 5)
      .map((p, i) => `${i + 1}. **${p.name}** - $${p.price}`)
      .join('\n');

    const text = `**${category.name}** (${this.count} product${this.count !== 1 ? 's' : ''}):\n\n${productList}\n\nWould you like more details?`;

    return {
      text,
      suggestions: products.slice(0, 3).map(p => `Tell me about ${p.name}`),
      metadata: { type: 'filter_by_category', category, products: products.slice(0, 10) },
    };
  }

  /**
   * COMPARISON response
   */
  _generateComparisonResponse() {
    const comp = this.data;

    const text = `
**${comp.product1.name}** vs **${comp.product2.name}**

💰 Prices:
- ${comp.product1.name}: **$${comp.product1.price}**
- ${comp.product2.name}: **$${comp.product2.price}**
- Difference: **$${comp.price_difference}**

🏆 Cheaper: **${comp.cheaper_product}**

${comp.product1.description ? `\n📝 ${comp.product1.name}: ${comp.product1.description.substring(0, 100)}...` : ''}
${comp.product2.description ? `\n${comp.product2.name}: ${comp.product2.description.substring(0, 100)}...` : ''}`;

    return {
      text: text.trim(),
      suggestions: [
        `More about ${comp.product1.name}`,
        `More about ${comp.product2.name}`,
        'Find similar products',
      ],
      metadata: { type: 'comparison', comparison: comp },
    };
  }

  /**
   * SIMILAR_PRODUCTS response
   */
  _generateSimilarProductsResponse() {
    if (!this.data || this.data.length === 0) {
      return {
        text: 'No similar products found.',
        suggestions: ['Browse all products', 'Search by category'],
        metadata: { type: 'similar_products', products: [] },
      };
    }

    const productList = this.data.slice(0, 5)
      .map((p, i) => `${i + 1}. **${p.name}** - $${p.price}`)
      .join('\n');

    const text = `Found ${this.count} similar product(s):\n\n${productList}`;

    return {
      text,
      suggestions: this.data.slice(0, 3).map(p => `Compare with ${p.name}`),
      metadata: { type: 'similar_products', products: this.data.slice(0, 10) },
    };
  }

  /**
   * PRODUCT_VARIANTS response
   */
  _generateVariantsResponse() {
    const { product_name, variants } = this.data;

    if (!variants || variants.length === 0) {
      return {
        text: `**${product_name}** only comes in one variant.`,
        suggestions: ['Price check', 'Product details'],
        metadata: { type: 'variants', variants: [] },
      };
    }

    const variantList = variants
      .map(v => `- ${v.option}${v.price ? ` - $${v.price}` : ''}`)
      .join('\n');

    const text = `**${product_name}** is available in ${variants.length} variant(s):\n\n${variantList}`;

    return {
      text,
      suggestions: ['Check price', 'Product details', 'Similar products'],
      metadata: { type: 'variants', variants },
    };
  }

  /**
   * Policy response (refund, shipping, terms)
   */
  _generatePolicyResponse(type) {
    if (!this.data) {
      return {
        text: `${type.charAt(0).toUpperCase() + type.slice(1)} policy not available.`,
        suggestions: ['Show other policies', 'Contact support'],
        metadata: { type: 'policy' },
      };
    }

    const text = `**${this.data.title}**\n\n${this.data.content.substring(0, 500)}${this.data.content.length > 500 ? '...' : ''}`;

    return {
      text,
      suggestions: ['Refund policy', 'Shipping info', 'Terms of service', 'Contact us'],
      metadata: { type: 'policy', policy_type: type },
    };
  }

  /**
   * ABOUT_COMPANY response
   */
  _generateAboutResponse() {
    if (!this.data || !this.data.content) {
      return {
        text: 'Company information not available.',
        suggestions: ['Contact us', 'Browse products'],
        metadata: { type: 'about' },
      };
    }

    const text = this.data.content.substring(0, 600) + (this.data.content.length > 600 ? '...' : '');

    return {
      text: `**About Us**\n\n${text}`,
      suggestions: ['Contact us', 'Browse products', 'Refund policy'],
      metadata: { type: 'about' },
    };
  }

  /**
   * CONTACT_INFO response
   */
  _generateContactResponse() {
    const { email, phone } = this.data;

    let contactText = 'Contact us:\n\n';
    if (email) contactText += `📧 Email: ${email}\n`;
    if (phone) contactText += `📞 Phone: ${phone}\n`;

    if (!email && !phone) {
      contactText = 'Contact information not available. Please check our website for more details.';
    }

    return {
      text: contactText,
      suggestions: ['Browse products', 'Help & support', 'Policies'],
      metadata: { type: 'contact' },
    };
  }

  /**
   * STOCK_AVAILABILITY response
   */
  _generateStockResponse() {
    const { product_name, available } = this.data;

    const text = available
      ? `✅ **${product_name}** is in stock!`
      : `❌ **${product_name}** is currently out of stock.`;

    return {
      text,
      suggestions: [
        available ? 'View product' : 'Show similar products',
        'Browse products',
      ],
      metadata: { type: 'stock', available },
    };
  }

  /**
   * Error response (when data extraction fails)
   */
  _generateErrorResponse() {
    const errorMessage = 'Sorry, I could not process your request. ';

    const suggestions = [
      'Show all products',
      'Browse by category',
      'Check refund policy',
      'Contact us',
    ];

    return {
      text: errorMessage + 'You can ask me about products, prices, policies, or company info.',
      suggestions,
      metadata: { type: 'error' },
    };
  }

  /**
   * Default response
   */
  _generateDefaultResponse() {
    return {
      text: 'I can help you with:\n- Finding products\n- Checking prices\n- Comparing items\n- Policy information\n- Company details\n\nWhat would you like to know?',
      suggestions: [
        'Show all products',
        'Under $50',
        'Refund policy',
        'About us',
      ],
      metadata: { type: 'default' },
    };
  }

  /**
   * Format price with currency
   */
  _formatPrice(price, currency = 'USD') {
    const symbol = currency === 'USD' ? '$' : currency === 'INR' ? '₹' : currency;
    return `${symbol}${price.toFixed(2)}`;
  }

  /**
   * Truncate text to max length
   */
  _truncate(text, maxLength = 150) {
    if (text.length > maxLength) {
      return text.substring(0, maxLength) + '...';
    }
    return text;
  }
}

// Export for use in browser and Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ResponseGenerator;
}
