# 🎵 Spotify Playlist Manager

A web application for managing Spotify playlists and playlist creation.

## Features

- Select and combine tracks from multiple playlists
- Filter tracks by artist, album, or track name
- Sort tracks by various criteria
- Save filtered collections as new playlists

## Setup

### Prerequisites

- Node.js 18+
- Spotify Developer Account

### Installation

1. Clone and install:
```bash
git clone <your-repo-url>
cd spotify-playlist-tool
npm install
```

2. Create `.env.local`:
```bash
# Required
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000
AUTH_SPOTIFY_ID=your_spotify_client_id
AUTH_SPOTIFY_SECRET=your_spotify_client_secret

```

3. Set up Spotify app:
   - Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
   - Create new app
   - Add redirect URI: `http://localhost:3000/api/auth/callback/spotify`
   - Copy credentials to `.env.local`

4. Run development server:
```bash
npm run dev
```

## Tech Stack

- Next.js 15 with TypeScript
- shadcn/ui + Tailwind CSS
- NextAuth.js for Spotify authentication
- Zustand for state management

## Deployment

Deploy to Vercel by connecting your GitHub repository and adding the environment variables in your Vercel dashboard.

