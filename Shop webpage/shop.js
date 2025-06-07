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
    });
});

// Function to create a product card
function createProductCard(product) {
    // Set product image
    const img = card.querySelector('.product-image');
    img.src = product.image;
    img.alt = product.name;

    // Set product info
    card.querySelector('.product-name').textContent = product.name;
    card.querySelector('.price').textContent = `₱${product.price.toFixed(2)}`;
    
    // Handle stock status
    const stockStatus = card.querySelector('.stock-status');
    const addToCartBtn = card.querySelector('.add-to-cart-btn');
    
    if (product.stock > 0) {
        stockStatus.textContent = `${product.stock} in stock`;
        stockStatus.classList.add('in-stock');
        addToCartBtn.textContent = 'Add to Cart';
        addToCartBtn.disabled = false;
        addToCartBtn.onclick = () => addToCart(product._id);
    } else {
        stockStatus.textContent = 'Out of Stock';
        stockStatus.classList.add('out-of-stock');
        addToCartBtn.textContent = 'Sold Out';
        addToCartBtn.disabled = true;
        addToCartBtn.classList.add('sold-out');
    }

    return card;
}

// Function to render products in the shop
function renderProducts(products) {
    const productsSection = document.querySelector('.products-section');
    const productGrid = productsSection.querySelector('.product-grid');
    const emptyState = document.querySelector('.empty-state');
    const loadingState = document.querySelector('.loading-state');

    // Remove loading state
    if (loadingState) {
        loadingState.remove();
    }

    if (!products || products.length === 0) {
        productGrid.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }

    // Hide empty state and show product grid
    emptyState.style.display = 'none';
    productGrid.style.display = 'grid';
    productGrid.innerHTML = '';

    // Add products to grid
    products.forEach(product => {
        const productCard = createProductCard(product);
        productGrid.appendChild(productCard);
    });
}

// Cart functionality
let cartCount = 0;

// Function to update cart count display
function updateCartCount() {
    const cartCountElement = document.querySelector('.cart-count');
    cartCountElement.textContent = cartCount;
}

// Function to show product detail
function showProductDetail(event) {
    // Don't show detail view if clicking on add to cart button
    if (event.target.classList.contains('add-to-cart-btn')) {
        return;
    }

    // Prevent the event from bubbling to parent elements
    event.preventDefault();
    event.stopPropagation();

    const productCard = event.currentTarget;
    const overlay = document.querySelector('.product-detail-overlay');
    
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

    // Get product info from clicked card
    const image = productCard.querySelector('.product-image').src;
    const name = productCard.querySelector('h3').textContent;
    const price = productCard.querySelector('.price').textContent;
    const stockText = productCard.querySelector('.stock-status').textContent;
    const isInStock = productCard.querySelector('.stock-status').classList.contains('in-stock');

    // Update detail view with product info
    detailImage.src = image;
    detailImage.alt = name;
    detailName.textContent = name;
    detailPrice.textContent = price;
    detailStock.textContent = stockText;
    detailStock.className = isInStock ? 'detail-stock in-stock' : 'detail-stock out-of-stock';

    // Configure add to cart button and quantity input
    if (isInStock) {
        detailAddToCartBtn.textContent = 'Add to Cart';
        detailAddToCartBtn.disabled = false;
        detailAddToCartBtn.classList.remove('sold-out');
        quantityInput.disabled = false;
    } else {
        detailAddToCartBtn.textContent = 'Sold Out';
        detailAddToCartBtn.disabled = true;
        detailAddToCartBtn.classList.add('sold-out');
        quantityInput.disabled = true;
    }

    // Show overlay
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
}

// Function to close product detail view
function closeProductDetail() {
    const overlay = document.querySelector('.product-detail-overlay');
    overlay.classList.remove('active');
    document.body.style.overflow = ''; // Restore scrolling
}

// Function to handle image loading
function handleImageLoad(img) {
    img.addEventListener('load', () => {
        img.classList.add('loaded');
    });
}

// Initialize when the document is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Add click event listeners to product cards
    const productCards = document.querySelectorAll('.product-card');
    productCards.forEach(card => {
        card.addEventListener('click', showProductDetail);
    });

    // Back button functionality
    const backButton = document.querySelector('.back-button');
    if (backButton) {
        backButton.addEventListener('click', closeProductDetail);
    }

    // Close detail view with Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeProductDetail();
        }
    });

    // Close detail view when clicking outside content
    const overlay = document.querySelector('.product-detail-overlay');
    const detailContent = document.querySelector('.product-detail-content');
    
    if (overlay && detailContent) {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                closeProductDetail();
            }
        });

        // Prevent clicks inside content from closing
        detailContent.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }

    // Quantity controls
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
            quantityInput.value = currentValue + 1;
        });

        // Prevent form submission when pressing enter in quantity input
        quantityInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
            }
        });
    }

    // Add to cart functionality
    const detailAddToCartBtn = document.querySelector('.detail-add-to-cart');
    if (detailAddToCartBtn) {
        detailAddToCartBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (!detailAddToCartBtn.disabled) {
                const quantity = parseInt(quantityInput.value);
                cartCount += quantity;
                updateCartCount();
                
                // Show feedback
                const originalText = detailAddToCartBtn.textContent;
                detailAddToCartBtn.textContent = 'Added to Cart!';
                setTimeout(() => {
                    detailAddToCartBtn.textContent = originalText;
                }, 1500);
            }
        });
    }

    // Prevent "Add to Cart" button clicks from triggering product detail view
    const addToCartBtns = document.querySelectorAll('.add-to-cart-btn');
    addToCartBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!btn.disabled) {
                cartCount++;
                updateCartCount();
                
                // Show feedback
                const originalText = btn.textContent;
                btn.textContent = 'Added!';
                setTimeout(() => {
                    btn.textContent = originalText;
                }, 1000);
            }
        });
    });
});