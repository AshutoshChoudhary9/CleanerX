'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

// ── Types ──
interface Product {
  id: string;
  title: string;
  icon?: string;
  price: number;
  mrp: number;
  tags: string[];
  vol?: string;
  rating?: number;
  ratingCount?: number;
  badge?: string;
}
interface CartItem extends Product { qty: number; }

const BADGE_COLORS: Record<string, string> = {
  'Best Seller': '#e53e3e',
  'New': '#00c06b',
  'Hot': '#ff6d00',
  'Top Rated': '#0a6ebd',
};

const CATEGORY_ICON: Record<string, string> = { floor: '🧹', toilet: '🚽', glass: '🪟', combo: '📦' };

export default function FreshGuardPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [wishlist, setWishlist] = useState<Set<string>>(new Set());
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [cartOpen, setCartOpen] = useState(false);
  const [modalState, setModalState] = useState<'closed' | 'product' | 'checkout'>('closed');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [checkoutStep, setCheckoutStep] = useState(1);
  const [selectedPayment, setSelectedPayment] = useState('upi');
  const [toasts, setToasts] = useState<{ id: number; msg: string; type: 'success' | 'error' }[]>([]);
  const [loading, setLoading] = useState(true);
  const [timer, setTimer] = useState(5 * 3600 + 42 * 60 + 17);
  const [addFormVisible, setAddFormVisible] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const productsRef = useRef<HTMLDivElement>(null);

  // Form state for adding products
  const [addForm, setAddForm] = useState({ name: '', price: '', mrp: '', vol: '', fragrance: '', description: '', category: 'floor' });

  // ── Fetch products ──
  useEffect(() => {
    fetchProducts('all', '');
    const interval = setInterval(() => setTimer(t => t > 0 ? t - 1 : 6 * 3600), 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchProducts = async (category: string, query: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.set('query', query);
      if (category !== 'all') params.set('category', category);
      const res = await fetch(`/api/products?${params}`);
      const data = await res.json();
      const list = data.products || [];
      setProducts(list);
      setFilteredProducts(list);
    } catch {
      setProducts([]);
      setFilteredProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now();
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3000);
  };

  // ── Filter & Search ──
  const handleFilter = (cat: string) => {
    setActiveCategory(cat);
    setSearchQuery('');
    fetchProducts(cat, '');
    productsRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSearch = (q: string) => {
    setSearchQuery(q);
    fetchProducts(activeCategory, q);
  };

  // ── Cart ──
  const addToCart = (p: Product) => {
    setCart(prev => {
      const ex = prev.find(c => c.id === p.id);
      if (ex) return prev.map(c => c.id === p.id ? { ...c, qty: c.qty + 1 } : c);
      return [...prev, { ...p, qty: 1 }];
    });
    showToast(`${p.icon || '🛒'} ${p.title.split(' ').slice(0, 3).join(' ')} added!`);
  };

  const changeQty = (id: string, delta: number) => {
    setCart(prev => {
      const updated = prev.map(c => c.id === id ? { ...c, qty: c.qty + delta } : c);
      return updated.filter(c => c.qty > 0);
    });
  };

  const removeFromCart = (id: string) => setCart(prev => prev.filter(c => c.id !== id));

  const cartTotal = cart.reduce((a, c) => a + c.price * c.qty, 0);
  const cartQty = cart.reduce((a, c) => a + c.qty, 0);
  const delivery = cartTotal >= 299 ? 0 : 49;
  const discount = cartTotal >= 299 ? 49 : 0;
  const grandTotal = cartTotal + delivery - discount;

  // ── Wishlist ──
  const toggleWishlist = (id: string) => {
    setWishlist(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); showToast('Removed from wishlist', 'error'); }
      else { next.add(id); showToast('Added to wishlist! ❤️'); }
      return next;
    });
  };

  // ── Checkout / Razorpay ──
  const placeOrder = async () => {
    if (paying) return;
    setPaying(true);
    try {
      const res = await fetch('/api/razorpay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: grandTotal, receipt: `FG${Date.now()}` }),
      });
      const data = await res.json();

      if (data.orderId && typeof window !== 'undefined' && (window as any).Razorpay) {
        const rzp = new (window as any).Razorpay({
          key: data.keyId,
          amount: data.amount,
          currency: data.currency,
          order_id: data.orderId,
          name: 'FreshGuard',
          description: 'Cleaning Products Order',
          theme: { color: '#0a6ebd' },
          handler: (response: any) => {
            setOrderPlaced(response.razorpay_order_id || `FG${Date.now().toString().slice(-8)}`);
            setCheckoutStep(4);
            setPaying(false);
          },
          modal: { ondismiss: () => setPaying(false) },
        });
        rzp.open();
      } else {
        // Fallback: simulate order placed (Razorpay not loaded or test mode)
        const orderId = `FG${Date.now().toString().slice(-8)}`;
        setOrderPlaced(orderId);
        setCheckoutStep(4);
      }
    } catch {
      showToast('Payment failed. Please try again.', 'error');
    } finally {
      setPaying(false);
    }
  };

  // ── Add Custom Product ──
  const handleAddProduct = async () => {
    if (!addForm.name || !addForm.price) { showToast('Please fill name and price', 'error'); return; }
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: addForm.name,
          price: parseFloat(addForm.price),
          mrp: parseFloat(addForm.mrp) || Math.round(parseFloat(addForm.price) * 1.3),
          volume: addForm.vol,
          category: addForm.category,
          fragrance: addForm.fragrance,
          description: addForm.description,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`✅ ${addForm.name} added to store!`);
        setAddForm({ name: '', price: '', mrp: '', vol: '', fragrance: '', description: '', category: 'floor' });
        setAddFormVisible(null);
        fetchProducts(activeCategory, searchQuery);
      } else {
        showToast(data.error || 'Failed to add product', 'error');
      }
    } catch {
      showToast('Network error. Try again.', 'error');
    }
  };

  const timerStr = `${String(Math.floor(timer / 3600)).padStart(2, '0')}:${String(Math.floor((timer % 3600) / 60)).padStart(2, '0')}:${String(timer % 60).padStart(2, '0')}`;

  return (
    <>
      {/* Razorpay Script */}
      <script src="https://checkout.razorpay.com/v1/checkout.js" async />

      {/* ── NAV ── */}
      <nav style={{
        background: 'linear-gradient(90deg, #0a5fa8 0%, #0a6ebd 100%)',
        height: '64px', display: 'flex', alignItems: 'center',
        padding: '0 24px', gap: '16px', position: 'sticky', top: 0, zIndex: 1000,
        boxShadow: '0 2px 16px rgba(0,0,0,0.2)',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1, minWidth: 140 }}>
          <span style={{ fontFamily: "'Baloo 2',sans-serif", fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.5px' }}>🌿 FreshGuard</span>
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,.7)', letterSpacing: '.8px', textTransform: 'uppercase', marginTop: -2 }}>Protection In Every Drop</span>
        </div>
        <div style={{ flex: 1, display: 'flex', maxWidth: 640, borderRadius: 6, overflow: 'hidden', height: 40, boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
          <input
            ref={searchRef}
            type="text"
            value={searchQuery}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Search floor cleaner, glass cleaner, toilet cleaner..."
            style={{ flex: 1, border: 'none', padding: '0 14px', fontSize: 13, outline: 'none', fontFamily: 'inherit', color: '#1a1a2e' }}
          />
          <button
            onClick={() => handleSearch(searchQuery)}
            style={{ background: '#ff6d00', border: 'none', padding: '0 18px', color: '#fff', fontSize: 14, fontWeight: 600, transition: 'background .2s' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#e55e00')}
            onMouseLeave={e => (e.currentTarget.style.background = '#ff6d00')}
          >🔍 Search</button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginLeft: 'auto' }}>
          {[
            { icon: '👤', label: 'Account', action: () => showToast('Sign in coming soon!') },
            { icon: '❤️', label: 'Wishlist', action: () => showToast(`${wishlist.size} items wishlisted`) },
            { icon: '📋', label: 'Orders', action: () => showToast('Track your orders here!') },
          ].map(btn => (
            <button key={btn.label} onClick={btn.action} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#fff', fontSize: 10, gap: 2, cursor: 'pointer', padding: '4px 8px', borderRadius: 6, border: 'none', background: 'none', transition: 'background .2s' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,.15)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
              <span style={{ fontSize: 18 }}>{btn.icon}</span>
              <span>{btn.label}</span>
            </button>
          ))}
          <button onClick={() => setCartOpen(true)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#fff', fontSize: 10, gap: 2, cursor: 'pointer', padding: '4px 8px', borderRadius: 6, border: 'none', background: 'none', position: 'relative', transition: 'background .2s' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,.15)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
            <span style={{ fontSize: 18, position: 'relative' }}>
              🛒
              {cartQty > 0 && <span style={{ position: 'absolute', top: -6, right: -8, background: '#ff6d00', color: '#fff', borderRadius: '50%', width: 18, height: 18, fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{cartQty}</span>}
            </span>
            <span>Cart</span>
          </button>
        </div>
      </nav>

      {/* ── SUB NAV ── */}
      <div style={{ background: '#1956a0', height: 44, display: 'flex', alignItems: 'center', padding: '0 24px', overflowX: 'auto', scrollbarWidth: 'none' }}>
        {[
          { key: 'all', label: 'All Products' },
          { key: 'floor', label: '🧹 Floor Cleaners' },
          { key: 'toilet', label: '🚽 Toilet Cleaners' },
          { key: 'glass', label: '🪟 Glass Cleaners' },
          { key: 'combo', label: '📦 Combo Packs' },
        ].map(item => (
          <div key={item.key} onClick={() => handleFilter(item.key)}
            style={{ color: 'rgba(255,255,255,.9)', fontSize: 13, fontWeight: 500, padding: '0 18px', height: 44, display: 'flex', alignItems: 'center', whiteSpace: 'nowrap', cursor: 'pointer', borderBottom: `3px solid ${activeCategory === item.key ? '#ff6d00' : 'transparent'}`, background: activeCategory === item.key ? 'rgba(255,255,255,.1)' : 'transparent', transition: 'all .2s' }}>
            {item.label}
          </div>
        ))}
        <div onClick={() => showToast('Subscribe & Save up to 15%!')} style={{ color: 'rgba(255,255,255,.9)', fontSize: 13, fontWeight: 500, padding: '0 18px', height: 44, display: 'flex', alignItems: 'center', whiteSpace: 'nowrap', cursor: 'pointer', borderBottom: '3px solid transparent' }}>
          🔁 Subscribe &amp; Save
        </div>
      </div>

      {/* ── OFFERS STRIP ── */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '0 24px', display: 'flex', overflowX: 'auto', scrollbarWidth: 'none' }}>
        {[
          { icon: '🚚', text: <><strong style={{ color: '#0a6ebd' }}>FREE Delivery</strong> on orders ₹299+</> },
          { icon: '💳', text: <>Extra <strong style={{ color: '#0a6ebd' }}>10% off</strong> on UPI payments</> },
          { icon: '🔁', text: <><strong style={{ color: '#0a6ebd' }}>Subscribe &amp; Save</strong> up to 15%</> },
          { icon: '🎁', text: <>Buy 3, Get <strong style={{ color: '#0a6ebd' }}>1 FREE</strong> on all cleaners</> },
          { icon: '⭐', text: <><strong style={{ color: '#0a6ebd' }}>FreshGuard Plus</strong> – Premium Membership</> },
        ].map((o, i) => (
          <div key={i} style={{ padding: '10px 24px', borderRight: '1px solid #e2e8f0', fontSize: 12, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 16 }}>{o.icon}</span> {o.text}
          </div>
        ))}
      </div>

      {/* ── HERO ── */}
      <div style={{ background: 'linear-gradient(135deg, #0a6ebd 0%, #0d3b8e 55%, #05204a 100%)', padding: '48px 24px', display: 'flex', gap: 32, alignItems: 'center', minHeight: 280, overflow: 'hidden', position: 'relative' }}>
        <div style={{ position: 'absolute', right: -60, top: -60, width: 400, height: 400, borderRadius: '50%', background: 'rgba(255,255,255,.04)' }} />
        <div style={{ position: 'absolute', right: 120, bottom: -80, width: 260, height: 260, borderRadius: '50%', background: 'rgba(255,109,0,.08)' }} />
        <div style={{ flex: 1, zIndex: 1 }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,.65)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 8 }}>India's #1 Cleaning Brand</div>
          <h1 style={{ fontFamily: "'Baloo 2',sans-serif", fontSize: 'clamp(32px,5vw,48px)', fontWeight: 800, color: '#fff', lineHeight: 1.05, marginBottom: 12 }}>
            Protection In<br /><span style={{ color: '#ff6d00' }}>Every Drop</span>
          </h1>
          <p style={{ color: 'rgba(255,255,255,.8)', fontSize: 15, maxWidth: 460, lineHeight: 1.6, marginBottom: 24 }}>
            Scientifically formulated cleaners that eliminate 99.9% of germs. ISO &amp; BIS certified. Keep your home fresh, clean, and protected — naturally.
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button onClick={() => productsRef.current?.scrollIntoView({ behavior: 'smooth' })}
              style={{ background: '#ff6d00', color: '#fff', border: 'none', padding: '13px 30px', borderRadius: 6, fontSize: 14, fontWeight: 700, transition: 'all .2s', cursor: 'pointer' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#e55e00'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#ff6d00'; e.currentTarget.style.transform = 'none'; }}>
              Shop Now →
            </button>
            <button onClick={() => showToast('Exploring all products!')}
              style={{ background: 'transparent', color: '#fff', border: '2px solid rgba(255,255,255,.5)', padding: '11px 24px', borderRadius: 6, fontSize: 14, fontWeight: 600, transition: 'all .2s', cursor: 'pointer' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,.1)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,.5)'; e.currentTarget.style.background = 'transparent'; }}>
              View All Products
            </button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 16, zIndex: 1, flexShrink: 0 }}>
          {[
            { icon: '🧴', name: 'Floor Cleaner', price: '₹149', cat: 'floor' },
            { icon: '🚽', name: 'Toilet Cleaner', price: '₹129', cat: 'toilet' },
            { icon: '🪟', name: 'Glass Cleaner', price: '₹119', cat: 'glass' },
          ].map(hc => (
            <div key={hc.cat} onClick={() => handleFilter(hc.cat)}
              style={{ background: 'rgba(255,255,255,.12)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,.2)', borderRadius: 12, padding: '20px 16px', textAlign: 'center', minWidth: 110, cursor: 'pointer', transition: 'transform .2s' }}
              onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-4px)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'none')}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>{hc.icon}</div>
              <div style={{ fontSize: 12, color: '#fff', fontWeight: 600 }}>{hc.name}</div>
              <div style={{ fontSize: 16, color: '#ff6d00', fontWeight: 700, marginTop: 4 }}>{hc.price}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── MAIN ── */}
      <div style={{ maxWidth: 1300, margin: '0 auto', padding: '24px' }}>

        {/* Features */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32, marginTop: 8 }}>
          {[
            { icon: '🚚', title: 'Fast Delivery', desc: 'Same-day delivery in select cities' },
            { icon: '✅', title: 'Certified Safe', desc: 'ISO & BIS certified formulas' },
            { icon: '🌿', title: 'Eco-Friendly', desc: 'Biodegradable, planet-safe' },
            { icon: '↩️', title: 'Easy Returns', desc: '7-day no-questions return policy' },
          ].map(f => (
            <div key={f.title} style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', padding: '20px 16px', textAlign: 'center', transition: 'all .2s', cursor: 'default' }}
              onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,.08)')}
              onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}>
              <div style={{ fontSize: 30, marginBottom: 8 }}>{f.icon}</div>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{f.title}</div>
              <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.4 }}>{f.desc}</div>
            </div>
          ))}
        </div>

        {/* Categories */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ fontFamily: "'Baloo 2',sans-serif", fontSize: 22, fontWeight: 700 }}>Shop by <span style={{ color: '#0a6ebd' }}>Category</span></h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 32 }}>
          {[
            { key: 'floor', name: 'Floor Cleaners', icon: '🧹', desc: 'Powerful disinfection for marble, tile, granite & wooden floors. Removes stains and leaves a fresh fragrance.', count: 12, gradient: 'linear-gradient(90deg,#0a6ebd,#00c0f0)' },
            { key: 'toilet', name: 'Toilet Cleaners', icon: '🚽', desc: 'Thick gel formula that clings to surfaces, removes stains & limescale. 100% germ-free guarantee.', count: 8, gradient: 'linear-gradient(90deg,#9333ea,#e879f9)' },
            { key: 'glass', name: 'Glass Cleaners', icon: '🪟', desc: 'Streak-free, crystal-clear finish on windows, mirrors & glass surfaces. Dries instantly.', count: 10, gradient: 'linear-gradient(90deg,#00c06b,#84fac7)' },
          ].map(cat => (
            <div key={cat.key} onClick={() => handleFilter(cat.key)}
              style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', padding: '20px', cursor: 'pointer', transition: 'all .25s', display: 'flex', flexDirection: 'column', gap: 10, position: 'relative', overflow: 'hidden' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,.12)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, borderRadius: '10px 10px 0 0', background: cat.gradient }} />
              <div style={{ fontSize: 40, marginTop: 4 }}>{cat.icon}</div>
              <div>
                <div style={{ fontFamily: "'Baloo 2',sans-serif", fontSize: 18, fontWeight: 700 }}>{cat.name}</div>
                <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.5, marginTop: 4 }}>{cat.desc}</div>
                <div style={{ fontSize: 12, color: '#0a6ebd', fontWeight: 600, marginTop: 8 }}>{cat.count} Products Available →</div>
              </div>
            </div>
          ))}
        </div>

        {/* Deals of the Day */}
        <div style={{ background: 'linear-gradient(135deg,#fff8f0,#fff3e0)', border: '1px solid #ffe0b2', borderRadius: 12, padding: '24px', marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{ fontFamily: "'Baloo 2',sans-serif", fontSize: 22, fontWeight: 800, color: '#ff6d00' }}>🔥 Deal of the Day</div>
            <div style={{ background: '#ff6d00', color: '#fff', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>⏰ Ends in {timerStr}</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
            {[
              { id: '99', icon: '🧴', name: 'Mega Floor Pack', disc: '43% OFF', price: 399, mrp: 699, tags: ['combo'], vol: '2L×3' },
              { id: '98', icon: '🚽', name: 'Toilet Bundle', disc: '44% OFF', price: 249, mrp: 449, tags: ['combo'], vol: '1L×3' },
              { id: '97', icon: '🪟', name: 'Glass Pro Kit', disc: '40% OFF', price: 179, mrp: 299, tags: ['combo'], vol: '500ml×2' },
              { id: '96', icon: '🏠', name: 'Home Clean Combo', disc: '40% OFF', price: 599, mrp: 999, tags: ['combo'], vol: 'Assorted' },
              { id: '95', icon: '💜', name: 'Lavender Floor', disc: '45% OFF', price: 99, mrp: 179, tags: ['floor'], vol: '1L' },
              { id: '94', icon: '💧', name: 'Power Toilet Gel', disc: '40% OFF', price: 89, mrp: 149, tags: ['toilet'], vol: '750ml' },
            ].map(deal => (
              <div key={deal.id} onClick={() => addToCart({ ...deal, title: deal.name, rating: 4.5, ratingCount: 0, badge: 'Hot' })}
                style={{ background: '#fff', borderRadius: 8, padding: '12px', textAlign: 'center', border: '1px solid #ffe0b2', cursor: 'pointer', transition: 'all .2s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#ff6d00'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#ffe0b2'; e.currentTarget.style.transform = 'none'; }}>
                <div style={{ fontSize: 36, marginBottom: 6 }}>{deal.icon}</div>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>{deal.name}</div>
                <div style={{ fontSize: 17, fontWeight: 800, color: '#e53e3e' }}>{deal.disc}</div>
                <div style={{ fontSize: 13, color: '#6b7280' }}>₹{deal.price} <s style={{ fontSize: 11 }}>₹{deal.mrp}</s></div>
              </div>
            ))}
          </div>
        </div>

        {/* ── PRODUCTS ── */}
        <div ref={productsRef} id="products">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 style={{ fontFamily: "'Baloo 2',sans-serif", fontSize: 22, fontWeight: 700 }}>
              {activeCategory === 'all' ? 'All' : activeCategory.charAt(0).toUpperCase() + activeCategory.slice(1)} <span style={{ color: '#0a6ebd' }}>Products</span>
            </h2>
            <div onClick={() => handleFilter('all')} style={{ color: '#0a6ebd', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>View All ›</div>
          </div>

          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                  <div style={{ height: 160, background: 'linear-gradient(90deg,#f0f3f8 25%,#e8edf5 50%,#f0f3f8 75%)', animation: 'pulse 1.5s ease-in-out infinite' }} />
                  <div style={{ padding: 12 }}>
                    {[80, 60, 40].map((w, j) => (
                      <div key={j} style={{ height: 12, background: '#f0f3f8', borderRadius: 4, marginBottom: 8, width: `${w}%` }} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#6b7280', gridColumn: '1/-1' }}>
              <div style={{ fontSize: 60, marginBottom: 12 }}>🔍</div>
              <p style={{ fontSize: 16 }}>No products found. Try a different search.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
              {filteredProducts.map((p: any) => {
                const price = p.price || parseFloat(p.priceRange?.minVariantPrice?.amount || '0');
                const mrp = p.mrp || parseFloat(p.priceRange?.maxVariantPrice?.amount || '0') || price * 1.3;
                const disc = Math.round((1 - price / mrp) * 100);
                const inWish = wishlist.has(p.id);
                const vol = p.vol || p.variants?.[0]?.title || 'Standard';
                const product: Product = { id: p.id, title: p.title, icon: p.icon || CATEGORY_ICON[p.tags?.[0]] || '🧴', price, mrp, tags: p.tags || [], vol, rating: p.rating || 4.0, ratingCount: p.ratingCount || 0, badge: p.badge || 'New' };

                return (
                  <div key={p.id} style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', overflow: 'hidden', cursor: 'pointer', transition: 'all .25s', display: 'flex', flexDirection: 'column' }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,.12)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
                    onClick={() => { setSelectedProduct(product); setModalState('product'); }}>
                    <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', background: 'linear-gradient(135deg,#f8faff,#eff4ff)' }}>
                      <span style={{ fontSize: 64 }}>{product.icon}</span>
                      {product.badge && <span style={{ position: 'absolute', top: 8, left: 8, background: BADGE_COLORS[product.badge] || '#0a6ebd', color: '#fff', fontSize: 10, fontWeight: 700, padding: '3px 7px', borderRadius: 4 }}>{product.badge}</span>}
                      <span onClick={e => { e.stopPropagation(); toggleWishlist(p.id); }}
                        style={{ position: 'absolute', top: 8, right: 8, background: '#fff', border: '1px solid #e2e8f0', borderRadius: '50%', width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, cursor: 'pointer', transition: 'all .2s' }}>
                        {inWish ? '❤️' : '🤍'}
                      </span>
                    </div>
                    <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: 5, flex: 1 }}>
                      <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px' }}>FreshGuard</div>
                      <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.3 }}>{p.title}</div>
                      <div style={{ fontSize: 11, color: '#6b7280' }}>{vol}</div>
                      {product.rating > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                          <span style={{ background: '#00c06b', color: '#fff', padding: '2px 6px', borderRadius: 4, fontSize: 11, fontWeight: 700 }}>★ {product.rating}</span>
                          <span style={{ color: '#6b7280' }}>({(product.ratingCount || 0).toLocaleString()})</span>
                        </div>
                      )}
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 2 }}>
                        <span style={{ fontSize: 18, fontWeight: 700 }}>₹{price}</span>
                        <span style={{ fontSize: 12, color: '#6b7280', textDecoration: 'line-through' }}>₹{Math.round(mrp)}</span>
                        <span style={{ fontSize: 12, color: '#e53e3e', fontWeight: 600 }}>{disc}% off</span>
                      </div>
                    </div>
                    <div style={{ padding: '0 12px 12px', display: 'flex', gap: 8 }}>
                      <button onClick={e => { e.stopPropagation(); addToCart(product); }}
                        style={{ flex: 1, background: '#ff6d00', color: '#fff', border: 'none', padding: 9, borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'background .2s' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#e55e00')}
                        onMouseLeave={e => (e.currentTarget.style.background = '#ff6d00')}>
                        🛒 Cart
                      </button>
                      <button onClick={e => { e.stopPropagation(); addToCart(product); setCartOpen(true); }}
                        style={{ flex: 1, background: '#0a6ebd', color: '#fff', border: 'none', padding: 9, borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'background .2s' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#085299')}
                        onMouseLeave={e => (e.currentTarget.style.background = '#0a6ebd')}>
                        ⚡ Buy
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── ADD PRODUCT SECTION ── */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 style={{ fontFamily: "'Baloo 2',sans-serif", fontSize: 22, fontWeight: 700 }}>Add Your <span style={{ color: '#0a6ebd' }}>Product Listings</span></h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            {[
              { cat: 'floor', label: '🧹 Add Floor Cleaner', placeholder: 'e.g. Pine Fresh Floor Cleaner', fragrancePlaceholder: 'e.g. Lavender, Pine, Lemon' },
              { cat: 'toilet', label: '🚽 Add Toilet Cleaner', placeholder: 'e.g. HyperClean Toilet Gel', fragrancePlaceholder: 'e.g. Thick Gel, Foam, Liquid' },
              { cat: 'glass', label: '🪟 Add Glass Cleaner', placeholder: 'e.g. ClearView Glass Spray', fragrancePlaceholder: 'e.g. Streak-Free, Anti-Fog' },
            ].map(box => (
              <div key={box.cat} style={{ background: '#fff', border: '2px dashed #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', borderBottom: addFormVisible === box.cat ? '1px solid #e2e8f0' : 'none' }}
                  onClick={() => setAddFormVisible(addFormVisible === box.cat ? null : box.cat)}>
                  <h3 style={{ fontFamily: "'Baloo 2',sans-serif", fontSize: 16, fontWeight: 700 }}>{box.label}</h3>
                  <span style={{ fontSize: 20, color: '#0a6ebd' }}>{addFormVisible === box.cat ? '−' : '+'}</span>
                </div>
                {addFormVisible === box.cat && (
                  <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {[
                      { label: 'Product Name', key: 'name', placeholder: box.placeholder },
                      { label: 'Volume', key: 'vol', placeholder: 'e.g. 1 Litre' },
                      { label: 'MRP (₹)', key: 'mrp', placeholder: 'e.g. 199', type: 'number' },
                      { label: 'Selling Price (₹)', key: 'price', placeholder: 'e.g. 149', type: 'number' },
                      { label: 'Fragrance / Type', key: 'fragrance', placeholder: box.fragrancePlaceholder },
                    ].map(field => (
                      <div key={field.key}>
                        <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>{field.label}</label>
                        <input
                          type={field.type || 'text'}
                          value={(addForm as any)[field.key]}
                          onChange={e => setAddForm(f => ({ ...f, [field.key]: e.target.value, category: box.cat }))}
                          placeholder={field.placeholder}
                          style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 6, padding: '8px 12px', fontSize: 13, outline: 'none', fontFamily: 'inherit', background: '#f0f3f8', transition: 'border-color .2s' }}
                          onFocus={e => (e.target.style.borderColor = '#0a6ebd')}
                          onBlur={e => (e.target.style.borderColor = '#e2e8f0')}
                        />
                      </div>
                    ))}
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>Description</label>
                      <textarea
                        value={addForm.description}
                        onChange={e => setAddForm(f => ({ ...f, description: e.target.value, category: box.cat }))}
                        placeholder="Product highlights, features..."
                        rows={3}
                        style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 6, padding: '8px 12px', fontSize: 13, outline: 'none', fontFamily: 'inherit', background: '#f0f3f8', resize: 'vertical', transition: 'border-color .2s' }}
                        onFocus={e => (e.target.style.borderColor = '#0a6ebd')}
                        onBlur={e => (e.target.style.borderColor = '#e2e8f0')}
                      />
                    </div>
                    <button onClick={handleAddProduct}
                      style={{ background: '#0a6ebd', color: '#fff', border: 'none', padding: 10, borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'background .2s', marginTop: 4 }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#085299')}
                      onMouseLeave={e => (e.currentTarget.style.background = '#0a6ebd')}>
                      + Add to Store
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

      </div>{/* /main */}

      {/* ── FOOTER ── */}
      <footer style={{ background: '#1a1a2e', color: 'rgba(255,255,255,.7)', padding: '48px 24px 24px', marginTop: 40 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 32, maxWidth: 1300, margin: '0 auto 32px' }}>
          <div>
            <h2 style={{ fontFamily: "'Baloo 2',sans-serif", fontSize: 22, color: '#fff', marginBottom: 6 }}>🌿 FreshGuard</h2>
            <p style={{ fontSize: 13, lineHeight: 1.6, maxWidth: 280 }}>India's most trusted cleaning brand. Scientifically formulated for homes, offices and commercial spaces. Protection In Every Drop.</p>
            <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
              {['📘', '📷', '🐦', '▶️'].map((icon, i) => (
                <div key={i} onClick={() => showToast('Social page coming soon!')} style={{ width: 36, height: 36, background: 'rgba(255,255,255,.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'background .2s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,.2)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,.1)')}>
                  {icon}
                </div>
              ))}
            </div>
          </div>
          {[
            { title: 'Products', links: ['Floor Cleaners', 'Toilet Cleaners', 'Glass Cleaners', 'Combo Packs', 'Commercial Range'] },
            { title: 'Company', links: ['About Us', 'Careers', 'Press', 'Sustainability', 'Blog'] },
            { title: 'Support', links: ['Help Center', 'Contact Us', 'Returns', 'Track Order', 'Privacy Policy'] },
          ].map(col => (
            <div key={col.title}>
              <h4 style={{ color: '#fff', fontSize: 14, fontWeight: 700, marginBottom: 12 }}>{col.title}</h4>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {col.links.map(link => (
                  <li key={link} onClick={() => showToast(`${link} page coming soon!`)} style={{ fontSize: 13, cursor: 'pointer', transition: 'color .2s' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,.7)')}>
                    {link}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div style={{ maxWidth: 1300, margin: '0 auto', paddingTop: 20, borderTop: '1px solid rgba(255,255,255,.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, flexWrap: 'wrap', gap: 8 }}>
          <span>© 2025 FreshGuard Pvt. Ltd. All rights reserved.</span>
          <span>Made with 💚 for cleaner homes</span>
        </div>
      </footer>

      {/* ── CART SIDEBAR ── */}
      {cartOpen && <div onClick={() => setCartOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 2000, transition: 'opacity .3s' }} />}
      <div style={{ position: 'fixed', right: 0, top: 0, bottom: 0, width: 'min(420px, 100vw)', background: '#fff', zIndex: 2001, transform: cartOpen ? 'translateX(0)' : 'translateX(100%)', transition: 'transform .35s cubic-bezier(.4,0,.2,1)', display: 'flex', flexDirection: 'column', boxShadow: '-4px 0 30px rgba(0,0,0,.15)' }}>
        <div style={{ background: 'linear-gradient(90deg,#0a5fa8,#0a6ebd)', padding: '18px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#fff' }}>
          <h2 style={{ fontFamily: "'Baloo 2',sans-serif", fontSize: 20, fontWeight: 700 }}>🛒 My Cart ({cartQty} items)</h2>
          <button onClick={() => setCartOpen(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 22, cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
          {cart.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#6b7280' }}>
              <div style={{ fontSize: 64, marginBottom: 12 }}>🛒</div>
              <p style={{ fontWeight: 600 }}>Your cart is empty</p>
              <p style={{ fontSize: 13, marginTop: 8 }}>Add some products to get started</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} style={{ display: 'flex', gap: 12, padding: '14px 0', borderBottom: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: 36, width: 60, height: 60, background: '#f0f3f8', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{item.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{item.title}</div>
                  <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>{item.vol}</div>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>₹{item.price * item.qty}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                    {[
                      { label: '−', action: () => changeQty(item.id, -1) },
                      { label: '+', action: () => changeQty(item.id, 1) },
                    ].map((btn, i) => (
                      <div key={i} onClick={btn.action} style={{ background: '#f0f3f8', border: '1px solid #e2e8f0', borderRadius: 4, width: 28, height: 28, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all .2s' }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#0a6ebd'; e.currentTarget.style.color = '#fff'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = '#f0f3f8'; e.currentTarget.style.color = 'inherit'; }}>
                        {btn.label}
                      </div>
                    ))}
                    <div style={{ fontSize: 14, fontWeight: 600, minWidth: 24, textAlign: 'center' }}>{item.qty}</div>
                    <button onClick={() => removeFromCart(item.id)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#6b7280', fontSize: 12, cursor: 'pointer', transition: 'color .2s' }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#e53e3e')}
                      onMouseLeave={e => (e.currentTarget.style.color = '#6b7280')}>
                      🗑 Remove
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        {cart.length > 0 && (
          <div style={{ padding: 16, borderTop: '1px solid #e2e8f0', background: '#fafafa' }}>
            {[
              { label: 'Subtotal', value: `₹${cartTotal}` },
              { label: 'Delivery', value: delivery === 0 ? 'FREE 🎉' : `₹${delivery}` },
              { label: 'Discount', value: `-₹${discount}`, color: '#00c06b' },
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8, color: row.color || 'inherit' }}>
                <span>{row.label}</span><span style={{ fontWeight: 500 }}>{row.value}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 700, marginTop: 10, paddingTop: 10, borderTop: '1px solid #e2e8f0' }}>
              <span>Total</span><span>₹{grandTotal}</span>
            </div>
            <button onClick={() => { setCartOpen(false); setCheckoutStep(1); setModalState('checkout'); setOrderPlaced(null); }}
              style={{ width: '100%', background: '#ff6d00', color: '#fff', border: 'none', padding: 14, borderRadius: 6, fontSize: 15, fontWeight: 700, marginTop: 14, cursor: 'pointer', transition: 'background .2s' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#e55e00')}
              onMouseLeave={e => (e.currentTarget.style.background = '#ff6d00')}>
              Proceed to Checkout →
            </button>
          </div>
        )}
      </div>

      {/* ── PRODUCT / CHECKOUT MODAL ── */}
      {modalState !== 'closed' && (
        <div onClick={() => setModalState('closed')} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 520, overflow: 'hidden', animation: 'slideUp .3s ease', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            {/* Modal Head */}
            <div style={{ background: 'linear-gradient(90deg,#0a5fa8,#0a6ebd)', padding: '18px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#fff', flexShrink: 0 }}>
              <h2 style={{ fontFamily: "'Baloo 2',sans-serif", fontSize: 18, fontWeight: 700 }}>
                {modalState === 'product' && selectedProduct ? `${selectedProduct.icon} ${selectedProduct.title}` : ['', '📍 Delivery Address', '💳 Payment Method', '📋 Review Order', '✅ Order!'][checkoutStep]}
              </h2>
              <button onClick={() => setModalState('closed')} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 22, cursor: 'pointer' }}>✕</button>
            </div>
            {/* Modal Body */}
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {modalState === 'product' && selectedProduct ? (
                <div style={{ padding: 24 }}>
                  <div style={{ textAlign: 'center', background: 'linear-gradient(135deg,#f8faff,#eff4ff)', borderRadius: 10, padding: '30px', marginBottom: 20, fontSize: 80 }}>{selectedProduct.icon}</div>
                  <h3 style={{ fontFamily: "'Baloo 2',sans-serif", fontSize: 18, marginBottom: 6 }}>{selectedProduct.title}</h3>
                  {selectedProduct.rating && selectedProduct.rating > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                      <span style={{ background: '#00c06b', color: '#fff', padding: '3px 8px', borderRadius: 4, fontSize: 12, fontWeight: 700 }}>★ {selectedProduct.rating}</span>
                      <span style={{ fontSize: 13, color: '#6b7280' }}>{(selectedProduct.ratingCount || 0).toLocaleString()} ratings</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 16 }}>
                    <span style={{ fontSize: 28, fontWeight: 700 }}>₹{selectedProduct.price}</span>
                    <span style={{ fontSize: 16, color: '#6b7280', textDecoration: 'line-through' }}>₹{selectedProduct.mrp}</span>
                    <span style={{ color: '#e53e3e', fontWeight: 600 }}>{Math.round((1 - selectedProduct.price / selectedProduct.mrp) * 100)}% off</span>
                  </div>
                  <div style={{ background: '#f0fff8', borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 13 }}>
                    ✅ Volume: {selectedProduct.vol} &nbsp;|&nbsp; 🚚 Free delivery ₹299+ &nbsp;|&nbsp; ↩️ 7-day returns
                  </div>
                </div>
              ) : modalState === 'checkout' ? (
                <div style={{ padding: 24 }}>
                  {/* Step indicators */}
                  {checkoutStep < 4 && (
                    <div style={{ display: 'flex', gap: 0, marginBottom: 24, background: '#f0f3f8', borderRadius: 8, overflow: 'hidden' }}>
                      {['Address', 'Payment', 'Review'].map((s, i) => (
                        <div key={s} style={{ flex: 1, padding: '10px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: i + 1 === checkoutStep ? '#fff' : i + 1 < checkoutStep ? '#00c06b' : '#6b7280', background: i + 1 === checkoutStep ? '#0a6ebd' : i + 1 < checkoutStep ? '#e8f5e9' : 'transparent', cursor: 'pointer', transition: 'all .2s' }}
                          onClick={() => i + 1 <= checkoutStep && setCheckoutStep(i + 1)}>
                          {i + 1 < checkoutStep ? '✓ ' : `${i + 1}. `}{s}
                        </div>
                      ))}
                    </div>
                  )}

                  {checkoutStep === 1 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      {[
                        { label: 'Full Name', id: 'chk-name', placeholder: 'Your full name' },
                        { label: 'Mobile Number', id: 'chk-phone', placeholder: '10-digit mobile number', type: 'tel' },
                        { label: 'Address Line 1', id: 'chk-addr1', placeholder: 'House/Flat/Block No.' },
                        { label: 'Address Line 2', id: 'chk-addr2', placeholder: 'Street, Area, Colony' },
                      ].map(f => (
                        <div key={f.id}>
                          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 6 }}>{f.label}</label>
                          <input type={f.type || 'text'} id={f.id} placeholder={f.placeholder} style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 6, padding: '10px 12px', fontSize: 14, fontFamily: 'inherit', outline: 'none' }} onFocus={e => (e.target.style.borderColor = '#0a6ebd')} onBlur={e => (e.target.style.borderColor = '#e2e8f0')} />
                        </div>
                      ))}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 6 }}>City</label>
                          <input type="text" placeholder="City" style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 6, padding: '10px 12px', fontSize: 14, fontFamily: 'inherit', outline: 'none' }} onFocus={e => (e.target.style.borderColor = '#0a6ebd')} onBlur={e => (e.target.style.borderColor = '#e2e8f0')} />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 6 }}>PIN Code</label>
                          <input type="text" maxLength={6} placeholder="6-digit PIN" style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 6, padding: '10px 12px', fontSize: 14, fontFamily: 'inherit', outline: 'none' }} onFocus={e => (e.target.style.borderColor = '#0a6ebd')} onBlur={e => (e.target.style.borderColor = '#e2e8f0')} />
                        </div>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 6 }}>State</label>
                        <select style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 6, padding: '10px 12px', fontSize: 14, fontFamily: 'inherit', outline: 'none', background: '#fff' }}>
                          {['Uttar Pradesh', 'Maharashtra', 'Delhi', 'Karnataka', 'Tamil Nadu', 'West Bengal', 'Gujarat', 'Rajasthan'].map(s => <option key={s}>{s}</option>)}
                        </select>
                      </div>
                    </div>
                  )}

                  {checkoutStep === 2 && (
                    <div>
                      <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>Choose your payment method:</p>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
                        {[
                          { key: 'upi', icon: '📱', label: 'UPI' },
                          { key: 'card', icon: '💳', label: 'Credit/Debit Card' },
                          { key: 'nb', icon: '🏦', label: 'Net Banking' },
                          { key: 'cod', icon: '💵', label: 'Cash on Delivery' },
                        ].map(pm => (
                          <div key={pm.key} onClick={() => setSelectedPayment(pm.key)}
                            style={{ border: `2px solid ${selectedPayment === pm.key ? '#0a6ebd' : '#e2e8f0'}`, background: selectedPayment === pm.key ? '#f0f7ff' : '#fff', borderRadius: 8, padding: 12, textAlign: 'center', cursor: 'pointer', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', transition: 'all .2s' }}>
                            <span style={{ fontSize: 20 }}>{pm.icon}</span>{pm.label}
                          </div>
                        ))}
                      </div>
                      {selectedPayment === 'upi' && (
                        <div>
                          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 6 }}>UPI ID</label>
                          <input type="text" placeholder="yourname@upi" style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 6, padding: '10px 12px', fontSize: 14, fontFamily: 'inherit', outline: 'none' }} onFocus={e => (e.target.style.borderColor = '#0a6ebd')} onBlur={e => (e.target.style.borderColor = '#e2e8f0')} />
                          <p style={{ fontSize: 12, color: '#00c06b', background: '#f0fff8', padding: 10, borderRadius: 6, marginTop: 10 }}>💚 Extra 10% OFF on UPI payments applied!</p>
                        </div>
                      )}
                      {selectedPayment === 'card' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                          <input type="text" maxLength={19} placeholder="1234 5678 9012 3456" style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 6, padding: '10px 12px', fontSize: 14, fontFamily: 'inherit', outline: 'none' }} onFocus={e => (e.target.style.borderColor = '#0a6ebd')} onBlur={e => (e.target.style.borderColor = '#e2e8f0')} />
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <input type="text" placeholder="MM/YY" maxLength={5} style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 6, padding: '10px 12px', fontSize: 14, fontFamily: 'inherit', outline: 'none' }} onFocus={e => (e.target.style.borderColor = '#0a6ebd')} onBlur={e => (e.target.style.borderColor = '#e2e8f0')} />
                            <input type="password" placeholder="CVV" maxLength={3} style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 6, padding: '10px 12px', fontSize: 14, fontFamily: 'inherit', outline: 'none' }} onFocus={e => (e.target.style.borderColor = '#0a6ebd')} onBlur={e => (e.target.style.borderColor = '#e2e8f0')} />
                          </div>
                        </div>
                      )}
                      {selectedPayment === 'nb' && (
                        <select style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 6, padding: '10px 12px', fontSize: 14, fontFamily: 'inherit', outline: 'none', background: '#fff' }}>
                          {['State Bank of India', 'HDFC Bank', 'ICICI Bank', 'Axis Bank', 'Kotak Bank'].map(b => <option key={b}>{b}</option>)}
                        </select>
                      )}
                      {selectedPayment === 'cod' && (
                        <p style={{ fontSize: 13, background: '#fff8f0', padding: 12, borderRadius: 8, borderLeft: '4px solid #ff6d00' }}>
                          💵 Pay ₹{grandTotal + 49} cash upon delivery. Note: COD fee of ₹49 applicable.
                        </p>
                      )}
                    </div>
                  )}

                  {checkoutStep === 3 && (
                    <div>
                      <div style={{ background: '#f0f3f8', borderRadius: 8, padding: 16, marginBottom: 20 }}>
                        <div style={{ fontWeight: 700, marginBottom: 10, fontSize: 14 }}>Order Summary</div>
                        {cart.map(item => (
                          <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0' }}>
                            <span>{item.icon} {item.title.split(' ').slice(0, 3).join(' ')} ×{item.qty}</span>
                            <span>₹{item.price * item.qty}</span>
                          </div>
                        ))}
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0' }}>
                          <span>Delivery</span><span>{delivery === 0 ? 'FREE' : `₹${delivery}`}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0', color: '#00c06b' }}>
                          <span>Discount</span><span>-₹{discount}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 700, paddingTop: 10, marginTop: 8, borderTop: '1px solid #e2e8f0' }}>
                          <span>Total Payable</span><span>₹{grandTotal}</span>
                        </div>
                      </div>
                      <div style={{ background: '#f0f7ff', borderRadius: 8, padding: 12, fontSize: 13, color: '#0a6ebd' }}>
                        📍 Delivering to your saved address. Estimated: <strong>2-4 Business Days</strong>
                      </div>
                    </div>
                  )}

                  {checkoutStep === 4 && orderPlaced && (
                    <div style={{ textAlign: 'center', padding: '30px 0' }}>
                      <div style={{ fontSize: 64, marginBottom: 16, animation: 'bounce .6s ease' }}>🎉</div>
                      <h3 style={{ fontFamily: "'Baloo 2',sans-serif", fontSize: 22, fontWeight: 700, marginBottom: 8, color: '#00c06b' }}>Order Placed Successfully!</h3>
                      <p style={{ color: '#6b7280', fontSize: 14, lineHeight: 1.6 }}>Thank you for shopping with FreshGuard!<br />Your protection is on its way.</p>
                      <div style={{ background: '#f0f3f8', borderRadius: 6, padding: '10px 16px', fontSize: 13, fontWeight: 700, margin: '12px auto', display: 'inline-block' }}>Order ID: {orderPlaced}</div>
                      <div style={{ marginTop: 20, padding: 14, background: '#f0fff8', borderRadius: 8, fontSize: 13, color: '#00c06b', textAlign: 'left' }}>
                        ✅ Confirmation SMS sent to your mobile<br />
                        📧 Order details emailed to you<br />
                        🚚 Tracking link will be shared shortly
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
            {/* Modal Footer */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: 12, flexShrink: 0 }}>
              {modalState === 'product' && selectedProduct && (
                <>
                  <button onClick={() => setModalState('closed')} style={{ flex: 1, background: '#f0f3f8', color: '#1a1a2e', border: '1px solid #e2e8f0', padding: 12, borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>← Back</button>
                  <button onClick={() => { addToCart(selectedProduct); setModalState('closed'); }} style={{ flex: 1.5, background: '#ff6d00', color: '#fff', border: 'none', padding: 12, borderRadius: 6, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>🛒 Add to Cart</button>
                  <button onClick={() => { addToCart(selectedProduct); setModalState('checkout'); setCheckoutStep(1); setOrderPlaced(null); }} style={{ flex: 1.5, background: '#0a6ebd', color: '#fff', border: 'none', padding: 12, borderRadius: 6, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>⚡ Buy Now</button>
                </>
              )}
              {modalState === 'checkout' && checkoutStep === 1 && (
                <button onClick={() => setCheckoutStep(2)} style={{ flex: 2, background: '#0a6ebd', color: '#fff', border: 'none', padding: 12, borderRadius: 6, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Continue to Payment →</button>
              )}
              {modalState === 'checkout' && checkoutStep === 2 && (
                <>
                  <button onClick={() => setCheckoutStep(1)} style={{ flex: 1, background: '#f0f3f8', color: '#1a1a2e', border: '1px solid #e2e8f0', padding: 12, borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>← Back</button>
                  <button onClick={() => setCheckoutStep(3)} style={{ flex: 2, background: '#0a6ebd', color: '#fff', border: 'none', padding: 12, borderRadius: 6, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Review Order →</button>
                </>
              )}
              {modalState === 'checkout' && checkoutStep === 3 && (
                <>
                  <button onClick={() => setCheckoutStep(2)} style={{ flex: 1, background: '#f0f3f8', color: '#1a1a2e', border: '1px solid #e2e8f0', padding: 12, borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>← Back</button>
                  <button onClick={placeOrder} disabled={paying} style={{ flex: 2, background: paying ? '#9ca3af' : '#ff6d00', color: '#fff', border: 'none', padding: 12, borderRadius: 6, fontSize: 14, fontWeight: 700, cursor: paying ? 'not-allowed' : 'pointer', transition: 'background .2s' }}>
                    {paying ? '⏳ Processing...' : `Place Order ₹${grandTotal} →`}
                  </button>
                </>
              )}
              {modalState === 'checkout' && checkoutStep === 4 && (
                <button onClick={() => { setModalState('closed'); setCart([]); }} style={{ flex: 1, background: '#0a6ebd', color: '#fff', border: 'none', padding: 12, borderRadius: 6, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Continue Shopping →</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── TOASTS ── */}
      <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {toasts.map(t => (
          <div key={t.id} style={{ background: '#1a1a2e', color: '#fff', padding: '12px 18px', borderRadius: 8, fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 10, animation: 'toastIn .3s ease', boxShadow: '0 4px 20px rgba(0,0,0,.2)', borderLeft: `4px solid ${t.type === 'success' ? '#00c06b' : '#e53e3e'}`, maxWidth: 320 }}>
            <span>{t.type === 'success' ? '✅' : '❌'}</span>{t.msg}
          </div>
        ))}
      </div>

      <style>{`
        @keyframes slideUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes toastIn { from { transform: translateX(60px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes bounce { 0%,100% { transform: scale(1); } 50% { transform: scale(1.15); } }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
        * { box-sizing: border-box; }
        input:focus, select:focus, textarea:focus { outline: none; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #c1c9d6; border-radius: 3px; }
        .subnav::-webkit-scrollbar { display: none; }
      `}</style>
    </>
  );
}
