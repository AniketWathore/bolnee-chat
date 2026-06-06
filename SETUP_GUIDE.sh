#!/bin/bash
# Bolnee Chatbot Platform — Quick Setup Guide

echo "🤖 Bolnee Chatbot Platform - Setup Guide"
echo "═════════════════════════════════════════════════════════════════"
echo ""

# ─────────────────────────────────────────────────────────────────────
# Step 1: Install Python dependencies
# ─────────────────────────────────────────────────────────────────────
echo "📦 Step 1: Installing Python dependencies..."
echo "   (Required for crawler: beautifulsoup4, aiohttp, lxml, playwright)"
echo ""
echo "   Run this in terminal:"
echo "   pip install 'aiohttp[speedups]' beautifulsoup4 lxml playwright"
echo "   playwright install chromium"
echo ""

# ─────────────────────────────────────────────────────────────────────
# Step 2: Test the crawler
# ─────────────────────────────────────────────────────────────────────
echo "🕷️  Step 2: Run the smart crawler on a website"
echo ""
echo "   Usage:"
echo "   cd crawler/"
echo "   python3 smart_crawler.py 'https://bulliesandco.com' 30 --output raw_data.json"
echo ""
echo "   This will:"
echo "   • Crawl up to 30 pages from the website"
echo "   • Remove duplicate content automatically"
echo "   • Classify content (product, policy, about, etc.)"
echo "   • Output to raw_data.json"
echo ""

# ─────────────────────────────────────────────────────────────────────
# Step 3: Process the raw data
# ─────────────────────────────────────────────────────────────────────
echo "⚙️  Step 3: Process raw crawler output into knowledge JSON"
echo ""
echo "   Usage:"
echo "   cd server/"
echo "   node data-processor.js ../crawler/raw_data.json knowledge_bot123.json"
echo ""
echo "   This will:"
echo "   • Convert raw data to optimized format"
echo "   • Extract products, categories, policies"
echo "   • Generate searchable text"
echo "   • Output to knowledge_bot123.json (~300KB for typical site)"
echo ""

# ─────────────────────────────────────────────────────────────────────
# Step 4: Serve knowledge JSON
# ─────────────────────────────────────────────────────────────────────
echo "🌐 Step 4: Make knowledge JSON available to widget"
echo ""
echo "   Option A: Serve from your backend"
echo "   • Save knowledge JSON to public/knowledge/{botId}.json"
echo "   • API endpoint: GET /api/knowledge/{botId}"
echo "   • Returns the knowledge JSON to the widget"
echo ""
echo "   Option B: Embed directly in the widget loader"
echo "   • Inline the JSON in the embed code"
echo "   • No additional HTTP request needed"
echo ""

# ─────────────────────────────────────────────────────────────────────
# Step 5: Generate embed code
# ─────────────────────────────────────────────────────────────────────
echo "📜 Step 5: Generate embed code for customer"
echo ""
echo "   Example embed code:"
echo ""
cat << 'EOF'
<script>
  (function() {
    window.BotConfig = {
      accentColor: '#6366f1',
      botName: 'Shopping Assistant',
      greeting: 'Hi! How can I help you today?',
      knowledgeUrl: 'https://your-domain.com/api/knowledge/bot_xyz123'
    };
    var script = document.createElement('script');
    script.src = 'https://your-domain.com/public/chatbot-widget.js';
    document.body.appendChild(script);
  })();
</script>
EOF
echo ""

# ─────────────────────────────────────────────────────────────────────
# Step 6: How it works
# ─────────────────────────────────────────────────────────────────────
echo "🔄 How the chatbot works:"
echo ""
echo "   CLIENT-SIDE (in customer's browser):"
echo "   1. Widget loads: chatbot-widget.js"
echo "   2. Loads engines: intent-detector.js, data-extractor.js, response-generator.js"
echo "   3. Fetches knowledge: knowledge_{botId}.json (customer's website data)"
echo "   4. User sends message:"
echo "      • Intent Detector → identifies intent (product search, price check, etc.)"
echo "      • Data Extractor → queries knowledge JSON"
echo "      • Response Generator → formats human-friendly response"
echo "   5. Response displayed instantly (NO LLM CALLS!)"
echo ""

# ─────────────────────────────────────────────────────────────────────
# Step 7: Supported intents
# ─────────────────────────────────────────────────────────────────────
echo "💡 Supported user queries (intents):"
echo ""
echo "   1. PRODUCT_SEARCH        → 'Show me dog collars'"
echo "   2. PRODUCT_INFO          → 'Tell me about the Gold Chain'"
echo "   3. PRICE_CHECK           → 'What's the price of XXX?'"
echo "   4. FILTER_BY_PRICE       → 'Products under $50'"
echo "   5. FILTER_BY_CATEGORY    → 'Show all collars'"
echo "   6. COMPARISON            → 'Compare Gold vs Miami Chain'"
echo "   7. SIMILAR_PRODUCTS      → 'Similar to the Cuban Chain'"
echo "   8. PRODUCT_VARIANTS      → 'What sizes are available?'"
echo "   9. REFUND_POLICY         → 'What's your refund policy?'"
echo "  10. SHIPPING_POLICY       → 'How much is shipping?'"
echo "  11. TERMS                 → 'Terms of service'"
echo "  12. ABOUT_COMPANY         → 'Tell me about your company'"
echo "  13. CONTACT_INFO          → 'How do I contact you?'"
echo "  14. STOCK_AVAILABILITY    → 'Is this in stock?'"
echo ""

# ─────────────────────────────────────────────────────────────────────
# File structure
# ─────────────────────────────────────────────────────────────────────
echo "📁 File structure:"
echo ""
cat << 'EOF'
bolnee/
├── crawler/
│   ├── smart_crawler.py          ← Run this to crawl websites
│   ├── local_crawler.py           ← Base crawler (imported by smart_crawler)
│   └── raw_data.json              ← Crawler output (raw)
│
├── server/
│   └── data-processor.js          ← Run to process raw → knowledge JSON
│
└── public/
    ├── chatbot-widget.js          ← Main widget (loads everything)
    ├── intent-detector.js         ← Intent detection (14 intents)
    ├── data-extractor.js          ← Data query engine
    └── response-generator.js      ← Response formatting

Data flow:
raw_data.json → data-processor.js → knowledge_{botId}.json
                                             ↓
                                  chatbot-widget.js
                                             ↓
                            intent-detector → data-extractor → response-generator
EOF
echo ""

# ─────────────────────────────────────────────────────────────────────
# Performance notes
# ─────────────────────────────────────────────────────────────────────
echo "⚡ Performance targets:"
echo ""
echo "   Knowledge JSON size:      < 500 KB per website"
echo "   Widget load time:         < 1 second"
echo "   Intent detection:         < 50 ms"
echo "   Data extraction:          < 100 ms"
echo "   Response generation:      < 50 ms"
echo "   Total per message:        < 300 ms"
echo "   Browser memory usage:     < 10 MB"
echo ""

echo "✅ Setup complete! Start with Step 1 above."
