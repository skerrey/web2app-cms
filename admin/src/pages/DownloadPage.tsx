import { Link } from "react-router-dom"

const APK_URL = "/app-debug.apk"

const DownloadPage = () => (
  <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-6 bg-gray-50">
    <h1 className="text-2xl font-semibold text-gray-800">Download the app</h1>
    <p className="text-gray-600 text-center max-w-md">
      Download the Android APK for the Web2App CMS app.
    </p>
    <a
      href={APK_URL}
      download="app-debug.apk"
      className="px-5 py-3 rounded border-2 border-primary bg-primary text-white font-medium hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
    >
      Download the APK
    </a>
    <Link
      to="/"
      className="px-4 py-2 rounded border border-gray-300 bg-white hover:bg-gray-50 text-gray-700"
    >
      Back to Admin
    </Link>
  </div>
)

export default DownloadPage
