// Shop functionality
class ShopManager {
    constructor() {
        this.products = [];
        this.cartCount = 0;
        this.apiConfig = this.setupApiConfig();
        this.init();
    }

    // Setup API configuration for public shop access
    setupApiConfig() {
        const currentHost = window.location.host;
        const currentProtocol = window.location.protocol;
        
        // Determine the base URL based on the current domain
        let baseUrl;
        
        if (currentHost.includes('127.0.0.1:5500') || currentHost.includes('localhost:5500')) {
            // VS Code Live Preview - connect to the actual server
            baseUrl = 'http://localhost:3000';
        } else if (currentHost.includes('localhost') || currentHost.includes('127.0.0.1')) {
            // Local development on the same server
            baseUrl = `${currentProtocol}//${currentHost}`;
        } else {
            // Live domain - use the current domain
            baseUrl = `${currentProtocol}//${currentHost}`;
        }
        
        return {
            baseUrl: baseUrl,
            apiPath: '/api'  // Use public API path, not admin
        };
    }

    init() {
        this.setupNavigationHandlers();
        this.loadProducts();
        this.setupProductDetailHandlers();
        this.setupCartHandlers();
        this.setupFilterHandlers(); // Add filter/search handlers
    }

    // API helper method for public shop endpoints
    buildApiUrl(endpoint) {
        const url = `${this.apiConfig.baseUrl}${this.apiConfig.apiPath}${endpoint}`;
        return url;
    }

    // Load products from database
    async loadProducts() {
        try {
            this.showLoading();
            // Fetch only active products for the shop
            const apiUrl = this.buildApiUrl('/products?isActive=true&limit=100');
            const response = await fetch(apiUrl, {
                credentials: 'include'
            });
            if (response.ok) {
                const data = await response.json();
                this.products = data.products || [];
                this.renderCategoryOptions(); // Populate categories
                this.applyFilters(); // Render filtered products
            } else {
                this.showError('Failed to load products.');
            }
        } catch (error) {
            console.error('Error loading products:', error);
            this.showError('Unable to connect to the server. Please check your connection and try again.');
        } finally {
            this.hideLoading();
        }
    }

    // Populate category dropdown from products
    renderCategoryOptions() {
        const categorySelect = document.querySelector('.shop-filter-category');
        if (!categorySelect) return;
        // Get unique categories
        const categories = [...new Set(this.products.map(p => p.category).filter(Boolean))];
        categorySelect.innerHTML = '<option value="">All Categories</option>' +
            categories.map(cat => `<option value="${cat}">${cat}</option>`).join('');
    }

    // Show loading state
    showLoading() {
        const productGrid = document.querySelector('.product-grid');
        if (productGrid) {
            productGrid.innerHTML = `
                <div class="loading-state">
                    <div class="loading-spinner"></div>
                    <p>Loading products...</p>
                </div>
            `;
        }
    }

    // Hide loading state
    hideLoading() {
        const loadingState = document.querySelector('.loading-state');
        if (loadingState) {
            loadingState.remove();
        }
    }

    // Show error message
    showError(message) {
        const productGrid = document.querySelector('.product-grid');
        if (productGrid) {
            productGrid.innerHTML = `
                <div class="error-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Error Loading Products</h3>
                    <p>${message}</p>
                    <button class="btn-retry" onclick="shopManager.loadProducts()">Try Again</button>
                </div>
            `;
        }
    }

    // Create product card from database data
    createProductCard(product) {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.dataset.productId = product._id;

        // Handle image URL - use database image or show placeholder
        let imageHtml = '';
        if (product.image && product.image.trim() !== '') {
            imageHtml = `<img src="${product.image}" alt="${product.name}" class="product-image" 
                         onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                         <div class="image-placeholder" style="display: none;">
                             <i class="fas fa-image"></i>
                             <span>No Image</span>
                         </div>`;
        } else {
            imageHtml = `<div class="image-placeholder">
                             <i class="fas fa-image"></i>
                             <span>No Image</span>
                         </div>`;
        }
        
        card.innerHTML = `
            <div class="product-image-container">
                ${imageHtml}
            </div>
            <div class="product-info">
                <h3>${product.name}</h3>
                <p class="price">₱${parseFloat(product.price).toFixed(2)}</p>
                <p class="stock-status ${product.stock > 0 ? 'in-stock' : 'out-of-stock'}">
                    ${product.stock > 0 ? `${product.stock} in stock` : 'Out of Stock'}
                </p>
                <button class="add-to-cart-btn ${product.stock <= 0 ? 'sold-out' : ''}" 
                        ${product.stock <= 0 ? 'disabled' : ''}>
                    ${product.stock > 0 ? 'Add to Cart' : 'Sold Out'}
                </button>
            </div>
        `;

        // Add click event listener for product detail view
        card.addEventListener('click', (e) => this.showProductDetail(e, product));

        return card;
    }

    // Render products in the shop
    renderProducts(products) {
        const productGrid = document.querySelector('.product-grid');
        if (!productGrid) return;

        if (!products || products.length === 0) {
            productGrid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-seedling"></i>
                    <h3>No Products Available</h3>
                    <p>Fresh products will be available soon!</p>
                </div>
            `;
            return;
        }

        // Clear the grid and add products
        productGrid.innerHTML = '';
        products.forEach(product => {
            const productCard = this.createProductCard(product);
            productGrid.appendChild(productCard);
        });

        // Setup add to cart button handlers
        this.setupAddToCartHandlers();
    }

    // Setup add to cart handlers
    setupAddToCartHandlers() {
        const addToCartBtns = document.querySelectorAll('.add-to-cart-btn:not(.sold-out)');
        addToCartBtns.forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const productCard = e.target.closest('.product-card');
                const productId = productCard.dataset.productId;
                await this.addToCart(productId);
            });
        });
    }

    // Add product to cart
    async addToCart(productId, quantity = 1) {
        const product = this.products.find(p => p._id === productId);
        if (!product || product.stock <= 0) return;

        // Use shared cart utilities
        const productData = {
            id: productId,
            name: product.name,
            price: product.price,
            image: product.image,
            stock: product.stock
        };
        
        try {
            await window.CartUtils.addToCart(productData, quantity);
            // Show feedback
            const productCard = document.querySelector(`[data-product-id="${productId}"]`);
            if (productCard) {
                const btn = productCard.querySelector('.add-to-cart-btn');
                if (btn) {
                    const originalText = btn.textContent;
                    btn.textContent = 'Added!';
                    btn.style.backgroundColor = '#45a049';
                    setTimeout(() => {
                        btn.textContent = originalText;
                        btn.style.backgroundColor = '';
                    }, 1000);
                }
            }
        } catch (error) {
            console.error('Error adding to cart:', error);
            // Show error feedback
            const productCard = document.querySelector(`[data-product-id="${productId}"]`);
            if (productCard) {
                const btn = productCard.querySelector('.add-to-cart-btn');
                if (btn) {
                    const originalText = btn.textContent;
                    btn.textContent = 'Error!';
                    btn.style.backgroundColor = '#dc3545';
                    setTimeout(() => {
                        btn.textContent = originalText;
                        btn.style.backgroundColor = '';
                    }, 2000);
                }
            }
            // Show user-friendly error message
            alert(error.message || 'Failed to add item to cart. Please try again.');
        }
    }

    // Update cart count display
    async updateCartCount() {
        await window.CartUtils.updateCartCount();
    }

    // Load cart from localStorage
    async loadCartFromStorage() {
        await window.CartUtils.updateCartCount();
    }

    // Show product detail
    showProductDetail(event, product) {
        // Don't show detail view if clicking on add to cart button
        if (event.target.classList.contains('add-to-cart-btn')) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        const overlay = document.querySelector('.product-detail-overlay');
        if (!overlay) return;
        
        // Get elements from the detail view
        const detailImage = overlay.querySelector('.detail-image');
        const detailName = overlay.querySelector('.detail-name');
        const detailPrice = overlay.querySelector('.detail-price');
        const detailStock = overlay.querySelector('.detail-stock');
        const detailAddToCartBtn = overlay.querySelector('.detail-add-to-cart');
        const quantityInput = overlay.querySelector('#quantity');

        // Reset quantity input
        if (quantityInput) {
            quantityInput.value = 1;
        }

        // Handle image URL in detail view
        if (product.image && product.image.trim() !== '') {
            detailImage.src = product.image;
            detailImage.style.display = 'block';
            detailImage.onerror = () => { 
                detailImage.style.display = 'none';
                const placeholder = detailImage.parentElement.querySelector('.detail-image-placeholder');
                if (placeholder) {
                    placeholder.style.display = 'flex';
                }
            };
        } else {
            detailImage.style.display = 'none';
            // Create placeholder if it doesn't exist
            let placeholder = detailImage.parentElement.querySelector('.detail-image-placeholder');
            if (!placeholder) {
                placeholder = document.createElement('div');
                placeholder.className = 'detail-image-placeholder';
                placeholder.innerHTML = '<i class="fas fa-image"></i><span>No Image Available</span>';
                detailImage.parentElement.appendChild(placeholder);
            }
            placeholder.style.display = 'flex';
        }
        
        detailName.textContent = product.name;
        detailPrice.textContent = `₱${parseFloat(product.price).toFixed(2)}`;
        
        const stockText = product.stock > 0 ? `${product.stock} in stock` : 'Out of Stock';
        detailStock.textContent = stockText;
        detailStock.className = product.stock > 0 ? 'detail-stock in-stock' : 'detail-stock out-of-stock';

        // Configure add to cart button and quantity input
        if (product.stock > 0) {
            detailAddToCartBtn.textContent = 'Add to Cart';
            detailAddToCartBtn.disabled = false;
            detailAddToCartBtn.classList.remove('sold-out');
            detailAddToCartBtn.dataset.productId = product._id;
            
            if (quantityInput) {
                quantityInput.disabled = false;
                quantityInput.max = product.stock;
            }
        } else {
            detailAddToCartBtn.textContent = 'Sold Out';
            detailAddToCartBtn.disabled = true;
            detailAddToCartBtn.classList.add('sold-out');
            
            if (quantityInput) {
                quantityInput.disabled = true;
            }
        }

        // Show overlay
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    // Close product detail view
    closeProductDetail() {
        const overlay = document.querySelector('.product-detail-overlay');
        if (overlay) {
            overlay.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    // Setup product detail handlers
    setupProductDetailHandlers() {
        // Back button functionality
        const backButton = document.querySelector('.back-button');
        if (backButton) {
            backButton.addEventListener('click', () => this.closeProductDetail());
        }

        // Close detail view with Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeProductDetail();
            }
        });

        // Close detail view when clicking outside content
        const overlay = document.querySelector('.product-detail-overlay');
        const detailContent = document.querySelector('.product-detail-content');
        
        if (overlay && detailContent) {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    this.closeProductDetail();
                }
            });

            detailContent.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }

        // Quantity controls
        this.setupQuantityControls();

        // Detail add to cart functionality
        this.setupDetailAddToCart();
    }

    // Setup quantity controls
    setupQuantityControls() {
        const quantityInput = document.querySelector('#quantity');
        const minusBtn = document.querySelector('.quantity-btn.minus');
        const plusBtn = document.querySelector('.quantity-btn.plus');

        if (minusBtn && plusBtn && quantityInput) {
            minusBtn.addEventListener('click', (e) => {
                e.preventDefault();
                const currentValue = parseInt(quantityInput.value);
                if (currentValue > 1) {
                    quantityInput.value = currentValue - 1;
                }
            });

            plusBtn.addEventListener('click', (e) => {
                e.preventDefault();
                const currentValue = parseInt(quantityInput.value);
                const maxValue = parseInt(quantityInput.max) || 999;
                if (currentValue < maxValue) {
                    quantityInput.value = currentValue + 1;
                }
            });

            quantityInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                }
            });
        }
    }

    // Setup detail add to cart
    setupDetailAddToCart() {
        const detailAddToCartBtn = document.querySelector('.detail-add-to-cart');
        if (detailAddToCartBtn) {
            detailAddToCartBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                if (!detailAddToCartBtn.disabled) {
                    const productId = detailAddToCartBtn.dataset.productId;
                    const quantityInput = document.querySelector('#quantity');
                    const quantity = quantityInput ? parseInt(quantityInput.value) : 1;
                    
                    await this.addToCart(productId, quantity);
                    
                    // Show feedback
                    const originalText = detailAddToCartBtn.textContent;
                    detailAddToCartBtn.textContent = 'Added to Cart!';
                    detailAddToCartBtn.style.backgroundColor = '#45a049';
                    
                    setTimeout(() => {
                        detailAddToCartBtn.textContent = originalText;
                        detailAddToCartBtn.style.backgroundColor = '';
                    }, 1500);
                }
            });
        }
    }

    // Setup cart handlers
    setupCartHandlers() {
        // Load cart count from storage
        this.loadCartFromStorage();
        
        // Cart icon click handler
        const cartIcon = document.querySelector('.cart-icon');
        if (cartIcon) {
            cartIcon.addEventListener('click', () => {
                window.location.href = window.AuthUtils ? window.AuthUtils.createUrl('/cart') : '/cart';
            });
        }
    }

    // Setup navigation handlers
    setupNavigationHandlers() {
        const hamburger = document.querySelector('.hamburger');
        const hamburgerMenu = document.querySelector('.hamburger-menu');
        const navOverlay = document.querySelector('.nav-overlay');
        const closeMenu = document.querySelector('.close-menu');
        const navLinks = document.querySelectorAll('.nav-links a');
        const navbar = document.querySelector('.navbar');

        if (hamburger && navOverlay) {
            hamburger.addEventListener('click', function() {
                this.classList.toggle('active');
                navOverlay.classList.toggle('active');
                document.body.style.overflow = navOverlay.classList.contains('active') ? 'hidden' : '';
                if (navbar) {
                    navbar.style.opacity = navOverlay.classList.contains('active') ? '0' : '1';
                    navbar.style.visibility = navOverlay.classList.contains('active') ? 'hidden' : 'visible';
                }
            });
        }

        if (closeMenu) {
            closeMenu.addEventListener('click', function() {
                hamburger.classList.remove('active');
                navOverlay.classList.remove('active');
                document.body.style.overflow = '';
                if (navbar) {
                    navbar.style.opacity = '1';
                    navbar.style.visibility = 'visible';
                }
            });
        }

        navLinks.forEach(link => {
            link.addEventListener('click', function() {
                hamburger.classList.remove('active');
                navOverlay.classList.remove('active');
                document.body.style.overflow = '';
                if (navbar) {
                    navbar.style.opacity = '1';
                    navbar.style.visibility = 'visible';
                }
            });
        });
    }

    // Setup filter/search handlers
    setupFilterHandlers() {
        const searchInput = document.querySelector('.shop-search');
        const categorySelect = document.querySelector('.shop-filter-category');
        const stockSelect = document.querySelector('.shop-filter-stock');
        if (searchInput) {
            searchInput.addEventListener('input', () => this.applyFilters());
        }
        if (categorySelect) {
            categorySelect.addEventListener('change', () => this.applyFilters());
        }
        if (stockSelect) {
            stockSelect.addEventListener('change', () => this.applyFilters());
        }
    }

    // Filter and render products based on search and filters
    applyFilters() {
        const searchInput = document.querySelector('.shop-search');
        const categorySelect = document.querySelector('.shop-filter-category');
        const stockSelect = document.querySelector('.shop-filter-stock');
        let filtered = [...this.products];
        // Search
        const search = searchInput ? searchInput.value.trim().toLowerCase() : '';
        if (search) {
            filtered = filtered.filter(p =>
                (p.name && p.name.toLowerCase().includes(search)) ||
                (p.description && p.description.toLowerCase().includes(search))
            );
        }
        // Category
        const category = categorySelect ? categorySelect.value : '';
        if (category) {
            filtered = filtered.filter(p => p.category === category);
        }
        // Stock
        const stock = stockSelect ? stockSelect.value : '';
        if (stock === 'in') {
            filtered = filtered.filter(p => p.stock > 0);
        } else if (stock === 'out') {
            filtered = filtered.filter(p => p.stock <= 0);
        }
        // Sort by name (optional, can add more sort options)
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        this.renderProducts(filtered);
    }
}

// Initialize the shop manager when the DOM is loaded
let shopManager;
document.addEventListener('DOMContentLoaded', () => {
    shopManager = new ShopManager();
});