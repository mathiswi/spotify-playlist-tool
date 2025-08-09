import NextAuth from "next-auth"
import Spotify from "next-auth/providers/spotify"

const scope = "user-read-email user-read-private playlist-read-private playlist-read-collaborative playlist-modify-public playlist-modify-private user-library-read"

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Spotify({
      authorization: `https://accounts.spotify.com/authorize?scope=${scope}`,
    })
  ],
  trustHost: true,
  callbacks: {
    async session({ session, token }) {
      // If token is invalid, mark session as invalid
      if (!token.accessToken || !token.refreshToken) {
        console.log('Session has invalid tokens, forcing re-authentication')
        session.token = { ...token, accessToken: null, refreshToken: null }
        // Add error property for invalid session
        Object.assign(session, { error: "RefreshAccessTokenError" })
      } else {
        session.token = token
      }
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
      if (token.expires_at && Date.now() > Number(token.expires_at) * 1000) {
        if (!token.refreshToken) {
          console.error('No refresh token available')
          return { ...token, accessToken: null, refreshToken: null, expires_at: null }
        }

        try {
          console.log('Token expired, refreshing...')
          const response = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              grant_type: 'refresh_token',
              refresh_token: token.refreshToken as string,
              client_id: process.env.AUTH_SPOTIFY_ID!,
              client_secret: process.env.AUTH_SPOTIFY_SECRET!,
            }),
          })
          
          if (response.ok) {
            const refreshedTokens = await response.json()
            console.log('Token refreshed successfully')
            return {
              ...token,
              accessToken: refreshedTokens.access_token,
              expires_at: Math.floor(Date.now() / 1000) + refreshedTokens.expires_in,
              refreshToken: refreshedTokens.refresh_token || token.refreshToken,
            }
          } else {
            const errorText = await response.text()
            console.error('Failed to refresh token:', response.status, response.statusText, errorText)
            
            // Check for specific error types
            const isTokenRevoked = errorText.includes('invalid_grant') || 
                                  errorText.includes('Refresh token revoked') ||
                                  (response.status === 400 && errorText.includes('invalid_grant'))
            
            if (isTokenRevoked) {
              console.log('Refresh token revoked (invalid_grant), clearing session to force re-authentication')
            } else {
              console.log('Other refresh error:', errorText)
            }
            
            // If refresh fails, clear the token to force re-authentication
            return { ...token, accessToken: null, refreshToken: null, expires_at: null }
          }
        } catch (error) {
          console.error('Error refreshing token:', error)
          // If refresh fails, clear the token to force re-authentication
          return { ...token, accessToken: null, refreshToken: null, expires_at: null }
        }
      }
      
      return token
    }
  },
  session: {
    strategy: "jwt"
  }
})