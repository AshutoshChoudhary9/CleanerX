'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Script from 'next/script';
import { usePathname, useRouter } from 'next/navigation';

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
  metadata?: {
    bundleItems?: string[];
    bulkQty?: number;
    subDiscount?: number;
  };
}
interface CartItem extends Product { qty: number; }

const CATEGORY_ICON: Record<string, string> = { floor: '🧹', toilet: '🚽', glass: '🪟', combo: '📦' };

interface FreshGuardStoreProps {
  initialCategory?: string;
  hideHero?: boolean;
}

export default function FreshGuardStore({ initialCategory = 'all', hideHero = false }: FreshGuardStoreProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [wishlist, setWishlist] = useState<Product[]>([]);
  const [wishlistOpen, setWishlistOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState(initialCategory);
  const [searchQuery, setSearchQuery] = useState('');
  const [cartOpen, setCartOpen] = useState(false);
  const [modalState, setModalState] = useState<'closed' | 'product' | 'checkout'>('closed');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [checkoutStep, setCheckoutStep] = useState(1);
  const [selectedPayment, setSelectedPayment] = useState('upi');
  const [toasts, setToasts] = useState<{ id: number; msg: string; type: 'success' | 'error' }[]>([]);
  const [loading, setLoading] = useState(true);
  const [timer, setTimer] = useState(0);

  useEffect(() => {
    // Set timer to end of current day
    const now = new Date();
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    setTimer(Math.floor((end.getTime() - now.getTime()) / 1000));
  }, []);
  const [paying, setPaying] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState<string | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; email: string } | null>(null);
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' });
  const [authLoading, setAuthLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ type: 'cart' | 'wishlist'; product: Product } | null>(null);
  const [checkoutForm, setCheckoutForm] = useState({ name: '', email: '', mobile: '', address: '', city: '', pincode: '', state: 'Uttar Pradesh' });
  
  const searchRef = useRef<HTMLInputElement>(null);
  const productsRef = useRef<HTMLDivElement>(null);
  const authRef = useRef<HTMLDivElement>(null);

  const pathname = usePathname();
  const router = useRouter();

  // ── Sync category with prop ──
  useEffect(() => {
    setActiveCategory(initialCategory);
    fetchProducts(initialCategory, '');
  }, [initialCategory]);

  // ── Fetch products ──
  useEffect(() => {
    const interval = setInterval(() => setTimer(t => {
      if (t > 0) return t - 1;
      // Reset to end of current day instead of a fixed 6h window
      const now = new Date();
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      return Math.floor((end.getTime() - now.getTime()) / 1000);
    }), 1000);
    const handleClickOutside = (event: MouseEvent) => {
      if (authRef.current && !authRef.current.contains(event.target as Node)) {
        setAuthOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      clearInterval(interval);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const bootstrapAuth = async () => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
      if (!token) return;
      try {
        const res = await fetch('/api/me', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) {
          localStorage.removeItem('authToken');
          return;
        }
        const data = await res.json();
        setCurrentUser(data.user || null);
      } catch {
        localStorage.removeItem('authToken');
      }
    };

    bootstrapAuth();
  }, []);

  // Sync cart & wishlist whenever a user logs in (no products dependency needed)
  useEffect(() => {
    if (!currentUser) return;

    const syncUserState = async () => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
      if (!token) return;

      try {
        const [cartRes, wishlistRes] = await Promise.all([
          fetch('/api/cart', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/wishlist', { headers: { Authorization: `Bearer ${token}` } })
        ]);

        if (cartRes.ok) {
          const cartData = await cartRes.json();
          const cartItems = cartData.cart?.lines || [];
          const cartProducts = cartItems.map((item: any) => {
            const variant = item.merchandise;
            const p = variant.product;
            return {
              id: p.id,
              title: p.title,
              handle: p.handle,
              icon: p.featuredImage?.url || CATEGORY_ICON[p.tags?.[0]] || '🧴',
              price: parseFloat(item.cost.totalAmount.amount) / item.quantity,
              mrp: (parseFloat(item.cost.totalAmount.amount) / item.quantity) * 1.3,
              tags: p.tags || [],
              vol: variant.title || 'Standard',
              rating: 4.5,
              ratingCount: 120,
              qty: item.quantity,
            } as CartItem;
          });
          setCart(cartProducts);
        }

        if (wishlistRes.ok) {
          const wishlistData = await wishlistRes.json();
          const wishlistProducts = (wishlistData.wishlist?.products || []).map((p: any) => {
            const price = p.price || parseFloat(p.priceRange?.minVariantPrice?.amount || '0');
            const mrp = p.mrp || parseFloat(p.priceRange?.maxVariantPrice?.amount || '0') || price * 1.3;
            const vol = p.vol || p.variants?.[0]?.title || 'Standard';
            return {
              id: p.id,
              title: p.title,
              icon: p.icon || CATEGORY_ICON[p.tags?.[0]] || '🧴',
              price,
              mrp,
              tags: p.tags || [],
              vol,
              rating: p.rating || 4.5,
              ratingCount: p.ratingCount || 120,
              badge: p.badge,
            } as Product;
          });
          setWishlist(wishlistProducts);
        }
      } catch {
        showToast('Could not sync cart/wishlist', 'error');
      }
    };

    syncUserState();
  }, [currentUser]);

  const fetchProducts = async (category: string, query: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.set('query', query);
      // Map display categories to potential tags/filters in DB
      let apiCat = category;
      if (category === 'festive') apiCat = 'festive';
      if (category === 'bulk') apiCat = 'bulk';
      if (category === 'subscribe') apiCat = 'subscribe';

      if (category !== 'all') params.set('category', apiCat);
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

  useEffect(() => {
    if (searchQuery === '') {
      // Reset to full product list when search is cleared
      fetchProducts(activeCategory, '');
      return;
    }
    const delayDebounceFn = setTimeout(() => {
      fetchProducts(activeCategory, searchQuery);
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, activeCategory]);

  const handleSearch = (q: string) => {
    setSearchQuery(q);
  };

  const requireLogin = (product?: Product, type?: 'cart' | 'wishlist') => {
    showToast('Please login to continue', 'error');
    if (product && type) {
      setPendingAction({ type, product });
    }
    setAuthOpen(true);
    // Scroll to top where the auth dropdown is located
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return false;
  };

  const getAuthToken = () => (typeof window !== 'undefined' ? localStorage.getItem('authToken') : null);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authForm.email || !authForm.password || (authMode === 'signup' && !authForm.name)) {
      showToast('Please fill all required fields', 'error');
      return;
    }

    setAuthLoading(true);
    try {
      const endpoint = authMode === 'login' ? '/api/login' : '/api/register';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: authForm.name,
          email: authForm.email,
          password: authForm.password
        })
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Authentication failed', 'error');
        return;
      }

      localStorage.setItem('authToken', data.token);
      setCurrentUser(data.user);
      setAuthOpen(false);
      setAuthForm({ name: '', email: '', password: '' });
      showToast(authMode === 'login' ? 'Login successful' : 'Account created successfully');

      if (pendingAction) {
        if (pendingAction.type === 'cart') {
          await addToCart(pendingAction.product);
        } else {
          await toggleWishlist(pendingAction.product);
        }
        setPendingAction(null);
      }
    } catch {
      showToast('Authentication request failed', 'error');
    } finally {
      setAuthLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    setCurrentUser(null);
    setCart([]);
    setWishlist([]);
    setAuthOpen(false);
    showToast('Logged out');
  };

  // ── Cart ──
  const addToCart = async (p: Product) => {
    if (!currentUser) {
      return requireLogin(p, 'cart');
    }

    const cartKey = `${p.id}-${p.vol || 'std'}`;
    setCart(prev => {
      const ex = prev.find(c => `${c.id}-${c.vol || 'std'}` === cartKey);
      if (ex) return prev.map(c => `${c.id}-${c.vol || 'std'}` === cartKey ? { ...c, qty: c.qty + 1 } : c);
      return [...prev, { ...p, qty: 1 }];
    });

    try {
      const token = getAuthToken();
      if (token) {
        const res = await fetch('/api/cart/add', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ productId: p.id, quantity: 1 })
        });
        if (!res.ok) throw new Error('Failed to sync cart');
      }
      showToast(`${p.icon || '🛒'} ${p.title.split(' ').slice(0, 3).join(' ')} added!`);
    } catch (err) {
      console.error(err);
      showToast('Error saving to cart', 'error');
      // Rollback local state
      setCart(prev => {
        const target = prev.find(c => `${c.id}-${c.vol || 'std'}` === cartKey);
        // Rollback: if qty was incremented, decrement; if it was a new item, remove it
        if (target && target.qty > 1) return prev.map(c => `${c.id}-${c.vol || 'std'}` === cartKey ? { ...c, qty: c.qty - 1 } : c);
        return prev.filter(c => `${c.id}-${c.vol || 'std'}` !== cartKey);
      });
    }
  };

  const changeQty = async (cartKey: string, delta: number) => {
    if (!currentUser) {
      showToast('Please login to continue', 'error');
      return;
    }

    const target = cart.find(c => `${c.id}-${c.vol || 'std'}` === cartKey);
    if (!target) return;

    setCart(prev => {
      const updated = prev.map(c => `${c.id}-${c.vol || 'std'}` === cartKey ? { ...c, qty: c.qty + delta } : c);
      return updated.filter(c => c.qty > 0);
    });

    const token = getAuthToken();
    if (!token) return;

    // Use target.id (which could be product ID or variant ID) for API calls
    if (delta > 0 || (target.qty + delta > 0)) {
      await fetch('/api/cart/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ productId: target.id, quantity: delta })
      });
    }

    if (target.qty + delta <= 0) {
      await fetch(`/api/cart/remove/${target.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
    }
  };

  const removeFromCart = async (productId: string, vol?: string) => {
    if (!currentUser) {
      showToast('Please login to continue', 'error');
      return;
    }

    const cartKey = `${productId}-${vol || 'std'}`;
    const target = cart.find(c => `${c.id}-${c.vol || 'std'}` === cartKey);
    if (!target) return;

    setCart(prev => prev.filter(c => `${c.id}-${c.vol || 'std'}` !== cartKey));
    
    const token = getAuthToken();
    if (token) {
      await fetch(`/api/cart/remove/${target.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
    }
  };

  const cartTotal = Math.round(cart.reduce((a, c) => a + c.price * c.qty, 0) * 100) / 100;
  const cartQty = cart.reduce((a, c) => a + c.qty, 0);
  const delivery = cartTotal >= 299 || cartTotal === 0 ? 0 : 49;
  const comboDiscount = (cartTotal >= 299 && cartTotal > 0) ? 49 : 0;
  const upiDiscount = selectedPayment === 'upi' ? Math.round(cartTotal * 0.1) : 0;
  const codFee = selectedPayment === 'cod' ? 49 : 0;
  const discount = comboDiscount + upiDiscount;
  const grandTotal = Math.max(0, Math.round((cartTotal + delivery - discount + codFee) * 100) / 100);

  // ── Wishlist ──
  const toggleWishlist = async (p: Product) => {
    if (!currentUser) {
      return requireLogin(p, 'wishlist');
    }

    const token = getAuthToken();
    if (!token) return;

    setWishlist(prev => {
      const exists = prev.find(x => x.id === p.id);
      if (exists) {
        fetch(`/api/wishlist/remove/${p.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        });
        showToast('Removed from wishlist', 'error');
        return prev.filter(x => x.id !== p.id);
      } else {
        fetch('/api/wishlist/add', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ productId: p.id })
        });
        showToast('Added to wishlist! ❤️');
        return [...prev, p];
      }
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
        // Pre-save order as pending
        await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: data.orderId,
            customerName: checkoutForm.name,
            email: checkoutForm.email || currentUser?.email || '',
            mobile: checkoutForm.mobile,
            address: checkoutForm.address,
            city: checkoutForm.city,
            pincode: checkoutForm.pincode,
            state: checkoutForm.state,
            items: cart,
            totalAmount: grandTotal,
            paymentMethod: selectedPayment,
            paymentStatus: 'pending',
            razorpayOrderId: data.orderId
          })
        });

        const rzp = new (window as any).Razorpay({
          key: data.keyId,
          amount: data.amount,
          currency: data.currency,
          order_id: data.orderId,
          name: 'FreshGuard',
          description: 'Cleaning Products Order',
          theme: { color: '#0a6ebd' },
          handler: async (response: any) => {
            // Update order to paid — include user auth token so the API allows it
            const patchToken = getAuthToken();
            await fetch('/api/orders', {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                ...(patchToken ? { Authorization: `Bearer ${patchToken}` } : {})
              },
              body: JSON.stringify({
                orderId: response.razorpay_order_id,
                status: 'paid',
                razorpayPaymentId: response.razorpay_payment_id
              })
            });

            setOrderPlaced(response.razorpay_order_id || `FG${Date.now().toString().slice(-8)}`);
            setCheckoutStep(4);
            setPaying(false);
            setCart([]);
            // Clear DB Cart
            const token = getAuthToken();
            if (token) {
              fetch('/api/cart/clear', {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
              });
            }
          },
          modal: { ondismiss: () => setPaying(false) },
        });
        rzp.open();
      } else {
        const orderId = `FG${Date.now().toString().slice(-8)}`;
        // Save order as pending/paid for non-Razorpay (COD)
        await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId,
            customerName: checkoutForm.name,
            email: checkoutForm.email || currentUser?.email || '',
            mobile: checkoutForm.mobile,
            address: checkoutForm.address,
            city: checkoutForm.city,
            pincode: checkoutForm.pincode,
            state: checkoutForm.state,
            items: cart,
            totalAmount: grandTotal,
            paymentMethod: selectedPayment,
            paymentStatus: selectedPayment === 'cod' ? 'pending' : 'paid'
          })
        });

        setOrderPlaced(orderId);
        setCheckoutStep(4);
        setCart([]);
        // Clear DB Cart
        const token = getAuthToken();
        if (token) {
          fetch('/api/cart/clear', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` }
          });
        }
      }
    } catch {
      showToast('Payment failed. Please try again.', 'error');
    } finally {
      setPaying(false);
    }
  };

  // ── Add Custom Product ──

  const timerStr = `${String(Math.floor(timer / 3600)).padStart(2, '0')}:${String(Math.floor((timer % 3600) / 60)).padStart(2, '0')}:${String(timer % 60).padStart(2, '0')}`;

  return (
    <>
      {/* Use next/script so the Razorpay SDK actually executes in the browser */}
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />

      {/* ── NAV ── */}
      <nav>
        <div className="nav-inner">
          <Link href="/" className="logo">
            <span className="logo-name">🌿 FreshGuard</span>
            <span className="logo-tag">Protection In Every Drop</span>
          </Link>
          <div className="search-bar">
            <input
              ref={searchRef}
              type="text"
              value={searchQuery}
              onChange={e => handleSearch(e.target.value)}
              placeholder="Search for floor cleaner, glass cleaner..."
            />
            {/* Force a refetch instead of calling handleSearch which no-ops on unchanged query */}
            <button onClick={() => fetchProducts(activeCategory, searchQuery)}>🔍 Search</button>
          </div>
          <div className="nav-actions">
            
            <div className="signin-wrapper" ref={authRef}>
              <button
                className="nav-btn"
                onClick={() => currentUser ? setAuthOpen(!authOpen) : router.push('/login')}
              >
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                {currentUser ? currentUser.name.split(' ')[0] : 'Sign In'}
              </button>

              {authOpen && (
                <div className="auth-card open">
                  <div className="heading">{currentUser ? 'Your Account' : authMode === 'login' ? 'Log In' : 'Sign Up'}</div>
                  {currentUser ? (
                    <div>
                      <p style={{ marginBottom: 6, fontWeight: 700 }}>{currentUser.name}</p>
                      <p style={{ marginBottom: 18, fontSize: 13, color: '#64748b' }}>{currentUser.email}</p>
                      <button className="btn" type="button" onClick={logout}>Logout</button>
                    </div>
                  ) : (
                  <form className="form" onSubmit={handleAuthSubmit}>
                    {authMode === 'signup' && (
                      <div className="input-field" style={{ marginBottom: 20 }}>
                        <input type="text" id="card-name" required value={authForm.name} onChange={(e) => setAuthForm(prev => ({ ...prev, name: e.target.value }))} />
                        <label htmlFor="card-name">Full Name</label>
                      </div>
                    )}
                    <div className="input-field" style={{ marginBottom: 20 }}>
                      <input type="email" id="card-email" required value={authForm.email} onChange={(e) => setAuthForm(prev => ({ ...prev, email: e.target.value }))} />
                      <label htmlFor="card-email">Email</label>
                    </div>
                    <div className="input-field">
                      <input type="password" id="card-password" required value={authForm.password} onChange={(e) => setAuthForm(prev => ({ ...prev, password: e.target.value }))} />
                      <label htmlFor="card-password">Password</label>
                    </div>
                    <div className="btn-container" style={{ marginTop: 24 }}>
                      <button className="btn" type="submit" disabled={authLoading}>{authLoading ? 'Please wait...' : authMode === 'login' ? 'Login' : 'Create Account'}</button>
                    </div>
                    <div style={{ textAlign: 'center', fontSize: 13, marginTop: 16, color: '#64748b' }}>
                      {authMode === 'login' ? "Don't have an account? " : "Already have an account? "}
                      <span style={{ color: '#0034de', fontWeight: 'bold', cursor: 'pointer' }}
                        onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}>
                        {authMode === 'login' ? 'Sign Up' : 'Log In'}
                      </span>
                    </div>
                  </form>
                  )}
                </div>
              )}
            </div>

            <button className="nav-btn wishlist-badge" onClick={() => currentUser ? setWishlistOpen(true) : requireLogin()}>
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="22" height="22">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                {wishlist.length > 0 && <span className="badge" style={{ background: '#ef4444' }}>{wishlist.length}</span>}
              </div>
              Wishlist
            </button>
            <button className="nav-btn cart-badge" onClick={() => currentUser ? setCartOpen(true) : requireLogin()}>
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="22" height="22">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                {cartQty > 0 && <span className="badge">{cartQty}</span>}
              </div>
              Cart
            </button>
            <button className="nav-btn" onClick={() => showToast('Track your orders here!', 'success')}>
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Orders
            </button>
          </div>
        </div>
      </nav>

      {/* ── SUBNAV ── */}
      <div className="subnav">
        <div className="subnav-inner">
          <Link href="/" className={`snav-item ${pathname === '/' ? 'active' : ''}`}>All Products</Link>
          <Link href="/floor-cleaners" className={`snav-item ${pathname === '/floor-cleaners' ? 'active' : ''}`}>🧹 Floor Cleaners</Link>
          <Link href="/toilet-cleaners" className={`snav-item ${pathname === '/toilet-cleaners' ? 'active' : ''}`}>🚽 Toilet Cleaners</Link>
          <Link href="/glass-cleaners" className={`snav-item ${pathname === '/glass-cleaners' ? 'active' : ''}`}>🪟 Glass Cleaners</Link>
          <Link href="/combo-offers" className={`snav-item ${pathname === '/combo-offers' ? 'active' : ''}`}>📦 Combo Offers</Link>
          <Link href="/festive-deals" className={`snav-item ${pathname === '/festive-deals' ? 'active' : ''}`}>🎉 Festive Deals</Link>
          <Link href="/bulk-orders" className={`snav-item ${pathname === '/bulk-orders' ? 'active' : ''}`}>🏭 Bulk Orders</Link>
          <Link href="/subscribe-save" className={`snav-item ${pathname === '/subscribe-save' ? 'active' : ''}`}>🔁 Subscribe & Save</Link>
        </div>
      </div>

      {/* ── OFFERS STRIP ── */}
      <div className="offers-strip">
        <div className="offer-item"><span className="oi">🚚</span> <strong>FREE Delivery</strong> on orders above ₹299</div>
        <div className="offer-item"><span className="oi">💳</span> Extra <strong>10% off</strong> on UPI payments</div>
        <div className="offer-item"><span className="oi">🔁</span> <strong>Subscribe & Save</strong> up to 15%</div>
        <div className="offer-item"><span className="oi">🎁</span> Buy 3, Get <strong>1 FREE</strong> on all cleaners</div>
        <div className="offer-item"><span className="oi">⭐</span> <strong>FreshGuard Plus</strong> – Premium Membership</div>
      </div>

      {/* ── HERO ── */}
      {!hideHero && (
        <div className="hero">
          <div className="hero-left">
            <div className="hero-eyebrow">India's #1 Cleaning Brand</div>
            <div className="hero-title">Protection In<br /><span>Every Drop</span></div>
            <div className="hero-sub">Scientifically formulated cleaners that eliminate 99.9% of germs. Keep your home fresh, clean, and protected — naturally.</div>
            <div className="hero-ctas">
              <button className="btn-primary" onClick={() => productsRef.current?.scrollIntoView({ behavior: 'smooth' })}>Shop Now</button>
              <button className="btn-outline" onClick={() => router.push('/')}>View All Products</button>
            </div>
          </div>
          <div className="hero-right">
            {[
              { icon: '🧴', name: 'Floor Cleaner', price: '₹149', href: '/floor-cleaners' },
              { icon: '🚽', name: 'Toilet Cleaner', price: '₹129', href: '/toilet-cleaners' },
              { icon: '🪟', name: 'Glass Cleaner', price: '₹119', href: '/glass-cleaners' },
            ].map(hc => (
              <Link key={hc.href} href={hc.href} className="hero-product-card">
                <div className="icon">{hc.icon}</div>
                <div className="name">{hc.name}</div>
                <div className="price">{hc.price}</div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── MAIN ── */}
      <div className="main">
        {/* Features */}
        {!hideHero && (
          <div className="features">
            {[
              { icon: '🚚', title: 'Fast Delivery', desc: 'Same-day delivery in select cities' },
              { icon: '✅', title: 'Certified Safe', desc: 'ISO & BIS certified formulas' },
              { icon: '🌿', title: 'Eco-Friendly', desc: 'Biodegradable, planet-safe' },
              { icon: '↩️', title: 'Easy Returns', desc: '7-day no-questions return policy' },
            ].map(f => (
              <div key={f.title} className="feat">
                <div className="feat-icon">{f.icon}</div>
                <div className="feat-title">{f.title}</div>
                <div className="feat-desc">{f.desc}</div>
              </div>
            ))}
          </div>
        )}

        {/* Categories Section (Only on All Products) */}
        {initialCategory === 'all' && !hideHero && (
          <>
            <div className="section-header">
              <div className="section-title">Shop by <span>Category</span></div>
            </div>
            <div className="cat-grid">
              {[
                { key: 'floor', name: 'Floor Cleaners', icon: '🧹', desc: 'Powerful disinfection for marble, tile, granite & wooden floors. Removes stains and leaves a fresh fragrance.', href: '/floor-cleaners' },
                { key: 'toilet', name: 'Toilet Cleaners', icon: '🚽', desc: 'Thick gel formula that clings to surfaces, removes stains & limescale. 100% germ-free guarantee.', href: '/toilet-cleaners' },
                { key: 'glass', name: 'Glass Cleaners', icon: '🪟', desc: 'Streak-free, crystal-clear finish on windows, mirrors & glass surfaces. Dries instantly.', href: '/glass-cleaners' },
              ].map(cat => (
                <Link href={cat.href} key={cat.key} className={`cat-card ${cat.key}`}>
                  <div className="cat-icon">{cat.icon}</div>
                  <div>
                    <div className="cat-name">{cat.name}</div>
                    <div className="cat-desc">{cat.desc}</div>
                  </div>
                  <div className="cat-arrow">›</div>
                </Link>
              ))}
            </div>
          </>
        )}

        {/* Deals of the Day (Only on Main or Deals Page) */}
        {(initialCategory === 'all' || initialCategory === 'festive') && (
          <div className="deals-section">
            <div className="deals-header">
              <div className="deals-title">🔥 {initialCategory === 'festive' ? 'Festive Specials' : 'Deal of the Day'}</div>
              <div className="deal-timer">⏰ Ends in <span id="timer">{timerStr}</span></div>
            </div>
            <div className="deals-grid">
              {[
                { id: 'ecogreen-all-purpose-cleaner', icon: '🧴', name: 'EcoGreen All-Purpose', disc: '43% OFF', price: 99, mrp: 179, tags: ['eco-friendly'], vol: '500ml' },
                { id: 'max-power-bathroom-cleaner', icon: '🚽', name: 'Max Power Bathroom', disc: '44% OFF', price: 129, mrp: 229, tags: ['bathroom-cleaners'], vol: 'Spray' },
                { id: 'crystal-clear-window-cleaner', icon: '🪟', name: 'Crystal Clear Window', disc: '40% OFF', price: 119, mrp: 199, tags: ['window-care'], vol: '1L' },
                { id: 'industrial-degreaser-pro', icon: '🏠', name: 'Industrial Degreaser', disc: '40% OFF', price: 599, mrp: 999, tags: ['general'], vol: '750ml' },
                { id: 'purefresh-disinfecting-wipes', icon: '💜', name: 'PureFresh Wipes', disc: '45% OFF', price: 99, mrp: 179, tags: ['general'], vol: '80 Wipes' },
              ].map(deal => (
                <div key={deal.id} className="deal-card" onClick={() => addToCart({ ...deal, title: deal.name, rating: 4.5, ratingCount: 0, badge: 'Hot' })}>
                  <div className="icon">{deal.icon}</div>
                  <div className="name">{deal.name}</div>
                  <div className="disc">{deal.disc}</div>
                  <div className="price">₹{deal.price} <s style={{ fontSize: 11 }}>₹{deal.mrp}</s></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── PRODUCTS ── */}
        <div ref={productsRef} id="products">
          <div className="section-header">
            <div className="section-title">
              {initialCategory === 'all' ? 'All' : initialCategory.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase())} <span>Products</span>
            </div>
            {initialCategory !== 'all' && <Link href="/" className="see-all">View All ›</Link>}
          </div>

          <div className="prod-grid">
            {loading ? (
               Array.from({ length: 8 }).map((_, i) => (
                 <div key={i} className="prod-card" style={{ padding: 20 }}>
                   <div style={{ height: 160, background: '#e2e8f0', borderRadius: 8, animation: 'pulse 1.5s ease-in-out infinite' }} />
                   <div style={{ padding: '16px 0' }}>
                     <div style={{ height: 16, background: '#e2e8f0', width: '80%', marginBottom: 8 }} />
                     <div style={{ height: 16, background: '#e2e8f0', width: '40%' }} />
                   </div>
                 </div>
               ))
            ) : filteredProducts.length === 0 ? (
               <div style={{ textAlign: 'center', padding: '60px 20px', color: '#6b7280', gridColumn: '1/-1' }}>
                 <div style={{ fontSize: 60, marginBottom: 12 }}>🔍</div>
                 <p style={{ fontSize: 16 }}>No products found in this category.</p>
                 <button onClick={() => { setSearchQuery(''); fetchProducts(activeCategory, ''); }} className="btn-outline" style={{ color: 'var(--primary)', borderColor: 'var(--primary)', marginTop: 20 }}>Refresh</button>
               </div>
            ) : (
               filteredProducts.map((p: any) => {
                 const price = p.price || parseFloat(p.priceRange?.minVariantPrice?.amount || '0');
                 const mrp = p.mrp || parseFloat(p.priceRange?.maxVariantPrice?.amount || '0') || price * 1.3;
                 const disc = Math.round((1 - price / mrp) * 100);
                 const inWish = wishlist.some(x => x.id === p.id);
                 const vol = p.vol || p.variants?.[0]?.title || 'Standard';
                 const badgeClass = p.badge === 'New' ? 'new' : p.badge ? 'hot' : '';
                 const itemIcon = p.icon || CATEGORY_ICON[p.tags?.[0]] || '🧴';
                 const product: Product = { 
                    id: p.id, 
                    title: p.title, 
                    icon: itemIcon, 
                    price, 
                    mrp, 
                    tags: p.tags || [], 
                    vol, 
                    rating: p.rating || 4.5, 
                    ratingCount: p.ratingCount || 120, 
                    badge: p.badge,
                    metadata: p.metadata
                  };

                 return (
                  <div key={p.id} className="prod-card" onClick={() => { setSelectedProduct(product); setModalState('product'); }}>
                    <div className="prod-img">
                      {itemIcon}
                      {product.badge && <div className={`prod-badge ${badgeClass}`}>{product.badge}</div>}
                      <div className={`prod-wishlist ${inWish ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); toggleWishlist(product); }}>
                        {inWish ? '❤️' : '🤍'}
                      </div>
                    </div>
                    <div className="prod-info">
                      <div className="prod-brand">FreshGuard</div>
                      <div className="prod-name">{p.title}</div>
                      <div className="prod-vol">{vol}</div>
                      {p.metadata?.bundleItems?.length > 0 ? (
                        <div style={{ color: '#0034de', fontSize: '11px', fontWeight: 'bold', margin: '6px 0', display: 'flex', alignItems: 'center', gap: '4px' }}><span>📦</span> Includes: {p.metadata.bundleItems.join(' + ')}</div>
                      ) : p.metadata?.bulkQty > 1 ? (
                        <div style={{ color: '#00c06b', fontSize: '11px', fontWeight: 'bold', margin: '6px 0', display: 'flex', alignItems: 'center', gap: '4px' }}><span>🏭</span> Pack of {p.metadata.bulkQty} Units</div>
                      ) : (
                        <div style={{ color: '#94a3b8', fontSize: '10px', margin: '6px 0', display: 'flex', alignItems: 'center', gap: '4px' }}><span>🧴</span> Single Product</div>
                      )}
                      {p.metadata?.subDiscount > 0 && (
                        <div style={{ color: '#8b5cf6', fontSize: '11px', fontWeight: 'bold', margin: '4px 0', display: 'flex', alignItems: 'center', gap: '4px' }}><span>🔁</span> Save {p.metadata.subDiscount}% with Sub</div>
                      )}
                      {product.rating! > 0 && (
                        <div className="prod-rating">
                          <span className="stars">★ {product.rating}</span>
                          <span className="rating-count">({product.ratingCount})</span>
                        </div>
                      )}
                      <div className="prod-price-row">
                        <div className="prod-price">₹{price}</div>
                        <div className="prod-mrp">₹{Math.round(mrp)}</div>
                        <div className="prod-disc">{disc}% off</div>
                      </div>
                    </div>
                    <div className="prod-actions">
                      <button className="btn-cart" onClick={(e) => { e.stopPropagation(); addToCart(product); }}>🛒 Cart</button>
                      <button className="btn-buy" onClick={(e) => { e.stopPropagation(); addToCart(product); if (currentUser) setCartOpen(true); }}>⚡ Buy</button>
                    </div>
                  </div>
                 );
               })
            )}
          </div>
        </div>


      </div>{/* /main */}

      {/* ── FOOTER ── */}
      <footer>
        <div className="footer-grid">
          <div className="footer-brand">
            <h2>🌿 FreshGuard</h2>
            <p>India's most trusted cleaning brand. Scientifically formulated for homes, offices and commercial spaces. Protection In Every Drop.</p>
          </div>
          {[
            { title: 'Products', links: ['Floor Cleaners', 'Toilet Cleaners', 'Glass Cleaners', 'Combo Packs', 'Commercial Range'] },
            { title: 'Company', links: ['About Us', 'Careers', 'Press', 'Sustainability', 'Blog'] },
            { title: 'Support', links: ['Help Center', 'Contact Us', 'Returns', 'Track Order', 'Privacy Policy'] },
          ].map(col => (
            <div className="footer-col" key={col.title}>
              <h4>{col.title}</h4>
              <ul>
                {col.links.map(link => {
                  let href = '#';
                  if (link === 'About Us') href = '/about';
                  if (link === 'Privacy Policy') href = '/privacy';
                  if (link === 'Contact Us') href = '/contact';
                  if (link === 'Floor Cleaners') href = '/floor-cleaners';
                  if (link === 'Toilet Cleaners') href = '/toilet-cleaners';
                  if (link === 'Glass Cleaners') href = '/glass-cleaners';
                  
                  if (href !== '#') return <li key={link}><Link href={href} style={{ color: 'inherit', textDecoration: 'none' }}>{link}</Link></li>;
                  return <li key={link} onClick={() => showToast(`${link} page coming soon!`)}>{link}</li>;
                })}
              </ul>
            </div>
          ))}
        </div>
        <div className="footer-bottom">
          <span>© 2025 FreshGuard Pvt. Ltd. All rights reserved.</span>
          <span>Made with 💚 for cleaner homes | <Link href="/admin" style={{ color: 'inherit', textDecoration: 'none', opacity: 0.5 }}>Owner Login</Link></span>
        </div>
      </footer>

      {/* ── WISHLIST SIDEBAR ── */}
      <div className={`cart-overlay ${wishlistOpen ? 'open' : ''}`} onClick={() => setWishlistOpen(false)}></div>
      <div className={`cart-sidebar ${wishlistOpen ? 'open' : ''}`} style={{ borderLeft: '5px solid #ef4444' }}>
        <div className="cart-head" style={{ background: '#ef4444' }}>
          <h2>❤️ My Wishlist ({wishlist.length} items)</h2>
          <button className="cart-close" onClick={() => setWishlistOpen(false)}>✕</button>
        </div>
        <div className="cart-items">
          {wishlist.length === 0 ? (
            <div className="cart-empty">
              <div className="icon">❤️</div>
              <p style={{ fontWeight: 600 }}>Your wishlist is empty</p>
              <p style={{ fontSize: 13, marginTop: 8 }}>Save items you like for later!</p>
            </div>
          ) : (
            wishlist.map(item => (
              <div key={item.id} className="cart-item">
                <div className="ci-img">{item.icon}</div>
                <div className="ci-info">
                  <div className="ci-name">{item.title}</div>
                  <div className="ci-vol">{item.vol}</div>
                  <div className="ci-price">₹{item.price}</div>
                  <div className="ci-qty">
                    <button className="btn-cart" style={{ padding: '6px 12px', fontSize: 13 }} onClick={() => { addToCart(item); toggleWishlist(item); }}>🛒 Add to Cart</button>
                    <button className="ci-remove" onClick={() => toggleWishlist(item)}>🗑 Remove</button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        {wishlist.length > 0 && (
          <div className="cart-footer">
            <button className="checkout-btn" style={{ background: 'var(--primary)' }} onClick={() => { 
                // Snapshot the wishlist before iteration so mutations don't skip items
                const snapshot = [...wishlist];
                snapshot.forEach(item => {
                  addToCart(item);
                  toggleWishlist(item); // Handles DB removal
                });
                setWishlistOpen(false); 
                showToast('All items added to cart!'); 
              }}>🛒 Add All to Cart →</button>
          </div>
        )}
      </div>

      {/* ── CART SIDEBAR ── */}
      <div className={`cart-overlay ${cartOpen ? 'open' : ''}`} onClick={() => setCartOpen(false)}></div>
      <div className={`cart-sidebar ${cartOpen ? 'open' : ''}`}>
        <div className="cart-head">
          <h2>🛒 My Cart ({cartQty} items)</h2>
          <button className="cart-close" onClick={() => setCartOpen(false)}>✕</button>
        </div>
        <div className="cart-items">
          {cart.length === 0 ? (
            <div className="cart-empty">
              <div className="icon">🛒</div>
              <p style={{ fontWeight: 600 }}>Your cart is empty</p>
              <p style={{ fontSize: 13, marginTop: 8 }}>Add some products to get started</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="cart-item">
                <div className="ci-img">{item.icon}</div>
                <div className="ci-info">
                  <div className="ci-name">{item.title}</div>
                  <div className="ci-vol">{item.vol}</div>
                  <div className="ci-price">₹{item.price * item.qty}</div>
                  <div className="ci-qty">
                    {/* Must pass composite key to match cart lookup in changeQty */}
                    <button className="qty-btn" onClick={() => changeQty(`${item.id}-${item.vol || 'std'}`, -1)}>−</button>
                    <div className="qty-num">{item.qty}</div>
                    <button className="qty-btn" onClick={() => changeQty(`${item.id}-${item.vol || 'std'}`, 1)}>+</button>
                    <button className="ci-remove" onClick={() => removeFromCart(item.id, item.vol)}>🗑 Remove</button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        {cart.length > 0 && (
          <div className="cart-footer">
            <div className="price-row"><span>Subtotal</span><span>₹{cartTotal}</span></div>
            <div className="price-row"><span>Delivery</span><span>{delivery === 0 ? 'FREE 🎉' : `₹${delivery}`}</span></div>
            <div className="discount-row"><span>Discount</span><span>-₹{discount}</span></div>
            <div className="price-row total"><span>Total</span><span>₹{grandTotal}</span></div>
            <button className="checkout-btn" onClick={() => { setCartOpen(false); setCheckoutStep(1); setModalState('checkout'); setOrderPlaced(null); }}>Proceed to Checkout →</button>
          </div>
        )}
      </div>

      {/* ── PRODUCT / CHECKOUT MODAL ── */}
      <div className={`modal-overlay ${modalState !== 'closed' ? 'open' : ''}`} onClick={() => setModalState('closed')}>
        {modalState !== 'closed' && (
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <h2>
                {modalState === 'product' && selectedProduct ? `${selectedProduct.icon} ${selectedProduct.title}` : ['', '📍 Delivery Address', '💳 Payment Method', '📋 Review Order', '✅ Order!'][checkoutStep]}
              </h2>
              <button className="modal-close" onClick={() => setModalState('closed')}>✕</button>
            </div>
            
            <div className="modal-body">
              {modalState === 'product' && selectedProduct ? (
                <>
                  <div style={{ textAlign: 'center', background: 'linear-gradient(135deg,#f8faff,#eff4ff)', borderRadius: 10, padding: 30, marginBottom: 20, fontSize: 80 }}>{selectedProduct.icon}</div>
                  <h3 style={{ fontFamily: "'Baloo 2',sans-serif", fontSize: 22, fontWeight: 800 }}>{selectedProduct.title}</h3>
                  {selectedProduct.rating! > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '12px 0' }}>
                      <span className="stars">★ {selectedProduct.rating}</span>
                      <span className="rating-count">({selectedProduct.ratingCount} ratings)</span>
                    </div>
                  )}
                  <div className="prod-price-row" style={{ marginTop: 16 }}>
                    <span style={{ fontSize: 28, fontWeight: 800 }}>₹{selectedProduct.price}</span>
                    <span className="prod-mrp" style={{ fontSize: 16 }}>₹{selectedProduct.mrp}</span>
                    <span className="prod-disc" style={{ fontSize: 16 }}>{Math.round((1 - selectedProduct.price / selectedProduct.mrp) * 100)}% off</span>
                  </div>
                  <div style={{ background: '#f0fff8', borderRadius: 8, padding: 12, marginTop: 16, fontSize: 13, color: '#00c06b', fontWeight: 600 }}>
                    ✅ Volume: {selectedProduct.vol}  |  🚚 Free delivery ₹299+  |  ↩️ 7-day returns
                  </div>
                </>
              ) : modalState === 'checkout' ? (
                <>
                  {checkoutStep < 4 && (
                    <div className="steps">
                      {['Address', 'Payment', 'Review'].map((s, i) => (
                        <div key={s} className={`step ${i + 1 === checkoutStep ? 'active' : ''} ${i + 1 < checkoutStep ? 'done' : ''}`} onClick={() => i + 1 <= checkoutStep && setCheckoutStep(i + 1)}>
                          {i + 1 < checkoutStep ? '✓ ' : `${i + 1}. `}{s}
                        </div>
                      ))}
                    </div>
                  )}

                  {checkoutStep === 1 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      <div className="form-group"><label>Full Name</label><input type="text" placeholder="Your full name" value={checkoutForm.name} onChange={e => setCheckoutForm({...checkoutForm, name: e.target.value})} /></div>
                      <div className="form-group"><label>Email Address</label><input type="email" placeholder="email@example.com" value={checkoutForm.email} onChange={e => setCheckoutForm({...checkoutForm, email: e.target.value})} /></div>
                      <div className="form-group"><label>Mobile Number</label><input type="tel" placeholder="10-digit mobile number" value={checkoutForm.mobile} onChange={e => setCheckoutForm({...checkoutForm, mobile: e.target.value})} /></div>
                      <div className="form-group"><label>Address Line 1</label><input type="text" placeholder="House/Flat/Block No." value={checkoutForm.address} onChange={e => setCheckoutForm({...checkoutForm, address: e.target.value})} /></div>
                      <div className="form-row">
                        <div className="form-group"><label>City</label><input type="text" placeholder="City" value={checkoutForm.city} onChange={e => setCheckoutForm({...checkoutForm, city: e.target.value})} /></div>
                        <div className="form-group"><label>PIN Code</label><input type="text" maxLength={6} placeholder="6-digit PIN" value={checkoutForm.pincode} onChange={e => setCheckoutForm({...checkoutForm, pincode: e.target.value})} /></div>
                      </div>
                      <div className="form-group"><label>State</label><select value={checkoutForm.state} onChange={e => setCheckoutForm({...checkoutForm, state: e.target.value})}><option>Uttar Pradesh</option><option>Maharashtra</option><option>Delhi</option><option>Karnataka</option><option>Tamil Nadu</option><option>Gujarat</option><option>West Bengal</option><option>Punjab</option><option>Haryana</option><option>Other</option></select></div>
                    </div>
                  )}

                  {checkoutStep === 2 && (
                    <>
                      <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>Choose your payment method:</p>
                      <div className="pay-methods">
                         {[ { key: 'upi', icon: '📱', label: 'UPI' }, { key: 'card', icon: '💳', label: 'Credit/Debit Card' }, { key: 'nb', icon: '🏦', label: 'Net Banking' }, { key: 'cod', icon: '💵', label: 'Cash on Delivery' } ].map(pm => (
                           <div key={pm.key} className={`pay-method ${selectedPayment === pm.key ? 'selected' : ''}`} onClick={() => setSelectedPayment(pm.key)}>
                             <span className="mi">{pm.icon}</span>{pm.label}
                           </div>
                         ))}
                      </div>
                      {selectedPayment === 'upi' && (
                        <div className="form-group"><label>UPI ID</label><input type="text" placeholder="yourname@upi" /><p style={{ fontSize: 12, color: '#00c06b', background: '#f0fff8', padding: 10, borderRadius: 6, marginTop: 10 }}>💚 Extra 10% OFF on UPI payments applied!</p></div>
                      )}
                      {selectedPayment === 'card' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                          <div className="form-group"><input type="text" maxLength={19} placeholder="1234 5678 9012 3456" /></div>
                          <div className="form-row">
                            <div className="form-group"><input type="text" placeholder="MM/YY" maxLength={5} /></div>
                            <div className="form-group"><input type="password" placeholder="CVV" maxLength={3} /></div>
                          </div>
                        </div>
                      )}
                      {selectedPayment === 'cod' && (
                        // grandTotal already includes the ₹49 COD fee — don't add it again
                        <p style={{ fontSize: 13, background: '#fff8f0', padding: 12, borderRadius: 8, borderLeft: '4px solid #ff6d00' }}>💵 Pay ₹{grandTotal} cash upon delivery. Note: COD fee of ₹49 is included.</p>
                      )}
                    </>
                  )}

                  {checkoutStep === 3 && (
                    <div className="order-summary">
                      <div className="os-title">Order Summary</div>
                      {cart.map(item => (
                        <div key={item.id} className="os-item">
                          <span>{item.icon} {item.title} ×{item.qty}</span>
                          <span>₹{item.price * item.qty}</span>
                        </div>
                      ))}
                      <div className="os-item"><span>Delivery</span><span>{delivery === 0 ? 'FREE' : `₹${delivery}`}</span></div>
                      <div className="os-item" style={{ color: 'var(--success)' }}><span>Free Shipping</span><span>{delivery === 0 ? '-₹49' : '₹0'}</span></div>
                      {upiDiscount > 0 && <div className="os-item" style={{ color: 'var(--success)' }}><span>UPI Off (10%)</span><span>-₹{upiDiscount}</span></div>}
                      {selectedPayment === 'cod' && <div className="os-item" style={{ color: '#ef4444' }}><span>COD Fee</span><span>+₹49</span></div>}
                      <div className="os-total"><span>Total Payable</span><span>₹{grandTotal}</span></div>
                    </div>
                  )}

                  {checkoutStep === 4 && orderPlaced && (
                    <div className="success-screen">
                      <div className="success-icon">🎉</div>
                      <h3>Order Placed Successfully!</h3>
                      <p>Thank you for shopping with FreshGuard!<br />Your protection is on its way.</p>
                      <div className="order-id">Order ID: {orderPlaced}</div>
                    </div>
                  )}
                </>
              ) : null}
            </div>
            
            {/* Modal Footer */}
            <div className="modal-footer">
              {modalState === 'product' && selectedProduct && (
                <>
                  <button className="btn-back" onClick={() => setModalState('closed')}>← Back</button>
                  <button className="btn-next" style={{ background: 'var(--accent)' }} onClick={() => { addToCart(selectedProduct); setModalState('closed'); }}>🛒 Add to Cart</button>
                  <button className="btn-next" onClick={() => { addToCart(selectedProduct); if (currentUser) { setModalState('checkout'); setCheckoutStep(1); setOrderPlaced(null); } }}>⚡ Buy Now</button>
                </>
              )}
               {modalState === 'checkout' && checkoutStep === 1 && (
                <button className="btn-next" onClick={() => {
                  if (!checkoutForm.name || !checkoutForm.email || !checkoutForm.mobile || !checkoutForm.address || !checkoutForm.city || !checkoutForm.pincode) {
                    showToast('Please fill all address fields', 'error');
                    return;
                  }
                  if (!checkoutForm.email.includes('@')) {
                    showToast('Please enter a valid email', 'error');
                    return;
                  }
                  if (checkoutForm.mobile.length < 10) {
                    showToast('Please enter a valid phone number', 'error');
                    return;
                  }
                  setCheckoutStep(2);
                }}>Continue to Payment →</button>
              )}
              {modalState === 'checkout' && checkoutStep === 2 && (
                <>
                  <button className="btn-back" onClick={() => setCheckoutStep(1)}>← Back</button>
                  <button className="btn-next" onClick={() => setCheckoutStep(3)}>Review Order →</button>
                </>
              )}
              {modalState === 'checkout' && checkoutStep === 3 && (
                <>
                  <button className="btn-back" onClick={() => setCheckoutStep(2)}>← Back</button>
                  <button className="btn-next" style={{ background: paying ? '#9ca3af' : 'var(--accent)' }} onClick={placeOrder} disabled={paying}>
                    {paying ? '⏳ Processing...' : `Place Order ₹${grandTotal} →`}
                  </button>
                </>
              )}
              {modalState === 'checkout' && checkoutStep === 4 && (
                <button className="btn-next" onClick={() => { setModalState('closed'); setCart([]); setCheckoutStep(1); }}>Continue Shopping →</button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── TOASTS ── */}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast ${t.type}`}>
            <span>{t.type === 'success' ? '✅' : '❌'}</span>{t.msg}
          </div>
        ))}
      </div>

    </>
  );
}
