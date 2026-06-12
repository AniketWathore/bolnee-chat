import { similarityRatio, jaccardSimilarity } from './comparisons.js';
import { preprocess } from './preprocessors.js';
import { ResponseFilter } from './filters.js';

export class ResponseSelector {
  constructor(responsesData) {
    this.responses = responsesData?.responses || {};
    const raw = responsesData?.product_responses || {};
    this.productResponses = {};
    for (const [slug, val] of Object.entries(raw)) {
      this.productResponses[slug.startsWith('products_') ? slug : 'products_' + slug] = val;
    }
    this.filter = new ResponseFilter();
  }

  select(searchResult, memory, originalQuery) {
    const cleaned = preprocess(originalQuery);

    const doc = searchResult.doc;
    const meta = doc.meta;

    const strategies = [
      () => this._strategyBM25(searchResult, memory, cleaned),
      () => this._strategyFuzzy(cleaned),
      () => this._strategyDirectLookup(cleaned),
      () => this._strategyUtility(cleaned),
    ];

    const candidates = strategies.flatMap(s => {
      try { return s(); } catch { return []; }
    });

    const filtered = this.filter.getFiltered(candidates);
    const best = filtered.sort((a, b) => b.confidence - a.confidence)[0];

    if (best) {
      this.filter.addToRecent(best.text);
      const text = this._naturalize(best.text, { intent: best.intent, turnCount: memory.turnCount });

      const entity = {
        type: meta.type,
        slug: meta.slug,
        name: meta.title || meta.slug,
        url: meta.url
      };

      return { text, entity, intent: best.intent, confidence: best.confidence };
    }

    return {
      text: this._naturalize("I'm not sure how to help with that.", { intent: 'GENERAL', turnCount: memory.turnCount }),
      entity: { type: meta.type, slug: meta.slug, name: meta.title || meta.slug },
      intent: 'GENERAL',
      confidence: 0.1
    };
  }

  // ── Strategy 1: BM25 + Intent + Response Lookup ──────────────
  _strategyBM25(searchResult, memory, cleaned) {
    const doc = searchResult.doc;
    const meta = doc.meta;
    const bm25Score = searchResult.score || 0;

    const intent = this._detectIntent(cleaned, meta, doc.text, memory);
    const variationIdx = memory.getVariation(intent, meta.slug);

    let text = this._getResponseText(meta, intent, variationIdx, cleaned, searchResult, memory);
    let confidence = this._computeBM25Confidence(bm25Score, intent, cleaned, meta);

    return [{ text, intent, entity: meta, confidence }];
  }

  _computeBM25Confidence(bm25Score, intent, query, meta) {
    const name = (meta.title || '').toLowerCase();
    const q = query.toLowerCase();
    const nameInQuery = name.split(/\s+/).some(w => w.length > 2 && q.includes(w));
    const specificIntent = intent !== 'GENERAL';

    if (bm25Score >= 0.8 && nameInQuery) return 0.9;
    if (bm25Score >= 0.6 && nameInQuery) return 0.85;
    if (bm25Score >= 0.6 && specificIntent) return 0.78;
    if (bm25Score >= 0.6) return 0.6 + bm25Score * 0.2;
    if (bm25Score >= 0.4 && specificIntent) return 0.55;
    if (specificIntent) return 0.35;
    return 0.15;
  }

  // ── Strategy 2: Fuzzy Product Name Match ─────────────────────
  _strategyFuzzy(cleaned) {
    const q = cleaned.toLowerCase().trim();
    if (!q || q.split(/\s+/).length > 8) return [];

    const products = Object.values(this.productResponses).filter(p => {
      const n = (p.name || '') + ' ' + (p.url || '');
      return !/^\s*$|en-ca|404|not found/i.test(n) && !/home$/i.test(p.name || '');
    });

    const scored = products.map(p => {
      const name = (p.name || '').toLowerCase();
      const jaccard = jaccardSimilarity(q, name);
      const levenshtein = similarityRatio(q, name);
      const avgSim = (jaccard + levenshtein) / 2;
      return { product: p, score: avgSim };
    }).filter(s => s.score > 0.3).sort((a, b) => b.score - a.score);

    if (scored.length === 0) return [];

    const top = scored[0];
    const ties = scored.filter(s => s.score >= top.score * 0.85);

    if (ties.length > 1 && top.score < 0.7) {
      const names = ties.map(t => t.product.name).filter(Boolean);
      if (names.length <= 3) {
        return [{
          text: `I found a few matching that: ${names.join(', ')}. Which one are you interested in?`,
          intent: 'PRODUCT_SEARCH',
          entity: null,
          confidence: 0.7
        }];
      }
      return [{
        text: `We've got several similar: ${names.slice(0, 4).join(', ')}${names.length > 4 ? `, and ${names.length - 4} more` : ''}. Which one?`,
        intent: 'PRODUCT_SEARCH',
        entity: null,
        confidence: 0.65
      }];
    }

    const p = top.product;
    const about = p.about_responses?.[0] || '';
    const price = p.price_range ? ` (${p.price_range})` : '';
    const conf = Math.min(0.95, 0.4 + top.score * 0.6);

    const text = `That's the ${p.name}${price}. ${about}`;
    return [{ text, intent: 'PRODUCT_SEARCH', entity: null, confidence: conf }];
  }

  // ── Strategy 3: Direct Intent Detection + Response ───────────
  _strategyDirectLookup(cleaned) {
    const intent = this._detectIntent(cleaned, {}, '', null);
    if (intent === 'GENERAL') return [];

    const pool = this.responses[intent];
    if (!pool?.length) return [];

    const text = pool[0];
    const confidence = intent === 'GREETING' || intent === 'THANKS' ? 0.5 : 0.45;
    return [{ text, intent, entity: null, confidence }];
  }

  // ── Strategy 4: Utility Adapters ─────────────────────────────
  _strategyUtility(cleaned) {
    const q = cleaned.toLowerCase().trim();

    const mathResult = this._tryMath(q);
    if (mathResult) return [mathResult];

    const timeResult = this._tryTime(q);
    if (timeResult) return [timeResult];

    const unitResult = this._tryUnitConversion(q);
    if (unitResult) return [unitResult];

    return [];
  }

  _tryMath(q) {
    const mathPattern = /(\d+)\s*([+\-*/])\s*(\d+)/;
    const match = q.match(mathPattern);
    if (!match) return null;

    const a = parseFloat(match[1]), op = match[2], b = parseFloat(match[3]);
    let result;
    switch (op) {
      case '+': result = a + b; break;
      case '-': result = a - b; break;
      case '*': result = a * b; break;
      case '/': result = b !== 0 ? a / b : 'undefined (division by zero)'; break;
    }
    return {
      text: `${a} ${op} ${b} = ${result}`,
      intent: 'GENERAL',
      entity: null,
      confidence: 0.95
    };
  }

  _tryTime(q) {
    if (/\b(time|clock|current time|what time)\b/i.test(q)) {
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return {
        text: `It's ${timeStr}.`,
        intent: 'GENERAL',
        entity: null,
        confidence: 0.9
      };
    }
    if (/\b(date|today|what day|what.*date)\b/i.test(q)) {
      const now = new Date();
      const dateStr = now.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      return {
        text: `Today is ${dateStr}.`,
        intent: 'GENERAL',
        entity: null,
        confidence: 0.9
      };
    }
    return null;
  }

  _tryUnitConversion(q) {
    const unitPatterns = [
      { regex: /(\d+)\s*(inches?|in)\s*(to|in)\s*(cm|centimeters?)/i, factor: 2.54, from: 'inches', to: 'cm' },
      { regex: /(\d+)\s*(cm|centimeters?)\s*(to|in)\s*(inches?|in)/i, factor: 0.3937, from: 'cm', to: 'inches' },
      { regex: /(\d+)\s*(feet|ft)\s*(to|in)\s*(meters?|m)/i, factor: 0.3048, from: 'feet', to: 'meters' },
      { regex: /(\d+)\s*(pounds?|lbs?)\s*(to|in)\s*(kg|kilograms?)/i, factor: 0.4536, from: 'pounds', to: 'kg' },
      { regex: /(\d+)\s*(kg|kilograms?)\s*(to|in)\s*(pounds?|lbs?)/i, factor: 2.205, from: 'kg', to: 'pounds' },
    ];

    for (const p of unitPatterns) {
      const m = q.match(p.regex);
      if (m) {
        const val = parseFloat(m[1]);
        const result = (val * p.factor).toFixed(2);
        return {
          text: `${val} ${p.from} = ${result} ${p.to}`,
          intent: 'GENERAL',
          entity: null,
          confidence: 0.92
        };
      }
    }
    return null;
  }

  // ── Intent Detection ─────────────────────────────────────────
  _detectIntent(query, meta, docText, memory) {
    const q = query.toLowerCase();

    if (/\bprice\b|\bcost\b|\bhow much\b|\bexpensive\b|\bcheap\b|\bbudget\b|\$\d/.test(q)) return 'PRICE';

    if (/\breturn|\brefund|\bexchange|\bcancel|\bpolic/.test(q)) return 'RETURN_POLICY';

    if (/\bship|\bdeliver|\bshipping|\bdelivery\b/.test(q)) return 'SHIPPING';

    if (/\bwarranty|\bguarantee|\bdefect\b/.test(q)) return 'WARRANTY';

    if (/\bhours|\bopen|\bclose|\btiming|\bwhen.*open\b/.test(q)) return 'HOURS';

    if (/\bcontact|\bemail|\bphone|\baddress|\breach\b/.test(q)) return 'CONTACT';

    if (/\b(tell me|learn|know)\s+(more\s+)?about\b|\babout (the )?(company|story|you|us|brand|madsen)\b|\bwho are you\b|\bwho makes\b|\b(your|the|company.s)\s+story\b/.test(q)) return 'ABOUT';

    if (/\bshow|\bshoe|\blist|\bgive|\bproducts|\bwhat.*(have|do you|sell|offer)|available|\bcategori|\bunder\b.*\bdollar|\blower\b/.test(q)) return 'PRODUCT_SEARCH';

    if (/\bbike|\bbicycle|\bcargo|\belectric|\baccessor|\bseat|\bbell|\blight|\bgrip|\block|\brack|\bthrottle|\bparts?\b/.test(q)) return 'PRODUCT_SEARCH';

    if (meta?.type === 'contact') return 'CONTACT';
    if (meta?.type === 'location' || meta?.type === 'locations') return 'CONTACT';
    if (meta?.response_type === 'price' && meta?.price) return 'PRICE';

    if (memory?.lastIntent) {
      const followUp = q.trim();
      const followUpWords = followUp.split(/\s+/);
      const singleWords = /^(any|more|other|another|else|others|yes|ok|okay|sure|yeah)$/i;
      const multiWords = /^(show more|give more|list more|any other)$/i;
      if (followUpWords.length <= 2 && (singleWords.test(followUp) || multiWords.test(followUp))) {
        return memory.lastIntent;
      }
    }

    return 'GENERAL';
  }

  // ── Response Text Lookup ─────────────────────────────────────
  _getResponseText(meta, intent, variationIdx, originalQuery, searchResult, memory) {
    if (meta?.type === 'contact' && meta.data) return this._formatContact(meta.data);
    if (meta?.type === 'location' && meta.data) return this._formatLocation(meta.data);
    if (meta?.type === 'locations') return `We've got ${meta.count} locations around town. Which city are you in so I can point you to the nearest one?`;

    if (intent === 'PRODUCT_SEARCH') return this._buildProductSearchResponse(meta, variationIdx, originalQuery, searchResult, memory);
    if (intent === 'BUDGET_FILTER') return this._buildBudgetResponse(meta, variationIdx, originalQuery);
    if (intent === 'PRICE') return this._buildPriceResponse(meta, variationIdx, originalQuery);
    if (intent === 'STOCK') return this._buildStockResponse(meta, variationIdx, originalQuery);
    if (intent === 'ABOUT') return this._buildAboutResponse(meta, variationIdx, originalQuery);

    if (this.responses[intent]?.length) {
      return this.responses[intent][variationIdx % this.responses[intent].length];
    }

    return this._constructFallbackResponse(meta, intent, variationIdx);
  }

  // ── Product Search Response ──────────────────────────────────
  _buildProductSearchResponse(meta, variationIdx, query, searchResult, memory) {
    const allProducts = Object.values(this.productResponses).filter(p => {
      const n = (p.name || '') + ' ' + (p.url || '');
      return !/^\s*$|en-ca|404|not found/i.test(n) && !/home$/i.test(p.name || '');
    });
    if (allProducts.length === 0) {
      return this.responses['PRODUCT_SEARCH']?.[variationIdx % this.responses['PRODUCT_SEARCH'].length] || 'Check out our store for our full range of products.';
    }

    const budget = this._extractBudget(query);
    const mentionsBikes = this._queryMentionsBikes(query);
    const mentionsAccessories = /\b(replacement|grip|seat|bell|light|lock|rack|throttle|charger|crate|bottle|key|kickstand|seatbelt)\b/i.test(query) || /\b(accessor|part)\b/i.test(query) || /\baccessor/i.test(query);

    // Determine category interest from query
    let categoryProducts;
    if (mentionsBikes && !mentionsAccessories) {
      categoryProducts = allProducts.filter(p => this._isBikeProduct(p));
    } else if (mentionsAccessories && !mentionsBikes) {
      categoryProducts = allProducts.filter(p => !this._isBikeProduct(p));
    } else {
      categoryProducts = allProducts;
    }

    // Apply budget filter if present
    if (budget !== null) {
      const withinBudget = categoryProducts.filter(p => {
        const pPrice = this._parsePrice(p.price_range);
        return pPrice !== null && pPrice <= budget;
      });
      if (withinBudget.length === 0) {
        const cheapest = [...categoryProducts]
          .filter(p => this._parsePrice(p.price_range) !== null)
          .sort((a, b) => this._parsePrice(a.price_range) - this._parsePrice(b.price_range));
        if (cheapest.length > 0) {
          const cat = mentionsBikes && !mentionsAccessories ? 'bike' : 'product';
          const cheapestPrice = this._parsePrice(cheapest[0].price_range);
          return `Our most affordable ${cat} is the ${cheapest[0].name} at ${cheapest[0].price_range}, which is above your $${budget} budget. Would you like to see other options?`;
        }
        return `I couldn't find any ${mentionsBikes ? 'bikes' : 'products'} under $${budget}. Our prices start higher than that.`;
      }
      // Show budget-filtered results
      const names = withinBudget.slice(0, 6).map(p => `${p.name} (${p.price_range})`);
      return `Under $${budget}, we've got: ${names.slice(0, 4).join(', ')}${names.length > 4 ? ', and more' : ''}. Let me know if any catch your eye!`;
    }

    const candidates = searchResult?.candidates || [];
    // Strip stopwords before matching product names
    const stopwords = new Set(['show','list','tell','give','want','need','what','which','the','for','and','you','your','how','much','is','are','do','have','any','all','some','get','me','can','with','does','from','price','cost','cheap','bike','bikes','electric','about','product','products','options']);
    const queryWords = this._cleanQueryWords(query).filter(w => !stopwords.has(w));

    // Word-level matching: query word must appear as a distinct name word
    const nameWords = w => w.split(/[\s-/]+/).filter(Boolean);
    const namedFromQuery = categoryProducts
      .filter(p => {
        const name = (p.name || '').toLowerCase();
        const nWords = nameWords(name);
        return queryWords.some(w => {
          if (nWords.some(nw => nw === w)) return true;
          if (w.endsWith('es') && nWords.some(nw => nw === w.slice(0, -2))) return true;
          if (w.endsWith('s') && nWords.some(nw => nw === w.slice(0, -1))) return true;
          return false;
        });
      })
      .slice(0, 8);

    if (namedFromQuery.length > 0) {
      const names = namedFromQuery.map(p => p.name).filter(Boolean);
      if (names.length === 1) {
        const p = namedFromQuery[0];
        const about = p.about_responses?.[0] || '';
        const price = p.price_range ? ` (${p.price_range})` : '';
        return `That's the ${p.name}${price}. ${about}`;
      }
      if (names.length <= 3) {
        return `I found a few options: ${names.join(', ')}. Which one are you looking for?`;
      }
      return `We've got several matching that: ${names.slice(0, 5).join(', ')}${names.length > 5 ? `, and ${names.length - 5} more` : ''}. Which one looks right?`;
    }

    // If query explicitly asks for bikes, show bike models
    if (mentionsBikes && !mentionsAccessories) {
      const bikeModels = allProducts.filter(p => this._isBikeProduct(p));
      if (bikeModels.length > 0) {
        const names = bikeModels.map(p => p.name);
        return `We carry these electric cargo bike models: ${names.slice(0, 4).join(', ')}${names.length > 4 ? ', and more' : ''}. Which one interests you?`;
      }
    }

    const matchedFromCandidates = candidates
      .map(c => c.doc?.meta?.title)
      .filter(Boolean)
      .filter(t => !/^\s*$|en-ca|404|not found/i.test(t) && !/home$/i.test(t))
      .slice(0, 8);

    if (matchedFromCandidates.length > 0) {
      if (matchedFromCandidates.length <= 3) {
        return `Here's what I found: ${matchedFromCandidates.join(', ')}. Want more info on any of these?`;
      }
      return `I found several items: ${matchedFromCandidates.slice(0, 5).join(', ')}${matchedFromCandidates.length > 5 ? `, and ${matchedFromCandidates.length - 5} more` : ''}. Let me know which one you're interested in!`;
    }

    const someProducts = categoryProducts.slice(0, 6);
    const names = someProducts.map(p => p.name).filter(Boolean);
    return `We carry ${names.slice(0, 4).join(', ')}${names.length > 4 ? ', and more' : ''}. What kind of product are you after?`;
  }

  // ── Price Response ──────────────────────────────────────────
  _buildPriceResponse(meta, variationIdx, query) {
    // Prefer BM25 matched product if it has price info
    const bm25Slug = meta?.slug ? (meta.slug.startsWith('products_') ? meta.slug : 'products_' + meta.slug) : null;
    const bm25Product = bm25Slug ? (this.productResponses[bm25Slug] || null) : null;
    if (bm25Product?.price_range) {
      if (bm25Product.price_responses?.length) return bm25Product.price_responses[variationIdx % bm25Product.price_responses.length];
      return `The ${bm25Product.name} is priced at ${bm25Product.price_range}.`;
    }
    if (meta?.price) return `The ${meta.title} is ${meta.price}.`;

    const match = this._findProductFromQuery(query, bm25Slug);
    if (match && typeof match === 'object' && match.ambiguous) {
      // If only a few matches, list them; if many, show generic price range
      if (match.matches.length <= 3) {
        return `I found a few: ${match.matches.map(m => m.name).join(', ')}. Which one interests you?`;
      }
      return `Our prices range from around $14 to $5,975 depending on the model. Which specific product are you looking for?`;
    }
    if (match && typeof match === 'string') {
      const p = this.productResponses[match];
      if (p?.price_responses?.length) return p.price_responses[variationIdx % p.price_responses.length];
      if (p?.price_range) return `The ${p.name} is priced at ${p.price_range}.`;
    }

    const allPrices = Object.values(this.productResponses).filter(p => p.price_range);
    if (allPrices.length > 0) {
      return `Our prices range from around $14 to $5,975. Which product are you interested in?`;
    }
    return this.responses['PRICE']?.[variationIdx % this.responses['PRICE'].length] || 'Most of our products are competitively priced.';
  }

  // ── Stock Response ──────────────────────────────────────────
  _buildStockResponse(meta, variationIdx, query) {
    const match = this._findProductFromQuery(query);
    if (match && typeof match === 'object' && match.ambiguous) {
      return `I see a few: ${match.matches.map(m => m.name).join(', ')}. Which one did you mean?`;
    }
    if (match && typeof match === 'string' && this.productResponses[match]?.stock_responses?.length) {
      return this.productResponses[match].stock_responses[variationIdx % this.productResponses[match].stock_responses.length];
    }
    if (meta?.slug && this.productResponses[meta.slug]?.stock_responses?.length) {
      return this.productResponses[meta.slug].stock_responses[variationIdx % this.productResponses[meta.slug].stock_responses.length];
    }
    return this.responses['STOCK']?.[variationIdx % this.responses['STOCK'].length] || 'We generally keep most items in stock. Want me to check something specific?';
  }

  // ── About Response ──────────────────────────────────────────
  _buildAboutResponse(meta, variationIdx, query) {
    const match = this._findProductFromQuery(query);
    if (match && typeof match === 'object' && match.ambiguous) {
      return `Which one? ${match.matches.map(m => m.name).join(', ')}?`;
    }
    if (match && typeof match === 'string' && this.productResponses[match]?.about_responses?.length) {
      return this.productResponses[match].about_responses[variationIdx % this.productResponses[match].about_responses.length];
    }
    if (meta?.slug && this.productResponses[meta.slug]?.about_responses?.length) {
      return this.productResponses[meta.slug].about_responses[variationIdx % this.productResponses[meta.slug].about_responses.length];
    }
    if (this.responses['ABOUT']?.length) return this.responses['ABOUT'][variationIdx % this.responses['ABOUT'].length];
    return `The ${meta.title} is one of our popular items. Want more specifics on it?`;
  }

  // ── Budget Response ─────────────────────────────────────────
  _buildBudgetResponse(meta, variationIdx, query) {
    const match = query.match(/\$?(\d+)/);
    const budget = match ? parseInt(match[1]) : null;

    const filtered = Object.values(this.productResponses).filter(p => {
      if (!budget || !p.price_range) return false;
      const nums = p.price_range.replace(/[$,]/g, '').match(/\d+/g);
      if (!nums) return false;
      return parseInt(nums[0]) <= budget;
    });

    if (filtered.length === 0) {
      const cheapest = Object.values(this.productResponses)
        .filter(p => p.price_range)
        .sort((a, b) => {
          const aN = parseInt(a.price_range.replace(/[$,]/g, '').match(/\d+/g)?.[0] || '999999');
          const bN = parseInt(b.price_range.replace(/[$,]/g, '').match(/\d+/g)?.[0] || '999999');
          return aN - bN;
        });
      if (cheapest.length > 0) {
        return `Our most affordable option is the ${cheapest[0].name} at ${cheapest[0].price_range}. We also have other great options starting from there.`;
      }
    }

    if (filtered.length > 0) {
      const names = filtered.slice(0, 5).map(p => `${p.name} (${p.price_range})`);
      if (names.length <= 3) return `Under ${budget ? '$' + budget : 'that price'} we've got: ${names.join(', ')}.`;
      return `Here's what fits under ${budget ? '$' + budget : 'that budget'}: ${names.slice(0, 3).join(', ')}${names.length > 3 ? `, and ${names.length - 3} more` : ''}.`;
    }

    return this.responses['BUDGET_FILTER']?.[variationIdx % this.responses['BUDGET_FILTER'].length] || 'Let me know your budget and I can point you to the right options.';
  }

  // ── Fuzzy Product Lookup ─────────────────────────────────────
  _cleanQueryWords(str) {
    return str.toLowerCase().trim().split(/\s+/)
      .map(w => w.replace(/[^a-z0-9'\-]/g, ''))
      .filter(w => w.length > 2 && w !== "what's" && w !== "it's");
  }

  _findProductFromQuery(query, preferSlug) {
    const q = query.toLowerCase().trim();
    if (!q) return null;

    const entries = Object.entries(this.productResponses);
    if (entries.length === 0) return null;

    // Skip common filler words that don't identify products
    const stopwords = new Set(['price','cost','show','list','tell','give','want','need','what','which','the','for','and','you','your','how','much','about','bike','bikes','electric','parts','accessories','product','products','options','option']);
    const queryWords = this._cleanQueryWords(q).filter(w => !stopwords.has(w));

    if (queryWords.length === 0) return null;

    const nameWords = w => w.split(/[\s-]+/);

    const scored = entries.map(([slug, p]) => {
      const name = (p.name || '').toLowerCase();
      const slugClean = slug.replace(/^products_/, '').toLowerCase();
      const nameWordSet = new Set(nameWords(name));
      let score = 0;

      // Word-level matching: count how many query words appear as whole words in the name
      const nameHits = queryWords.filter(w => nameWordSet.has(w));
      score += nameHits.length * 30;

      // Bonus for matching ALL meaningful query words
      if (nameHits.length === queryWords.length && queryWords.length > 1) score += 50;

      // startsWith bonus (for partial matches like "dk2" in "dk2 luxury")
      queryWords.forEach(w => {
        for (const nw of nameWordSet) {
          if (nw === w) score += 40;
          else if (nw.startsWith(w) || w.startsWith(nw)) score += 15;
        }
      });

      // Slug only counts for exact/prefix slug matches
      const slugWords = nameWords(slugClean);
      queryWords.forEach(w => {
        if (slugWords.some(sw => sw === w)) score += 20;
        else if (slugWords.some(sw => sw.startsWith(w) || w.startsWith(sw))) score += 5;
      });

      return { slug, score, name: p.name };
    });

    const sorted = scored.filter(s => s.score > 0).sort((a, b) => b.score - a.score);

    if (sorted.length === 1) return sorted[0].slug;

    if (sorted.length > 1) {
      const topScore = sorted[0].score;
      const ties = sorted.filter(s => s.score >= topScore * 0.7);
      if (ties.length === 1) return ties[0].slug;

      // If BM25 already matched one of the ties, prefer it
      if (preferSlug && ties.some(t => t.slug === preferSlug)) return preferSlug;

      return { ambiguous: true, matches: ties.map(t => ({ slug: t.slug, name: t.name })) };
    }

    return null;
  }

  // ── Category & Budget Helpers ────────────────────────────────
  _isBikeProduct(p) {
    const n = (p.name || '').toLowerCase();
    return /\belectric dk2\b/i.test(n) || /madsen electric assist/i.test(n);
  }

  _queryMentionsBikes(q) {
    return /\b(bike|bikes|bicycle|bicycles|cargo bike|cargo bikes|electric bike|ebike)\b/i.test(q);
  }

  _extractBudget(q) {
    const m = q.match(/\b(?:under|below|less than|within|upto|up to)\s*\$?\s*(\d+)/i);
    if (m) return parseInt(m[1], 10);
    const m2 = q.match(/\$(\d{3,})\s*(?:budget|max|limit)?/i);
    if (m2) return parseInt(m2[1], 10);
    return null;
  }

  _parsePrice(priceStr) {
    if (!priceStr) return null;
    const nums = priceStr.replace(/[$,]/g, '').match(/\d+/g);
    if (!nums) return null;
    return parseInt(nums[0], 10);
  }

  // ── Fallback ─────────────────────────────────────────────────
  _constructFallbackResponse(meta, intent, variationIdx) {
    if (intent === 'PRICE' && meta?.price) {
      const v = [`The ${meta.title} is ${meta.price}.`];
      return v[variationIdx % v.length];
    }
    return `I found some info on ${meta.title} — ${meta.url || ''}`;
  }

  // ── Formatters ───────────────────────────────────────────────
  _formatContact(contactData) {
    const parts = ['Here\'s how to reach us:'];
    if (contactData.phones?.length) parts.push(`Phone: ${contactData.phones.join(', ')}`);
    if (contactData.emails?.length) parts.push(`Email: ${contactData.emails.join(', ')}`);
    if (contactData.addresses?.length) parts.push(`Address: ${contactData.addresses[0]}`);
    return parts.join('\n');
  }

  _formatLocation(locationData) {
    const parts = [locationData.name];
    if (locationData.address) parts.push(locationData.address);
    const cityState = [locationData.city, locationData.state].filter(Boolean).join(', ');
    if (cityState) parts.push(cityState);
    if (locationData.zip) parts[parts.length - 1] += ` ${locationData.zip}`;
    if (locationData.phone) parts.push(`Phone: ${locationData.phone}`);
    return parts.join('\n');
  }

  // ── Naturalization ───────────────────────────────────────────
  _naturalize(text, { intent, turnCount }) {
    const openings = [
      'Sure thing! ', 'Absolutely! ', 'Great question — ',
      'Happy to help! ', 'Sure, ', 'Of course! ',
      'Let me check — ', 'Good question! '
    ];
    const open = openings[turnCount % openings.length];

    if (intent === 'PRICE' || intent === 'STOCK') return `${open}${text}`;

    if (turnCount > 0 && turnCount % 3 === 0) {
      const followUps = [' Let me know if you want more info!', ' What else can I look up?', ' Want me to check anything else?'];
      return `${open}${text}${followUps[turnCount % followUps.length]}`;
    }

    return `${open}${text}`;
  }

  getOutOfDomainMessage(domain) {
    const brandName = domain?.replace(/\.(com|co|in|net|org).*/, '') || 'us';
    return `I'm here to help with ${brandName} products and services. What can I help you with?`;
  }
}
