export default function TestPage() {
  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>🎉 Heaven-Dolls is Running!</h1>
      <p>The Next.js application is working correctly.</p>
      <hr style={{ margin: '2rem 0' }} />
      <h2>Available Pages:</h2>
      <ul>
        <li><a href="/">Homepage</a></li>
        <li><a href="/products">Products</a></li>
        <li><a href="/cart">Shopping Cart</a></li>
        <li><a href="/categories">Categories</a></li>
      </ul>
    </div>
  );
}