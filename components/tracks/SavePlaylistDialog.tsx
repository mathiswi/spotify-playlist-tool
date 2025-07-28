'use client'

import { useState } from 'react'
import { EnrichedTrack } from '@/types/spotify'
import { createSpotifyPlaylist, addTracksToSpotifyPlaylist } from '@/lib/actions/playlist-actions'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'

interface SavePlaylistDialogProps {
  tracks: EnrichedTrack[]
}

export function SavePlaylistDialog({ tracks }: SavePlaylistDialogProps) {
  const [open, setOpen] = useState(false)
  const [playlistName, setPlaylistName] = useState('')
  const [playlistDescription, setPlaylistDescription] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const { toast } = useToast()

  const handleSave = async () => {
    if (!playlistName.trim()) return

    setSaving(true)
    setSuccess(false)

    try {
      // Create the playlist
      const playlist = await createSpotifyPlaylist(
        playlistName.trim(),
        playlistDescription.trim() || undefined,
        isPublic
      )

      // Add tracks to the playlist
      const trackUris = tracks.map(track => track.uri)
      await addTracksToSpotifyPlaylist(playlist.id, trackUris)

      setSuccess(true)
      toast({
        title: "Playlist created successfully!",
        description: `"${playlistName}" has been saved to your Spotify library with ${tracks.length} tracks.`,
      })
      
      // Reset form after success
      setTimeout(() => {
        setOpen(false)
        setPlaylistName('')
        setPlaylistDescription('')
        setIsPublic(false)
        setSuccess(false)
      }, 2000)
      
    } catch (error) {
      console.error('Error creating playlist:', error)
      toast({
        variant: "destructive",
        title: "Failed to create playlist",
        description: error instanceof Error ? error.message : "Something went wrong. Please try again.",
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          Save as New Playlist ({tracks.length} tracks)
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Playlist</DialogTitle>
          <DialogDescription>
            Save {tracks.length} filtered tracks to a new Spotify playlist.
          </DialogDescription>
        </DialogHeader>
        
        {success ? (
          <div className="text-center py-8">
            <div className="text-green-600 text-lg mb-2">✓ Playlist Created!</div>
            <p className="text-sm text-gray-600">
              Your playlist &ldquo;{playlistName}&rdquo; has been created successfully.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">
                Playlist Name *
              </label>
              <Input
                id="name"
                value={playlistName}
                onChange={(e) => setPlaylistName(e.target.value)}
                placeholder="My Awesome Playlist"
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium">
                Description (optional)
              </label>
              <Input
                id="description"
                value={playlistDescription}
                onChange={(e) => setPlaylistDescription(e.target.value)}
                placeholder="Created with Spotify Playlist Tool"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="public"
                checked={isPublic}
                onCheckedChange={(checked) => setIsPublic(checked === true)}
              />
              <label htmlFor="public" className="text-sm font-medium">
                Make playlist public
              </label>
            </div>
          </div>
        )}
        
        {!success && (
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!playlistName.trim() || saving}
            >
              {saving ? 'Creating...' : 'Create Playlist'}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}