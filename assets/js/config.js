// API Configuration
const API_CONFIG = {
    // Development - when using Live Server or file:// protocol
    development: {
        BASE_URL: 'http://localhost:3000',
        API_ENDPOINT: 'http://localhost:3000/api'
    },
    // Production - when serving through Express server
    production: {
        BASE_URL: '',  // Same origin
        API_ENDPOINT: '/api'
    }
};

// Auto-detect environment
const isLocalFile = window.location.protocol === 'file:' || window.location.port === '5500';
const isLocalhost3000 = window.location.host === 'localhost:3000' || window.location.host === '127.0.0.1:3000';

let currentConfig;
if (isLocalFile) {
    currentConfig = API_CONFIG.development;
} else if (isLocalhost3000) {
    // When serving from localhost:3000, use full URL
    currentConfig = API_CONFIG.development;
} else {
    currentConfig = API_CONFIG.production;
}

console.log('🔧 API Config:', { 
    protocol: window.location.protocol, 
    host: window.location.host, 
    port: window.location.port,
    isLocalFile,
    isLocalhost3000,
    selectedConfig: currentConfig
});

// Export for use in other files
window.API_CONFIG = currentConfig;

// Shared Cart Utilities
window.CartUtils = {
    // Get cart from localStorage
    getCart: function() {
        return JSON.parse(localStorage.getItem('harvestlink-cart')) || [];
    },
    
    // Save cart to localStorage
    saveCart: function(cart) {
        localStorage.setItem('harvestlink-cart', JSON.stringify(cart));
    },
    
    // Get cart count
    getCartCount: function() {
        const cart = this.getCart();
        return cart.reduce((total, item) => total + item.quantity, 0);
    },
    
    // Update cart count display on current page
    updateCartCount: function() {
        const cartCountElement = document.querySelector('.cart-count');
        if (cartCountElement) {
            cartCountElement.textContent = this.getCartCount();
        }
    },
    
    // Add item to cart
    addToCart: function(product, quantity = 1) {
        let cart = this.getCart();
        const existingItem = cart.find(item => item.id === product.id);
        
        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            cart.push({
                id: product.id,
                name: product.name,
                price: product.price,
                image: product.image,
                quantity: quantity,
                stock: product.stock
            });
        }
        
        this.saveCart(cart);
        this.updateCartCount();
        return cart;
    },
    
    // Remove item from cart
    removeFromCart: function(productId) {
        let cart = this.getCart();
        cart = cart.filter(item => item.id !== productId);
        this.saveCart(cart);
        this.updateCartCount();
        return cart;
    },
    
    // Update item quantity
    updateQuantity: function(productId, newQuantity) {
        let cart = this.getCart();
        const item = cart.find(item => item.id === productId);
        
        if (item) {
            if (newQuantity <= 0) {
                cart = cart.filter(item => item.id !== productId);
            } else {
                item.quantity = newQuantity;
            }
            this.saveCart(cart);
            this.updateCartCount();
        }
        return cart;
    }
};
