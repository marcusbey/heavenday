export default function SearchPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <div className="text-2xl font-bold text-pink-600">🌟</div>
              <h1 className="text-2xl font-bold text-gray-900">Heaven-Dolls</h1>
            </div>
            <nav className="hidden md:flex space-x-8">
              <a href="/" className="text-gray-600 hover:text-pink-600">Home</a>
              <a href="/products" className="text-gray-600 hover:text-pink-600">Products</a>
              <a href="#" className="text-gray-600 hover:text-pink-600">Categories</a>
              <a href="#" className="text-gray-600 hover:text-pink-600">About</a>
              <a href="#" className="text-gray-600 hover:text-pink-600">Contact</a>
            </nav>
          </div>
        </div>
      </header>

      {/* Search Page Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Search Results</h1>
          <p className="text-lg text-gray-600">Find exactly what you&apos;re looking for</p>
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative max-w-xl mx-auto">
            <input
              type="text"
              placeholder="Search for products..."
              className="w-full px-4 py-3 pr-12 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
            <button className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-pink-600">
              <span className="text-xl">🔍</span>
            </button>
          </div>
        </div>

        {/* Demo Search Results */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow">
              <div className="h-48 bg-gradient-to-br from-pink-100 to-purple-100 rounded-lg mb-4 flex items-center justify-center">
                <span className="text-4xl">📦</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Search Result {i}</h3>
              <p className="text-sm text-gray-600 mb-4">
                Matching products will appear here based on your search query.
              </p>
              <div className="flex justify-between items-center">
                <span className="text-lg font-bold text-pink-600">$99.99</span>
                <button className="bg-pink-600 text-white px-4 py-2 rounded font-medium hover:bg-pink-700 transition-colors">
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Search Tips */}
        <div className="mt-16 bg-white rounded-lg p-8 border">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Search Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">⚡</span>
              </div>
              <h3 className="font-semibold mb-2">Fast Search</h3>
              <p className="text-sm text-gray-600">Lightning-fast product discovery</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🎯</span>
              </div>
              <h3 className="font-semibold mb-2">Smart Filters</h3>
              <p className="text-sm text-gray-600">Advanced filtering options</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🔍</span>
              </div>
              <h3 className="font-semibold mb-2">AI-Powered</h3>
              <p className="text-sm text-gray-600">Intelligent search suggestions</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <span className="text-2xl">🌟</span>
            <span className="text-xl font-bold">Heaven-Dolls</span>
          </div>
          <p className="text-gray-400">
            Built with Claude Code for automated marketplace success
          </p>
        </div>
      </footer>
    </div>
  );
}