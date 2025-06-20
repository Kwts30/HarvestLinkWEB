// Global variables for address selection
let selectedAddressId = null;
let userAddresses = [];

// Global variables for payment selection
let selectedPaymentMethod = null;
let selectedBank = null;

// Utility function to safely get user ID
function getUserId() {
    const currentUser = window.AuthUtils.getCurrentUser();
    console.log('getUserId - Raw currentUser from localStorage:', currentUser);
    
    if (!currentUser) {
        console.error('No current user found');
        return null;
    }
    
    // Try multiple approaches to get user ID
    let userId = null;
    
    // Try id field first (from session/frontend)
    if (currentUser.id) {
        userId = typeof currentUser.id === 'string' ? currentUser.id : currentUser.id.toString();
    }
    // Try _id field (from MongoDB)
    else if (currentUser._id) {
        userId = typeof currentUser._id === 'string' ? currentUser._id : currentUser._id.toString();
    }
    
    console.log('getUserId - Extracted user ID:', userId);
    console.log('getUserId - currentUser.id:', currentUser.id, typeof currentUser.id);
    console.log('getUserId - currentUser._id:', currentUser._id, typeof currentUser._id);
    
    if (!userId) {
        console.error('No valid user ID found in user object:', currentUser);
        console.error('Available fields:', Object.keys(currentUser));
        return null;
    }
    
    return userId;
}

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

    // Initialize payment modal functionality
    initializePaymentModal();
      // Initialize address functionality
    initializeAddressModal();
    initializeAddAddressModal();
    loadUserAddresses();

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
    // Check if payment method is selected
    if (!processPayment()) {
        return;
    }

    // Show success message
    const successModal = document.createElement('div');
    successModal.className = 'success-modal active';
    successModal.innerHTML = `
        <div class="success-content">
            <div class="success-icon">✅</div>
            <h2>Purchase Successful!</h2>
            <p>Thank you for your order. Your purchase has been completed successfully!</p>
            <p><strong>Payment Method:</strong> ${getPaymentDisplayText()}</p>
            <button class="success-btn" onclick="closeSuccessModal()">Continue Shopping</button>
        </div>
    `;
    document.body.appendChild(successModal);

    // Clear cart and address data
    localStorage.removeItem('harvestlink-cart');
    localStorage.removeItem('harvestlink-address');
}

// Get payment display text for confirmation
function getPaymentDisplayText() {
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

    if (selectedPaymentMethod) {
        let displayText = paymentNames[selectedPaymentMethod];
        if (selectedPaymentMethod === 'online-banking' && selectedBank) {
            displayText += ` - ${bankNames[selectedBank]}`;
        }
        return displayText;
    }
    return 'Not selected';
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
        
        // If cart is empty, load sample data
        if (cart.length === 0) {
            const sampleCart = [
                { name: 'Bell Peppers', quantity: 1, price: 150.00 },
                { name: 'Sweet Corn', quantity: 1, price: 100.00 },
                { name: 'Fresh Lettuce', quantity: 1, price: 60.00 },
                { name: 'Organic Carrots', quantity: 1, price: 80.00 },
                { name: 'Fresh Tomatoes', quantity: 1, price: 120.00 }
            ];
            
            sampleCart.forEach(item => {
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
        } else {
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
        }
          // Add subtotal row (items total only)
        const subtotalRow = document.createElement('tr');
        subtotalRow.className = 'total-row';
        subtotalRow.innerHTML = `
            <td colspan="3"><strong>Subtotal</strong></td>
            <td><strong id="cartSubtotal">₱${subtotal.toFixed(2)}</strong></td>
        `;
        tbody.appendChild(subtotalRow);
        
        // Calculate shipping, tax, and total
        const shipping = 60;
        const taxRate = 0.12; // 12% tax
        const tax = subtotal * taxRate;
        const totalAmount = subtotal + shipping + tax;
          // Update summary using specific IDs
        document.getElementById('orderSubtotal').textContent = `₱${subtotal.toFixed(2)}`;
        document.getElementById('orderShipping').textContent = `₱${shipping.toFixed(2)}`;
        document.getElementById('orderTax').textContent = `₱${tax.toFixed(2)}`;
        document.getElementById('orderTotal').textContent = `₱${totalAmount.toFixed(2)}`;
        
        // Also update the cart subtotal if it exists (for when page loads with existing HTML)
        const existingCartSubtotal = document.getElementById('cartSubtotal');
        if (existingCartSubtotal) {
            existingCartSubtotal.textContent = `₱${subtotal.toFixed(2)}`;
        }
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

// Initialize payment modal functionality
function initializePaymentModal() {
    const openPaymentModalBtn = document.getElementById('openPaymentModal');
    const paymentModal = document.getElementById('paymentModal');
    const bankModal = document.getElementById('bankModal');
    const closePaymentModal = document.getElementById('closePaymentModal');
    const closeBankModal = document.getElementById('closeBankModal');
    const confirmPaymentBtn = document.getElementById('confirmPayment');
    const cancelPaymentBtn = document.getElementById('cancelPayment');
    const confirmBankBtn = document.getElementById('confirmBank');
    const cancelBankBtn = document.getElementById('cancelBank');
    const selectedPaymentText = document.getElementById('selectedPaymentText');

    // Payment options
    const paymentOptions = document.querySelectorAll('.payment-option');
    const bankOptions = document.querySelectorAll('.bank-option');

    // Open payment modal
    openPaymentModalBtn.addEventListener('click', function() {
        paymentModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    });

    // Close payment modal
    function closePaymentModalFunc() {
        paymentModal.classList.remove('active');
        document.body.style.overflow = '';
        clearPaymentSelection();
    }

    // Close bank modal
    function closeBankModalFunc() {
        bankModal.classList.remove('active');
        document.body.style.overflow = '';
        clearBankSelection();
    }

    closePaymentModal.addEventListener('click', closePaymentModalFunc);
    cancelPaymentBtn.addEventListener('click', closePaymentModalFunc);
    
    closeBankModal.addEventListener('click', closeBankModalFunc);
    cancelBankBtn.addEventListener('click', function() {
        closeBankModalFunc();
        paymentModal.classList.add('active');
    });

    // Click outside modal to close
    paymentModal.addEventListener('click', function(e) {
        if (e.target === paymentModal) {
            closePaymentModalFunc();
        }
    });

    bankModal.addEventListener('click', function(e) {
        if (e.target === bankModal) {
            closeBankModalFunc();
        }
    });

    // Payment option selection
    paymentOptions.forEach(option => {
        option.addEventListener('click', function() {
            paymentOptions.forEach(opt => opt.classList.remove('selected'));
            this.classList.add('selected');
            selectedPaymentMethod = this.dataset.payment;
            updateConfirmButton();
        });
    });

    // Bank option selection
    bankOptions.forEach(option => {
        option.addEventListener('click', function() {
            bankOptions.forEach(opt => opt.classList.remove('selected'));
            this.classList.add('selected');
            selectedBank = this.dataset.bank;
            updateBankConfirmButton();
        });
    });

    // Confirm payment selection
    confirmPaymentBtn.addEventListener('click', function() {
        if (selectedPaymentMethod === 'online-banking') {
            // Open bank selection modal
            paymentModal.classList.remove('active');
            bankModal.classList.add('active');
        } else {
            // Complete payment method selection
            updateSelectedPaymentDisplay();
            closePaymentModalFunc();
        }
    });

    // Confirm bank selection
    confirmBankBtn.addEventListener('click', function() {
        updateSelectedPaymentDisplay();
        closeBankModalFunc();
        selectedPaymentMethod = 'online-banking';
    });

    function clearPaymentSelection() {
        paymentOptions.forEach(opt => opt.classList.remove('selected'));
        selectedPaymentMethod = null;
        updateConfirmButton();
    }

    function clearBankSelection() {
        bankOptions.forEach(opt => opt.classList.remove('selected'));
        selectedBank = null;
        updateBankConfirmButton();
    }

    function updateConfirmButton() {
        confirmPaymentBtn.disabled = !selectedPaymentMethod;
    }

    function updateBankConfirmButton() {
        confirmBankBtn.disabled = !selectedBank;
    }

    function updateSelectedPaymentDisplay() {
        let displayText = '';
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

        if (selectedPaymentMethod) {
            displayText = paymentNames[selectedPaymentMethod];
            if (selectedPaymentMethod === 'online-banking' && selectedBank) {
                displayText += ` - ${bankNames[selectedBank]}`;
            }
        } else {
            displayText = 'Select Payment Method';
        }

        selectedPaymentText.textContent = displayText;
    }

    // Initialize confirm button state
    updateConfirmButton();
    updateBankConfirmButton();
}

// Load user addresses
async function loadUserAddresses() {
    const currentUser = window.AuthUtils.getCurrentUser();
    if (!currentUser) return;

    // Hide loading message
    document.getElementById('loadingAddressMessage').style.display = 'none';
      // Debug: Check what user data we have
    const userId = getUserId();
    
    if (!userId) {
        console.error('No user ID found - cannot load addresses');
        userAddresses = [];
        document.getElementById('addAddressContainer').style.display = 'block';
        document.getElementById('selectedAddressCard').style.display = 'none';
        document.getElementById('editAddressBtn').style.display = 'none';
        return;
    }
    
    try {
        // Load addresses from MongoDB using API
        const response = await fetch(`http://localhost:3000/api/users/${userId}/addresses`);
        const data = await response.json();
        
        if (data.success) {
            userAddresses = data.addresses || [];
        } else {
            console.error('Failed to load addresses:', data.message);
            userAddresses = [];
        }
    } catch (error) {
        console.error('Error loading addresses:', error);
        userAddresses = [];
    }

    if (userAddresses.length === 0) {
        // Show add address container
        document.getElementById('addAddressContainer').style.display = 'block';
        document.getElementById('selectedAddressCard').style.display = 'none';
        document.getElementById('editAddressBtn').style.display = 'none';    } else {
        // Show address card and edit button
        document.getElementById('addAddressContainer').style.display = 'none';
        document.getElementById('selectedAddressCard').style.display = 'block';
        
        // Set the primary address as selected by default
        const primaryAddress = userAddresses.find(addr => addr.isPrimary);
        const selectedAddress = primaryAddress || userAddresses[0]; // Fallback to first address
        
        if (selectedAddress) {
            selectedAddressId = selectedAddress._id; // Use MongoDB _id
            updateSelectedAddressDisplay(selectedAddress);
        }

        // Always show edit button when user has addresses
        const editBtn = document.getElementById('editAddressBtn');
        editBtn.style.display = 'inline-block';
    }
}

// Initialize address modal functionality
function initializeAddressModal() {
    const editAddressBtn = document.getElementById('editAddressBtn');
    const addressModal = document.getElementById('addressModal');
    const closeAddressModal = document.getElementById('closeAddressModal');
    const confirmAddressBtn = document.getElementById('confirmAddress');
    const cancelAddressBtn = document.getElementById('cancelAddress');
    const addressModalBody = document.getElementById('addressModalBody');

    // Open address modal
    editAddressBtn.addEventListener('click', function() {
        loadAddressOptions();
        addressModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    });

    // Close address modal
    function closeAddressModalFunc() {
        addressModal.classList.remove('active');
        document.body.style.overflow = '';
        clearAddressSelection();
    }

    closeAddressModal.addEventListener('click', closeAddressModalFunc);
    cancelAddressBtn.addEventListener('click', closeAddressModalFunc);

    // Click outside modal to close
    addressModal.addEventListener('click', function(e) {
        if (e.target === addressModal) {
            closeAddressModalFunc();
        }
    });    // Confirm address selection
    confirmAddressBtn.addEventListener('click', function() {
        if (selectedAddressId && selectedAddressId !== 'add-new') {
            const selectedAddress = userAddresses.find(addr => addr._id === selectedAddressId);
            if (selectedAddress) {
                updateSelectedAddressDisplay(selectedAddress);
                closeAddressModalFunc();
            }
        }
    });    function clearAddressSelection() {
        const addressOptions = document.querySelectorAll('.address-option');
        addressOptions.forEach(opt => opt.classList.remove('selected'));
        selectedAddressId = null;
        updateAddressConfirmButton();
    }

    function updateAddressConfirmButton() {
        confirmAddressBtn.disabled = !selectedAddressId;
    }

    // Initialize confirm button state
    updateAddressConfirmButton();
}

// Load address options in modal
function loadAddressOptions() {
    const addressModalBody = document.getElementById('addressModalBody');
      // Create the existing addresses list
    let addressOptionsHTML = userAddresses.map(address => `
        <div class="address-option" data-address-id="${address._id}">
            <span class="address-type">${address.type}</span>
            <div class="address-details">
                <div style="font-weight: bold; color: #45a049; margin-bottom: 5px;">${address.fullName}</div>
                <div>${address.street}</div>
                <div>${getFormattedAddress(address)}</div>
                <div style="color: #666; font-size: 13px; margin-top: 5px;">${address.phone}</div>
            </div>
            <div class="address-actions">
                <button class="edit-address-icon" data-address-id="${address._id}" title="Edit Address">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                </button>
                <div class="radio-indicator"></div>
            </div>
        </div>
    `).join('');      // Always add an "Add New Address" option
    addressOptionsHTML += `
        <div class="address-option add-new-address" data-address-id="add-new" style="border: 2px dashed #45a049; background: #f9f9f9;">
            <span class="address-type" style="color: #45a049;">+ Add New</span>
            <div class="address-details">
                <div style="color: #45a049; font-weight: bold;">Add a new delivery address</div>
                <div style="color: #666; font-size: 13px;">Create a new address for delivery</div>
            </div>
            <div class="radio-indicator"></div>
        </div>
    `;
    
    addressModalBody.innerHTML = addressOptionsHTML;    // Add click event listeners to address options
    const addressOptions = document.querySelectorAll('.address-option');
    addressOptions.forEach(option => {
        option.addEventListener('click', function(e) {
            // Don't handle clicks on the edit button
            if (e.target.closest('.edit-address-icon')) {
                return;
            }
            
            const addressId = this.dataset.addressId;
              // Handle "Add New Address" option
            if (addressId === 'add-new') {
                // Close the address selection modal
                document.getElementById('addressModal').classList.remove('active');
                
                // Reset modal for adding mode
                const modalHeader = document.querySelector('#addAddressModal .modal-header h3');
                const saveButton = document.getElementById('saveAddress');
                modalHeader.textContent = 'Add New Address';
                saveButton.textContent = 'Save Address';
                saveButton.dataset.mode = 'add';
                delete saveButton.dataset.addressId;
                
                // Open the add address modal
                document.getElementById('addAddressModal').classList.add('active');
                
                // Pre-fill full name with current user's name
                const currentUser = window.AuthUtils.getCurrentUser();
                if (currentUser) {
                    document.getElementById('fullName').value = `${currentUser.firstName} ${currentUser.lastName}`;
                }
                return;
            }
            
            // Handle regular address selection
            addressOptions.forEach(opt => opt.classList.remove('selected'));
            this.classList.add('selected');
            selectedAddressId = addressId; // Use MongoDB _id as string
            updateAddressConfirmButton();
        });
    });
    
    // Add click event listeners to edit buttons
    const editButtons = document.querySelectorAll('.edit-address-icon');
    editButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.stopPropagation(); // Prevent triggering the address selection
            const addressId = this.dataset.addressId;
            editAddress(addressId);
        });
    });// Pre-select the currently selected address (but not "add-new")
    if (selectedAddressId && selectedAddressId !== 'add-new') {
        const currentSelectedOption = document.querySelector(`[data-address-id="${selectedAddressId}"]`);
        if (currentSelectedOption) {
            currentSelectedOption.classList.add('selected');
        }
    }function updateAddressConfirmButton() {
        const confirmBtn = document.getElementById('confirmAddress');
        // Disable confirm button if no address is selected or if "add-new" is selected
        confirmBtn.disabled = !selectedAddressId || selectedAddressId === 'add-new';
    }

    updateAddressConfirmButton();
}

// Update selected address display
function updateSelectedAddressDisplay(address) {
    const addressCard = document.getElementById('selectedAddressCard');
    const nameElement = addressCard.querySelector('.name');
    const streetElement = addressCard.querySelector('.street');
    const cityElement = addressCard.querySelector('.city');
    const phoneElement = addressCard.querySelector('.phone');
    const labelElement = addressCard.querySelector('.address-label');

    nameElement.textContent = address.fullName;
    streetElement.textContent = address.street;
    
    // Format full address with all location details
    const fullAddress = getFormattedAddress(address);
    cityElement.textContent = fullAddress;
    
    phoneElement.textContent = `Phone: ${address.phone}`;
    labelElement.textContent = address.type.toUpperCase();

    // Update card styling based on address type
    addressCard.className = `address-card ${address.isPrimary ? 'primary' : ''}`;
}

// Initialize add address modal functionality
function initializeAddAddressModal() {
    const addAddressBtn = document.getElementById('addAddressBtn');
    const addAddressModal = document.getElementById('addAddressModal');
    const closeAddAddressModal = document.getElementById('closeAddAddressModal');
    const saveAddressBtn = document.getElementById('saveAddress');
    const cancelAddAddressBtn = document.getElementById('cancelAddAddress');
    const addAddressForm = document.getElementById('addAddressForm');    // Open add address modal
    addAddressBtn.addEventListener('click', function() {
        // Reset modal for adding mode
        const modalHeader = document.querySelector('#addAddressModal .modal-header h3');
        const saveButton = document.getElementById('saveAddress');
        
        modalHeader.textContent = 'Add New Address';
        saveButton.textContent = 'Save Address';
        saveButton.dataset.mode = 'add';
        delete saveButton.dataset.addressId;
        
        addAddressModal.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        // Pre-fill full name with current user's name
        const currentUser = window.AuthUtils.getCurrentUser();
        if (currentUser) {
            document.getElementById('fullName').value = `${currentUser.firstName} ${currentUser.lastName}`;
        }
    });    // Close add address modal
    function closeAddAddressModalFunc() {
        addAddressModal.classList.remove('active');
        document.body.style.overflow = '';
        addAddressForm.reset();
        
        // Reset modal to add mode
        const modalHeader = document.querySelector('#addAddressModal .modal-header h3');
        const saveButton = document.getElementById('saveAddress');
        modalHeader.textContent = 'Add New Address';
        saveButton.textContent = 'Save Address';
        saveButton.dataset.mode = 'add';
        delete saveButton.dataset.addressId;
    }

    closeAddAddressModal.addEventListener('click', closeAddAddressModalFunc);
    cancelAddAddressBtn.addEventListener('click', closeAddAddressModalFunc);

    // Click outside modal to close
    addAddressModal.addEventListener('click', function(e) {
        if (e.target === addAddressModal) {
            closeAddAddressModalFunc();
        }    });    // Save new/edited address
    saveAddressBtn.addEventListener('click', async function() {
        if (addAddressForm.checkValidity()) {
            const userId = getUserId();
            
            if (!userId) {
                alert('User ID not found. Please log in again.');
                return;
            }

            // Check if we're in edit mode
            const isEditMode = this.dataset.mode === 'edit';
            const addressId = this.dataset.addressId;

            // Show loading state
            saveAddressBtn.disabled = true;
            saveAddressBtn.textContent = isEditMode ? 'Updating...' : 'Saving...';

            const addressData = {
                type: document.getElementById('addressType').value,
                isPrimary: document.getElementById('isPrimary').checked || (!isEditMode && userAddresses.length === 0),
                fullName: document.getElementById('fullName').value,
                street: document.getElementById('street').value,
                barangay: document.getElementById('barangay').value,
                city: document.getElementById('city').value,
                province: document.getElementById('province').value,
                phone: document.getElementById('phone').value
            };

            try {
                let response, result;
                
                if (isEditMode) {
                    // Update existing address
                    response = await fetch(`http://localhost:3000/api/users/${userId}/addresses/${addressId}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(addressData)
                    });
                } else {
                    // Save new address
                    response = await fetch(`http://localhost:3000/api/users/${userId}/addresses`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(addressData)
                    });
                }

                result = await response.json();

                if (result.success) {
                    const updatedAddress = result.address;

                    if (isEditMode) {
                        // Update the address in local array
                        const index = userAddresses.findIndex(addr => addr._id === addressId);
                        if (index !== -1) {
                            userAddresses[index] = updatedAddress;
                        }
                        
                        // If this address is currently selected, update the display
                        if (selectedAddressId === addressId) {
                            updateSelectedAddressDisplay(updatedAddress);
                        }
                    } else {
                        // If this is set as primary, update other addresses in local array
                        if (updatedAddress.isPrimary) {
                            userAddresses.forEach(addr => addr.isPrimary = false);
                        }

                        // Add to local addresses array
                        userAddresses.push(updatedAddress);

                        // Update display
                        selectedAddressId = updatedAddress._id;
                        updateSelectedAddressDisplay(updatedAddress);

                        // Show address card and hide add address container
                        document.getElementById('addAddressContainer').style.display = 'none';
                        document.getElementById('selectedAddressCard').style.display = 'block';

                        // Always show edit button when user has addresses
                        document.getElementById('editAddressBtn').style.display = 'inline-block';
                    }

                    closeAddAddressModalFunc();

                    // Show success message
                    showSuccessMessage(isEditMode ? 'Address updated successfully!' : 'Address saved successfully!');
                } else {
                    alert(`Failed to ${isEditMode ? 'update' : 'save'} address: ` + result.message);
                }
            } catch (error) {
                console.error(`Error ${isEditMode ? 'updating' : 'saving'} address:`, error);
                alert(`Failed to ${isEditMode ? 'update' : 'save'} address. Please try again.`);
            } finally {
                // Reset button state
                saveAddressBtn.disabled = false;
                saveAddressBtn.textContent = isEditMode ? 'Update Address' : 'Save Address';
            }
        } else {
            // Show validation errors
            addAddressForm.reportValidity();
        }
    });
}

// Edit existing address
function editAddress(addressId) {
    const address = userAddresses.find(addr => addr._id === addressId);
    if (!address) {
        console.error('Address not found for editing');
        return;
    }
    
    // Close address selection modal
    document.getElementById('addressModal').classList.remove('active');
    
    // Open add address modal
    const addAddressModal = document.getElementById('addAddressModal');
    const modalHeader = addAddressModal.querySelector('.modal-header h3');
    const saveButton = document.getElementById('saveAddress');
    
    // Update modal for editing mode
    modalHeader.textContent = 'Edit Address';
    saveButton.textContent = 'Update Address';
    saveButton.dataset.mode = 'edit';
    saveButton.dataset.addressId = addressId;
    
    // Pre-fill form with existing address data
    document.getElementById('addressType').value = address.type;
    document.getElementById('fullName').value = address.fullName;
    document.getElementById('street').value = address.street;
    document.getElementById('barangay').value = address.barangay;
    document.getElementById('city').value = address.city;
    document.getElementById('province').value = address.province;
    document.getElementById('phone').value = address.phone;
    document.getElementById('isPrimary').checked = address.isPrimary;
    
    addAddressModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

// Show success message
function showSuccessMessage(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'success-toast';
    successDiv.textContent = message;
    successDiv.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: #45a049;
        color: white;
        padding: 12px 20px;
        border-radius: 6px;
        z-index: 9999;
        font-size: 14px;
        animation: slideInRight 0.3s ease-out;
    `;
    
    document.body.appendChild(successDiv);
    
    setTimeout(() => {
        successDiv.style.animation = 'slideOutRight 0.3s ease-out forwards';
        setTimeout(() => successDiv.remove(), 300);
    }, 3000);
}

// Process payment (you can expand this function as needed)
function processPayment() {
    if (!selectedPaymentMethod) {
        alert('Please select a payment method first.');
        return false;
    }

    if (selectedPaymentMethod === 'online-banking' && !selectedBank) {
        alert('Please select a bank for online banking.');
        return false;
    }

    // Here you can add actual payment processing logic
    console.log('Processing payment:', {
        method: selectedPaymentMethod,
        bank: selectedBank
    });
    
    return true;
}

// Helper function to get formatted address string
function getFormattedAddress(address) {
    const parts = [
        address.street,
        address.barangay,
        address.city,
        address.province
    ].filter(part => part && part.trim() !== '');
    
    return parts.join(', ');
}

// Optional: Add function to delete an address (for future use)
async function deleteAddress(addressId) {
    const userId = getUserId();
    if (!userId) return false;
    
    try {
        const response = await fetch(`http://localhost:3000/api/users/${userId}/addresses/${addressId}`, {
            method: 'DELETE'
        });

        const result = await response.json();
        
        if (result.success) {
            // Remove from local array
            userAddresses = userAddresses.filter(addr => addr._id !== addressId);
            
            // If we deleted the selected address, select another one
            if (selectedAddressId === addressId) {
                if (userAddresses.length > 0) {
                    const primaryAddress = userAddresses.find(addr => addr.isPrimary) || userAddresses[0];
                    selectedAddressId = primaryAddress._id;
                    updateSelectedAddressDisplay(primaryAddress);
                } else {
                    // No addresses left, show add address container
                    document.getElementById('addAddressContainer').style.display = 'block';
                    document.getElementById('selectedAddressCard').style.display = 'none';
                    document.getElementById('editAddressBtn').style.display = 'none';
                }
            }
            
            return true;
        } else {
            console.error('Failed to delete address:', result.message);
            return false;
        }
    } catch (error) {
        console.error('Error deleting address:', error);
        return false;
    }
}
