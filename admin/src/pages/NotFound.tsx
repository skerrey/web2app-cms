import { Link } from "react-router-dom"

const NotFound = () => (
  <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-6 bg-gray-50">
    <h1 className="text-2xl font-semibold text-gray-800">Page not found</h1>
    <p className="text-gray-600">The page you’re looking for doesn’t exist.</p>
    <div className="flex gap-3">
      <Link
        to="/"
        className="px-4 py-2 rounded border border-gray-300 bg-white hover:bg-gray-50 text-gray-700"
      >
        Admin
      </Link>
      <Link
        to="/download"
        className="px-4 py-2 rounded border border-gray-300 bg-white hover:bg-gray-50 text-gray-700"
      >
        Download
      </Link>
    </div>
  </div>
)

export default NotFound
