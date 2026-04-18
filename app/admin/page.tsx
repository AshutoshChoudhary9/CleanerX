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
  const [orderFilter, setOrderFilter] = useState<'all' | 'pending' | 'paid' | 'failed'>('all');
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [productForm, setProductForm] = useState({
    name: '',
    price: '',
    mrp: '',
    category: 'floor',
    fragrance: '',
    description: '',
    volume: '1 Litre',
    tags: '',
    itemCount: '',
    bundleItems: '',
    subDiscount: '',
    imageUrl: ''
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      alert("Please enter a password.");
      return;
    }
    // We don't verify on client anymore for security. 
    // We just try to fetch data. If the password is wrong, the API will return 401.
    setAuthorized(true);
    fetchData();
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const prodRes = await fetch('/api/products');
      if (!prodRes.ok) throw new Error('Failed to fetch products');
      const prodData = await prodRes.json();
      setProducts(prodData.products || []);

      const orderRes = await fetch('/api/orders', {
        headers: { 'Authorization': `Bearer ${password}` }
      });
      
      if (orderRes.status === 401) {
        setAuthorized(false);
        setPassword('');
        alert('Incorrect password or unauthorized access.');
        return;
      }

      if (!orderRes.ok) throw new Error('Failed to fetch orders');
      
      const orderData = await orderRes.json();
      setOrders(orderData.orders || []);
    } catch (err) {
      console.error(err);
      alert('Error connecting to the server. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setAuthorized(false);
    setPassword('');
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const metadataToSave: any = {};
      const itemCount = parseInt(productForm.itemCount);
      if (itemCount > 0) metadataToSave.bulkQty = itemCount;
      if (productForm.bundleItems.trim()) metadataToSave.bundleItems = productForm.bundleItems.split(',').map(s => s.trim()).filter(Boolean);
      const subDisc = parseInt(productForm.subDiscount);
      if (subDisc > 0) metadataToSave.subDiscount = subDisc;

      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${password}`
        },
        body: JSON.stringify({ 
          ...productForm, 
          tags: productForm.tags,
          metadata: metadataToSave
        })
      });
      if (res.ok) {
        alert('Product added successfully');
        setIsAddingProduct(false);
        setProductForm({
          name: '', price: '', mrp: '', category: 'floor',
          fragrance: '', description: '', volume: '1 Litre', tags: '',
          itemCount: '', bundleItems: '', subDiscount: '', imageUrl: ''
        });
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to add product');
      }
    } catch (err) {
      console.error(err);
      alert('Error adding product');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProduct = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingProduct) return;
    const formData = new FormData(e.currentTarget);
    try {
      const metadata: any = {};
      const bulkQty = parseInt(formData.get('bulkQty') as string);
      if (bulkQty > 0) metadata.bulkQty = bulkQty;
      const bundleItems = (formData.get('bundleItems') as string);
      if (bundleItems) metadata.bundleItems = bundleItems.split(',').map(s => s.trim()).filter(Boolean);
      const subDiscount = parseInt(formData.get('subDiscount') as string);
      if (subDiscount > 0) metadata.subDiscount = subDiscount;

      const res = await fetch('/api/products', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${password}`
        },
        body: JSON.stringify({
          id: editingProduct.id,
          title: formData.get('title'),
          price: formData.get('price'),
          mrp: formData.get('mrp'),
          tags: (formData.get('tags') as string).split(',').map(t => t.trim()).filter(Boolean),
          vol: formData.get('vol'),
          imageUrl: formData.get('imageUrl'),
          metadata
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
        await fetch(`/api/products?id=${id}`, { 
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${password}` }
        });
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
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${password}`
        },
        body: JSON.stringify({ id, status })
      });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const styles = `
    .admin-login { height: 100vh; display: flex; align-items: center; justify-content: center; background: #f0f4f8; font-family: sans-serif; }
    .login-card { background: white; padding: 40px; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); width: 100%; max-width: 400px; text-align: center; }
    .login-card h2 { color: #0034de; margin-bottom: 24px; }
    .login-card input { width: 100%; padding: 12px; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 16px; font-size: 16px; }
    .login-card button { width: 100%; padding: 12px; background: #0034de; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; }
    .back-link { display: block; margin-top: 20px; color: #64748b; text-decoration: none; font-size: 14px; }
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
    .admin-modal { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; overflow-y: auto; }
    .modal-content { background: white; padding: 32px; border-radius: 16px; width: 500px; max-width: 95vw; margin-top: 50px; margin-bottom: 50px; }
    .field { margin-bottom: 16px; }
    .field label { display: block; font-size: 13px; margin-bottom: 6px; color: #64748b; font-weight: 600; }
    .field input, .field select, .field textarea { width: 100%; padding: 10px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 14px; }
    .special-offer-box { background: #f0f7ff; padding: 16px; border-radius: 8px; border: 1px dashed #0034de; margin: 12px 0; }
    .special-offer-box h4 { margin: 0 0 10px 0; color: #0034de; font-size: 14px; }
    .grid-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .modal-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 24px; }
    .btn-save { background: #0034de; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; cursor: pointer; }
  `;

  return (
    <div className="admin-wrapper">
      <style dangerouslySetInnerHTML={{ __html: styles }} />
      {!authorized ? (
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
        </div>
      ) : (
        <div className="admin-container">
          <nav className="admin-nav">
            <div className="logo">🌿 FreshGuard Admin</div>
            <div className="nav-links">
              <button className={activeTab === 'stats' ? 'active' : ''} onClick={() => setActiveTab('stats')}>📊 Stats</button>
              <button className={activeTab === 'products' ? 'active' : ''} onClick={() => setActiveTab('products')}>🧴 Products</button>
              <button className={activeTab === 'orders' ? 'active' : ''} onClick={() => setActiveTab('orders')}>📋 Orders</button>
              <button onClick={handleLogout} className="logout">Logout</button>
            </div>
          </nav>

          <main className="admin-main">
            {activeTab === 'stats' && (
              <div className="stats-grid">
                <div className="stat-card"><h3>Total Products</h3><p>{products.length}</p></div>
                <div className="stat-card"><h3>Total Orders</h3><p>{orders.length}</p></div>
                <div className="stat-card"><h3>Revenue</h3><p>₹{orders.filter(o => o.paymentStatus === 'paid').reduce((a, b) => a + (Number(b.totalAmount) || 0), 0)}</p></div>
              </div>
            )}

            {activeTab === 'products' && (
              <div className="products-view">
                <div className="header">
                  <h2>Inventory Management</h2>
                  <button className="btn-add" onClick={() => setIsAddingProduct(true)}>+ Add New Product</button>
                </div>
                <table>
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Category</th>
                      <th>Price</th>
                      <th>MRP</th>
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
                <div className="header">
                  <h2>Order History</h2>
                  <select value={orderFilter} onChange={e => setOrderFilter(e.target.value as any)}>
                    <option value="all">All Orders</option>
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="failed">Failed</option>
                  </select>
                </div>
                {orders.filter(o => orderFilter === 'all' || o.paymentStatus === orderFilter).length === 0 ? <p>No orders found.</p> : (
                  <table>
                    <thead>
                      <tr><th>Order ID</th><th>Customer</th><th>Items</th><th>Amount</th><th>Status</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                      {orders.map(o => (
                        <tr key={o._id}>
                          <td>{o.orderId}</td>
                          <td>{o.customerName}<br/><small>{o.mobile}</small></td>
                          <td>{o.items?.length} items</td>
                          <td>₹{o.totalAmount}</td>
                          <td><span className={`status-badge ${o.paymentStatus}`}>{o.paymentStatus}</span></td>
                          <td>
                            <select value={o.paymentStatus} onChange={(e) => updateOrderStatus(o._id, e.target.value)}>
                              <option value="pending">Pending</option><option value="paid">Paid</option><option value="failed">Failed</option>
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
        </div>
      )}

      {editingProduct && (
        <div className="admin-modal">
          <div className="modal-content">
            <h3>Edit Product: {editingProduct.title}</h3>
            <form onSubmit={handleUpdateProduct}>
              <div className="field"><label>Title</label><input type="text" name="title" defaultValue={editingProduct.title} required /></div>
              <div className="grid-fields">
                <div className="field"><label>Price (₹)</label><input type="number" name="price" defaultValue={editingProduct.price || editingProduct.priceRange?.minVariantPrice?.amount} required /></div>
                <div className="field"><label>MRP (₹)</label><input type="number" name="mrp" defaultValue={editingProduct.mrp || editingProduct.priceRange?.maxVariantPrice?.amount} required /></div>
              </div>
              <div className="field"><label>Category Tags (comma separated)</label><input type="text" name="tags" defaultValue={editingProduct.tags?.join(', ')} required /></div>
              
              <div className="special-offer-box">
                <h4>📊 Product Quantity / Deal Info</h4>
                <div className="field"><label>How many items does this product contain?</label><input type="number" name="bulkQty" defaultValue={editingProduct.metadata?.bulkQty} placeholder="e.g. 10, 20, 50 (leave empty for single product)" /></div>
                <div className="field"><label>Included Items (comma separated, for combos)</label><input type="text" name="bundleItems" defaultValue={editingProduct.metadata?.bundleItems?.join(', ')} placeholder="e.g. Floor Cleaner 1L, Toilet Cleaner 500ml" /></div>
                <div className="field"><label>Extra Discount Percentage (%, for subscriptions)</label><input type="number" name="subDiscount" defaultValue={editingProduct.metadata?.subDiscount} placeholder="e.g. 15" /></div>
              </div>

              <div className="field"><label>Volume/Size</label><input type="text" name="vol" defaultValue={editingProduct.vol} required /></div>
              <div className="field"><label>Image URL</label><input type="text" name="imageUrl" defaultValue={editingProduct.featuredImage?.url || editingProduct.images?.[0]?.url} placeholder="https://..." /></div>
              <div className="modal-actions">
                <button type="button" onClick={() => setEditingProduct(null)}>Cancel</button>
                <button type="submit" className="btn-save">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isAddingProduct && (
        <div className="admin-modal">
          <div className="modal-content">
            <h3>Add New Product</h3>
            <form onSubmit={handleAddProduct}>
              <div className="field"><label>Product Name</label><input type="text" value={productForm.name} onChange={e => setProductForm({...productForm, name: e.target.value})} placeholder="e.g. Lavender Floor Cleaner" required /></div>
              <div className="grid-fields">
                <div className="field"><label>Price (₹)</label><input type="number" value={productForm.price} onChange={e => setProductForm({...productForm, price: e.target.value})} required /></div>
                <div className="field"><label>MRP (₹)</label><input type="number" value={productForm.mrp} onChange={e => setProductForm({...productForm, mrp: e.target.value})} /></div>
              </div>
              <div className="grid-fields">
                <div className="field"><label>Category</label>
                  <select value={productForm.category} onChange={e => setProductForm({...productForm, category: e.target.value})}>
                    <option value="floor">Floor Cleaner</option><option value="toilet">Toilet Cleaner</option><option value="glass">Glass Cleaner</option>
                    <option value="combo">Combo Pack</option><option value="bulk">Bulk Order Page</option><option value="festive">Festive Deals Page</option><option value="subscribe">Subscribe & Save Page</option>
                  </select>
                </div>
                <div className="field"><label>Volume</label><input type="text" value={productForm.volume} onChange={e => setProductForm({...productForm, volume: e.target.value})} placeholder="1 Litre" /></div>
              </div>

              <div className="special-offer-box">
                <h4>📊 Product Quantity / Deal Info</h4>
                <div className="field"><label>How many items does this product contain?</label><input type="number" value={productForm.itemCount} onChange={e => setProductForm({...productForm, itemCount: e.target.value})} placeholder="e.g. 10, 20, 50 (leave empty for single product)" /></div>
                <div className="field"><label>Included Items (comma separated, for combos)</label><input type="text" value={productForm.bundleItems} onChange={e => setProductForm({...productForm, bundleItems: e.target.value})} placeholder="e.g. Floor Cleaner 1L, Toilet Cleaner 500ml" /></div>
                {productForm.category === 'subscribe' && (
                  <div className="field"><label>Subscriber Discount (%)</label><input type="number" value={productForm.subDiscount} onChange={e => setProductForm({...productForm, subDiscount: e.target.value})} placeholder="e.g. 10" /></div>
                )}
              </div>

              <div className="field"><label>Fragrance (optional)</label><input type="text" value={productForm.fragrance} onChange={e => setProductForm({...productForm, fragrance: e.target.value})} /></div>
              <div className="field"><label>Image URL</label><input type="text" value={productForm.imageUrl} onChange={e => setProductForm({...productForm, imageUrl: e.target.value})} placeholder="https://images.unsplash.com/..." /></div>
              <div className="field"><label>Additional Tags</label><input type="text" value={productForm.tags} onChange={e => setProductForm({...productForm, tags: e.target.value})} placeholder="comma separated" /></div>
              <div className="modal-actions">
                <button type="button" onClick={() => setIsAddingProduct(false)}>Cancel</button>
                <button type="submit" className="btn-save" disabled={loading}>{loading ? 'Adding...' : 'Add Product'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
