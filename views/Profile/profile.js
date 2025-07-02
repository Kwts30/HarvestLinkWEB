// Profile page functionality with address management
class ProfileManager {
    constructor() {
        this.addresses = [];
        this.apiBaseUrl = 'http://localhost:3000/api';
        this.init();
    }

    async init() {
        try {
            // Check authentication
            if (!window.AuthUtils.requireAuth()) {
                return;
            }

            await this.loadAddresses();
            this.initializeEventListeners();
        } catch (error) {
            console.error('❌ Failed to initialize profile:', error);
            this.showError('Failed to load profile. Please refresh the page.');
        }
    }

    initializeEventListeners() {
        // Add address form submission
        const addAddressForm = document.getElementById('addAddressForm');
        if (addAddressForm) {
            addAddressForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveAddress();
            });
        }

        // Modal click outside to close
        const modal = document.getElementById('addAddressModal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeAddressModal();
                }
            });
        }
    }

    // ================================
    // ADDRESS MANAGEMENT
    // ================================

    async loadAddresses() {
        try {
            this.showAddressLoading();
            
            const response = await fetch(`${this.apiBaseUrl}/addresses`, {
                credentials: 'include'
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.addresses = data.addresses || [];
                this.displayAddresses();
            } else {
                console.error('Failed to load addresses:', data.error);
                this.showAddressError('Failed to load addresses');
            }
        } catch (error) {
            console.error('Error loading addresses:', error);
            this.showAddressError('Failed to load addresses');
        }
    }

    displayAddresses() {
        const container = document.getElementById('addressesContainer');
        if (!container) return;

        if (this.addresses.length === 0) {
            container.innerHTML = `
                <div class="no-addresses">
                    <p>No addresses saved yet.</p>
                    <button class="add-address-btn" onclick="profileManager.showAddAddressModal()">
                        Add Your First Address
                    </button>
                </div>
            `;
            return;
        }

        container.innerHTML = this.addresses.map(address => `
            <div class="address-card ${address.isPrimary ? 'primary' : ''}">
                <div class="address-header">
                    <span class="address-type">${address.type}</span>
                    ${address.isPrimary ? '<span class="primary-badge">Primary</span>' : ''}
                </div>
                <div class="address-details">
                    <h4>${address.fullName}</h4>
                    <p>${address.displayAddress || address.fullAddress}</p>
                    <p><strong>Phone:</strong> ${address.phone}</p>
                    ${address.landmark ? `<p><strong>Landmark:</strong> ${address.landmark}</p>` : ''}
                    ${address.deliveryInstructions ? `<p><strong>Instructions:</strong> ${address.deliveryInstructions}</p>` : ''}
                </div>
                <div class="address-actions">
                    ${!address.isPrimary ? `
                        <button class="btn-sm btn-primary" onclick="profileManager.setPrimaryAddress('${address._id}')">
                            Set as Primary
                        </button>
                    ` : ''}
                    <button class="btn-sm btn-secondary" onclick="profileManager.editAddress('${address._id}')">
                        Edit
                    </button>
                    ${!address.isPrimary ? `
                        <button class="btn-sm btn-danger" onclick="profileManager.deleteAddress('${address._id}')">
                            Delete
                        </button>
                    ` : ''}
                </div>
            </div>
        `).join('');
    }

    showAddressLoading() {
        const container = document.getElementById('addressesContainer');
        if (container) {
            container.innerHTML = '<div class="loading-addresses">Loading your addresses...</div>';
        }
    }

    showAddressError(message) {
        const container = document.getElementById('addressesContainer');
        if (container) {
            container.innerHTML = `
                <div class="address-error">
                    <p>${message}</p>
                    <button class="btn-primary" onclick="profileManager.loadAddresses()">Retry</button>
                </div>
            `;
        }
    }

    // Show add address modal
    showAddAddressModal() {
        const modal = document.getElementById('addAddressModal');
        if (modal) {
            // Reset form
            const form = document.getElementById('addAddressForm');
            if (form) form.reset();
            
            modal.style.display = 'block';
            document.body.style.overflow = 'hidden';
        }
    }

    // Close add address modal
    closeAddressModal() {
        const modal = document.getElementById('addAddressModal');
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = '';
        }
    }

    // Save new address
    async saveAddress() {
        try {
            const form = document.getElementById('addAddressForm');
            if (!form) return;

            const formData = new FormData(form);
            const addressData = {
                type: formData.get('type'),
                fullName: formData.get('fullName'),
                street: formData.get('street'),
                barangay: formData.get('barangay'),
                city: formData.get('city'),
                province: formData.get('province'),
                phone: formData.get('phone'),
                postalCode: formData.get('postalCode') || '',
                landmark: formData.get('landmark') || '',
                deliveryInstructions: formData.get('deliveryInstructions') || '',
                isPrimary: formData.get('isPrimary') === 'on'
            };

            // Basic validation
            const required = ['type', 'fullName', 'street', 'barangay', 'city', 'province', 'phone'];
            for (const field of required) {
                if (!addressData[field]) {
                    this.showError(`${field.charAt(0).toUpperCase() + field.slice(1)} is required`);
                    return;
                }
            }

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
                this.closeAddressModal();
                await this.loadAddresses(); // Reload addresses
            } else {
                this.showError(result.error || 'Failed to save address');
            }
        } catch (error) {
            console.error('Error saving address:', error);
            this.showError('Failed to save address. Please try again.');
        }
    }

    // Set address as primary
    async setPrimaryAddress(addressId) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/addresses/${addressId}/primary`, {
                method: 'PUT',
                credentials: 'include'
            });

            const result = await response.json();

            if (result.success) {
                this.showSuccess('Primary address updated successfully');
                await this.loadAddresses(); // Reload addresses
            } else {
                this.showError(result.error || 'Failed to update primary address');
            }
        } catch (error) {
            console.error('Error setting primary address:', error);
            this.showError('Failed to update primary address');
        }
    }

    // Edit address
    async editAddress(addressId) {
        try {
            // Find the address to edit
            const address = this.addresses.find(addr => addr._id === addressId);
            if (!address) {
                this.showError('Address not found');
                return;
            }

            // Show the edit modal with pre-filled data
            if (typeof showEditAddressModal === 'function') {
                showEditAddressModal(addressId, address);
            } else {
                this.showError('Edit modal not available');
            }
        } catch (error) {
            console.error('Error editing address:', error);
            this.showError('Failed to edit address');
        }
    }

    // Update existing address
    async updateAddress() {
        try {
            const form = document.getElementById('editAddressForm');
            if (!form) return;

            const formData = new FormData(form);
            const addressId = formData.get('addressId');
            
            if (!addressId) {
                this.showError('Address ID is missing');
                return;
            }

            const addressData = {
                type: formData.get('type'),
                fullName: formData.get('fullName'),
                street: formData.get('street'),
                barangay: formData.get('barangay'),
                city: formData.get('city'),
                province: formData.get('province'),
                phone: formData.get('phone'),
                isPrimary: formData.get('isPrimary') === 'on'
            };

            // Basic validation
            const required = ['type', 'fullName', 'street', 'barangay', 'city', 'province', 'phone'];
            for (const field of required) {
                if (!addressData[field]) {
                    this.showError(`${field.charAt(0).toUpperCase() + field.slice(1)} is required`);
                    return;
                }
            }

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
                this.closeEditAddressModal();
                await this.loadAddresses(); // Reload addresses
            } else {
                this.showError(result.message || 'Failed to update address');
            }
        } catch (error) {
            console.error('Error updating address:', error);
            this.showError('Failed to update address');
        }
    }

    // Close edit address modal
    closeEditAddressModal() {
        if (typeof closeEditAddressModal === 'function') {
            closeEditAddressModal();
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
                await this.loadAddresses(); // Reload addresses
            } else {
                this.showError(result.error || 'Failed to delete address');
            }
        } catch (error) {
            console.error('Error deleting address:', error);
            this.showError('Failed to delete address');
        }
    }

    // ================================
    // UTILITY METHODS
    // ================================

    showError(message) {
        this.showToast(message, 'error');
    }

    showSuccess(message) {
        this.showToast(message, 'success');
    }

    showInfo(message) {
        this.showToast(message, 'info');
    }

    showToast(message, type = 'info') {
        // Remove existing toasts
        const existingToasts = document.querySelectorAll('.toast');
        existingToasts.forEach(toast => toast.remove());

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        setTimeout(() => toast.classList.add('show'), 100);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

// ================================
// PROFILE-SPECIFIC FUNCTIONALITY (moved from inline scripts in profile.ejs)
// ================================

// Track Order Function
function trackOrder(orderDate) {
    alert('Tracking information for order on ' + orderDate + ':\n\nStatus: In Transit\nExpected Delivery: 2025-06-18');
}

// Edit Profile Modal Functions
function showEditProfileModal() {
    const modal = document.getElementById('editProfileModal');
    if (modal) {
        modal.style.display = 'block';
        modal.classList.add('show');
        document.body.classList.add('modal-open');
        document.body.style.overflow = 'hidden';
        
        // Add real-time validation
        setupFormValidation();
    }
}

function closeEditProfileModal() {
    const modal = document.getElementById('editProfileModal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('show');
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        
        // Reset profile picture states
        selectedProfilePicture = null;
        profilePictureToRemove = false;
        
        // Hide preview
        const previewContainer = document.getElementById('profilePicturePreview');
        if (previewContainer) {
            previewContainer.style.display = 'none';
        }
        
        // Reset current image to original
        const currentImg = document.getElementById('currentProfileImg');
        if (currentImg) {
            const originalSrc = currentImg.getAttribute('data-original-src');
            if (originalSrc) {
                currentImg.src = originalSrc;
            }
        }
        
        // Clear file input
        const profileImageInput = document.getElementById('profileImageInput');
        if (profileImageInput) {
            profileImageInput.value = '';
        }
    }
}

async function saveProfileEdit() {
    const form = document.getElementById('editProfileForm');
    const formData = new FormData(form);
    
    // Validate all fields are filled
    const firstName = formData.get('firstName').trim();
    const lastName = formData.get('lastName').trim();
    const email = formData.get('email').trim();
    
    if (!firstName || !lastName || !email) {
        alert('All fields are required. Please fill in all information before saving.');
        return;
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        alert('Please enter a valid email address.');
        return;
    }
    
    // Get button reference and save original text before try block
    const saveBtn = document.querySelector('.modal-footer .btn-primary');
    const originalText = saveBtn.textContent;
    
    try {
        // Show loading state
        saveBtn.textContent = 'Saving...';
        saveBtn.disabled = true;
        
        // Prepare form data for multipart/form-data request
        const submitFormData = new FormData();
        submitFormData.append('firstName', firstName);
        submitFormData.append('lastName', lastName);
        submitFormData.append('email', email);
        
        // Handle profile picture
        if (profilePictureToRemove) {
            submitFormData.append('removeProfileImage', 'true');
        } else if (selectedProfilePicture) {
            submitFormData.append('profileImage', selectedProfilePicture);
        }
        
        console.log('Sending profile update request with data:', {
            firstName: firstName,
            lastName: lastName,
            email: email,
            hasProfilePicture: !!selectedProfilePicture,
            removeProfileImage: profilePictureToRemove
        });
        
        const response = await fetch('/user/profile', {
            method: 'PUT',
            credentials: 'include',
            body: submitFormData // Don't set Content-Type header - let browser set it for multipart
        });
        
        console.log('Response status:', response.status);
        console.log('Response ok:', response.ok);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Server response error:', errorText);
            console.error('Response status:', response.status);
            console.error('Response headers:', [...response.headers.entries()]);
            
            if (response.status === 401) {
                alert('Authentication required. Please log in and try again.');
                window.location.href = '/login';
                return;
            } else if (response.status === 404) {
                alert('Profile update endpoint not found. Please contact support.');
                return;
            }
            
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            alert('Profile updated successfully!');
            closeEditProfileModal();
            // Reload the page to show updated information
            window.location.reload();
        } else {
            alert('Error updating profile: ' + (data.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error updating profile:', error);
        let errorMessage = 'Unable to update profile. ';
        
        if (error.message) {
            errorMessage += error.message;
        } else {
            errorMessage += 'Please check your internet connection and try again.';
        }
        
        alert(errorMessage);
    } finally {
        // Reset button state
        saveBtn.textContent = originalText;
        saveBtn.disabled = false;
    }
}

// Edit Address Modal Functions
function showEditAddressModal(addressId, addressData) {
    const modal = document.getElementById('editAddressModal');
    if (modal && addressData) {
        // Fill the form with existing address data
        document.getElementById('editAddressId').value = addressId;
        document.getElementById('editAddressType').value = addressData.type || '';
        document.getElementById('editFullName').value = addressData.fullName || '';
        document.getElementById('editStreet').value = addressData.street || '';
        document.getElementById('editBarangay').value = addressData.barangay || '';
        document.getElementById('editCity').value = addressData.city || '';
        document.getElementById('editProvince').value = addressData.province || '';
        document.getElementById('editPhone').value = addressData.phone || '';
        document.getElementById('editIsPrimary').checked = addressData.isPrimary || false;
        
        modal.style.display = 'block';
        modal.classList.add('show');
        document.body.classList.add('modal-open');
        document.body.style.overflow = 'hidden';
    }
}

function closeEditAddressModal() {
    const modal = document.getElementById('editAddressModal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('show');
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        
        // Clear the form
        document.getElementById('editAddressForm').reset();
        document.getElementById('editAddressId').value = '';
    }
}

function updateAddress() {
    if (window.profileManager) {
        window.profileManager.updateAddress();
    }
}

// Receipt Modal Functions
function viewReceipt(transactionId) {
    const modal = document.getElementById('receiptModal');
    const content = document.getElementById('receiptContent');
    
    if (modal) {
        modal.style.display = 'block';
        modal.classList.add('show');
        document.body.classList.add('modal-open');
        document.body.style.overflow = 'hidden';
        
        // Load receipt data
        loadReceiptData(transactionId);
    }
}

function closeReceiptModal() {
    const modal = document.getElementById('receiptModal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('show');
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
    }
}

async function loadReceiptData(transactionId) {
    const content = document.getElementById('receiptContent');
    content.innerHTML = '<div class="receipt-loading">Loading receipt...</div>';
    
    try {
        const response = await fetch(`/api/transactions/${transactionId}/receipt`, {
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (data.success) {
            displayReceipt(data.transaction, data.invoice);
        } else {
            content.innerHTML = '<div class="receipt-error">Failed to load receipt</div>';
        }
    } catch (error) {
        console.error('Error loading receipt:', error);
        content.innerHTML = '<div class="receipt-error">Failed to load receipt</div>';
    }
}

function displayReceipt(transaction, invoice) {
    const content = document.getElementById('receiptContent');
    
    const receiptHTML = `
        <div class="receipt">
            <div class="receipt-header">
                <h2>HarvestLink</h2>
                <p>Official Receipt</p>
                <p>Receipt #: ${transaction.transactionId}</p>
                ${invoice ? `<p>Invoice #: ${invoice.invoiceNumber}</p>` : ''}
                <p>Date: ${new Date(transaction.createdAt).toLocaleDateString()}</p>
            </div>
            
            <div class="receipt-customer">
                <h4>Customer Information</h4>
                <p><strong>Name:</strong> ${transaction.deliveryAddress.fullName}</p>
                <p><strong>Phone:</strong> ${transaction.deliveryAddress.phone}</p>
                <p><strong>Address:</strong> ${transaction.deliveryAddress.address}</p>
            </div>
            
            <div class="receipt-items">
                <h4>Items Purchased</h4>
                <table class="receipt-table">
                    <thead>
                        <tr>
                            <th>Item</th>
                            <th>Qty</th>
                            <th>Price</th>
                            <th>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${transaction.items.map(item => `
                            <tr>
                                <td>${item.name}</td>
                                <td>${item.quantity}</td>
                                <td>₱${item.price.toFixed(2)}</td>
                                <td>₱${item.total.toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            
            <div class="receipt-summary">
                <div class="summary-row">
                    <span>Subtotal:</span>
                    <span>₱${transaction.subtotal.toFixed(2)}</span>
                </div>
                <div class="summary-row">
                    <span>Shipping:</span>
                    <span>₱${transaction.shippingCost.toFixed(2)}</span>
                </div>
                <div class="summary-row">
                    <span>Tax:</span>
                    <span>₱${transaction.taxAmount.toFixed(2)}</span>
                </div>
                <div class="summary-row total">
                    <span><strong>Total:</strong></span>
                    <span><strong>₱${transaction.totalAmount.toFixed(2)}</strong></span>
                </div>
            </div>
            
            <div class="receipt-payment">
                <h4>Payment Information</h4>
                <p><strong>Method:</strong> ${transaction.paymentMethod.method.toUpperCase()}</p>
                <p><strong>Status:</strong> ${transaction.status}</p>
                ${invoice ? `<p><strong>Invoice Status:</strong> ${invoice.status}</p>` : ''}
            </div>
            
            <div class="receipt-footer">
                <p>Thank you for shopping with HarvestLink!</p>
                <p>Supporting local farmers and fresh produce.</p>
                ${invoice ? '<p><small>This receipt is backed by an official invoice record.</small></p>' : ''}
            </div>
        </div>
    `;
    
    content.innerHTML = receiptHTML;
}

function setupFormValidation() {
    const form = document.getElementById('editProfileForm');
    const inputs = form.querySelectorAll('input[required]');
    const saveBtn = document.querySelector('.modal-footer .btn-primary');
    
    function validateForm() {
        let isValid = true;
        
        inputs.forEach(input => {
            const value = input.value.trim();
            
            if (!value) {
                input.style.borderColor = '#dc3545';
                isValid = false;
            } else if (input.type === 'email') {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(value)) {
                    input.style.borderColor = '#dc3545';
                    isValid = false;
                } else {
                    input.style.borderColor = '#28a745';
                }
            } else {
                input.style.borderColor = '#28a745';
            }
        });
        
        saveBtn.disabled = !isValid;
        return isValid;
    }
    
    inputs.forEach(input => {
        input.addEventListener('input', validateForm);
        input.addEventListener('blur', validateForm);
    });
    
    // Initial validation
    validateForm();
}

// Hamburger menu functionality and DOM event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Hamburger menu functionality (same as home page)
    const hamburger = document.querySelector('.hamburger-menu');
    const navOverlay = document.querySelector('.nav-overlay');
    const closeMenuBtn = document.querySelector('.close-menu');
    const navbar = document.querySelector('.navbar');
    
    if (hamburger && navOverlay && closeMenuBtn && navbar) {
        hamburger.addEventListener('click', function() {
            navOverlay.classList.add('active');
            navbar.style.display = 'none';
        });
        
        closeMenuBtn.addEventListener('click', function() {
            navOverlay.classList.remove('active');
            navbar.style.display = '';
        });
        
        navOverlay.addEventListener('click', function(e) {
            if (e.target === navOverlay) {
                navOverlay.classList.remove('active');
                navbar.style.display = '';
            }
        });
        
        // Also close overlay and show navbar when clicking any nav link
        navOverlay.querySelectorAll('.nav-links a').forEach(link => {
            link.addEventListener('click', function() {
                navOverlay.classList.remove('active');
                navbar.style.display = '';
            });
        });
    }
    
    // Edit Profile Modal click outside to close
    const editProfileModal = document.getElementById('editProfileModal');
    if (editProfileModal) {
        editProfileModal.addEventListener('click', function(e) {
            if (e.target === editProfileModal) {
                closeEditProfileModal();
            }
        });
    }
    
    // Edit Address Modal click outside to close
    const editAddressModal = document.getElementById('editAddressModal');
    if (editAddressModal) {
        editAddressModal.addEventListener('click', function(e) {
            if (e.target === editAddressModal) {
                closeEditAddressModal();
            }
        });
    }
    
    // Receipt Modal click outside to close
    const receiptModal = document.getElementById('receiptModal');
    if (receiptModal) {
        receiptModal.addEventListener('click', function(e) {
            if (e.target === receiptModal) {
                closeReceiptModal();
            }
        });
    }
});

// Make functions globally available so they can be called from HTML onclick attributes
window.trackOrder = trackOrder;
window.showEditProfileModal = showEditProfileModal;
window.closeEditProfileModal = closeEditProfileModal;
window.saveProfileEdit = saveProfileEdit;
window.showEditAddressModal = showEditAddressModal;
window.closeEditAddressModal = closeEditAddressModal;
window.updateAddress = updateAddress;
window.viewReceipt = viewReceipt;
window.closeReceiptModal = closeReceiptModal;
window.removeProfilePicture = removeProfilePicture;
window.cancelProfilePictureChange = cancelProfilePictureChange;

// Initialize profile manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.profileManager = new ProfileManager();
});

// ================================
// PROFILE PICTURE FUNCTIONALITY
// ================================

let profilePictureToRemove = false;
let selectedProfilePicture = null;

// Handle profile picture file selection
document.addEventListener('DOMContentLoaded', function() {
    const profileImageInput = document.getElementById('profileImageInput');
    if (profileImageInput) {
        profileImageInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                handleProfilePictureSelection(file);
            }
        });
    }
});

function handleProfilePictureSelection(file) {
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
        alert('Please select a valid image file (JPEG, PNG, or WebP)');
        return;
    }
    
    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
        alert('File size must be less than 5MB');
        return;
    }
    
    selectedProfilePicture = file;
    profilePictureToRemove = false;
    
    // Show preview
    const reader = new FileReader();
    reader.onload = function(e) {
        const previewImg = document.getElementById('previewImg');
        const previewContainer = document.getElementById('profilePicturePreview');
        
        if (previewImg && previewContainer) {
            previewImg.src = e.target.result;
            previewContainer.style.display = 'block';
        }
    };
    reader.readAsDataURL(file);
}

function removeProfilePicture() {
    if (confirm('Are you sure you want to remove your profile picture?')) {
        profilePictureToRemove = true;
        selectedProfilePicture = null;
        
        // Update current image to default
        const currentImg = document.getElementById('currentProfileImg');
        if (currentImg) {
            currentImg.src = 'https://icons.iconarchive.com/icons/fa-team/fontawesome/512/FontAwesome-User-icon.png';
        }
        
        // Hide preview if showing
        const previewContainer = document.getElementById('profilePicturePreview');
        if (previewContainer) {
            previewContainer.style.display = 'none';
        }
        
        // Clear file input
        const profileImageInput = document.getElementById('profileImageInput');
        if (profileImageInput) {
            profileImageInput.value = '';
        }
    }
}

function cancelProfilePictureChange() {
    selectedProfilePicture = null;
    profilePictureToRemove = false;
    
    // Hide preview
    const previewContainer = document.getElementById('profilePicturePreview');
    if (previewContainer) {
        previewContainer.style.display = 'none';
    }
    
    // Clear file input
    const profileImageInput = document.getElementById('profileImageInput');
    if (profileImageInput) {
        profileImageInput.value = '';
    }
    
    // Reset current image to original - get the original src from the image's data attribute
    const currentImg = document.getElementById('currentProfileImg');
    if (currentImg) {
        const originalSrc = currentImg.getAttribute('data-original-src');
        if (originalSrc) {
            currentImg.src = originalSrc;
        }
    }
}
