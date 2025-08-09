'use client'

import { EnrichedTrack } from '@/types/spotify'
import { useTrackStore } from '@/stores/trackStore'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import Image from 'next/image'

interface TrackTableProps {
  tracks: EnrichedTrack[]
}

function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

export function TrackTable({ tracks }: TrackTableProps) {
  const { selectedTracks, toggleTrackSelection } = useTrackStore()

  if (tracks.length === 0) {
    return (
      <div className="text-center p-8 text-gray-500">
        No tracks match your current filters.
      </div>
    )
  }

  const selectedFilteredTracks = tracks.filter(track => selectedTracks.has(track.id))
  const allFilteredSelected = tracks.length > 0 && selectedFilteredTracks.length === tracks.length

  const handleSelectAll = () => {
    if (allFilteredSelected) {
      // Deselect all filtered tracks
      tracks.forEach(track => {
        if (selectedTracks.has(track.id)) {
          toggleTrackSelection(track.id)
        }
      })
    } else {
      // Select all filtered tracks
      tracks.forEach(track => {
        if (!selectedTracks.has(track.id)) {
          toggleTrackSelection(track.id)
        }
      })
    }
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Checkbox
                checked={allFilteredSelected}
                onCheckedChange={handleSelectAll}
                aria-label="Select all tracks"
              />
            </TableHead>
            <TableHead className="w-16">Cover</TableHead>
            <TableHead>Track</TableHead>
            <TableHead>Artist</TableHead>
            <TableHead>Album</TableHead>
            <TableHead className="w-20">Duration</TableHead>
            <TableHead>Playlist</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tracks.map((track, index) => (
            <TableRow key={`${track.id}-${track.playlistId}-${index}`} className={track.isDuplicate ? 'bg-yellow-50' : ''}>
              <TableCell>
                <Checkbox
                  checked={selectedTracks.has(track.id)}
                  onCheckedChange={() => toggleTrackSelection(track.id)}
                  aria-label={`Select ${track.name}`}
                />
              </TableCell>
              <TableCell>
                {track.album.images && track.album.images.length > 0 && track.album.images[0] && (
                  <Image
                    src={track.album.images[0].url}
                    alt={track.album.name}
                    width={40}
                    height={40}
                    className="rounded"
                  />
                )}
              </TableCell>
              <TableCell className="font-medium">
                <div>
                  <div className="font-semibold">{track.name}</div>
                  {track.explicit && (
                    <span className="inline-block px-1 py-0.5 text-xs bg-gray-200 text-gray-700 rounded">
                      E
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                {track.artists.map(artist => artist.name).join(', ')}
              </TableCell>
              <TableCell>{track.album.name}</TableCell>
              <TableCell className="font-mono">
                {formatDuration(track.duration_ms)}
              </TableCell>
              <TableCell>
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                  {track.playlistName}
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}