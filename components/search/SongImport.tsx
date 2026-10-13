'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { useTrackStore } from '@/stores/trackStore'
import { parseSongList, searchTracksByTitleArtist, type SongMatch } from '@/lib/actions/search-actions'
import { SpotifyTrack } from '@/types/spotify'

export function SongImport() {
  const [text, setText] = useState('')
  const [matches, setMatches] = useState<SongMatch[]>([])
  const [skipped, setSkipped] = useState<string[]>([])
  const [usedGemini, setUsedGemini] = useState(false)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { addSearchedTracks } = useTrackStore()

  const handleParse = async () => {
    if (!text.trim()) return

    setIsLoading(true)
    setError(null)

    try {
      const parsed = await parseSongList(text)
      setUsedGemini(parsed.usedGemini)
      setSkipped(parsed.skipped)

      if (parsed.queries.length === 0) {
        setMatches([])
        setSelected(new Set())
        setError('No songs could be parsed from the input.')
        return
      }

      const results = await searchTracksByTitleArtist(parsed.queries)
      setMatches(results)
      setSelected(new Set(results.map((r, i) => (r.track ? i : -1)).filter((i) => i >= 0)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse or search')
    } finally {
      setIsLoading(false)
    }
  }

  const toggle = (index: number) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  const handleAdd = () => {
    const tracks = matches
      .filter((m, i) => selected.has(i) && m.track)
      .map((m) => m.track as SpotifyTrack)
    if (tracks.length === 0) return

    addSearchedTracks(tracks)
    setMatches([])
    setSkipped([])
    setSelected(new Set())
    setText('')
  }

  const foundCount = matches.filter((m) => m.track).length
  const missingCount = matches.filter((m) => !m.track).length

  return (
    <div className="space-y-4">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={'Paste a song list, e.g.\nmonster und falling inside the black von skillet\nmy demons und it has begun von starset\ngimme more - machinae supremacy'}
        rows={6}
        disabled={isLoading}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      />
      <Button onClick={handleParse} disabled={!text.trim() || isLoading}>
        {isLoading ? 'Parsing & searching...' : 'Parse & search'}
      </Button>

      {usedGemini && (
        <p className="text-xs text-gray-500">Parsed with Gemini.</p>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-red-800 text-sm">Error: {error}</p>
        </div>
      )}

      {matches.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              {foundCount} matched{missingCount > 0 ? `, ${missingCount} not found` : ''}
            </p>
            <Button onClick={handleAdd} disabled={selected.size === 0} size="sm">
              Add {selected.size} track{selected.size !== 1 ? 's' : ''}
            </Button>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <tbody>
                {matches.map((m, i) => (
                  <tr key={i} className="border-b last:border-b-0 hover:bg-gray-50">
                    <td className="p-2 w-10 align-top">
                      <Checkbox
                        checked={selected.has(i)}
                        disabled={!m.track}
                        onCheckedChange={() => toggle(i)}
                      />
                    </td>
                    <td className="p-2">
                      <div className="text-sm font-medium">
                        {m.song} <span className="text-gray-400">—</span> {m.artist}
                      </div>
                      <div className="text-sm text-gray-500">
                        {m.track ? (
                          <>
                            → {m.track.name} by {m.track.artists.map((a) => a.name).join(', ')}
                          </>
                        ) : (
                          <span className="text-gray-400">No match found</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {skipped.length > 0 && (
        <div className="text-xs text-gray-500">
          <p className="font-medium">Skipped {skipped.length} line{skipped.length !== 1 ? 's' : ''}:</p>
          <ul className="list-disc list-inside mt-1">
            {skipped.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
