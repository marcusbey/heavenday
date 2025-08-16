export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <div className="text-2xl font-bold text-pink-600">🌟</div>
              <h1 className="text-2xl font-bold text-gray-900">Heaven-Dolls</h1>
            </div>
            <nav className="hidden md:flex space-x-8">
              <a href="#" className="text-gray-600 hover:text-pink-600">Products</a>
              <a href="#" className="text-gray-600 hover:text-pink-600">Categories</a>
              <a href="#" className="text-gray-600 hover:text-pink-600">About</a>
              <a href="#" className="text-gray-600 hover:text-pink-600">Contact</a>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              Automated Adult Products
              <br />
              <span className="text-pink-600">Marketplace</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Discover trending products automatically sourced from the latest market data. 
              Your sophisticated marketplace for adult wellness products.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="bg-pink-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-pink-700 transition-colors">
                Browse Products
              </button>
              <button className="border border-gray-300 text-gray-700 px-8 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors">
                Learn More
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Why Choose Heaven-Dolls?
            </h2>
            <p className="text-xl text-gray-600">
              We&apos;re committed to providing an exceptional automated marketplace experience
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🤖</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Automated Discovery</h3>
              <p className="text-gray-600">
                Our AI-powered system automatically discovers trending products from Google Trends and social media.
              </p>
            </div>
            
            <div className="text-center p-6">
              <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🛍️</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Curated Selection</h3>
              <p className="text-gray-600">
                Every product is carefully filtered and curated to ensure quality and appropriateness.
              </p>
            </div>
            
            <div className="text-center p-6">
              <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📊</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Business Intelligence</h3>
              <p className="text-gray-600">
                Complete analytics and tracking with Google Sheets integration for order management.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Demo Products Section */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Featured Products</h2>
            <p className="text-gray-600">Connect your Strapi CMS to see live product data</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-lg shadow-sm border p-6">
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
        </div>
      </section>

      {/* Technology Stack */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Built with Modern Technology</h2>
            <p className="text-gray-600">Enterprise-grade stack for scalability and performance</p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl font-bold text-blue-600">⚛️</span>
              </div>
              <h4 className="font-semibold">Next.js 14</h4>
              <p className="text-sm text-gray-600">React Framework</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl font-bold text-purple-600">🎨</span>
              </div>
              <h4 className="font-semibold">Tailwind CSS</h4>
              <p className="text-sm text-gray-600">Styling</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl font-bold text-green-600">📊</span>
              </div>
              <h4 className="font-semibold">Strapi CMS</h4>
              <p className="text-sm text-gray-600">Content Management</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl font-bold text-orange-600">🤖</span>
              </div>
              <h4 className="font-semibold">AI Automation</h4>
              <p className="text-sm text-gray-600">Product Discovery</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <span className="text-2xl">🌟</span>
                <span className="text-xl font-bold">Heaven-Dolls</span>
              </div>
              <p className="text-gray-400">
                Automated marketplace for trending adult wellness products.
              </p>
            </div>
            
            <div>
              <h5 className="font-semibold mb-4">Products</h5>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">Browse All</a></li>
                <li><a href="#" className="hover:text-white">Trending</a></li>
                <li><a href="#" className="hover:text-white">Categories</a></li>
                <li><a href="#" className="hover:text-white">New Arrivals</a></li>
              </ul>
            </div>
            
            <div>
              <h5 className="font-semibold mb-4">Company</h5>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">About Us</a></li>
                <li><a href="#" className="hover:text-white">Contact</a></li>
                <li><a href="#" className="hover:text-white">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white">Terms of Service</a></li>
              </ul>
            </div>
            
            <div>
              <h5 className="font-semibold mb-4">Built With</h5>
              <ul className="space-y-2 text-gray-400">
                <li>🤖 Claude Code</li>
                <li>⚛️ Next.js 14</li>
                <li>🎨 Tailwind CSS</li>
                <li>📊 Strapi CMS</li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 Heaven-Dolls. Built with Claude Code.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}