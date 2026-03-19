import { useState, useEffect } from "react"
import { IoCloseCircleOutline } from "react-icons/io5"
import { HiCheckCircle, HiXCircle } from "react-icons/hi2"

type HealthStatus = {
  configured: boolean
  canPublish: boolean
  previewMode: boolean
} | null

type SettingsDialogProps = {
  isOpen: boolean
  onClose: () => void
}

const SettingsDialog = ({ isOpen, onClose }: SettingsDialogProps) => {
  const [healthStatus, setHealthStatus] = useState<HealthStatus>(null)
  const [isChecking, setIsChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const checkHealth = async () => {
    setIsChecking(true)
    setError(null)
    try {
      const response = await fetch("/api/health", {
        headers: { Accept: "application/json" }
      })

      const text = await response.text()
      let data: any = null
      try {
        data = JSON.parse(text)
      } catch {
        data = null
      }

      if (!response.ok) {
        setError(`Health check failed (${response.status}). Make sure you are running the backend (try \`vercel dev\` from the repo root)`)
        return
      }

      if (!data || data.ok !== true) {
        setError(data?.error ?? "Health check returned an unexpected response")
        return
      }

      setHealthStatus({
        configured: data.configured,
        canPublish: data.canPublish,
        previewMode: data.previewMode
      })
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to check connection. If you are running only `vite`, `/api/health` may not be available (run `vercel dev` from the repo root)"
      )
    } finally {
      setIsChecking(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      checkHealth()
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold">Settings</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
            aria-label="Close"
          >
            <IoCloseCircleOutline size={28} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Connection Status</h3>
            
            {healthStatus && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {healthStatus.configured ? (
                    <HiCheckCircle className="text-green-600" size={24} />
                  ) : (
                    <HiXCircle className="text-red-600" size={24} />
                  )}
                  <span className="font-medium">
                    GitHub Configuration: {healthStatus.configured ? "Configured" : "Not Configured"}
                  </span>
                </div>

                {healthStatus.previewMode && (
                  <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded p-3">
                    <span className="text-orange-700 font-medium">⚠️ Preview Mode Enabled</span>
                    <span className="text-sm text-orange-600">
                      Publishing is disabled. Changes save to browser only.
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  {healthStatus.canPublish ? (
                    <HiCheckCircle className="text-green-600" size={24} />
                  ) : (
                    <HiXCircle className="text-red-600" size={24} />
                  )}
                  <span className="font-medium">
                    Can Publish: {healthStatus.canPublish ? "Yes" : "No"}
                  </span>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded p-3 text-red-700">
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={checkHealth}
              disabled={isChecking}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isChecking ? "Checking..." : "Test Connection"}
            </button>
          </div>

          <div className="border-t border-gray-200 pt-6 space-y-4">
            <h3 className="text-lg font-semibold">Setup Instructions</h3>
            
            <div className="space-y-3 text-sm">
              <div className="bg-blue-50 border border-blue-200 rounded p-4">
                <h4 className="font-semibold mb-2">Preview Mode vs Publishing Mode</h4>
                <ul className="space-y-1 list-disc list-inside text-gray-700">
                  <li><strong>Preview Mode (PREVIEW=true):</strong> Changes save to browser only, no GitHub publishing</li>
                  <li><strong>Publishing Mode (PREVIEW=false):</strong> Changes can be published to GitHub</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">To Enable Publishing:</h4>
                <ol className="space-y-2 list-decimal list-inside text-gray-700">
                  <li>
                    Create a <code className="bg-gray-100 px-1 py-0.5 rounded">admin/.env.local</code> file in your project
                  </li>
                  <li>
                    Get a GitHub Personal Access Token:
                    <a 
                      href="https://github.com/settings/tokens" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline ml-1"
                    >
                      https://github.com/settings/tokens
                    </a>
                    <div className="ml-6 mt-1 text-xs text-gray-600">
                      Required scope: <code className="bg-gray-100 px-1 py-0.5 rounded">repo</code> (full repository access)
                    </div>
                  </li>
                  <li>
                    Add these environment variables to your <code className="bg-gray-100 px-1 py-0.5 rounded">.env.local</code>:
                  </li>
                </ol>
              </div>

              <div className="bg-gray-900 text-gray-100 rounded p-4 font-mono text-xs overflow-x-auto">
                <pre>{`PREVIEW=false
GITHUB_TOKEN=your_token_here
GITHUB_OWNER=your_github_username
GITHUB_REPO=your_repo_name`}</pre>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                <p className="text-yellow-800 text-xs">
                  <strong>Important:</strong> You must set <code className="bg-yellow-100 px-1 py-0.5 rounded">PREVIEW=false</code> to enable publishing.
                  Restart your dev server after changing environment variables.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">For Vercel Deployment:</h4>
                <p className="text-gray-700">
                  Add the same environment variables in your Vercel project settings under 
                  <strong> Settings → Environment Variables</strong>.
                </p>
              </div>

              <div className="pt-2">
                <a 
                  href="https://github.com/skerrey/web2app-cms#readme" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline text-sm"
                >
                  📖 View Full Documentation
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export default SettingsDialog
