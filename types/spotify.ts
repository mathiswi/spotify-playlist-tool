export interface SpotifyImage {
  url: string
  height: number | null
  width: number | null
}

export interface SpotifyArtist {
  external_urls: {
    spotify: string
  }
  href: string
  id: string
  name: string
  type: 'artist'
  uri: string
}

export interface SpotifyAlbum {
  album_type: string
  total_tracks: number
  available_markets: string[]
  external_urls: {
    spotify: string
  }
  href: string
  id: string
  images: SpotifyImage[]
  name: string
  release_date: string
  release_date_precision: string
  type: 'album'
  uri: string
  artists: SpotifyArtist[]
}

export interface SpotifyTrack {
  album: SpotifyAlbum
  artists: SpotifyArtist[]
  available_markets: string[]
  disc_number: number
  duration_ms: number
  explicit: boolean
  external_ids: {
    isrc?: string
  }
  external_urls: {
    spotify: string
  }
  href: string
  id: string
  is_playable: boolean
  linked_from?: object
  restrictions?: object
  name: string
  popularity: number
  preview_url: string | null
  track_number: number
  type: 'track'
  uri: string
  is_local: boolean
}

export interface SpotifyPlaylistTrack {
  added_at: string
  added_by: {
    external_urls: {
      spotify: string
    }
    followers: {
      href: string | null
      total: number
    }
    href: string
    id: string
    type: 'user'
    uri: string
    display_name?: string
  }
  is_local: boolean
  track: SpotifyTrack
}

export interface SpotifyPlaylist {
  collaborative: boolean
  description: string | null
  external_urls: {
    spotify: string
  }
  followers: {
    href: string | null
    total: number
  }
  href: string
  id: string
  images: SpotifyImage[]
  name: string
  owner: {
    external_urls: {
      spotify: string
    }
    followers: {
      href: string | null
      total: number
    }
    href: string
    id: string
    type: 'user'
    uri: string
    display_name?: string
  }
  public: boolean | null
  snapshot_id: string
  tracks: {
    href: string
    limit: number
    next: string | null
    offset: number
    previous: string | null
    total: number
    items: SpotifyPlaylistTrack[]
  }
  type: 'playlist'
  uri: string
}


export interface EnrichedTrack extends SpotifyTrack {
  playlistId: string
  playlistName: string
  isDuplicate?: boolean
}

export interface PlaylistsResponse {
  href: string
  limit: number
  next: string | null
  offset: number
  previous: string | null
  total: number
  items: SpotifyPlaylist[]
}