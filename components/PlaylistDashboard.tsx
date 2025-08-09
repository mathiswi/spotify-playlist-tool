'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PlaylistTable } from '@/components/playlists/PlaylistTable'
import { AlbumTable } from '@/components/albums/AlbumTable'
import { TrackManager } from '@/components/tracks/TrackManager'
import { SearchManager } from '@/components/search/SearchManager'
import { useTrackStore } from '@/stores/trackStore'

export function PlaylistDashboard() {
  const { selectedTracks } = useTrackStore()

  return (
    <div className="w-full">
      <Tabs defaultValue="playlists" className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger value="playlists">Select Playlists</TabsTrigger>
          <TabsTrigger value="albums">Select Albums</TabsTrigger>
          <TabsTrigger value="search">Search Spotify</TabsTrigger>
          <TabsTrigger value="tracks" className="relative">
            Manage Tracks
            {selectedTracks.size > 0 && (
              <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs rounded-full min-h-5 min-w-5 px-1 flex items-center justify-center">
                {selectedTracks.size}
              </span>
            )}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="playlists" className="space-y-4">
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Your Spotify Playlists</h2>
            <p className="text-gray-600 mb-6">
              Select the playlists you want to aggregate tracks from. You can select multiple playlists
              and then load all their tracks for filtering and management.
            </p>
            <PlaylistTable />
          </div>
        </TabsContent>
        
        <TabsContent value="albums" className="space-y-4">
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Albums from Selected Playlists</h2>
            <p className="text-gray-600 mb-6">
              Select specific albums to add their tracks to your queue. Load tracks from playlists first to see available albums.
            </p>
            <AlbumTable />
          </div>
        </TabsContent>
        
        <TabsContent value="search" className="space-y-4">
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Search Spotify</h2>
            <p className="text-gray-600 mb-6">
              Search for tracks and albums in Spotify&apos;s entire catalog to add to your selection.
            </p>
            <SearchManager />
          </div>
        </TabsContent>
        
        <TabsContent value="tracks" className="space-y-4">
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Track Management</h2>
            <p className="text-gray-600 mb-6">
              Filter and sort tracks from your selected playlists. Search by name, artist, or album, and save your filtered results to a new playlist.
            </p>
            <TrackManager />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}