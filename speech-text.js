/* Shared reading text: classic scripts and the optional audio build use one rule. */
(function (root) {
  'use strict';

  function text(value) {
    return String(value ?? '')
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/\b(who's|he's|she's)\s*=\s*(who is|he is|she is)\b/gi, (original, short, full) => {
        const expansions = { "who's": 'who is', "he's": 'he is', "she's": 'she is' };
        const key = short.toLowerCase();
        if (expansions[key] !== full.toLowerCase()) return original;
        const label = key.charAt(0).toUpperCase() + key.slice(1);
        return `${label} means ${expansions[key]}.`;
      })
      .replace(/\s*\/\s*/g, ', ')
      .replace(/\s*;\s*/g, '. ')
      .replace(/(?:\.\s*){2,}/g, '. ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // This is a lookup key, not text to display or pronounce. Keep ordinary
  // contractions and sentence punctuation in text() for the English speaker.
  function canonical(value) {
    return String(value ?? '').replace(/[\u2018\u2019]/g, "'")
      .replace(/\s+/g, ' ').trim().replace(/[.!?]+$/, '').toLowerCase();
  }

  function sentences(value) {
    return (text(value).match(/[^.!?]+[.!?]*/g) || [])
      .map(sentence => sentence.trim()).filter(Boolean);
  }

  function lesson(card, phonics) {
    // Read complete phonics examples, never bracketed spelling or letter names.
    if (phonics) return text(card?.sayModel);
    return (card?.lines || []).map(line => {
      const english = text(line.english);
      return english && (/[.!?]$/.test(english) ? english : english + '.');
    }).filter(Boolean).join(' ');
  }

  const api = { canonical, sentences, text, lesson };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.GardenSpeechText = api;
})(typeof window !== 'undefined' ? window : globalThis);
