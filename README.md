# Spotify Playlist Manager

Web application for advanced Spotify playlist management with search, filtering, and bulk operations.

![Spotify Playlist Manager Preview](public/images/preview.png)

## Features

- **Multi-source track aggregation**: Combine tracks from multiple playlists and albums
- **Search integration**: Search Spotify's entire catalog for tracks, albums, and artists
- **Advanced filtering**: Filter by artist, album, track name, or audio features
- **Bulk operations**: Select, deselect, and manage multiple tracks simultaneously
- **Playlist creation**: Save filtered selections as new Spotify playlists
- **Album browsing**: Browse and add entire albums to your selection

## Architecture

### Tech Stack

- **Framework**: Next.js 15 (App Router) with TypeScript
- **Authentication**: NextAuth.js v5 with Spotify OAuth
- **State Management**: Zustand for client-side state
- **UI Components**: shadcn/ui with Radix UI primitives
- **Styling**: Tailwind CSS
- **Data Fetching**: Server Actions with streaming responses

### Project Structure

```
spotify-playlist-tool/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   └── auth/         # NextAuth.js endpoints
│   ├── dashboard/        # Main application page
│   └── layout.tsx        # Root layout with providers
├── components/            # React components
│   ├── albums/           # Album-related components
│   ├── playlists/        # Playlist management
│   ├── search/           # Search functionality
│   ├── tracks/           # Track management
│   └── ui/              # Reusable UI components
├── lib/                   # Core libraries
│   ├── actions/          # Server Actions
│   └── spotify/          # Spotify API integration
├── stores/               # Zustand stores
└── types/                # TypeScript definitions
```

## Installation

### Prerequisites

- Node.js 18+ 
- npm or pnpm
- Spotify Developer account

### Setup

1. Clone repository:
```bash
git clone <repository-url>
cd spotify-playlist-tool
npm install
```

2. Configure Spotify App:
   - Visit [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
   - Create new application
   - Add redirect URI: `http://localhost:3000/api/auth/callback/spotify`
   - Note Client ID and Client Secret

3. Configure environment:
```bash
cp .env.example .env.local
```

Edit `.env.local`:
```env
NEXTAUTH_SECRET=<generate-with-openssl-rand-base64-32>
NEXTAUTH_URL=http://localhost:3000
AUTH_SPOTIFY_ID=<spotify-client-id>
AUTH_SPOTIFY_SECRET=<spotify-client-secret>
```

4. Start development server:
```bash
npm run dev
```

## API Integration

### Authentication Flow

The application uses NextAuth.js with Spotify OAuth provider. Required scopes:
- `user-read-private`
- `user-read-email`
- `playlist-read-private`
- `playlist-read-collaborative`
- `playlist-modify-public`
- `playlist-modify-private`

### Server Actions

Key server actions in `lib/actions/`:

- `fetchUserPlaylists()`: Retrieve user's playlists
- `fetchPlaylistTracks()`: Load tracks from selected playlists
- `fetchAlbumTracks()`: Load tracks from albums
- `searchSpotify()`: Search Spotify catalog
- `createPlaylist()`: Create new playlist with selected tracks

### State Management

Zustand store (`stores/trackStore.ts`) manages:
- Track selection state
- Filtering and sorting
- Playlist metadata
- Search results
- UI state

## Development

### Available Scripts

```bash
npm run dev       # Development server with Turbopack
npm run build     # Production build
npm run start     # Production server
npm run lint      # ESLint validation
```

### Key Dependencies

- `next`: 15.4.4
- `next-auth`: 5.0.0-beta
- `zustand`: 5.0.6
- `@tanstack/react-table`: 8.21.3
- `@radix-ui/*`: UI primitives
- `lucide-react`: Icons

## Deployment

### Vercel

1. Connect GitHub repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Update Spotify redirect URI to production URL
4. Deploy

### Environment Variables

Production requires:
- `NEXTAUTH_SECRET`: Secure random string
- `NEXTAUTH_URL`: Production URL
- `AUTH_SPOTIFY_ID`: Spotify Client ID
- `AUTH_SPOTIFY_SECRET`: Spotify Client Secret

## Performance Considerations

- Server Actions use streaming for large playlist fetches
- Track data is paginated (50 items per request)
- Client-side filtering for responsive UI
- Debounced search input

## Security

- OAuth tokens stored in encrypted JWT
- Server-side API calls only
- CSRF protection via NextAuth
- Environment variables for sensitive data

## License

MIT