// Document ready
document.addEventListener('DOMContentLoaded', function () {

  /* ---------------- PAGE DETECTION ---------------- */
  const isIndexPage = window.location.pathname.includes("index.html") || window.location.pathname === "/";
  const cartKey = isIndexPage ? "cart_index" : "cart_shop";

  /* ---------------- PRELOADER ---------------- */
  setTimeout(() => {
    const preloader = document.getElementById('preloader');
    if (preloader) {
      preloader.style.opacity = '0';
      setTimeout(() => (preloader.style.display = 'none'), 500);
    }
  }, 1000);

  /* ---------------- CART OVERLAY OPEN/CLOSE ---------------- */
  const cartBtn = document.getElementById('cart-btn');
  const cartOverlay = document.getElementById('cart-overlay');
  const closeCartBtn = document.getElementById('close-cart-btn');

  if (cartBtn && cartOverlay && closeCartBtn) {
    cartBtn.addEventListener('click', () => {
      cartOverlay.classList.remove('hidden');
      const innerDiv = cartOverlay.querySelector('.transform');
      if (innerDiv) setTimeout(() => innerDiv.classList.remove('translate-x-full'), 10);
      document.body.style.overflowY = 'hidden';
      renderCart();
    });

    closeCartBtn.addEventListener('click', () => {
      const innerDiv = cartOverlay.querySelector('.transform');
      if (innerDiv) innerDiv.classList.add('translate-x-full');
      setTimeout(() => cartOverlay.classList.add('hidden'), 300);
      document.body.style.overflowY = 'auto';
    });
  }

  /* ---------------- CART LOGIC ---------------- */
  const cartCount = document.getElementById('cart-count');
  const cartSubtotal = document.getElementById('cart-subtotal');
  const cartItemsContainer = document.getElementById('cart-items');
  const payNowBtn = document.getElementById('paynow-btn');

  let cart = JSON.parse(localStorage.getItem(cartKey)) || [];
  let total = 0;

  updateCartCount();
  renderCart();

  document.querySelectorAll('.add-to-cart').forEach(button => {
    button.addEventListener('click', function () {
      const id = this.dataset.id;
      const name = this.dataset.name;
      const price = parseFloat(this.dataset.price);
      if (!id || !name || isNaN(price)) return;

      const existing = cart.find(item => item.id === id);
      if (existing) existing.quantity++;
      else cart.push({ id, name, price, quantity: 1 });

      saveCart();
      this.classList.add('animate-pulse');
      setTimeout(() => this.classList.remove('animate-pulse'), 500);
    });
  });

  function saveCart() {
    localStorage.setItem(cartKey, JSON.stringify(cart));
    updateCartCount();
    renderCart();
  }

  function updateCartCount() {
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    if (cartCount) cartCount.textContent = count;
  }

  function renderCart() {
    if (!cartItemsContainer) return;
    if (cart.length === 0) {
      cartItemsContainer.innerHTML = `
        <div class="text-center py-20 text-gray-500">
          <i class="fas fa-shopping-cart text-4xl mb-4"></i>
          <p class="text-lg">Your cart is empty</p>
        </div>`;
      if (cartSubtotal) cartSubtotal.textContent = "₹0.00";
      if (payNowBtn) payNowBtn.disabled = true;
      return;
    }

    total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    if (cartSubtotal) cartSubtotal.textContent = `₹${total.toFixed(2)}`;
    if (payNowBtn) payNowBtn.disabled = false;

    let html = "";
    cart.forEach(item => {
      html += `
        <div class="flex items-center mb-6 pb-6 border-b last:border-0">
          <div class="w-20 h-20 rounded-lg overflow-hidden">
            <img src="https://placehold.co/200x200" alt="${item.name}" class="w-full h-full object-cover">
          </div>
          <div class="ml-4 flex-grow">
            <h4 class="font-semibold">${item.name}</h4>
            <div class="flex justify-between items-center mt-2">
              <span class="text-purple-600 font-bold">₹${item.price.toFixed(2)}</span>
              <div class="flex items-center">
                <button class="qty-btn decrease w-8 h-8 bg-gray-100 rounded-full" data-id="${item.id}">-</button>
                <span class="mx-3">${item.quantity}</span>
                <button class="qty-btn increase w-8 h-8 bg-gray-100 rounded-full" data-id="${item.id}">+</button>
              </div>
            </div>
          </div>
          <button class="remove-btn ml-4 text-gray-500 hover:text-red-500" data-id="${item.id}">
            <i class="fas fa-times"></i>
          </button>
        </div>`;
    });

    cartItemsContainer.innerHTML = html;

    document.querySelectorAll('.qty-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const item = cart.find(i => i.id === id);
        if (!item) return;
        if (btn.classList.contains('increase')) item.quantity++;
        else item.quantity = Math.max(1, item.quantity - 1);
        saveCart();
      });
    });

    document.querySelectorAll('.remove-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        cart = cart.filter(i => i.id !== id);
        saveCart();
      });
    });
  }

  /* ---------------- PAYMENT FLOW ---------------- */
  const paymentOptionOverlay = document.getElementById('payment-option-overlay');
  const codBtn = document.getElementById('cod-btn');
  const qrPayBtn = document.getElementById('qrpay-btn');
  const closePaymentOption = document.getElementById('close-payment-option');
  const successOverlay = document.getElementById('success-overlay');
  const closeSuccess = document.getElementById('close-success');
  const qrOverlay = document.getElementById('qr-overlay');
  const qrImg = document.getElementById('qr-img');
  const confirmOrderBtn = document.getElementById('confirm-order');
  const closeQrBtn = document.getElementById('close-qr');

  payNowBtn?.addEventListener('click', () => {
    paymentOptionOverlay?.classList.remove('hidden');
    document.body.style.overflowY = 'hidden';
  });

  closePaymentOption?.addEventListener('click', () => {
    paymentOptionOverlay?.classList.add('hidden');
    document.body.style.overflowY = 'auto';
  });

  codBtn?.addEventListener('click', async () => {
    paymentOptionOverlay.classList.add('hidden');
    await sendOrderToServer("Cash on Delivery");
    showOrderSuccess("Cash on Delivery selected. Order placed!");
  });

  qrPayBtn?.addEventListener('click', () => {
    const amount = total.toFixed(2);
    qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=upi://pay?pa=8980036624@ibl&pn=ElixirBeauty&am=${amount}`;
    paymentOptionOverlay.classList.add('hidden');
    qrOverlay.classList.remove('hidden');
    document.body.style.overflowY = 'hidden';
  });

  confirmOrderBtn?.addEventListener('click', async () => {
    qrOverlay.classList.add('hidden');
    await sendOrderToServer("QR Payment");
    showOrderSuccess("Payment successful. Order placed!");
  });

  closeQrBtn?.addEventListener('click', () => {
    qrOverlay.classList.add('hidden');
    document.body.style.overflowY = 'auto';
  });

  closeSuccess?.addEventListener('click', () => {
    successOverlay.classList.add('hidden');
    document.body.style.overflowY = 'auto';
    cart = [];
    saveCart();
  });

  function showOrderSuccess(msg) {
    successOverlay.classList.remove('hidden');
    const p = successOverlay.querySelector('p');
    if (p) p.textContent = msg;
    document.body.style.overflowY = 'hidden';
  }

  /* 🚀 SEND ORDER TO BACKEND + EMAIL */
  async function sendOrderToServer(paymentMethod) {
    if (!cart.length) return alert("Your cart is empty!");

    const name = prompt("Enter your full name:");
    const email = prompt("Enter your email to receive order confirmation:");
    if (!email || !name) return alert("Email and name are required!");

    const orderData = {
      name,
      email,
      paymentMethod,
      totalAmount: total.toFixed(2),
      items: cart
    };

    try {
      const res = await fetch("http://localhost:5000/api/save-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData)
      });

      const data = await res.json();
      if (data.success) {
        console.log("✅ Order saved successfully and mail sent!");
      } else {
        console.error("❌ Backend error:", data.message);
      }
    } catch (err) {
      console.error("❌ Error saving order:", err);
    }
  }
});
