import { auth } from "@/auth"
import { SignIn } from "@/components/sign-in"
import { SignOut } from "@/components/sign-out"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default async function Home() {
  const session = await auth()

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 w-full max-w-5xl items-center justify-center font-mono text-sm">
        <h1 className="text-4xl font-bold text-center mb-8">
          Spotify Playlist Tool
        </h1>
        
        {session ? (
          <div className="text-center space-y-4">
            <p className="mb-4">Welcome, {session.user?.name || session.user?.email}!</p>
            <Link href="/dashboard">
              <Button size="lg" className="mr-4">
                Open Playlist Manager
              </Button>
            </Link>
            <SignOut />
          </div>
        ) : (
          <div className="text-center">
            <p className="mb-4">Sign in to manage your Spotify playlists</p>
            <SignIn />
          </div>
        )}
      </div>
    </main>
  )
}
