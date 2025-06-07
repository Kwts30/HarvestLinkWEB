 // Cart management system
let cart = JSON.parse(localStorage.getItem('harvestlink-cart')) || [];
let addressData = JSON.parse(localStorage.getItem('harvestlink-address')) || {};

// DOM elements
const cartItemsContainer = document.getElementById('cart-items-container');
const cartContent = document.getElementById('cart-content');
const emptyCart = document.getElementById('empty-cart');
const cartCountElement = document.querySelector('.cart-count');
const checkoutBtn = document.getElementById('checkout-btn');
const successModal = document.getElementById('success-modal');

// Initialize cart on page load
document.addEventListener('DOMContentLoaded', () => {
    loadAddressData();
    renderCart();
    updateCartCount();
    setupEventListeners();

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
    });
});

// Setup event listeners
function setupEventListeners() {
    // Checkout button
    checkoutBtn.addEventListener('click', handleCheckout);

    // Address form auto-save
    const addressInputs = ['fullName', 'phone', 'email', 'street', 'city', 'postal', 'notes'];
    addressInputs.forEach(inputId => {
        const input = document.getElementById(inputId);
        if (input) {
            input.addEventListener('blur', saveAddressData);
        }
    });
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

// Save address data
function saveAddressData() {
    const addressInputs = ['fullName', 'phone', 'email', 'street', 'city', 'postal', 'notes'];
    addressInputs.forEach(inputId => {
        const input = document.getElementById(inputId);
        if (input) {
            addressData[inputId] = input.value;
        }
    });
    localStorage.setItem('harvestlink-address', JSON.stringify(addressData));
}

// Add item to cart (called from shop page)
function addToCart(product, quantity = 1) {
    const existingItem = cart.find(item => item.id === product.id);
    
    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            image: product.image,
            quantity: quantity
        });
    }
    
    saveCart();
    updateCartCount();
    renderCart();
}

// Remove item from cart
function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    saveCart();
    updateCartCount();
    renderCart();
}

// Update item quantity
function updateQuantity(productId, newQuantity) {
    const item = cart.find(item => item.id === productId);
    if (item) {
        item.quantity = newQuantity;
        if (item.quantity <= 0) {
            removeFromCart(productId);
        } else {
            saveCart();
            updateCartCount();
            renderCart();
        }
    }
}

const hamburgerMenu = document.querySelector('.hamburger-menu');
    const navOverlay = document.querySelector('.nav-overlay');
    const closeMenuBtn = document.querySelector('.close-menu');

    if (hamburgerMenu && navOverlay && closeMenuBtn) {
        hamburgerMenu.addEventListener('click', () => {
            navOverlay.classList.add('active');
        });

        closeMenuBtn.addEventListener('click', () => {
            navOverlay.classList.remove('active');
        });
    }