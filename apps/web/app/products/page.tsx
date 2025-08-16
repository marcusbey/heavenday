export default function ProductsPage() {
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
              <a href="#" className="text-pink-600 font-medium">Products</a>
              <a href="#" className="text-gray-600 hover:text-pink-600">Categories</a>
              <a href="#" className="text-gray-600 hover:text-pink-600">About</a>
              <a href="#" className="text-gray-600 hover:text-pink-600">Contact</a>
            </nav>
          </div>
        </div>
      </header>

      {/* Products Page Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">All Products</h1>
          <p className="text-lg text-gray-600">Connect your Strapi CMS to see your automated product catalog</p>
        </div>

        {/* Demo Product Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow">
              <div className="h-48 bg-gradient-to-br from-pink-100 to-purple-100 rounded-lg mb-4 flex items-center justify-center">
                <span className="text-4xl">📦</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Demo Product {i}</h3>
              <p className="text-sm text-gray-600 mb-4">
                Trending products will appear here automatically once your automation is running.
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

        {/* Features Section */}
        <div className="mt-16 bg-white rounded-lg p-8 border">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Automated Product Discovery</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🔍</span>
              </div>
              <h3 className="font-semibold mb-2">Google Trends</h3>
              <p className="text-sm text-gray-600">Real-time trending product discovery</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🛒</span>
              </div>
              <h3 className="font-semibold mb-2">Amazon Scraping</h3>
              <p className="text-sm text-gray-600">Automated product data collection</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📊</span>
              </div>
              <h3 className="font-semibold mb-2">Strapi CMS</h3>
              <p className="text-sm text-gray-600">Automated content management</p>
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