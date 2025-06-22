// Global cart initialization for all pages
document.addEventListener('DOMContentLoaded', function() {
    // Initialize cart count on all pages
    if (window.CartUtils) {
        window.CartUtils.updateCartCount();
    }
    
    // Set up cart icon click handler if not already set
    const cartIcon = document.querySelector('.cart-icon');
    if (cartIcon && !cartIcon.hasAttribute('data-initialized')) {
        cartIcon.addEventListener('click', function() {
            window.location.href = '/cart';
        });
        cartIcon.setAttribute('data-initialized', 'true');
    }
});
