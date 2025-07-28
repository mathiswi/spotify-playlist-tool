export function Footer() {
  return (
    <footer className="bg-gray-50 border-t mt-auto">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row justify-between items-center text-sm text-gray-600">
          <div className="mb-4 md:mb-0">
            <p>&copy; 2025 Spotify Playlist Tool. Built for playlist management and music discovery.</p>
          </div>
          
          <div className="flex items-center space-x-4">
            <span>BPM data provided by</span>
            <a 
              href="https://getsongbpm.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              GetSongBPM.com
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}