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

    // Edit address (placeholder for now)
    async editAddress(addressId) {
        // For now, just show a message
        this.showInfo('Edit functionality coming soon! You can delete and add a new address for now.');
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

// Global functions for modal management
function showAddAddressModal() {
    if (window.profileManager) {
        window.profileManager.showAddAddressModal();
    }
}

function closeAddressModal() {
    if (window.profileManager) {
        window.profileManager.closeAddressModal();
    }
}

function saveAddress() {
    if (window.profileManager) {
        window.profileManager.saveAddress();
    }
}

// Initialize profile manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.profileManager = new ProfileManager();
});
