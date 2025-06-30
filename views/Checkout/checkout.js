class CheckoutManager {
    constructor() {
        this.selectedAddressId = null;
        this.selectedPaymentMethod = null;
        this.selectedBank = null;
        this.userAddresses = [];
        this.cartItems = [];
        this.isProcessing = false;
        
        this.apiBaseUrl = 'http://localhost:3000/api';
        this.init();
    }

    // Initialize checkout system
    async init() {
        try {
            // Check authentication
            if (!window.AuthUtils.requireAuth()) {
                return;
            }

            // Initialize all components
            this.initializeEventListeners();
            this.initializePaymentModal();
            this.initializeAddressModal();
            
            // Load data
            await Promise.all([
                this.loadUserAddresses(),
                this.loadCartData()
            ]);
            
            this.updateUI();
        } catch (error) {
            console.error('❌ Failed to initialize checkout:', error);
            this.showError('Failed to load checkout. Please refresh the page.');
        }
    }

    // Initialize address modal functionality
    initializeAddressModal() {
        // Address modal confirm button
        const confirmAddressBtn = document.getElementById('confirmAddress');
        if (confirmAddressBtn) {
            confirmAddressBtn.addEventListener('click', () => {
                this.confirmAddressSelection();
            });
        }

        // Address modal cancel button
        const cancelAddressBtn = document.getElementById('cancelAddress');
        if (cancelAddressBtn) {
            cancelAddressBtn.addEventListener('click', () => {
                this.closeModal('addressModal');
            });
        }

        // Close modal button
        const closeAddressModal = document.getElementById('closeAddressModal');
        if (closeAddressModal) {
            closeAddressModal.addEventListener('click', () => {
                this.closeModal('addressModal');
            });
        }
    }

    // Confirm address selection from modal
    confirmAddressSelection() {
        const selectedOption = document.querySelector('.address-option.selected');
        if (selectedOption) {
            this.selectedAddressId = selectedOption.dataset.addressId;
            this.updateAddressDisplay();
            this.closeModal('addressModal');
            this.showSuccess('Address updated successfully');
        } else {
            this.showError('Please select an address');
        }
    }

    // ================================
    // ADDRESS MANAGEMENT
    // ================================

    async loadUserAddresses() {
        try {
            this.showLoading('loadingAddressMessage');
            
            const response = await fetch(`${this.apiBaseUrl}/checkout/addresses`, {
                credentials: 'include'
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.userAddresses = data.addresses || [];
                this.selectedAddressId = data.primaryAddressId || 
                    (this.userAddresses.length > 0 ? this.userAddresses[0]._id : null);
            } else {
                console.error('Failed to load addresses:', data.message);
                this.userAddresses = [];
            }
        } catch (error) {
            console.error('Error loading addresses:', error);
            this.userAddresses = [];
        } finally {
            this.hideLoading('loadingAddressMessage');
            this.updateAddressDisplay();
        }
    }

    updateAddressDisplay() {
        const addAddressContainer = document.getElementById('addAddressContainer');
        const selectedAddressCard = document.getElementById('selectedAddressCard');
        const editAddressBtn = document.getElementById('editAddressBtn');
        const loadingAddressMessage = document.getElementById('loadingAddressMessage');

        // Hide loading message
        if (loadingAddressMessage) loadingAddressMessage.style.display = 'none';

        if (this.userAddresses.length === 0) {
            // No addresses - show add address option
            if (addAddressContainer) addAddressContainer.style.display = 'block';
            if (selectedAddressCard) selectedAddressCard.style.display = 'none';
            if (editAddressBtn) editAddressBtn.style.display = 'none';
        } else {
            // Has addresses - show selected address
            if (addAddressContainer) addAddressContainer.style.display = 'none';
            if (selectedAddressCard) selectedAddressCard.style.display = 'block';
            if (editAddressBtn) editAddressBtn.style.display = 'inline-block';

            const selectedAddress = this.userAddresses.find(addr => addr._id === this.selectedAddressId) 
                || this.userAddresses[0];
            
            if (selectedAddress) {
                this.selectedAddressId = selectedAddress._id;
                this.updateSelectedAddressDisplay(selectedAddress);
            }
        }
    }

    updateSelectedAddressDisplay(address) {
        const selectedAddressCard = document.getElementById('selectedAddressCard');
        if (!selectedAddressCard) return;

        // Update the content within the selected address card
        const nameEl = selectedAddressCard.querySelector('.name');
        const streetEl = selectedAddressCard.querySelector('.street');
        const cityEl = selectedAddressCard.querySelector('.city');
        const phoneEl = selectedAddressCard.querySelector('.phone');

        if (nameEl) nameEl.textContent = address.fullName || 'Unknown';
        if (streetEl) streetEl.textContent = address.street || address.displayAddress || 'No address provided';
        if (cityEl) cityEl.textContent = `${address.city || ''}, ${address.province || ''}`.trim().replace(/^,|,$/, '');
        if (phoneEl) phoneEl.textContent = address.phone || 'No phone provided';
    }

    // Show address selection modal
    showAddressModal() {
        const modal = document.getElementById('addressModal');
        if (!modal) return;

        this.loadAddressOptions();
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    loadAddressOptions() {
        const modalBody = document.getElementById('addressModalBody');
        if (!modalBody) return;

        if (this.userAddresses.length === 0) {
            modalBody.innerHTML = `
                <div class="no-addresses">
                    <p>No saved addresses found.</p>
                    <button class="btn-primary" onclick="checkoutManager.showNewAddressModal()">
                        Add New Address
                    </button>
                </div>
            `;
            return;
        }

        modalBody.innerHTML = this.userAddresses.map(address => `
            <div class="address-option ${address._id === this.selectedAddressId ? 'selected' : ''}" 
                 data-address-id="${address._id}">
                <div class="address-content">
                    <div class="address-header">
                        <span class="address-name">${address.fullName}</span>
                        ${address.isPrimary ? '<span class="primary-badge">Primary</span>' : ''}
                        <span class="address-type">${address.type}</span>
                    </div>
                    <div class="address-details">${address.displayAddress}</div>
                    <div class="address-phone">${address.phone}</div>
                    ${address.deliveryInstructions ? `<div class="delivery-instructions">${address.deliveryInstructions}</div>` : ''}
                </div>
                <div class="address-actions">
                    <button class="btn-sm btn-secondary" onclick="checkoutManager.editAddress('${address._id}')">
                        Edit
                    </button>
                    ${!address.isPrimary ? `<button class="btn-sm btn-danger" onclick="checkoutManager.deleteAddress('${address._id}')">Delete</button>` : ''}
                </div>
            </div>
        `).join('') + `
            <div class="add-new-address">
                <button class="btn-outline" onclick="checkoutManager.showNewAddressModal()">
                    <i class="fas fa-plus"></i> Add New Address
                </button>
            </div>
        `;

        // Add click handlers for address selection
        modalBody.querySelectorAll('.address-option').forEach(option => {
            option.addEventListener('click', (e) => {
                if (e.target.tagName === 'BUTTON') return; // Don't select when clicking buttons
                
                modalBody.querySelectorAll('.address-option').forEach(opt => opt.classList.remove('selected'));
                option.classList.add('selected');
                this.selectedAddressId = option.dataset.addressId;
            });
        });
    }

    // Show new address modal
    showNewAddressModal() {
        const modal = document.getElementById('addAddressModal');
        if (!modal) return;

        // Reset form
        const form = document.getElementById('addAddressForm');
        if (form) form.reset();

        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    // Save new address
    async saveNewAddress(formData) {
        try {
            this.showLoading('saveAddressLoading');

            const addressData = {
                type: formData.get('addressType') || 'Home',
                fullName: formData.get('fullName'),
                phone: formData.get('phone'),
                street: formData.get('street'),
                barangay: formData.get('barangay'),
                city: formData.get('city'),
                province: formData.get('province'),
                postalCode: formData.get('postalCode') || '',
                landmark: formData.get('landmark') || '',
                deliveryInstructions: formData.get('deliveryInstructions') || '',
                isPrimary: formData.get('isPrimary') === 'on' || this.userAddresses.length === 0
            };

            const response = await fetch(`${this.apiBaseUrl}/checkout/addresses`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(addressData)
            });

            const result = await response.json();

            if (result.success) {
                this.showSuccess('Address saved successfully!');
                this.closeModal('addAddressModal');
                await this.loadUserAddresses(); // Reload addresses
            } else {
                this.showError(result.message || 'Failed to save address');
            }
        } catch (error) {
            console.error('Error saving address:', error);
            this.showError('Failed to save address. Please try again.');
        } finally {
            this.hideLoading('saveAddressLoading');
        }
    }

    // Edit existing address
    async editAddress(addressId) {
        try {
            // For now, just show the new address modal with existing data
            // In a full implementation, you'd populate the form with existing data
            this.showNewAddressModal();
        } catch (error) {
            console.error('Error editing address:', error);
            this.showError('Failed to edit address');
        }
    }

    // Delete address
    async deleteAddress(addressId) {
        if (!confirm('Are you sure you want to delete this address?')) {
            return;
        }

        try {
            const response = await fetch(`${this.apiBaseUrl}/addresses/${addressId}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            const result = await response.json();

            if (result.success) {
                this.showSuccess('Address deleted successfully');
                await this.loadUserAddresses(); // Reload addresses
                this.loadAddressOptions(); // Refresh modal if open
            } else {
                this.showError(result.message || 'Failed to delete address');
            }
        } catch (error) {
            console.error('Error deleting address:', error);
            this.showError('Failed to delete address');
        }
    }

    // ================================
    // PAYMENT MANAGEMENT
    // ================================

    // Show payment selection modal
    showPaymentModal() {
        const modal = document.getElementById('paymentModal');
        if (!modal) return;

        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    // Confirm payment selection from modal
    confirmPaymentSelection() {
        const selectedOption = document.querySelector('.payment-option.selected');
        if (selectedOption) {
            this.selectedPaymentMethod = selectedOption.dataset.payment;
            
            // If online banking is selected, show bank selection modal
            if (this.selectedPaymentMethod === 'online-banking') {
                this.closeModal('paymentModal');
                this.showBankModal();
            } else {
                this.selectedBank = null; // Reset bank selection for other payment methods
                this.updatePaymentDisplay();
                this.closeModal('paymentModal');
                this.showSuccess('Payment method updated successfully');
            }
        } else {
            this.showError('Please choose a payment method to continue');
        }
    }

    // Show bank selection modal
    showBankModal() {
        const modal = document.getElementById('bankModal');
        if (!modal) return;

        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    // Confirm bank selection
    confirmBankSelection() {
        const selectedBank = document.querySelector('.bank-option.selected');
        if (selectedBank) {
            this.selectedBank = selectedBank.dataset.bank;
            this.updatePaymentDisplay();
            this.closeModal('bankModal');
            this.showSuccess('Bank selected successfully');
        } else {
            this.showError('Please select a bank');
        }
    }

    initializePaymentModal() {
        // Payment method selection
        document.querySelectorAll('.payment-option').forEach(option => {
            option.addEventListener('click', () => {
                document.querySelectorAll('.payment-option').forEach(opt => opt.classList.remove('selected'));
                option.classList.add('selected');
            });
        });

        // Bank selection for online banking
        document.querySelectorAll('.bank-option').forEach(option => {
            option.addEventListener('click', () => {
                document.querySelectorAll('.bank-option').forEach(opt => opt.classList.remove('selected'));
                option.classList.add('selected');
            });
        });

        // Bank modal event listeners
        const confirmBank = document.getElementById('confirmBank');
        if (confirmBank) {
            confirmBank.addEventListener('click', () => this.confirmBankSelection());
        }

        const cancelBank = document.getElementById('cancelBank');
        if (cancelBank) {
            cancelBank.addEventListener('click', () => {
                this.closeModal('bankModal');
                this.showPaymentModal(); // Go back to payment selection
            });
        }

        const closeBankModal = document.getElementById('closeBankModal');
        if (closeBankModal) {
            closeBankModal.addEventListener('click', () => this.closeModal('bankModal'));
        }
    }

    updatePaymentDisplay() {
        const selectedPaymentEl = document.getElementById('selectedPaymentText');
        if (!selectedPaymentEl) return;

        const paymentNames = {
            'gcash': 'GCash',
            'maya': 'Maya',
            'online-banking': 'Online Banking',
            'cod': 'Cash on Delivery (COD)'
        };

        const bankNames = {
            'bdo': 'BDO (Banco de Oro)',
            'bpi': 'BPI (Bank of the Philippine Islands)',
            'metrobank': 'Metrobank',
            'unionbank': 'UnionBank',
            'landbank': 'Landbank',
            'pnb': 'Philippine National Bank (PNB)',
            'security-bank': 'Security Bank',
            'rcbc': 'RCBC'
        };

        let displayText = 'Select Payment Method';
        
        if (this.selectedPaymentMethod) {
            displayText = paymentNames[this.selectedPaymentMethod];
            if (this.selectedPaymentMethod === 'online-banking' && this.selectedBank) {
                displayText += ` - ${bankNames[this.selectedBank]}`;
            }
        }

        selectedPaymentEl.textContent = displayText;
    }

    // ================================
    // CART MANAGEMENT
    // ================================

    async loadCartData() {
        try {
            // Load cart from API instead of localStorage
            this.cartItems = await window.CartUtils.getCart();
            this.updateCartDisplay();
        } catch (error) {
            console.error('Error loading cart:', error);
            this.cartItems = [];
            this.updateCartDisplay();
        }
    }

    updateCartDisplay() {
        const tbody = document.querySelector('.cart-table tbody');
        const cartSubtotal = document.getElementById('cartSubtotal');
        const orderSubtotal = document.getElementById('orderSubtotal');
        const orderTax = document.getElementById('orderTax');
        const orderTotal = document.getElementById('orderTotal');

        if (!tbody) return;

        if (this.cartItems.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" style="text-align: center; padding: 2rem;">
                        <div class="empty-cart">
                            <i class="fas fa-shopping-cart" style="font-size: 2rem; color: #ccc; margin-bottom: 1rem;"></i>
                            <p>Your cart is empty</p>
                            <a href="/shop" class="btn-primary">Continue Shopping</a>
                        </div>
                    </td>
                </tr>
            `;
            if (cartSubtotal) cartSubtotal.textContent = '₱0.00';
            if (orderSubtotal) orderSubtotal.textContent = '₱0.00';
            if (orderTax) orderTax.textContent = '₱0.00';
            if (orderTotal) orderTotal.textContent = '₱60.00'; // Just shipping cost
            return;
        }

        let subtotal = 0;
        const cartRows = this.cartItems.map(item => {
            // Handle image display - ensure no "No Image" background
            const productInfo = item.productId || item;
            const itemPrice = parseFloat(item.price || productInfo.price || 0);
            const itemQuantity = item.quantity || 0;
            const itemTotal = itemPrice * itemQuantity;
            subtotal += itemTotal;
            
            // Check if product has a valid image
            const hasValidImage = productInfo.image && 
                                 productInfo.image.trim() !== '' && 
                                 !productInfo.image.includes('placeholder.png') &&
                                 productInfo.image !== 'undefined' &&
                                 productInfo.image !== 'null';
            
            const imageHtml = hasValidImage ? 
                `<img src="${productInfo.image}" alt="${productInfo.name}" class="item-image" style="background: none; background-image: none;">` : 
                `<img src="/assets/shop/placeholder.png" alt="${productInfo.name}" class="item-image" style="background: none; background-image: none;">`;
            
            return `
                <tr>
                    <td>
                        <div class="item-info">
                            ${imageHtml}
                            <span class="item-name">${productInfo.name || 'Unknown Product'}</span>
                        </div>
                    </td>
                    <td>${itemQuantity}</td>
                    <td>₱${itemPrice.toFixed(2)}</td>
                    <td>₱${itemTotal.toFixed(2)}</td>
                </tr>
            `;
        }).join('');

        // Add the subtotal row
        tbody.innerHTML = cartRows + `
            <tr class="total-row">
                <td colspan="3"><strong>Subtotal</strong></td>
                <td><strong id="cartSubtotal">₱${subtotal.toFixed(2)}</strong></td>
            </tr>
        `;

        // Calculate tax (12%) and total
        const shipping = 60.00;
        const tax = subtotal * 0.12;
        const total = subtotal + shipping + tax;

        if (cartSubtotal) cartSubtotal.textContent = `₱${subtotal.toFixed(2)}`;
        if (orderSubtotal) orderSubtotal.textContent = `₱${subtotal.toFixed(2)}`;
        if (orderTax) orderTax.textContent = `₱${tax.toFixed(2)}`;
        if (orderTotal) orderTotal.textContent = `₱${total.toFixed(2)}`;
    }

    // ================================
    // CHECKOUT PROCESS
    // ================================

    async processCheckout() {
        if (this.isProcessing) return;

        try {
            // Validate checkout requirements
            if (!this.selectedAddressId) {
                this.showError('Please select or add a delivery address');
                return;
            }

            if (!this.selectedPaymentMethod) {
                this.showError('Please choose your preferred payment method from the options above');
                return;
            }

            if (this.selectedPaymentMethod === 'online-banking' && !this.selectedBank) {
                this.showError('Please select a bank for online banking');
                return;
            }

            if (this.cartItems.length === 0) {
                this.showError('Your cart is empty');
                return;
            }

            this.isProcessing = true;
            this.showLoading('checkoutProcessing');

            const checkoutData = {
                addressId: this.selectedAddressId,
                paymentMethod: this.selectedPaymentMethod,
                ...(this.selectedBank && { bank: this.selectedBank }),
                deliveryInstructions: document.querySelector('.delivery-notes-label + textarea')?.value || ''
            };

            const response = await fetch(`${this.apiBaseUrl}/checkout`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(checkoutData)
            });

            const result = await response.json();

            if (result.success) {
                this.showCheckoutSuccess(result.transaction);
                // Clear cart using API
                try {
                    await window.CartUtils.clearCart();
                } catch (clearError) {
                    console.error('Error clearing cart after checkout:', clearError);
                    // Still proceed with success even if cart clear fails
                }
            } else {
                this.showError(result.error || 'Failed to process order');
            }
        } catch (error) {
            console.error('Checkout error:', error);
            this.showError('Failed to process order. Please try again.');
        } finally {
            this.isProcessing = false;
            this.hideLoading('checkoutProcessing');
        }
    }

    showCheckoutSuccess(transaction) {
        const modal = document.createElement('div');
        modal.className = 'success-modal active';
        modal.innerHTML = `
            <div class="success-content">
                <img src="/assets/checkout webpage/success.png" alt="Success" class="success-icon">
                <h2>Order Placed Successfully!</h2>
                <p>Thank you for your order!</p>
                <div class="order-details">
                    <p><strong>Order ID:</strong> ${transaction.transactionId || transaction.id}</p>
                    <p><strong>Total Amount:</strong> ₱${transaction.totalAmount.toLocaleString()}</p>
                    <p><strong>Delivery Address:</strong> ${transaction.deliveryAddress.fullName}<br>
                       ${transaction.deliveryAddress.address}</p>
                    <p><strong>Estimated Delivery:</strong> ${new Date(transaction.estimatedDelivery).toLocaleDateString()}</p>
                </div>
                <div class="success-actions">
                    <button class="btn-primary" onclick="this.closest('.success-modal').remove(); window.location.href='/shop'">
                        Continue Shopping
                    </button>
                    <button class="btn-secondary" onclick="this.closest('.success-modal').remove(); window.location.href='/orders'">
                        View Orders
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        // Add auto-remove after 10 seconds for better UX
        setTimeout(() => {
            if (modal && modal.parentNode) {
                modal.classList.add('fade-out');
                setTimeout(() => {
                    modal.remove();
                }, 300);
            }
        }, 10000);
    }

    // ================================
    // UTILITY METHODS
    // ================================

    initializeEventListeners() {
        // Complete purchase button
        const completeBtn = document.querySelector('.complete-btn');
        if (completeBtn) {
            completeBtn.addEventListener('click', () => this.processCheckout());
        }

        // Address modal events
        const editAddressBtn = document.getElementById('editAddressBtn');
        if (editAddressBtn) {
            editAddressBtn.addEventListener('click', () => this.showAddressModal());
        }

        // Add address events
        const addAddressBtn = document.getElementById('addAddressBtn');
        if (addAddressBtn) {
            addAddressBtn.addEventListener('click', () => this.showNewAddressModal());
        }

        // Payment modal events
        const openPaymentModal = document.getElementById('openPaymentModal');
        if (openPaymentModal) {
            openPaymentModal.addEventListener('click', () => this.showPaymentModal());
        }

        const confirmPayment = document.getElementById('confirmPayment');
        if (confirmPayment) {
            confirmPayment.addEventListener('click', () => this.confirmPaymentSelection());
        }

        const cancelPayment = document.getElementById('cancelPayment');
        if (cancelPayment) {
            cancelPayment.addEventListener('click', () => this.closeModal('paymentModal'));
        }

        const closePaymentModal = document.getElementById('closePaymentModal');
        if (closePaymentModal) {
            closePaymentModal.addEventListener('click', () => this.closeModal('paymentModal'));
        }

        // Form submissions
        const addAddressForm = document.getElementById('addAddressForm');
        if (addAddressForm) {
            addAddressForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                this.saveNewAddress(formData);
            });
        }

        // Save address button
        const saveAddress = document.getElementById('saveAddress');
        if (saveAddress) {
            saveAddress.addEventListener('click', (e) => {
                e.preventDefault();
                const form = document.getElementById('addAddressForm');
                if (form) {
                    const formData = new FormData(form);
                    this.saveNewAddress(formData);
                }
            });
        }

        // Cancel add address
        const cancelAddAddress = document.getElementById('cancelAddAddress');
        if (cancelAddAddress) {
            cancelAddAddress.addEventListener('click', () => this.closeModal('addAddressModal'));
        }

        const closeAddAddressModal = document.getElementById('closeAddAddressModal');
        if (closeAddAddressModal) {
            closeAddAddressModal.addEventListener('click', () => this.closeModal('addAddressModal'));
        }

        // Modal close events
        document.querySelectorAll('.modal-close, .cancel-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                if (modal) this.closeModal(modal.id);
            });
        });
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    showLoading(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.style.display = 'block';
            
            // Also hide other elements when showing loading
            if (elementId === 'loadingAddressMessage') {
                const addContainer = document.getElementById('addAddressContainer');
                const selectedCard = document.getElementById('selectedAddressCard');
                if (addContainer) addContainer.style.display = 'none';
                if (selectedCard) selectedCard.style.display = 'none';
            }
        }
    }

    hideLoading(elementId) {
        const element = document.getElementById(elementId);
        if (element) element.style.display = 'none';
    }

    showError(message) {
        this.showToast(message, 'error');
    }

    showSuccess(message) {
        this.showToast(message, 'success');
    }

    showToast(message, type = 'info') {
        // Ensure toast container exists
        let toastContainer = document.getElementById('toastContainer');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'toastContainer';
            toastContainer.className = 'toast-container';
            document.body.appendChild(toastContainer);
        }

        // Remove existing toasts of the same type to prevent spam
        const existingToasts = toastContainer.querySelectorAll(`.toast.toast-${type}`);
        existingToasts.forEach(toast => {
            toast.classList.add('slide-out');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.remove();
                }
            }, 300);
        });

        const toast = document.createElement('div');
        toast.className = `toast toast-${type} toast-with-icon`;
        
        const icons = {
            success: '<img src="../assets/checkout webpage/success.png" alt="Success" class="toast-icon-img">',
            error: '<img src="../assets/checkout webpage/error.png" alt="Error" class="toast-icon-img">',
            warning: '<img src="../assets/checkout webpage/warning.png" alt="Warning" class="toast-icon-img">',
            info: '<img src="../assets/checkout webpage/info.png" alt="Info" class="toast-icon-img">'
        };
        
        toast.innerHTML = `
            <span class="toast-icon">${icons[type] || icons.info}</span>
            <span class="toast-message">${message}</span>
        `;
        
        toastContainer.appendChild(toast);
        
        // Trigger entrance animation
        setTimeout(() => {
            toast.classList.add('show');
            toast.classList.add('slide-in');
        }, 50);
        
        // Auto-remove after 4 seconds
        setTimeout(() => {
            toast.classList.remove('show');
            toast.classList.add('slide-out');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.remove();
                }
            }, 300);
        }, 4000);
        
        // Allow manual close on click
        toast.addEventListener('click', () => {
            toast.classList.remove('show');
            toast.classList.add('slide-out');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.remove();
                }
            }, 300);
        });
    }

    updateUI() {
        this.updateAddressDisplay();
        this.updatePaymentDisplay();
        this.updateCartDisplay();
    }
}

// Export CheckoutManager for global access
window.CheckoutManager = CheckoutManager;

// Initialize checkout manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.checkoutManager = new CheckoutManager();
});
