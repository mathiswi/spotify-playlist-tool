import axios, { AxiosInstance } from 'axios'
import { auth } from '@/auth'

class SpotifyAPI {
  private client: AxiosInstance

  constructor() {
    this.client = axios.create({
      baseURL: 'https://api.spotify.com/v1',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    this.client.interceptors.request.use(async (config) => {
      const session = await auth()
      if (session?.token?.accessToken) {
        config.headers.Authorization = `Bearer ${session.token.accessToken}`
      }
      return config
    })
  }

  async get<T>(url: string, params?: Record<string, unknown>): Promise<T> {
    const response = await this.client.get(url, { params })
    return response.data
  }

  async post<T>(url: string, data?: Record<string, unknown>): Promise<T> {
    const response = await this.client.post(url, data)
    return response.data
  }

  async put<T>(url: string, data?: Record<string, unknown>): Promise<T> {
    const response = await this.client.put(url, data)
    return response.data
  }

  async delete<T>(url: string): Promise<T> {
    const response = await this.client.delete(url)
    return response.data
  }
}

export const spotifyApi = new SpotifyAPI()