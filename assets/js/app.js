// RealWorld Premium Shop — Frontend-only e-commerce demo
// HTML5 • CSS3 • Vanilla JavaScript
// Features: product listing (from JSON), featured carousel auto-advance every 3s (smooth right→left),
// search, categories, filters, sorting, product modal, persistent cart (localStorage), mock checkout,
// ready for GitHub Pages. Contact: shivam72668497@gmail.com

(() => {
  const DATA_URL = 'assets/data/products.json';
  const CART_KEY = 'rw_shop_cart_v1';
  const AUTO_ADVANCE_MS = 3000; // 3 seconds for featured carousel

  // DOM references
  const featuredWrapper = document.getElementById('featuredWrapper');
  const featuredPrev = document.getElementById('featuredPrev');
  const featuredNext = document.getElementById('featuredNext');

  const productsGrid = document.getElementById('productsGrid');
  const resultsText = document.getElementById('resultsText');

  const searchForm = document.getElementById('searchForm');
  const searchInput = document.getElementById('searchInput');
  const categoryFilter = document.getElementById('categoryFilter');
  const categoryFilterAside = document.getElementById('categoryFilterAside');
  const sortSelect = document.getElementById('sortSelect');
  const minPrice = document.getElementById('minPrice');
  const maxPrice = document.getElementById('maxPrice');
  const ratingFilter = document.getElementById('ratingFilter');
  const resetFilters = document.getElementById('resetFilters');

  const cartToggle = document.getElementById('cartToggle');
  const cartSidebar = document.getElementById('cartSidebar');
  const cartClose = document.getElementById('cartClose');
  const cartItemsEl = document.getElementById('cartItems');
  const cartCountEl = document.getElementById('cartCount');
  const cartSubtotal = document.getElementById('cartSubtotal');
  const cartShipping = document.getElementById('cartShipping');
  const cartTotal = document.getElementById('cartTotal');
  const checkoutBtn = document.getElementById('checkoutBtn');
  const clearCartBtn = document.getElementById('clearCartBtn');

  const productModal = document.getElementById('productModal');
  const productModalClose = document.getElementById('productModalClose');
  const modalBody = document.getElementById('modalBody');

  const checkoutModal = document.getElementById('checkoutModal');
  const checkoutClose = document.getElementById('checkoutClose');
  const checkoutCancel = document.getElementById('checkoutCancel');
  const checkoutForm = document.getElementById('checkoutForm');
  const checkoutSummary = document.getElementById('checkoutSummary');

  const yearEl = document.getElementById('year');
  yearEl.textContent = new Date().getFullYear();

  // State
  let PRODUCTS = [];
  let filtered = [];
  let cart = loadCart();
  let filters = {
    query: '',
    category: 'all',
    sort: 'featured',
    minPrice: 0,
    maxPrice: 10000,
    minRating: 0
  };

  // Featured carousel state
  let featuredIndex = 0;
  let featuredTimer = null;
  let featuredSlides = [];

  // Initialize app
  fetch(DATA_URL)
    .then(r => r.json())
    .then(data => {
      PRODUCTS = data.products || [];
      setupFeatured();
      populateCategories();
      applyFilters();
    })
    .catch(err => {
      console.error('Failed to load products', err);
      resultsText.textContent = 'Failed to load products.';
    });

  // ---------- Featured carousel ----------
  function setupFeatured() {
    const featured = PRODUCTS.filter(p => (p.tags || []).includes('featured'));
    // if none marked featured, pick top rated first 3
    const slides = featured.length ? featured : PRODUCTS.slice().sort((a,b)=>b.rating-a.rating).slice(0,3);
    featuredWrapper.innerHTML = '';
    featuredSlides = slides;
    slides.forEach((s, i) => {
      const slide = document.createElement('div');
      slide.className = 'featured-slide';
      slide.innerHTML = `
        <img src="${s.image}" alt="${escapeHtml(s.title)}" />
        <div class="featured-caption">
          <strong>${escapeHtml(s.title)}</strong><br />
          <span class="muted">₹${s.price.toFixed(2)} • ${escapeHtml(s.category)}</span>
        </div>
      `;
      featuredWrapper.appendChild(slide);
    });
    renderFeatured();
    startAutoAdvance();
  }

  function renderFeatured() {
    // transform featuredWrapper children by index
    const slides = featuredWrapper.children;
    for (let i = 0; i < slides.length; i++) {
      slides[i].style.transform = `translateX(${(i - featuredIndex) * 100}%)`;
    }
  }

  function advanceFeatured(delta = 1) {
    if (!featuredSlides.length) return;
    featuredIndex = (featuredIndex + delta + featuredSlides.length) % featuredSlides.length;
    renderFeatured();
  }

  function startAutoAdvance() {
    stopAutoAdvance();
    featuredTimer = setInterval(() => advanceFeatured(1), AUTO_ADVANCE_MS);
  }
  function stopAutoAdvance() {
    if (featuredTimer) clearInterval(featuredTimer);
    featuredTimer = null;
  }

  featuredPrev.addEventListener('click', () => { advanceFeatured(-1); startAutoAdvance(); });
  featuredNext.addEventListener('click', () => { advanceFeatured(1); startAutoAdvance(); });
  featuredWrapper.addEventListener('mouseenter', stopAutoAdvance);
  featuredWrapper.addEventListener('mouseleave', startAutoAdvance);

  // ---------- Filters / Search / Render ----------
  function populateCategories() {
    const cats = Array.from(new Set(PRODUCTS.map(p => p.category))).sort();
    cats.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat; opt.textContent = cat;
      categoryFilter.appendChild(opt);
      const opt2 = opt.cloneNode(true);
      categoryFilterAside.appendChild(opt2);
    });
  }

  searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    filters.query = searchInput.value.trim().toLowerCase();
    applyFilters();
  });

  categoryFilter.addEventListener('change', () => { filters.category = categoryFilter.value; applyFilters(); });
  categoryFilterAside.addEventListener('change', () => { filters.category = categoryFilterAside.value; categoryFilter.value = categoryFilterAside.value; applyFilters(); });
  sortSelect.addEventListener('change', (e) => { filters.sort = e.target.value; applyFilters(); });
  minPrice.addEventListener('change', () => { filters.minPrice = Number(minPrice.value || 0); applyFilters(); });
  maxPrice.addEventListener('change', () => { filters.maxPrice = Number(maxPrice.value || 10000); applyFilters(); });
  ratingFilter.addEventListener('change', () => { filters.minRating = Number(ratingFilter.value || 0); applyFilters(); });
  resetFilters.addEventListener('click', () => {
    filters = { query:'', category:'all', sort:'featured', minPrice:0, maxPrice:10000, minRating:0 };
    searchInput.value = '';
    categoryFilter.value = 'all';
    categoryFilterAside.value = 'all';
    sortSelect.value = 'featured';
    minPrice.value = 0;
    maxPrice.value = 10000;
    ratingFilter.value = 0;
    applyFilters();
  });

  function applyFilters() {
    let list = PRODUCTS.slice();
    if (filters.query) list = list.filter(p => (p.title + ' ' + p.description + ' ' + p.category).toLowerCase().includes(filters.query));
    if (filters.category && filters.category !== 'all') list = list.filter(p => p.category === filters.category);
    list = list.filter(p => p.price >= filters.minPrice && p.price <= filters.maxPrice);
    list = list.filter(p => p.rating >= filters.minRating);

    if (filters.sort === 'price-asc') list.sort((a,b)=>a.price-b.price);
    else if (filters.sort === 'price-desc') list.sort((a,b)=>b.price-a.price);
    else if (filters.sort === 'rating-desc') list.sort((a,b)=>b.rating-a.rating);
    else list.sort((a,b)=>b.rating-a.rating);

    filtered = list;
    renderProducts(list);
  }

  function renderProducts(list) {
    productsGrid.innerHTML = '';
    if (!list.length) {
      resultsText.textContent = 'No products found.';
      productsGrid.innerHTML = '<p class="muted">Try changing filters or reset.</p>';
      return;
    }
    resultsText.textContent = `Showing ${list.length} product${list.length>1?'s':''}`;
    list.forEach(p => {
      const el = document.createElement('article');
      el.className = 'card';
      el.setAttribute('role','listitem');
      el.innerHTML = `
        <a class="media" href="#" data-id="${p.id}" aria-label="Open ${escapeHtml(p.title)}">
          <img src="${p.image}" alt="${escapeHtml(p.title)}" loading="lazy" />
        </a>
        <h3>${escapeHtml(p.title)}</h3>
        <div class="meta">
          <div>
            <div class="price">₹${(p.price).toFixed(2)}</div>
            ${p.oldPrice ? `<div class="compare">₹${(p.oldPrice).toFixed(2)}</div>` : ''}
          </div>
          <div class="small muted">${escapeHtml(p.category)}</div>
        </div>
        <div class="actions">
          <button class="btn add-to-cart" data-id="${p.id}">Add to cart</button>
          <button class="btn ghost small view-btn" data-id="${p.id}">Quick view</button>
        </div>
      `;
      productsGrid.appendChild(el);
    });

    // Attach handlers
    Array.from(productsGrid.querySelectorAll('.add-to-cart')).forEach(b => {
      b.addEventListener('click', (e) => { addToCart(b.dataset.id, 1); });
    });
    Array.from(productsGrid.querySelectorAll('.view-btn, .media')).forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        const id = el.dataset.id;
        openProductModal(id);
      });
    });
  }

  // ---------- Product modal ----------
  function openProductModal(id) {
    const p = PRODUCTS.find(x => x.id === id);
    if (!p) return;
    modalBody.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
        <div style="min-height:260px;border-radius:8px;overflow:hidden">
          <img src="${p.image}" alt="${escapeHtml(p.title)}" style="width:100%;height:100%;object-fit:cover;border-radius:8px" />
        </div>
        <div>
          <h3 style="margin-top:0">${escapeHtml(p.title)}</h3>
          <p class="muted">${escapeHtml(p.description)}</p>
          <div style="margin:.6rem 0">
            <div class="price">₹${p.price.toFixed(2)}</div>
            ${p.oldPrice ? `<div class="compare">₹${p.oldPrice.toFixed(2)}</div>` : ''}
          </div>
          <div style="display:flex;gap:.5rem;margin-top:.6rem">
            <button class="btn add-modal" data-id="${p.id}">Add to cart</button>
            <button class="btn ghost small" id="modalCloseBtn">Close</button>
          </div>
        </div>
      </div>
    `;
    productModal.setAttribute('aria-hidden','false');
    productModal.style.display = 'flex';
    modalBody.querySelector('.add-modal').addEventListener('click', () => {
      addToCart(p.id, 1);
      closeModal(productModal);
      openCart();
    });
    modalBody.querySelector('#modalCloseBtn').addEventListener('click', () => closeModal(productModal));
  }

  productModalClose.addEventListener('click', () => closeModal(productModal));
  productModal.addEventListener('click', (e) => { if (e.target === productModal) closeModal(productModal); });

  // ---------- Cart ----------
  cartToggle.addEventListener('click', toggleCart);
  cartClose.addEventListener('click', toggleCart);
  clearCartBtn.addEventListener('click', () => { cart = []; saveCart(); renderCart(); });

  function loadCart() {
    try { const raw = localStorage.getItem(CART_KEY); return raw ? JSON.parse(raw) : []; } catch { return []; }
  }
  function saveCart() { localStorage.setItem(CART_KEY, JSON.stringify(cart)); }

  function addToCart(id, qty = 1) {
    const product = PRODUCTS.find(p => p.id === id);
    if (!product) return;
    const item = cart.find(c => c.id === id);
    if (item) item.qty += qty;
    else cart.push({ id, qty });
    saveCart();
    renderCart();
    // visual feedback
    cartToggle.animate([{ transform:'scale(1)' }, { transform:'scale(1.06)' }, { transform:'scale(1)' }], { duration:220 });
  }

  function renderCart() {
    cartItemsEl.innerHTML = '';
    let subtotal = 0;
    cart.forEach(ci => {
      const p = PRODUCTS.find(pp => pp.id === ci.id);
      if (!p) return;
      const li = document.createElement('li');
      li.className = 'cart-item';
      li.innerHTML = `
        <img src="${p.image}" alt="${escapeHtml(p.title)}" />
        <div style="flex:1">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <div>
              <strong>${escapeHtml(p.title)}</strong>
              <div class="small muted">₹${p.price.toFixed(2)}</div>
            </div>
            <div class="qty" aria-live="polite">
              <button class="btn small dec" data-id="${p.id}">−</button>
              <span style="padding:.15rem .45rem">${ci.qty}</span>
              <button class="btn small inc" data-id="${p.id}">+</button>
            </div>
          </div>
          <div style="display:flex;justify-content:space-between;margin-top:.4rem">
            <div class="small muted">Category: ${escapeHtml(p.category)}</div>
            <button class="btn ghost small remove" data-id="${p.id}">Remove</button>
          </div>
        </div>
      `;
      cartItemsEl.appendChild(li);
      subtotal += p.price * ci.qty;
    });

    const shipping = subtotal > 0 && subtotal < 3000 ? 99 : 0;
    const total = subtotal + shipping;
    cartSubtotal.textContent = `₹${subtotal.toFixed(2)}`;
    cartShipping.textContent = `₹${shipping.toFixed(2)}`;
    cartTotal.textContent = `₹${total.toFixed(2)}`;
    cartCountEl.textContent = cart.reduce((s,i)=>s+i.qty,0);

    Array.from(cartItemsEl.querySelectorAll('.inc')).forEach(b=>b.addEventListener('click', ()=> changeQty(b.dataset.id,1)));
    Array.from(cartItemsEl.querySelectorAll('.dec')).forEach(b=>b.addEventListener('click', ()=> changeQty(b.dataset.id,-1)));
    Array.from(cartItemsEl.querySelectorAll('.remove')).forEach(b=>b.addEventListener('click', ()=> removeItem(b.dataset.id)));

    checkoutBtn.disabled = cart.length === 0;
  }

  function changeQty(id, delta) {
    const item = cart.find(c=>c.id===id);
    if (!item) return;
    item.qty += delta;
    if (item.qty <= 0) cart = cart.filter(c=>c.id!==id);
    saveCart();
    renderCart();
  }

  function removeItem(id) {
    cart = cart.filter(c=>c.id!==id);
    saveCart();
    renderCart();
  }

  function toggleCart() {
    if (cartSidebar.classList.contains('open')) {
      cartSidebar.classList.remove('open'); cartSidebar.setAttribute('aria-hidden','true'); cartToggle.setAttribute('aria-expanded','false');
    } else {
      cartSidebar.classList.add('open'); cartSidebar.setAttribute('aria-hidden','false'); cartToggle.setAttribute('aria-expanded','true');
    }
  }
  function openCart() {
    cartSidebar.classList.add('open'); cartSidebar.setAttribute('aria-hidden','false'); cartToggle.setAttribute('aria-expanded','true');
  }

  // ---------- Checkout ----------
  checkoutBtn.addEventListener('click', () => {
    checkoutSummary.innerHTML = '';
    if (!cart.length) checkoutSummary.textContent = 'Your cart is empty.';
    else {
      const ul = document.createElement('ul'); ul.style.listStyle='none'; ul.style.padding=0;
      cart.forEach(ci => {
        const p = PRODUCTS.find(pp=>pp.id===ci.id);
        const li = document.createElement('li'); li.textContent = `${ci.qty} × ${p.title} — ₹${(p.price*ci.qty).toFixed(2)}`;
        ul.appendChild(li);
      });
      const subtotal = cart.reduce((s,ci)=>s + PRODUCTS.find(p=>p.id===ci.id).price * ci.qty, 0);
      const shipping = subtotal > 0 && subtotal < 3000 ? 99 : 0;
      const total = subtotal + shipping;
      const foot = document.createElement('div'); foot.style.marginTop='.6rem';
      foot.innerHTML = `<div class="small muted">Subtotal: ₹${subtotal.toFixed(2)}</div><div class="small muted">Shipping: ₹${shipping.toFixed(2)}</div><div style="margin-top:.4rem"><strong>Total: ₹${total.toFixed(2)}</strong></div>`;
      checkoutSummary.appendChild(ul); checkoutSummary.appendChild(foot);
    }
    checkoutModal.setAttribute('aria-hidden','false'); checkoutModal.style.display='flex';
  });

  checkoutClose.addEventListener('click', () => closeModal(checkoutModal));
  checkoutCancel.addEventListener('click', () => closeModal(checkoutModal));

  checkoutForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(checkoutForm);
    const data = Object.fromEntries(fd.entries());
    // validation
    let valid = true;
    Array.from(checkoutForm.querySelectorAll('input')).forEach(inp=>{
      const err = inp.nextElementSibling;
      if (!inp.checkValidity()) { valid = false; if (err) err.textContent = inp.validationMessage || 'Required'; }
      else if (err) err.textContent = '';
    });
    if (!valid) return;
    const order = {
      id: 'ORD' + Date.now(),
      customer: data,
      items: cart,
      total: cart.reduce((s,ci)=>s + PRODUCTS.find(p=>p.id===ci.id).price * ci.qty, 0)
    };
    closeModal(checkoutModal); cart = []; saveCart(); renderCart();
    closeCartSidebar();
    alert(`Thank you ${data.name}! Order ${order.id} placed (demo). Total: ₹${order.total.toFixed(2)}. Receipt in console.`);
    console.log('Demo order:', order);
    checkoutForm.reset();
  });

  // ---------- Modal helpers ----------
  function closeModal(el) {
    el.setAttribute('aria-hidden','true');
    if (el === productModal) productModal.style.display = 'none';
    if (el === checkoutModal) checkoutModal.style.display = 'none';
  }

  function closeCartSidebar() { cartSidebar.classList.remove('open'); cartSidebar.setAttribute('aria-hidden','true'); cartToggle.setAttribute('aria-expanded','false'); }

  // ---------- Utils ----------
  function escapeHtml(s) { return String(s).replace(/[&<>"']/g, (m) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m])); }

  // keyboard accessibility
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (productModal.getAttribute('aria-hidden') === 'false') closeModal(productModal);
      if (checkoutModal.getAttribute('aria-hidden') === 'false') closeModal(checkoutModal);
      if (cartSidebar.classList.contains('open')) closeCartSidebar();
    }
  });

  // initial render of cart
  renderCart();

})();
