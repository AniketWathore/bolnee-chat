/**
 * BM25 - Lightweight search ranking algorithm
 * Pure JavaScript, browser-compatible, ~4KB
 */

export class BM25 {
  constructor(documents, k1 = 1.5, b = 0.75) {
    this.k1 = k1;
    this.b = b;
    this.documents = documents;
    this.avgDocLength = 0;
    this.docCount = documents.length;
    this.idf = new Map();
    
    this._preprocess();
  }
  
  /**
   * Tokenize and clean text
   */
  _tokenize(text) {
    if (!text) return [];
    return text
      .toLowerCase()
      .match(/\b\w+\b/g) || [];
  }
  
  /**
   * Preprocess all documents - compute IDF and avg length
   */
  _preprocess() {
    const docLengths = [];
    const termDocFreq = new Map();
    
    // First pass: count term occurrences per document
    this.documents.forEach(doc => {
      const tokens = this._tokenize(doc.text);
      docLengths.push(tokens.length);
      
      const uniqueTerms = new Set(tokens);
      uniqueTerms.forEach(term => {
        termDocFreq.set(term, (termDocFreq.get(term) || 0) + 1);
      });
    });
    
    // Compute average document length
    this.avgDocLength = docLengths.reduce((a, b) => a + b, 0) / this.docCount;
    
    // Compute IDF for each term
    termDocFreq.forEach((docFreq, term) => {
      const idf = Math.log((this.docCount - docFreq + 0.5) / (docFreq + 0.5) + 1);
      this.idf.set(term, idf);
    });
  }
  
  /**
   * Calculate BM25 score for a single document against query
   */
  _score(queryTokens, docTokens, docLength) {
    const termFreq = new Map();
    docTokens.forEach(term => {
      termFreq.set(term, (termFreq.get(term) || 0) + 1);
    });
    
    let score = 0;
    queryTokens.forEach(term => {
      const tf = termFreq.get(term) || 0;
      if (tf === 0) return;
      
      const idf = this.idf.get(term) || 0;
      const numerator = tf * (this.k1 + 1);
      const denominator = tf + this.k1 * (1 - this.b + this.b * (docLength / this.avgDocLength));
      
      score += idf * (numerator / denominator);
    });
    
    return score;
  }
  
  /**
   * Search documents and return ranked results
   */
  search(query, topN = 3) {
    const queryTokens = this._tokenize(query);
    if (queryTokens.length === 0) return [];
    
    const results = this.documents.map((doc, idx) => {
      const docTokens = this._tokenize(doc.text);
      const score = this._score(queryTokens, docTokens, docTokens.length);
      
      return {
        idx,
        score,
        doc
      };
    });
    
    // Sort by score descending
    results.sort((a, b) => b.score - a.score);
    
    // Return top N
    return results.slice(0, topN);
  }
}
