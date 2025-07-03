class CheckoutManager {
    constructor() {
        this.selectedAddressId = null;
        this.selectedPaymentMethod = null;
        this.selectedBank = null;
        this.userAddresses = [];
        this.cartItems = [];
        this.isProcessing = false;
        this.setupTimeout = null;
        
        this.apiBaseUrl = 'http://localhost:3000/api';
        this.init();
    }

    // Initialize checkout system - Simplified
    async init() {
        try {
            console.log('Initializing checkout system...');
            
            // Check authentication
            if (!window.AuthUtils && !window.AuthUtils.requireAuth()) {
                console.error('Authentication required');
                return;
            }

            // Setup event listeners first
            this.initializeEventListeners();
            this.setupNavigationHandlers();
            this.initializeAddressModal();
            this.initializePaymentModal();
            
            // Initialize edit modal if it exists
            this.createEditAddressModal();
            
            // Debug: Check if modal elements exist
            console.log('Checking modal elements...');
            const addressModal = document.getElementById('addressModal');
            const addressModalBody = document.getElementById('addressModalBody');
            const confirmAddress = document.getElementById('confirmAddress');
            const cancelAddress = document.getElementById('cancelAddress');
            const closeAddressModal = document.getElementById('closeAddressModal');
            
            console.log('Address modal elements:', {
                addressModal: !!addressModal,
                addressModalBody: !!addressModalBody,
                confirmAddress: !!confirmAddress,
                cancelAddress: !!cancelAddress,
                closeAddressModal: !!closeAddressModal
            });
            
            // Load data
            await this.loadUserAddresses();
            await this.loadCartData();
            
            // Update UI
            this.updateUI();
            console.log('Checkout system initialized successfully');
        } catch (error) {
            console.error('Failed to initialize checkout:', error);
            this.showError('Failed to load checkout. Please refresh the page.');
        }
    }

    // Initialize address modal functionality
    initializeAddressModal() {
        // Address modal confirm button
        const confirmAddressBtn = document.getElementById('confirmAddress');
        if (confirmAddressBtn) {
            confirmAddressBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Confirm address button clicked');
                this.confirmAddressSelection();
            });
        }

        // Address modal cancel button
        const cancelAddressBtn = document.getElementById('cancelAddress');
        if (cancelAddressBtn) {
            cancelAddressBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Cancel address button clicked');
                this.closeModal('addressModal');
            });
        }

        // Close modal button
        const closeAddressModal = document.getElementById('closeAddressModal');
        if (closeAddressModal) {
            closeAddressModal.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Close address modal button clicked');
                this.closeModal('addressModal');
            });
        }
    }

    // Initialize payment modal functionality
    initializePaymentModal() {
        // Setup payment option selection
        this.setupPaymentOptionListeners();
        
        // Setup input validation
        this.setupInputValidation();
    }

    setupPaymentOptionListeners() {
        // Payment option selection
        document.addEventListener('click', (e) => {
            if (e.target.closest('.payment-option')) {
                const paymentOption = e.target.closest('.payment-option');
                
                // Remove selected class from all options
                document.querySelectorAll('.payment-option').forEach(option => {
                    option.classList.remove('selected');
                });
                
                // Add selected class to clicked option
                paymentOption.classList.add('selected');
                
                // Update selected payment method
                this.selectedPaymentMethod = paymentOption.dataset.payment;
                console.log('Payment method selected:', this.selectedPaymentMethod);
            }
        });
    }

    setupInputValidation() {
        // GCash reference number validation
        const gcashReference = document.getElementById('gcashReference');
        if (gcashReference) {
            gcashReference.addEventListener('input', (e) => {
                // Only allow numbers
                e.target.value = e.target.value.replace(/[^0-9]/g, '');
                // Limit to 12 digits
                if (e.target.value.length > 12) {
                    e.target.value = e.target.value.substring(0, 12);
                }
                this.validateGcashReference();
            });
        }

        // Maya reference number validation
        const mayaReference = document.getElementById('mayaReference');
        if (mayaReference) {
            mayaReference.addEventListener('input', (e) => {
                // Only allow numbers
                e.target.value = e.target.value.replace(/[^0-9]/g, '');
                // Limit to 12 digits
                if (e.target.value.length > 12) {
                    e.target.value = e.target.value.substring(0, 12);
                }
                this.validateMayaReference();
            });
        }
    }

    // Confirm address selection from modal
    confirmAddressSelection() {
        console.log('confirmAddressSelection called');
        
        const selectedOption = document.querySelector('.address-option.selected');
        console.log('Selected option:', selectedOption);
        
        if (selectedOption) {
            this.selectedAddressId = selectedOption.dataset.addressId;
            console.log('Selected address ID:', this.selectedAddressId);
            
            // Find the selected address and update the display
            const selectedAddress = this.userAddresses.find(addr => addr._id === this.selectedAddressId);
            if (selectedAddress) {
                this.updateSelectedAddressDisplay(selectedAddress);
            }
            
            this.closeModal('addressModal');
            this.showSuccess('Address updated successfully');
        } else {
            console.log('No address selected');
            this.showError('Please select an address');
        }
    }

    // ADDRESS MANAGEMENT
    
    async loadUserAddresses() {
        try {
            this.showLoading('loadingAddressMessage');
            
            const response = await fetch(`${this.apiBaseUrl}/addresses`, {
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
        const selectAddressBtn = document.getElementById('selectAddressBtn');
        const loadingAddressMessage = document.getElementById('loadingAddressMessage');

        // Hide loading message
        if (loadingAddressMessage) loadingAddressMessage.style.display = 'none';

        if (this.userAddresses.length === 0) {
            // No addresses - show add address option
            if (addAddressContainer) addAddressContainer.style.display = 'block';
            if (selectedAddressCard) selectedAddressCard.style.display = 'none';
            if (editAddressBtn) editAddressBtn.style.display = 'none';
            if (selectAddressBtn) selectAddressBtn.style.display = 'none';
        } else {
            // Has addresses - show selected address
            if (addAddressContainer) addAddressContainer.style.display = 'none';
            if (selectedAddressCard) selectedAddressCard.style.display = 'block';
            if (editAddressBtn) editAddressBtn.style.display = 'inline-block';
            
            // Show select address button only if there are multiple addresses
            if (selectAddressBtn) {
                selectAddressBtn.style.display = this.userAddresses.length > 1 ? 'inline-block' : 'none';
            }

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

    // Show address selection modal - Simple and clean
    showAddressModal() {
        console.log('showAddressModal called');
        console.log('User addresses:', this.userAddresses);
        
        if (this.userAddresses.length === 0) {
            console.log('No addresses found');
            this.showError('No addresses found. Please add an address first.');
            return;
        }

        const modal = document.getElementById('addressModal');
        if (!modal) {
            console.error('Address modal not found!');
            return;
        }

        console.log('Loading address options...');
        this.loadAddressOptions();
        
        console.log('Opening address modal...');
        this.openModal('addressModal');
    }

    // Load address options - Simplified
    loadAddressOptions() {
        console.log('loadAddressOptions called');
        const modalBody = document.getElementById('addressModalBody');
        if (!modalBody) {
            console.error('Address modal body not found!');
            return;
        }

        console.log('Loading addresses:', this.userAddresses);

        modalBody.innerHTML = this.userAddresses.map(address => `
            <div class="address-option ${address._id === this.selectedAddressId ? 'selected' : ''}" 
                 data-address-id="${address._id}">
                <div class="address-info">
                    <div class="address-name">${address.fullName}</div>
                    <div class="address-details">${address.street}, ${address.barangay}, ${address.city}, ${address.province}</div>
                    <div class="address-phone">${address.phone}</div>
                    ${address.isPrimary ? '<span class="primary-badge">Primary</span>' : ''}
                    <div class="address-actions">
                        <button class="btn-edit" data-address-id="${address._id}">Edit</button>
                        ${!address.isPrimary ? `<button class="btn-delete" data-address-id="${address._id}">Delete</button>` : ''}
                    </div>
                </div>
                <div class="radio-indicator"></div>
            </div>
        `).join('') + `
            <div class="add-new-address">
                <button class="btn-add">+ Add New Address</button>
            </div>
        `;

        console.log('Address options HTML generated');

        // Simple click handlers for address selection
        modalBody.querySelectorAll('.address-option').forEach(option => {
            option.addEventListener('click', (e) => {
                // Don't select when clicking buttons
                if (e.target.tagName === 'BUTTON') return;
                
                console.log('Address option clicked:', option.dataset.addressId);
                
                // Clear previous selection
                modalBody.querySelectorAll('.address-option').forEach(opt => {
                    opt.classList.remove('selected');
                });
                
                // Select this option
                option.classList.add('selected');
                
                this.selectedAddressId = option.dataset.addressId;
                console.log('Address selected:', this.selectedAddressId);
            });
        });

        // Add event listeners for action buttons
        modalBody.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const addressId = btn.dataset.addressId;
                this.editAddress(addressId);
            });
        });

        modalBody.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const addressId = btn.dataset.addressId;
                this.deleteAddress(addressId);
            });
        });

        modalBody.querySelector('.btn-add')?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.showNewAddressModal();
        });
        
        console.log('Address option click handlers attached');
    }

    // Show new address modal - Simplified
    showNewAddressModal() {
        console.log('showNewAddressModal called');
        
        // Close the address selection modal first
        this.closeModal('addressModal');
        
        const modal = document.getElementById('addAddressModal');
        if (!modal) {
            console.error('Add address modal not found!');
            return;
        }

        // Reset form
        const form = document.getElementById('addAddressForm');
        if (form) form.reset();

        console.log('Opening add address modal...');
        this.openModal('addAddressModal');
    }

    // Save new address
    // Edit existing address
    async editAddress(addressId) {
        try {
            // Find the address to edit
            const address = this.userAddresses.find(addr => addr._id === addressId);
            if (!address) {
                this.showError('Address not found');
                return;
            }

            // Show edit modal with pre-filled data
            this.showEditAddressModal(address);
        } catch (error) {
            console.error('Error editing address:', error);
            this.showError('Failed to edit address');
        }
    }

    // Show edit address modal with pre-filled data - uses HTML from EJS
    showEditAddressModal(address) {
        const modal = document.getElementById('editAddressModal');
        if (!modal) {
            console.error('Edit address modal not found in HTML!');
            return;
        }

        // Set up event listeners if not already done
        this.setupEditModalEventListeners();

        // Fill form with existing data
        document.getElementById('editAddressId').value = address._id;
        document.getElementById('editAddressType').value = address.type || address.addressType || '';
        document.getElementById('editFullName').value = address.fullName || '';
        document.getElementById('editStreet').value = address.street || '';
        document.getElementById('editBarangay').value = address.barangay || '';
        document.getElementById('editCity').value = address.city || '';
        document.getElementById('editProvince').value = address.province || '';
        document.getElementById('editPhone').value = address.phone || '';
        document.getElementById('editIsPrimary').checked = address.isPrimary || false;

        // Open modal using the standardized method
        this.openModal('editAddressModal');
    }

    // Create edit address modal dynamically - REMOVED: Now uses HTML from EJS file
    createEditAddressModal() {
        // Modal now exists in HTML, no need to create dynamically
        const modal = document.getElementById('editAddressModal');
        if (modal) {
            // Set up event listeners for the modal buttons
            this.setupEditModalEventListeners();
        }
    }

    // Setup event listeners for edit modal buttons
    setupEditModalEventListeners() {
        // Close modal button
        const closeBtn = document.getElementById('closeEditAddressModal');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.closeModal('editAddressModal');
            });
        }

        // Update address button
        const updateBtn = document.getElementById('updateAddress');
        if (updateBtn) {
            updateBtn.addEventListener('click', () => {
                this.updateAddress();
            });
        }

        // Cancel button
        const cancelBtn = document.getElementById('cancelEditAddress');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                this.cancelEditAddress();
            });
        }

        // Delete button
        const deleteBtn = document.getElementById('deleteAddressFromEdit');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => {
                this.deleteAddressFromEdit();
            });
        }
    }

    // Update existing address
    async updateAddress() {
        const form = document.getElementById('editAddressForm');
        if (!form) return;

        const addressId = document.getElementById('editAddressId').value;
        if (!addressId) {
            this.showError('Address ID is required');
            return;
        }

        const addressData = {
            type: document.getElementById('editAddressType').value,
            fullName: document.getElementById('editFullName').value,
            phone: document.getElementById('editPhone').value,
            street: document.getElementById('editStreet').value,
            barangay: document.getElementById('editBarangay').value,
            city: document.getElementById('editCity').value,
            province: document.getElementById('editProvince').value,
            isPrimary: document.getElementById('editIsPrimary').checked
        };

        // Validate required fields
        const requiredFields = ['type', 'fullName', 'street', 'barangay', 'city', 'province', 'phone'];
        const missingFields = requiredFields.filter(field => !addressData[field] || addressData[field].trim() === '');
        
        if (missingFields.length > 0) {
            this.showError(`Please fill in all required fields: ${missingFields.join(', ')}`);
            return;
        }

        try {
            const response = await fetch(`${this.apiBaseUrl}/addresses/${addressId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(addressData)
            });

            const result = await response.json();

            if (result.success) {
                this.showSuccess('Address updated successfully');
                this.closeModal('editAddressModal');
                
                // Reload addresses
                await this.loadUserAddresses();
                
                // Go back to address selection modal immediately
                this.showAddressModal();
            } else {
                this.showError(result.message || 'Failed to update address');
            }
        } catch (error) {
            console.error('Error updating address:', error);
            this.showError('Failed to update address');
        }
    }

    // Delete address from edit modal
    async deleteAddressFromEdit() {
        const addressId = document.getElementById('editAddressId').value;
        if (addressId) {
            const confirmed = confirm('Are you sure you want to delete this address?');
            if (confirmed) {
                await this.deleteAddress(addressId);
                this.closeModal('editAddressModal');
                
                // Go back to address selection modal if there are still addresses
                if (this.userAddresses.length > 0) {
                    this.showAddressModal();
                }
            }
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

    // Simplified payment modal
    showPaymentModal() {
        const modal = document.getElementById('paymentModal');
        if (!modal) {
            console.error('Payment modal not found');
            return;
        }

        this.openModal('paymentModal');
        this.setupPaymentOptionListeners();
    }

    // Show bank selection modal - static
    showBankModal() {
        const modal = document.getElementById('bankModal');
        if (!modal) return;

        // Apply static styles
        modal.style.transition = 'none';
        modal.style.animation = 'none';
        modal.style.display = 'block';
        modal.style.opacity = '1';
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

    // Setup payment option listeners - simplified without delays
    setupPaymentOptionListeners() {
        console.log('Setting up payment option listeners...');
        
        const paymentOptions = document.querySelectorAll('.payment-option');
        console.log('Found payment options:', paymentOptions.length);
        
        if (paymentOptions.length === 0) {
            console.warn('No payment options found');
            return;
        }
        
        paymentOptions.forEach((option, index) => {
            console.log(`Setting up listener for option ${index}:`, option.dataset.payment);
            
            // Remove existing click listeners
            const newOption = option.cloneNode(true);
            option.parentNode.replaceChild(newOption, option);
            
            // Apply static styles to remove animations
            newOption.style.transition = 'none';
            newOption.style.animation = 'none';
            
            // Add click listener with immediate response
            newOption.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                console.log('Payment option clicked:', newOption.dataset.payment);
                
                // Clear all selections immediately with static styles
                document.querySelectorAll('.payment-option').forEach(opt => {
                    opt.classList.remove('selected');
                    opt.style.borderColor = '#eee';
                    opt.style.backgroundColor = '#fff';
                    opt.style.transition = 'none';
                });
                
                // Select this option immediately with static styles
                newOption.classList.add('selected');
                newOption.style.borderColor = '#27ae60';
                newOption.style.backgroundColor = '#f0f8f0';
                newOption.style.transition = 'none';
                
                this.selectedPaymentMethod = newOption.dataset.payment;
                console.log('Selected payment method updated to:', this.selectedPaymentMethod);
            });
            
            // Add static hover effects
            newOption.addEventListener('mouseenter', () => {
                if (!newOption.classList.contains('selected')) {
                    newOption.style.borderColor = '#27ae60';
                    newOption.style.backgroundColor = '#f8fff8';
                    newOption.style.transition = 'none';
                }
            });
            
            newOption.addEventListener('mouseleave', () => {
                if (!newOption.classList.contains('selected')) {
                    newOption.style.borderColor = '#eee';
                    newOption.style.backgroundColor = '#fff';
                    newOption.style.transition = 'none';
                }
            });
        });
    }

    updatePaymentDisplay() {
        const selectedPaymentEl = document.getElementById('selectedPaymentText');
        if (!selectedPaymentEl) return;

        const paymentNames = {
            'gcash': 'GCash',
            'maya': 'Maya',
            'cod': 'Cash on Delivery (COD)'
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
    // PAYMENT PROCESSING
    // ================================

    // Handle payment method selection confirmation
    confirmPaymentSelection() {
        console.log('confirmPaymentSelection called, current selectedPaymentMethod:', this.selectedPaymentMethod);
        
        // First check if there's a selected option in the DOM
        const selectedOption = document.querySelector('.payment-option.selected');
        console.log('Selected option in DOM:', selectedOption);
        
        if (selectedOption) {
            this.selectedPaymentMethod = selectedOption.dataset.payment;
            console.log('Payment method from DOM:', this.selectedPaymentMethod);
        }

        // Now check if we have a payment method
        if (!this.selectedPaymentMethod) {
            console.log('No payment method selected, showing error');
            this.showError('Please select a payment method');
            return;
        }

        const paymentTexts = {
            'gcash': 'GCash',
            'maya': 'Maya',
            'cod': 'Cash on Delivery (COD)'
        };

        const selectedPaymentText = document.getElementById('selectedPaymentText');
        if (selectedPaymentText) {
            selectedPaymentText.textContent = paymentTexts[this.selectedPaymentMethod];
            console.log('Updated payment text to:', paymentTexts[this.selectedPaymentMethod]);
        }

        this.closeModal('paymentModal');
        this.showSuccess('Payment method updated');
    }

    // Handle place order button click
    async handlePlaceOrder() {
        if (this.isProcessing) return;

        // Validation
        if (!this.selectedAddressId) {
            this.showError('Please select a delivery address');
            return;
        }

        if (!this.selectedPaymentMethod) {
            this.showError('Please select a payment method');
            return;
        }

        if (!this.cartItems || this.cartItems.length === 0) {
            this.showError('Your cart is empty');
            return;
        }

        // Handle different payment methods
        switch (this.selectedPaymentMethod) {
            case 'gcash':
                this.showGcashPaymentModal();
                break;
            case 'maya':
                this.showMayaPaymentModal();
                break;
            case 'cod':
                await this.processCODOrder();
                break;
            default:
                this.showError('Invalid payment method selected');
        }
    }

    // Show GCash payment modal
    showGcashPaymentModal() {
        const total = this.calculateOrderTotal();
        document.getElementById('gcashAmount').textContent = `₱${total.toFixed(2)}`;
        
        // Clear previous reference number
        const gcashReference = document.getElementById('gcashReference');
        if (gcashReference) {
            gcashReference.value = '';
        }
        
        this.openModal('gcashPaymentModal');
    }

    // Show Maya payment modal
    showMayaPaymentModal() {
        const total = this.calculateOrderTotal();
        document.getElementById('mayaAmount').textContent = `₱${total.toFixed(2)}`;
        
        // Clear previous reference number
        const mayaReference = document.getElementById('mayaReference');
        if (mayaReference) {
            mayaReference.value = '';
        }
        
        this.openModal('mayaPaymentModal');
    }

    // Validate GCash reference number
    validateGcashReference() {
        const gcashReference = document.getElementById('gcashReference');
        const errorElement = document.getElementById('gcashReferenceError');
        const confirmBtn = document.getElementById('confirmGcashPayment');
        
        if (!gcashReference || !errorElement || !confirmBtn) return false;

        const referenceNumber = gcashReference.value.trim();
        const isValid = referenceNumber.length === 12 && /^\d{12}$/.test(referenceNumber);

        // Clear previous errors
        errorElement.style.display = 'none';
        errorElement.textContent = '';
        gcashReference.classList.remove('error');

        if (referenceNumber.length > 0) {
            if (!isValid) {
                errorElement.style.display = 'block';
                errorElement.textContent = 'Reference number must be exactly 12 digits';
                gcashReference.classList.add('error');
                confirmBtn.disabled = true;
                return false;
            }

            // Check for repeated digits (simple fraud detection)
            if (this.isRepeatedDigits(referenceNumber)) {
                errorElement.style.display = 'block';
                errorElement.textContent = 'Invalid reference number format. Please check your transaction details.';
                gcashReference.classList.add('error');
                confirmBtn.disabled = true;
                return false;
            }
        }

        confirmBtn.disabled = referenceNumber.length !== 12;
        return isValid;
    }

    // Validate Maya reference number
    validateMayaReference() {
        const mayaReference = document.getElementById('mayaReference');
        const errorElement = document.getElementById('mayaReferenceError');
        const confirmBtn = document.getElementById('confirmMayaPayment');
        
        if (!mayaReference || !errorElement || !confirmBtn) return false;

        const referenceNumber = mayaReference.value.trim();
        const isValid = referenceNumber.length === 12 && /^\d{12}$/.test(referenceNumber);

        // Clear previous errors
        errorElement.style.display = 'none';
        errorElement.textContent = '';
        mayaReference.classList.remove('error');

        if (referenceNumber.length > 0) {
            if (!isValid) {
                errorElement.style.display = 'block';
                errorElement.textContent = 'Reference number must be exactly 12 digits';
                mayaReference.classList.add('error');
                confirmBtn.disabled = true;
                return false;
            }

            // Check for repeated digits (simple fraud detection)
            if (this.isRepeatedDigits(referenceNumber)) {
                errorElement.style.display = 'block';
                errorElement.textContent = 'Invalid reference number format. Please check your transaction details.';
                mayaReference.classList.add('error');
                confirmBtn.disabled = true;
                return false;
            }
        }

        confirmBtn.disabled = referenceNumber.length !== 12;
        return isValid;
    }

    // Helper function to check for repeated digits
    isRepeatedDigits(str) {
        if (str.length < 2) return false;
        
        // Check if all digits are the same
        const firstDigit = str[0];
        return str.split('').every(digit => digit === firstDigit);
    }

    // Confirm GCash payment
    async confirmGcashPayment() {
        const gcashReference = document.getElementById('gcashReference');
        if (!gcashReference) return;

        const referenceNumber = gcashReference.value.trim();
        
        if (!this.validateGcashReference() || referenceNumber.length !== 12) {
            this.showError('Please enter a valid 12-digit GCash reference number');
            return;
        }

        await this.processDigitalPaymentOrder('gcash', referenceNumber);
    }

    // Confirm Maya payment
    async confirmMayaPayment() {
        const mayaReference = document.getElementById('mayaReference');
        if (!mayaReference) return;

        const referenceNumber = mayaReference.value.trim();
        
        if (!this.validateMayaReference() || referenceNumber.length !== 12) {
            this.showError('Please enter a valid 12-digit Maya reference number');
            return;
        }

        await this.processDigitalPaymentOrder('maya', referenceNumber);
    }

    // Process digital payment order (GCash/Maya)
    async processDigitalPaymentOrder(paymentMethod, referenceNumber) {
        if (this.isProcessing) return;
        this.isProcessing = true;

        try {
            const orderData = {
                addressId: this.selectedAddressId,
                paymentMethod: paymentMethod,
                referenceNumber: referenceNumber,
                items: this.cartItems.map(item => ({
                    productId: item.productId || item._id,
                    quantity: item.quantity,
                    price: item.price
                })),
                subtotal: this.calculateSubtotal(),
                shippingFee: 60,
                tax: this.calculateTax(),
                total: this.calculateOrderTotal(),
                deliveryInstructions: document.querySelector('textarea[placeholder*="delivery"]')?.value || ''
            };

            console.log('Processing order:', orderData);
            console.log('Cart items:', this.cartItems);
            console.log('Selected address ID:', this.selectedAddressId);

            const response = await fetch(`${this.apiBaseUrl}/checkout/place-order`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(orderData)
            });

            const result = await response.json();
            console.log('Order response:', result);
            if (result.success) {
                // Close payment modal
                this.closeModal(paymentMethod + 'PaymentModal');
                // Show success modal
                this.showOrderSuccessModal(result.order, paymentMethod, referenceNumber);
                // Clear cart
                await window.CartUtils.clearCart();
                this.cartItems = [];
                this.updateCartDisplay();
            } else {
                // Show more detailed error if available
                let errorMsg = result.message || 'Failed to process order';
                if (result.error) errorMsg += `: ${result.error}`;
                if (result.details) errorMsg += `\nDetails: ${result.details}`;
                this.showError(errorMsg);
                // Log full error for debugging
                console.error('Order error response:', result);
            }
        } catch (error) {
            console.error('Error processing order:', error);
            this.showError('Failed to process order. Please try again.');
        } finally {
            this.isProcessing = false;
        }
    }

    // Process COD order
    async processCODOrder() {
        if (this.isProcessing) return;
        this.isProcessing = true;

        try {
            const orderData = {
                addressId: this.selectedAddressId,
                paymentMethod: 'cod',
                items: this.cartItems.map(item => ({
                    productId: item.productId || item._id,
                    quantity: item.quantity,
                    price: item.price
                })),
                subtotal: this.calculateSubtotal(),
                shippingFee: 60,
                tax: this.calculateTax(),
                total: this.calculateOrderTotal(),
                deliveryInstructions: document.querySelector('textarea[placeholder*="delivery"]')?.value || ''
            };

            console.log('Processing COD order:', orderData);
            console.log('Cart items:', this.cartItems);
            console.log('Selected address ID:', this.selectedAddressId);

            const response = await fetch(`${this.apiBaseUrl}/checkout/place-order`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(orderData)
            });

            const result = await response.json();
            console.log('COD order response:', result);
            if (result.success) {
                // Show success modal
                this.showOrderSuccessModal(result.order, 'cod', null);
                // Clear cart
                await window.CartUtils.clearCart();
                this.cartItems = [];
                this.updateCartDisplay();
            } else {
                // Show more detailed error if available
                let errorMsg = result.message || 'Failed to process order';
                if (result.error) errorMsg += `: ${result.error}`;
                if (result.details) errorMsg += `\nDetails: ${result.details}`;
                this.showError(errorMsg);
                // Log full error for debugging
                console.error('Order error response:', result);
            }
        } catch (error) {
            console.error('Error processing COD order:', error);
            this.showError('Failed to process order. Please try again.');
        } finally {
            this.isProcessing = false;
        }
    }

    // Show order success modal
    showOrderSuccessModal(order, paymentMethod, referenceNumber) {
        const paymentMethodNames = {
            'gcash': 'GCash',
            'maya': 'Maya',
            'cod': 'Cash on Delivery'
        };

        // Update modal content
        document.getElementById('orderIdDisplay').textContent = order.orderNumber || order._id;
        document.getElementById('paymentMethodDisplay').textContent = paymentMethodNames[paymentMethod];
        document.getElementById('referenceNumberDisplay').textContent = referenceNumber || 'N/A';
        document.getElementById('totalAmountDisplay').textContent = `₱${order.total.toFixed(2)}`;

        this.openModal('orderSuccessModal');
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
        modal.className = 'success-modal';
        
        // Apply static styles directly
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            transition: none;
            animation: none;
        `;
        
        modal.innerHTML = `
            <div class="success-content" style="
                background: white;
                padding: 2rem;
                border-radius: 8px;
                text-align: center;
                max-width: 500px;
                margin: 20px;
                transition: none;
                animation: none;
                transform: none;
            ">
                <img src="/assets/checkout webpage/success.png" alt="Success" class="success-icon" style="width: 80px; height: 80px; margin-bottom: 1rem;">
                <h2>Order Placed Successfully!</h2>
                <p>Thank you for your order!</p>
                <div class="order-details">
                    <p><strong>Order ID:</strong> ${transaction.transactionId || transaction.id}</p>
                    <p><strong>Total Amount:</strong> ₱${transaction.totalAmount.toLocaleString()}</p>
                    <p><strong>Delivery Address:</strong> ${transaction.deliveryAddress.fullName}<br>
                       ${transaction.deliveryAddress.address}</p>
                    <p><strong>Estimated Delivery:</strong> ${new Date(transaction.estimatedDelivery).toLocaleDateString()}</p>
                </div>
                <div class="success-actions" style="margin-top: 1.5rem;">
                    <button class="btn-primary" onclick="this.closest('.success-modal').remove(); window.location.href='/shop'" style="margin-right: 10px;">
                        Continue Shopping
                    </button>
                    <button class="btn-secondary" onclick="this.closest('.success-modal').remove(); window.location.href='/profile'">
                        View Orders
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        // Auto-remove after 8 seconds - no animations
        setTimeout(() => {
            if (modal && modal.parentNode) {
                modal.remove();
            }
        }, 8000);
    }

    // ================================
    // UTILITY METHODS
    // ================================

    // Simple static modal management - no animations, centered design
    openModal(modalId) {
        console.log('Opening modal:', modalId);
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
            console.log('Modal opened successfully (centered and static)');
        } else {
            console.error('Modal not found:', modalId);
        }
    }

    closeModal(modalId) {
        console.log('Closing modal:', modalId);
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
            console.log('Modal closed successfully (static)');
        } else {
            console.error('Modal not found:', modalId);
        }
    }

    closeAllModals() {
        const modals = document.querySelectorAll('.payment-modal');
        modals.forEach(modal => {
            // Force immediate hide with !important overrides
            modal.style.cssText = `
                display: none !important;
                opacity: 0 !important;
                visibility: hidden !important;
                transition: none !important;
                animation: none !important;
            `;
            modal.classList.remove('active');
        });
        document.body.style.overflow = '';
    }

    calculateSubtotal() {
        return this.cartItems.reduce((total, item) => {
            return total + (item.price * item.quantity);
        }, 0);
    }

    calculateTax() {
        const subtotal = this.calculateSubtotal();
        return subtotal * 0.12; // 12% tax
    }

    calculateOrderTotal() {
        const subtotal = this.calculateSubtotal();
        const shipping = 60; // Fixed shipping fee
        const tax = this.calculateTax();
        return subtotal + shipping + tax;
    }

    // Handle save address form submission
    async handleSaveAddress() {
        const form = document.getElementById('addAddressForm');
        if (!form) return;

        const formData = new FormData(form);
        await this.saveNewAddress(formData);
    }

    // Simple event listener setup
    initializeEventListeners() {
        // Payment modal button
        const openPaymentModal = document.getElementById('openPaymentModal');
        if (openPaymentModal) {
            openPaymentModal.addEventListener('click', (e) => {
                e.preventDefault();
                this.showPaymentModal();
            });
        }

        // Select address button (appears dynamically)
        document.addEventListener('click', (e) => {
            if (e.target && e.target.id === 'selectAddressBtn') {
                e.preventDefault();
                console.log('Select address button clicked');
                this.showAddressModal();
            }
        });

        // Edit address button (appears dynamically)
        document.addEventListener('click', (e) => {
            if (e.target && e.target.id === 'editAddressBtn') {
                e.preventDefault();
                console.log('Edit address button clicked');
                if (this.selectedAddressId) {
                    this.editAddress(this.selectedAddressId);
                } else {
                    this.showError('No address selected to edit');
                }
            }
        });

        // Add address button (appears dynamically)
        document.addEventListener('click', (e) => {
            if (e.target && e.target.id === 'addAddressBtn') {
                e.preventDefault();
                console.log('Add address button clicked');
                this.showNewAddressModal();
            }
        });

        // Complete purchase button
        const completeBtn = document.querySelector('.complete-btn');
        if (completeBtn) {
            completeBtn.addEventListener('click', () => this.handlePlaceOrder());
        }

        // Payment modal buttons
        this.setupPaymentModalButtons();

        // Address form submission
        this.setupAddressFormSubmission();
    }

    setupPaymentModalButtons() {
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

        // GCash payment modal buttons
        const closeGcashModal = document.getElementById('closeGcashModal');
        if (closeGcashModal) {
            closeGcashModal.addEventListener('click', () => {
                this.closeModal('gcashPaymentModal');
            });
        }

        const confirmGcashPayment = document.getElementById('confirmGcashPayment');
        if (confirmGcashPayment) {
            confirmGcashPayment.addEventListener('click', () => {
                this.confirmGcashPayment();
            });
        }

        const cancelGcashPayment = document.getElementById('cancelGcashPayment');
        if (cancelGcashPayment) {
            cancelGcashPayment.addEventListener('click', () => {
                this.closeModal('gcashPaymentModal');
            });
        }

        // Maya payment modal buttons
        const closeMayaModal = document.getElementById('closeMayaModal');
        if (closeMayaModal) {
            closeMayaModal.addEventListener('click', () => {
                this.closeModal('mayaPaymentModal');
            });
        }

        const confirmMayaPayment = document.getElementById('confirmMayaPayment');
        if (confirmMayaPayment) {
            confirmMayaPayment.addEventListener('click', () => {
                this.confirmMayaPayment();
            });
        }

        const cancelMayaPayment = document.getElementById('cancelMayaPayment');
        if (cancelMayaPayment) {
            cancelMayaPayment.addEventListener('click', () => {
                this.closeModal('mayaPaymentModal');
            });
        }

        // Order Success Modal buttons
        const goToOrders = document.getElementById('goToOrders');
        if (goToOrders) {
            goToOrders.addEventListener('click', () => {
                window.location.href = '/profile?tab=orders';
            });
        }

        const continueShopping = document.getElementById('continueShopping');
        if (continueShopping) {
            continueShopping.addEventListener('click', () => {
                window.location.href = '/shop';
            });
        }
    }

    setupAddressFormSubmission() {
        // Add address form
        const addAddressForm = document.getElementById('addAddressForm');
        if (addAddressForm) {
            addAddressForm.addEventListener('submit', (e) => {
                e.preventDefault();
                console.log('Add address form submitted');
                this.saveNewAddressFromForm();
            });
        }

        // Save address button
        const saveAddress = document.getElementById('saveAddress');
        if (saveAddress) {
            saveAddress.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Save address button clicked');
                this.saveNewAddressFromForm();
            });
        }

        // Cancel buttons - Updated to go back to address selection
        const cancelAddAddress = document.getElementById('cancelAddAddress');
        if (cancelAddAddress) {
            cancelAddAddress.addEventListener('click', () => {
                console.log('Cancel add address clicked');
                this.closeModal('addAddressModal');
                // If user has addresses, show the address selection modal immediately
                if (this.userAddresses.length > 0) {
                    this.showAddressModal();
                }
            });
        }

        const closeAddAddressModal = document.getElementById('closeAddAddressModal');
        if (closeAddAddressModal) {
            closeAddAddressModal.addEventListener('click', () => {
                console.log('Close add address modal clicked');
                this.closeModal('addAddressModal');
                // If user has addresses, show the address selection modal immediately
                if (this.userAddresses.length > 0) {
                    this.showAddressModal();
                }
            });
        }
    }

    // Simplified form data collection
    saveNewAddressFromForm() {
        const addressData = {
            type: document.getElementById('addressType')?.value || 'Home',
            fullName: document.getElementById('fullName')?.value || '',
            phone: document.getElementById('phone')?.value || '',
            street: document.getElementById('street')?.value || '',
            barangay: document.getElementById('barangay')?.value || '',
            city: document.getElementById('city')?.value || '',
            province: document.getElementById('province')?.value || '',
            isPrimary: document.getElementById('isPrimary')?.checked || false
        };

        this.saveNewAddressData(addressData);
    }

    // Save address with clean data object
    async saveNewAddressData(addressData) {
        // Validate required fields
        const requiredFields = ['type', 'fullName', 'street', 'barangay', 'city', 'province', 'phone'];
        const missingFields = requiredFields.filter(field => !addressData[field] || addressData[field].trim() === '');
        
        if (missingFields.length > 0) {
            this.showError(`Please fill in all required fields: ${missingFields.join(', ')}`);
            return;
        }

        try {
            const response = await fetch(`${this.apiBaseUrl}/addresses`, {
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
                
                // Reload addresses
                await this.loadUserAddresses();
                
                // If there are addresses now, show the address selection modal immediately
                if (this.userAddresses.length > 0) {
                    this.showAddressModal();
                }
            } else {
                this.showError(result.message || 'Failed to save address');
            }
        } catch (error) {
            console.error('Error saving address:', error);
            this.showError('Failed to save address. Please try again.');
        }
    }

    // Setup navigation handlers for hamburger menu
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
            toastContainer.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                max-width: 400px;
            `;
            document.body.appendChild(toastContainer);
        }

        // Remove existing toasts immediately
        const existingToasts = toastContainer.querySelectorAll(`.toast.toast-${type}`);
        existingToasts.forEach(toast => {
            toast.remove();
        });

        const toast = document.createElement('div');
        toast.className = `toast toast-${type} toast-with-icon`;
        
        // Apply static styles directly
        toast.style.cssText = `
            display: block;
            opacity: 1;
            transform: none;
            transition: none;
            animation: none;
            margin-bottom: 10px;
            padding: 12px 16px;
            border-radius: 6px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
            background: ${type === 'error' ? '#f8d7da' : type === 'success' ? '#d4edda' : '#d1ecf1'};
            border: 1px solid ${type === 'error' ? '#f5c6cb' : type === 'success' ? '#c3e6cb' : '#bee5eb'};
            color: ${type === 'error' ? '#721c24' : type === 'success' ? '#155724' : '#0c5460'};
            font-size: 14px;
            cursor: pointer;
        `;
        
        const icons = {
            success: '<img src="/assets/checkout webpage/success.png" alt="Success" class="toast-icon-img" style="width: 20px; height: 20px; margin-right: 8px; vertical-align: middle;">',
            error: '<img src="/assets/checkout webpage/error.png" alt="Error" class="toast-icon-img" style="width: 20px; height: 20px; margin-right: 8px; vertical-align: middle;">',
            warning: '<img src="/assets/checkout webpage/warning.png" alt="Warning" class="toast-icon-img" style="width: 20px; height: 20px; margin-right: 8px; vertical-align: middle;">',
            info: '<img src="/assets/checkout webpage/info.png" alt="Info" class="toast-icon-img" style="width: 20px; height: 20px; margin-right: 8px; vertical-align: middle;">'
        };
        
        toast.innerHTML = `
            <span class="toast-icon">${icons[type] || icons.info}</span>
            <span class="toast-message">${message}</span>
        `;
        
        toastContainer.appendChild(toast);
        
        // Auto-remove after 3 seconds - no animations
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, 3000);
        
        // Allow manual close on click
        toast.addEventListener('click', () => {
            if (toast.parentNode) {
                toast.remove();
            }
        });
    }

    updateUI() {
        this.updateAddressDisplay();
        this.updatePaymentDisplay();
        this.updateCartDisplay();
    }

    // Cancel edit address and go back to address selection - static
    cancelEditAddress() {
        console.log('cancelEditAddress called');
        this.closeModal('editAddressModal');
        
        // Go back to address selection modal immediately
        this.showAddressModal();
    }
}

// Export CheckoutManager for global access
window.CheckoutManager = CheckoutManager;

// Initialize checkout manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.checkoutManager = new CheckoutManager();
});
