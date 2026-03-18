



// ── Roles: superadmin > admin > worker > user ────────────────
// superadmin: все права  |  admin: всё кроме смены пароля/удаления admins/настроек
// worker: заказы + статусы, НЕ может: товары, клиенты, настройки, удалять заказы
const ADMIN_CREDENTIALS = { email: 'admin@tkoboi.kz', _ph: 'YWRtaW4xMjM=', name: 'Супер Администратор', role: 'superadmin' };
function _safeLS(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch(e) { localStorage.removeItem(key); return fallback; }
}
let users = JSON.parse(localStorage.getItem('tkoboi_users') || '[]');
if (!users.find(u=>u.email===ADMIN_CREDENTIALS.email)) {
 users.push({ email: ADMIN_CREDENTIALS.email, name: ADMIN_CREDENTIALS.name, _ph: ADMIN_CREDENTIALS._ph, role: 'superadmin' });
 localStorage.setItem('tkoboi_users', JSON.stringify(users));
}
// Migrate old admin role to superadmin
users = users.map(u => u.email === ADMIN_CREDENTIALS.email && u.role === 'admin' ? {...u, role:'superadmin', name: u.name||'Супер Администратор'} : u);
localStorage.setItem('tkoboi_users', JSON.stringify(users));

// Store settings (persistent)
let storeSettings = _safeLS('tkoboi_settings', {
  name: 'Тканевые обои Астана', email: 'tkoboi.astana@gmail.com', phone: '+7 707 175-98-77',
  courierCost: 350, postCost: 200, freeFrom: 8000
});
function saveStoreSettings(patch) {
  storeSettings = { ...storeSettings, ...patch };
  localStorage.setItem('tkoboi_settings', JSON.stringify(storeSettings));
}
let cart        = _safeLS('tkoboi_cart', []);
let wishlist    = _safeLS('tkoboi_wishlist', []);
let currentUser = _safeLS('tkoboi_user', null);
function isSuperAdmin() { return currentUser && currentUser.role === 'superadmin'; }
function isWorker()     { return currentUser && currentUser.role === 'worker'; }
function canAccessAdmin(){ return currentUser && ['superadmin','admin','worker'].includes(currentUser.role); }
let orders      = _safeLS('tkoboi_orders', []);
let deliveryCost = 350;
let currentProductId = null;
let adminProducts = [...PRODUCTS];
let editingProductId = null;
let compareList = JSON.parse(localStorage.getItem('tkoboi_compare') || '[]');
let promoApplied = null;
const PROMOS = { 'WALLS10': 10, 'GREEN15': 15, 'ASTANA20': 20 };
let currentReviews = JSON.parse(localStorage.getItem('tkoboi_reviews') || '{}');
let selectedColor = null;
let selectedSize = null;
let currentPage = 'home';
function navigate(page, id) {
 currentPage = page;
 document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
 const _pageEl = document.getElementById('page-' + page);
 if (!_pageEl) { const p404=document.getElementById('page-404'); if(p404) p404.classList.add('active'); return; }
 _pageEl.classList.add('active');
 window.scrollTo(0, 0);
 document.querySelectorAll('.nav-menu a').forEach(a => a.classList.remove('active'));
 const menuEl = document.getElementById('menu-' + page);
 if (menuEl) menuEl.classList.add('active');
 document.querySelectorAll('.mobile-nav-item').forEach(a => a.classList.remove('active'));
 const mnavEl = document.getElementById('mnav-' + page);
 if (mnavEl) mnavEl.classList.add('active');
 if (page === 'home') renderHome();
 if (page === 'catalog') renderCatalog();
 if (page === 'product') renderProductPage(id);
 if (page === 'cart') renderCart();
 if (page === 'wishlist') renderWishlist();
 if (page === 'checkout') renderCheckout();
 if (page === 'profile') renderProfile();
 if (page === 'admin') renderAdmin();
}
window.addEventListener('scroll', () => {
 document.getElementById('navbar').classList.toggle('scrolled', window.scrollY > 20);
});
function sanitize(str) {
 if (typeof str !== 'string') return '';
 const d = document.createElement('div');
 d.textContent = str;
 return d.innerHTML;
}
function debounce(fn, delay) {
 let timer;
 return function(...args) { clearTimeout(timer); timer = setTimeout(() => fn.apply(this, args), delay); };
}
const _doNavSearch = debounce(function(val) {
 if (val.length > 0) {
 navigate('catalog');
 setTimeout(() => {
 const subtitle = document.getElementById('catalogSubtitle');
 if (subtitle) subtitle.textContent = 'Поиск: "' + sanitize(val) + '"';
 applyFilters(val);
 }, 100);
 }
}, 300);
function handleNavSearch(val) { _doNavSearch(val); }

// Skeleton loader for product grids
function skeletonCards(count=4) {
  return Array(count).fill(0).map(()=>`
    <div class="skeleton-card">
      <div class="sk-img"></div>
      <div class="sk-body">
        <div class="sk-line"></div>
        <div class="sk-line short"></div>
        <div class="sk-line price"></div>
      </div>
    </div>`).join('');
}

function renderHome() {
 const cg = document.getElementById('catGrid');
 if (cg) cg.innerHTML = CATEGORIES.map(c => `
 <div class="cat-card fade-in" onclick="navigate('catalog');filterByCategory('${c.id}')">
 <span class="cat-icon">${c.icon}</span>
 <div class="cat-name">${c.name}</div>
 <div class="cat-count">${c.count} товаров</div>
 </div>`).join('');
 const pg = document.getElementById('popularGrid');
 if (pg) {
    pg.innerHTML = skeletonCards(4);
    setTimeout(() => { pg.innerHTML = PRODUCTS.slice(0,4).map(p => productCard(p)).join(''); }, 120);
  }
 const ng = document.getElementById('newGrid');
 if (ng) {
    ng.innerHTML = skeletonCards(4);
    setTimeout(() => { ng.innerHTML = PRODUCTS.filter(p=>p.badge==='new').slice(0,4).map(p => productCard(p)).join(''); }, 180);
  }
}
function imgFallback(el) {
 el.style.display = 'none';
 const wrap = el.parentElement;
 if (!wrap.querySelector('.img-placeholder')) {
 const ph = document.createElement('div');
 ph.className = 'img-placeholder';
 ph.innerHTML = '<i class="fas fa-image"></i>';
 wrap.insertBefore(ph, el);
 }
}
function productCard(p) {
 const inWish = wishlist.includes(p.id);
 const badgeHtml = p.badge ? `<span class="product-badge badge-${p.badge}">${p.badge==='sale'?'Скидка':p.badge==='new'?'Новинка':'Хит'}</span>` : '';
 const oldPriceHtml = p.oldPrice ? `<span class="product-price-old">${p.oldPrice.toLocaleString('ru-KZ')} ₸</span>` : '';
 const stockBadge = !p.inStock ? '<span style="font-size:0.72rem;color:var(--danger);margin-bottom:8px;display:block">Нет в наличии</span>' : '';
 return `
 <div class="product-card fade-in" onclick="navigate('product',${p.id})">
 <div class="product-img-wrap">
 <img src="${p.img}" alt="${p.name}" loading="lazy" onerror="imgFallback(this)">
 ${badgeHtml}
 <button class="product-wishlist ${inWish?'active':''}" onclick="event.stopPropagation();toggleWishlist(${p.id})" id="wish-${p.id}" title="В избранное">
 <i class="fa${inWish?'s':'r'} fa-heart"></i>
 </button>
 </div>
 <div class="product-body">
 <div class="product-cat">${p.catName}</div>
 <div class="product-name">${p.name}</div>
 <div class="product-rating">
 <div class="stars">${'★'.repeat(Math.floor(p.rating))}${'☆'.repeat(5-Math.floor(p.rating))}</div>
 <span class="rating-count">${p.rating} (${p.reviews})</span>
 </div>
 ${stockBadge}
 <div class="product-footer">
 <div class="product-price-wrap">
 <span class="product-price">${p.price.toLocaleString('ru-KZ')} ₸</span>
 ${oldPriceHtml}
 </div>
 <button class="btn-cart" onclick="event.stopPropagation();addToCart(${p.id})" ${!p.inStock?'disabled style="opacity:0.5;cursor:not-allowed"':''}>
 <i class="fas fa-cart-plus"></i>
 </button>
 </div>
 </div>
 </div>`;
}
let activeCategory = null;
let filteredProducts = [...PRODUCTS];
function renderCatalog() {
 const cf = document.getElementById('catFilters');
 if (cf) cf.innerHTML = CATEGORIES.map(c => `
 <label class="filter-option">
 <input type="checkbox" value="${c.id}" ${activeCategory===c.id?'checked':''} onchange="applyFilters()">
 ${c.icon} ${c.name}
 </label>`).join('');
 applyFilters();
}
function filterByCategory(catId) {
 activeCategory = catId;
 renderCatalog();
}
function applyFilters(searchVal) {
 if (!Array.isArray(PRODUCTS) || !PRODUCTS.length) return;
 const search = searchVal !== undefined ? searchVal : (document.getElementById('navSearch')?.value || '');
 const selectedCats = [...document.querySelectorAll('#catFilters input:checked')].map(i=>i.value);
 const minPrice = parseFloat(document.getElementById('priceMin')?.value) || 0;
 const maxPrice = parseFloat(document.getElementById('priceMax')?.value) || Infinity;
 const ratingFilters = [...document.querySelectorAll('.filter-group input[type=checkbox][value]')].filter(i=>i.value && !isNaN(i.value) && i.checked).map(i=>parseFloat(i.value));
 const inStockOnly = document.getElementById('inStockFilter')?.checked;
 const saleOnly = document.getElementById('saleFilter')?.checked;
 const sort = document.getElementById('sortSelect')?.value || 'popular';
 let prods = [...PRODUCTS];
 if (search) prods = prods.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.catName.toLowerCase().includes(search.toLowerCase()));
 if (selectedCats.length) prods = prods.filter(p => selectedCats.includes(p.cat));
 if (minPrice) prods = prods.filter(p => p.price >= minPrice);
 if (maxPrice < Infinity) prods = prods.filter(p => p.price <= maxPrice);
 if (ratingFilters.length) prods = prods.filter(p => ratingFilters.some(r => p.rating >= r));
 if (inStockOnly) prods = prods.filter(p => p.inStock);
 if (saleOnly) prods = prods.filter(p => p.oldPrice);
 if (sort === 'price-asc') prods.sort((a,b)=>a.price-b.price);
 else if (sort === 'price-desc') prods.sort((a,b)=>b.price-a.price);
 else if (sort === 'rating') prods.sort((a,b)=>b.rating-a.rating);
 else if (sort === 'new') prods = prods.filter(p=>p.badge==='new').concat(prods.filter(p=>p.badge!=='new'));
 filteredProducts = prods;
 const cg = document.getElementById('catalogGrid');
 if (cg) {
 cg.innerHTML = prods.length ? prods.map(p=>productCard(p)).join('') : '<div style="text-align:center;padding:60px;color:var(--text2);grid-column:1/-1"><i class="fas fa-search" style="font-size:2rem;margin-bottom:16px;display:block;color:var(--text3)"></i>Ничего не найдено</div>';
 }
 const cc = document.getElementById('catalogCount');
 if (cc) cc.textContent = `Найдено ${prods.length} товаров`;
}
function resetFilters() {
 document.querySelectorAll('#catFilters input').forEach(i=>i.checked=false);
 document.getElementById('priceMin').value = '';
 document.getElementById('priceMax').value = '';
 document.querySelectorAll('.filter-group input[type=checkbox]').forEach(i=>i.checked=false);
 applyFilters();
}
function renderProductPage(id) {
 const p = PRODUCTS.find(x=>x.id===id);
 if (!p) return;
 currentProductId = id;
 selectedColor = p.colors?.[0] || null;
 selectedSize = null;
 currentStarRating = 0;
 const inWish = wishlist.includes(p.id);
 const imgs = p.imgs || [p.img, p.img, p.img, p.img];
 const discount = p.oldPrice ? Math.round((1 - p.price/p.oldPrice)*100) : 0;
 const productReviews = currentReviews[p.id] || [];
 const avgRating = productReviews.length
 ? (productReviews.reduce((s,r)=>s+r.rating,0)/productReviews.length).toFixed(1)
 : p.rating;
 document.getElementById('productBreadcrumb').innerHTML = `
 <span onclick="navigate('home')">Главная</span> <i class="fas fa-chevron-right" style="font-size:0.7rem"></i>
 <span onclick="navigate('catalog')">${p.catName}</span> <i class="fas fa-chevron-right" style="font-size:0.7rem"></i>
 <span style="color:var(--text)">${p.name}</span>`;
 const colorsHtml = p.colors?.length ? `
 <div style="margin-bottom:20px">
 <div style="font-size:0.82rem;color:var(--text2);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px;font-weight:600">Цвет: <span id="colorLabel" style="color:var(--text)">${p.colors[0]}</span></div>
 <div style="display:flex;gap:8px;flex-wrap:wrap" id="colorBtns">
 ${p.colors.map(c=>`<button onclick="selectProductColor(this,'${c}')" class="color-btn ${c===p.colors[0]?'active':''}" style="padding:6px 14px;border-radius:8px;border:1px solid ${c===p.colors[0]?'var(--accent)':'var(--border)'};background:${c===p.colors[0]?'rgba(108,99,255,0.1)':'var(--bg3)'};color:var(--text);font-size:0.85rem;transition:var(--transition)">${c}</button>`).join('')}
 </div>
 </div>` : '';
 const sizesHtml = p.sizes?.length ? `
 <div style="margin-bottom:20px">
 <div style="font-size:0.82rem;color:var(--text2);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px;font-weight:600">Размер: <span id="sizeLabel" style="color:var(--text2)">Выберите размер</span></div>
 <div style="display:flex;gap:8px;flex-wrap:wrap" id="sizeBtns">
 ${p.sizes.map(s=>`<button onclick="selectProductSize(this,'${s}')" style="min-width:44px;height:44px;padding:0 10px;border-radius:8px;border:1px solid var(--border);background:var(--bg3);color:var(--text2);font-size:0.85rem;font-weight:600;transition:var(--transition)">${s}</button>`).join('')}
 </div>
 </div>` : '';
 document.getElementById('productLayout').innerHTML = `
 <div class="product-gallery">
 <div class="gallery-main"><img loading="lazy" src="${imgs[0]}" alt="${p.name}" id="galleryMain" onerror="this.src='';this.style.display='none';this.parentElement.style.background='var(--bg3)'"></div>
 <div class="gallery-thumbs">
 ${imgs.map((img,i)=>`<div class="gallery-thumb ${i===0?'active':''}" onclick="setThumb(this,'${img}')"><img loading="lazy" src="${img}" alt="Фото товара" onerror="this.style.opacity='0.3'"></div>`).join('')}
 </div>
 </div>
 <div class="product-info">
 <div class="product-info-cat">${p.catName}</div>
 <h1 class="product-info-name">${p.name}</h1>
 <div class="product-info-rating">
 <div class="stars" style="font-size:1.1rem">${'★'.repeat(Math.floor(avgRating))}${'☆'.repeat(5-Math.floor(avgRating))}</div>
 <span style="font-weight:700">${avgRating}</span>
 <span style="color:var(--text3)">(${p.reviews + productReviews.length} отзывов)</span>
 ${p.inStock ? '<span style="color:var(--success);font-size:0.85rem"><i class="fas fa-check-circle"></i> В наличии</span>' : '<span style="color:var(--danger);font-size:0.85rem"><i class="fas fa-times-circle"></i> Нет в наличии</span>'}
 </div>
 <div class="product-info-price">
 <span class="price-main">${p.price.toLocaleString('ru-KZ')} ₸</span>
 ${p.oldPrice ? `<span class="price-old">${p.oldPrice.toLocaleString('ru-KZ')} ₸</span><span class="discount">-${discount}%</span>` : ''}
 </div>
 <p class="product-desc">${p.desc}</p>
 ${colorsHtml}
 ${sizesHtml}
 <div class="product-specs" style="margin-bottom:20px">
 ${p.specs.map(([k,v])=>`<div class="spec-row"><span class="spec-key">${k}</span><span class="spec-val">${v}</span></div>`).join('')}
 </div>
 <div class="product-qty">
 <span class="qty-label">Количество:</span>
 <div class="qty-ctrl">
 <button class="qty-btn" onclick="changeQty(-1)">−</button>
 <input class="qty-num" id="productQty" value="1" readonly style="min-width:32px">
 <button class="qty-btn" onclick="changeQty(1)">+</button>
 </div>
 </div>
 <div class="product-actions">
 <button class="btn-buy" onclick="buyNow(${p.id})" ${!p.inStock?'disabled style="opacity:0.5"':''}><i class="fas fa-bolt"></i> Купить сейчас</button>
 <button class="btn-add-cart" onclick="addToCart(${p.id})" ${!p.inStock?'disabled style="opacity:0.5"':''}><i class="fas fa-cart-plus"></i> В корзину</button>
 <button class="btn-wish-big ${inWish?'active':''}" onclick="toggleWishlist(${p.id});this.classList.toggle('active')" id="pgWishBtn" title="В избранное">
 <i class="fa${inWish?'s':'r'} fa-heart"></i>
 </button>
 <button class="btn-wish-big" onclick="addToCompare(${p.id})" title="Добавить к сравнению" style="font-size:0.95rem">
 <i class="fas fa-balance-scale"></i>
 </button>
 </div>
 <div style="margin-top:16px;padding:12px 16px;background:rgba(46,204,113,0.08);border:1px solid rgba(46,204,113,0.2);border-radius:12px;font-size:0.85rem;color:var(--success);display:flex;gap:10px;align-items:center">
 <i class="fas fa-truck"></i>
 <span>Бесплатная доставка от 5000 ₸ · Возврат 30 дней без вопросов</span>
 </div>
 </div>`;
 const rel = PRODUCTS.filter(x=>x.cat===p.cat && x.id!==p.id).slice(0,4);
 document.getElementById('relatedGrid').innerHTML = rel.map(x=>productCard(x)).join('');
 setTimeout(()=>{
 const container = document.querySelector('#page-product .container');
 let reviewsDiv = document.getElementById('reviewsSection');
 if (reviewsDiv) reviewsDiv.remove();
 reviewsDiv = document.createElement('div');
 reviewsDiv.id = 'reviewsSection';
 reviewsDiv.style.marginTop = '60px';
 reviewsDiv.innerHTML = buildReviewsHTML(p, productReviews);
 container.appendChild(reviewsDiv);
 }, 50);
}
function selectProductColor(btn, color) {
 selectedColor = color;
 document.querySelectorAll('.color-btn').forEach(b => {
 b.style.borderColor = 'var(--border)'; b.style.background = 'var(--bg3)'; b.classList.remove('active');
 });
 btn.style.borderColor = 'var(--accent)'; btn.style.background = 'rgba(108,99,255,0.1)'; btn.classList.add('active');
 const label = document.getElementById('colorLabel');
 if (label) label.textContent = color;
}
function selectProductSize(btn, size) {
 selectedSize = size;
 document.querySelectorAll('#sizeBtns button').forEach(b => {
 b.style.borderColor = 'var(--border)'; b.style.color = 'var(--text2)'; b.style.background = 'var(--bg3)';
 });
 btn.style.borderColor = 'var(--accent)'; btn.style.color = 'var(--text)'; btn.style.background = 'rgba(108,99,255,0.1)';
 const label = document.getElementById('sizeLabel');
 if (label) { label.textContent = size; label.style.color = 'var(--text)'; }
}
function buildReviewsHTML(p, productReviews) {
 const avgRating = productReviews.length
 ? (productReviews.reduce((s,r)=>s+r.rating,0)/productReviews.length).toFixed(1)
 : p.rating;
 const totalCount = p.reviews + productReviews.length;
 const ratingBars = [5,4,3,2,1].map(star => {
 const count = productReviews.filter(r=>Math.round(r.rating)===star).length;
 const pct = productReviews.length ? Math.round(count/productReviews.length*100) : [60,25,10,3,2][5-star];
 return `<div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
 <span style="font-size:0.8rem;color:var(--text3);min-width:8px">${star}</span>
 <i class="fas fa-star" style="font-size:0.7rem;color:var(--gold)"></i>
 <div style="flex:1;height:6px;background:var(--bg3);border-radius:3px;overflow:hidden">
 <div style="width:${pct}%;height:100%;background:var(--gold);border-radius:3px"></div>
 </div>
 <span style="font-size:0.75rem;color:var(--text3);min-width:28px">${pct}%</span>
 </div>`;
 }).join('');
 const reviewsList = productReviews.length ? productReviews.map(r=>`
 <div style="padding:20px 0;border-bottom:1px solid var(--border)">
 <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
 <div style="display:flex;align-items:center;gap:10px">
 <div style="width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,var(--accent),var(--accent2));display:flex;align-items:center;justify-content:center;font-weight:700;font-size:0.9rem;color:#fff">${r.author[0].toUpperCase()}</div>
 <div><div style="font-weight:600;font-size:0.9rem">${r.author}</div><div style="font-size:0.75rem;color:var(--text3)">${r.date}</div></div>
 </div>
 <div style="color:var(--gold);font-size:0.9rem">${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}</div>
 </div>
 <p style="color:var(--text2);font-size:0.9rem;line-height:1.6">${r.text}</p>
 </div>`).join('') : `<div style="text-align:center;padding:40px;color:var(--text3)"><i class="fas fa-comment-slash" style="font-size:2rem;margin-bottom:12px;display:block"></i>Будьте первым, кто оставит отзыв!</div>`;
 return `<div class="section-header" style="margin-bottom:24px">
 <h2 class="section-title">Отзывы<span class="dot">.</span> <span style="font-size:1rem;color:var(--text3);font-family:'Satoshi'">${totalCount}</span></h2>
 </div>
 <div style="display:grid;grid-template-columns:220px 1fr;gap:32px;margin-bottom:40px" class="reviews-layout">
 <div style="background:var(--card);border:1px solid var(--border);border-radius:16px;padding:24px;text-align:center;height:fit-content">
 <div style="font-family:'Clash Display';font-size:3rem;font-weight:700;color:var(--text)">${avgRating}</div>
 <div style="color:var(--gold);font-size:1.3rem;margin:6px 0">${'★'.repeat(Math.round(avgRating))}${'☆'.repeat(5-Math.round(avgRating))}</div>
 <div style="color:var(--text2);font-size:0.82rem;margin-bottom:20px">${totalCount} отзывов</div>
 ${ratingBars}
 </div>
 <div>
 <div style="background:var(--card);border:1px solid var(--border);border-radius:16px;padding:24px;margin-bottom:24px">
 <h3 style="font-size:1rem;margin-bottom:16px"><i class="fas fa-pen" style="color:var(--accent);margin-right:8px"></i>Написать отзыв</h3>
 <div style="margin-bottom:12px">
 <div style="font-size:0.8rem;color:var(--text2);margin-bottom:8px">Ваша оценка</div>
 <div id="starRating" style="display:flex;gap:6px;font-size:1.6rem;color:var(--text3)">${[1,2,3,4,5].map(s=>`<span onclick="setReviewStar(${s})" id="rstar-${s}" style="cursor:pointer;transition:transform 0.15s">☆</span>`).join('')}</div>
 </div>
 <div class="form-grid" style="margin-bottom:12px">
 <div class="form-group" style="margin:0"><input class="form-input" id="reviewAuthor" placeholder="Ваше имя" value="${currentUser?.name||''}"></div>
 <div class="form-group" style="margin:0"><input class="form-input" id="reviewTitle" placeholder="Заголовок отзыва"></div>
 </div>
 <div class="form-group" style="margin-bottom:12px"><textarea class="form-input" id="reviewText" rows="3" placeholder="Расскажите о товаре подробнее..."></textarea></div>
 <button class="btn btn-primary" onclick="submitReview(${p.id})" style="padding:10px 24px"><i class="fas fa-paper-plane"></i> Опубликовать отзыв</button>
 </div>
 <div id="reviewsList">${reviewsList}</div>
 </div>
 </div>`;
}
let currentStarRating = 0;
function setReviewStar(n) {
 currentStarRating = n;
 for (let i=1;i<=5;i++) {
 const el = document.getElementById('rstar-'+i);
 if (el) { el.textContent = i<=n?'★':'☆'; el.style.color = i<=n?'var(--gold)':'var(--text3)'; el.style.transform = 'scale(1.1)'; setTimeout(()=>el.style.transform='',150); }
 }
}
function submitReview(productId) {
 const author = sanitize(document.getElementById('reviewAuthor')?.value?.trim() || '');
 const text = sanitize(document.getElementById('reviewText')?.value?.trim() || '');
 if (!author || !text) { showNotif('Заполните имя и текст отзыва', 'error'); return; }
 if (author.length > 80) { showNotif('Имя слишком длинное', 'error'); return; }
 if (text.length > 1000) { showNotif('Текст отзыва слишком длинный (макс. 1000 символов)', 'error'); return; }
 if (!currentStarRating) { showNotif('Поставьте оценку звёздами', 'error'); return; }
 if (!currentReviews[productId]) currentReviews[productId] = [];
 currentReviews[productId].unshift({ author, text, rating: currentStarRating, date: new Date().toLocaleDateString('ru-KZ') });
 localStorage.setItem('tkoboi_reviews', JSON.stringify(currentReviews));
 showNotif('Отзыв опубликован! Спасибо!', 'success');
 currentStarRating = 0;
 navigate('product', productId);
}
function addToCompare(id) {
 if (compareList.includes(id)) { showNotif('Уже добавлен в сравнение', 'info'); return; }
 if (compareList.length >= 4) { showNotif('Максимум 4 товара', 'error'); return; }
 compareList.push(id);
 localStorage.setItem('tkoboi_compare', JSON.stringify(compareList));
 showNotif('Добавлен в сравнение! <a onclick="navigate(\'profile\');profileSection(\'compare\')" style="color:var(--accent);margin-left:6px">Смотреть</a>', 'success');
}
function removeFromCompare(id) {
 compareList = compareList.filter(i=>i!==id);
 localStorage.setItem('tkoboi_compare', JSON.stringify(compareList));
 profileSection('compare');
}
function renderCompareSection(content) {
 const items = PRODUCTS.filter(p=>compareList.includes(p.id));
 if (!items.length) {
 content.innerHTML = `<h2 style="margin-bottom:20px">Сравнение товаров</h2>
 <div style="text-align:center;padding:60px;background:var(--bg3);border-radius:16px">
 <i class="fas fa-balance-scale" style="font-size:2.5rem;color:var(--text3);display:block;margin-bottom:16px"></i>
 <p style="color:var(--text2)">Нет товаров для сравнения</p>
 <p style="color:var(--text3);font-size:0.82rem;margin-top:6px">Откройте товар и нажмите ⚖</p>
 </div>`;
 return;
 }
 const allKeys = [...new Set(items.flatMap(p=>p.specs.map(s=>s[0])))];
 content.innerHTML = `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
 <h2>Сравнение <span style="color:var(--text3);font-size:1rem">(${items.length})</span></h2>
 <button onclick="compareList=[];localStorage.setItem('tkoboi_compare',JSON.stringify(compareList));renderCompareSection(document.getElementById('profileSection'))" style="color:var(--danger);background:none;font-size:0.85rem"><i class="fas fa-trash"></i> Очистить</button>
 </div>
 <div style="overflow-x:auto">
 <table style="width:100%;border-collapse:collapse;min-width:500px">
 <thead><tr>
 <th style="padding:12px;text-align:left;color:var(--text3);font-size:0.75rem;text-transform:uppercase;border-bottom:1px solid var(--border)">Характеристика</th>
 ${items.map(p=>`<th style="padding:12px;text-align:center;border-bottom:1px solid var(--border)">
 <img loading="lazy" src="${p.img}" style="width:56px;height:56px;border-radius:8px;object-fit:cover;display:block;margin:0 auto 8px" loading="lazy" onerror="this.style.opacity=0.3">
 <div style="font-size:0.8rem;font-weight:600">${p.name}</div>
 <div style="color:var(--accent);font-weight:700;margin:4px 0">${p.price.toLocaleString('ru-KZ')} ₸</div>
 <button onclick="removeFromCompare(${p.id})" style="color:var(--text3);background:none;font-size:0.72rem"><i class="fas fa-times"></i> убрать</button>
 </th>`).join('')}
 </tr></thead>
 <tbody>
 ${allKeys.map((key,i)=>`<tr style="background:${i%2===0?'transparent':'rgba(255,255,255,0.025)'}">
 <td style="padding:10px 12px;color:var(--text3);font-size:0.85rem;border-bottom:1px solid rgba(255,255,255,0.04)">${key}</td>
 ${items.map(p=>{const spec=p.specs.find(s=>s[0]===key);return `<td style="padding:10px 12px;text-align:center;font-size:0.85rem;border-bottom:1px solid rgba(255,255,255,0.04)">${spec?spec[1]:'—'}</td>`;}).join('')}
 </tr>`).join('')}
 </tbody>
 </table>
 </div>`;
}
function setThumb(el, src) {
 document.getElementById('galleryMain').src = src;
 document.querySelectorAll('.gallery-thumb').forEach(t=>t.classList.remove('active'));
 el.classList.add('active');
}
function changeQty(delta) {
 const el = document.getElementById('productQty');
 let v = parseInt(el.value) + delta;
 if (v < 1) v = 1;
 if (v > 99) v = 99;
 el.value = v;
}
function buyNow(id) {
 addToCart(id);
 navigate('checkout');
}


function selectDelivery(el, type, cost) {
 deliveryCost = cost;
 document.querySelectorAll('#deliveryOptions .radio-option').forEach(o=>o.classList.remove('selected'));
 el.classList.add('selected');
 if (currentPage === 'checkout') renderCheckoutSummary();
}
function selectPayment(el, type) {
 document.querySelectorAll('#paymentOptions .radio-option').forEach(o=>o.classList.remove('selected'));
 el.classList.add('selected');
 const cardForm = document.getElementById('cardForm');
 const kaspiQr = document.getElementById('kaspiQrBlock');
 if (cardForm) cardForm.style.display = type === 'card' ? 'block' : 'none';
 if (kaspiQr) kaspiQr.style.display = (type === 'kaspi_qr' || type === 'kaspi_pay') ? 'block' : 'none';
}
function formatCard(el) {
 let v = el.value.replace(/\D/g,'').slice(0,16);
 v = v.match(/.{1,4}/g)?.join(' ') || v;
 el.value = v;
 const cnp = document.getElementById('cardNumPreview'); if (cnp) cnp.textContent = v || '•••• •••• •••• ••••';
}
function formatExp(el) {
 let v = el.value.replace(/\D/g,'').slice(0,4);
 if (v.length >= 2) v = v.slice(0,2) + '/' + v.slice(2);
 el.value = v;
 document.getElementById('cardExpPreview').textContent = v || 'MM/YY';
}
function renderCheckout() {
 // Apply current delivery settings to labels
 const courierLabel = document.querySelector('#deliveryOptions label:nth-child(1) .radio-sub');
 const postLabel    = document.querySelector('#deliveryOptions label:nth-child(2) .radio-sub');
 if (courierLabel) courierLabel.textContent = `1-3 дня · ${storeSettings.courierCost} ₸`;
 if (postLabel)    postLabel.textContent    = `5-10 дней · ${storeSettings.postCost} ₸`;
 // Pre-fill contact info from logged in user
 if (currentUser) {
   const nameEl  = document.getElementById('co-name');
   const emailEl = document.getElementById('co-email');
   const phoneEl = document.getElementById('co-phone');
   if (nameEl  && !nameEl.value)  nameEl.value  = currentUser.name  || '';
   if (emailEl && !emailEl.value) emailEl.value = currentUser.email || '';
   if (phoneEl && !phoneEl.value) phoneEl.value = currentUser.phone || '';
 }
 renderCheckoutSummary();
 // Reset promo message
 const promoMsg = document.getElementById('checkoutPromoMsg');
 const promoInput = document.getElementById('checkoutPromoInput');
 if (promoMsg) promoMsg.innerHTML = promoApplied ? `<span style="color:var(--success)"><i class="fas fa-check-circle"></i> Промокод ${promoApplied} применён — скидка ${PROMOS[promoApplied]}%!</span>` : '';
 if (promoInput && promoApplied) promoInput.value = promoApplied;
 const items = document.getElementById('checkoutItems');
 if (items) {
 items.innerHTML = cart.map(item=>{
 const p = PRODUCTS.find(x=>x.id===item.id);
 if (!p) return '';
 return `<div class="summary-row" style="align-items:center">
 <span class="label" style="display:flex;align-items:center;gap:8px">
 <img src="${p.img}" style="width:36px;height:36px;border-radius:6px;object-fit:cover" loading="lazy">
 ${p.name} ×${item.qty}
 </span>
 <span class="value">${(p.price*item.qty).toLocaleString('ru-KZ')} ₸</span>
 </div>`;
 }).join('');
 }
}
function renderCheckoutSummary() {
 const total = getCartTotal();
 const discount = (promoApplied && window.PROMOS && window.PROMOS[promoApplied]) ? Math.round(total * window.PROMOS[promoApplied] / 100) : 0;
 const final = getCartFinalTotal();
 const el = document.getElementById('checkoutSummary');
 if (el) el.innerHTML = `
 <div class="summary-row"><span class="label">Товары</span><span class="value">${total.toLocaleString('ru-KZ')} ₸</span></div>
 <div class="summary-row"><span class="label">Доставка</span><span class="value">${deliveryCost > 0 ? deliveryCost + ' ₸' : 'Бесплатно'}</span></div>
 ${promoApplied ? `<div class="summary-row"><span class="label" style="color:var(--success)">Промокод −${PROMOS[promoApplied]}%</span><span class="value" style="color:var(--success)">−${discount.toLocaleString('ru-KZ')} ₸</span></div>` : ''}
 <div class="summary-row total"><span class="label">Итого</span><span class="value">${final.toLocaleString('ru-KZ')} ₸</span></div>`;
}
function placeOrder() {
 const name     = document.getElementById('co-name')?.value?.trim();
 const phone    = document.getElementById('co-phone')?.value?.trim();
 const email    = document.getElementById('co-email')?.value?.trim();
 const addr     = document.getElementById('co-address')?.value?.trim();
 const delivery = document.querySelector('[name="delivery"]:checked')?.value || 'courier';
 const payType  = document.querySelector('[name="payment"]:checked')?.value || 'kaspi_qr';
 if (!name)  { showNotif('Введите имя получателя', 'error'); document.getElementById('co-name')?.focus(); return; }
 if (!phone) { showNotif('Введите номер телефона', 'error'); document.getElementById('co-phone')?.focus(); return; }
 if (phone.replace(/\D/g,'').length < 10) { showNotif('Введите корректный номер телефона (минимум 10 цифр)', 'error'); return; }
 if (delivery !== 'pickup' && !addr) { showNotif('Введите адрес доставки', 'error'); document.getElementById('co-address')?.focus(); return; }
 if (cart.length === 0) { showNotif('Корзина пуста', 'error'); return; }
 if (payType === 'card') {
   const cardNum = document.getElementById('cardNum')?.value?.replace(/\s/g,'');
   const cardExp = document.getElementById('cardExp')?.value;
   if (!cardNum || cardNum.length < 16) { showNotif('Введите полный номер карты', 'error'); return; }
   if (!cardExp || cardExp.length < 5)  { showNotif('Введите срок действия карты', 'error'); return; }
 }
 const order = {
   id: '#' + Math.random().toString(36).substr(2,8).toUpperCase(),
   date: new Date().toLocaleDateString('ru-KZ'),
   status: 'processing',
   items: [...cart],
   total: getCartFinalTotal(),
   deliveryType: delivery,
   address: addr || '',
   paymentType: payType,
   promoCode: promoApplied || null,
   name, phone, email,
   userEmail: currentUser ? currentUser.email : (email || 'guest')
 };
 orders.unshift(order);
 localStorage.setItem('tkoboi_orders', JSON.stringify(orders));
 if (promoApplied) { _incrementPromoUse(promoApplied); promoApplied = null; }
 cart = [];
 saveCart();
 const promoMsg   = document.getElementById('checkoutPromoMsg');
 const promoInput = document.getElementById('checkoutPromoInput');
 if (promoMsg)   promoMsg.innerHTML = '';
 if (promoInput) promoInput.value   = '';
 showModal(`<div class="success-animation">
 <div class="success-circle"><i class="fas fa-check"></i></div>
 <h2>Заказ оформлен!</h2>
 <p style="color:var(--text2);margin-bottom:8px">Заказ <strong>${order.id}</strong> принят в работу</p>
 <p style="color:var(--text2);font-size:0.9rem">Мы свяжемся с вами по номеру <strong>${phone}</strong></p>
 ${order.promoCode ? `<p style="color:var(--success);font-size:0.85rem;margin-top:6px"><i class="fas fa-tag"></i> Промокод ${order.promoCode} применён</p>` : ''}
 <button class="btn btn-primary" style="margin-top:24px;width:100%" onclick="closeModal();navigate('profile')">
 <i class="fas fa-receipt"></i> Посмотреть заказы
 </button>
 </div>`);
}
function renderProfile() {
 const content = document.getElementById('profileContent');
 if (!content) return;
 if (!currentUser) {
 renderAuth('login');
 return;
 }
 const adminLink = isAdmin() ? `<a onclick="navigate('admin')" style="color:var(--accent) !important;border:1px solid rgba(108,99,255,0.2);border-radius:10px"><i class="fas fa-shield-alt"></i> Панель администратора</a>` : '';
const myOrders = isAdmin() ? orders : orders.filter(o => o.userEmail === currentUser.email || o.email === currentUser.email || (!o.userEmail && !o.email && o.name === currentUser.name));
 content.innerHTML = `<div class="profile-layout">
 <div class="profile-sidebar">
 <div class="profile-avatar">${currentUser.name[0].toUpperCase()}</div>
 <div class="profile-name">${currentUser.name}</div>
 <div class="profile-email">${currentUser.email}</div>
 ${isAdmin() || isWorker() ? `<div style="text-align:center;margin-bottom:12px"><span style="background:${isSuperAdmin()?'rgba(255,215,0,0.15)':isWorker()?'rgba(67,232,176,0.12)':'rgba(108,99,255,0.15)'};color:${isSuperAdmin()?'var(--gold)':isWorker()?'var(--accent3)':'var(--accent)'};font-size:0.72rem;font-weight:700;padding:3px 10px;border-radius:50px;text-transform:uppercase;letter-spacing:0.5px"><i class="fas fa-${isSuperAdmin()?'crown':isWorker()?'hard-hat':'shield-alt'}" style="margin-right:4px"></i>${isSuperAdmin()?'Супер Администратор':isWorker()?'Работник':'Администратор'}</span></div>` : ''}
 <div class="profile-nav">
 <a onclick="profileSection('orders')" id="psec-orders" class="active"><i class="fas fa-receipt"></i> История заказов</a>
 <a onclick="profileSection('wishlist')" id="psec-wishlist"><i class="fas fa-heart"></i> Избранное</a>
 <a onclick="profileSection('compare')" id="psec-compare"><i class="fas fa-balance-scale"></i> Сравнение</a>
 <a onclick="profileSection('settings')" id="psec-settings"><i class="fas fa-cog"></i> Настройки</a>
 ${adminLink}
 <a onclick="logout()" style="color:var(--danger) !important;margin-top:8px"><i class="fas fa-sign-out-alt"></i> Выйти</a>
 </div>
 </div>
 <div class="profile-content" id="profileSection">
 <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px">
 <h2>История заказов</h2>
 <span style="color:var(--text2);font-size:0.88rem">${myOrders.length} заказов</span>
 </div>
 ${myOrders.length === 0 ? `<div style="text-align:center;padding:60px;background:var(--bg3);border-radius:16px">
 <i class="fas fa-receipt" style="font-size:2.5rem;color:var(--text3);display:block;margin-bottom:16px"></i>
 <p style="color:var(--text2)">У вас пока нет заказов</p>
 <button class="btn btn-primary" style="margin-top:16px" onclick="navigate('catalog')">Перейти в каталог</button>
 </div>` :
 myOrders.map(o=>`
 <div class="order-card">
 <div class="order-header">
 <div>
 <div class="order-id">${o.id}</div>
 <div class="order-date">${o.date}</div>
 </div>
 <span class="order-status status-${o.status}">${o.status==='processing'?'В обработке':o.status==='shipped'?'Отправлен':'Доставлен'}</span>
 </div>
 <div class="order-items-preview">
 ${o.items.slice(0,3).map(item=>{
 const p = PRODUCTS.find(x=>x.id===item.id);
 return p ? `<img loading="lazy" class="order-thumb" src="${p.img}" alt="${p.name}" onerror="this.style.opacity=0.3">` : '';
 }).join('')}
 ${o.items.length > 3 ? `<div class="order-more">+${o.items.length-3}</div>` : ''}
 </div>
 <div style="margin-top:12px;display:flex;justify-content:space-between;align-items:center">
 <span style="color:var(--text2);font-size:0.88rem">${o.items.length} товаров · ${o.deliveryType||'Курьер'}</span>
 <span style="font-weight:700;color:var(--accent)">${o.total.toLocaleString('ru-KZ')} ₸</span>
 </div>
 </div>`).join('')}
 </div>
 </div>`;
}
function profileSection(section) {
 document.querySelectorAll('[id^="psec-"]').forEach(a=>a.classList.remove('active'));
 document.getElementById('psec-'+section)?.classList.add('active');
 const content = document.getElementById('profileSection');
 if (!content) return;
 if (section === 'orders') {
const myOrders = isAdmin() ? orders : orders.filter(o => o.userEmail === currentUser.email || o.email === currentUser.email || (!o.userEmail && !o.email && o.name === currentUser.name));
 content.innerHTML = `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px"><h2>История заказов</h2><span style="color:var(--text2);font-size:0.88rem">${myOrders.length} заказов</span></div>
 ${myOrders.length===0?`<div style="text-align:center;padding:60px;background:var(--bg3);border-radius:16px"><i class="fas fa-receipt" style="font-size:2.5rem;color:var(--text3);display:block;margin-bottom:16px"></i><p style="color:var(--text2)">Заказов пока нет</p><button class="btn btn-primary" style="margin-top:16px" onclick="navigate('catalog')">Перейти в каталог</button></div>`:
 myOrders.map(o=>`<div class="order-card"><div class="order-header"><div><div class="order-id">${o.id}</div><div class="order-date">${o.date}</div></div><span class="order-status status-${o.status}">${o.status==='processing'?'В обработке':o.status==='shipped'?'Отправлен':'Доставлен'}</span></div><div style="margin-top:12px;display:flex;justify-content:space-between"><span style="color:var(--text2);font-size:0.88rem">${o.items.length} товаров</span><span style="font-weight:700;color:var(--accent)">${o.total.toLocaleString('ru-KZ')} ₸</span></div></div>`).join('')}`;
 } else if (section === 'wishlist') {
 const items = PRODUCTS.filter(p=>wishlist.includes(p.id));
 content.innerHTML = `<h2 style="margin-bottom:20px">Избранное <span style="color:var(--text3);font-size:1rem">(${items.length})</span></h2>
 ${items.length ? `<div class="wishlist-grid">${items.map(p=>productCard(p)).join('')}</div>` : `<div style="text-align:center;padding:60px;background:var(--bg3);border-radius:16px"><i class="fas fa-heart" style="font-size:2.5rem;color:var(--text3);display:block;margin-bottom:16px"></i><p style="color:var(--text2)">Нет сохранённых товаров</p></div>`}`;
 } else if (section === 'compare') {
 renderCompareSection(content);
 } else if (section === 'settings') {
 content.innerHTML = `<h2 style="margin-bottom:24px">Настройки профиля</h2>
 <div style="max-width:480px">
 <div class="form-group"><label class="form-label">Имя</label><input class="form-input" id="set-name" value="${currentUser.name}"></div>
 <div class="form-group"><label class="form-label">Email</label><input class="form-input" value="${currentUser.email}" type="email" disabled style="opacity:0.6"></div>
 <div class="form-group"><label class="form-label">Телефон</label><input class="form-input" id="set-phone" value="${currentUser.phone||''}" placeholder="+7 (900) 000-00-00"></div>
 <div class="form-group"><label class="form-label">Текущий пароль</label><input class="form-input" type="password" placeholder="••••••••"></div>
 <div class="form-group"><label class="form-label">Новый пароль</label><input class="form-input" type="password" placeholder="Минимум 6 символов"></div>
 <button class="btn btn-primary" style="margin-top:8px" onclick="saveProfileSettings()"><i class="fas fa-save"></i> Сохранить изменения</button>
 </div>`;
 }
}
function saveProfileSettings() {
 const name = document.getElementById('set-name')?.value;
 const phone = document.getElementById('set-phone')?.value;
 if (!name) { showNotif('Введите имя', 'error'); return; }
 currentUser.name = name;
 currentUser.phone = phone;
 localStorage.setItem('tkoboi_user', JSON.stringify(currentUser));
 showNotif('Профиль обновлён!', 'success');
 renderProfile();
}
function renderCompareSection(content) {
 const items = PRODUCTS.filter(p=>compareList.includes(p.id));
 if (!items.length) {
 content.innerHTML = `<h2 style="margin-bottom:20px">Сравнение товаров</h2>
 <div style="text-align:center;padding:60px;background:var(--bg3);border-radius:16px">
 <i class="fas fa-balance-scale" style="font-size:2.5rem;color:var(--text3);display:block;margin-bottom:16px"></i>
 <p style="color:var(--text2)">Нет товаров для сравнения</p>
 <p style="color:var(--text3);font-size:0.85rem;margin-top:8px">Добавляйте товары через кнопку ⚖ на карточке</p>
 </div>`;
 return;
 }
 const allKeys = [...new Set(items.flatMap(p=>p.specs.map(s=>s[0])))];
 content.innerHTML = `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
 <h2>Сравнение товаров <span style="color:var(--text3);font-size:1rem">(${items.length})</span></h2>
 <button onclick="compareList=[];localStorage.setItem('tkoboi_compare',JSON.stringify(compareList));updateCompareBadge();profileSection('compare')" style="color:var(--danger);background:none;font-size:0.88rem"><i class="fas fa-trash"></i> Очистить</button>
 </div>
 <div style="overflow-x:auto">
 <table style="width:100%;border-collapse:collapse;min-width:600px">
 <thead>
 <tr>
 <th style="padding:12px;text-align:left;color:var(--text3);font-size:0.75rem;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid var(--border)">Характеристика</th>
 ${items.map(p=>`<th style="padding:12px;text-align:center;border-bottom:1px solid var(--border)">
 <img src="${p.img}" style="width:60px;height:60px;border-radius:8px;object-fit:cover;display:block;margin:0 auto 8px" loading="lazy">
 <div style="font-size:0.82rem;font-weight:600">${p.name}</div>
 <div style="color:var(--accent);font-weight:700;margin-top:4px">${p.price.toLocaleString('ru-KZ')} ₸</div>
 <button onclick="removeFromCompare(${p.id})" style="color:var(--text3);background:none;font-size:0.75rem;margin-top:4px"><i class="fas fa-times"></i></button>
 </th>`).join('')}
 </tr>
 </thead>
 <tbody>
 ${allKeys.map((key,i)=>`<tr style="background:${i%2===0?'transparent':'rgba(255,255,255,0.02)'}">
 <td style="padding:10px 12px;color:var(--text3);font-size:0.85rem;border-bottom:1px solid rgba(255,255,255,0.04)">${key}</td>
 ${items.map(p=>{
 const spec = p.specs.find(s=>s[0]===key);
 return `<td style="padding:10px 12px;text-align:center;font-size:0.85rem;border-bottom:1px solid rgba(255,255,255,0.04)">${spec?spec[1]:'—'}</td>`;
 }).join('')}
 </tr>`).join('')}
 </tbody>
 </table>
 </div>`;
}
function addToCompare(id) {
 if (compareList.includes(id)) { showNotif('Уже добавлен в сравнение', 'info'); return; }
 if (compareList.length >= 4) { showNotif('Максимум 4 товара для сравнения', 'error'); return; }
 compareList.push(id);
 localStorage.setItem('tkoboi_compare', JSON.stringify(compareList));
 updateCompareBadge();
 showNotif('Добавлен в сравнение!', 'success');
}
function removeFromCompare(id) {
 compareList = compareList.filter(i=>i!==id);
 localStorage.setItem('tkoboi_compare', JSON.stringify(compareList));
 updateCompareBadge();
 profileSection('compare');
}
function updateCompareBadge() {
}
function renderAuth(mode) {
 const content = document.getElementById('profileContent');
 if (mode === 'login') {
 content.innerHTML = `<div class="auth-container">
 <div class="auth-card fade-in">
 <div class="auth-logo">🌿 Тканевые обои</div>
 <h2 class="auth-title">С возвращением!</h2>
 <p class="auth-sub">Войдите в свой аккаунт</p>
 <div class="form-group"><label class="form-label">Email</label><input class="form-input" id="loginEmail" placeholder="ivan@example.com" type="email" onkeydown="if(event.key==='Enter')doLogin()"></div>
 <div class="form-group" style="position:relative">
 <label class="form-label">Пароль</label>
 <input class="form-input" id="loginPassword" placeholder="••••••••" type="password" onkeydown="if(event.key==='Enter')doLogin()">
 <button onclick="togglePassVis('loginPassword')" style="position:absolute;right:12px;bottom:10px;background:none;color:var(--text3);font-size:0.9rem"><i class="fas fa-eye" id="eyeLogin"></i></button>
 </div>
 <div style="text-align:right;margin-bottom:16px"><a style="color:var(--accent);font-size:0.85rem;cursor:pointer">Забыли пароль?</a></div>
 <button class="btn btn-primary" style="width:100%" onclick="doLogin()"><i class="fas fa-sign-in-alt"></i> Войти</button>
 <div class="auth-switch">Нет аккаунта? <a onclick="renderAuth('register')">Зарегистрироваться</a></div>
 </div>
 </div>`;
 } else {
 content.innerHTML = `<div class="auth-container">
 <div class="auth-card fade-in">
 <div class="auth-logo">🌿 Тканевые обои</div>
 <h2 class="auth-title">Создать аккаунт</h2>
 <p class="auth-sub">Присоединяйтесь к нам</p>
 <div class="form-group"><label class="form-label">Имя</label><input class="form-input" id="regName" placeholder="Иван Иванов"></div>
 <div class="form-group"><label class="form-label">Email</label><input class="form-input" id="regEmail" placeholder="ivan@example.com" type="email"></div>
 <div class="form-group" style="position:relative">
 <label class="form-label">Пароль</label>
 <input class="form-input" id="regPassword" placeholder="Минимум 6 символов" type="password">
 <button onclick="togglePassVis('regPassword')" style="position:absolute;right:12px;bottom:10px;background:none;color:var(--text3);font-size:0.9rem"><i class="fas fa-eye"></i></button>
 </div>
 <div class="form-group"><label class="form-label">Телефон</label><input class="form-input" id="regPhone" placeholder="+7 (900) 000-00-00" type="tel"></div>
 <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:16px">
 <input type="checkbox" id="regAgree" style="margin-top:3px;accent-color:var(--accent)">
 <label for="regAgree" style="font-size:0.82rem;color:var(--text2);cursor:pointer">Согласен с <a style="color:var(--accent)">условиями использования</a> и <a style="color:var(--accent)">политикой конфиденциальности</a></label>
 </div>
 <button class="btn btn-primary" style="width:100%" onclick="doRegister()"><i class="fas fa-user-plus"></i> Зарегистрироваться</button>
 <div class="auth-switch">Уже есть аккаунт? <a onclick="renderAuth('login')">Войти</a></div>
 </div>
 </div>`;
 }
}
function togglePassVis(id) {
 const el = document.getElementById(id);
 if (!el) return;
 el.type = el.type === 'password' ? 'text' : 'password';
}
function doLogin() {
 const email = document.getElementById('loginEmail')?.value?.trim().toLowerCase();
 const pass  = document.getElementById('loginPassword')?.value;
 if (!email || !pass) { showNotif('Заполните все поля', 'error'); return; }
 if (!email.includes('@')) { showNotif('Введите корректный email', 'error'); return; }
 const found = users.find(u => u.email === email && (u.password === pass || u._ph === btoa(pass)));
 if (!found) { showNotif('Неверный email или пароль', 'error'); return; }
 currentUser = { name: found.name, email: found.email, role: found.role || 'user', phone: found.phone || '' };
 localStorage.setItem('tkoboi_user', JSON.stringify(currentUser));
 showNotif(`Добро пожаловать, ${currentUser.name}!`, 'success');
 updateNavForRole();
 renderProfile();
 // Redirect staff to admin panel
 if (canAccessAdmin()) setTimeout(() => navigate('admin'), 300);
}
function doRegister() {
 const name  = document.getElementById('regName')?.value?.trim();
 const email = document.getElementById('regEmail')?.value?.trim().toLowerCase();
 const pass  = document.getElementById('regPassword')?.value;
 const phone = document.getElementById('regPhone')?.value?.trim();
 const agree = document.getElementById('regAgree')?.checked;
 if (!name || !email || !pass) { showNotif('Заполните обязательные поля', 'error'); return; }
 if (!email.includes('@') || !email.includes('.')) { showNotif('Введите корректный email', 'error'); return; }
 if (pass.length < 6) { showNotif('Пароль минимум 6 символов', 'error'); return; }
 if (!agree) { showNotif('Примите условия использования', 'error'); return; }
 if (users.find(u=>u.email===email)) { showNotif('Такой email уже зарегистрирован', 'error'); return; }
 const newUser = { name, email, password: pass, phone, role: 'user' };
 users.push(newUser);
 localStorage.setItem('tkoboi_users', JSON.stringify(users));
 currentUser = { name, email, role: 'user', phone };
 localStorage.setItem('tkoboi_user', JSON.stringify(currentUser));
 showNotif('Аккаунт создан! Добро пожаловать, ' + name + '!', 'success');
 updateNavForRole();
 renderProfile();
}
function quickLogin(role) {
 if (role === 'admin') {
 currentUser = { name: 'Администратор', email: 'admin@tkoboi.kz', role: 'admin' };
 } else {
 currentUser = { name: 'Иван Иванов', email: 'ivan@example.com', role: 'user', phone: '+7 900 123-45-67' };
 }
 localStorage.setItem('tkoboi_user', JSON.stringify(currentUser));
 showNotif('Вход выполнен как ' + currentUser.name, 'success');
 updateNavForRole();
 renderProfile();
}
function logout() {
 currentUser = null;
 localStorage.removeItem('tkoboi_user');
 showNotif('Вы вышли из аккаунта', 'info');
 updateNavForRole();
 renderAuth('login');
}
function isAdmin() {
 return currentUser && ['superadmin','admin'].includes(currentUser.role);
}
function updateNavForRole() {
 const adminMenu = document.getElementById('menu-admin');
 const show = canAccessAdmin();
 if (adminMenu) { adminMenu.style.display = show ? 'inline-block' : 'none'; adminMenu.setAttribute('aria-hidden', String(!show)); }
}
let adminTab_current = 'dashboard';
const _adminLock = { attempts: 0, lockedUntil: 0 };
function _checkAdminLock() {
 if (_adminLock.lockedUntil > Date.now()) {
 const secs = Math.ceil((_adminLock.lockedUntil - Date.now()) / 1000);
 showNotif(`Слишком много попыток. Подождите ${secs} сек.`, 'error');
 return false;
 }
 return true;
}
function _recordAdminFail() {
 _adminLock.attempts++;
 if (_adminLock.attempts >= 5) {
 _adminLock.lockedUntil = Date.now() + 30000;
 _adminLock.attempts = 0;
 showNotif('Аккаунт заблокирован на 30 секунд после 5 неудачных попыток.', 'error');
 }
}
function renderAdmin() {
 if (!canAccessAdmin()) {
 const main = document.getElementById('adminMain');
 if (!main) return;
 const sidebar = document.querySelector('.admin-sidebar');
 if (sidebar) sidebar.style.display = 'none';
 main.style.padding = '0';
 main.innerHTML = `<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:var(--bg);padding:40px">
 <div style="background:var(--card);border:1px solid var(--border);border-radius:24px;padding:48px;max-width:420px;width:100%;text-align:center">
 <div style="width:72px;height:72px;border-radius:20px;background:rgba(231,76,60,0.12);border:1px solid rgba(231,76,60,0.3);display:flex;align-items:center;justify-content:center;margin:0 auto 20px;font-size:2rem;color:var(--danger)">
 <i class="fas fa-shield-alt"></i>
 </div>
 <h2 style="font-size:1.5rem;margin-bottom:8px">Панель администратора</h2>
 <p style="color:var(--text2);margin-bottom:28px;line-height:1.6">Введите ваши данные администратора для входа.</p>
 <div style="text-align:left;margin-bottom:16px">
 <div class="form-group" style="margin-bottom:12px">
 <label class="form-label">Email</label>
 <input class="form-input" id="adminLoginEmail" type="email" placeholder="admin@tkoboi.kz" autocomplete="username">
 </div>
 <div class="form-group" style="margin-bottom:12px">
 <label class="form-label">Пароль</label>
 <div style="position:relative">
 <input class="form-input" id="adminLoginPass" type="password" placeholder="••••••••" autocomplete="current-password" onkeydown="if(event.key==='Enter')_adminLoginSubmit()" style="padding-right:44px">
 <button type="button" onclick="const i=document.getElementById('adminLoginPass');i.type=i.type==='password'?'text':'password'" style="position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;color:var(--text3);font-size:0.9rem"><i class="fas fa-eye"></i></button>
 </div>
 </div>
 </div>
 <button class="btn btn-primary" style="width:100%;margin-bottom:12px" onclick="_adminLoginSubmit()"><i class="fas fa-sign-in-alt"></i> Войти</button>
 <button class="btn btn-outline" style="width:100%" onclick="navigate('home')"><i class="fas fa-home"></i> На главную</button>
 </div>
 </div>`;
 return;
 }
 const sidebar = document.querySelector('.admin-sidebar');
 if (sidebar) {
   sidebar.style.display = '';
   // Hide restricted nav items for worker
   const restricted = ['adm-products','adm-customers','adm-settings'];
   restricted.forEach(id => {
     const link = document.getElementById(id);
     if (link) link.style.display = isWorker() ? 'none' : '';
   });
   // Set role badge
   const roleLabel = document.getElementById('adminRoleLabel');
   if (roleLabel && currentUser) {
     const roleMap = { superadmin: '👑 Супер Админ', admin: '🛡️ Администратор', worker: '👷 Работник' };
     roleLabel.textContent = roleMap[currentUser.role] || currentUser.role;
     roleLabel.style.color = currentUser.role === 'superadmin' ? 'var(--gold)' : currentUser.role === 'worker' ? 'var(--accent3)' : 'var(--accent)';
   }
 }
 const main = document.getElementById('adminMain');
 if (main) main.style.padding = '32px';
 adminTab('dashboard');
}
let adminProductSearch = '';
let adminProductCatFilter = '';
let adminProductStockFilter = '';
function _adminLoginSubmit() {
 if (!_checkAdminLock()) return;
 const emailEl = document.getElementById('adminLoginEmail');
 const passEl = document.getElementById('adminLoginPass');
 if (!emailEl || !passEl) return;
 const email = emailEl.value.trim().toLowerCase();
 const pass = passEl.value;
 const found = users.find(u => u.email === email && (u.password === pass || u._ph === btoa(pass)) && ['superadmin','admin','worker'].includes(u.role));
 if (found) {
 currentUser = found;
 localStorage.setItem('tkoboi_user', JSON.stringify(currentUser));
 updateNavForRole();
 showNotif('Добро пожаловать, ' + sanitize(found.name) + '!', 'success');
 renderAdmin();
 } else {
 _recordAdminFail();
 showNotif('Неверный email или пароль', 'error');
 }
}
function adminTab(tab) {
 // Worker restrictions
 const workerAllowed = ['dashboard','orders'];
 if (isWorker() && !workerAllowed.includes(tab)) {
   showNotif('У вас нет доступа к этому разделу', 'error'); return;
 }
 adminTab_current = tab;
 document.querySelectorAll('.admin-nav a[id^="adm-"]').forEach(a => a.classList.remove('active'));
 const el = document.getElementById('adm-' + tab);
 if (el) el.classList.add('active');
 // Update sidebar role badge
 const roleLabel = document.getElementById('adminRoleLabel');
 if (roleLabel && currentUser) {
   const roleMap = { superadmin: '👑 Супер Админ', admin: '🛡️ Администратор', worker: '👷 Работник' };
   roleLabel.textContent = roleMap[currentUser.role] || currentUser.role;
 }
 const main = document.getElementById('adminMain');
 if (!main) return;
 if (tab === 'dashboard') {
 const totalRevenue = orders.reduce((s, o) => s + o.total, 0);
 const avgOrder = orders.length ? Math.round(totalRevenue / orders.length) : 0;
 const processing = orders.filter(o => o.status === 'processing').length;
 const topProds = [...adminProducts].sort((a, b) => b.reviews - a.reviews).slice(0, 5);
 const months = ['Янв','Фев','Мар','Апр','Май','Июн','Июл'];
 const revenue = [42000,58000,71000,63000,89000,102000, totalRevenue || 95000];
 const maxRev = Math.max(...revenue);
 const catColors = ['#6c63ff','#ff6584','#43e8b0','#ffd700','#f39c12','#e74c3c','#3498db','#2ecc71'];
 const catCounts = {};
 adminProducts.forEach(p => { catCounts[p.catName] = (catCounts[p.catName] || 0) + 1; });
 main.innerHTML = `
 <div class="admin-header">
 <h2>Дашборд</h2>
 <span style="color:var(--text2);font-size:0.85rem"><i class="fas fa-calendar" style="margin-right:6px;color:var(--accent)"></i>${new Date().toLocaleDateString('kk-KZ',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</span>
 </div>
 <div class="stat-cards" style="margin-bottom:24px">
 <div class="stat-card">
 <div class="stat-card-icon" style="background:rgba(108,99,255,0.15);color:var(--accent)"><i class="fas fa-receipt"></i></div>
 <div class="stat-card-num">${orders.length}</div>
 <div class="stat-card-label">Заказов всего</div>
 <div class="stat-card-change" style="color:${processing>0?'var(--gold)':'var(--success)'}">
 ${processing > 0 ? '<i class="fas fa-clock"></i> ' + processing + ' в обработке' : '<i class="fas fa-check"></i> Все обработаны'}
 </div>
 </div>
 <div class="stat-card">
 <div class="stat-card-icon" style="background:rgba(67,232,176,0.15);color:var(--accent3)"><i class="fas fa-ruble-sign"></i></div>
 <div class="stat-card-num">${totalRevenue >= 1000 ? (totalRevenue/1000).toFixed(0)+'K' : totalRevenue}</div>
 <div class="stat-card-label">Выручка (₸)</div>
 <div class="stat-card-change">Ср. чек ${avgOrder.toLocaleString('ru-KZ')} ₸</div>
 </div>
 <div class="stat-card">
 <div class="stat-card-icon" style="background:rgba(255,101,132,0.15);color:var(--accent2)"><i class="fas fa-users"></i></div>
 <div class="stat-card-num">${users.length}</div>
 <div class="stat-card-label">Пользователей</div>
 <div class="stat-card-change">${users.filter(u=>u.role==='admin').length} admin, ${users.filter(u=>u.role!=='admin').length} users</div>
 </div>
 <div class="stat-card">
 <div class="stat-card-icon" style="background:rgba(255,215,0,0.15);color:var(--gold)"><i class="fas fa-box"></i></div>
 <div class="stat-card-num">${adminProducts.length}</div>
 <div class="stat-card-label">Товаров</div>
 <div class="stat-card-change" style="color:${adminProducts.filter(p=>!p.inStock).length>0?'var(--danger)':'var(--success)'}">
 ${adminProducts.filter(p=>!p.inStock).length > 0 ? adminProducts.filter(p=>!p.inStock).length + ' нет в наличии' : 'Все в наличии'}
 </div>
 </div>
 </div>
 <div style="display:grid;grid-template-columns:1fr 260px;gap:20px;margin-bottom:20px">
 <div class="admin-table-wrap" style="padding:20px">
 <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
 <h3 style="font-size:0.95rem">Выручка по месяцам</h3>
 <span style="font-size:0.75rem;color:var(--text3)">2025</span>
 </div>
 <div style="display:flex;align-items:flex-end;gap:6px;height:130px">
 ${months.map((m,i) => `<div style="display:flex;flex-direction:column;align-items:center;gap:4px;flex:1">
 <div style="font-size:0.6rem;color:var(--text3)">${revenue[i]>=1000?(revenue[i]/1000).toFixed(0)+'k':revenue[i]}</div>
 <div style="width:100%;border-radius:4px 4px 0 0;background:linear-gradient(180deg,var(--accent),rgba(108,99,255,0.3));height:${Math.round(revenue[i]/maxRev*100)}px;min-height:4px"></div>
 <div style="font-size:0.62rem;color:var(--text3)">${m}</div>
 </div>`).join('')}
 </div>
 </div>
 <div class="admin-table-wrap" style="padding:20px">
 <h3 style="font-size:0.95rem;margin-bottom:14px">По категориям</h3>
 ${Object.entries(catCounts).map(([k,v],i) => `<div style="display:flex;align-items:center;justify-content:space-between;padding:7px 0;border-bottom:1px solid rgba(255,255,255,0.04)">
 <div style="display:flex;align-items:center;gap:8px">
 <div style="width:8px;height:8px;border-radius:50%;background:${catColors[i%catColors.length]}"></div>
 <span style="font-size:0.82rem">${k}</span>
 </div>
 <span style="font-weight:700;font-size:0.82rem">${v}</span>
 </div>`).join('')}
 </div>
 </div>
 <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
 <div class="admin-table-wrap">
 <div style="padding:16px 20px 0;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center">
 <h3 style="font-size:0.9rem">Последние заказы</h3>
 <button onclick="adminTab('orders')" style="background:none;color:var(--accent);font-size:0.78rem;cursor:pointer">Все →</button>
 </div>
 <table class="admin-table">
 <thead><tr><th>ID</th><th>Клиент</th><th>Сумма</th><th>Статус</th></tr></thead>
 <tbody>${orders.slice(0,5).map(o=>`<tr>
 <td style="font-weight:700;font-size:0.8rem">${o.id}</td>
 <td style="font-size:0.82rem">${o.name||'Гость'}</td>
 <td style="color:var(--accent);font-weight:700;font-size:0.82rem">${o.total.toLocaleString('ru-KZ')} ₸</td>
 <td><span class="order-status status-${o.status}" style="font-size:0.65rem">${o.status==='processing'?'Обработка':o.status==='shipped'?'Отправлен':'Доставлен'}</span></td>
 </tr>`).join('')||'<tr><td colspan="4" style="text-align:center;color:var(--text3);padding:20px;font-size:0.82rem">Нет заказов</td></tr>'}
 </tbody>
 </table>
 </div>
 <div class="admin-table-wrap">
 <div style="padding:16px 20px 0;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center">
 <h3 style="font-size:0.9rem">Топ товаров</h3>
 <button onclick="adminTab('products')" style="background:none;color:var(--accent);font-size:0.78rem;cursor:pointer">Все →</button>
 </div>
 <table class="admin-table">
 <thead><tr><th>Товар</th><th>Отзывов</th><th>Рейтинг</th></tr></thead>
 <tbody>${topProds.map(p=>`<tr>
 <td><div style="display:flex;align-items:center;gap:8px">
 <img loading="lazy" src="${p.img}" style="width:30px;height:30px;border-radius:6px;object-fit:cover" onerror="this.style.opacity=0.3">
 <span style="font-size:0.8rem;font-weight:600">${p.name.length>16?p.name.slice(0,16)+'…':p.name}</span>
 </div></td>
 <td style="font-size:0.82rem;color:var(--text2)">${p.reviews}</td>
 <td style="color:var(--gold);font-size:0.82rem">★ ${p.rating}</td>
 </tr>`).join('')}
 </tbody>
 </table>
 </div>
 </div>`;
 }
 else if (tab === 'products') {
 main.innerHTML = `
 <div class="admin-header">
 <h2>Управление товарами</h2>
 <button class="btn btn-primary" onclick="openAddProduct()"><i class="fas fa-plus"></i> Добавить товар</button>
 </div>
 <div style="display:flex;gap:12px;margin-bottom:20px;flex-wrap:wrap">
 <div style="position:relative;flex:1;min-width:180px">
 <i class="fas fa-search" style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--text3);font-size:0.82rem"></i>
 <input class="form-input" placeholder="Поиск..." style="padding-left:36px;font-size:0.88rem" oninput="adminProductSearch=this.value;renderAdminProducts()">
 </div>
 <select class="sort-select" style="font-size:0.85rem" onchange="adminProductCatFilter=this.value;renderAdminProducts()">
 <option value="">Все категории</option>
 ${CATEGORIES.map(c=>`<option value="${c.id}">${c.name}</option>`).join('')}
 </select>
 <select class="sort-select" style="font-size:0.85rem" onchange="adminProductStockFilter=this.value;renderAdminProducts()">
 <option value="">Любой статус</option>
 <option value="in">В наличии</option>
 <option value="out">Нет в наличии</option>
 </select>
 </div>
 <div class="admin-table-wrap">
 <table class="admin-table">
 <thead><tr><th>Товар</th><th>Категория</th><th>Цена</th><th>Скидка</th><th>Статус</th><th>Рейтинг</th><th>Действия</th></tr></thead>
 <tbody id="adminProductsTable"></tbody>
 </table>
 <div style="padding:10px 20px;color:var(--text3);font-size:0.78rem" id="adminProdCount"></div>
 </div>`;
 renderAdminProducts();
 }
 else if (tab === 'orders') {
 const renderOBody = (status) => {
 const list = status === 'all' ? orders : orders.filter(o => o.status === status);
 return list.map(o => `<tr>
 <td style="font-weight:700;font-size:0.85rem">${o.id}</td>
 <td>
 <div style="font-weight:600;font-size:0.88rem">${o.name||'Гость'}</div>
 ${o.phone?'<div style="font-size:0.72rem;color:var(--text3)">'+o.phone+'</div>':''}
 </td>
 <td style="color:var(--text2);font-size:0.82rem">${o.date}</td>
 <td style="font-size:0.78rem;color:var(--text2)">${o.deliveryType==='courier'?'🚚 Курьер':o.deliveryType==='post'?'📮 Kaspi доставка':'🏪 Самовывоз'}</td>
 <td style="color:var(--accent);font-weight:700">${o.total.toLocaleString('ru-KZ')} ₸</td>
 <td>
 <select onchange="setOrderStatus('${o.id}',this.value)" style="background:var(--bg3);border:1px solid var(--border);border-radius:8px;color:var(--text);padding:4px 8px;font-size:0.75rem;cursor:pointer">
 <option value="processing" ${o.status==='processing'?'selected':''}>В обработке</option>
 <option value="shipped" ${o.status==='shipped'?'selected':''}>Отправлен</option>
 <option value="delivered" ${o.status==='delivered'?'selected':''}>Доставлен</option>
 </select>
 </td>
 <td>
 <button class="btn-icon btn-edit" onclick="viewOrderDetails('${o.id}')" title="Детали"><i class="fas fa-eye"></i></button>
 ${!isWorker() ? `<button class="btn-icon btn-del" style="margin-left:4px" onclick="deleteOrder('${o.id}');adminTab('orders')" title="Удалить"><i class="fas fa-trash"></i></button>` : ''}
 </td>
 </tr>`).join('') || '<tr><td colspan="7" style="text-align:center;color:var(--text3);padding:30px">Нет заказов</td></tr>';
 };
 window.renderOBody = renderOBody;
 const tabs = [{k:'all',l:'Все'},{k:'processing',l:'Обработка'},{k:'shipped',l:'В пути'},{k:'delivered',l:'Доставлены'}];
 main.innerHTML = `
 <div class="admin-header">
 <h2>Управление заказами ${isWorker()?'<span style="background:rgba(67,232,176,0.12);color:var(--accent3);padding:3px 10px;border-radius:50px;font-size:0.72rem;font-weight:700;margin-left:8px">👷 Режим работника</span>':''}</h2>
 <div style="display:flex;gap:8px;flex-wrap:wrap">
 ${tabs.map(t=>`<button onclick="document.querySelectorAll('.ord-tab').forEach(b=>{b.style.background='var(--bg3)';b.style.color='var(--text2)';b.style.borderColor='var(--border)'});this.style.background='var(--accent)';this.style.color='#fff';this.style.borderColor='var(--accent)';document.getElementById('orderBody').innerHTML=renderOBody('${t.k}')" class="ord-tab" style="padding:6px 14px;border-radius:8px;font-size:0.8rem;font-weight:600;background:${t.k==='all'?'var(--accent)':'var(--bg3)'};color:${t.k==='all'?'#fff':'var(--text2)'};border:1px solid ${t.k==='all'?'var(--accent)':'var(--border)'};cursor:pointer">
 ${t.l} (${t.k==='all'?orders.length:orders.filter(o=>o.status===t.k).length})
 </button>`).join('')}
 </div>
 </div>
 <div class="admin-table-wrap">
 <table class="admin-table">
 <thead><tr><th>ID</th><th>Клиент</th><th>Дата</th><th>Доставка</th><th>Сумма</th><th>Статус</th><th>Действия</th></tr></thead>
 <tbody id="orderBody">${renderOBody('all')}</tbody>
 </table>
 </div>`;
 }
 else if (tab === 'customers') {
 const regUsers = users.filter(u => !['superadmin'].includes(u.role));
 main.innerHTML = `
 <div class="admin-header">
 <h2>Покупатели</h2>
 <span style="color:var(--text2);font-size:0.88rem">${regUsers.filter(u=>u.role==='user').length} покупателей</span>
 </div>
 <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:24px">
 <div class="stat-card"><div class="stat-card-icon" style="background:rgba(108,99,255,0.15);color:var(--accent)"><i class="fas fa-user-check"></i></div><div class="stat-card-num">${regUsers.filter(u=>u.role==='user').length}</div><div class="stat-card-label">Зарегистрировано</div></div>
 <div class="stat-card"><div class="stat-card-icon" style="background:rgba(67,232,176,0.15);color:var(--accent3)"><i class="fas fa-shopping-bag"></i></div><div class="stat-card-num">${[...new Set(orders.map(o=>o.userEmail||o.email).filter(Boolean))].length}</div><div class="stat-card-label">Делали заказы</div></div>
 <div class="stat-card"><div class="stat-card-icon" style="background:rgba(255,215,0,0.15);color:var(--gold)"><i class="fas fa-receipt"></i></div><div class="stat-card-num">${orders.length}</div><div class="stat-card-label">Всего заказов</div></div>
 </div>
 <div class="admin-table-wrap">
 <div style="padding:16px 20px 0;margin-bottom:12px"><h3 style="font-size:0.95rem">Все пользователи</h3></div>
 <table class="admin-table">
 <thead><tr><th>Пользователь</th><th>Email</th><th>Телефон</th><th>Роль</th><th>Заказов</th><th>Действия</th></tr></thead>
 <tbody>
 ${regUsers.length ? regUsers.map(u => {
 const uOrders = orders.filter(o => (o.userEmail||o.email) === u.email);
 const roleMap = { admin:'🛡️ Админ', worker:'👷 Работник', user:'👤 Покупатель' };
 const roleColor = { admin:'var(--accent)', worker:'var(--accent3)', user:'var(--text3)' };
 return `<tr>
 <td><div style="display:flex;align-items:center;gap:10px">
 <div style="width:32px;height:32px;border-radius:8px;background:linear-gradient(135deg,var(--accent),var(--accent2));display:flex;align-items:center;justify-content:center;font-weight:700;font-size:0.85rem;color:#fff">${(u.name||'?')[0].toUpperCase()}</div>
 <span style="font-weight:600;font-size:0.88rem">${u.name}</span>
 </div></td>
 <td style="color:var(--text2);font-size:0.85rem">${u.email}</td>
 <td style="color:var(--text2);font-size:0.85rem">${u.phone||'—'}</td>
 <td><span style="background:rgba(108,99,255,0.12);color:${roleColor[u.role]||'var(--text3)'};padding:2px 8px;border-radius:50px;font-size:0.7rem;font-weight:700">${roleMap[u.role]||u.role}</span></td>
 <td style="font-weight:600">${uOrders.length}</td>
 <td>${u.role === 'user' ? `<button class="btn-icon btn-del" onclick="deleteUser('${u.email}')" title="Удалить"><i class="fas fa-trash"></i></button>` : '<span style="color:var(--text3);font-size:0.75rem">—</span>'}</td>
 </tr>`;
 }).join('') : '<tr><td colspan="6" style="text-align:center;color:var(--text3);padding:30px">Нет пользователей</td></tr>'}
 </tbody>
 </table>
 </div>`;
 }
 else if (tab === 'promo') {
 const customPromos = JSON.parse(localStorage.getItem('tkoboi_promos') || '[]');
 main.innerHTML = `
 <div class="admin-header">
 <h2>Промокоды</h2>
 <button class="btn btn-primary" onclick="openAddPromo()"><i class="fas fa-plus"></i> Создать промокод</button>
 </div>
 <div style="margin-bottom:20px">
 <h3 style="font-size:0.88rem;color:var(--text3);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:12px">Системные промокоды</h3>
 <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px">
 ${Object.entries(PROMOS).map(([code,disc]) => `
 <div style="background:var(--card);border:1px solid var(--border);border-radius:12px;padding:18px;position:relative;overflow:hidden">
 <div style="position:absolute;right:-8px;top:-8px;font-size:3rem;opacity:0.04"><i class="fas fa-tag"></i></div>
 <div style="font-size:0.7rem;color:var(--text3);text-transform:uppercase;margin-bottom:6px">Системный</div>
 <div style="font-family:'Clash Display';font-size:1.2rem;font-weight:700;letter-spacing:1px">${code}</div>
 <div style="color:var(--success);font-weight:700;margin-top:4px">Скидка ${disc}%</div>
 </div>`).join('')}
 </div>
 </div>
 ${customPromos.length ? `
 <h3 style="font-size:0.88rem;color:var(--text3);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:12px">Пользовательские</h3>
 <div class="admin-table-wrap">
 <table class="admin-table">
 <thead><tr><th>Код</th><th>Скидка</th><th>Действует до</th><th>Использований</th><th>Действия</th></tr></thead>
 <tbody>${customPromos.map(p=>`<tr>
 <td style="font-weight:700;letter-spacing:1px;font-family:'Clash Display'">${p.code}</td>
 <td style="color:var(--success);font-weight:700">${p.discount}%</td>
 <td style="color:var(--text2);font-size:0.82rem">${p.expires||'Бессрочно'}</td>
 <td style="color:var(--text2)">${p.uses||0}</td>
 <td><button class="btn-icon btn-del" onclick="deletePromo('${p.code}')"><i class="fas fa-trash"></i></button></td>
 </tr>`).join('')}</tbody>
 </table>
 </div>` : `<div style="background:var(--card);border:1px solid var(--border);border-radius:12px;padding:32px;text-align:center;color:var(--text3)"><i class="fas fa-tag" style="font-size:2rem;display:block;margin-bottom:12px;opacity:0.3"></i>Нет пользовательских промокодов</div>`}`;
 }
 else if (tab === 'settings') {
 // Only superadmin can access full settings
 const canEditSecurity = isSuperAdmin();
 const staffList = users.filter(u => ['admin','worker'].includes(u.role));
 main.innerHTML = `
 <div class="admin-header"><h2>Настройки магазина</h2>${isSuperAdmin()?'<span style="background:rgba(255,215,0,0.15);color:var(--gold);padding:4px 12px;border-radius:50px;font-size:0.75rem;font-weight:700"><i class="fas fa-crown"></i> Супер Админ</span>':''}</div>
 <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">

 <div class="form-section">
   <div class="form-section-title"><i class="fas fa-store"></i> Основное</div>
   <div class="form-group"><label class="form-label">Название магазина</label><input class="form-input" id="set-storeName" value="${storeSettings.name}"></div>
   <div class="form-group"><label class="form-label">Email поддержки</label><input class="form-input" id="set-storeEmail" value="${storeSettings.email}" type="email"></div>
   <div class="form-group"><label class="form-label">Телефон</label><input class="form-input" id="set-storePhone" value="${storeSettings.phone}"></div>
   <button class="btn btn-primary" onclick="saveMainSettings()"><i class="fas fa-save"></i> Сохранить</button>
 </div>

 <div class="form-section">
   <div class="form-section-title"><i class="fas fa-truck"></i> Доставка</div>
   <div class="form-group"><label class="form-label">Стоимость курьера (₸)</label><input class="form-input" id="set-courier" value="${storeSettings.courierCost}" type="number" min="0"></div>
   <div class="form-group"><label class="form-label">Стоимость почты (₸)</label><input class="form-input" id="set-post" value="${storeSettings.postCost}" type="number" min="0"></div>
   <div class="form-group"><label class="form-label">Бесплатная доставка от (₸)</label><input class="form-input" id="set-free" value="${storeSettings.freeFrom}" type="number" min="0"></div>
   <button class="btn btn-primary" onclick="saveDeliverySettings()"><i class="fas fa-save"></i> Сохранить</button>
 </div>

 <div class="form-section">
   <div class="form-section-title"><i class="fas fa-shield-alt"></i> Безопасность</div>
   ${canEditSecurity ? `
   <p style="font-size:0.82rem;color:var(--text2);margin-bottom:14px">Смена пароля вашего аккаунта (${currentUser.email})</p>
   <div class="form-group"><label class="form-label">Текущий пароль</label><input class="form-input" id="sec-current" type="password" placeholder="Текущий пароль"></div>
   <div class="form-group"><label class="form-label">Новый пароль</label><input class="form-input" id="sec-new" type="password" placeholder="Минимум 6 символов"></div>
   <div class="form-group"><label class="form-label">Подтвердить пароль</label><input class="form-input" id="sec-confirm" type="password" placeholder="Повторите пароль"></div>
   <button class="btn btn-primary" onclick="changeAdminPassword()"><i class="fas fa-lock"></i> Сменить пароль</button>
   ` : `<div style="background:rgba(231,76,60,0.08);border:1px solid rgba(231,76,60,0.2);border-radius:12px;padding:16px;color:var(--text2);font-size:0.85rem"><i class="fas fa-lock" style="color:var(--danger);margin-right:8px"></i>Только Супер Администратор может менять пароли</div>`}
 </div>

 <div class="form-section">
   <div class="form-section-title"><i class="fas fa-database"></i> Данные</div>
   <p style="color:var(--text2);font-size:0.88rem;margin-bottom:16px;line-height:1.6">Экспорт и управление данными магазина</p>
   <button onclick="exportData()" style="width:100%;padding:10px;border-radius:10px;background:var(--bg3);color:var(--text);border:1px solid var(--border);margin-bottom:8px;cursor:pointer;font-size:0.85rem;font-family:'Satoshi'"><i class="fas fa-download"></i> Экспорт заказов (JSON)</button>
   ${isSuperAdmin() ? `<button onclick="if(confirm('Очистить ВСЕ заказы? Необратимо!')){orders=[];localStorage.setItem('tkoboi_orders',JSON.stringify(orders));showNotif('Все заказы удалены','info');adminTab('settings')}" style="width:100%;padding:10px;border-radius:10px;background:rgba(231,76,60,0.1);color:var(--danger);border:1px solid rgba(231,76,60,0.3);cursor:pointer;font-size:0.85rem;font-family:'Satoshi';margin-bottom:8px"><i class="fas fa-trash"></i> Очистить все заказы</button>
   <button onclick="if(confirm('Сбросить ВСЕ данные магазина? Это удалит заказы, пользователей и настройки!')){localStorage.clear();location.reload()}" style="width:100%;padding:10px;border-radius:10px;background:rgba(231,76,60,0.18);color:var(--danger);border:1px solid rgba(231,76,60,0.5);cursor:pointer;font-size:0.85rem;font-family:'Satoshi'"><i class="fas fa-exclamation-triangle"></i> Полный сброс данных</button>` : ''}
 </div>

 </div>

 ${isSuperAdmin() ? `
 <div style="margin-top:24px">
 <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
   <h3 style="font-size:1rem;font-weight:700"><i class="fas fa-users-cog" style="color:var(--accent);margin-right:8px"></i>Управление персоналом</h3>
   <button class="btn btn-primary" onclick="openAddStaff()"><i class="fas fa-user-plus"></i> Добавить сотрудника</button>
 </div>
 <div class="admin-table-wrap">
 <table class="admin-table">
 <thead><tr><th>Сотрудник</th><th>Email</th><th>Роль</th><th>Доступ</th><th>Действия</th></tr></thead>
 <tbody>
 ${staffList.length ? staffList.map(u => {
   const roleMap = { superadmin:'👑 Супер Админ', admin:'🛡️ Администратор', worker:'👷 Работник' };
   const accessMap = {
     superadmin: 'Полный доступ',
     admin: 'Товары, заказы, клиенты, промокоды',
     worker: 'Только заказы'
   };
   const roleColor = { superadmin:'var(--gold)', admin:'var(--accent)', worker:'var(--accent3)' };
   return `<tr>
   <td><div style="display:flex;align-items:center;gap:10px">
     <div style="width:34px;height:34px;border-radius:8px;background:linear-gradient(135deg,var(--accent),var(--accent2));display:flex;align-items:center;justify-content:center;font-weight:700;font-size:0.9rem;color:#fff">${(u.name||'?')[0].toUpperCase()}</div>
     <div><div style="font-weight:600;font-size:0.88rem">${u.name}</div></div>
   </div></td>
   <td style="color:var(--text2);font-size:0.85rem">${u.email}</td>
   <td><span style="background:rgba(108,99,255,0.12);color:${roleColor[u.role]||'var(--accent)'};padding:3px 10px;border-radius:50px;font-size:0.72rem;font-weight:700">${roleMap[u.role]||u.role}</span></td>
   <td style="color:var(--text3);font-size:0.8rem">${accessMap[u.role]||'—'}</td>
   <td>
     ${u.email !== currentUser.email && u.role !== 'superadmin' ? `
     <button class="btn-icon btn-edit" onclick="openEditStaff('${u.email}')" title="Изменить роль" style="margin-right:4px"><i class="fas fa-edit"></i></button>
     <button class="btn-icon btn-del" onclick="deleteStaff('${u.email}')" title="Удалить"><i class="fas fa-trash"></i></button>
     ` : '<span style="color:var(--text3);font-size:0.75rem">—</span>'}
   </td>
   </tr>`;
 }).join('') : '<tr><td colspan="5" style="text-align:center;color:var(--text3);padding:30px">Нет сотрудников</td></tr>'}
 </tbody>
 </table>
 </div>
 </div>` : ''}
 `;
 }
}
function renderAdminProducts() {
 const tbody = document.getElementById('adminProductsTable');
 const countEl = document.getElementById('adminProdCount');
 if (!tbody) return;
 let list = [...adminProducts];
 if (adminProductSearch) list = list.filter(p => p.name.toLowerCase().includes(adminProductSearch.toLowerCase()) || p.catName.toLowerCase().includes(adminProductSearch.toLowerCase()));
 if (adminProductCatFilter) list = list.filter(p => p.cat === adminProductCatFilter);
 if (adminProductStockFilter === 'in') list = list.filter(p => p.inStock);
 if (adminProductStockFilter === 'out') list = list.filter(p => !p.inStock);
 tbody.innerHTML = list.map(p => `<tr>
 <td>
 <div class="table-product">
 <img loading="lazy" class="table-img" src="${p.img}" alt="${p.name}" onerror="this.style.opacity=0.3">
 <div>
 <div class="table-name">${p.name}</div>
 <div class="table-sku">ID: ${p.id} · ${p.colors?.length ? p.colors.length + ' цветов' : ''}</div>
 </div>
 </div>
 </td>
 <td style="color:var(--text2);font-size:0.85rem">${p.catName}</td>
 <td style="font-weight:700;color:var(--accent)">${p.price.toLocaleString('ru-KZ')} ₸</td>
 <td style="font-size:0.82rem">${p.oldPrice ? '<span style="color:var(--accent2)">−' + Math.round((1-p.price/p.oldPrice)*100) + '%</span>' : '<span style="color:var(--text3)">—</span>'}</td>
 <td>${p.inStock ? '<span style="color:var(--success);font-size:0.82rem">✓ В наличии</span>' : '<span style="color:var(--danger);font-size:0.82rem">✗ Нет</span>'}</td>
 <td style="color:var(--gold);font-size:0.85rem">★ ${p.rating}</td>
 <td>
 <button class="btn-icon btn-edit" onclick="editProduct(${p.id})" title="Редактировать"><i class="fas fa-edit"></i></button>
 <button class="btn-icon" onclick="toggleStock(${p.id})" title="${p.inStock?'Снять с продажи':'Выставить в наличие'}" style="background:rgba(255,215,0,0.1);color:var(--gold);margin-left:4px"><i class="fas fa-${p.inStock?'eye-slash':'eye'}"></i></button>
 <button class="btn-icon btn-del" onclick="deleteProduct(${p.id})" title="Удалить" style="margin-left:4px"><i class="fas fa-trash"></i></button>
 </td>
 </tr>`).join('') || '<tr><td colspan="7" style="text-align:center;color:var(--text3);padding:30px">Нет товаров</td></tr>';
 if (countEl) countEl.textContent = `Показано ${list.length} из ${adminProducts.length} товаров`;
}
function toggleStock(id) {
 const p = adminProducts.find(x => x.id === id);
 if (p) { p.inStock = !p.inStock; renderAdminProducts(); showNotif(p.inStock ? 'Товар в наличии' : 'Товар снят с продажи', 'info'); }
}
function openAddProduct() {
 editingProductId = null;
 showModal(`
 <h2 style="margin-bottom:20px"><i class="fas fa-plus" style="color:var(--accent);margin-right:8px"></i>Добавить товар</h2>
 <div class="form-group"><label class="form-label">Название *</label><input class="form-input" id="ap-name" placeholder="Название товара"></div>
 <div class="form-grid">
 <div class="form-group"><label class="form-label">Цена (₸) *</label><input class="form-input" id="ap-price" placeholder="0" type="number" min="0"></div>
 <div class="form-group"><label class="form-label">Старая цена (₸)</label><input class="form-input" id="ap-oldprice" placeholder="Необязательно" type="number" min="0"></div>
 </div>
 <div class="form-grid">
 <div class="form-group"><label class="form-label">Категория *</label>
 <select class="form-input" id="ap-cat">${CATEGORIES.map(c=>`<option value="${c.id}">${c.name}</option>`).join('')}</select>
 </div>
 <div class="form-group"><label class="form-label">Бейдж</label>
 <select class="form-input" id="ap-badge">
 <option value="">Нет</option>
 <option value="new">Новинка</option>
 <option value="sale">Скидка</option>
 <option value="hot">Хит</option>
 </select>
 </div>
 </div>
 <div class="form-group"><label class="form-label">Описание</label><textarea class="form-input" id="ap-desc" rows="3" placeholder="Описание товара..."></textarea></div>
 <div class="form-group">
   <label class="form-label">Фото товара</label>
   <div id="ap-img-dropzone" onclick="document.getElementById('ap-img-file').click()" style="border:2px dashed var(--border);border-radius:12px;padding:20px;text-align:center;cursor:pointer;transition:var(--transition);background:var(--bg3);position:relative;min-height:120px;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:8px" onmouseover="this.style.borderColor='var(--accent)'" onmouseout="this.style.borderColor='var(--border)'">
     <i class="fas fa-cloud-upload-alt" style="font-size:2rem;color:var(--text3)"></i>
     <span style="color:var(--text2);font-size:0.88rem">Нажмите или перетащите фото</span>
     <span style="color:var(--text3);font-size:0.75rem">JPG, PNG, WEBP · до 5 МБ</span>
   </div>
   <input type="file" id="ap-img-file" accept="image/*" style="display:none" onchange="handleProductImageUpload(this, 'ap-img-preview', 'ap-img-dropzone', 'ap-img-data')">
   <div id="ap-img-preview" style="display:none;margin-top:10px;position:relative">
     <img id="ap-img-preview-img" style="width:100%;max-height:180px;object-fit:cover;border-radius:10px;border:1px solid var(--border)">
     <button onclick="clearProductImage('ap-img-preview','ap-img-dropzone','ap-img-data')" style="position:absolute;top:6px;right:6px;background:rgba(0,0,0,0.7);color:#fff;border-radius:8px;width:28px;height:28px;font-size:0.85rem;display:flex;align-items:center;justify-content:center"><i class="fas fa-times"></i></button>
   </div>
   <input type="hidden" id="ap-img-data">
   <div style="display:flex;align-items:center;gap:8px;margin-top:10px">
     <div style="flex:1;height:1px;background:var(--border)"></div>
     <span style="font-size:0.75rem;color:var(--text3)">или вставьте ссылку</span>
     <div style="flex:1;height:1px;background:var(--border)"></div>
   </div>
   <input class="form-input" id="ap-img" placeholder="https://images.unsplash.com/..." style="margin-top:8px;font-size:0.85rem">
 </div>
 <div class="form-group"><label class="form-label">Цвета (через запятую)</label><input class="form-input" id="ap-colors" placeholder="Чёрный, Белый, Синий"></div>
 <div class="form-group"><label class="form-label">Размеры (через запятую)</label><input class="form-input" id="ap-sizes" placeholder="S, M, L, XL или 40, 41, 42"></div>
 <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">
 <input type="checkbox" id="ap-instock" checked style="accent-color:var(--accent);width:16px;height:16px">
 <label for="ap-instock" style="font-size:0.88rem;color:var(--text2)">В наличии</label>
 </div>
 <button class="btn btn-primary" style="width:100%" onclick="saveProduct()"><i class="fas fa-save"></i> Сохранить товар</button>
 `);
}
function editProduct(id) {
 const p = adminProducts.find(x => x.id === id);
 if (!p) return;
 editingProductId = id;
 showModal(`
 <h2 style="margin-bottom:20px"><i class="fas fa-edit" style="color:var(--accent);margin-right:8px"></i>Редактировать товар</h2>
 <div class="form-group"><label class="form-label">Название *</label><input class="form-input" id="ap-name" value="${p.name}"></div>
 <div class="form-grid">
 <div class="form-group"><label class="form-label">Цена (₸) *</label><input class="form-input" id="ap-price" value="${p.price}" type="number"></div>
 <div class="form-group"><label class="form-label">Старая цена (₸)</label><input class="form-input" id="ap-oldprice" value="${p.oldPrice||''}" type="number"></div>
 </div>
 <div class="form-grid">
 <div class="form-group"><label class="form-label">Категория</label>
 <select class="form-input" id="ap-cat">${CATEGORIES.map(c=>`<option value="${c.id}" ${c.id===p.cat?'selected':''}>${c.name}</option>`).join('')}</select>
 </div>
 <div class="form-group"><label class="form-label">Бейдж</label>
 <select class="form-input" id="ap-badge">
 <option value="" ${!p.badge?'selected':''}>Нет</option>
 <option value="new" ${p.badge==='new'?'selected':''}>Новинка</option>
 <option value="sale" ${p.badge==='sale'?'selected':''}>Скидка</option>
 <option value="hot" ${p.badge==='hot'?'selected':''}>Хит</option>
 </select>
 </div>
 </div>
 <div class="form-group"><label class="form-label">Описание</label><textarea class="form-input" id="ap-desc" rows="3">${p.desc||''}</textarea></div>
 <div class="form-group">
   <label class="form-label">Фото товара</label>
   <div id="ap-img-dropzone" onclick="document.getElementById('ap-img-file').click()" style="border:2px dashed var(--border);border-radius:12px;padding:20px;text-align:center;cursor:pointer;transition:var(--transition);background:var(--bg3);position:relative;min-height:120px;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:8px" onmouseover="this.style.borderColor='var(--accent)'" onmouseout="this.style.borderColor='var(--border)'">
     <i class="fas fa-cloud-upload-alt" style="font-size:2rem;color:var(--text3)"></i>
     <span style="color:var(--text2);font-size:0.88rem">Нажмите чтобы заменить фото</span>
     <span style="color:var(--text3);font-size:0.75rem">JPG, PNG, WEBP · до 5 МБ</span>
   </div>
   <input type="file" id="ap-img-file" accept="image/*" style="display:none" onchange="handleProductImageUpload(this, 'ap-img-preview', 'ap-img-dropzone', 'ap-img-data')">
   <div id="ap-img-preview" style="${p.img ? '' : 'display:none;'}margin-top:10px;position:relative">
     <img id="ap-img-preview-img" src="${p.img||''}" style="width:100%;max-height:180px;object-fit:cover;border-radius:10px;border:1px solid var(--border)">
     <button onclick="clearProductImage('ap-img-preview','ap-img-dropzone','ap-img-data')" style="position:absolute;top:6px;right:6px;background:rgba(0,0,0,0.7);color:#fff;border-radius:8px;width:28px;height:28px;font-size:0.85rem;display:flex;align-items:center;justify-content:center"><i class="fas fa-times"></i></button>
   </div>
   <input type="hidden" id="ap-img-data">
   <div style="display:flex;align-items:center;gap:8px;margin-top:10px">
     <div style="flex:1;height:1px;background:var(--border)"></div>
     <span style="font-size:0.75rem;color:var(--text3)">или вставьте ссылку</span>
     <div style="flex:1;height:1px;background:var(--border)"></div>
   </div>
   <input class="form-input" id="ap-img" value="${p.img||''}" placeholder="https://images.unsplash.com/..." style="margin-top:8px;font-size:0.85rem">
 </div>
 <div class="form-group"><label class="form-label">Цвета</label><input class="form-input" id="ap-colors" value="${p.colors?.join(', ')||''}"></div>
 <div class="form-group"><label class="form-label">Размеры</label><input class="form-input" id="ap-sizes" value="${p.sizes?.join(', ')||''}"></div>
 <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">
 <input type="checkbox" id="ap-instock" ${p.inStock?'checked':''} style="accent-color:var(--accent);width:16px;height:16px">
 <label for="ap-instock" style="font-size:0.88rem;color:var(--text2)">В наличии</label>
 </div>
 <button class="btn btn-primary" style="width:100%" onclick="saveProduct()"><i class="fas fa-save"></i> Сохранить изменения</button>
 `);
}
function handleProductImageUpload(input, previewId, dropzoneId, dataId) {
  const file = input.files[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) {
    showNotif('Файл слишком большой. Максимум 5 МБ', 'error');
    input.value = '';
    return;
  }
  const reader = new FileReader();
  reader.onload = function(e) {
    const dataUrl = e.target.result;
    // Store base64 in hidden input
    const dataInput = document.getElementById(dataId);
    if (dataInput) dataInput.value = dataUrl;
    // Show preview
    const preview = document.getElementById(previewId);
    const previewImg = document.getElementById(previewId + '-img');
    const dropzone = document.getElementById(dropzoneId);
    if (preview && previewImg) {
      previewImg.src = dataUrl;
      preview.style.display = 'block';
    }
    if (dropzone) {
      dropzone.style.borderColor = 'var(--accent)';
      dropzone.innerHTML = `<i class="fas fa-check-circle" style="font-size:1.5rem;color:var(--success)"></i><span style="color:var(--success);font-size:0.85rem">Фото загружено</span>`;
    }
    // Clear URL input since we have a file
    const urlInput = document.getElementById('ap-img');
    if (urlInput) urlInput.value = '';
  };
  reader.readAsDataURL(file);
}
function clearProductImage(previewId, dropzoneId, dataId) {
  const preview = document.getElementById(previewId);
  const dropzone = document.getElementById(dropzoneId);
  const dataInput = document.getElementById(dataId);
  const fileInput = document.getElementById('ap-img-file');
  if (preview) preview.style.display = 'none';
  if (dataInput) dataInput.value = '';
  if (fileInput) fileInput.value = '';
  if (dropzone) {
    dropzone.style.borderColor = 'var(--border)';
    dropzone.innerHTML = `
      <i class="fas fa-cloud-upload-alt" style="font-size:2rem;color:var(--text3)"></i>
      <span style="color:var(--text2);font-size:0.88rem">Нажмите или перетащите фото</span>
      <span style="color:var(--text3);font-size:0.75rem">JPG, PNG, WEBP · до 5 МБ</span>`;
  }
}
function saveProduct() {
 const name = document.getElementById('ap-name')?.value?.trim();
 const price = parseFloat(document.getElementById('ap-price')?.value);
 const oldPrice = parseFloat(document.getElementById('ap-oldprice')?.value) || null;
 const cat = document.getElementById('ap-cat')?.value;
 const badge = document.getElementById('ap-badge')?.value || null;
 const desc = document.getElementById('ap-desc')?.value;
 // Priority: uploaded file (base64) > URL input
 const imgBase64 = document.getElementById('ap-img-data')?.value;
 const imgUrl = document.getElementById('ap-img')?.value?.trim();
 const img = imgBase64 || imgUrl || '';
 const inStock = document.getElementById('ap-instock')?.checked ?? true;
 const colorsRaw = document.getElementById('ap-colors')?.value;
 const sizesRaw = document.getElementById('ap-sizes')?.value;
 const colors = colorsRaw ? colorsRaw.split(',').map(s=>s.trim()).filter(Boolean) : [];
 const sizes = sizesRaw ? sizesRaw.split(',').map(s=>s.trim()).filter(Boolean) : [];
 if (!name || !price) { showNotif('Заполните название и цену', 'error'); return; }
 if (!img) { showNotif('Добавьте фото товара или вставьте ссылку', 'error'); return; }
 const catObj = CATEGORIES.find(c => c.id === cat);
 if (editingProductId) {
   const p = adminProducts.find(x => x.id === editingProductId);
   if (p) { Object.assign(p, { name, price, oldPrice, cat, catName: catObj?.name||cat, badge, desc, inStock, colors, sizes, img }); }
   showNotif('Товар обновлён!', 'success');
 } else {
   const newId = Math.max(...adminProducts.map(p=>p.id), 0) + 1;
   adminProducts.push({ id: newId, name, price, oldPrice, cat, catName: catObj?.name||cat, badge, desc, img, imgs:[img], inStock, colors, sizes, rating: 4.5, reviews: 0, specs: [] });
   PRODUCTS.push(adminProducts[adminProducts.length-1]);
   showNotif('Товар добавлен!', 'success');
 }
 closeModal();
 renderAdminProducts();
}
function deleteProduct(id) {
 if (!confirm('Удалить товар?')) return;
 adminProducts = adminProducts.filter(p => p.id !== id);
 showNotif('Товар удалён', 'info');
 renderAdminProducts();
}
function setOrderStatus(id, status) {
 const o = orders.find(x => x.id === id);
 if (o) { o.status = status; localStorage.setItem('tkoboi_orders', JSON.stringify(orders)); showNotif('Статус обновлён', 'success'); }
}
function updateOrderStatus(id) {
 const o = orders.find(x => x.id === id);
 if (o) { o.status = o.status === 'processing' ? 'shipped' : o.status === 'shipped' ? 'delivered' : 'processing'; }
 localStorage.setItem('tkoboi_orders', JSON.stringify(orders));
 adminTab('orders');
 showNotif('Статус обновлён', 'success');
}
function deleteOrder(id) {
 orders = orders.filter(o => o.id !== id);
 localStorage.setItem('tkoboi_orders', JSON.stringify(orders));
 showNotif('Заказ удалён', 'info');
}
function viewOrderDetails(id) {
 const o = orders.find(x => x.id === id);
 if (!o) return;
 const items = o.items.map(item => {
 const p = PRODUCTS.find(x => x.id === item.id);
 return p ? `<div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.05)">
 <img loading="lazy" src="${p.img}" style="width:44px;height:44px;border-radius:8px;object-fit:cover" onerror="this.style.opacity=0.3">
 <div style="flex:1"><div style="font-size:0.88rem;font-weight:600">${p.name}</div><div style="font-size:0.75rem;color:var(--text3)">${p.catName}</div></div>
 <div style="text-align:right"><div style="font-size:0.82rem;color:var(--text2)">×${item.qty}</div><div style="font-weight:700;color:var(--accent);font-size:0.88rem">${(p.price*item.qty).toLocaleString('ru-KZ')} ₸</div></div>
 </div>` : '';
 }).join('');
 showModal(`
 <h2 style="margin-bottom:4px">Заказ ${o.id}</h2>
 <div style="color:var(--text3);font-size:0.82rem;margin-bottom:20px">${o.date}</div>
 <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px">
 <div style="background:var(--bg3);padding:12px;border-radius:10px">
 <div style="font-size:0.72rem;color:var(--text3);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px">Клиент</div>
 <div style="font-weight:600">${o.name||'Гость'}</div>
 <div style="font-size:0.82rem;color:var(--text2)">${o.phone||''}</div>
 <div style="font-size:0.82rem;color:var(--text2)">${o.email||''}</div>
 </div>
 <div style="background:var(--bg3);padding:12px;border-radius:10px">
 <div style="font-size:0.72rem;color:var(--text3);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px">Доставка</div>
 <div style="font-weight:600">${o.deliveryType==='courier'?'Курьером':o.deliveryType==='post'?'Kaspi доставка':'Самовывоз'}</div>
 <div style="font-size:0.82rem;color:var(--text2)">${o.address||'—'}</div>
 </div>
 </div>
 <div style="margin-bottom:16px">${items}</div>
 <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-top:2px solid var(--accent)">
 <span style="font-weight:700">Итого</span>
 <span style="font-family:'Clash Display';font-size:1.2rem;color:var(--accent);font-weight:700">${o.total.toLocaleString('ru-KZ')} ₸</span>
 </div>
 <div style="margin-top:12px">
 <div style="font-size:0.8rem;color:var(--text2);margin-bottom:8px">Изменить статус:</div>
 <div style="display:flex;gap:8px">
 ${['processing','shipped','delivered'].map(s=>`<button onclick="setOrderStatus('${o.id}','${s}');closeModal();adminTab('orders')" style="flex:1;padding:8px;border-radius:8px;background:${o.status===s?'var(--accent)':'var(--bg3)'};color:${o.status===s?'#fff':'var(--text2)'};border:1px solid ${o.status===s?'var(--accent)':'var(--border)'};cursor:pointer;font-size:0.78rem;font-family:'Satoshi'">${s==='processing'?'В обработке':s==='shipped'?'Отправлен':'Доставлен'}</button>`).join('')}
 </div>
 </div>
 `);
}
function deleteUser(email) {
 const u = users.find(x => x.email === email);
 if (!u) return;
 if (['superadmin','admin','worker'].includes(u.role)) { showNotif('Нельзя удалить сотрудника через раздел покупателей', 'error'); return; }
 if (!confirm('Удалить пользователя ' + email + '?')) return;
 users = users.filter(u => u.email !== email);
 localStorage.setItem('tkoboi_users', JSON.stringify(users));
 showNotif('Пользователь удалён', 'info');
 adminTab('customers');
}
function openAddPromo() {
 showModal(`
 <h2 style="margin-bottom:20px"><i class="fas fa-tag" style="color:var(--accent);margin-right:8px"></i>Создать промокод</h2>
 <div class="form-group"><label class="form-label">Код промокода *</label><input class="form-input" id="promo-code" placeholder="SUMMER25" style="text-transform:uppercase" oninput="this.value=this.value.toUpperCase()"></div>
 <div class="form-group"><label class="form-label">Скидка (%) *</label><input class="form-input" id="promo-disc" placeholder="10" type="number" min="1" max="90"></div>
 <div class="form-group"><label class="form-label">Действует до</label><input class="form-input" id="promo-exp" type="date"></div>
 <button class="btn btn-primary" style="width:100%" onclick="savePromo()"><i class="fas fa-save"></i> Создать</button>
 `);
}
function savePromo() {
 const code = document.getElementById('promo-code')?.value?.trim().toUpperCase();
 const discount = parseInt(document.getElementById('promo-disc')?.value);
 const expires = document.getElementById('promo-exp')?.value;
 if (!code || !discount) { showNotif('Заполните код и скидку', 'error'); return; }
 const promos = JSON.parse(localStorage.getItem('tkoboi_promos') || '[]');
 promos.push({ code, discount, expires: expires || null, uses: 0 });
 PROMOS[code] = discount;
 localStorage.setItem('tkoboi_promos', JSON.stringify(promos));
 showNotif('Промокод создан!', 'success');
 closeModal();
 adminTab('promo');
}
function deletePromo(code) {
 const promos = JSON.parse(localStorage.getItem('tkoboi_promos') || '[]').filter(p => p.code !== code);
 localStorage.setItem('tkoboi_promos', JSON.stringify(promos));
 delete PROMOS[code];
 adminTab('promo');
 showNotif('Промокод удалён', 'info');
}
// ── Store Settings Functions ─────────────────────────────────
function saveMainSettings() {
 const name = document.getElementById('set-storeName')?.value?.trim();
 const email = document.getElementById('set-storeEmail')?.value?.trim();
 const phone = document.getElementById('set-storePhone')?.value?.trim();
 if (!name) { showNotif('Введите название магазина', 'error'); return; }
 if (!email || !email.includes('@')) { showNotif('Введите корректный email', 'error'); return; }
 saveStoreSettings({ name, email, phone });
 showNotif('✓ Основные настройки сохранены!', 'success');
}
function saveDeliverySettings() {
 const courierCost = parseInt(document.getElementById('set-courier')?.value);
 const postCost = parseInt(document.getElementById('set-post')?.value);
 const freeFrom = parseInt(document.getElementById('set-free')?.value);
 if (isNaN(courierCost) || isNaN(postCost) || isNaN(freeFrom)) { showNotif('Введите корректные числа', 'error'); return; }
 if (courierCost < 0 || postCost < 0 || freeFrom < 0) { showNotif('Стоимость не может быть отрицательной', 'error'); return; }
 saveStoreSettings({ courierCost, postCost, freeFrom });
 // Apply delivery cost changes live
 deliveryCost = courierCost;
 // Update checkout delivery labels if visible
 const radioSubs = document.querySelectorAll('.radio-sub');
 radioSubs.forEach(sub => {
   if (sub.textContent.includes('дня · ')) sub.textContent = '1-3 дня · ' + courierCost + ' ₸';
   if (sub.textContent.includes('дней · ')) sub.textContent = '5-10 дней · ' + postCost + ' ₸';
 });
 showNotif('✓ Настройки доставки сохранены!', 'success');
}
function changeAdminPassword() {
 if (!isSuperAdmin()) { showNotif('Нет прав', 'error'); return; }
 const current = document.getElementById('sec-current')?.value;
 const newPass = document.getElementById('sec-new')?.value;
 const confirm = document.getElementById('sec-confirm')?.value;
 if (!current || !newPass || !confirm) { showNotif('Заполните все поля', 'error'); return; }
 if (newPass.length < 6) { showNotif('Новый пароль минимум 6 символов', 'error'); return; }
 if (newPass !== confirm) { showNotif('Пароли не совпадают', 'error'); return; }
 // Verify current password
 const u = users.find(x => x.email === currentUser.email);
 if (!u) { showNotif('Пользователь не найден', 'error'); return; }
 const isCorrect = u.password === current || u._ph === btoa(current);
 if (!isCorrect) { showNotif('Текущий пароль неверный', 'error'); return; }
 u.password = newPass;
 delete u._ph;
 localStorage.setItem('tkoboi_users', JSON.stringify(users));
 document.getElementById('sec-current').value = '';
 document.getElementById('sec-new').value = '';
 document.getElementById('sec-confirm').value = '';
 showNotif('✓ Пароль успешно изменён!', 'success');
}

// ── Staff Management (superadmin only) ──────────────────────
function openAddStaff() {
 if (!isSuperAdmin()) { showNotif('Нет прав', 'error'); return; }
 showModal(`
   <h2 style="margin-bottom:6px"><i class="fas fa-user-plus" style="color:var(--accent);margin-right:8px"></i>Добавить сотрудника</h2>
   <p style="color:var(--text2);font-size:0.85rem;margin-bottom:20px">Сотрудник получит доступ к панели администратора</p>
   <div class="form-group"><label class="form-label">Имя *</label><input class="form-input" id="staff-name" placeholder="Имя сотрудника"></div>
   <div class="form-group"><label class="form-label">Email *</label><input class="form-input" id="staff-email" type="email" placeholder="сотрудник@tkoboi.kz"></div>
   <div class="form-group"><label class="form-label">Пароль *</label><input class="form-input" id="staff-pass" type="password" placeholder="Минимум 6 символов"></div>
   <div class="form-group">
     <label class="form-label">Роль *</label>
     <select class="form-input" id="staff-role">
       <option value="worker">👷 Работник — только заказы</option>
       <option value="admin">🛡️ Администратор — товары, заказы, клиенты</option>
     </select>
   </div>
   <div style="background:var(--bg3);border-radius:10px;padding:12px;margin-bottom:16px;font-size:0.8rem;color:var(--text2)">
     <div style="margin-bottom:6px;font-weight:600;color:var(--text)">Уровни доступа:</div>
     <div>👷 <b>Работник</b>: просмотр и обновление статусов заказов</div>
     <div style="margin-top:4px">🛡️ <b>Администратор</b>: товары, заказы, клиенты, промокоды (кроме настроек и персонала)</div>
   </div>
   <button class="btn btn-primary" style="width:100%" onclick="saveNewStaff()"><i class="fas fa-save"></i> Создать аккаунт</button>
 `);
}
function saveNewStaff() {
 const name = document.getElementById('staff-name')?.value?.trim();
 const email = document.getElementById('staff-email')?.value?.trim().toLowerCase();
 const pass = document.getElementById('staff-pass')?.value;
 const role = document.getElementById('staff-role')?.value;
 if (!name || !email || !pass) { showNotif('Заполните все поля', 'error'); return; }
 if (pass.length < 6) { showNotif('Пароль минимум 6 символов', 'error'); return; }
 if (!email.includes('@')) { showNotif('Некорректный email', 'error'); return; }
 if (users.find(u => u.email === email)) { showNotif('Пользователь с таким email уже существует', 'error'); return; }
 users.push({ name, email, password: pass, role, phone: '' });
 localStorage.setItem('tkoboi_users', JSON.stringify(users));
 showNotif(`✓ Аккаунт "${name}" (${role === 'worker' ? 'Работник' : 'Администратор'}) создан!`, 'success');
 closeModal();
 adminTab('settings');
}
function openEditStaff(email) {
 if (!isSuperAdmin()) { showNotif('Нет прав', 'error'); return; }
 const u = users.find(x => x.email === email);
 if (!u) return;
 showModal(`
   <h2 style="margin-bottom:20px"><i class="fas fa-user-edit" style="color:var(--accent);margin-right:8px"></i>Изменить сотрудника</h2>
   <div class="form-group"><label class="form-label">Имя</label><input class="form-input" id="estf-name" value="${u.name}"></div>
   <div class="form-group">
     <label class="form-label">Роль</label>
     <select class="form-input" id="estf-role">
       <option value="worker" ${u.role==='worker'?'selected':''}>👷 Работник — только заказы</option>
       <option value="admin" ${u.role==='admin'?'selected':''}>🛡️ Администратор — товары, заказы, клиенты</option>
     </select>
   </div>
   <div class="form-group"><label class="form-label">Новый пароль <span style="color:var(--text3)">(оставьте пустым чтобы не менять)</span></label><input class="form-input" id="estf-pass" type="password" placeholder="Новый пароль"></div>
   <button class="btn btn-primary" style="width:100%" onclick="saveEditStaff('${email}')"><i class="fas fa-save"></i> Сохранить изменения</button>
 `);
}
function saveEditStaff(email) {
 const u = users.find(x => x.email === email);
 if (!u) return;
 const name = document.getElementById('estf-name')?.value?.trim();
 const role = document.getElementById('estf-role')?.value;
 const pass = document.getElementById('estf-pass')?.value;
 if (!name) { showNotif('Введите имя', 'error'); return; }
 u.name = name;
 u.role = role;
 if (pass) {
   if (pass.length < 6) { showNotif('Пароль минимум 6 символов', 'error'); return; }
   u.password = pass;
   delete u._ph;
 }
 localStorage.setItem('tkoboi_users', JSON.stringify(users));
 showNotif('✓ Данные сотрудника обновлены!', 'success');
 closeModal();
 adminTab('settings');
}
function deleteStaff(email) {
 if (!isSuperAdmin()) { showNotif('Нет прав', 'error'); return; }
 const u = users.find(x => x.email === email);
 if (!u) return;
 if (u.role === 'superadmin') { showNotif('Нельзя удалить супер-администратора', 'error'); return; }
 if (!confirm(`Удалить сотрудника "${u.name}" (${email})?`)) return;
 users = users.filter(x => x.email !== email);
 localStorage.setItem('tkoboi_users', JSON.stringify(users));
 showNotif(`✓ Сотрудник "${u.name}" удалён`, 'info');
 adminTab('settings');
}

// ── Promo validation helpers ─────────────────────────────────
function _validatePromoCode(code) {
 if (!code) return { valid: false, msg: 'Введите промокод' };
 const upper = code.toUpperCase();
 // Check custom promos first (with expiry)
 const customPromos = JSON.parse(localStorage.getItem('tkoboi_promos') || '[]');
 const custom = customPromos.find(p => p.code === upper);
 if (custom) {
   if (custom.expires && new Date(custom.expires) < new Date()) return { valid: false, msg: 'Промокод истёк' };
   return { valid: true, code: upper, discount: custom.discount, isCustom: true };
 }
 // Check system promos
 if (PROMOS[upper] !== undefined) {
   return { valid: true, code: upper, discount: PROMOS[upper], isCustom: false };
 }
 return { valid: false, msg: 'Промокод не найден или недействителен' };
}
function _incrementPromoUse(code) {
 const customPromos = JSON.parse(localStorage.getItem('tkoboi_promos') || '[]');
 const p = customPromos.find(x => x.code === code);
 if (p) { p.uses = (p.uses || 0) + 1; localStorage.setItem('tkoboi_promos', JSON.stringify(customPromos)); }
}

// ── Checkout promo ──────────────────────────────────────────
function applyCheckoutPromo() {
 const input = document.getElementById('checkoutPromoInput');
 const msgEl = document.getElementById('checkoutPromoMsg');
 const code = input?.value?.trim();
 const result = _validatePromoCode(code);
 if (!result.valid) {
   if (msgEl) msgEl.innerHTML = `<span style="color:var(--danger)"><i class="fas fa-times-circle"></i> ${result.msg}</span>`;
   showNotif(result.msg, 'error');
   return;
 }
 promoApplied = result.code;
 if (msgEl) msgEl.innerHTML = `<span style="color:var(--success)"><i class="fas fa-check-circle"></i> Промокод применён — скидка ${result.discount}%!</span>`;
 renderCheckoutSummary();
 showNotif(`Промокод применён! Скидка ${result.discount}%`, 'success');
}

function exportData() {
 const data = JSON.stringify({ orders, users: users.map(u=>({...u,password:undefined,_ph:undefined})), products: adminProducts, settings: storeSettings }, null, 2);
 const blob = new Blob([data], { type: 'application/json' });
 const a = document.createElement('a');
 a.href = URL.createObjectURL(blob);
 a.download = 'tkoboi_export_' + new Date().toISOString().slice(0,10) + '.json';
 a.click();
 showNotif('✓ Данные экспортированы!', 'success');
}
function updateBadges() {
 const cartCount = cart.reduce((s,i)=>s+i.qty,0);
 const wishCount = wishlist.length;
 const cb = document.getElementById('cartBadge');
 const wb = document.getElementById('wishBadge');
 if (cb) { cb.textContent = cartCount; cb.style.display = cartCount > 0 ? 'flex' : 'none'; }
 if (wb) { wb.textContent = wishCount; wb.style.display = wishCount > 0 ? 'flex' : 'none'; }
}
function showNotif(text, type='info') {
 const n = document.getElementById('notifications');
 const el = document.createElement('div');
 el.className = `notif ${type}`;
 const icons = { success:'fa-check-circle', error:'fa-times-circle', info:'fa-info-circle' };
 el.innerHTML = `<i class="fas ${icons[type]||icons.info} notif-icon"></i><span class="notif-text">${text}</span><i class="fas fa-times notif-close" onclick="this.parentElement.remove()"></i>`;
 n.appendChild(el);
 setTimeout(() => el.remove(), 3500);
}
let currentModal = null;
function showModal(content) {
  if (!document.body) return;
  document.getElementById('activeModal')?.remove();
 const overlay = document.createElement('div');
 overlay.className = 'modal-overlay';
 overlay.id = 'activeModal';
 overlay.innerHTML = `<div class="modal">${content}<button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button></div>`;
 overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
 document.body.appendChild(overlay);
}
function closeModal() {
 document.getElementById('activeModal')?.remove();
}
JSON.parse(localStorage.getItem('tkoboi_promos') || '[]').forEach(p => { PROMOS[p.code] = p.discount; });
// Apply delivery settings from store settings
deliveryCost = storeSettings.courierCost || 350;
updateBadges();
updateNavForRole();
renderHome();
// Auth modal disabled on first visit - user can register via Profile icon
// if (!currentUser) { setTimeout(() => showAuthModal('register'), 600); }
function showAuthModal(mode) {
  document.getElementById('activeModal')?.remove();
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'activeModal';
  const loginHtml = `
    <div class="auth-logo" style="text-align:center;font-size:1.6rem;font-weight:900;letter-spacing:-1px;color:var(--accent);margin-bottom:6px">🌿 Тканевые обои</div>
    <h2 class="auth-title" style="text-align:center;margin-bottom:4px">С возвращением!</h2>
    <p class="auth-sub" style="text-align:center;color:var(--text2);margin-bottom:20px">Войдите в свой аккаунт</p>
    <div class="form-group"><label class="form-label">Email</label><input class="form-input" id="mLoginEmail" placeholder="ivan@example.com" type="email" onkeydown="if(event.key==='Enter')doModalLogin()"></div>
    <div class="form-group" style="position:relative">
      <label class="form-label">Пароль</label>
      <input class="form-input" id="mLoginPass" placeholder="••••••••" type="password" onkeydown="if(event.key==='Enter')doModalLogin()" style="padding-right:44px">
      <button type="button" onclick="const i=document.getElementById('mLoginPass');i.type=i.type==='password'?'text':'password'" style="position:absolute;right:12px;bottom:10px;background:none;color:var(--text3);font-size:0.9rem"><i class="fas fa-eye"></i></button>
    </div>
    <button class="btn btn-primary" style="width:100%;margin-bottom:12px" onclick="doModalLogin()"><i class="fas fa-sign-in-alt"></i> Войти</button>
    <div class="auth-switch" style="text-align:center">Нет аккаунта? <a style="color:var(--accent);cursor:pointer" onclick="showAuthModal('register')">Зарегистрироваться</a></div>
    <button class="btn btn-outline" style="width:100%;margin-top:10px;font-size:0.8rem;opacity:0.7" onclick="closeModal()"><i class="fas fa-times"></i> Продолжить без входа</button>
  `;
  const registerHtml = `
    <div class="auth-logo" style="text-align:center;font-size:1.6rem;font-weight:900;letter-spacing:-1px;color:var(--accent);margin-bottom:6px">🌿 Тканевые обои</div>
    <h2 class="auth-title" style="text-align:center;margin-bottom:4px">Создать аккаунт</h2>
    <p class="auth-sub" style="text-align:center;color:var(--text2);margin-bottom:20px">Присоединяйтесь к нам</p>
    <div class="form-group"><label class="form-label">Имя *</label><input class="form-input" id="mRegName" placeholder="Иван Иванов"></div>
    <div class="form-group"><label class="form-label">Email *</label><input class="form-input" id="mRegEmail" placeholder="ivan@example.com" type="email"></div>
    <div class="form-group" style="position:relative">
      <label class="form-label">Пароль *</label>
      <input class="form-input" id="mRegPass" placeholder="Минимум 6 символов" type="password" style="padding-right:44px">
      <button type="button" onclick="const i=document.getElementById('mRegPass');i.type=i.type==='password'?'text':'password'" style="position:absolute;right:12px;bottom:10px;background:none;color:var(--text3);font-size:0.9rem"><i class="fas fa-eye"></i></button>
    </div>
    <div class="form-group"><label class="form-label">Телефон</label><input class="form-input" id="mRegPhone" placeholder="+7 (900) 000-00-00" type="tel"></div>
    <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:16px">
      <input type="checkbox" id="mRegAgree" style="margin-top:3px;accent-color:var(--accent)">
      <label for="mRegAgree" style="font-size:0.82rem;color:var(--text2);cursor:pointer">Согласен с <a style="color:var(--accent)">условиями</a> и <a style="color:var(--accent)">политикой конфиденциальности</a></label>
    </div>
    <button class="btn btn-primary" style="width:100%;margin-bottom:12px" onclick="doModalRegister()"><i class="fas fa-user-plus"></i> Зарегистрироваться</button>
    <div class="auth-switch" style="text-align:center">Уже есть аккаунт? <a style="color:var(--accent);cursor:pointer" onclick="showAuthModal('login')">Войти</a></div>
    <button class="btn btn-outline" style="width:100%;margin-top:10px;font-size:0.8rem;opacity:0.7" onclick="closeModal()"><i class="fas fa-times"></i> Продолжить без входа</button>
  `;
  overlay.innerHTML = `<div class="modal" style="max-width:400px">${mode==='login'?loginHtml:registerHtml}<button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button></div>`;
  overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
  document.body.appendChild(overlay);
}
function doModalLogin() {
  const email = document.getElementById('mLoginEmail')?.value?.trim().toLowerCase();
  const pass  = document.getElementById('mLoginPass')?.value;
  if (!email || !pass) { showNotif('Заполните все поля', 'error'); return; }
  if (!email.includes('@')) { showNotif('Введите корректный email', 'error'); return; }
  const found = users.find(u => u.email === email && (u.password === pass || u._ph === btoa(pass)));
  if (!found) { showNotif('Неверный email или пароль', 'error'); return; }
  currentUser = { name: found.name, email: found.email, role: found.role || 'user', phone: found.phone || '' };
  localStorage.setItem('tkoboi_user', JSON.stringify(currentUser));
  showNotif(`Добро пожаловать, ${currentUser.name}!`, 'success');
  updateNavForRole();
  closeModal();
  if (canAccessAdmin()) setTimeout(() => navigate('admin'), 200);
}
function doModalRegister() {
  const name = document.getElementById('mRegName')?.value?.trim();
  const email = document.getElementById('mRegEmail')?.value?.trim();
  const pass = document.getElementById('mRegPass')?.value;
  const phone = document.getElementById('mRegPhone')?.value?.trim();
  const agree = document.getElementById('mRegAgree')?.checked;
  if (!name || !email || !pass) { showNotif('Заполните обязательные поля', 'error'); return; }
  if (pass.length < 6) { showNotif('Пароль минимум 6 символов', 'error'); return; }
  if (!agree) { showNotif('Примите условия использования', 'error'); return; }
  if (users.find(u=>u.email===email)) { showNotif('Такой email уже зарегистрирован', 'error'); return; }
  const newUser = { name, email, password: pass, phone, role: 'user' };
  users.push(newUser);
  localStorage.setItem('tkoboi_users', JSON.stringify(users));
  currentUser = { name, email, role: 'user', phone };
  localStorage.setItem('tkoboi_user', JSON.stringify(currentUser));
  showNotif('Аккаунт создан! Добро пожаловать, ' + name + '!', 'success');
  updateNavForRole();
  closeModal();
}
console.log('%cТканевые обои Астана 🏠', 'font-size:20px;font-weight:bold;color:#b5924c');
console.log('%cДобро пожаловать в Тканевые обои Астана', 'color:#43e8b0');

// ── History API for SPA deep-link support ─────────────────────
(function(){
  if (typeof navigate !== 'function') return;
  const _navigate = navigate;
  window.navigate = function(page, id) {
    _navigate(page, id);
    const path = page === 'home' ? '/' : '/' + page + (id ? '/' + id : '');
    if (history.pushState) history.pushState({ page, id }, '', path);
  };
  window.addEventListener('popstate', function(e) {
    if (e.state && e.state.page) { navigate(e.state.page, e.state.id); }
    else { navigate('home'); }
  });
  // Handle direct URL navigation on load
  const path = location.pathname.replace(/^\//, '').split('/');
  const pageMap = ['catalog','cart','wishlist','checkout','profile','admin','product'];
  if (path[0] && pageMap.includes(path[0])) {
    document.addEventListener('DOMContentLoaded', () => navigate(path[0], path[1] ? parseInt(path[1]) : undefined));
  }
})();


// ── Cart badge animation ──────────────────────────────────────
(function(){
  if (typeof saveCart !== 'function') return;
  const _saveCart = saveCart;
  window.saveCart = function() {
    _saveCart();
    const badge = document.getElementById('cartBadge');
    if (badge) { badge.classList.remove('cart-added'); void badge.offsetWidth; badge.classList.add('cart-added'); }
  };
})();

// ── Footer modal helpers ──────────────────────────────────────
function showHowToOrder() {
  showModal(`
    <h2 style="margin-bottom:20px"><i class="fas fa-shopping-cart" style="color:var(--accent);margin-right:10px"></i>Как сделать заказ</h2>
    <div style="display:flex;flex-direction:column;gap:16px">
      ${[
        ['1','Выберите товар','Найдите нужный товар в каталоге и нажмите «В корзину»'],
        ['2','Оформите заказ','Перейдите в корзину и нажмите «Оформить заказ»'],
        ['3','Заполните данные','Укажите имя, телефон и адрес доставки'],
        ['4','Выберите оплату','Kaspi QR, Kaspi Pay, карта или наличными при получении'],
        ['5','Ждите доставку','Курьер свяжется с вами за 30 мин до приезда']
      ].map(([n,t,d])=>`
        <div style="display:flex;gap:14px;align-items:flex-start">
          <div style="min-width:32px;height:32px;border-radius:50%;background:var(--accent);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:0.9rem">${n}</div>
          <div><div style="font-weight:700;margin-bottom:3px">${t}</div><div style="color:var(--text2);font-size:0.85rem">${d}</div></div>
        </div>`).join('')}
    </div>
    <div style="margin-top:20px;padding:14px;background:rgba(108,99,255,0.08);border-radius:12px;font-size:0.85rem;color:var(--text2)">
      <i class="fas fa-phone-alt" style="color:var(--accent);margin-right:6px"></i>
      Вопросы? Звоните: <a href="tel:+77071759877" style="color:var(--accent);font-weight:700">+7 (707) 175-98-77</a>
    </div>
  `);
}
function showDeliveryInfo() {
  showModal(`
    <h2 style="margin-bottom:20px"><i class="fas fa-truck" style="color:var(--accent);margin-right:10px"></i>Доставка и оплата</h2>
    <h3 style="font-size:0.9rem;color:var(--text3);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:12px">Способы доставки</h3>
    <div style="display:flex;flex-direction:column;gap:12px;margin-bottom:20px">
      <div style="background:var(--bg3);border-radius:12px;padding:14px;display:flex;justify-content:space-between;align-items:center">
        <div><div style="font-weight:700"><i class="fas fa-truck" style="color:var(--accent);margin-right:8px"></i>Курьер</div><div style="color:var(--text2);font-size:0.82rem;margin-top:3px">1–3 рабочих дня · По всему Казахстану</div></div>
        <div style="font-weight:800;color:var(--accent)">${storeSettings.courierCost} ₸</div>
      </div>
      <div style="background:var(--bg3);border-radius:12px;padding:14px;display:flex;justify-content:space-between;align-items:center">
        <div><div style="font-weight:700"><i class="fas fa-envelope" style="color:var(--accent);margin-right:8px"></i>Kaspi доставка</div><div style="color:var(--text2);font-size:0.82rem;margin-top:3px">5–10 дней · По всему Казахстану</div></div>
        <div style="font-weight:800;color:var(--accent)">${storeSettings.postCost} ₸</div>
      </div>
      <div style="background:var(--bg3);border-radius:12px;padding:14px;display:flex;justify-content:space-between;align-items:center">
        <div><div style="font-weight:700"><i class="fas fa-store" style="color:var(--accent);margin-right:8px"></i>Самовывоз</div><div style="color:var(--text2);font-size:0.82rem;margin-top:3px">Туран 53Б, Ncity, Астана · Пн–Вс 9:00–20:00</div></div>
        <div style="font-weight:800;color:var(--success)">Бесплатно</div>
      </div>
      <div style="background:rgba(46,204,113,0.08);border:1px solid rgba(46,204,113,0.2);border-radius:12px;padding:12px;font-size:0.85rem;color:var(--success)">
        <i class="fas fa-check-circle"></i> Бесплатная доставка при заказе от ${storeSettings.freeFrom.toLocaleString('ru-KZ')} ₸
      </div>
    </div>
    <h3 style="font-size:0.9rem;color:var(--text3);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:12px">Способы оплаты</h3>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      ${[
        ['fa-mobile-alt','Kaspi QR','Через приложение Kaspi'],
        ['fa-credit-card','Kaspi Pay','Рассрочка 0-0-12'],
        ['fa-credit-card','Банковская карта','Visa / Mastercard'],
        ['fa-money-bill','Наличными','При получении']
      ].map(([ic,t,d])=>`
        <div style="background:var(--bg3);border-radius:10px;padding:12px">
          <div style="font-weight:700;font-size:0.88rem"><i class="fas ${ic}" style="color:var(--accent);margin-right:6px"></i>${t}</div>
          <div style="color:var(--text3);font-size:0.78rem;margin-top:3px">${d}</div>
        </div>`).join('')}
    </div>
  `);
}
function showReturnInfo() {
  showModal(`
    <h2 style="margin-bottom:20px"><i class="fas fa-undo" style="color:var(--accent);margin-right:10px"></i>Возврат товара</h2>
    <div style="background:rgba(46,204,113,0.08);border:1px solid rgba(46,204,113,0.2);border-radius:12px;padding:14px;margin-bottom:20px;font-size:0.9rem;color:var(--success);font-weight:600">
      <i class="fas fa-shield-alt"></i> Гарантия возврата 30 дней без вопросов
    </div>
    <div style="display:flex;flex-direction:column;gap:12px;margin-bottom:20px">
      ${[
        ['fas fa-check-circle','Условия возврата','Товар не использован, сохранены бирки и упаковка'],
        ['fas fa-calendar-alt','Срок','В течение 30 дней с момента получения'],
        ['fas fa-money-bill-wave','Возврат денег','2–5 рабочих дней на карту или Kaspi'],
        ['fas fa-exchange-alt','Обмен','Возможен обмен на другой размер или цвет']
      ].map(([ic,t,d])=>`
        <div style="display:flex;gap:12px;align-items:flex-start">
          <i class="${ic}" style="color:var(--accent);margin-top:3px;min-width:18px"></i>
          <div><div style="font-weight:700;margin-bottom:2px">${t}</div><div style="color:var(--text2);font-size:0.85rem">${d}</div></div>
        </div>`).join('')}
    </div>
    <div style="padding:14px;background:var(--bg3);border-radius:12px;font-size:0.85rem">
      <div style="font-weight:700;margin-bottom:8px">Как оформить возврат:</div>
      <div style="color:var(--text2);line-height:1.7">Позвоните нам: <a href="tel:+77071759877" style="color:var(--accent);font-weight:700">+7 (707) 175-98-77</a><br>или напишите на <a href="mailto:tkoboi.astana@gmail.com" style="color:var(--accent)">tkoboi.astana@gmail.com</a></div>
    </div>
  `);
}
function showAbout() {
  showModal(`
    <h2 style="margin-bottom:20px"><i class="fas fa-store" style="color:var(--accent);margin-right:10px"></i>О компании — Тканевые обои Астана</h2>
    <p style="color:var(--text2);line-height:1.7;margin-bottom:16px">
      Тканевые обои Астана — специализированный магазин тканевых обоев и бамбуковых панелей. Работаем с 2019 года. Предлагаем широкий ассортимент коллекций с бесплатной консультацией и профессиональным монтажом.
    </p>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px">
      ${[
        ['fas fa-box','10 000+','Товаров в каталоге'],
        ['fas fa-users','50 000+','Довольных клиентов'],
        ['fas fa-map-marker-alt','16','Городов доставки'],
        ['fas fa-star','4.9/5','Средний рейтинг']
      ].map(([ic,n,l])=>`
        <div style="background:var(--bg3);border-radius:12px;padding:16px;text-align:center">
          <i class="${ic}" style="color:var(--accent);font-size:1.3rem;display:block;margin-bottom:8px"></i>
          <div style="font-size:1.3rem;font-weight:900;font-family:'Clash Display'">${n}</div>
          <div style="color:var(--text3);font-size:0.78rem">${l}</div>
        </div>`).join('')}
    </div>
    <div style="padding:14px;background:var(--bg3);border-radius:12px;font-size:0.85rem">
      <div style="font-weight:700;margin-bottom:8px">Контакты</div>
      <div style="color:var(--text2);line-height:1.9">
        <div><i class="fas fa-phone-alt" style="color:var(--accent);width:18px"></i> <a href="tel:+77071759877" style="color:var(--accent);font-weight:700">+7 (707) 175-98-77</a></div>
        <div><i class="fas fa-envelope" style="color:var(--accent);width:18px"></i> <a href="mailto:tkoboi.astana@gmail.com" style="color:var(--accent)">tkoboi.astana@gmail.com</a></div>
        <div><i class="fas fa-map-marker-alt" style="color:var(--accent);width:18px"></i> Казахстан</div>
        <div><i class="fas fa-id-card" style="color:var(--accent);width:18px"></i> Астана, Туран 53Б, Ncity · ИП Тканевые обои</div>
      </div>
    </div>
  `);
}

// ── Drag-and-drop support for product image upload ────────────
document.addEventListener('dragover', function(e) {
  const dropzone = document.getElementById('ap-img-dropzone');
  if (dropzone && dropzone.contains(e.target) || e.target === dropzone) {
    e.preventDefault();
    dropzone.style.borderColor = 'var(--accent)';
    dropzone.style.background = 'rgba(181,146,76,0.08)';
  }
});
document.addEventListener('dragleave', function(e) {
  const dropzone = document.getElementById('ap-img-dropzone');
  if (dropzone && !dropzone.contains(e.relatedTarget)) {
    dropzone.style.borderColor = 'var(--border)';
    dropzone.style.background = 'var(--bg3)';
  }
});
document.addEventListener('drop', function(e) {
  const dropzone = document.getElementById('ap-img-dropzone');
  if (!dropzone) return;
  e.preventDefault();
  dropzone.style.borderColor = 'var(--border)';
  dropzone.style.background = 'var(--bg3)';
  const file = e.dataTransfer?.files?.[0];
  if (!file || !file.type.startsWith('image/')) return;
  // Simulate file input change
  const fileInput = document.getElementById('ap-img-file');
  if (!fileInput) return;
  const dt = new DataTransfer();
  dt.items.add(file);
  fileInput.files = dt.files;
  handleProductImageUpload(fileInput, 'ap-img-preview', 'ap-img-dropzone', 'ap-img-data');
});
