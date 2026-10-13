export interface SongQuery {
  song: string
  artist: string
}

export interface SongListParseResult {
  queries: SongQuery[]
  skipped: string[]
}

// Separators between multiple songs on a single line, e.g. "Song A und Song B von Artist".
// "und" is German for "and". Keep this conservative: "&" is safe, but "," is not
// (song titles sometimes contain commas).
const SONG_SEPARATOR = /\s+(?:und|and|&)\s+/i

/**
 * Deterministic fallback parser for pasted song lists. Handles the two regular
 * formats the UI is built around:
 *
 *   "Song A und Song B von Artist"   -> two songs by Artist
 *   "Song - Artist"                  -> one song by Artist
 *
 * Lines that don't match either pattern are collected in `skipped`.
 */
export function parseSongListWithRules(text: string): SongListParseResult {
  const queries: SongQuery[] = []
  const skipped: string[] = []

  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim()
    if (!line) continue

    const parsed = parseLine(line)
    if (parsed.length > 0) {
      queries.push(...parsed)
    } else {
      skipped.push(line)
    }
  }

  return { queries, skipped }
}

function parseLine(line: string): SongQuery[] {
  // "SONG1 und SONG2 von ARTIST"
  const von = line.match(/^(.+?)\s+von\s+(.+)$/i)
  if (von) {
    const artist = von[2].trim()
    return von[1]
      .split(SONG_SEPARATOR)
      .map((song) => song.trim())
      .filter(Boolean)
      .map((song) => ({ song, artist }))
  }

  // "SONG - ARTIST"
  const dash = line.match(/^(.+?)\s+-\s+(.+)$/)
  if (dash) {
    return [{ song: dash[1].trim(), artist: dash[2].trim() }]
  }

  return []
}
