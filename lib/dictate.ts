/**
 * WHERE DICTATED WORDS GO (T-1747), pure, so test/dictate.test.ts covers it.
 * The words a browser's speech recognition hears have no punctuation and no
 * spacing of their own; this puts them into a field's text at the cursor (or
 * over the selection), with a space where two words would otherwise run
 * together, none beside punctuation or a line break, and never a full stop or
 * a comma of its own: the writer punctuates. A box with a length limit takes
 * only what fits, cut at a word.
 *
 * The microphone component is components/Dictate.tsx, copied from
 * snowai-app/hq's components/ui/Dictate.tsx; this file is new here.
 */
export type Inserted = {
  /** The whole text after the words went in (unchanged when nothing did). */
  value: string;
  /** Where the cursor goes: just after the words, before any space added after them. */
  caret: number;
  /** The words as they went in, after spacing and any cut; '' when nothing was added. */
  added: string;
  /** The words were cut to fit the limit. */
  cut: boolean;
  /** Nothing fitted at all. */
  full: boolean;
};

/** Nothing before this needs a space after it: a space, a line break or an opening bracket or quote. */
const OPENS = /[\s(\[{“‘]$/;
/** Nothing here needs a space before it: punctuation that closes a phrase. */
const CLOSES = /^[.,;:!?)\]}%]/;

export function insertAtSelection(value: string, start: number, end: number, spoken: string, max = 0): Inserted {
  let a = Math.max(0, Math.min(Number.isFinite(start) ? start : value.length, value.length));
  let b = Math.max(0, Math.min(Number.isFinite(end) ? end : value.length, value.length));
  if (a > b) [a, b] = [b, a];
  const words = spoken.replace(/\s+/g, ' ').trim();
  if (!words) return { value, caret: a, added: '', cut: false, full: false };

  const left = value.slice(0, a);
  const right = value.slice(b);
  const lead = left && !OPENS.test(left) && !CLOSES.test(words) ? ' ' : '';
  const trail = right && !/^[\s.,;:!?)\]}]/.test(right) ? ' ' : '';

  let put = words;
  let cut = false;
  if (max > 0) {
    const room = max - (left.length + right.length) - lead.length - trail.length;
    if (put.length > room) {
      cut = true;
      if (room <= 0) return { value, caret: a, added: '', cut: false, full: true };
      let head = put.slice(0, room);
      /* Cut at a word: back up to the last space unless the cut already falls between words. */
      if (put[room] !== ' ' && head.includes(' ')) head = head.slice(0, head.lastIndexOf(' '));
      put = head.trim();
      if (!put) return { value, caret: a, added: '', cut: false, full: true };
    }
  }
  return { value: `${left}${lead}${put}${trail}${right}`, caret: left.length + lead.length + put.length, added: `${lead}${put}${trail}`, cut, full: false };
}
