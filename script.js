// ── PRODUCTS DATA ──
const products = [
  {id:1,name:'FreshGuard Classic Floor Cleaner',icon:'🧴',price:149,mrp:199,category:'floor',vol:'1 Litre',rating:4.5,ratingCount:2341,badge:'Best Seller'},
  {id:2,name:'FreshGuard Lavender Floor Liquid',icon:'💜',price:169,mrp:229,category:'floor',vol:'2 Litre',rating:4.3,ratingCount:1892,badge:'Top Rated'},
  {id:3,name:'FreshGuard Pine Fresh Concentrate',icon:'🌲',price:129,mrp:179,category:'floor',vol:'500 ml',rating:4.6,ratingCount:876,badge:'New'},
  {id:4,name:'FreshGuard Lemon Burst Disinfectant',icon:'🍋',price:189,mrp:259,category:'floor',vol:'5 Litre',rating:4.4,ratingCount:1203,badge:'Hot'},
  {id:5,name:'FreshGuard HyperClean Toilet Gel',icon:'🚽',price:129,mrp:169,category:'toilet',vol:'750 ml',rating:4.7,ratingCount:3421,badge:'Best Seller'},
  {id:6,name:'FreshGuard Thick Foam Toilet Cleaner',icon:'🧼',price:149,mrp:199,category:'toilet',vol:'1 Litre',rating:4.2,ratingCount:987,badge:'Hot'},
  {id:7,name:'FreshGuard Ocean Fresh Toilet Gel',icon:'🌊',price:119,mrp:159,category:'toilet',vol:'500 ml',rating:4.5,ratingCount:654,badge:'New'},
  {id:8,name:'FreshGuard Pro Toilet Disinfectant',icon:'⚗️',price:199,mrp:279,category:'toilet',vol:'1.5 Litre',rating:4.8,ratingCount:2109,badge:'Top Rated'},
  {id:9,name:'FreshGuard ClearView Glass Spray',icon:'🪟',price:119,mrp:159,category:'glass',vol:'500 ml',rating:4.6,ratingCount:1876,badge:'Best Seller'},
  {id:10,name:'FreshGuard Streak-Free Mirror Cleaner',icon:'🪞',price:139,mrp:189,category:'glass',vol:'750 ml',rating:4.4,ratingCount:1234,badge:'Top Rated'},
  {id:11,name:'FreshGuard Anti-Fog Glass Protector',icon:'🔭',price:179,mrp:239,category:'glass',vol:'500 ml',rating:4.3,ratingCount:567,badge:'New'},
  {id:12,name:'FreshGuard Ultra Shine Glass Liquid',icon:'✨',price:159,mrp:219,category:'glass',vol:'1 Litre',rating:4.5,ratingCount:2341,badge:'Hot'},
];

let customProducts = [];
let cart = [];
let wishlist = [];
let checkoutStep = 1;
let currentFilter = 'all';

const badgeColors = {
  'Best Seller':'background:#e53e3e',
  'New':'background:#00c06b',
  'Hot':'background:#ff6d00',
  'Top Rated':'background:#0a6ebd',
};

// ── RENDER PRODUCTS ──
function renderProducts(list){
  const grid = document.getElementById('prodGrid');
  if(!list.length){grid.innerHTML='<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--muted)">No products found.</div>';return;}
  grid.innerHTML = list.map(p=>{
    const disc = Math.round((1-p.price/p.mrp)*100);
    const inWish = wishlist.includes(p.id);
    return `<div class="prod-card" onclick="openProduct(${p.id})">
      <div class="prod-img">
        <span style="font-size:64px">${p.icon}</span>
        <span class="prod-badge" style="${badgeColors[p.badge]||'background:#0a6ebd'}">${p.badge||''}</span>
        <span class="prod-wishlist ${inWish?'active':''}" onclick="event.stopPropagation();toggleWishlist(${p.id},this)">${inWish?'❤️':'🤍'}</span>
      </div>
      <div class="prod-info">
        <div class="prod-brand">FreshGuard</div>
        <div class="prod-name">${p.name}</div>
        <div class="prod-vol">${p.vol}</div>
        <div class="prod-rating">
          <span class="stars">★ ${p.rating}</span>
          <span class="rating-count">(${p.ratingCount.toLocaleString()})</span>
        </div>
        <div class="prod-price-row">
          <span class="prod-price">₹${p.price}</span>
          <span class="prod-mrp">₹${p.mrp}</span>
          <span class="prod-disc">${disc}% off</span>
        </div>
      </div>
      <div class="prod-actions">
        <button class="btn-cart" onclick="event.stopPropagation();addToCart(p${p.id})">🛒 Cart</button>
        <button class="btn-buy" onclick="event.stopPropagation();buyNow(p${p.id})">⚡ Buy Now</button>
      </div>
    </div>`;
  }).join('');
  // bind product refs
  list.forEach(p=>{window['p'+p.id]=p});
}

function filterCat(cat){
  currentFilter = cat;
  document.querySelectorAll('.snav-item').forEach(el=>el.classList.remove('active'));
  const titles = {all:'All',floor:'Floor',toilet:'Toilet',glass:'Glass',combo:'Combo'};
  document.getElementById('prodTitle').innerHTML = `${titles[cat]||'All'} <span>Products</span>`;
  const all = [...products,...customProducts];
  const filtered = cat==='all' ? all : all.filter(p=>p.category===cat);
  renderProducts(filtered);
  document.getElementById('products').scrollIntoView({behavior:'smooth'});
}

function handleSearch(q){
  q = q.toLowerCase().trim();
  if(!q){renderProducts(currentFilter==='all'?[...products,...customProducts]:[...products,...customProducts].filter(p=>p.category===currentFilter));return;}
  const filtered = [...products,...customProducts].filter(p=>p.name.toLowerCase().includes(q)||p.category.toLowerCase().includes(q));
  renderProducts(filtered);
}

// ── CART ──
function addToCart(p){
  const existing = cart.find(c=>c.id===p.id);
  if(existing){existing.qty++;}
  else{cart.push({...p,qty:1});}
  updateCartBadge();
  renderCart();
  showToast(`${p.icon} ${p.name.split(' ').slice(0,3).join(' ')} added to cart!`,'success');
}

function buyNow(p){addToCart(p);openCheckout();}

function updateCartBadge(){
  const total = cart.reduce((a,c)=>a+c.qty,0);
  const badge = document.getElementById('cartBadge');
  badge.textContent = total;
  badge.style.display = total>0?'flex':'none';
  document.getElementById('cartCount').textContent = total;
}

function renderCart(){
  const el = document.getElementById('cartItems');
  const footer = document.getElementById('cartFooter');
  if(!cart.length){
    el.innerHTML=`<div class="cart-empty"><div class="icon">🛒</div><p>Your cart is empty</p><p style="font-size:13px;margin-top:8px">Add some products to get started</p></div>`;
    footer.style.display='none';return;
  }
  el.innerHTML = cart.map(p=>`
    <div class="cart-item">
      <div class="ci-img">${p.icon}</div>
      <div class="ci-info">
        <div class="ci-name">${p.name}</div>
        <div class="ci-vol">${p.vol||''}</div>
        <div class="ci-price">₹${p.price*p.qty}</div>
        <div class="ci-qty">
          <div class="qty-btn" onclick="changeQty(${p.id},-1)">−</div>
          <div class="qty-num">${p.qty}</div>
          <div class="qty-btn" onclick="changeQty(${p.id},1)">+</div>
          <button class="ci-remove" onclick="removeFromCart(${p.id})">🗑 Remove</button>
        </div>
      </div>
    </div>`).join('');
  const sub = cart.reduce((a,c)=>a+c.price*c.qty,0);
  const disc = sub>=299?49:0;
  const del = sub>=299?0:49;
  const grand = sub+del-disc;
  document.getElementById('subtotal').textContent='₹'+sub;
  document.getElementById('delivery').textContent=del===0?'FREE':'₹'+del;
  document.getElementById('discountAmt').textContent='-₹'+disc;
  document.getElementById('grandTotal').textContent='₹'+grand;
  footer.style.display='block';
}

function changeQty(id,d){
  const item = cart.find(c=>c.id===id);
  if(!item)return;
  item.qty+=d;
  if(item.qty<=0)cart=cart.filter(c=>c.id!==id);
  updateCartBadge();renderCart();
}
function removeFromCart(id){cart=cart.filter(c=>c.id!==id);updateCartBadge();renderCart();}

function openCart(){
  document.getElementById('cartOverlay').classList.add('open');
  document.getElementById('cartSidebar').classList.add('open');
  renderCart();
}
function closeCart(){
  document.getElementById('cartOverlay').classList.remove('open');
  document.getElementById('cartSidebar').classList.remove('open');
}

// ── WISHLIST ──
function toggleWishlist(id,el){
  if(wishlist.includes(id)){wishlist=wishlist.filter(w=>w!==id);el.textContent='🤍';el.classList.remove('active');showToast('Removed from wishlist','error');}
  else{wishlist.push(id);el.textContent='❤️';el.classList.add('active');showToast('Added to wishlist!','success');}
}

// ── CHECKOUT ──
function openCheckout(){
  closeCart();
  checkoutStep=1;
  renderCheckoutStep();
  document.getElementById('modalOverlay').classList.add('open');
}
function closeModal(){document.getElementById('modalOverlay').classList.remove('open');}

function renderCheckoutStep(){
  const sub = cart.reduce((a,c)=>a+c.price*c.qty,0);
  const disc = sub>=299?49:0;
  const del = sub>=299?0:49;
  const grand = sub+del-disc;
  const steps = ['Address','Payment','Review','Confirm'];
  const stepsHtml = steps.map((s,i)=>`<div class="step ${i+1===checkoutStep?'active':i+1<checkoutStep?'done':''}" onclick="checkoutStep=${i+1<=checkoutStep?i+1:checkoutStep};renderCheckoutStep()">${i+1<checkoutStep?'✓ ':''+(i+1)+'. '}${s}</div>`).join('');

  let body='', footer='';
  document.getElementById('modalTitle').textContent = ['','📍 Delivery Address','💳 Payment Method','📋 Review Order','✅ Order Confirmed'][checkoutStep]||'Checkout';

  if(checkoutStep===1){
    body=`<div class="steps">${stepsHtml}</div>
    <div class="form-group"><label>Full Name</label><input type="text" id="chk-name" placeholder="Your full name"></div>
    <div class="form-group"><label>Mobile Number</label><input type="tel" id="chk-phone" placeholder="10-digit mobile number"></div>
    <div class="form-group"><label>Address Line 1</label><input type="text" id="chk-addr1" placeholder="House/Flat/Block No."></div>
    <div class="form-group"><label>Address Line 2</label><input type="text" id="chk-addr2" placeholder="Street, Area, Colony"></div>
    <div class="form-row">
      <div class="form-group"><label>City</label><input type="text" id="chk-city" placeholder="City"></div>
      <div class="form-group"><label>PIN Code</label><input type="text" id="chk-pin" placeholder="6-digit PIN"></div>
    </div>
    <div class="form-group"><label>State</label><select id="chk-state"><option>Uttar Pradesh</option><option>Maharashtra</option><option>Delhi</option><option>Karnataka</option><option>Tamil Nadu</option><option>West Bengal</option><option>Gujarat</option><option>Rajasthan</option></select></div>`;
    footer=`<button class="btn-next" onclick="nextStep()">Continue to Payment →</button>`;
  } else if(checkoutStep===2){
    body=`<div class="steps">${stepsHtml}</div>
    <p style="font-size:13px;color:var(--muted);margin-bottom:16px">Choose your payment method:</p>
    <div class="pay-methods">
      <div class="pay-method selected" id="pm-upi" onclick="selectPay('upi')"><span class="mi">📱</span>UPI</div>
      <div class="pay-method" id="pm-card" onclick="selectPay('card')"><span class="mi">💳</span>Credit/Debit Card</div>
      <div class="pay-method" id="pm-nb" onclick="selectPay('nb')"><span class="mi">🏦</span>Net Banking</div>
      <div class="pay-method" id="pm-cod" onclick="selectPay('cod')"><span class="mi">💵</span>Cash on Delivery</div>
    </div>
    <div id="pay-form">
      <div class="form-group"><label>UPI ID</label><input type="text" placeholder="yourname@upi"></div>
      <p style="font-size:12px;color:var(--success);background:#f0fff8;padding:10px;border-radius:6px">💚 Extra 10% OFF on UPI payments applied!</p>
    </div>`;
    footer=`<button class="btn-back" onclick="checkoutStep=1;renderCheckoutStep()">← Back</button><button class="btn-next" onclick="nextStep()">Review Order →</button>`;
  } else if(checkoutStep===3){
    const itemsHtml = cart.map(p=>`<div class="os-item"><span>${p.icon} ${p.name.split(' ').slice(0,3).join(' ')} ×${p.qty}</span><span>₹${p.price*p.qty}</span></div>`).join('');
    body=`<div class="steps">${stepsHtml}</div>
    <div class="order-summary">
      <div class="os-title">Order Summary</div>
      ${itemsHtml}
      <div class="os-item"><span>Delivery</span><span>${del===0?'FREE':'₹'+del}</span></div>
      <div class="os-item" style="color:var(--success)"><span>Discount</span><span>-₹${disc}</span></div>
      <div class="os-total"><span>Total Payable</span><span>₹${grand}</span></div>
    </div>
    <div style="background:#f0f7ff;border-radius:8px;padding:12px;font-size:13px;color:var(--primary)">📍 Delivering to your saved address. Estimated: <strong>2-4 Business Days</strong></div>`;
    footer=`<button class="btn-back" onclick="checkoutStep=2;renderCheckoutStep()">← Back</button><button class="btn-next" onclick="placeOrder()">Place Order ₹${grand} →</button>`;
  } else if(checkoutStep===4){
    const orderId = 'FG'+Date.now().toString().slice(-8);
    body=`<div class="steps">${stepsHtml}</div>
    <div class="success-screen">
      <div class="success-icon">🎉</div>
      <h3>Order Placed Successfully!</h3>
      <p>Thank you for shopping with FreshGuard!<br>Your protection is on its way.</p>
      <div class="order-id">Order ID: ${orderId}</div>
      <p style="font-size:12px;margin-top:12px">Estimated delivery in <strong>2-4 business days</strong></p>
      <div style="margin-top:20px;padding:14px;background:#f0fff8;border-radius:8px;font-size:13px;color:var(--success)">
        ✅ Confirmation SMS sent to your mobile<br>
        📧 Order details emailed to you<br>
        🚚 Tracking link will be shared shortly
      </div>
    </div>`;
    footer=`<button class="btn-next" style="flex:1" onclick="closeModal();cart=[];updateCartBadge();renderCart()">Continue Shopping →</button>`;
  }
  document.getElementById('modalBody').innerHTML=body;
  document.getElementById('modalFooter').innerHTML=footer;
}

function nextStep(){
  if(checkoutStep<3)checkoutStep++;
  renderCheckoutStep();
}
function placeOrder(){checkoutStep=4;renderCheckoutStep();}

function selectPay(type){
  document.querySelectorAll('.pay-method').forEach(el=>el.classList.remove('selected'));
  document.getElementById('pm-'+type).classList.add('selected');
  const forms = {
    upi:`<div class="form-group"><label>UPI ID</label><input type="text" placeholder="yourname@upi"></div><p style="font-size:12px;color:var(--success);background:#f0fff8;padding:10px;border-radius:6px">💚 Extra 10% OFF on UPI payments applied!</p>`,
    card:`<div class="form-row"><div class="form-group"><label>Card Number</label><input type="text" maxlength="19" placeholder="1234 5678 9012 3456"></div><div class="form-group"><label>Name on Card</label><input type="text" placeholder="Full Name"></div></div><div class="form-row"><div class="form-group"><label>Expiry</label><input type="text" maxlength="5" placeholder="MM/YY"></div><div class="form-group"><label>CVV</label><input type="password" maxlength="3" placeholder="•••"></div></div>`,
    nb:`<div class="form-group"><label>Select Bank</label><select><option>State Bank of India</option><option>HDFC Bank</option><option>ICICI Bank</option><option>Axis Bank</option><option>Kotak Bank</option></select></div>`,
    cod:`<p style="font-size:13px;background:#fff8f0;padding:12px;border-radius:8px;border-left:4px solid var(--accent)">💵 Pay ₹${cart.reduce((a,c)=>a+c.price*c.qty,0)+49} cash upon delivery. Note: COD fee of ₹49 applicable.</p>`
  };
  document.getElementById('pay-form').innerHTML=forms[type]||'';
}

// ── ADD CUSTOM PRODUCT ──
function addCustomProduct(cat,icon,prefix){
  const name=document.getElementById(prefix+'-name').value.trim();
  const price=parseInt(document.getElementById(prefix+'-price').value)||0;
  const mrp=parseInt(document.getElementById(prefix+'-mrp').value)||0;
  const vol=document.getElementById(prefix+'-vol').value.trim();
  if(!name||!price){showToast('Please fill Product Name and Selling Price','error');return;}
  const newP={id:Date.now(),name,icon,price,mrp:mrp||Math.round(price*1.3),category:cat,vol:vol||'Standard',rating:4.0,ratingCount:0,badge:'New'};
  customProducts.push(newP);
  window['p'+newP.id]=newP;
  ['name','price','mrp','vol','type','desc'].forEach(f=>{const el=document.getElementById(prefix+'-'+f);if(el)el.value='';});
  filterCat(currentFilter);
  showToast(`✅ ${name} added to store!`,'success');
}

// ── TOAST ──
function showToast(msg,type='success'){
  const tc=document.getElementById('toastContainer');
  const t=document.createElement('div');
  t.className=`toast ${type}`;
  t.innerHTML=`<span>${type==='success'?'✅':'❌'}</span>${msg}`;
  tc.appendChild(t);
  setTimeout(()=>t.remove(),3000);
}

// ── PRODUCT DETAIL ──
function openProduct(id){
  const p=[...products,...customProducts].find(x=>x.id===id);
  if(!p)return;
  const disc=Math.round((1-p.price/p.mrp)*100);
  document.getElementById('modalTitle').textContent=p.icon+' '+p.name;
  document.getElementById('modalBody').innerHTML=`
    <div style="text-align:center;background:linear-gradient(135deg,#f8fafc,#eff6ff);border-radius:12px;padding:40px;margin-bottom:24px;font-size:80px">${p.icon}</div>
    <h3 style="font-family:'Baloo 2',sans-serif;font-size:24px;font-weight:800;margin-bottom:8px">${p.name}</h3>
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
      <span style="background:var(--accent2);color:#fff;padding:4px 10px;border-radius:6px;font-size:14px;font-weight:700">★ ${p.rating||4.0}</span>
      <span style="font-size:14px;color:var(--muted);font-weight:600">${(p.ratingCount||0).toLocaleString()} reviews</span>
    </div>
    <div style="display:flex;align-items:baseline;gap:12px;margin-bottom:24px">
      <span style="font-size:32px;font-weight:800">₹${p.price}</span>
      <span style="font-size:18px;color:var(--muted);text-decoration:line-through">₹${p.mrp}</span>
      <span style="color:var(--danger);font-weight:700;font-size:14px">${disc}% off</span>
    </div>
    <div style="background:#f0fdf4;border-left:4px solid var(--success);border-radius:8px;padding:16px;margin-bottom:20px;font-size:14px;line-height:1.6;color:var(--text)">
      <div>✅ <strong>Volume:</strong> ${p.vol}</div>
      <div style="margin-top:4px">🚚 <strong>Free delivery</strong> above ₹299</div>
      <div style="margin-top:4px">↩️ <strong>7-day</strong> easy returns</div>
    </div>
    <div style="font-size:14px;color:var(--muted);font-weight:600">Category: <strong style="color:var(--text)">${p.category.charAt(0).toUpperCase()+p.category.slice(1)} Cleaners</strong></div>`;
  document.getElementById('modalFooter').innerHTML=`
    <button class="btn-back" style="flex:1" onclick="closeModal()">← Back</button>
    <button class="btn-cart" style="flex:1.5" onclick="addToCart(p${p.id});closeModal()">🛒 Add to Cart</button>
    <button class="btn-next" style="flex:1.5" onclick="buyNow(p${p.id});closeModal()">⚡ Buy Now</button>`;
  document.getElementById('modalOverlay').classList.add('open');
}

// ── TIMER ──
function startTimer(){
  let s=5*3600+42*60+17;
  setInterval(()=>{
    s--;if(s<0)s=6*3600;
    const h=String(Math.floor(s/3600)).padStart(2,'0');
    const m=String(Math.floor((s%3600)/60)).padStart(2,'0');
    const sec=String(s%60).padStart(2,'0');
    const el=document.getElementById('timer');
    if(el)el.textContent=`${h}:${m}:${sec}`;
  },1000);
}

// ── AUTH FLYOUT CARD ──
let isCardSignUp = false;

function toggleAuthCard() {
  document.getElementById('authCard').classList.toggle('open');
}

function toggleCardMode() {
  isCardSignUp = !isCardSignUp;
  document.getElementById('cardHeading').textContent = isCardSignUp ? 'Create Account' : 'Log In';
  document.getElementById('cardSubmitBtn').textContent = isCardSignUp ? 'Sign Up' : 'Log In';
  document.getElementById('cardNameField').style.display = isCardSignUp ? 'block' : 'none';
  document.getElementById('card-name').required = isCardSignUp;
  document.getElementById('cardSwitchText').innerHTML = isCardSignUp 
    ? 'Already have an account? <span style="color:#0034de;font-weight:bold;cursor:pointer;" onclick="toggleCardMode()">Log In</span>' 
    : 'Don\'t have an account? <span style="color:#0034de;font-weight:bold;cursor:pointer;" onclick="toggleCardMode()">Sign Up</span>';
}

// Close the flyout when clicking outside
document.addEventListener('click', function(e) {
  const wrapper = document.getElementById('authWrapper');
  if (wrapper && !wrapper.contains(e.target)) {
    const card = document.getElementById('authCard');
    if(card) card.classList.remove('open');
  }
});

// ── INIT ──
renderProducts(products);
startTimer();
