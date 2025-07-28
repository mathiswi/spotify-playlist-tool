interface BPMSetupInstructionsProps {
  show: boolean
}

export function BPMSetupInstructions({ show }: BPMSetupInstructionsProps) {
  if (!show) return null

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
      <h4 className="text-sm font-medium text-amber-800 mb-2">🎵 BPM Features Setup</h4>
      <div className="text-sm text-amber-700 space-y-2">
        <p>To enable BPM filtering, you need to configure a GetSongBPM API key:</p>
        <ol className="list-decimal list-inside space-y-1 ml-2">
          <li>Visit <a href="https://getsongbpm.com/api" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">getsongbpm.com/api</a></li>
          <li>Register your application with a valid email</li>
          <li>Add your API key to the environment variable: <code className="bg-amber-100 px-1 rounded">GETSONGBPM_API_KEY</code></li>
          <li>Restart the application</li>
        </ol>
        <p className="text-xs mt-2">
          Note: GetSongBPM API is free but requires a backlink (already included in the footer).
        </p>
      </div>
    </div>
  )
}