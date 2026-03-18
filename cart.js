// NOVA KZ — Cart & Wishlist Functions
function addToCart(id) {
 const qtyEl = document.getElementById('productQty');
 const qty = Math.max(1, parseInt(qtyEl?.value || '1') || 1);
 const existing = cart.find(i=>i.id===id);
 if (existing) {
 existing.qty += qty;
 } else {
 cart.push({ id, qty });
 }
 saveCart();
 showNotif('Товар добавлен в корзину!', 'success');
}
function removeFromCart(id) {
 cart = cart.filter(i=>i.id!==id);
 saveCart();
 renderCart();
}
function updateQty(id, delta) {
 const item = cart.find(i=>i.id===id);
 if (!item) return;
 item.qty += delta;
 if (item.qty < 1) { removeFromCart(id); return; }
  if (item.qty > 99) item.qty = 99;
 saveCart();
 renderCart();
}
function saveCart() {
 localStorage.setItem('nova_cart', JSON.stringify(cart));
 updateBadges();
 if (currentPage === 'cart') renderCart();
 if (currentPage === 'checkout') renderCheckout();
}
function renderCart() {
 const total = getCartTotal();
 const count = cart.reduce((s,i)=>s+i.qty,0);
 const content = document.getElementById('cartContent');
 if (!content) return;
  if (typeof PRODUCTS === 'undefined' || !Array.isArray(PRODUCTS)) { content.innerHTML = '<p style="padding:40px;text-align:center;color:var(--text2)">Загрузка...</p>'; return; }
 if (cart.length === 0) {
 content.innerHTML = `<div class="cart-empty">
 <i class="fas fa-shopping-bag"></i>
 <h3>Корзина пуста</h3>
 <p>Добавьте товары из каталога</p>
 <button class="btn btn-primary" onclick="navigate('catalog')"><i class="fas fa-arrow-right"></i> Перейти в каталог</button>
 </div>`;
 return;
 }
 content.innerHTML = `<div class="cart-layout">
 <div class="cart-items">
 ${cart.map(item => {
 const p = PRODUCTS.find(x=>x.id===item.id);
 if (!p) return '';
 return `<div class="cart-item fade-in">
 <img class="cart-item-img" src="${p.img}" alt="${p.name}" loading="lazy">
 <div class="cart-item-info">
 <div class="cart-item-name">${p.name}</div>
 <div class="cart-item-cat">${p.catName}</div>
 <div class="cart-item-price">${(p.price * item.qty).toLocaleString('ru-KZ')} ₸</div>
 </div>
 <div class="cart-item-actions">
 <button class="btn-remove" onclick="removeFromCart(${p.id})"><i class="fas fa-trash"></i></button>
 <div class="qty-ctrl">
 <button class="qty-btn" onclick="updateQty(${p.id},-1)">−</button>
 <input class="qty-num" value="${item.qty}" readonly style="min-width:32px">
 <button class="qty-btn" onclick="updateQty(${p.id},1)">+</button>
 </div>
 </div>
 </div>`;
 }).join('')}
 </div>
 <div>
 <div class="cart-summary">
 <h3>Итого</h3>
 <div class="summary-row"><span class="label">Товары (${count} шт.)</span><span class="value">${total.toLocaleString('ru-KZ')} ₸</span></div>
 <div class="summary-row"><span class="label">Доставка</span><span class="value">${deliveryCost > 0 ? deliveryCost + ' ₸' : '<span style="color:var(--success)">Бесплатно</span>'}</span></div>
 ${promoApplied ? `<div class="summary-row"><span class="label" style="color:var(--success)"><i class="fas fa-tag"></i> Промокод −${PROMOS[promoApplied]}%</span><span class="value" style="color:var(--success)">−${Math.round(total * PROMOS[promoApplied] / 100).toLocaleString('ru-KZ')} ₸</span></div>` : ''}
 <div style="display:flex;gap:8px;margin:16px 0">
 <input class="price-input" id="promoInput" placeholder="Промокод" style="flex:1;font-size:0.85rem" value="${promoApplied||''}">
 <button onclick="applyPromo()" style="padding:8px 14px;border-radius:8px;background:var(--accent);color:#fff;font-size:0.82rem;font-weight:600;white-space:nowrap">Применить</button>
 </div>
 <div class="summary-row total"><span class="label">К оплате</span><span class="value">${getCartFinalTotal().toLocaleString('ru-KZ')} ₸</span></div>
 <button class="btn-checkout" onclick="navigate('checkout')"><i class="fas fa-lock"></i> Оформить заказ</button>
 <p style="text-align:center;font-size:0.72rem;color:var(--text3);margin-top:10px"><i class="fas fa-shield-alt" style="color:var(--accent);margin-right:4px"></i>Безопасная оплата · SSL</p>
 </div>
 </div>
 </div>`;
}
function getCartTotal() {
 return cart.reduce((s,item) => {
 const p = PRODUCTS.find(x=>x.id===item.id);
 return s + (p ? p.price * item.qty : 0);
 }, 0);
}
function getCartFinalTotal() {
 const base = getCartTotal() + deliveryCost;
 if (!promoApplied) return base;
 const disc = Math.round(getCartTotal() * PROMOS[promoApplied] / 100);
 return base - disc;
}
function applyPromo() {
 const code = document.getElementById('promoInput')?.value?.trim().toUpperCase();
 if (!code) { showNotif('Введите промокод', 'error'); return; }
 const result = typeof _validatePromoCode === 'function' ? _validatePromoCode(code) : (PROMOS[code] ? {valid:true,code,discount:PROMOS[code]} : {valid:false,msg:'Недействительный промокод'});
 if (result.valid) {
 promoApplied = result.code;
 showNotif(`Промокод применён! Скидка ${result.discount}%`, 'success');
 renderCart();
 } else {
 showNotif(result.msg || 'Недействительный промокод', 'error');
 }
}
function toggleWishlist(id) {
  if (typeof id !== 'number') { id = parseInt(id); }
  if (isNaN(id)) return;
 if (wishlist.includes(id)) {
 wishlist = wishlist.filter(i=>i!==id);
 showNotif('Удалено из избранного', 'info');
 } else {
 wishlist.push(id);
 showNotif('Добавлено в избранное!', 'success');
 }
 localStorage.setItem('nova_wishlist', JSON.stringify(wishlist));
 updateBadges();
 document.querySelectorAll(`[id^="wish-${id}"]`).forEach(btn => {
 btn.classList.toggle('active', wishlist.includes(id));
 btn.innerHTML = `<i class="fa${wishlist.includes(id)?'s':'r'} fa-heart"></i>`;
 });
 if (currentPage === 'wishlist') renderWishlist();
}
function renderWishlist() {
 const content = document.getElementById('wishlistContent');
 if (!content) return;
 if (wishlist.length === 0) {
 content.innerHTML = `<div class="wishlist-empty">
 <i class="fas fa-heart" style="font-size:3rem;color:var(--text3);display:block;margin-bottom:16px"></i>
 <h3 style="margin-bottom:8px">Избранное пусто</h3>
 <p style="color:var(--text2);margin-bottom:24px">Добавляйте товары с помощью ♥</p>
 <button class="btn btn-primary" onclick="navigate('catalog')">Перейти в каталог</button>
 </div>`;
 return;
 }
 const items = (Array.isArray(PRODUCTS) ? PRODUCTS : []).filter(p => Array.isArray(wishlist) && wishlist.includes(p.id));
 content.innerHTML = `<div class="wishlist-grid">${items.map(p=>productCard(p)).join('')}</div>`;
}