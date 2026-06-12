/**
 * Retrieval Engine - Loads corpus and provides BM25 search
 */

import { BM25 } from './bm25.js';

export class RetrievalEngine {
  constructor() {
    this.corpus = null;
    this.bm25 = null;
    this.ready = false;
  }
  
  /**
   * Load corpus from API
   */
  async load(chatbotId) {
    try {
      const response = await fetch(`/api/public/corpus/${chatbotId}`);
      if (!response.ok) {
        throw new Error(`Failed to load corpus: ${response.status}`);
      }
      
      this.corpus = await response.json();
      this.bm25 = new BM25(this.corpus.documents);
      this.ready = true;
      
      console.log(`✅ Corpus loaded: ${this.corpus.document_count} documents`);
      return true;
    } catch (error) {
      console.error('❌ Failed to load corpus:', error);
      return false;
    }
  }
  
  /**
   * Search corpus and return top results
   */
  search(query, topN = 3, scoreThreshold = 0.4) {
    if (!this.ready) {
      console.warn('Retrieval engine not ready');
      return { results: [], outOfDomain: true };
    }
    
    const results = this.bm25.search(query, topN * 3); // Get more candidates
    
    // Check if top result meets threshold
    const topScore = results.length > 0 ? results[0].score : 0;
    const outOfDomain = topScore < scoreThreshold;
    
    if (outOfDomain) {
      return { results: [], outOfDomain: true, topScore: 0 };
    }
    
    // Smart filtering: prioritize specific responses (price, variants) over general
    const filtered = this._prioritizeResults(results);
    
    return {
      results: filtered.slice(0, topN),
      outOfDomain: false,
      topScore
    };
  }
  
  /**
   * Prioritize specific response types over general ones
   */
  _prioritizeResults(results) {
    if (results.length === 0) return results;
    
    // Group by product slug
    const bySlug = new Map();
    results.forEach(result => {
      const slug = result.doc.meta.slug || 'other';
      if (!bySlug.has(slug)) {
        bySlug.set(slug, []);
      }
      bySlug.get(slug).push(result);
    });
    
    // For each product, pick the most specific response type
    const prioritized = [];
    const typePriority = { price: 3, variants: 2, general: 1 };
    
    bySlug.forEach((docs) => {
      // Sort by: response type priority, then score
      docs.sort((a, b) => {
        const aPriority = typePriority[a.doc.meta.response_type] || 0;
        const bPriority = typePriority[b.doc.meta.response_type] || 0;
        
        if (aPriority !== bPriority) {
          return bPriority - aPriority; // Higher priority first
        }
        
        return b.score - a.score; // Higher score first
      });
      
      // Take the best one for this slug
      prioritized.push(docs[0]);
    });
    
    // Sort by original BM25 score
    prioritized.sort((a, b) => b.score - a.score);
    
    return prioritized;
  }
  
  /**
   * Get document by ID
   */
  getDocument(docId) {
    if (!this.corpus) return null;
    return this.corpus.documents.find(d => d.id === docId);
  }
  
  /**
   * Get all documents of a specific type
   */
  getDocumentsByType(type) {
    if (!this.corpus) return [];
    return this.corpus.documents.filter(d => d.meta.type === type);
  }
}
