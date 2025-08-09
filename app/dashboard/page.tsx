import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { PlaylistDashboard } from '@/components/PlaylistDashboard'

export default async function DashboardPage() {
  const session = await auth()

  if (!session) {
    redirect('/')
  }

  // Check if session has invalid tokens
  if (!session.token?.accessToken || !session.token?.refreshToken) {
    console.log('Dashboard: Invalid session tokens, redirecting to home')
    redirect('/')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Spotify Playlist Manager
          </h1>
          <p className="text-gray-600 mt-2">
            Select playlists, aggregate tracks, and create new playlists with advanced filtering
          </p>
        </div>
        
        <PlaylistDashboard />
      </div>
    </div>
  )
}