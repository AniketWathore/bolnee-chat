/**
 * Context Memory - Session-scoped conversation context
 * Handles pronouns, ellipsis, entity tracking, preferences
 */

export class ContextMemory {
  constructor() {
    this.lastEntity = null;           // {type, id, name, slug}
    this.lastIntent = null;           // "PRICE", "CONTACT", etc.
    this.entityHistory = [];          // Last 5 entities
    this.preferences = {};            // budget, color, size, etc.
    this.turnCount = 0;
    this.variationCounters = new Map(); // "intent:slug" -> counter
  }
  
  /**
   * Detect pronouns and ellipsis patterns
   */
  _needsResolution(query) {
    const lower = query.toLowerCase().trim();
    const words = lower.split(/\s+/);
    
    // Only resolve very clear pronouns
    if (/^(it|this|that|them|those)(\s|$)/.test(lower)) {
      return 'pronoun';
    }
    
    // Ellipsis detection (starts with conjunction) - must be very short
    if (words.length <= 3 && /^(and|but|also|or)\b/.test(lower)) {
      return 'ellipsis';
    }
    
    // Single word follow-up questions
    if (words.length === 1 && /^(price|cost|color|size|available|stock)$/.test(lower)) {
      return 'short';
    }
    
    // Follow-up continuation markers (any other, more, others, etc.)
    const singleWords = /^(any|more|other|another|else|others|yes|ok|okay|sure|yeah)$/i;
    const multiWords = /^(show more|give more|list more|any other)$/i;
    if (words.length <= 2 && (singleWords.test(lower) || multiWords.test(lower))) {
      return 'continuation';
    }
    
    return null;
  }
  
  /**
   * Resolve query using conversation history
   */
  resolve(query) {
    const resolutionType = this._needsResolution(query);
    
    if (!resolutionType || !this.lastEntity) {
      // Extract preferences for future use
      this._extractPreferences(query);
      return query;
    }
    
    // Replace pronouns with entity name
    let resolved = query;
    if (resolutionType === 'pronoun') {
      resolved = query.replace(
        /\b(it|this|that)\b/gi,
        this.lastEntity.name || 'that item'
      );
    }
    
    // For ellipsis or short queries, prepend entity name
    if (resolutionType === 'ellipsis' || resolutionType === 'short') {
      resolved = `${this.lastEntity.name} ${resolved}`;
    }
    
    // For continuation markers like "any other", "more", let the intent carry-over handle it
    // No query transformation needed — intent detection will use lastIntent
    
    return resolved;
  }
  
  /**
   * Extract preferences from query
   */
  _extractPreferences(query) {
    const lower = query.toLowerCase();
    
    // Budget extraction
    const budgetMatch = lower.match(/under|below|less than|max|maximum.*?(\d+)/);
    if (budgetMatch) {
      this.preferences.budgetMax = parseInt(budgetMatch[1]);
    }
    
    // Color extraction (basic)
    const colors = ['black', 'white', 'red', 'blue', 'green', 'yellow', 'gold', 'silver', 'pink', 'purple', 'brown', 'gray', 'orange'];
    colors.forEach(color => {
      if (lower.includes(color)) {
        this.preferences.colorPreference = color;
      }
    });
    
    // Size extraction
    const sizeMatch = lower.match(/\b(small|medium|large|xl|xxl|xs|\d+\s*(inch|cm|mm))\b/i);
    if (sizeMatch) {
      this.preferences.sizePreference = sizeMatch[0];
    }
  }
  
  /**
   * Update memory after successful response
   */
  update(entity, intent) {
    if (entity) {
      // Update last entity
      this.lastEntity = entity;
      
      // Add to history (keep last 5)
      this.entityHistory.unshift(entity);
      if (this.entityHistory.length > 5) {
        this.entityHistory = this.entityHistory.slice(0, 5);
      }
    }
    
    if (intent) {
      this.lastIntent = intent;
    }
    
    this.turnCount++;
  }
  
  /**
   * Get variation index for intent:entity combination
   */
  getVariation(intent, entitySlug) {
    if (!intent) return 0;
    
    const key = entitySlug ? `${intent}:${entitySlug}` : intent;
    const current = this.variationCounters.get(key) || 0;
    
    // Increment counter
    this.variationCounters.set(key, current + 1);
    
    return current;
  }
  
  /**
   * Check if entity was recently discussed
   */
  wasRecentlyDiscussed(entitySlug) {
    return this.entityHistory.some(e => e.slug === entitySlug);
  }
  
  /**
   * Reset session (for testing or new conversation)
   */
  reset() {
    this.lastEntity = null;
    this.lastIntent = null;
    this.entityHistory = [];
    this.preferences = {};
    this.turnCount = 0;
    this.variationCounters.clear();
  }
}
