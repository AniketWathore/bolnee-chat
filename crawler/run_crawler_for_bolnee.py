#!/usr/bin/env python3
"""
Bolnee crawler runner: wraps SiteDownloaderHybrid + LocalParser from crawler.py
for per-chatbot website ingestion. Saves filtered/processed data to /data/{chatbotId}_website.json
"""
import argparse
import json
import os
import sys
import shutil
import tempfile
from pathlib import Path

# Ensure crawler.py is importable (same dir)
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from crawler import SiteDownloaderHybrid, LocalParser, _site_name

def main():
    parser = argparse.ArgumentParser(description="Bolnee website crawler")
    parser.add_argument("--url", required=True, help="Start URL to crawl")
    parser.add_argument("--output", required=True, help="Output JSON path (e.g. data/bot_xxx_website.json)")
    parser.add_argument("--chatbot-id", dest="chatbot_id", default="", help="Chatbot ID for metadata")
    parser.add_argument("--max-pages", dest="max_pages", type=int, default=50, help="Max pages to crawl")
    parser.add_argument("--no-playwright", dest="no_playwright", action="store_true", help="Disable Playwright")
    args = parser.parse_args()

    url = args.url
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)

    # Use temp mirror dir per chatbot to avoid collisions
    # If chatbot_id provided, use it in temp name
    suffix = args.chatbot_id or _site_name(url)
    mirror_dir = Path(tempfile.mkdtemp(prefix=f"bolnee_{suffix}_mirror_"))

    print(f"[bolnee-crawler] URL: {url}")
    print(f"[bolnee-crawler] Mirror: {mirror_dir}")
    print(f"[bolnee-crawler] Output: {output}")
    print(f"[bolnee-crawler] Max pages: {args.max_pages} Playwright: {not args.no_playwright}")

    try:
        downloader = SiteDownloaderHybrid(
            start_url=url,
            mirror_dir=str(mirror_dir),
            max_pages=args.max_pages,
            max_concurrent=6,
            request_timeout=20,
            delay=0.0,
            use_playwright=not args.no_playwright,
            skip_content_sections=True,
            extract_from_homepage=True,
        )
        downloader.download()

        if len(downloader.saved) == 0:
            print("[bolnee-crawler] No pages downloaded, writing empty result")
            empty = {
                "domain": url,
                "sourceUrl": url,
                "crawled_at": __import__("time").strftime("%Y-%m-%dT%H:%M:%SZ", __import__("time").gmtime()),
                "chatbotId": args.chatbot_id,
                "counts": {"products": 0, "categories": 0, "pages": 0},
                "products": {},
                "categories": {},
                "pages": {},
            }
            output.write_text(json.dumps(empty, indent=2, ensure_ascii=False), encoding="utf-8")
            print(f"[bolnee-crawler] Wrote empty to {output}")
            return 0

        # Parse mirror into structured store
        # Write raw intermediate then final
        raw_tmp = mirror_dir / "_raw_tmp.json"
        parser_obj = LocalParser(mirror_dir=str(mirror_dir))
        store = parser_obj.parse(output_file=str(raw_tmp))

        # Load the store dict and enrich with chatbotId + sourceUrl
        data = store.to_dict()
        # Add explicit fields for Bolnee
        data["sourceUrl"] = url
        data["chatbotId"] = args.chatbot_id
        # Preserve domain already there

        # Write final to requested output
        output.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
        kb = len(json.dumps(data)) / 1024
        print(f"[bolnee-crawler] Wrote {kb:.0f} KB to {output} ({data['counts']['products']} products, {data['counts']['pages']} pages)")
        return 0
    except Exception as e:
        print(f"[bolnee-crawler] ERROR: {e}", file=sys.stderr)
        import traceback; traceback.print_exc()
        # Write failure marker
        try:
            failure = {
                "domain": url,
                "sourceUrl": url,
                "chatbotId": args.chatbot_id,
                "error": str(e),
                "counts": {"products": 0, "categories": 0, "pages": 0},
                "products": {},
                "categories": {},
                "pages": {},
            }
            output.write_text(json.dumps(failure, indent=2, ensure_ascii=False), encoding="utf-8")
        except: pass
        return 1
    finally:
        # Cleanup mirror dir but keep output
        try:
            if mirror_dir.exists():
                shutil.rmtree(mirror_dir, ignore_errors=True)
                print(f"[bolnee-crawler] Cleaned mirror {mirror_dir}")
        except: pass

if __name__ == "__main__":
    sys.exit(main())
