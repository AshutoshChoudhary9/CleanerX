'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function AdminDashboard() {
  const [authorized, setAuthorized] = useState(false);
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState<'products' | 'orders' | 'stats'>('stats');
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);

  const [productForm, setProductForm] = useState({
    title: '',
    price: '',
    mrp: '',
    tags: '',
    description: '',
    volume: ''
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'admin123') { // Simple hardcoded password as requested
      setAuthorized(true);
      fetchData();
    } else {
      alert('Incorrect password');
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const prodRes = await fetch('/api/products');
      const prodData = await prodRes.json();
      setProducts(prodData.products || []);

      const orderRes = await fetch('/api/orders');
      const orderData = await orderRes.json();
      setOrders(orderData.orders || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    try {
      const res = await fetch('/api/products', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingProduct.id,
          title: (e.target as any)[0].value,
          price: (e.target as any)[1].value,
          mrp: (e.target as any)[2].value,
          tags: (e.target as any)[3].value,
        })
      });
      if (res.ok) {
        alert('Product updated successfully');
        setEditingProduct(null);
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (confirm('Are you sure you want to delete this product?')) {
      try {
        await fetch(`/api/products?id=${id}`, { method: 'DELETE' });
        fetchData();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const updateOrderStatus = async (id: string, status: string) => {
    try {
      await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status })
      });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  if (!authorized) {
    return (
      <div className="admin-login">
        <div className="login-card">
          <h2>🌿 FreshGuard Admin</h2>
          <p>Please enter the owner password to continue.</p>
          <form onSubmit={handleLogin}>
            <input 
              type="password" 
              placeholder="Enter Password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
            />
            <button type="submit">Login Dashboard</button>
          </form>
          <Link href="/" className="back-link">← Back to Store</Link>
        </div>
        <style jsx>{`
          .admin-login { height: 100vh; display: flex; align-items: center; justify-content: center; background: #f0f4f8; font-family: sans-serif; }
          .login-card { background: white; padding: 40px; borderRadius: 16px; boxShadow: 0 10px 25px rgba(0,0,0,0.05); width: 100%; maxWidth: 400px; textAlign: center; }
          h2 { color: #0034de; margin-bottom: 24px; }
          input { width: 100%; padding: 12px; border: 1px solid #e2e8f0; borderRadius: 8px; margin-bottom: 16px; fontSize: 16px; }
          button { width: 100%; padding: 12px; background: #0034de; color: white; border: none; borderRadius: 8px; fontWeight: bold; cursor: pointer; }
          .back-link { display: block; margin-top: 20px; color: #64748b; textDecoration: none; fontSize: 14px; }
        `}</style>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <nav className="admin-nav">
        <div className="logo">🌿 FreshGuard Admin</div>
        <div className="nav-links">
          <button className={activeTab === 'stats' ? 'active' : ''} onClick={() => setActiveTab('stats')}>📊 Stats</button>
          <button className={activeTab === 'products' ? 'active' : ''} onClick={() => setActiveTab('products')}>🧴 Products</button>
          <button className={activeTab === 'orders' ? 'active' : ''} onClick={() => setActiveTab('orders')}>📋 Orders</button>
          <button onClick={() => setAuthorized(false)} className="logout">Logout</button>
        </div>
      </nav>

      <main className="admin-main">
        {activeTab === 'stats' && (
          <div className="stats-grid">
            <div className="stat-card"><h3>Total Products</h3><p>{products.length}</p></div>
            <div className="stat-card"><h3>Total Orders</h3><p>{orders.length}</p></div>
            <div className="stat-card"><h3>Revenue</h3><p>₹{orders.filter(o => o.paymentStatus === 'paid').reduce((a, b) => a + b.totalAmount, 0)}</p></div>
          </div>
        )}

        {activeTab === 'products' && (
          <div className="products-view">
            <div className="header">
              <h2>Inventory Management</h2>
              <button className="btn-add" onClick={() => alert('Use the front-end forms to add products for now or implement here.')}>+ Add New Product</button>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>MRP</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map(p => (
                  <tr key={p.id}>
                    <td>{p.title}</td>
                    <td>{p.tags?.[0] || 'Uncategorized'}</td>
                    <td>₹{p.price || p.priceRange?.minVariantPrice?.amount}</td>
                    <td>₹{p.mrp || p.priceRange?.maxVariantPrice?.amount}</td>
                    <td><span className="badge-active">In Stock</span></td>
                    <td>
                      <button className="btn-edit" onClick={() => setEditingProduct(p)}>Edit</button>
                      <button className="btn-delete" onClick={() => handleDeleteProduct(p.id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="orders-view">
            <h2>Order History</h2>
            {orders.length === 0 ? <p>No orders yet.</p> : (
              <table>
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Customer</th>
                    <th>Items</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map(o => (
                    <tr key={o._id}>
                      <td>{o.orderId}</td>
                      <td>{o.customerName}<br/><small>{o.mobile}</small></td>
                      <td>{o.items?.length} items</td>
                      <td>₹{o.totalAmount}</td>
                      <td>
                        <span className={`status-badge ${o.paymentStatus}`}>
                          {o.paymentStatus.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <select 
                          value={o.paymentStatus} 
                          onChange={(e) => updateOrderStatus(o._id, e.target.value)}
                        >
                          <option value="pending">Pending</option>
                          <option value="paid">Paid</option>
                          <option value="failed">Failed</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </main>

      {editingProduct && (
        <div className="admin-modal">
          <div className="modal-content">
            <h3>Edit Product: {editingProduct.title}</h3>
            <form onSubmit={handleUpdateProduct}>
              <div className="field"><label>Price (₹)</label><input type="number" defaultValue={editingProduct.price || editingProduct.priceRange?.minVariantPrice?.amount} /></div>
              <div className="field"><label>MRP (₹)</label><input type="number" defaultValue={editingProduct.mrp || editingProduct.priceRange?.maxVariantPrice?.amount} /></div>
              <div className="field"><label>Category Tag</label><input type="text" defaultValue={editingProduct.tags?.[0]} /></div>
              <div className="modal-actions">
                <button type="button" onClick={() => setEditingProduct(null)}>Cancel</button>
                <button type="submit" className="btn-save">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .admin-container { background: #f8fafc; min-height: 100vh; font-family: sans-serif; }
        .admin-nav { background: #0034de; color: white; padding: 0 40px; height: 70px; display: flex; align-items: center; justify-content: space-between; }
        .logo { font-size: 20px; font-weight: 800; }
        .nav-links { display: flex; gap: 10px; }
        .nav-links button { padding: 8px 16px; background: transparent; border: none; color: white; cursor: pointer; border-radius: 6px; font-weight: 600; }
        .nav-links button.active { background: rgba(255,255,255,0.2); }
        .nav-links button.logout { background: #ef4444; margin-left: 20px; }
        
        .admin-main { padding: 40px; max-width: 1200px; margin: 0 auto; }
        .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
        .stat-card { background: white; padding: 24px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
        .stat-card h3 { color: #64748b; font-size: 14px; margin-bottom: 8px; }
        .stat-card p { font-size: 32px; font-weight: 800; color: #0f172a; }
        
        .products-view, .orders-view { background: white; padding: 32px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
        .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th { text-align: left; padding: 12px; border-bottom: 2px solid #f1f5f9; color: #64748b; font-size: 13px; }
        td { padding: 16px 12px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
        
        .btn-add { background: #00c06b; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; cursor: pointer; }
        .btn-edit { color: #0034de; background: none; border: none; font-weight: 600; cursor: pointer; margin-right: 12px; }
        .btn-delete { color: #ef4444; background: none; border: none; font-weight: 600; cursor: pointer; }
        
        .status-badge { padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 800; }
        .status-badge.paid { background: #dcfce7; color: #166534; }
        .status-badge.pending { background: #fef9c3; color: #854d0e; }
        .status-badge.failed { background: #fee2e2; color: #991b1b; }
        
        .admin-modal { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
        .modal-content { background: white; padding: 32px; border-radius: 16px; width: 400px; }
        .field { margin-bottom: 16px; }
        .field label { display: block; font-size: 13px; margin-bottom: 6px; color: #64748b; }
        .field input { width: 100%; padding: 10px; border: 1px solid #e2e8f0; border-radius: 8px; }
        .modal-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 24px; }
        .btn-save { background: #0034de; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; cursor: pointer; }
      `}</style>
    </div>
  );
}
