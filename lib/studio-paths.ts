/**
 * The studio's addresses, in one place: every room is a path, never a query
 * (the family's rule). `crumbFor` names where a person is for the band, and
 * `railCurrent` says which tab of the rail is the current one and, inside a
 * book, which of its rooms. Plain data and pure functions, so the tests can
 * load them.
 */
export const ROOMS = {
  books: '/studio',
  new: '/studio/new',
} as const;

export const bookPath = (id: string) => `/studio/book/${id}`;
export const outlinePath = (id: string) => `/studio/book/${id}/outline`;
export const sourcesPath = (id: string) => `/studio/book/${id}/sources`;
export const disclosurePath = (id: string) => `/studio/book/${id}/disclosure`;
export const filesPath = (id: string) => `/studio/book/${id}/files`;
export const chapterPath = (id: string, n: number) => `/studio/book/${id}/${n}`;

/** The rooms inside a book, in the order the rail lists them. */
export type BookRoom = 'overview' | 'outline' | 'chapter' | 'sources' | 'disclosure' | 'files';
export type Current = { tab: 'books' | 'new' | null; book?: string; room?: BookRoom; chapter?: number };

/** Which rail entry a path belongs to; inside a book, which room. */
export function railCurrent(path: string): Current {
  const p = path.replace(/\/+$/, '') || '/';
  if (p === ROOMS.books) return { tab: 'books' };
  if (p === ROOMS.new) return { tab: 'new' };
  const m = /^\/studio\/book\/([^/]+)(?:\/([^/]+))?$/.exec(p);
  if (m) {
    const [, book, rest] = m;
    if (!rest) return { tab: 'books', book, room: 'overview' };
    if (rest === 'outline' || rest === 'sources' || rest === 'disclosure' || rest === 'files') return { tab: 'books', book, room: rest };
    if (/^\d+$/.test(rest)) return { tab: 'books', book, room: 'chapter', chapter: Number(rest) };
  }
  return { tab: null };
}

const ROOM_NAME: Record<BookRoom, string> = { overview: 'Book', outline: 'Outline', chapter: 'Chapter', sources: 'Sources', disclosure: 'AI disclosure', files: 'Files' };

/** The band's crumb for a page: [bold word, the room]. */
export function crumbFor(path: string): [string, string] {
  const c = railCurrent(path);
  if (c.tab === 'new') return ['Imprint', 'New book'];
  if (c.book && c.room) return ['Imprint', `${ROOM_NAME[c.room]}${c.chapter ? ` ${c.chapter}` : ''}`];
  return ['Imprint', c.tab ? 'Books' : 'Studio'];
}
