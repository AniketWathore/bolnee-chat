const products = [
  {
    id: 1,
    name: "Nike Air Max",
    category: "Running",
    price: 9000.00,
    image: "img/nikeairmax.webp"
  },
  {
    id: 2,
    name: "Nike Jordan 1",
    category: "Casual",
    price: 14000.00,
    image: "img/nikejordan1.webp"
  },
  {
    id: 3,
    name: "Nike Air Force 1",
    category: "Casual",
    price: 7000.00,
    image: "img/nikeairforce1.webp"
  },
  {
    id: 4,
    name: "Adidas Superstars",
    category: "Sports",
    price: 11000.00,
    image: "img/adidassuperstars.webp"
  },
  {
    id: 5,
    name: "Sparx Runner Elite",
    category: "Running",
    price: 1000.00,
    image: "img/sparxrunnerelite.webp"
  }
];

let cart = [];
let activeCategory = 'all';

const productGrid = document.getElementById('product-grid');
const cartCount = document.getElementById('cart-count');
const cartModal = document.getElementById('cart-modal');
const cartBtn = document.getElementById('cart-btn');
const closeBtn = document.querySelector('.close');
const cartItems = document.getElementById('cart-items');
const cartTotal = document.getElementById('cart-total');
const checkoutBtn = document.getElementById('checkout-btn');

// ── Category Filter ──
document.querySelectorAll('.cat-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeCategory = btn.dataset.cat;
    renderProducts();
  });
});

// ── Render Products ──
function renderProducts() {
  const filtered = activeCategory === 'all'
    ? products
    : products.filter(p => p.category === activeCategory);

  productGrid.innerHTML = filtered.map(p => `
    <div class="product-card">
      <div class="img-wrap">
        <img src="${p.image}" alt="${p.name}" loading="lazy">
        <span class="card-badge">${p.category}</span>
      </div>
      <div class="card-body">
        <h3>${p.name}</h3>
        <span class="category-label">${p.category}</span>
        <div class="price">$${p.price.toFixed(2)}</div>
        <button onclick="addToCart(${p.id})">Add to Cart</button>
      </div>
    </div>
  `).join('');
}

// ── Cart ──
function addToCart(id) {
  const product = products.find(p => p.id === id);
  cart.push(product);
  updateCart();
  showToast(product.name);
}

function updateCart() {
  cartCount.textContent = cart.length;

  if (cart.length === 0) {
    cartItems.innerHTML = '<p class="empty-cart">Your cart is empty</p>';
  } else {
    cartItems.innerHTML = cart.map((item, i) => `
      <div class="cart-item">
        <img src="${item.image}" alt="${item.name}">
        <div class="cart-item-info">
          <div class="item-name">${item.name}</div>
          <div class="item-price">$${item.price.toFixed(2)}</div>
        </div>
        <button class="remove-btn" onclick="removeFromCart(${i})">&times;</button>
      </div>
    `).join('');
  }

  const total = cart.reduce((sum, item) => sum + item.price, 0);
  cartTotal.textContent = `$${total.toFixed(2)}`;
}

function removeFromCart(index) {
  cart.splice(index, 1);
  updateCart();
}

// ── Toast ──
function showToast(name) {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.innerHTML = `<span>${name}</span> added to cart`;
  toast.classList.add('show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('show'), 2000);
}

// ── Modal ──
cartBtn.addEventListener('click', (e) => {
  e.preventDefault();
  cartModal.style.display = 'block';
});

closeBtn.addEventListener('click', () => {
  cartModal.style.display = 'none';
});

window.addEventListener('click', (e) => {
  if (e.target === cartModal) cartModal.style.display = 'none';
});

checkoutBtn.addEventListener('click', () => {
  if (cart.length === 0) {
    alert('Your cart is empty!');
  } else {
    alert('Thank you for your purchase!');
    cart = [];
    updateCart();
    cartModal.style.display = 'none';
  }
});

// ── Init ──
renderProducts();
