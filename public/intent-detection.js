/**
 * bolnee-intent-detector.js
 * Loads before chatbot-widget.js via a <script> tag.
 * Exposes window.BolneeIntentDetector constructor.
 */
(function () {
  'use strict';

  if (window.BolneeIntentDetector) return;

  // ── Stop words ─────────────────────────────────────────────────────────────
  // IMPORTANT: Never add words here that are also intent triggers.
  // e.g. 'find', 'have', 'open', 'call' must NOT be stop words.
  var STOP = new Set([
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'what', 'which', 'whom', 'why', 'how',
    'me', 'please', 'i', 'we', 'they', 'he', 'she', 'it',
    'would', 'could', 'should', 'will', 'shall',
    'does', 'did', 'has', 'had',
    'this', 'that', 'these', 'those', 'my', 'your', 'his', 'her', 'its',
    'our', 'their', 'all', 'each', 'every', 'both', 'no', 'not',
    'just', 'out', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from',
    'as', 'into', 'during', 'before', 'after', 'above', 'between',
    'and', 'or', 'but', 'if', 'then', 'else', 'so', 'than', 'too',
    'very', 'am', 'here', 'there', 'thing', 'things', 'also', 'only',
    'more', 'much', 'many', 'still', 'even', 'well', 'back',
    'because', 'us', 'them', 'other', 'another'
  ]);

  // ── Intent definitions ─────────────────────────────────────────────────────
  // priority: lower number = checked first
  // needsNumber: BUDGET_FILTER only matches when a number is in the message
  var INTENTS = [
    {
      name: 'BUDGET_FILTER',
      priority: 1,
      needsNumber: true,
      // Multi-word triggers checked against the full cleaned message
      // Single-word triggers checked against token list
      phrases: ['less than', 'up to', 'upto', 'low price', 'low budget', 'price range', 'under rs', 'below rs'],
      words: ['under', 'below', 'budget', 'affordable', 'cheapest', 'cheapest', 'max', 'maximum', 'inexpensive', 'spend', 'within', 'lowest']
    },
    {
      name: 'PRICE',
      priority: 2,
      needsNumber: false,
      phrases: ['how much', 'how much is', 'how much does', 'what is the price', 'what is the cost', 'price of', 'cost of'],
      words: ['price', 'cost', 'rate', 'charge', 'fee', 'pricing', 'prices', 'worth', 'expensive', 'cheap', 'value']
    },
    {
      name: 'STOCK',
      priority: 3,
      needsNumber: false,
      phrases: ['in stock', 'out of stock', 'is it available', 'do you have'],
      words: ['available', 'stock', 'availability', 'inventory', 'buy', 'purchase', 'get', 'order']
    },
    {
      name: 'PRODUCT_SEARCH',
      priority: 4,
      needsNumber: false,
      phrases: ['show me', 'looking for', 'tell me about', 'what do you sell', 'what do you have', 'do you have', 'what shoes', 'what products', 'recommend me', 'suggest me', 'any shoes', 'any products'],
      words: ['show', 'find', 'recommend', 'suggest', 'search', 'browse', 'looking', 'need', 'sell', 'have', 'got', 'shoes', 'products', 'want', 'like', 'give']
    },
    {
      name: 'RETURN_POLICY',
      priority: 5,
      needsNumber: false,
      phrases: ['return policy', 'refund policy', 'money back', 'send back', 'cancel order'],
      words: ['return', 'refund', 'exchange', 'cancellation', 'cancel', 'returning']
    },
    {
      name: 'SHIPPING',
      priority: 6,
      needsNumber: false,
      phrases: ['delivery time', 'shipping time', 'delivery charge', 'shipping charge', 'how long delivery', 'when will it arrive'],
      words: ['shipping', 'delivery', 'ship', 'deliver', 'dispatch', 'courier', 'track', 'shipped', 'delivered']
    },
    {
      name: 'WARRANTY',
      priority: 7,
      needsNumber: false,
      phrases: ['warranty period', 'guarantee period'],
      words: ['warranty', 'guarantee', 'repair', 'broken', 'damaged', 'defect', 'replace', 'replacement', 'defective']
    },
    {
      name: 'CONTACT',
      priority: 8,
      needsNumber: false,
      phrases: ['phone number', 'contact number', 'email address', 'how to contact', 'how to reach', 'get in touch'],
      words: ['contact', 'reach', 'call', 'phone', 'email', 'mail', 'address', 'location', 'support', 'helpline', 'mobile']
    },
    {
      name: 'HOURS',
      priority: 9,
      needsNumber: false,
      phrases: ['business hours', 'opening hours', 'closing time', 'opening time', 'are you open', 'when do you open', 'when do you close'],
      words: ['hours', 'open', 'close', 'timing', 'time', 'today', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    },
    {
      name: 'ABOUT',
      priority: 10,
      needsNumber: false,
      phrases: ['who are you', 'what is this', 'tell me about', 'what do you do', 'what kind of store', 'what kind of shop', 'about your store', 'about this store'],
      words: ['about', 'describe', 'overview']
    },
    {
      name: 'GREETING',
      priority: 11,
      needsNumber: false,
      phrases: ['good morning', 'good evening', 'good afternoon', 'how are you', 'what\'s up', 'whats up'],
      words: ['hi', 'hello', 'hey', 'howdy', 'greetings', 'yo', 'sup']
    },
    {
      name: 'THANKS',
      priority: 12,
      needsNumber: false,
      phrases: ['thank you', 'thanks a lot', 'thank you so much', 'thanks for', 'many thanks'],
      words: ['thank', 'thanks', 'appreciate', 'grateful', 'helpful', 'thx', 'thankyou']
    }
  ];

  // ── Constructor ─────────────────────────────────────────────────────────────
  function BolneeIntentDetector(knowledgeData) {
    this.knowledge = knowledgeData || null;
  }

  // ── Clean + tokenize ────────────────────────────────────────────────────────
  function clean(msg) {
    var s = (msg || '').toLowerCase().trim()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ').trim();
    var nums = (s.match(/\d+/g) || []).map(Number);
    return { s: s, nums: nums, hasNum: nums.length > 0 };
  }

  function tokenize(s) {
    return s.split(' ').filter(function (t) {
      return t.length > 0 && !STOP.has(t);
    });
  }

  // ── Main detect ─────────────────────────────────────────────────────────────
  BolneeIntentDetector.prototype.detect = function (userMessage) {
    var c = clean(userMessage);
    var tokens = tokenize(c.s);

    var result = {
      original: userMessage,
      tokens: tokens,
      intent: 'GENERAL',
      confidence: 0,
      entities: {},
      queryResult: null,
      promptData: null
    };

    if (!userMessage || !userMessage.trim()) return result;

    // ── Score every intent ──────────────────────────────────────────────────
    var candidates = [];

    for (var i = 0; i < INTENTS.length; i++) {
      var def = INTENTS[i];
      var hits = 0;
      var total = def.phrases.length + def.words.length;

      // Check multi-word phrases against full string
      for (var p = 0; p < def.phrases.length; p++) {
        if (c.s.indexOf(def.phrases[p]) > -1) hits++;
      }
      // Check single words against token array
      for (var w = 0; w < def.words.length; w++) {
        if (tokens.indexOf(def.words[w]) > -1) hits++;
      }

      if (hits === 0) continue;

      // BUDGET_FILTER requires a number
      if (def.needsNumber && !c.hasNum) continue;

      // Confidence: proportional to fraction of triggers matched
      // Using 0.2 as denominator scale so even 1 match out of many = reasonable %
      var conf = Math.min(Math.round((hits / Math.max(total * 0.12, 1)) * 100), 100);
      if (conf < 20) conf = 20;  // floor for any real match
      if (def.name === 'BUDGET_FILTER') conf = Math.min(conf + 25, 100); // boost: has number + keyword
      if (def.name === 'PRODUCT_SEARCH') conf = Math.min(conf + 15, 100); // boost for product searches
      if (def.name === 'HOURS' && /monday|tuesday|wednesday|thursday|friday|saturday|sunday/.test(c.s)) {
        conf = Math.min(conf + 20, 100);
      }

      candidates.push({ def: def, conf: conf });
    }

    // Sort by priority (lower = more specific = wins)
    candidates.sort(function (a, b) { return a.def.priority - b.def.priority; });

    if (candidates.length > 0) {
      result.intent = candidates[0].def.name;
      result.confidence = candidates[0].conf;
    } else {
      // FAQ fallback
      var faqHit = this._matchFAQ(tokens);
      if (faqHit) {
        result.intent = 'FAQ';
        result.confidence = faqHit.conf;
        result.entities = { faq: faqHit.faq };
        result.queryResult = { intent: 'FAQ', found: true, data: faqHit.faq };
        return result;
      }
      // If 3+ content tokens remain, treat as PRODUCT_SEARCH
      if (tokens.length >= 3) {
        result.intent = 'PRODUCT_SEARCH';
        result.confidence = 40;  // Raised from 22 to 40 so it passes 25% threshold
      }
    }

    result.entities = this._extractEntities(result.intent, tokens, c);
    result.queryResult = this._query(result.intent, result.entities, tokens);
    return result;
  };

  // ── Entity extraction ───────────────────────────────────────────────────────
  BolneeIntentDetector.prototype._extractEntities = function (intent, tokens, c) {
    var e = { productTokens: [], number: null };

    // For product-related intents, strip intent trigger words to get product tokens
    var def = INTENTS.filter(function (d) { return d.name === intent; })[0];
    if (!def) return e;

    if (['BUDGET_FILTER', 'PRICE', 'STOCK', 'PRODUCT_SEARCH'].indexOf(intent) > -1) {
      var allTriggerWords = def.words.concat(
        def.phrases.reduce(function (acc, ph) {
          return acc.concat(ph.split(' '));
        }, [])
      );
      e.productTokens = tokens.filter(function (t) {
        return allTriggerWords.indexOf(t) === -1 && !/^\d+$/.test(t);
      });
      e.number = c.nums[0] || null;
    }

    if (intent === 'BUDGET_FILTER') {
      e.number = c.nums[0] || null;
    }

    return e;
  };

  // ── Knowledge query ─────────────────────────────────────────────────────────
  BolneeIntentDetector.prototype._query = function (intent, entities, tokens) {
    var k = this.knowledge;
    if (!k) return null;

    var R = { intent: intent, found: false, data: null };

    switch (intent) {

      case 'ABOUT':
        if (k.about) { R.found = true; R.data = { about: k.about }; }
        break;

      case 'RETURN_POLICY':
        if (k.policyReturn) { R.found = true; R.data = { policy: k.policyReturn }; }
        break;
      case 'SHIPPING':
        if (k.policyShipping) { R.found = true; R.data = { policy: k.policyShipping }; }
        break;
      case 'WARRANTY':
        if (k.policyWarranty) { R.found = true; R.data = { policy: k.policyWarranty }; }
        break;

      case 'CONTACT':
        if (k.contact) { R.found = true; R.data = { contact: k.contact }; }
        break;

      case 'HOURS':
        if (k.hours) { R.found = true; R.data = { hours: k.hours }; }
        break;

      case 'FAQ': {
        var faqResult = _matchFAQInKnowledge(k, tokens);
        if (faqResult) {
          R.found = true;
          R.data = faqResult;
        }
        break;
      }

      case 'BUDGET_FILTER': {
        var max = entities.number || 0;
        var pTokens = entities.productTokens || [];
        var prods = k.products || [];
        var filtered = prods.filter(function (p) {
          return !isNaN(parseFloat(p.price)) && parseFloat(p.price) <= max;
        });
        if (filtered.length > 0) {
          R.data = _rankProducts(filtered, pTokens);
          R.found = true;
        }
        R.budget = max;
        break;
      }

      case 'PRICE':
      case 'STOCK':
      case 'PRODUCT_SEARCH': {
        var pTokens2 = entities.productTokens || [];
        var prods2 = k.products || [];
        if (prods2.length > 0) {
          var ranked = _rankProducts(prods2, pTokens2);
          // If tokens given, only return those with a match; else return all
          if (pTokens2.length > 0) {
            var matched = ranked.filter(function (p) { return p._score > 0; });
            R.data = matched.length > 0 ? matched : ranked;
          } else {
            R.data = ranked;
          }
          R.found = true;
        }
        break;
      }
    }

    return R;
  };

  // ── Rank products by token overlap ──────────────────────────────────────────
  function _rankProducts(products, tokens) {
    if (!tokens || tokens.length === 0) return products;
    var scored = products.map(function (p) {
      var haystack = (p.name + ' ' + (p.tags || []).join(' ')).toLowerCase();
      var score = tokens.filter(function (t) { return haystack.indexOf(t) > -1; }).length;
      var clone = Object.assign({}, p);
      clone._score = score;
      return clone;
    });
    scored.sort(function (a, b) { return b._score - a._score; });
    return scored;
  }

  // ── FAQ matching (standalone, used by _query) ───────────────────────────────
  function _matchFAQInKnowledge(k, tokens) {
    var faqs = k && k.faqs;
    if (!faqs || faqs.length === 0 || !tokens || tokens.length === 0) return null;
    var best = null;
    for (var i = 0; i < faqs.length; i++) {
      var faq = faqs[i];
      var hay = ((faq.question || '') + ' ' + (faq.answer || '')).toLowerCase();
      var hToks = hay.split(' ').filter(function (t) { return t && !STOP.has(t); });
      var hits = tokens.filter(function (t) { return hToks.indexOf(t) > -1; }).length;
      var score = hits / Math.max(tokens.length, 1);
      if (score >= 0.2 && (!best || score > best.score)) {
        best = faq;
      }
    }
    return best;
  }

  // ── FAQ matching ────────────────────────────────────────────────────────────
  BolneeIntentDetector.prototype._matchFAQ = function (tokens) {
    var faqs = this.knowledge && this.knowledge.faqs;
    if (!faqs || faqs.length === 0 || tokens.length === 0) return null;
    var best = null;
    for (var i = 0; i < faqs.length; i++) {
      var faq = faqs[i];
      var hay = ((faq.question || '') + ' ' + (faq.answer || '')).toLowerCase();
      var hToks = hay.split(' ').filter(function (t) { return t && !STOP.has(t); });
      var hits = tokens.filter(function (t) { return hToks.indexOf(t) > -1; }).length;
      var score = hits / Math.max(tokens.length, 1);
      if (score >= 0.2 && (!best || score > best.score)) {
        best = { faq: faq, score: score, conf: Math.round(score * 100) };
      }
    }
    return best;
  };

  // ── Build model prompt (fetches data and builds context for AI model) ────────────────
  // Returns {dataBlock, contextInstruction, intent} or null for GREETING/THANKS/GENERAL
  BolneeIntentDetector.prototype.buildModelPrompt = function (detection) {
    var intent = detection.intent;
    var qr = detection.queryResult;
    var ents = detection.entities;

    if (intent === 'GREETING' || intent === 'THANKS' || intent === 'GENERAL') {
      return null; // Let model respond naturally
    }

    function formatProductData(products) {
      if (!Array.isArray(products) || products.length === 0) return '';
      return products.map(function (p) {
        var tags = (p.tags && p.tags.length) ? p.tags.join(', ') : 'general';
        return p.name + ' | Rs' + p.price + ' | ' + tags;
      }).join('\n');
    }

    var dataBlock = '';
    var contextInstruction = '';

    switch (intent) {
      case 'BUDGET_FILTER': {
        if (qr && qr.found && qr.data) {
          var productsStr = formatProductData(qr.data);
          dataBlock = productsStr;
          contextInstruction = 'User wants products under Rs' + (ents.number || '0') + '. List only these products.';
        } else {
          dataBlock = 'None';
          contextInstruction = 'No products in this budget. Say none available.';
        }
        break;
      }
      case 'PRICE': {
        if (qr && qr.found && qr.data) {
          var productsStr = formatProductData(qr.data);
          dataBlock = productsStr;
          contextInstruction = 'User asks about prices. Show exactly these products with their prices.';
        } else {
          dataBlock = 'None';
          contextInstruction = 'No pricing data. Say prices unavailable.';
        }
        break;
      }
      case 'STOCK': {
        if (qr && qr.found && qr.data) {
          var productsStr = formatProductData(qr.data);
          dataBlock = productsStr;
          contextInstruction = 'User checks stock. Show only these products and their stock status.';
        } else {
          dataBlock = 'None';
          contextInstruction = 'No stock data. Say unavailable.';
        }
        break;
      }
      case 'PRODUCT_SEARCH': {
        if (qr && qr.found && qr.data) {
          var productsStr = formatProductData(qr.data);
          dataBlock = productsStr;
          contextInstruction = 'User searches for products. Show only these matching products.';
        } else {
          dataBlock = 'None';
          contextInstruction = 'No matches found. Say nothing matches.';
        }
        break;
      }
      case 'ABOUT': {
        if (qr && qr.found && qr.data && qr.data.about) {
          dataBlock = qr.data.about;
          contextInstruction = 'Share this store info exactly.';
        }
        break;
      }
      case 'RETURN_POLICY': {
        if (qr && qr.found && qr.data && qr.data.policy) {
          dataBlock = qr.data.policy;
          contextInstruction = 'User asks about returns. Share this return policy only.';
        }
        break;
      }
      case 'SHIPPING': {
        if (qr && qr.found && qr.data && qr.data.policy) {
          dataBlock = qr.data.policy;
          contextInstruction = 'User asks about shipping. Share this shipping info only.';
        }
        break;
      }
      case 'WARRANTY': {
        if (qr && qr.found && qr.data && qr.data.policy) {
          dataBlock = qr.data.policy;
          contextInstruction = 'User asks about warranty. Share this warranty info only.';
        }
        break;
      }
      case 'CONTACT': {
        if (qr && qr.found && qr.data && qr.data.contact) {
          var contact = qr.data.contact;
          var contactStr = [];
          if (contact.mobile) contactStr.push('Phone: ' + contact.mobile);
          if (contact.email) contactStr.push('Email: ' + contact.email);
          if (contact.address) contactStr.push('Address: ' + contact.address);
          if (contact.website) contactStr.push('Website: ' + contact.website);
          dataBlock = contactStr.join(' | ');
          contextInstruction = 'User asks for contact. Share these contact details only.';
        }
        break;
      }
      case 'HOURS': {
        if (qr && qr.found && qr.data && qr.data.hours) {
          dataBlock = qr.data.hours;
          contextInstruction = 'User asks about hours. Share these business hours only.';
        }
        break;
      }
      case 'FAQ': {
        if (qr && qr.found && qr.data) {
          var faq = qr.data;
          dataBlock = faq.answer || 'No answer.';
          contextInstruction = 'Answer the user question using this info exactly.';
        }
        break;
      }
    }

    if (!dataBlock) return null;

    return {
      dataBlock: dataBlock,
      contextInstruction: contextInstruction,
      intent: intent
    };
  };

  // ── Format response (returns plain text with \n line breaks) ────────────────
  // Called by the widget to render retrieved data directly — NO model needed.
  BolneeIntentDetector.prototype.formatResponse = function (detection) {
    var intent = detection.intent;
    var qr = detection.queryResult;
    var ents = detection.entities;

    function productList(items) {
      if (!items || items.length === 0) return '';
      return items.map(function (p, i) {
        var line = (i + 1) + '. ' + p.name + ' — \u20B9' + p.price;
        if (p.inStock === false) line += ' (Out of Stock)';
        else line += ' (In Stock)';
        if (p.tags && p.tags.length) line += '  [' + p.tags.join(', ') + ']';
        return line;
      }).join('\n');
    }

    switch (intent) {

      case 'BUDGET_FILTER': {
        var items = qr && qr.data;
        if (items && items.length > 0) {
          return 'Here are options within your budget of \u20B9' + (ents.number || '') + ':\n\n'
            + productList(items)
            + '\n\nWould you like more details on any of these?';
        }
        return 'Sorry, I couldn\'t find any products under \u20B9' + (ents.number || 'that budget')
          + '. Would you like to see our full catalog?';
      }

      case 'PRICE': {
        var items = qr && qr.data;
        if (items && items.length > 0) {
          return 'Here\'s the pricing information:\n\n' + productList(items)
            + '\n\nLet me know if you need more details!';
        }
        return 'I couldn\'t find pricing for that. Could you name the specific product?';
      }

      case 'STOCK':
      case 'PRODUCT_SEARCH': {
        var items = qr && qr.data;
        if (items && items.length > 0) {
          return 'Here\'s what we have:\n\n' + productList(items)
            + '\n\nWant details on any of these?';
        }
        return 'I couldn\'t find products matching that search. Try a different keyword?';
      }

      case 'ABOUT': {
        var about = qr && qr.data && qr.data.about;
        return about || 'I don\'t have store information available yet.';
      }

      case 'RETURN_POLICY': {
        var p = qr && qr.data && qr.data.policy;
        return p ? 'Return Policy:\n' + p : 'Return policy information is not available.';
      }

      case 'SHIPPING': {
        var p = qr && qr.data && qr.data.policy;
        return p ? 'Shipping & Delivery:\n' + p : 'Shipping information is not available.';
      }

      case 'WARRANTY': {
        var p = qr && qr.data && qr.data.policy;
        return p ? 'Warranty Information:\n' + p : 'Warranty information is not available.';
      }

      case 'CONTACT': {
        var c = qr && qr.data && qr.data.contact;
        if (!c) return 'Contact information is not available.';
        var lines = ['You can reach us at:'];
        if (c.mobile) lines.push('\uD83D\uDCDE  ' + c.mobile);
        if (c.email) lines.push('\u2709\uFE0F  ' + c.email);
        if (c.address) lines.push('\uD83D\uDCCD  ' + c.address);
        if (c.website) lines.push('\uD83C\uDF10  ' + c.website);
        return lines.join('\n');
      }

      case 'HOURS': {
        var h = qr && qr.data && qr.data.hours;
        return h || 'Store hours information is not available.';
      }

      case 'FAQ': {
        var faq = qr && qr.data;
        return (faq && faq.answer) ? faq.answer : 'I couldn\'t find an answer to that.';
      }

      case 'GREETING':
        return null; // let model handle greeting naturally

      case 'THANKS':
        return 'You\'re welcome! Let me know if there\'s anything else I can help with.';

      default:
        return null; // GENERAL → model handles it
    }
  };

  // ── Query by intent (for use with external classifier result) ────────────
  // Takes an intent label and user message text, returns detection object
  // compatible with formatResponse()
  BolneeIntentDetector.prototype.queryByIntent = function (intent, userMessage) {
    var c = clean(userMessage);
    var tokens = tokenize(c.s);
    var entities = this._extractEntities(intent, tokens, c);
    var queryResult = this._query(intent, entities, tokens);
    return {
      original: userMessage,
      tokens: tokens,
      intent: intent,
      confidence: 0,
      entities: entities,
      queryResult: queryResult
    };
  };

  window.BolneeIntentDetector = BolneeIntentDetector;
})();
