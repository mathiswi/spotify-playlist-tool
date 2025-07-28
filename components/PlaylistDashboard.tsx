'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PlaylistTable } from '@/components/playlists/PlaylistTable'
import { TrackManager } from '@/components/tracks/TrackManager'

export function PlaylistDashboard() {
  return (
    <div className="w-full">
      <Tabs defaultValue="playlists" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="playlists">Select Playlists</TabsTrigger>
          <TabsTrigger value="tracks">Manage Tracks</TabsTrigger>
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
        
        <TabsContent value="tracks" className="space-y-4">
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Track Management</h2>
            <p className="text-gray-600 mb-6">
              Filter and sort tracks from your selected playlists. Use BPM filtering to find tracks
              within specific tempo ranges, search by name, artist, or album, and save your filtered
              results to a new playlist.
            </p>
            <TrackManager />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}