'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { searchSpotify } from '@/lib/actions/search-actions'
import { SearchResults } from './SearchResults'
import { Search } from 'lucide-react'
import { SpotifyTrack, SpotifyAlbum } from '@/types/spotify'

export function SearchManager() {
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState<{
    tracks?: { items: SpotifyTrack[] }
    albums?: { items: SpotifyAlbum[] }
  } | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSearch = async () => {
    if (!query.trim()) return

    setIsSearching(true)
    setError(null)

    try {
      const results = await searchSpotify(query)
      setSearchResults(results)
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

  return (
    <div className="space-y-6">
      {/* Search Input */}
      <div className="flex gap-2">
        <Input
          placeholder="Search for tracks, albums, or artists..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyPress={handleKeyPress}
          className="flex-1"
          disabled={isSearching}
        />
        <Button 
          onClick={handleSearch}
          disabled={!query.trim() || isSearching}
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
      {searchResults && (
        <div className="space-y-4">
          <Tabs defaultValue="tracks" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="tracks">
                Tracks ({searchResults.tracks?.items?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="albums">
                Albums ({searchResults.albums?.items?.length || 0})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="tracks" className="mt-4">
              {searchResults.tracks?.items && searchResults.tracks.items.length > 0 ? (
                <SearchResults 
                  type="tracks" 
                  items={searchResults.tracks.items}
                />
              ) : (
                <p className="text-gray-500 text-center py-8">No tracks found</p>
              )}
            </TabsContent>

            <TabsContent value="albums" className="mt-4">
              {searchResults.albums?.items && searchResults.albums.items.length > 0 ? (
                <SearchResults 
                  type="albums" 
                  items={searchResults.albums.items}
                />
              ) : (
                <p className="text-gray-500 text-center py-8">No albums found</p>
              )}
            </TabsContent>
          </Tabs>
        </div>
      )}

      {/* Initial State */}
      {!searchResults && !error && !isSearching && (
        <div className="text-center py-12 text-gray-500">
          <Search className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>Enter a search term to find tracks and albums from Spotify</p>
        </div>
      )}
    </div>
  )
}