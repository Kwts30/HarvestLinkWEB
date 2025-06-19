// Cart management system
let cart = [];
let addressData = JSON.parse(localStorage.getItem('harvestlink-address')) || {};

// Initialize cart from localStorage
function initCart() {
    cart = window.CartUtils.getCart();
}

// DOM elements
const cartItemsContainer = document.getElementById('cart-items-container');
const cartContent = document.getElementById('cart-content');
const emptyCart = document.getElementById('empty-cart');
const cartCountElement = document.querySelector('.cart-count');
const checkoutBtn = document.getElementById('checkout-btn');
const successModal = document.getElementById('success-modal');

// Initialize cart on page load
document.addEventListener('DOMContentLoaded', () => {
    const hamburger = document.querySelector('.hamburger');
    const hamburgerMenu = document.querySelector('.hamburger-menu');
    const navOverlay = document.querySelector('.nav-overlay');
    const closeMenu = document.querySelector('.close-menu');
    const navLinks = document.querySelectorAll('.nav-links a');
      const navbar = document.querySelector('.navbar');

    // Toggle menu on hamburger click
    hamburger.addEventListener('click', function() {
        this.classList.toggle('active');
        navOverlay.classList.toggle('active');
        document.body.style.overflow = navOverlay.classList.contains('active') ? 'hidden' : '';
        navbar.style.opacity = navOverlay.classList.contains('active') ? '0' : '1';
        navbar.style.visibility = navOverlay.classList.contains('active') ? 'hidden' : 'visible';
    });    // Close menu on close button click
    closeMenu.addEventListener('click', function() {
        hamburger.classList.remove('active');
        navOverlay.classList.remove('active');
        document.body.style.overflow = '';
        navbar.style.opacity = '1';
        navbar.style.visibility = 'visible';
    });    // Close menu when clicking a link
    navLinks.forEach(link => {
        link.addEventListener('click', function() {
            hamburger.classList.remove('active');
            navOverlay.classList.remove('active');
            document.body.style.overflow = '';
            navbar.style.opacity = '1';
            navbar.style.visibility = 'visible';
        });
    });    initCart();
    loadAddressData();
    renderCart();
    updateCartCount();
    setupEventListeners();
});

// Render cart items
function renderCart() {
    // Always show cart content layout
    showCartContent();
    
    const cartItemsList = document.getElementById('cart-items-list');
    const emptyCartMessage = document.getElementById('empty-cart-message');
    
    if (cart.length === 0) {
        // Show empty state
        emptyCartMessage.style.display = 'block';
        cartItemsList.innerHTML = '';
    } else {
        // Show cart items
        emptyCartMessage.style.display = 'none';
        
        // Clear previous items
        cartItemsList.innerHTML = '';
        
        // Add each cart item using template
        cart.forEach(item => {
            const cartItemElement = createCartItemFromTemplate(item);
            cartItemsList.appendChild(cartItemElement);
        });        
        // Setup event listeners
        setupItemEventListeners();
    }
    
    // Always update totals
    updateOrderSummary();
}

// Create cart item from template
function createCartItemFromTemplate(item) {
    const template = document.getElementById('cart-item-template');
    const cartItem = template.content.cloneNode(true);
      // Set data attributes
    const cartItemDiv = cartItem.querySelector('.cart-item');
    cartItemDiv.setAttribute('data-product-id', item.id);
    
    // Set image
    const image = cartItem.querySelector('.cart-item-image img');
    image.src = item.image || '../assets/shop/placeholder.png';
    image.alt = item.name;
    
    // Set product info
    cartItem.querySelector('.cart-item-name').textContent = item.name;
    cartItem.querySelector('.cart-item-price').textContent = `₱${parseFloat(item.price).toFixed(2)}`;
    cartItem.querySelector('.cart-item-stock').textContent = `Stock: ${item.stock || 'N/A'}`;
    
    // Set quantity
    cartItem.querySelector('.quantity-value').textContent = item.quantity;
    
    // Set total
    cartItem.querySelector('.cart-item-total').textContent = `₱${(parseFloat(item.price) * item.quantity).toFixed(2)}`;
    
    // Set up event listeners
    const minusBtn = cartItem.querySelector('.quantity-btn.minus');
    const plusBtn = cartItem.querySelector('.quantity-btn.plus');
    const deleteBtn = cartItem.querySelector('.cart-item-delete');
    
    minusBtn.addEventListener('click', () => updateQuantity(item.id, item.quantity - 1));
    plusBtn.addEventListener('click', () => updateQuantity(item.id, item.quantity + 1));
    deleteBtn.addEventListener('click', () => removeFromCart(item.id));
    
    return cartItem;
}

// Setup event listeners for cart items
function setupItemEventListeners() {
    // Remove item buttons
    document.querySelectorAll('.remove-item-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const productId = e.target.closest('.cart-item').dataset.productId;
            if (confirm('Are you sure you want to remove this item from your cart?')) {
                removeFromCart(productId);
            }
        });
    });
}

// Update order summary
function updateOrderSummary() {
    // Calculate totals for all cart items
    const subtotal = cart.reduce((total, item) => total + (parseFloat(item.price) * item.quantity), 0);
    const total = subtotal;

    // Update DOM elements
    const subtotalEl = document.getElementById('subtotal');
    const totalEl = document.getElementById('total');    
    if (subtotalEl) subtotalEl.textContent = `₱${subtotal.toFixed(2)}`;
    if (totalEl) totalEl.textContent = `₱${total.toFixed(2)}`;

    // Update checkout button
    updateCheckoutButton();
}

// Update checkout button based on cart contents
function updateCheckoutButton() {
    const checkoutBtn = document.getElementById('checkout-btn');
    if (checkoutBtn) {
        if (cart.length === 0) {
            checkoutBtn.disabled = true;
            checkoutBtn.innerHTML = '🛒 Proceed to Checkout';
        } else {
            checkoutBtn.disabled = false;
            checkoutBtn.innerHTML = '🛒 Proceed to Checkout';
        }
    }
}

// Show empty cart state
function showEmptyCart() {
    cartContent.style.display = 'none';
    emptyCart.style.display = 'flex';
}

// Show cart content
function showCartContent() {
    cartContent.style.display = 'block';
    emptyCart.style.display = 'none';
}

// Setup event listeners
function setupEventListeners() {
    // Checkout button
    checkoutBtn.addEventListener('click', handleCheckout);
}

// Load saved address data
function loadAddressData() {
    Object.keys(addressData).forEach(key => {
        const input = document.getElementById(key);
        if (input && addressData[key]) {
            input.value = addressData[key];
        }
    });
}

// Add item to cart (called from shop)
function addToCart(product, quantity = 1) {
    cart = window.CartUtils.addToCart(product, quantity);
    renderCart();
}

// Remove item from cart
function removeFromCart(productId) {
    cart = window.CartUtils.removeFromCart(productId);
    renderCart();
}

// Update item quantity
function updateQuantity(productId, newQuantity) {
    if (newQuantity < 1) {
        if (confirm('Remove this item from cart?')) {
            removeFromCart(productId);
        }
        return;
    }
    
    const itemIndex = cart.findIndex(item => item.id === productId);
    
    if (itemIndex !== -1) {
        cart[itemIndex].quantity = newQuantity;
        window.CartUtils.saveCart(cart);
        renderCart();
        updateCartCount();
        updateOrderSummary();
    }
}

// Handle checkout - check authentication first
function handleCheckout() {
    // Check if user is logged in
    if (!window.AuthUtils.isLoggedIn()) {
        // Show message and redirect to login
        if (confirm('You need to be logged in to checkout. Do you want to go to the login page?')) {
            window.location.href = '../Login webpage/login.html';
        }
        return;
    }

    // Check if cart has items
    if (cart.length === 0) {
        alert('Your cart is empty. Add some items before checkout.');
        return;
    }

    // Store all cart items for checkout
    localStorage.setItem('harvestlink-checkout-items', JSON.stringify(cart));

    // User is logged in and has items in cart - proceed to checkout
    window.location.href = '../Checkout webpage/checkout.html';
}

// Close success modal and redirect
function closeSuccessModal() {
    const successModal = document.getElementById('success-modal');
    if (successModal) {
        successModal.style.display = 'none';
    }
    // Clear cart and redirect to shop
    cart = [];
    saveCart();
    updateCartCount();
    window.location.href = '../Shop webpage/shop.html';
}

// Show success modal
function showSuccessModal() {
    const successModal = document.getElementById('success-modal');
    if (successModal) {
        successModal.style.display = 'flex';
    }
}

const hamburgerMenu = document.querySelector('.hamburger-menu');
    const navOverlay = document.querySelector('.nav-overlay');
    const closeMenuBtn = document.querySelector('.close-menu');    if (hamburgerMenu && navOverlay && closeMenuBtn) {
        hamburgerMenu.addEventListener('click', () => {
            navOverlay.classList.add('active');        });

        closeMenuBtn.addEventListener('click', () => {
            navOverlay.classList.remove('active');
        });
    }