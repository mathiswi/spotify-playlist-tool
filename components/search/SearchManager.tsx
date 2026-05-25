'use client'

import { useMemo, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { searchSpotify } from '@/lib/actions/search-actions'
import { SearchResults } from './SearchResults'
import { Search } from 'lucide-react'
import { SpotifyTrack, SpotifyAlbum, SpotifyPlaylist } from '@/types/spotify'

type SearchType = 'track' | 'album' | 'playlist'

const TYPE_LABELS: Record<SearchType, string> = {
  track: 'Tracks',
  album: 'Albums',
  playlist: 'Playlists',
}

const ALL_TYPES: SearchType[] = ['track', 'album', 'playlist']

export function SearchManager() {
  const [query, setQuery] = useState('')
  const [selectedTypes, setSelectedTypes] = useState<Set<SearchType>>(
    new Set(ALL_TYPES)
  )
  const [searchedTypes, setSearchedTypes] = useState<SearchType[]>([])
  const [searchResults, setSearchResults] = useState<{
    tracks?: { items: SpotifyTrack[] }
    albums?: { items: SpotifyAlbum[] }
    playlists?: { items: SpotifyPlaylist[] }
    inaccessiblePlaylistCount?: number
  } | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toggleType = (type: SearchType) => {
    setSelectedTypes((prev) => {
      const next = new Set(prev)
      if (next.has(type)) {
        // Don't allow emptying the selection
        if (next.size === 1) return prev
        next.delete(type)
      } else {
        next.add(type)
      }
      return next
    })
  }

  const handleSearch = async () => {
    if (!query.trim() || selectedTypes.size === 0) return

    setIsSearching(true)
    setError(null)

    const typesToSearch = ALL_TYPES.filter((t) => selectedTypes.has(t))

    try {
      const results = await searchSpotify(query, typesToSearch)
      setSearchResults(results)
      setSearchedTypes(typesToSearch)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search')
      setSearchResults(null)
    } finally {
      setIsSearching(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const gridColsClass = useMemo(() => {
    switch (searchedTypes.length) {
      case 1:
        return 'grid-cols-1'
      case 2:
        return 'grid-cols-2'
      default:
        return 'grid-cols-3'
    }
  }, [searchedTypes.length])

  return (
    <div className="space-y-6">
      {/* Type filter chips */}
      <div className="flex flex-wrap gap-2">
        {ALL_TYPES.map((type) => {
          const active = selectedTypes.has(type)
          return (
            <Button
              key={type}
              type="button"
              size="sm"
              variant={active ? 'default' : 'outline'}
              onClick={() => toggleType(type)}
              disabled={isSearching}
              aria-pressed={active}
            >
              {TYPE_LABELS[type]}
            </Button>
          )
        })}
      </div>

      {/* Search Input */}
      <div className="flex gap-2">
        <Input
          placeholder="Search for tracks, albums, or playlists..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyPress={handleKeyPress}
          className="flex-1"
          disabled={isSearching}
        />
        <Button
          onClick={handleSearch}
          disabled={!query.trim() || isSearching || selectedTypes.size === 0}
        >
          <Search className="w-4 h-4 mr-2" />
          {isSearching ? 'Searching...' : 'Search'}
        </Button>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Error: {error}</p>
        </div>
      )}

      {/* Search Results */}
      {searchResults && searchedTypes.length > 0 && (
        <div className="space-y-4">
          <Tabs defaultValue={searchedTypes[0]} className="w-full">
            {searchedTypes.length > 1 && (
              <TabsList className={`grid w-full ${gridColsClass}`}>
                {searchedTypes.includes('track') && (
                  <TabsTrigger value="track">
                    Tracks ({searchResults.tracks?.items?.length || 0})
                  </TabsTrigger>
                )}
                {searchedTypes.includes('album') && (
                  <TabsTrigger value="album">
                    Albums ({searchResults.albums?.items?.length || 0})
                  </TabsTrigger>
                )}
                {searchedTypes.includes('playlist') && (
                  <TabsTrigger value="playlist">
                    Playlists ({searchResults.playlists?.items?.length || 0})
                  </TabsTrigger>
                )}
              </TabsList>
            )}

            {searchedTypes.includes('track') && (
              <TabsContent value="track" className="mt-4">
                {searchResults.tracks?.items && searchResults.tracks.items.length > 0 ? (
                  <SearchResults
                    type="tracks"
                    items={searchResults.tracks.items}
                  />
                ) : (
                  <p className="text-gray-500 text-center py-8">No tracks found</p>
                )}
              </TabsContent>
            )}

            {searchedTypes.includes('album') && (
              <TabsContent value="album" className="mt-4">
                {searchResults.albums?.items && searchResults.albums.items.length > 0 ? (
                  <SearchResults
                    type="albums"
                    items={searchResults.albums.items}
                  />
                ) : (
                  <p className="text-gray-500 text-center py-8">No albums found</p>
                )}
              </TabsContent>
            )}

            {searchedTypes.includes('playlist') && (
              <TabsContent value="playlist" className="mt-4 space-y-3">
                {searchResults.inaccessiblePlaylistCount !== undefined &&
                  searchResults.inaccessiblePlaylistCount > 0 && (
                    <div className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded px-3 py-2">
                      {searchResults.inaccessiblePlaylistCount} Spotify-curated{' '}
                      {searchResults.inaccessiblePlaylistCount === 1 ? 'playlist is' : 'playlists are'}{' '}
                      hidden — third-party apps can&apos;t access editorial or
                      algorithmic playlists (Today&apos;s Top Hits, Discover
                      Weekly, daily mixes, etc.) since Spotify&apos;s Nov 2024
                      API changes.
                    </div>
                  )}
                {searchResults.playlists?.items && searchResults.playlists.items.length > 0 ? (
                  <SearchResults
                    type="playlists"
                    items={searchResults.playlists.items}
                  />
                ) : (
                  <p className="text-gray-500 text-center py-8">No playlists found</p>
                )}
              </TabsContent>
            )}
          </Tabs>
        </div>
      )}

      {/* Initial State */}
      {!searchResults && !error && !isSearching && (
        <div className="text-center py-12 text-gray-500">
          <Search className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>Enter a search term to find tracks, albums, and playlists from Spotify</p>
        </div>
      )}
    </div>
  )
}
