(function () {
  'use strict';

  if (window.BolneeIntentDetector) return;

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

  var INTENTS = [
    {
      name: 'BUDGET_FILTER',
      priority: 1,
      needsNumber: true,
      phrases: ['less than', 'up to', 'upto', 'low price', 'low budget', 'price range', 'under rs', 'below rs'],
      words: ['under', 'below', 'budget', 'affordable', 'cheapest', 'max', 'maximum', 'inexpensive', 'spend', 'within', 'lowest']
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
      phrases: ['show me', 'looking for', 'tell me about', 'what do you sell', 'what do you have', 'do you have', 'what shoes', 'what products', 'recommend me', 'suggest me', 'any shoes', 'any products', 'any other'],
      words: ['show', 'find', 'recommend', 'suggest', 'search', 'browse', 'looking', 'need', 'sell', 'have', 'got', 'shoes', 'products', 'want', 'like', 'give', 'another']
    },
    {
      name: 'RETURN_POLICY',
      priority: 5,
      needsNumber: false,
      phrases: ['return policy', 'refund policy', 'money back', 'send back', 'cancel order'],
      words: ['return', 'refund', 'exchange', 'cancellation', 'cancel', 'returning', 'policy']
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
      words: ['about', 'describe', 'overview', 'website', 'store']
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

  function BolneeIntentDetector(responsesData) {
    this.responses = responsesData || null;
  }

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

  function pickVariation(arr, index) {
    if (!arr || arr.length === 0) return null;
    var idx = typeof index === 'number' ? Math.min(index, arr.length - 1) : Math.floor(Math.random() * arr.length);
    return arr[idx];
  }

  BolneeIntentDetector.prototype.detect = function (userMessage) {
    var c = clean(userMessage);
    var tokens = tokenize(c.s);

    var result = {
      original: userMessage,
      tokens: tokens,
      intent: 'GENERAL',
      confidence: 0,
      entities: {},
      queryResult: null
    };

    if (!userMessage || !userMessage.trim()) return result;

    var candidates = [];

    for (var i = 0; i < INTENTS.length; i++) {
      var def = INTENTS[i];
      var hits = 0;
      var total = def.phrases.length + def.words.length;

      // Skip RETURN_POLICY if message is about privacy (not returns)
      if (def.name === 'RETURN_POLICY' && c.s.indexOf('privacy') > -1) continue;

      for (var p = 0; p < def.phrases.length; p++) {
        if (c.s.indexOf(def.phrases[p]) > -1) hits++;
      }
      for (var w = 0; w < def.words.length; w++) {
        if (tokens.indexOf(def.words[w]) > -1) { hits++; continue; }
        // Also check partial/plural matches
        for (var t = 0; t < tokens.length; t++) {
          if (tokens[t].length > 2 && (tokens[t].indexOf(def.words[w]) === 0 || def.words[w].indexOf(tokens[t]) === 0)) {
            hits++;
            break;
          }
        }
      }

      if (hits === 0) continue;

      if (def.needsNumber && !c.hasNum) continue;

      var conf = Math.min(Math.round((hits / Math.max(total * 0.12, 1)) * 100), 100);
      if (conf < 20) conf = 20;
      if (def.name === 'BUDGET_FILTER') conf = Math.min(conf + 25, 100);
      if (def.name === 'PRODUCT_SEARCH') conf = Math.min(conf + 15, 100);
      if (def.name === 'HOURS' && /monday|tuesday|wednesday|thursday|friday|saturday|sunday/.test(c.s)) {
        conf = Math.min(conf + 20, 100);
      }

      candidates.push({ def: def, conf: conf });
    }

    candidates.sort(function (a, b) { return a.def.priority - b.def.priority; });

    if (candidates.length > 0) {
      result.intent = candidates[0].def.name;
      result.confidence = candidates[0].conf;
    } else {
      var faqHit = this._matchFAQ(tokens);
      if (faqHit) {
        result.intent = 'FAQ';
        result.confidence = faqHit.conf;
        result.entities = { faq: faqHit.faq };
        result.queryResult = { intent: 'FAQ', found: true, data: faqHit.faq };
        return result;
      }
      if (tokens.length >= 3) {
        result.intent = 'PRODUCT_SEARCH';
        result.confidence = 40;
      }
    }

    result.entities = this._extractEntities(result.intent, tokens, c);
    result.queryResult = { intent: result.intent, found: true, data: null };
    return result;
  };

  BolneeIntentDetector.prototype._extractEntities = function (intent, tokens, c) {
    var e = { productTokens: [], number: null };

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

  var GENERIC_SLUG_WORDS = {'products':1,'collections':1,'frontpage':1,'item':1,'p':1,'detail':1,'dp':1,'sku':1,'goods':1};

  BolneeIntentDetector.prototype._findProduct = function (tokens) {
    var prods = this.responses && this.responses.product_responses;
    if (!prods) return null;
    var slugs = Object.keys(prods);
    var best = null;
    var bestScore = 0;
    var filtered = tokens.filter(function(t) { return !GENERIC_SLUG_WORDS[t]; });
    if (filtered.length === 0) return null;
    for (var i = 0; i < slugs.length; i++) {
      var prod = prods[slugs[i]];
      var haystack = (prod.name || '').toLowerCase();
      var score = 0;
      for (var t = 0; t < filtered.length; t++) {
        if (haystack.indexOf(filtered[t]) > -1) score++;
      }
      if (score > bestScore) {
        bestScore = score;
        best = prod;
      }
    }
    return bestScore > 0 ? best : null;
  };

  BolneeIntentDetector.prototype._matchFAQ = function (tokens) {
    var faqs = this.responses && this.responses.faq_responses;
    if (!faqs || faqs.length === 0 || tokens.length === 0) return null;
    var best = null;
    for (var i = 0; i < faqs.length; i++) {
      var faq = faqs[i];
      var hay = (faq.question || '').toLowerCase();
      var hToks = hay.split(' ').filter(function (t) { return t && !STOP.has(t); });
      var hits = tokens.filter(function (t) { return hToks.indexOf(t) > -1; }).length;
      var score = hits / Math.max(tokens.length, 1);
      if (score >= 0.2 && (!best || score > best.score)) {
        best = { faq: faq, score: score, conf: Math.round(score * 100) };
      }
    }
    return best;
  };

  BolneeIntentDetector.prototype.formatResponse = function (detection) {
    var k = this.responses;
    if (!k) return null;

    var intent = detection.intent;
    var entities = detection.entities;
    var tokens = detection.tokens || [];
    var idx = detection.variationIndex;

    if (intent === 'FAQ') {
      var faq = detection.entities && detection.entities.faq;
      if (faq && faq.responses) return pickVariation(faq.responses, idx);
      return pickVariation(k.responses && k.responses.GENERAL, idx) || "I couldn't find an answer to that.";
    }

    if (intent === 'BUDGET_FILTER') {
      return pickVariation(k.responses && k.responses.BUDGET_FILTER, idx) || "I can help find products within your budget.";
    }

    if (intent === 'PRODUCT_SEARCH') {
      var matched = this._findProduct(tokens);
      if (matched && matched.about_responses) return pickVariation(matched.about_responses, idx);
      return pickVariation(k.responses && k.responses.PRODUCT_SEARCH, idx) || "Let me show you what we have.";
    }

    if (intent === 'PRICE') {
      var matched = this._findProduct(tokens);
      if (matched && matched.price_responses) return pickVariation(matched.price_responses, idx);
      return pickVariation(k.responses && k.responses.PRICE, idx) || "I can check the price for you.";
    }

    if (intent === 'STOCK') {
      var matched = this._findProduct(tokens);
      if (matched && matched.stock_responses) return pickVariation(matched.stock_responses, idx);
      return pickVariation(k.responses && k.responses.STOCK, idx) || "I can check availability for you.";
    }

    var response = pickVariation(k.responses && k.responses[intent], idx);
    if (response) return response;

    return null;
  };

  BolneeIntentDetector.prototype.queryByIntent = function (intent, userMessage) {
    var c = clean(userMessage);
    var tokens = tokenize(c.s);
    var entities = this._extractEntities(intent, tokens, c);
    return {
      original: userMessage,
      tokens: tokens,
      intent: intent,
      confidence: 0,
      entities: entities,
      queryResult: { intent: intent, found: true, data: null }
    };
  };

  window.BolneeIntentDetector = BolneeIntentDetector;
})();
