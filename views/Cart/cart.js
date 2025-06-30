// Cart management system - Database-backed persistent cart
let cart = [];
let addressData = JSON.parse(localStorage.getItem('harvestlink-address')) || {};

// Initialize cart from API
async function initCart() {
    try {
        cart = await window.CartUtils.getCart();
    } catch (error) {
        console.error('Error loading cart:', error);
        cart = [];
    }
}

// DOM elements
const cartItemsContainer = document.getElementById('cart-items-container');
const cartContent = document.getElementById('cart-content');
const emptyCart = document.getElementById('empty-cart');
const cartCountElement = document.querySelector('.cart-count');
const checkoutBtn = document.getElementById('checkout-btn');
const successModal = document.getElementById('success-modal');

// Initialize cart on page load
document.addEventListener('DOMContentLoaded', async () => {
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
    
    await initCart();
    loadAddressData();
    renderCart();
    await updateCartCount();
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
    
    // Handle both old cart format and new API format
    const productId = item.productId?._id || item.productId || item.id || item._id;
    const productInfo = item.productId || item; // For populated product data
    
    // Set data attributes
    const cartItemDiv = cartItem.querySelector('.cart-item');
    cartItemDiv.setAttribute('data-product-id', productId);
    
    // Set image - ensure proper handling of database images
    const image = cartItem.querySelector('.cart-item-image img');
    
    // Check if product has a valid image from database
    const hasValidImage = productInfo.image && 
                         productInfo.image.trim() !== '' && 
                         !productInfo.image.includes('placeholder.png') &&
                         productInfo.image !== 'undefined' &&
                         productInfo.image !== 'null';
    
    if (hasValidImage) {
        // Product has a real image from database
        image.src = productInfo.image;
        image.alt = productInfo.name || 'Product';
        // Ensure clean styling - no background images that might show "No Image"
        image.style.background = 'none';
        image.style.backgroundImage = 'none';
        image.style.backgroundColor = '#f8f9fa';
        
        // Handle load errors gracefully
        image.onerror = function() {
            this.src = '/assets/shop/placeholder.png';
            this.style.background = 'none';
            this.style.backgroundImage = 'none';
            this.style.backgroundColor = '#f8f9fa';
            this.onerror = null; // Prevent infinite error loops
        };
    } else {
        // Use placeholder only when no real image exists
        image.src = '/assets/shop/placeholder.png';
        image.alt = productInfo.name || 'Product';
        image.style.background = 'none';
        image.style.backgroundImage = 'none';
        image.style.backgroundColor = '#f8f9fa';
        image.onerror = null;
    }
    
    // Set product info
    cartItem.querySelector('.cart-item-name').textContent = productInfo.name || 'Unknown Product';
    cartItem.querySelector('.cart-item-price').textContent = `₱${parseFloat(item.price || productInfo.price || 0).toFixed(2)}`;
    cartItem.querySelector('.cart-item-stock').textContent = `Stock: ${productInfo.stock || 'N/A'}`;
    
    // Set quantity
    cartItem.querySelector('.quantity-value').textContent = item.quantity || 0;
    
    // Set total
    const itemPrice = parseFloat(item.price || productInfo.price || 0);
    const itemQuantity = item.quantity || 0;
    cartItem.querySelector('.cart-item-total').textContent = `₱${(itemPrice * itemQuantity).toFixed(2)}`;
    
    // Set up event listeners
    const minusBtn = cartItem.querySelector('.quantity-btn.minus');
    const plusBtn = cartItem.querySelector('.quantity-btn.plus');
    const deleteBtn = cartItem.querySelector('.cart-item-delete');
    
    minusBtn.addEventListener('click', () => updateQuantity(productId, itemQuantity - 1));
    plusBtn.addEventListener('click', () => updateQuantity(productId, itemQuantity + 1));
    deleteBtn.addEventListener('click', () => removeFromCart(productId));
    
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
    // Calculate totals for all cart items, handling both old and new cart formats
    const subtotal = cart.reduce((total, item) => {
        const itemPrice = parseFloat(item.price || (item.productId && item.productId.price) || 0);
        const itemQuantity = item.quantity || 0;
        return total + (itemPrice * itemQuantity);
    }, 0);
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
async function addToCart(product, quantity = 1) {
    try {
        cart = await window.CartUtils.addToCart(product, quantity);
        renderCart();
        await updateCartCount();
    } catch (error) {
        console.error('Error adding to cart:', error);
        alert(error.message || 'Failed to add item to cart');
    }
}

// Remove item from cart
async function removeFromCart(productId) {
    try {
        cart = await window.CartUtils.removeFromCart(productId);
        renderCart();
        await updateCartCount();
    } catch (error) {
        console.error('Error removing from cart:', error);
        alert(error.message || 'Failed to remove item from cart');
    }
}

// Update item quantity
async function updateQuantity(productId, newQuantity) {
    if (newQuantity < 1) {
        if (confirm('Remove this item from cart?')) {
            await removeFromCart(productId);
        }
        return;
    }
    
    try {
        cart = await window.CartUtils.updateQuantity(productId, newQuantity);
        renderCart();
        await updateCartCount();
    } catch (error) {
        console.error('Error updating quantity:', error);
        alert(error.message || 'Failed to update quantity');
    }
}

// Handle checkout - check authentication first
function handleCheckout() {
    // Check if user is logged in
    if (!window.AuthUtils.isLoggedIn()) {
        // Show message and redirect to login
        if (confirm('You need to be logged in to checkout. Do you want to go to the login page?')) {
            window.location.href = window.AuthUtils ? window.AuthUtils.createUrl('/login') : '/login';
        }
        return;
    }

    // Check if cart has items
    if (cart.length === 0) {
        alert('Your cart is empty. Add some items before checkout.');
        return;
    }

    // User is logged in and has items in cart - proceed to checkout directly
    // The checkout page will load the cart from the API
    window.location.href = window.AuthUtils ? window.AuthUtils.createUrl('/checkout') : '/checkout';
}

// Close success modal and redirect
async function closeSuccessModal() {
    const successModal = document.getElementById('success-modal');
    if (successModal) {
        successModal.style.display = 'none';
    }
    // Clear cart and redirect to shop
    try {
        await window.CartUtils.clearCart();
        cart = [];
    } catch (error) {
        console.error('Error clearing cart:', error);
    }
    window.location.href = window.AuthUtils ? window.AuthUtils.createUrl('/shop') : '/shop';
}

// Update cart count display
async function updateCartCount() {
    await window.CartUtils.updateCartCount();
}

// Show success modal
function showSuccessModal() {
    const successModal = document.getElementById('success-modal');
    if (successModal) {
        successModal.style.display = 'flex';
    }
}