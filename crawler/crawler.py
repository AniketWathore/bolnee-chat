#!/usr/bin/env python3
"""
E-Commerce Website Crawler  —  Sitemap + Homepage Link Extractor  v5
══════════════════════════════════════════════════════════════════════
Finds all pages by combining:
  • sitemap.xml (fast, bulk URLs)
  • homepage (or start URL) for missing pages like policies, contact, etc.
No full recursive crawling – only the pages explicitly listed in sitemap or directly linked from the start page.
"""

from __future__ import annotations

import asyncio
import json
import os
import re
import subprocess
import sys
import time
import xml.etree.ElementTree as ET
from pathlib import Path
from urllib.parse import urljoin, urlparse, urlunparse
from typing import Dict, List, Optional, Set

import requests
import aiohttp
from bs4 import BeautifulSoup, Tag

# ─────────────────────────────────────────────────────────────────────────────
# DEPENDENCY CHECK (same as before)
# ─────────────────────────────────────────────────────────────────────────────

def _require(pkg: str, imp: str):
    try:
        __import__(imp)
        return True
    except ImportError:
        return False

def _check_deps():
    missing = []
    if not _require("aiohttp", "aiohttp"):         missing.append("'aiohttp[speedups]'")
    if not _require("beautifulsoup4", "bs4"):       missing.append("beautifulsoup4")
    if not _require("lxml", "lxml"):                missing.append("lxml")
    if not _require("playwright", "playwright"):    missing.append("playwright")
    if not _require("requests", "requests"):        missing.append("requests")
    brotli_ok = _require("brotli", "brotli") or _require("brotlicffi", "brotlicffi")
    if not brotli_ok:                               missing.append("brotli brotlicffi")

    if missing:
        print("\n❌  Missing packages. Run:\n")
        print(f"    pip install {' '.join(missing)}")
        if "playwright" in str(missing):
            print("    playwright install chromium")
        print()
        sys.exit(1)

_check_deps()

# ─────────────────────────────────────────────────────────────────────────────
# CONSTANTS (unchanged)
# ─────────────────────────────────────────────────────────────────────────────

REQUEST_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9",
    "Accept-Language": "en-US,en;q=0.9",
}

_SKIP_EXT = frozenset([".pdf", ".jpg", ".jpeg", ".png", ".gif", ".webp", ".avif",
                       ".css", ".js", ".svg", ".ico", ".zip", ".mp4", ".mp3",
                       ".doc", ".docx", ".xls", ".xlsx", ".xml", ".json",
                       ".woff", ".woff2", ".ttf", ".eot", ".otf", ".map"])

_SKIP_PATH = re.compile(
    r"/(cart|checkout|account|login|register|wishlist|logout|"
    r"password|reset|unsubscribe|cdn-cgi|\.well-known|"
    r"track|order-status|compare|print|ajax|api/)",
    re.I,
)

_LOCALE_PATH = re.compile(
    r"/(en-us|en-gb|en-au|en-ca|fr-ca|fr-fr|de-de|es-es|"
    r"pt-br|ja-jp|zh-cn|zh-tw|ko-kr|it-it|nl-nl|sv-se|"
    r"da-dk|no-no|fi-fi|pl-pl|cs-cz|hu-hu|ro-ro|"
    r"ru-ru|tr-tr|ar-sa|th-th|vi-vn|id-id|ms-my|"
    r"tl-ph|hi-in|bn-bd|ur-pk)/",
    re.I,
)

_CONTENT_SECTION = re.compile(
    r"/(blogs?|articles?|journal|news|press|events?|"
    r"recipes|magazine|lookbook|gallery|"
    r"team|our-team|careers|jobs)/",
    re.I,
)

_CATEGORY_PATH = re.compile(
    r"/(collections?|categor|shop|department|brand|range|catalog|"
    r"search|filter|browse|listing|grid|store)",
    re.I,
)

_PRODUCT_PATH = re.compile(
    r"/(products?|item|p/|detail|pd/|dp/|sku|goods)",
    re.I,
)

_PRICE_RE = re.compile(
    r"(?:₹|Rs\.?\s?|MRP:?\s?|\$|£|€)\s?[\d,]+(?:\.\d{1,2})?"
    r"|[\d,]+(?:\.\d{1,2})?\s?(?:INR|USD|EUR|GBP)\b",
    re.I,
)

_CONTENT_TAGS = {"h1","h2","h3","h4","h5","h6","p","li","td","th","strong","em"}
_INLINE_TAGS   = {"strong","em"}
_INLINE_MIN    = 30

_BOILERPLATE_RE = re.compile(
    r"\b(?:nav(?:bar|igation)?|menu|footer|sidebar|breadcrumb|cookie|popup|modal|"
    r"announcement|newsletter|social|share|topbar|toolbar|"
    r"masthead|promo|colophon|copyright|"
    r"sticky|flyout|overlay|drawer)\b",
    re.I,
)

# ─────────────────────────────────────────────────────────────────────────────
# PLAYWRIGHT & FETCH (same as before)
# ─────────────────────────────────────────────────────────────────────────────

_pw_lock    = asyncio.Lock()
_pw_ctx     = None
_pw_browser = None

async def _ensure_browser():
    global _pw_ctx, _pw_browser
    async with _pw_lock:
        if _pw_browser is None:
            from playwright.async_api import async_playwright
            _pw_ctx     = async_playwright()
            pw          = await _pw_ctx.__aenter__()
            _pw_browser = await pw.chromium.launch(
                headless=True,
                args=["--no-sandbox", "--disable-setuid-sandbox",
                      "--disable-dev-shm-usage", "--disable-gpu",
                      "--disable-blink-features=AutomationDetected"],
            )

async def _pw_fetch(url: str, timeout_ms: int = 25000) -> Optional[str]:
    try:
        await _ensure_browser()
        ctx  = await _pw_browser.new_context(user_agent=REQUEST_HEADERS["User-Agent"],
                                             viewport={"width": 1280, "height": 800})
        page = await ctx.new_page()
        async def _block(route):
            if route.request.resource_type in ("image","media","font","stylesheet"):
                await route.abort()
            else:
                await route.continue_()
        await page.route("**/*", _block)
        try:
            await page.goto(url, timeout=timeout_ms, wait_until="domcontentloaded")
        except Exception:
            pass
        try:
            await page.wait_for_load_state("networkidle", timeout=7000)
        except Exception:
            pass
        html = await page.content()
        await ctx.close()
        return html
    except Exception as exc:
        print(f"    ⚠️  Playwright: {str(exc)[:80]}")
        return None

def _looks_like_js_shell(html: Optional[str]) -> bool:
    if not html or len(html) < 5000:
        return True
    soup = BeautifulSoup(html, "lxml")
    for t in soup.find_all(["script","style"]):
        t.decompose()
    text = soup.get_text(strip=True)
    if len(text) < 150:
        return True
    meaningful = [
        t for t in (soup.body.find_all(True) if soup.body else [])
        if t.name in ("h1","h2","h3","p","li","td","a") and t.get_text(strip=True)
    ]
    return len(meaningful) < 4

async def _http_fetch(session: aiohttp.ClientSession, url: str, timeout: int) -> Optional[str]:
    try:
        t = aiohttp.ClientTimeout(total=timeout)
        async with session.get(url, timeout=t, allow_redirects=True,
                               ssl=False, auto_decompress=False,
                               headers={"Accept-Encoding": "gzip, deflate, br"}) as resp:
            if resp.status != 200:
                return None
            ct = resp.headers.get("content-type", "")
            if "text/html" not in ct:
                return None
            raw = await resp.read()
            encoding = resp.headers.get("content-encoding", "").lower()
            if "br" in encoding:
                try:
                    import brotli
                    raw = brotli.decompress(raw)
                except ImportError:
                    import brotlicffi
                    raw = brotlicffi.decompress(raw)
            elif "gzip" in encoding:
                import gzip
                raw = gzip.decompress(raw)
            elif "deflate" in encoding:
                import zlib
                try:    raw = zlib.decompress(raw)
                except: raw = zlib.decompress(raw, -zlib.MAX_WBITS)
            charset = "utf-8"
            m = re.search(r"charset=([\w-]+)", ct)
            if m:
                charset = m.group(1)
            return raw.decode(charset, errors="replace")
    except Exception as exc:
        msg = str(exc)
        if "brotli" not in msg.lower() and "ssl" not in msg.lower():
            print(f"    ✗  {urlparse(url).path[:60]}  →  {msg[:60]}")
        return None

async def smart_fetch(session: aiohttp.ClientSession, url: str, timeout: int, use_playwright: bool) -> Optional[str]:
    html = await _http_fetch(session, url, timeout)
    if not _looks_like_js_shell(html):
        return html
    if use_playwright:
        reason = "JS shell" if html else "HTTP failed"
        print(f"    🎭  {urlparse(url).path[:55]}  ({reason}) → Playwright")
        html = await _pw_fetch(url, timeout_ms=timeout * 1500)
    return html

# ─────────────────────────────────────────────────────────────────────────────
# CONTENT EXTRACTION (unchanged from original)
# ─────────────────────────────────────────────────────────────────────────────

def _strip_boilerplate(soup: BeautifulSoup) -> None:
    for tag in soup.find_all(["nav", "header", "footer", "aside"]):
        tag.decompose()
    for attr in ("class", "id", "role"):
        for tag in soup.find_all(True, attrs={attr: _BOILERPLATE_RE}):
            tag.decompose()
    for tag in soup.find_all(True, attrs={"role": re.compile(r"navigation|banner|complementary|contentinfo", re.I)}):
        tag.decompose()

def _extract_content(soup: BeautifulSoup) -> List[dict]:
    main = (
        soup.find("main") or soup.find("article") or
        soup.find(id=re.compile(r"^(content|main|product|detail|description|body)", re.I)) or
        soup.find(class_=re.compile(r"(product.detail|product.description|product.info|product__desc|pdp|item.detail|page.content|entry.content|post.content|main.content|content.area)", re.I)) or
        soup.body
    )
    if not main:
        return []
    content: List[dict] = []
    seen: Set[str] = set()
    for el in main.descendants:
        if not isinstance(el, Tag):
            continue
        if el.name not in _CONTENT_TAGS:
            continue
        if any(a.name in ("script","style","noscript","iframe") for a in el.parents):
            continue
        block_children = {"h1","h2","h3","h4","h5","h6","p","li","td","th"}
        if any(isinstance(c, Tag) and c.name in block_children for c in el.descendants if isinstance(c, Tag)):
            continue
        text = re.sub(r"\s+", " ", el.get_text(separator=" ", strip=True)).strip()
        if not text or len(text) < 3:
            continue
        if el.name in _INLINE_TAGS and len(text) < _INLINE_MIN:
            continue
        if text in seen:
            continue
        seen.add(text)
        content.append({"tag": el.name, "text": text})
    rich_selectors = [
        {"class": re.compile(r"(product.description|product__desc|product__description|rte|product-info|product-detail|desc|specs|features|accordion|tab-content|metafield|rich.text|custom-liquid|product-single__description|pdp-description)", re.I)},
        {"id": re.compile(r"(description|product-description|product-info|specs|details|accordion|tab|productDescription|product-detail)", re.I)},
    ]
    for sel in rich_selectors:
        for el in main.find_all("div", attrs=sel):
            text = re.sub(r"\s+", " ", el.get_text(separator=" ", strip=True)).strip()
            if text and len(text) >= 50 and text not in seen:
                seen.add(text)
                content.append({"tag": "div", "text": text})
    return content

def _json_ld(soup: BeautifulSoup) -> List[dict]:
    out: List[dict] = []
    for sc in soup.find_all("script", type="application/ld+json"):
        try:
            raw = json.loads(sc.string or "")
            if isinstance(raw, list):
                out.extend(raw)
            elif isinstance(raw, dict):
                out.extend(raw.get("@graph", [raw]))
        except Exception:
            pass
    return out

def _title(soup: BeautifulSoup) -> str:
    og = soup.find("meta", property=re.compile(r"og:title", re.I))
    if og and og.get("content"):
        return og["content"].strip()
    h1 = soup.find("h1")
    if h1:
        return h1.get_text(strip=True)
    if soup.title:
        return re.split(r"\s*[|–—-]\s*", soup.title.get_text(strip=True))[0].strip()
    return ""

def _price(soup: BeautifulSoup, ld: List[dict]) -> Optional[str]:
    for item in ld:
        offers = item.get("offers")
        if isinstance(offers, dict):
            p, c = offers.get("price"), offers.get("priceCurrency","")
            if p: return f"{c} {p}".strip() if c else str(p)
        if isinstance(offers, list) and offers:
            p, c = offers[0].get("price"), offers[0].get("priceCurrency","")
            if p: return f"{c} {p}".strip() if c else str(p)
    for pat in [r"price.*sale|sale.*price|special.*price",
                r"price.*current|now.*price",
                r"product.*price|item.*price",
                r"\bprice\b"]:
        el = soup.find(class_=re.compile(pat, re.I))
        if el:
            m = _PRICE_RE.search(el.get_text())
            if m: return m.group(0).strip()
    og = soup.find("meta", property=re.compile(r"og:price:amount|product:price:amount", re.I))
    if og and og.get("content"):
        curr = soup.find("meta", property=re.compile(r"og:price:currency", re.I))
        c = (curr and curr.get("content") or "").strip()
        return f"{c} {og['content'].strip()}".strip() if c else og["content"].strip()
    m = _PRICE_RE.search(soup.get_text())
    return m.group(0).strip() if m else None

def _page_type(url: str, soup: BeautifulSoup, ld: List[dict]) -> str:
    path = urlparse(url).path
    for item in ld:
        t = item.get("@type","")
        if isinstance(t, list): t = " ".join(t)
        if "Product" in t: return "product"
        if t in ("CollectionPage","ItemList","ProductCollection"): return "category"
    og = soup.find("meta", property=re.compile(r"og:type", re.I))
    if og and "product" in (og.get("content") or "").lower():
        return "product"
    if _PRODUCT_PATH.search(path):  return "product"
    if _CATEGORY_PATH.search(path): return "category"
    if (soup.find(attrs={"class": re.compile(r"add.?to.?cart|buy.?now|atc|add.?to.?bag", re.I)})
        or soup.find("button", string=re.compile(r"add to cart|buy now|add to bag", re.I))):
        return "product"
    cards = soup.find_all(class_=re.compile(r"product.?card|product.?item|product.?tile|listing.?item", re.I))
    if len(cards) >= 4:
        return "category"
    return "page"

def _cents_to_dollars(price: str) -> str:
    """Convert Shopify cents (19999) to dollars (199.99)."""
    p = price.strip()
    if p.isdigit() and len(p) >= 4:
        cents = int(p)
        return f"{cents // 100}.{cents % 100:02d}"
    return p


def _discover_variants(html: str, base_url: str) -> Dict[str, dict]:
    soup = BeautifulSoup(html, "lxml")
    parsed = urlparse(base_url)
    base = f"{parsed.scheme}://{parsed.netloc}{parsed.path}"
    variants: Dict[str, dict] = {}

    # 1. Extract variant data from JSON-LD and embedded JSON
    for sc in soup.find_all("script"):
        text = sc.string or ""
        if not text.strip():
            continue

        # Try full JSON parse for application/json or application/ld+json
        stype = (sc.get("type") or "").lower()
        if stype in ("application/json", "application/ld+json"):
            try:
                data = json.loads(text)
                items = []
                if isinstance(data, dict):
                    items.append(data)
                    graph = data.get("@graph", [])
                    if isinstance(graph, list):
                        items.extend(graph)
                    for key in ("product", "Product"):
                        sub = data.get(key)
                        if isinstance(sub, dict):
                            items.append(sub)
                    # Only search dicts (single product) not arrays (collection lists)
                    if isinstance(data, dict):
                        def _find_variants(obj, depth=0):
                            if depth > 3 or not isinstance(obj, dict):
                                return
                            for vkey in ("variants", "Variants", "variants_list"):
                                vlist = obj.get(vkey)
                                if isinstance(vlist, list) and len(vlist) > 0:
                                    for v in vlist:
                                        if not isinstance(v, dict):
                                            continue
                                        vid = str(v.get("id", "")) or str(v.get("sku", ""))
                                        if not vid or not vid.isdigit():
                                            continue
                                        title = v.get("title", "") or v.get("name", "") or v.get("option1", "")
                                        price = v.get("price", "")
                                        if vid not in variants:
                                            variants[vid] = {"url": f"{base}?variant={vid}"}
                                        if title and title != "Default Title":
                                            variants[vid]["title"] = title
                                        if price:
                                            variants[vid]["price"] = _cents_to_dollars(str(price))
                            for val in obj.values():
                                if isinstance(val, dict):
                                    _find_variants(val, depth + 1)
                        _find_variants(data)

                    # JSON-LD offers (at root item or graph)
                    for item in items:
                        offers = item.get("offers")
                        if offers:
                            if isinstance(offers, dict):
                                offers = [offers]
                            for offer in offers:
                                if not isinstance(offer, dict):
                                    continue
                                vid = str(offer.get("sku", "")) or str(offer.get("itemOffered", {}).get("@id", ""))
                                price = offer.get("price")
                                price_currency = offer.get("priceCurrency", "")
                                if price and str(price).replace(".","").isdigit():
                                    vid = vid or f"opt_{len(variants)}"
                                    if vid not in variants:
                                        variants[vid] = {"url": f"{base}?variant={vid}"}
                                    if price:
                                        variants[vid]["price"] = _cents_to_dollars(str(price))

                        # JSON-LD hasVariant
                        has_variants = item.get("hasVariant", [])
                        if isinstance(has_variants, list):
                            for vitem in has_variants:
                                if not isinstance(vitem, dict):
                                    continue
                                vname = vitem.get("name", "")
                                vurl = vitem.get("url", "")
                                vid = str(vitem.get("sku", "")) or vname or f"opt_{len(variants)}"
                                if vid not in variants:
                                    variants[vid] = {"url": vurl or f"{base}?variant={vid}"}
                                if vname:
                                    variants[vid]["title"] = vname
            except (json.JSONDecodeError, Exception):
                pass

        # 2. Page-specific inline script: enrich already-discovered variants with titles/prices
        #    Only checks scripts that contain the current product's URL path (not shared scripts)
        stype = (sc.get("type") or "").lower()
        if stype not in ("application/json", "application/ld+json") and sc.get("src") is None:
            path_lower = parsed.path.lower()
            if path_lower and path_lower != "/" and path_lower in text.lower() and '"variants"' in text:
                for m in re.finditer(r'"id"\s*:\s*(\d{7,})\s*.*?"title"\s*:\s*"([^"]+)"', text):
                    vid, label = m.group(1), m.group(2)
                    if vid in variants and not variants[vid].get("title"):
                        variants[vid]["title"] = label
                for m in re.finditer(r'"id"\s*:\s*(\d{7,})[^}]{0,300}"price"\s*:\s*"([\d.]+)"', text):
                    vid, price_val = m.group(1), m.group(2)
                    if vid in variants and not variants[vid].get("price"):
                        variants[vid]["price"] = _cents_to_dollars(price_val)

    # 3. <a> tags with ?variant= (links to variant pages)
    for tag in soup.find_all("a", href=True):
        m = re.search(r"[?&]variant=(\w+)", tag["href"])
        if m:
            vid = m.group(1)
            label = tag.get_text(strip=True)
            variants.setdefault(vid, {"url": f"{base}?variant={vid}"})
            if label and not variants[vid].get("title"):
                variants[vid]["title"] = label

    # 4. <select> variant dropdowns
    for sel in soup.find_all("select"):
        name = (sel.get("name") or sel.get("id") or "").lower()
        if not re.search(r"variant|option|id", name):
            continue
        for opt in sel.find_all("option"):
            vid = (opt.get("value") or "").strip()
            if vid and vid.isdigit() and len(vid) >= 7:
                label = opt.get_text(strip=True)
                if vid not in variants:
                    variants[vid] = {"url": f"{base}?variant={vid}"}
                if label and not variants[vid].get("title"):
                    variants[vid]["title"] = label

    # 5. data-variant-id attributes — only enrich variants already found by JSON (step 1)
    #    to avoid picking up cross-sell/related product variant IDs
    for tag in soup.find_all(attrs={"data-variant-id": True}):
        vid = (tag["data-variant-id"] or "").strip()
        if vid and vid in variants:
            label = tag.get("data-label", "") or tag.get_text(strip=True) or ""
            # Skip if the label looks like a price (cross-sell price tags, not option names)
            if label and not re.match(r'^[\$£€₹]?\s?\d', label) and not variants[vid].get("title"):
                variants[vid]["title"] = label

    return variants

def extract_page(html: str, url: str) -> dict:
    soup_raw = BeautifulSoup(html, "lxml")
    ld = _json_ld(soup_raw)
    soup = BeautifulSoup(html, "lxml")
    for t in soup.find_all(["script","style","noscript","iframe"]):
        t.decompose()
    _strip_boilerplate(soup)
    ptype = _page_type(url, soup, ld)
    page_title = _title(soup)
    page_price = _price(soup, ld) if ptype == "product" else None
    content = _extract_content(soup)
    variants: dict = {}
    if ptype == "product":
        raw_variants = _discover_variants(html, url)
        for vid, vdata in raw_variants.items():
            entry: dict = {"url": vdata["url"]}
            if vdata.get("title") and vdata["title"] != page_title:
                entry["title"] = vdata["title"]
            if vdata.get("price") and vdata["price"] != page_price:
                entry["price"] = vdata["price"]
            variants[vid] = entry
    result: dict = {"page_type": ptype, "title": page_title, "content": content}
    if page_price:
        result["price"] = page_price
    if variants:
        result["variants"] = variants
    return result

# ─────────────────────────────────────────────────────────────────────────────
# LINK EXTRACTOR (for homepage only)
# ─────────────────────────────────────────────────────────────────────────────

def extract_internal_links(html: str, base_url: str, domain: str, scheme: str) -> Set[str]:
    """Extract all internal, non‑skip, non‑blog HTTP/HTTPS links from HTML."""
    soup = BeautifulSoup(html, "lxml")
    links: Set[str] = set()
    for tag in soup.find_all("a", href=True):
        href = tag["href"].strip()
        if not href or href.startswith(("javascript:","mailto:","tel:","#","data:")):
            continue
        abs_url = urljoin(base_url, href)
        parsed = urlparse(abs_url)
        if parsed.netloc != domain or parsed.scheme not in ("http","https"):
            continue
        path = parsed.path.rstrip("/") or "/"
        if any(path.lower().endswith(ext) for ext in _SKIP_EXT):
            continue
        if _SKIP_PATH.search(path):
            continue
        # Skip content sections (blogs, articles)
        if _CONTENT_SECTION.search(path):
            continue
        clean = urlunparse((scheme, domain, path, "", "", ""))
        links.add(clean)
    return links

# ─────────────────────────────────────────────────────────────────────────────
# SLUG & PATH HELPERS
# ─────────────────────────────────────────────────────────────────────────────

def _slug(url: str) -> str:
    p = urlparse(url)
    parts = [s for s in p.path.strip("/").split("/") if s]
    return "_".join(parts) if parts else p.netloc.replace(".", "_") or "home"

def _site_name(url: str) -> str:
    domain = urlparse(url).netloc
    domain = re.sub(r'^www\.', '', domain)
    return domain.rsplit('.', 1)[0]

def _is_product_detail_url(url: str) -> bool:
    path = urlparse(url).path.rstrip('/')
    if not path or not _PRODUCT_PATH.search(path):
        return False
    segments = [s for s in path.split('/') if s]
    for i, s in enumerate(segments):
        if re.match(r'^(products?|item|p|detail|pd|dp|sku|goods)$', s, re.I):
            if i + 1 < len(segments):
                return True
    return False

def url_to_local_path(url: str, mirror_dir: Path) -> Path:
    parsed = urlparse(url)
    path = parsed.path.strip("/")
    if not path:
        return mirror_dir / "index.html"
    parts = Path(path)
    suffix = parts.suffix.lower()
    if suffix in (".html", ".htm"):
        return mirror_dir / path
    elif suffix in (".css", ".js"):
        return mirror_dir / path
    else:
        return mirror_dir / path / "index.html"

# ─────────────────────────────────────────────────────────────────────────────
# CRAWLSTORE & LOCAL PARSER (unchanged)
# ─────────────────────────────────────────────────────────────────────────────

class CrawlStore:
    def __init__(self, domain: str):
        self.domain = domain
        self.products: Dict[str, dict] = {}
        self.categories: Dict[str, dict] = {}
        self.pages: Dict[str, dict] = {}

    def add(self, url: str, data: dict):
        slug = _slug(url)
        ptype = data["page_type"]
        entry: dict = {"url": url, "title": data.get("title",""), "content": data.get("content",[])}
        if ptype == "product":
            if data.get("price"):
                entry["price"] = data["price"]
            if data.get("variants"):
                entry["variants"] = data["variants"]
            self.products[slug] = entry
        elif ptype == "category":
            existing = self.categories.get(slug, {})
            prod_slugs = existing.get("product_slugs", [])
            self.categories[slug] = {**entry, "product_slugs": prod_slugs}
        else:
            self.pages[slug] = entry

    def link_product_to_category(self, product_url: str, category_url: str):
        ps = _slug(product_url)
        cs = _slug(category_url)
        if cs in self.categories and ps in self.products:
            slugs = self.categories[cs].setdefault("product_slugs", [])
            if ps not in slugs:
                slugs.append(ps)

    def deduplicate(self):
        counts: Dict[str, int] = {}
        all_entries = list(self.products.values()) + list(self.categories.values()) + list(self.pages.values())
        for e in all_entries:
            for item in e.get("content", []):
                k = item["text"].lower()
                counts[k] = counts.get(k, 0) + 1
        total = len(all_entries)
        threshold = max(3, int(total * 0.30))
        common = {k for k, v in counts.items() if v >= threshold}
        removed = 0
        for e in all_entries:
            orig = e.get("content", [])
            kept = [i for i in orig if i["text"].lower() not in common]
            removed += len(orig) - len(kept)
            e["content"] = kept
        print(f"🧹  Dedup: removed {removed} repeated items (appeared on ≥{threshold} pages)")

    def to_dict(self) -> dict:
        return {
            "domain": self.domain,
            "crawled_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "counts": {"products": len(self.products), "categories": len(self.categories), "pages": len(self.pages)},
            "products": self.products,
            "categories": self.categories,
            "pages": self.pages,
        }

    def save(self, path: str = "ecommerce_data.json"):
        data = self.to_dict()
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        kb = len(json.dumps(data)) / 1024
        print(f"💾  Saved → {path}  ({kb:.0f} KB  |  {len(self.products)} products, {len(self.categories)} categories, {len(self.pages)} pages)")

class LocalParser:
    def __init__(self, mirror_dir: str = None):
        self.mirror_dir = Path(mirror_dir) if mirror_dir else Path("site_mirror")
        self.manifest_file = self.mirror_dir / "_manifest.json"

    def _load_manifest(self) -> dict:
        if not self.manifest_file.exists():
            raise FileNotFoundError(f"No manifest found at {self.manifest_file}. Run download mode first.")
        return json.loads(self.manifest_file.read_text(encoding="utf-8"))

    def parse(self, output_file: str = "ecommerce_data.json") -> CrawlStore:
        manifest = self._load_manifest()
        domain = manifest["domain"]
        saved = manifest["saved"]
        print(f"\n📖  PHASE 2 — PARSE LOCAL MIRROR")
        print(f"📁  Mirror dir : {self.mirror_dir.resolve()}")
        print(f"📄  Pages to parse: {len(saved)}")
        print("─" * 60)
        store = CrawlStore(domain)
        t0 = time.time()
        for i, (url, local_path) in enumerate(saved.items(), 1):
            p = Path(local_path)
            if not p.exists():
                print(f"  [{i:>4}]  ⚠  missing: {local_path}")
                continue
            parsed = urlparse(url)
            print(f"  [{i:>4}]  📄  {parsed.path or '/'}")
            try:
                html = p.read_text(encoding="utf-8", errors="replace")
            except Exception as exc:
                print(f"    ✗  read error: {exc}")
                continue
            data = extract_page(html, url)
            store.add(url, data)
        elapsed = time.time() - t0
        print("─" * 60)
        print(f"✅  Parsed {len(saved)} pages in {elapsed:.1f}s")
        print("\n🧹  Running dedup …")
        store.deduplicate()
        store.save(output_file)
        return store

# ─────────────────────────────────────────────────────────────────────────────
# ENHANCED DOWNLOADER: SITEMAP + HOMEPAGE LINK EXTRACTION
# ─────────────────────────────────────────────────────────────────────────────

class SiteDownloaderHybrid:
    MANIFEST_FILE = "_manifest.json"

    def __init__(
        self,
        start_url: str,
        mirror_dir: str = None,
        max_pages: int = 5000,
        max_concurrent: int = 8,
        request_timeout: int = 20,
        delay: float = 0.0,
        use_playwright: bool = True,
        skip_content_sections: bool = True,
        extract_from_homepage: bool = True,   # NEW: also get links from homepage
    ):
        parsed = urlparse(start_url)
        self.start_url = start_url.rstrip("/")
        self.scheme = parsed.scheme
        self.domain = parsed.netloc
        self.mirror_dir = Path(mirror_dir) if mirror_dir else Path(_site_name(start_url))
        self.max_pages = max_pages
        self.max_concurrent = max_concurrent
        self.timeout = request_timeout
        self.delay = delay
        self.use_playwright = use_playwright
        self.skip_content = skip_content_sections
        self.extract_from_homepage = extract_from_homepage

        self.visited: Set[str] = set()
        self.saved: Dict[str, str] = {}
        self.page_count = 0
        self._lock = asyncio.Lock()

    # ---------- Sitemap handling ----------
    def _find_sitemap(self) -> Optional[str]:
        candidates = [f"{self.start_url}/sitemap.xml", f"{self.start_url}/sitemap_index.xml", f"{self.start_url}/sitemap/sitemap.xml"]
        for cand in candidates:
            try:
                resp = requests.head(cand, timeout=5)
                if resp.status_code == 200:
                    return cand
            except:
                continue
        return None

    def _parse_sitemap(self, sitemap_url: str) -> List[str]:
        try:
            resp = requests.get(sitemap_url, timeout=10)
            resp.raise_for_status()
        except:
            return []
        ns = {'sitemap': 'http://www.sitemaps.org/schemas/sitemap/0.9'}
        root = ET.fromstring(resp.content)
        urls = []
        if root.find('sitemap:sitemap', ns) is not None:
            for sitemap in root.findall('sitemap:sitemap', ns):
                loc = sitemap.find('sitemap:loc', ns).text
                urls.extend(self._parse_sitemap(loc))
        else:
            for url in root.findall('sitemap:url', ns):
                loc = url.find('sitemap:loc', ns).text
                urls.append(loc)
        return urls

    def _should_skip(self, url: str) -> bool:
        path = urlparse(url).path.lower().rstrip('/')
        if _LOCALE_PATH.search(path):
            return True
        if not self.skip_content:
            return False
        if _CONTENT_SECTION.search(path):
            return True
        return False

    # ---------- Download logic ----------
    def _local_path(self, url: str) -> Path:
        return url_to_local_path(url, self.mirror_dir)

    def _write(self, url: str, html: str) -> Path:
        local = self._local_path(url)
        local.parent.mkdir(parents=True, exist_ok=True)
        local.write_text(html, encoding="utf-8")
        return local

    def _load_manifest(self):
        mf = self.mirror_dir / self.MANIFEST_FILE
        if mf.exists():
            data = json.loads(mf.read_text(encoding="utf-8"))
            self.saved = data.get("saved", {})
            self.visited = set(self.saved.keys())
            print(f"📂  Resuming mirror — {len(self.visited)} pages already saved")

    def _save_manifest(self):
        mf = self.mirror_dir / self.MANIFEST_FILE
        self.mirror_dir.mkdir(parents=True, exist_ok=True)
        mf.write_text(json.dumps({"domain": self.domain, "saved": self.saved, "saved_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())}, indent=2, ensure_ascii=False), encoding="utf-8")

    async def _worker(self, session: aiohttp.ClientSession, queue: asyncio.Queue):
        while True:
            url = await queue.get()
            try:
                async with self._lock:
                    if url in self.visited or self.page_count >= self.max_pages:
                        continue
                    self.visited.add(url)
                    self.page_count += 1
                    n = self.page_count
                parsed = urlparse(url)
                print(f"  [{n:>4}]  ⬇  {parsed.path or '/'}")
                html = await smart_fetch(session, url, self.timeout, self.use_playwright)
                if not html:
                    continue
                local = self._write(url, html)
                if self.delay > 0:
                    await asyncio.sleep(self.delay)
                async with self._lock:
                    self.saved[url] = str(local)
            finally:
                queue.task_done()

    async def _run(self):
        t0 = time.time()
        self.mirror_dir.mkdir(parents=True, exist_ok=True)
        self._load_manifest()

        # 1. Get URLs from sitemap
        sitemap_url = self._find_sitemap()
        all_target_urls: Set[str] = set()
        if sitemap_url:
            print(f"\n📇  Found sitemap: {sitemap_url}")
            sitemap_urls = self._parse_sitemap(sitemap_url)
            print(f"📄  Total URLs in sitemap: {len(sitemap_urls)}")
            for url in sitemap_urls:
                if not self._should_skip(url) and urlparse(url).netloc == self.domain:
                    all_target_urls.add(url)
            print(f"✅  Added {len(all_target_urls)} URLs from sitemap (skipped blogs/articles)")
        else:
            print("\n⚠️  No sitemap found. Will rely on homepage link extraction.")

        # 2. If enabled, fetch homepage and extract additional internal links
        if self.extract_from_homepage:
            print(f"\n🔍  Extracting additional links from homepage: {self.start_url}")
            try:
                # Fetch homepage using smart_fetch (with session later, but we need a temp fetch)
                # We'll create a temporary session just for this one fetch
                conn = aiohttp.TCPConnector()
                async with aiohttp.ClientSession(connector=conn, headers=REQUEST_HEADERS, auto_decompress=False) as temp_session:
                    home_html = await smart_fetch(temp_session, self.start_url, self.timeout, self.use_playwright)
                if home_html:
                    extra_links = extract_internal_links(home_html, self.start_url, self.domain, self.scheme)
                    # Remove any that are already in our set or that should be skipped
                    new_links = {u for u in extra_links if u not in all_target_urls and not self._should_skip(u)}
                    if new_links:
                        print(f"✅  Found {len(new_links)} additional internal links not in sitemap:")
                        for link in sorted(new_links)[:10]:
                            print(f"     {link}")
                        if len(new_links) > 10:
                            print(f"     ... and {len(new_links)-10} more")
                        all_target_urls.update(new_links)
                    else:
                        print("   No additional internal links found.")
                else:
                    print("   Failed to fetch homepage.")
            except Exception as e:
                print(f"   Error extracting homepage links: {e}")

        # 3. Limit to max_pages
        final_urls = list(all_target_urls)[:self.max_pages]
        print(f"\n📥  Total pages to download: {len(final_urls)}")
        if len(final_urls) == 0:
            print("No URLs to download. Exiting.")
            return

        queue: asyncio.Queue = asyncio.Queue()
        for url in final_urls:
            if url not in self.visited:
                queue.put_nowait(url)

        conn = aiohttp.TCPConnector(limit=self.max_concurrent, limit_per_host=self.max_concurrent, ttl_dns_cache=300, enable_cleanup_closed=True)
        async with aiohttp.ClientSession(connector=conn, headers=REQUEST_HEADERS, auto_decompress=False) as session:
            workers = [asyncio.create_task(self._worker(session, queue)) for _ in range(self.max_concurrent)]
            await queue.join()
            for w in workers:
                w.cancel()
            await asyncio.gather(*workers, return_exceptions=True)

        self._save_manifest()
        elapsed = time.time() - t0
        print("─" * 60)
        print(f"✅  Downloaded {self.page_count} pages in {elapsed:.1f}s")
        print(f"💾  Mirror saved to: {self.mirror_dir.resolve()}\n")

    def download(self):
        asyncio.run(self._run())
        return self.mirror_dir

# ─────────────────────────────────────────────────────────────────────────────
# DATASTORE (unchanged)
# ─────────────────────────────────────────────────────────────────────────────

class EcommerceDataStore:
    def __init__(self, data: dict):
        self.domain = data.get("domain","")
        self.crawled_at = data.get("crawled_at","")
        self.products = data.get("products",{})
        self.categories = data.get("categories",{})
        self.pages = data.get("pages",{})

    @classmethod
    def from_file(cls, path: str) -> "EcommerceDataStore":
        with open(path, encoding="utf-8") as f:
            return cls(json.load(f))

    def _searchable(self, entry: dict) -> str:
        parts = [entry.get("title",""), entry.get("price","")]
        for item in entry.get("content",[]):
            parts.append(item["text"])
        return " ".join(parts).lower()

    def find(self, query: str) -> List[dict]:
        q = query.lower()
        results = []
        for slug, p in self.products.items():
            if q in self._searchable(p):
                results.append({"type":"product","slug":slug,**p})
        for slug, c in self.categories.items():
            if q in self._searchable(c):
                results.append({"type":"category","slug":slug,**c})
        for slug, pg in self.pages.items():
            if q in self._searchable(pg):
                results.append({"type":"page","slug":slug,**pg})
        return results

    def get_product(self, slug: str) -> Optional[dict]:
        return self.products.get(slug)

    def get_category(self, slug: str) -> Optional[dict]:
        return self.categories.get(slug)

    def get_page(self, slug: str) -> Optional[dict]:
        return self.pages.get(slug)

    def products_in_category(self, category_slug: str) -> List[dict]:
        cat = self.categories.get(category_slug, {})
        return [{"slug": s, **self.products[s]} for s in cat.get("product_slugs",[]) if s in self.products]

    def summary(self) -> dict:
        total_variants = sum(len(p.get("variants",{})) for p in self.products.values())
        return {
            "domain": self.domain,
            "crawled_at": self.crawled_at,
            "products": len(self.products),
            "product_variants": total_variants,
            "categories": len(self.categories),
            "pages": len(self.pages),
        }

# ─────────────────────────────────────────────────────────────────────────────
# MAIN ENTRY POINT
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":

    TARGET_URL = "https://bulliesandco.com/"

    site_name = _site_name(TARGET_URL)
    mirror_dir = site_name
    raw_output = f"{site_name}_raw_data.json"
    final_output = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data", f"{site_name}_responses.json")

    print(f"\n📥  Downloading pages using hybrid method (sitemap + homepage links) from {TARGET_URL} ...")
    downloader = SiteDownloaderHybrid(
        start_url=TARGET_URL,
        mirror_dir=mirror_dir,
        max_pages=5000,
        max_concurrent=8,
        request_timeout=20,
        delay=0.0,
        use_playwright=True,
        skip_content_sections=True,
        extract_from_homepage=True,   # THIS gets footer links like privacy policy, refund, etc.
    )
    downloader.download()

    if len(downloader.saved) > 0:
        print(f"\n📖  Parsing local mirror from '{mirror_dir}/' ...")
        parser = LocalParser(mirror_dir=mirror_dir)
        store = parser.parse(output_file=raw_output)
    else:
        print("\n⚠️  No pages downloaded. Exiting.")
        sys.exit(1)

    print("=" * 60)
    ds = EcommerceDataStore.from_file(raw_output)
    print(json.dumps(ds.summary(), indent=2))

    script_dir = os.path.dirname(os.path.abspath(__file__))
    lp_script = os.path.join(script_dir, "llm-processor.js")
    dp_script = os.path.join(script_dir, "data-processor.js")

    # Prefer the new LLM-based processor; fall back to the rule-based processor
    if os.path.exists(lp_script):
        print(f"\n🧠  Running llm-processor.js ...")
        subprocess.run(["node", lp_script, raw_output, final_output], capture_output=False, cwd=script_dir)
        print(f"✅  Pre-built responses saved to: {final_output}")
    elif os.path.exists(dp_script):
        print(f"\n📊  Running data-processor.js (legacy rule-based) ...")
        subprocess.run(["node", dp_script, raw_output, final_output], capture_output=False, cwd=script_dir)
        print(f"✅  Final knowledge data saved to: {final_output}")
    else:
        print(f"\n⚠️  No processor script found. Skipping.")