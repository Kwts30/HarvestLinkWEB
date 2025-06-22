// API Configuration - Universal URL Detection
const API_CONFIG = (() => {
    const protocol = window.location.protocol;
    const host = window.location.host;
    const currentUrl = `${protocol}//${host}`;
    
    // Detect environment automatically
    const isLocalFile = protocol === 'file:' || host.includes(':5500');
    const isLocalhost = host.includes('localhost') || host.includes('127.0.0.1');
    
    if (isLocalFile) {
        // VS Code Live Server or file:// - connect to Express server
        return {
            BASE_URL: 'http://localhost:3000',
            API_ENDPOINT: 'http://localhost:3000/api',
            environment: 'development-file'
        };
    } else if (isLocalhost) {
        // Running on localhost - use same origin
        return {
            BASE_URL: currentUrl,
            API_ENDPOINT: `${currentUrl}/api`,
            environment: 'development-localhost'
        };
    } else {
        // Production/live server - use relative URLs
        return {
            BASE_URL: currentUrl,
            API_ENDPOINT: `${currentUrl}/api`,
            environment: 'production'
        };
    }
})();

console.log('🔧 API Config:', { 
    protocol: window.location.protocol, 
    host: window.location.host, 
    currentUrl: `${window.location.protocol}//${window.location.host}`,
    selectedConfig: API_CONFIG
});

// Export for use in other files
window.API_CONFIG = API_CONFIG;

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
