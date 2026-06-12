export function cleanWhitespace(text) {
  return text.replace(/\s+/g, ' ').trim();
}

export function unescapeHtml(text) {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'");
}

export function correctCommonTypos(text) {
  const typos = {
    shoe: 'show',
    biles: 'bikes',
    biek: 'bike',
    byke: 'bike',
    bicicle: 'bicycle',
    teh: 'the',
    wat: 'what',
    wht: 'what',
    pls: 'please',
    u: 'you',
    ur: 'your',
    wanna: 'want to',
    gonna: 'going to',
    dont: "don't",
    cant: "can't",
    wont: "won't",
    couldnt: "couldn't",
    wouldnt: "wouldn't",
    didnt: "didn't",
    doesnt: "doesn't",
    im: "I'm",
    thats: "that's",
    whats: "what's",
    heres: "here's",
    theres: "there's",
    theyre: "they're",
    youre: "you're",
  };
  let result = text;
  for (const [wrong, right] of Object.entries(typos)) {
    result = result.replace(RegExp('\\b' + wrong + '\\b', 'gi'), right);
  }
  return result;
}

export function preprocess(text) {
  return correctCommonTypos(unescapeHtml(cleanWhitespace(text)));
}
