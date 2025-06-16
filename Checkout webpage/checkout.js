document.addEventListener('DOMContentLoaded', () => {
    // Check authentication - redirect to login if not authenticated
    if (!window.AuthUtils.requireAuth()) {
        return; // Exit if redirected
    }

    const hamburger = document.querySelector('.hamburger');
    const hamburgerMenu = document.querySelector('.hamburger-menu');
    const navOverlay = document.querySelector('.nav-overlay');
    const closeMenu = document.querySelector('.close-menu');
    const navLinks = document.querySelectorAll('.nav-links a');
    const navbar = document.querySelector('.navbar');
    const completeBtn = document.querySelector('.complete-btn');

    // Display user info on checkout page
    const currentUser = window.AuthUtils.getCurrentUser();
    if (currentUser) {
        // Update any user-specific elements
        const userInfoElements = document.querySelectorAll('.user-name, [data-user-name]');
        userInfoElements.forEach(element => {
            element.textContent = `${currentUser.firstName} ${currentUser.lastName}`;
        });

        const userEmailElements = document.querySelectorAll('.user-email, [data-user-email]');
        userEmailElements.forEach(element => {
            element.textContent = currentUser.email;
        });
    }

    // Toggle menu on hamburger click
    hamburger.addEventListener('click', function() {
        this.classList.toggle('active');
        navOverlay.classList.toggle('active');
        document.body.style.overflow = navOverlay.classList.contains('active') ? 'hidden' : '';
        navbar.style.opacity = navOverlay.classList.contains('active') ? '0' : '1';
        navbar.style.visibility = navOverlay.classList.contains('active') ? 'hidden' : 'visible';
    });

    // Close menu on close button click
    closeMenu.addEventListener('click', function() {
        hamburger.classList.remove('active');
        navOverlay.classList.remove('active');
        document.body.style.overflow = '';
        navbar.style.opacity = '1';
        navbar.style.visibility = 'visible';
    });

    // Close menu when clicking a link
    navLinks.forEach(link => {
        link.addEventListener('click', function() {
            hamburger.classList.remove('active');
            navOverlay.classList.remove('active');
            document.body.style.overflow = '';
            navbar.style.opacity = '1';
            navbar.style.visibility = 'visible';
        });
    });

    // Setup complete purchase button
    if (completeBtn) {
        completeBtn.addEventListener('click', handleCompletePurchase);
    }

    loadCheckoutData();
});

// Handle complete purchase
function handleCompletePurchase() {
    // Show success message
    const successModal = document.createElement('div');
    successModal.className = 'success-modal active';
    successModal.innerHTML = `
        <div class="success-content">
            <div class="success-icon">✅</div>
            <h2>Purchase Successful!</h2>
            <p>Thank you for your order. Your purchase has been completed successfully!</p>
            <button class="success-btn" onclick="closeSuccessModal()">Continue Shopping</button>
        </div>
    `;
    document.body.appendChild(successModal);

    // Clear cart and address data
    localStorage.removeItem('harvestlink-cart');
    localStorage.removeItem('harvestlink-address');
}

// Close success modal
function closeSuccessModal() {
    const successModal = document.querySelector('.success-modal');
    if (successModal) {
        successModal.remove();
    }
    // Redirect to shop page
    window.location.href = '../Shop webpage/shop.html';
}

// Load cart and address data
function loadCheckoutData() {
    const cart = JSON.parse(localStorage.getItem('harvestlink-cart')) || [];
    const addressData = JSON.parse(localStorage.getItem('harvestlink-address')) || {};
    
    // Update cart items table
    const tbody = document.querySelector('.cart-table tbody');
    if (tbody) {
        tbody.innerHTML = ''; // Clear existing items
        
        let subtotal = 0;
        cart.forEach(item => {
            const total = item.price * item.quantity;
            subtotal += total;
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${item.name}</td>
                <td>${item.quantity}</td>
                <td>₱${item.price.toFixed(2)}</td>
                <td>₱${total.toFixed(2)}</td>
            `;
            tbody.appendChild(tr);
        });
        
        // Add total row
        const shipping = 50;
        const tax = 0;
        const totalAmount = subtotal + shipping + tax;
        
        const totalRow = document.createElement('tr');
        totalRow.className = 'total-row';
        totalRow.innerHTML = `
            <td colspan="3"><strong>Total</strong></td>
            <td><strong>₱${totalAmount.toFixed(2)}</strong></td>
        `;
        tbody.appendChild(totalRow);
        
        // Update summary
        document.querySelector('.summary-line:nth-child(1) span').textContent = `₱${subtotal.toFixed(2)}`;
        document.querySelector('.summary-line:nth-child(2) span').textContent = `₱${shipping.toFixed(2)}`;
        document.querySelector('.summary-line:nth-child(3) span').textContent = `₱${tax.toFixed(2)}`;
        document.querySelector('.summary-line.total span').textContent = `₱${totalAmount.toFixed(2)}`;
    }
    
    // Update delivery address
    const addressElement = document.querySelector('address');
    if (addressElement && addressData) {
        addressElement.innerHTML = `
            ${addressData.fullName}<br>
            ${addressData.street}<br>
            ${addressData.city}${addressData.postal ? ', ' + addressData.postal : ''}<br>
            Phone: ${addressData.phone || 'N/A'}
        `;
    }
}
