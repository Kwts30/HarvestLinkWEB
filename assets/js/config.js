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

// Export for use in other files
window.API_CONFIG = API_CONFIG;

// Shared Cart Utilities - Database-backed persistent cart
window.CartUtils = {
    // Get cart from API (database)
    getCart: async function() {
        try {
            const response = await fetch('/api/cart', {
                method: 'GET',
                credentials: 'include'
            });
            
            if (response.status === 401) {
                // User not authenticated, return empty cart
                return [];
            }
            
            if (response.ok) {
                const data = await response.json();
                return data.cart || [];
            } else {
                return [];
            }
        } catch (error) {
            console.error('Error fetching cart:', error);
            return [];
        }
    },
    
    // Get cart count from API
    getCartCount: async function() {
        try {
            const response = await fetch('/api/cart', {
                method: 'GET',
                credentials: 'include'
            });
            
            if (response.status === 401) {
                // User not authenticated, return 0
                return 0;
            }
            
            if (response.ok) {
                const data = await response.json();
                return data.cartCount || 0;
            } else {
                return 0;
            }
        } catch (error) {
            console.error('Error fetching cart count:', error);
            return 0;
        }
    },
    
    // Update cart count display on current page
    updateCartCount: async function() {
        const cartCountElement = document.querySelector('.cart-count');
        if (cartCountElement) {
            const count = await this.getCartCount();
            cartCountElement.textContent = count;
        }
    },
    
    // Add item to cart via API
    addToCart: async function(product, quantity = 1) {
        try {
            const response = await fetch('/api/cart/add', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    productId: product.id || product._id,
                    quantity: quantity
                })
            });
            
            if (response.status === 401) {
                // User not authenticated, show login prompt
                if (confirm('You need to be logged in to add items to cart. Would you like to go to the login page?')) {
                    window.location.href = '/login';
                }
                throw new Error('Please log in to add items to your cart');
            }
            
            if (response.ok) {
                const data = await response.json();
                await this.updateCartCount();
                return data.cart || [];
            } else {
                const error = await response.json();
                throw new Error(error.error || 'Failed to add to cart');
            }
        } catch (error) {
            console.error('Error adding to cart:', error);
            throw error;
        }
    },
    
    // Remove item from cart via API
    removeFromCart: async function(productId) {
        try {
            const response = await fetch(`/api/cart/${productId}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            
            if (response.ok) {
                const data = await response.json();
                await this.updateCartCount();
                return data.cart || [];
            } else {
                const error = await response.json();
                throw new Error(error.error || 'Failed to remove from cart');
            }
        } catch (error) {
            console.error('Error removing from cart:', error);
            throw error;
        }
    },
    
    // Update item quantity via API
    updateQuantity: async function(productId, newQuantity) {
        try {
            const response = await fetch(`/api/cart/${productId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    quantity: newQuantity
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                await this.updateCartCount();
                return data.cart || [];
            } else {
                const error = await response.json();
                throw new Error(error.error || 'Failed to update cart');
            }
        } catch (error) {
            console.error('Error updating cart:', error);
            throw error;
        }
    },
    
    // Clear entire cart via API
    clearCart: async function() {
        try {
            const response = await fetch('/api/cart', {
                method: 'DELETE',
                credentials: 'include'
            });
            
            if (response.ok) {
                await this.updateCartCount();
                return [];
            } else {
                const error = await response.json();
                throw new Error(error.error || 'Failed to clear cart');
            }
        } catch (error) {
            console.error('Error clearing cart:', error);
            throw error;
        }
    }
};
