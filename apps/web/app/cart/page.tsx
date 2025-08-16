export default function CartPage() {
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
              <a href="#" className="text-pink-600 font-medium">Cart</a>
              <a href="#" className="text-gray-600 hover:text-pink-600">Contact</a>
            </nav>
          </div>
        </div>
      </header>

      {/* Cart Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <div className="text-6xl mb-6">🛒</div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Shopping Cart</h1>
          <p className="text-lg text-gray-600 mb-8">Your cart is currently empty</p>
          
          <div className="bg-white rounded-lg p-8 border max-w-md mx-auto">
            <h2 className="text-xl font-semibold mb-4">Start Shopping</h2>
            <p className="text-gray-600 mb-6">
              Discover our automated marketplace with trending products curated just for you.
            </p>
            <div className="space-y-3">
              <a href="/products" className="block">
                <button className="w-full bg-pink-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-pink-700 transition-colors">
                  Browse Products
                </button>
              </a>
              <a href="/" className="block">
                <button className="w-full border border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors">
                  Back to Home
                </button>
              </a>
            </div>
          </div>

          {/* Features */}
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🔒</span>
              </div>
              <h3 className="font-semibold mb-2">Secure Checkout</h3>
              <p className="text-sm text-gray-600">Your payment information is always protected</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🚚</span>
              </div>
              <h3 className="font-semibold mb-2">Fast Shipping</h3>
              <p className="text-sm text-gray-600">Quick and reliable delivery to your door</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">↩️</span>
              </div>
              <h3 className="font-semibold mb-2">Easy Returns</h3>
              <p className="text-sm text-gray-600">Hassle-free return policy for peace of mind</p>
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