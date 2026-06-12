export class ResponseFilter {
  constructor(maxRecent = 5) {
    this.recentResponses = [];
    this.maxRecent = maxRecent;
  }

  isRepeat(text) {
    return this.recentResponses.includes(text);
  }

  addToRecent(text) {
    this.recentResponses.push(text);
    if (this.recentResponses.length > this.maxRecent) {
      this.recentResponses.shift();
    }
  }

  getFiltered(candidates) {
    const filtered = candidates.filter(c => !this.isRepeat(c.text));
    return filtered.length > 0 ? filtered : candidates;
  }
}
