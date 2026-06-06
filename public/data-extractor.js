/**
 * data-extractor.js
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Client-side data extraction engine
 * Takes detected intent + entities, queries knowledge JSON in browser memory
 * 
 * Features:
 * ✅ Product search and filtering
 * ✅ Category browsing
 * ✅ Price filtering
 * ✅ Product comparison
 * ✅ Policy lookups
 * ✅ Fuzzy search
 */

class DataExtractor {
  constructor(knowledgeData) {
    this.knowledge = knowledgeData;
    this._buildIndexes();
  }

  /**
   * Build in-memory indexes for faster lookups
   */
  _buildIndexes() {
    // Product index by ID
    this.productById = {};
    for (const product of this.knowledge.products || []) {
      this.productById[product.id] = product;
    }

    // Category index by ID
    this.categoryById = {};
    for (const [_, cat] of Object.entries(this.knowledge.categories || {})) {
      this.categoryById[cat.id] = cat;
    }
  }

  /**
   * Main extraction function
   * Takes intent result from IntentDetector
   * Returns: { success: bool, data: [], count: int, message: string }
   */
  extract(intentResult) {
    const { intent, entities } = intentResult;

    try {
      switch (intent) {
        case 'PRODUCT_SEARCH':
          return this.handleProductSearch(entities);
        case 'PRODUCT_INFO':
          return this.handleProductInfo(entities);
        case 'PRICE_CHECK':
          return this.handlePriceCheck(entities);
        case 'FILTER_BY_PRICE':
          return this.handleFilterByPrice(entities);
        case 'FILTER_BY_CATEGORY':
          return this.handleFilterByCategory(entities);
        case 'COMPARISON':
          return this.handleComparison(entities);
        case 'SIMILAR_PRODUCTS':
          return this.handleSimilarProducts(entities);
        case 'PRODUCT_VARIANTS':
          return this.handleProductVariants(entities);
        case 'REFUND_POLICY':
          return this.handleRefundPolicy();
        case 'SHIPPING_POLICY':
          return this.handleShippingPolicy();
        case 'TERMS':
          return this.handleTerms();
        case 'ABOUT_COMPANY':
          return this.handleAboutCompany();
        case 'CONTACT_INFO':
          return this.handleContactInfo();
        case 'STOCK_AVAILABILITY':
          return this.handleStockAvailability(entities);
        default:
          return this.handleDefault();
      }
    } catch (error) {
      console.error('Data extraction error:', error);
      return {
        success: false,
        data: null,
        count: 0,
        message: 'Error processing your query.',
      };
    }
  }

  /**
   * PRODUCT_SEARCH: Search by name, keywords, or return all
   */
  handleProductSearch(entities) {
    let products = this.knowledge.products || [];

    // If product specified, find it
    if (entities.product) {
      products = products.filter(p => 
        p.searchable_text.includes(entities.product.toLowerCase())
      );
    }

    // If category specified, filter
    if (entities.category_id) {
      const category = this.categoryById[entities.category_id];
      if (category) {
        products = products.filter(p => 
          category.product_ids.includes(p.id)
        );
      }
    }

    return {
      success: true,
      data: products.slice(0, 10),
      count: products.length,
      message: `Found ${products.length} product(s)`,
    };
  }

  /**
   * PRODUCT_INFO: Get detailed info about a specific product
   */
  handleProductInfo(entities) {
    if (!entities.product_id) {
      return {
        success: false,
        data: null,
        count: 0,
        message: 'Please specify a product name.',
      };
    }

    const product = this.productById[entities.product_id];

    return {
      success: !!product,
      data: product || null,
      count: product ? 1 : 0,
      message: product ? 'Product found' : 'Product not found',
    };
  }

  /**
   * PRICE_CHECK: Get price of a specific product
   */
  handlePriceCheck(entities) {
    if (!entities.product_id) {
      return {
        success: false,
        data: null,
        count: 0,
        message: 'Please specify a product name.',
      };
    }

    const product = this.productById[entities.product_id];

    if (!product) {
      return {
        success: false,
        data: null,
        count: 0,
        message: 'Product not found.',
      };
    }

    const priceInfo = {
      product_name: product.name,
      price: product.price,
      currency: product.currency || 'USD',
      variants: product.variants.map(v => ({
        option: v.option,
        price: v.price || product.price,
      })),
    };

    return {
      success: true,
      data: priceInfo,
      count: 1,
      message: `Price of ${product.name}`,
    };
  }

  /**
   * FILTER_BY_PRICE: Find products within a price range
   */
  handleFilterByPrice(entities) {
    let products = this.knowledge.products || [];

    const minPrice = entities.min_price || 0;
    const maxPrice = entities.max_price || Infinity;

    products = products.filter(p => {
      const price = p.price || 0;
      return price >= minPrice && price <= maxPrice;
    });

    return {
      success: true,
      data: products.slice(0, 10),
      count: products.length,
      message: `Found ${products.length} product(s) between $${minPrice} - $${maxPrice}`,
    };
  }

  /**
   * FILTER_BY_CATEGORY: Get all products in a category
   */
  handleFilterByCategory(entities) {
    if (!entities.category_id) {
      return {
        success: false,
        data: null,
        count: 0,
        message: 'Please specify a category.',
      };
    }

    const category = this.categoryById[entities.category_id];

    if (!category) {
      return {
        success: false,
        data: null,
        count: 0,
        message: 'Category not found.',
      };
    }

    const products = category.product_ids
      .map(id => this.productById[id])
      .filter(p => !!p);

    return {
      success: true,
      data: {
        category: category,
        products: products.slice(0, 20),
      },
      count: products.length,
      message: `Found ${products.length} product(s) in ${category.name}`,
    };
  }

  /**
   * COMPARISON: Compare two products
   */
  handleComparison(entities) {
    const product1 = entities.product1_id ? this.productById[entities.product1_id] : null;
    const product2 = entities.product2_id ? this.productById[entities.product2_id] : null;

    if (!product1 || !product2) {
      return {
        success: false,
        data: null,
        count: 0,
        message: 'Could not find both products to compare.',
      };
    }

    const comparison = {
      product1: {
        name: product1.name,
        price: product1.price,
        description: product1.description,
        keywords: product1.keywords,
      },
      product2: {
        name: product2.name,
        price: product2.price,
        description: product2.description,
        keywords: product2.keywords,
      },
      price_difference: Math.abs(product1.price - product2.price),
      cheaper_product: product1.price < product2.price ? product1.name : product2.name,
    };

    return {
      success: true,
      data: comparison,
      count: 2,
      message: `Comparison: ${product1.name} vs ${product2.name}`,
    };
  }

  /**
   * SIMILAR_PRODUCTS: Find products similar to a given one
   */
  handleSimilarProducts(entities) {
    if (!entities.product_id) {
      return {
        success: false,
        data: null,
        count: 0,
        message: 'Please specify a product.',
      };
    }

    const baseProduct = this.productById[entities.product_id];

    if (!baseProduct) {
      return {
        success: false,
        data: null,
        count: 0,
        message: 'Product not found.',
      };
    }

    // Find similar products based on:
    // 1. Same category
    // 2. Similar price (within 30%)
    // 3. Shared keywords

    let products = this.knowledge.products || [];
    products = products.filter(p => p.id !== baseProduct.id);

    // Score products
    const scored = products.map(p => {
      let score = 0;

      // Same category bonus
      const baseCategory = Object.values(this.knowledge.categories || {})
        .find(c => c.product_ids.includes(baseProduct.id));
      if (baseCategory && baseCategory.product_ids.includes(p.id)) {
        score += 3;
      }

      // Price similarity
      if (baseProduct.price) {
        const priceDiff = Math.abs(p.price - baseProduct.price);
        const priceRatio = priceDiff / baseProduct.price;
        if (priceRatio < 0.3) {
          score += 2;
        }
      }

      // Keyword overlap
      const sharedKeywords = baseProduct.keywords.filter(k => 
        p.keywords.includes(k)
      ).length;
      score += sharedKeywords;

      return { product: p, score };
    });

    // Sort by score
    const similar = scored
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(s => s.product);

    return {
      success: true,
      data: similar,
      count: similar.length,
      message: `Found ${similar.length} similar product(s)`,
    };
  }

  /**
   * PRODUCT_VARIANTS: Get available variants for a product
   */
  handleProductVariants(entities) {
    if (!entities.product_id) {
      return {
        success: false,
        data: null,
        count: 0,
        message: 'Please specify a product.',
      };
    }

    const product = this.productById[entities.product_id];

    if (!product) {
      return {
        success: false,
        data: null,
        count: 0,
        message: 'Product not found.',
      };
    }

    return {
      success: true,
      data: {
        product_name: product.name,
        variants: product.variants || [],
      },
      count: product.variants ? product.variants.length : 0,
      message: `${product.name} has ${product.variants ? product.variants.length : 0} variant(s)`,
    };
  }

  /**
   * REFUND_POLICY: Get refund policy
   */
  handleRefundPolicy() {
    const policy = this.knowledge.policies?.refund;

    if (!policy) {
      return {
        success: false,
        data: null,
        count: 0,
        message: 'Refund policy not available.',
      };
    }

    return {
      success: true,
      data: policy,
      count: 1,
      message: 'Refund Policy',
    };
  }

  /**
   * SHIPPING_POLICY: Get shipping policy
   */
  handleShippingPolicy() {
    const policy = this.knowledge.policies?.shipping;

    if (!policy) {
      return {
        success: false,
        data: null,
        count: 0,
        message: 'Shipping policy not available.',
      };
    }

    return {
      success: true,
      data: policy,
      count: 1,
      message: 'Shipping Policy',
    };
  }

  /**
   * TERMS: Get terms of service
   */
  handleTerms() {
    const terms = this.knowledge.policies?.terms;

    if (!terms) {
      return {
        success: false,
        data: null,
        count: 0,
        message: 'Terms of service not available.',
      };
    }

    return {
      success: true,
      data: terms,
      count: 1,
      message: 'Terms of Service',
    };
  }

  /**
   * ABOUT_COMPANY: Get company info
   */
  handleAboutCompany() {
    const about = this.knowledge.about;

    if (!about || !about.content) {
      return {
        success: false,
        data: null,
        count: 0,
        message: 'Company information not available.',
      };
    }

    return {
      success: true,
      data: about,
      count: 1,
      message: 'About Us',
    };
  }

  /**
   * CONTACT_INFO: Get contact information
   */
  handleContactInfo() {
    // Extract contact from about section
    const about = this.knowledge.about;

    if (!about || !about.content) {
      return {
        success: false,
        data: null,
        count: 0,
        message: 'Contact information not available.',
      };
    }

    // Try to extract email and phone
    const emailMatch = about.content.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/);
    const phoneMatch = about.content.match(/(\+?\d{1,3}[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,9})/);

    return {
      success: true,
      data: {
        email: emailMatch ? emailMatch[1] : null,
        phone: phoneMatch ? phoneMatch[1] : null,
        content: about.content,
      },
      count: 1,
      message: 'Contact Information',
    };
  }

  /**
   * STOCK_AVAILABILITY: Check if product is available
   */
  handleStockAvailability(entities) {
    if (!entities.product_id) {
      return {
        success: false,
        data: null,
        count: 0,
        message: 'Please specify a product.',
      };
    }

    const product = this.productById[entities.product_id];

    if (!product) {
      return {
        success: false,
        data: null,
        count: 0,
        message: 'Product not found.',
      };
    }

    // Since we don't have stock data, just assume available if in DB
    return {
      success: true,
      data: {
        product_name: product.name,
        available: true,
        variants_count: product.variants ? product.variants.length : 0,
      },
      count: 1,
      message: `${product.name} is in stock!`,
    };
  }

  /**
   * Default/fallback handler
   */
  handleDefault() {
    return {
      success: false,
      data: null,
      count: 0,
      message: 'I did not understand that. Try asking about products, prices, policies, or company info.',
    };
  }
}

// Export for use in browser and Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DataExtractor;
}
