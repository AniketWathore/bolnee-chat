# Graph Report - .  (2026-06-08)

## Corpus Check
- Large corpus: 249 files · ~3,402,135 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder.

## Summary
- 6598 nodes · 15880 edges · 1 communities
- Extraction: 74% EXTRACTED · 26% INFERRED · 0% AMBIGUOUS · INFERRED: 4167 edges (avg confidence: 0.8)
- Token cost: 3,411,127 input · 10,763 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Entire Corpus|Entire Corpus]]

## God Nodes (most connected - your core abstractions)
1. `_$` - 2609 edges
2. `ce()` - 363 edges
3. `xe()` - 199 edges
4. `be()` - 195 edges
5. `nt()` - 163 edges
6. `we()` - 150 edges
7. `ve()` - 91 edges
8. `me()` - 89 edges
9. `saved` - 86 edges
10. `variants` - 81 edges

## Surprising Connections (you probably didn't know these)
- `ShoeMart — Premium Footwear Demo` --references--> `Adidas Superstars Shoe Image`  [INFERRED]
  public/shoemart.html → public/img/adidassuperstars.webp
- `ShoeMart — Premium Footwear Demo` --references--> `Nike Air Force 1 Shoe Image`  [INFERRED]
  public/shoemart.html → public/img/nikeairforce1.webp
- `ShoeMart — Premium Footwear Demo` --references--> `Nike Air Max Shoe Image`  [INFERRED]
  public/shoemart.html → public/img/nikeairmax.webp
- `ShoeMart — Premium Footwear Demo` --references--> `Nike Jordan 1 Shoe Image`  [INFERRED]
  public/shoemart.html → public/img/nikejordan1.webp
- `ShoeMart — Premium Footwear Demo` --references--> `Sparx Runner Elite Shoe Image`  [INFERRED]
  public/shoemart.html → public/img/sparxrunnerelite.webp

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Bolnee Platform Architecture** — readme_chatbot_widget, readme_chat_worker, readme_intent_detector, readme_backend_server, readme_dashboard_react [EXTRACTED 1.00]
- **Message Processing Pipeline** — readme_embedding_based_classification, readme_knowledge_data_querying, readme_three_tier_response_generation, readme_handleclassifyresult [EXTRACTED 1.00]
- **Bullies & Co. Store Content** — bulliesandco_index_store, agents_md_index_agent_instructions, about_us_index_about_page, our_story_index_story_page, refund_policy_index_refund_policy, terms_of_service_index_tos, frontpage_index_featured_collection, all_index_collection [EXTRACTED 1.00]
- **Bullies & Co. Product Catalog** — miami_cuban_chain_gold_index_product, cuban_choke_chain_gold_index_product, miami_cuban_rose_gold_clasp_limited_edition_index_product, rose_gold_choke_chain_limited_edition_index_product, miami_cuban_chain_silver_index_product, cuban_choke_chain_silver_index_product, gold_cuban_link_chain_index_product [EXTRACTED 1.00]
- **Crawler Extraction Strategy Stack** — crawler_playwright_strategy, crawler_api_response_capture, crawler_multi_strategy_email_extraction, crawler_location_extraction, crawler_framework_detection, crawler_price_extraction [EXTRACTED 1.00]
- **Bullies & Co. Dog Collar Product Line** — products_cuban_choke_chain_gold_gold_cuban_choke_chain, products_cuban_choke_chain_silver_silver_miami_cuban_choke_chain, products_gold_cuban_link_chain_gold_cuban_link_clasp, products_miami_cuban_chain_gold_gold_miami_cuban_clasp, products_miami_cuban_chain_silver_silver_miami_cuban_clasp, products_miami_cuban_rose_gold_clasp_limited_edition_rose_gold_miami_cuban_clasp, products_rose_gold_choke_chain_limited_edition_rose_gold_choke_chain [INFERRED 0.95]
- **Leo Coffee Website Pages** — leocoffee_co_index_leo_coffee, pages_about_about_us, pages_contact_us_contact_us, pages_dealership_dealership, pages_mega_unlock_mega_unlock, pages_privacy_policy_privacy_policy, pages_store_locator_store_locator, pages_subscribe_subscribe, pages_terms_conditions_terms_and_conditions, pages_test_test_page, policies_refund_policy_refund_policy, leocoffee_co_agents_md_ucp_agent_instructions [INFERRED 0.95]
- **Leo Coffee Product Catalog** — collections_leocoffee, collections_all, collections_all_products, collections_all_blends, collections_pure_coffee_blends, collections_special_pure_coffee_blends, collections_filter_coffee_blends, collections_coffee_with_chicory_blends, collections_instant_coffee, collections_instant_coffee_b2g2, collections_instant_combo, collections_chicory, collections_freshly_ground_filter_coffee, collections_packed_filter_coffee, collections_filter_coffee_decoction, collections_coffee_equipments, collections_brass_equipment, collections_festive_combos, collections_horeca_and_bulk, collections_mega_unlock, collections_subscribe, collections_frontpage [INFERRED 0.95]
- **Leo Coffee Tracking & Analytics Stack** — collections_google_analytics, collections_google_tag_manager, collections_sendinblue, collections_leocoffee [EXTRACTED 1.00]
- **Coffee Product Categories** — collections_coffee_category_filter, collections_coffee_category_instant, collections_coffee_category_equipment, collections_coffee_category_chicory, collections_coffee_category_blends [INFERRED 0.85]
- **All Leo Coffee Products in Chunk 4** — products_2cupfilter2davarasets, products_4cupfilter4davarasets, products_4cuppercolatorkit, products_6cuppercolatorkit, products_brasscoffeefilter, products_brassdavara, products_brassfilterdavaraset, products_breakfastblend6040, products_caffeblend, products_chicoryblendrange, products_chicorycoffeedelightscombo, products_chicory, products_coffeepercolator4cup, products_coffeepercolator6cup, products_copyofbrasscoffeefilter2cups, products_degreeblend7030, products_filtercoffeedecoction, products_filtercoffeeranges, products_flowerpotcombo, products_hotelblend6040, policies_termsofservice [INFERRED 0.85]
- **Analytics and Tracking Stack** — index_google_analytics, index_facebook_pixel, index_clarity_analytics, index_google_tag_manager, index_pixel_ad_tracking [EXTRACTED 1.00]
- **Payment and Financing Ecosystem** — payment_plan_index_payment_plan, payment_plans_new_index_payment_plans_new, terms_conditions_index_terms_conditions, index_affirm_payment [EXTRACTED 1.00]
- **Community and Owner Network** — join_the_madsen_map_index_join_the_madsen_map, test_ride_index_test_ride, connect_with_an_owner_test_ride_a_bike_index_connect_with_an_owner_test_ride_a_bike, collabs_with_madsen_index_collabs_with_madsen, be_a_madsen_affiliate_index_be_a_madsen_affiliate, madsen_challenges_index_madsen_challenges [INFERRED 0.85]

## Communities (1 total, 0 thin omitted)

### Community 0 - "Entire Corpus"
Cohesion: 0.00
Nodes (5191): $schema, plugin, dependencies, @opencode-ai/plugin, SETUP_GUIDE.sh script, init(), deviceScore(), checkWebGPU() (+5183 more)

## Knowledge Gaps
- **2157 isolated node(s):** `$schema`, `plugin`, `@opencode-ai/plugin`, `SETUP_GUIDE.sh script`, `domain` (+2152 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Are the 359 inferred relationships involving `ce()` (e.g. with `a6()` and `a_t()`) actually correct?**
  _`ce()` has 359 INFERRED edges - model-reasoned connections that need verification._
- **Are the 198 inferred relationships involving `xe()` (e.g. with `a6()` and `a_t()`) actually correct?**
  _`xe()` has 198 INFERRED edges - model-reasoned connections that need verification._
- **Are the 194 inferred relationships involving `be()` (e.g. with `A9e()` and `aft()`) actually correct?**
  _`be()` has 194 INFERRED edges - model-reasoned connections that need verification._
- **Are the 161 inferred relationships involving `nt()` (e.g. with `_8()` and `a4()`) actually correct?**
  _`nt()` has 161 INFERRED edges - model-reasoned connections that need verification._
- **What connects `$schema`, `plugin`, `@opencode-ai/plugin` to the rest of the system?**
  _2167 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Entire Corpus` be split into smaller, more focused modules?**
  _Cohesion score 0.0007296619482626487 - nodes in this community are weakly interconnected._