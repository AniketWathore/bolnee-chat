(function () {
  'use strict';

  if (window.BolneeIntentDetector) return;

  // CRITICAL: Do NOT add words here that also appear as single-word intent triggers.
  // If a word is a stop word AND a trigger, the intent will never match.
  var STOP_WORDS = new Set([
    'the','a','an','is','are','was','were','be','been','being',
    'what','which','whom','why','how',
    'tell','me','please','can','you','i','we','they','he','she','it',
    'want','know','like','would','could','should','will','shall',
    'do','does','did','has','had',
    'this','that','these','those','my','your','his','her','its',
    'our','their','some','any','all','each','every','both','no','not',
    'just','up','down','out','in','on','at','to','for','of',
    'with','by','from','as','into','through','during','before','after',
    'above','between','and','or','but','if','then','else',
    'so','than','too','very','am','here','there','thing','things',
    'then','also','only','more','much','many','still','even',
    'well','back','because','us','them','other','another','over'
  ]);

  var INTENTS = {
    BUDGET_FILTER: {
      priority: 1,
      triggers: ['under','below','budget','cheap','affordable','less than','within','maximum','upto','up to','max','lowest','low','less','spend','inexpensive','low price'],
      needsNumber: true
    },
    PRICE: {
      priority: 2,
      triggers: ['price','cost','how much','rate','charge','fee','amount','worth','pricing','costs','prices','expensive','cheap','dear','value','how much is','how much does'],
      needsNumber: false
    },
    STOCK: {
      priority: 3,
      triggers: ['available','in stock','out of stock','get','buy','purchase','stock','availability','order','deliver','inventory','instock','supply'],
      needsNumber: false
    },
    PRODUCT_SEARCH: {
      priority: 4,
      triggers: ['show','find','recommend','suggest','have','sell','looking','need','browse','search','looking for','got','tell me about','look for','looking to'],
      needsNumber: false
    },
    RETURN_POLICY: {
      priority: 5,
      triggers: ['return','refund','exchange','send back','money back','cancellation','cancel','cancel order','return policy','returning','refund policy'],
      needsNumber: false
    },
    SHIPPING: {
      priority: 6,
      triggers: ['shipping','delivery','ship','deliver','dispatch','courier','track','shipped','delivered','shipping time','delivery time','delivery charge','shipping charges'],
      needsNumber: false
    },
    WARRANTY: {
      priority: 7,
      triggers: ['warranty','guarantee','repair','broken','damaged','defect','replace','replacement','defective','damage','warranty period'],
      needsNumber: false
    },
    CONTACT: {
      priority: 8,
      triggers: ['contact','reach','call','phone','number','email','mail','address','location','where','support','helpline','contact number','phone number','mobile'],
      needsNumber: false
    },
    HOURS: {
      priority: 9,
      triggers: ['hours','open','close','timing','time','when','today','monday','tuesday','wednesday','thursday','friday','saturday','sunday','business hours','opening','closing'],
      needsNumber: false
    },
    ABOUT: {
      priority: 10,
      triggers: ['about','who','what are you','what is','describe','tell me about the store','tell me about your','what do you','what is this place','what kind of','what type'],
      needsNumber: false
    },
    GREETING: {
      priority: 11,
      triggers: ['hi','hello','hey','good morning','good evening','good afternoon','howdy','sup','yo','whats up','what\'s up','how are you','how do you do','morning','greetings'],
      needsNumber: false
    },
    THANKS: {
      priority: 12,
      triggers: ['thank','thanks','thank you','appreciate','helpful','grateful','thanks a lot','thank you so much','thanks for','thankyou','thx'],
      needsNumber: false
    }
  };

  var DAYS = new Set(['monday','tuesday','wednesday','thursday','friday','saturday','sunday']);
  var MONTHS = new Set(['january','february','march','april','may','june','july','august','september','october','november','december']);

  function BolneeIntentDetector(knowledgeData) {
    this.knowledge = knowledgeData || null;
  }

  function cleanMessage(msg) {
    if (!msg || typeof msg !== 'string') return { cleaner: '', numbers: [], hasNumber: false, original: '' };
    var s = msg.toLowerCase().trim();
    s = s.replace(/[^\w\s]/g, ' ');
    s = s.replace(/\s+/g, ' ').trim();
    var nums = (s.match(/\d+/g) || []).map(Number);
    return { cleaner: s, numbers: nums, hasNumber: nums.length > 0, original: msg };
  }

  function tokenize(cleaner) {
    return cleaner.split(' ').filter(function(t) { return t.length > 0 && !STOP_WORDS.has(t); });
  }

  BolneeIntentDetector.prototype.detect = function(userMessage) {
    var cleaned = cleanMessage(userMessage);
    var tokens = tokenize(cleaned.cleaner);
    var result = {
      original: userMessage,
      cleaned: cleaned,
      tokens: tokens,
      intent: 'GENERAL',
      confidence: 0,
      entities: {},
      queryResult: null,
      promptData: null
    };

    if (tokens.length === 0) return result;

    var matched = [];

    for (var intentName in INTENTS) {
      var config = INTENTS[intentName];
      var matchCount = 0;

      for (var t = 0; t < config.triggers.length; t++) {
        var trigger = config.triggers[t];
        if (trigger.indexOf(' ') > -1) {
          if (cleaned.cleaner.indexOf(trigger) > -1) matchCount++;
        } else {
          if (tokens.indexOf(trigger) > -1) matchCount++;
        }
      }

      if (matchCount > 0) {
        // Base confidence: each match counts more with smaller trigger sets
        var confBase = matchCount / Math.max(config.triggers.length * 0.15, 1);
        var confidence = Math.min(confBase, 1) * 100;
        // Minimum 15% for any match
        if (confidence < 15) confidence = 15;

        if (intentName === 'BUDGET_FILTER' && config.needsNumber) {
          if (!cleaned.hasNumber) continue;
          confidence = Math.min(confidence + 30, 100);
        }

        if (intentName === 'HOURS') {
          var hasDay = false;
          DAYS.forEach(function(d) { if (cleaned.cleaner.indexOf(d) > -1) hasDay = true; });
          if (hasDay) confidence = Math.min(confidence + 20, 100);
        }

        matched.push({ intent: intentName, confidence: Math.round(confidence), priority: config.priority });
      }
    }

    matched.sort(function(a, b) { return a.priority - b.priority; });

    if (matched.length > 0) {
      result.intent = matched[0].intent;
      result.confidence = matched[0].confidence;
    } else {
      // Check FAQ matches before falling back
      var faqResult = this.checkFAQs(tokens);
      if (faqResult) {
        result.intent = 'FAQ';
        result.confidence = faqResult.confidence;
        result.entities = { faq: faqResult.faq };
        result.queryResult = { intent: 'FAQ', found: true, data: faqResult.faq };
        result.promptData = this.buildPrompt(userMessage, 'FAQ', result.queryResult);
        return result;
      }

      if (tokens.length >= 3) {
        result.intent = 'PRODUCT_SEARCH';
        result.confidence = 20;
      } else {
        result.intent = 'GENERAL';
        result.confidence = 0;
      }
    }

    result.entities = this.extractEntities(result.intent, tokens, cleaned);
    result.queryResult = this.queryKnowledge(result.intent, result.entities);
    result.promptData = this.buildPrompt(userMessage, result.intent, result.queryResult);

    return result;
  };

  BolneeIntentDetector.prototype.extractEntities = function(intent, tokens, cleaned) {
    var entities = { productTokens: [] };

    var config = INTENTS[intent];
    if (!config) return entities;

    if (intent === 'BUDGET_FILTER' || intent === 'PRICE' || intent === 'STOCK' || intent === 'PRODUCT_SEARCH') {
      var triggers = config.triggers;
      entities.productTokens = tokens.filter(function(t) {
        return triggers.indexOf(t) === -1 && !/\d+/.test(t) && !DAYS.has(t) && !MONTHS.has(t);
      });
      if (cleaned && cleaned.numbers) entities.number = cleaned.numbers[0] || null;
    }

    if (intent === 'BUDGET_FILTER' && cleaned) {
      entities.number = cleaned.numbers[0] || null;
    }

    return entities;
  };

  BolneeIntentDetector.prototype.checkFAQs = function(tokens) {
    var faqs = this.knowledge && this.knowledge.faqs;
    if (!faqs || faqs.length === 0 || tokens.length === 0) return null;

    var scored = [];
    for (var i = 0; i < faqs.length; i++) {
      var faq = faqs[i];
      var qText = ((faq.question || '') + ' ' + (faq.answer || '')).toLowerCase();
      var qTokens = qText.split(' ').filter(function(t) { return t.length > 0 && !STOP_WORDS.has(t); });
      var overlap = 0;
      for (var j = 0; j < tokens.length; j++) {
        if (qTokens.indexOf(tokens[j]) > -1) overlap++;
      }
      var score = overlap / Math.max(tokens.length, 1);
      if (score > 0.15) {
        scored.push({ faq: faq, score: score, confidence: Math.round(score * 100) });
      }
    }

    scored.sort(function(a, b) { return b.score - a.score; });
    return scored.length > 0 ? scored[0] : null;
  };

  BolneeIntentDetector.prototype.queryKnowledge = function(intent, entities) {
    var k = this.knowledge;
    if (!k) return null;

    var result = { intent: intent, found: false, data: null };

    switch (intent) {
      case 'ABOUT':
        if (k.about) { result.found = true; result.data = { about: k.about }; }
        break;

      case 'RETURN_POLICY':
      case 'SHIPPING':
      case 'WARRANTY':
        if (k.policy) { result.found = true; result.data = { policy: k.policy }; }
        break;

      case 'CONTACT':
        if (k.contact) { result.found = true; result.data = { contact: k.contact }; }
        break;

      case 'HOURS':
        if (k.about) { result.found = true; result.data = { about: k.about }; }
        break;

      case 'BUDGET_FILTER': {
        var maxPrice = entities.number || 0;
        var productTokens = entities.productTokens || [];
        var products = k.products || [];

        if (products.length > 0) {
          // Filter by price first
          var filtered = products.filter(function(p) {
            var pPrice = parseFloat(p.price);
            return !isNaN(pPrice) && pPrice <= maxPrice;
          });

          if (filtered.length > 0) {
            // Score by token overlap but KEEP all filtered products
            if (productTokens.length > 0) {
              var scored = filtered.map(function(p) {
                var searchText = (p.name + ' ' + (p.tags || []).join(' ')).toLowerCase();
                var overlap = productTokens.filter(function(t) { return searchText.indexOf(t) > -1; }).length;
                return { product: p, score: overlap / Math.max(productTokens.length, 1) };
              });
              scored.sort(function(a, b) { return b.score - a.score; });
              // Put matched ones first, then rest
              var matched = scored.filter(function(s) { return s.score > 0; }).map(function(s) { return s.product; });
              var rest = scored.filter(function(s) { return s.score === 0; }).map(function(s) { return s.product; });
              result.data = matched.concat(rest);
            } else {
              result.data = filtered;
            }
            result.found = true;
          }
        }
        break;
      }

      case 'PRICE':
      case 'STOCK':
      case 'PRODUCT_SEARCH': {
        var productTokens2 = entities.productTokens || [];
        var products2 = k.products || [];

        if (products2.length > 0) {
          if (productTokens2.length > 0) {
            var scored2 = products2.map(function(p) {
              var searchText = (p.name + ' ' + (p.tags || []).join(' ')).toLowerCase();
              var overlap = productTokens2.filter(function(t) { return searchText.indexOf(t) > -1; }).length;
              return { product: p, score: overlap / Math.max(productTokens2.length, 1) };
            });
            scored2.sort(function(a, b) { return b.score - a.score; });
            var top2 = scored2.filter(function(s) { return s.score > 0; }).map(function(s) { return s.product; });
            result.data = top2.length > 0 ? top2 : products2;
            result.found = true;
          } else {
            result.data = products2;
            result.found = true;
          }
        }
        break;
      }
    }

    return result;
  };

  // Build a minimal focused data block for the model.
  // Returns null for GREETING/THANKS/GENERAL (no data injection needed).
  // Returns { dataBlock, intent } for knowledge intents.
  BolneeIntentDetector.prototype.buildPrompt = function(userMessage, intent, queryResult) {
    if (intent === 'GREETING' || intent === 'THANKS' || intent === 'GENERAL') {
      return null;
    }

    if (!queryResult || !queryResult.found) {
      return {
        dataBlock: 'Customer is asking about ' + intent.toLowerCase().replace(/_/g, ' ') + '. No information found in database.',
        intent: intent
      };
    }

    var dataBlock = '';

    switch (intent) {
      case 'ABOUT':
        dataBlock = queryResult.data.about || '';
        break;

      case 'RETURN_POLICY':
      case 'SHIPPING':
      case 'WARRANTY':
        dataBlock = queryResult.data.policy || '';
        break;

      case 'CONTACT': {
        var c = queryResult.data.contact || {};
        var parts = [];
        if (c.mobile) parts.push('Phone: ' + c.mobile);
        if (c.email) parts.push('Email: ' + c.email);
        if (c.address) parts.push('Address: ' + c.address);
        if (c.website) parts.push('Website: ' + c.website);
        dataBlock = parts.join(' | ');
        break;
      }

      case 'HOURS':
        dataBlock = queryResult.data.about || '';
        break;

      case 'FAQ': {
        var faq = queryResult.data;
        if (faq && faq.answer) dataBlock = faq.answer;
        break;
      }

      case 'BUDGET_FILTER':
      case 'PRICE':
      case 'STOCK':
      case 'PRODUCT_SEARCH': {
        var items = queryResult.data;
        if (Array.isArray(items) && items.length > 0) {
          dataBlock = items.map(function(p) {
            return p.name + ' - \u20B9' + p.price + (p.inStock ? ' (In Stock)' : ' (Out of Stock)');
          }).join('\n');
        } else if (items) {
          dataBlock = JSON.stringify(items);
        }
        break;
      }
    }

    return {
      dataBlock: dataBlock,
      intent: intent,
      query: userMessage
    };
  };

  BolneeIntentDetector.prototype.formatResponse = function(detectionResult) {
    var intent = detectionResult.intent;
    var queryResult = detectionResult.queryResult;
    var original = detectionResult.original;
    var k = this.knowledge;

    // Helper: format product list
    function formatProducts(items) {
      if (!items || items.length === 0) return '';
      return items.map(function(p, i) {
        var line = (i + 1) + '. **' + p.name + '**';
        if (p.price) line += ' — \u20B9' + p.price;
        if (p.inStock === false) line += ' (Out of Stock)';
        else if (p.inStock === true) line += ' (In Stock)';
        if (p.tags && p.tags.length) line += ' [' + p.tags.join(', ') + ']';
        return line;
      }).join('\n');
    }

    switch (intent) {
      case 'BUDGET_FILTER': {
        var items = queryResult && queryResult.data;
        if (items && items.length > 0) {
          return 'Here are the products within your budget:\n\n' + formatProducts(items) + '\n\nWould you like to know more about any of these?';
        }
        var maxPrice = detectionResult.entities && detectionResult.entities.number;
        return 'I couldn\'t find any products ' + (maxPrice ? 'under \u20B9' + maxPrice : 'in that price range') + '. Would you like to browse our full catalog?';
      }

      case 'PRICE': {
        var items = queryResult && queryResult.data;
        if (items && items.length > 0) {
          return 'Here are the prices:\n\n' + formatProducts(items) + '\n\nLet me know if you\'d like details on any product.';
        }
        return 'I couldn\'t find pricing information for that. Could you specify which product you\'re interested in?';
      }

      case 'STOCK':
      case 'PRODUCT_SEARCH': {
        var items = queryResult && queryResult.data;
        if (items && items.length > 0) {
          return 'Here\'s what we have available:\n\n' + formatProducts(items) + '\n\nLet me know if you\'d like more details about any item!';
        }
        return 'I couldn\'t find any products matching that. Could you try a different search?';
      }

      case 'ABOUT': {
        var about = queryResult && queryResult.data && queryResult.data.about;
        if (about) return about;
        return 'I don\'t have information about this store yet.';
      }

      case 'RETURN_POLICY': {
        var policy = queryResult && queryResult.data && queryResult.data.policy;
        if (policy) return 'Our return policy: ' + policy;
        return 'I couldn\'t find the return policy information.';
      }

      case 'SHIPPING': {
        var policy = queryResult && queryResult.data && queryResult.data.policy;
        if (policy) return 'Shipping information: ' + policy;
        return 'I couldn\'t find shipping information.';
      }

      case 'WARRANTY': {
        var policy = queryResult && queryResult.data && queryResult.data.policy;
        if (policy) return 'Warranty information: ' + policy;
        return 'I couldn\'t find warranty information.';
      }

      case 'CONTACT': {
        var c = queryResult && queryResult.data && queryResult.data.contact;
        if (c) {
          var lines = [];
          if (c.mobile) lines.push('\uD83D\uDCDE Phone: ' + c.mobile);
          if (c.email) lines.push('\u2709\uFE0F Email: ' + c.email);
          if (c.address) lines.push('\uD83C\uDFE0 Address: ' + c.address);
          if (c.website) lines.push('\uD83C\uDF10 Website: ' + c.website);
          return 'You can reach us here:\n' + lines.join('\n');
        }
        return 'Contact information is not available yet.';
      }

      case 'HOURS': {
        var about = queryResult && queryResult.data && queryResult.data.about;
        if (about) return about;
        return 'Store hours information is not available.';
      }

      case 'FAQ': {
        var faq = queryResult && queryResult.data;
        if (faq && faq.answer) return faq.answer;
        return 'I couldn\'t find an answer to that question.';
      }

      default:
        return null;
    }
  };

  window.BolneeIntentDetector = BolneeIntentDetector;
})();
