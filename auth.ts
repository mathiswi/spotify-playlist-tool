import NextAuth from "next-auth"
import Spotify from "next-auth/providers/spotify"

const scope = "user-read-email user-read-private playlist-read-private playlist-read-collaborative playlist-modify-public playlist-modify-private"

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Spotify({
      authorization: `https://accounts.spotify.com/authorize?scope=${scope}`,
    })
  ],
  trustHost: true,
  callbacks: {
    async session({ session, token }) {
      session.token = token
      return session
    },
    async jwt({ token, account }) {
      if (account) {
        token.id = account.id
        token.expires_at = account.expires_at
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
      }
      
      // Check if token is expired and refresh if needed
      if (token.expires_at && Date.now() > token.expires_at * 1000) {
        try {
          console.log('Token expired, refreshing...')
          const response = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'Authorization': `Basic ${Buffer.from(`${process.env.AUTH_SPOTIFY_ID}:${process.env.AUTH_SPOTIFY_SECRET}`).toString('base64')}`,
            },
            body: new URLSearchParams({
              grant_type: 'refresh_token',
              refresh_token: token.refreshToken as string,
            }),
          })
          
          if (response.ok) {
            const refreshedTokens = await response.json()
            token.accessToken = refreshedTokens.access_token
            token.expires_at = Math.floor(Date.now() / 1000) + refreshedTokens.expires_in
            if (refreshedTokens.refresh_token) {
              token.refreshToken = refreshedTokens.refresh_token
            }
            console.log('Token refreshed successfully')
          } else {
            console.error('Failed to refresh token:', response.status, response.statusText)
          }
        } catch (error) {
          console.error('Error refreshing token:', error)
        }
      }
      
      return token
    }
  },
  session: {
    strategy: "jwt"
  }
})