// Admin Dashboard
class ModernAdminDashboard {
    constructor() {
        this.currentUser = null;
        this.currentSection = 'dashboard';
        this.currentPage = {
            users: 1,
            products: 1,
            transactions: 1
        };
        this.charts = {};
        this.isEditing = {
            user: false,
            product: false
        };
        this.editingId = {
            user: null,
            product: null
        };
        
        // API Configuration - works for both localhost and live domains
        this.apiConfig = this.setupApiConfig();
        this.init();
    }
    
    // Setup API configuration for multi-domain support
    setupApiConfig() {
        // Use the global API config if available, otherwise detect automatically
        if (window.API_CONFIG) {
            return {
                baseUrl: window.API_CONFIG.BASE_URL,
                apiPath: '/api/admin'
            };
        }
        
        // Fallback: Auto-detect based on current location
        const protocol = window.location.protocol;
        const host = window.location.host;
        const currentUrl = `${protocol}//${host}`;
        
        const isLocalFile = protocol === 'file:' || host.includes(':5500');
        const baseUrl = isLocalFile ? 'http://localhost:3000' : currentUrl;
        
        return {
            baseUrl: baseUrl,
            apiPath: '/api/admin'
        };
    }

    // Helper method to build API URLs
    buildApiUrl(endpoint) {
        return `${this.apiConfig.baseUrl}${this.apiConfig.apiPath}${endpoint}`;
    }

    async init() {
        try {
            await this.checkAuth();
            // Small delay to ensure DOM is fully ready
            setTimeout(() => {
                this.bindEvents();
            }, 100);
            this.initializeTime();
            this.loadDashboardData();
        } catch (error) {
            console.error('Dashboard initialization error:', error);
        }
    }

    // Authentication
    async checkAuth() {
        const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
        const user = JSON.parse(localStorage.getItem('user') || '{}');
          if (isLoggedIn && user.role === 'admin') {
            this.currentUser = user;
            this.updateAdminInfo();        } else {
            window.location.href = window.AuthUtils ? window.AuthUtils.createUrl('/login') : '/login';
        }
    }

    updateAdminInfo() {
        const adminNameEl = document.getElementById('adminName');
        if (adminNameEl && this.currentUser) {
            adminNameEl.textContent = `${this.currentUser.firstName} ${this.currentUser.lastName}`;
        }
    }

    // Helper function to safely add event listeners
    safeAddEventListener(elementId, event, handler) {
        const element = document.getElementById(elementId);
        if (element) {
            element.addEventListener(event, handler);
        } else {
            console.warn(`Element with ID '${elementId}' not found for event '${event}'`);
        }
    }

    // Event Bindings
    bindEvents() {
        try {
            // Sidebar navigation
            document.querySelectorAll('.nav-link').forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    const section = e.currentTarget.dataset.section;
                    this.showSection(section);
                });
            });

            // Logout button
            this.safeAddEventListener('logoutBtn', 'click', this.handleLogout.bind(this));

            // Modal controls - with safety checks
            document.querySelectorAll('.modal-close').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const modal = btn.closest('.modal');
                    if (modal) {
                        this.closeModal(modal.id);
                    }
                });
            });

            // Close modal when clicking outside
            document.querySelectorAll('.modal').forEach(modal => {
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) {
                        this.closeModal(modal.id);
                    }
                });
            });

            // Event delegation for cancel buttons (in case they're loaded dynamically)
            document.addEventListener('click', (e) => {
                if (e.target.id === 'cancelAddProduct') {
                    this.closeModal('addProductModal');
                } else if (e.target.id === 'cancelEditProduct') {
                    this.closeModal('editProductModal');
                } else if (e.target.id === 'cancelAddUser') {
                    this.closeModal('addUserModal');
                } else if (e.target.id === 'cancelEditUser') {
                    this.closeModal('editUserModal');
                }
            });

            // User management - with safety checks
            this.safeAddEventListener('addUserBtn', 'click', () => this.showUserModal());
            this.safeAddEventListener('addUserForm', 'submit', this.handleUserSubmit.bind(this));
            this.safeAddEventListener('editUserForm', 'submit', this.handleEditUserSubmit.bind(this));
            this.safeAddEventListener('userSearch', 'input', this.debounce(this.searchUsers.bind(this), 300));
            this.safeAddEventListener('userRoleFilter', 'change', this.filterUsers.bind(this));
            
            // Add User Modal controls - with safety checks
            this.safeAddEventListener('closeAddUserModal', 'click', () => this.closeModal('addUserModal'));
            this.safeAddEventListener('cancelAddUser', 'click', () => this.closeModal('addUserModal'));
            this.safeAddEventListener('uploadImageBtn', 'click', () => {
                const fileInput = document.getElementById('profileImage');
                if (fileInput) fileInput.click();
            });
            this.safeAddEventListener('profileImage', 'change', (e) => this.handleImagePreview('userImagePreview', e));
            this.safeAddEventListener('removeImageBtn', 'click', () => this.removeImage('userImagePreview'));
            
            // Edit User Modal controls - with safety checks
            this.safeAddEventListener('closeEditUserModal', 'click', () => this.closeModal('editUserModal'));
            this.safeAddEventListener('cancelEditUser', 'click', () => this.closeModal('editUserModal'));
            this.safeAddEventListener('editUploadImageBtn', 'click', () => {
                const fileInput = document.getElementById('editProfileImage');
                if (fileInput) fileInput.click();
            });
            this.safeAddEventListener('editProfileImage', 'change', (e) => this.handleImagePreview('editUserImagePreview', e));
            this.safeAddEventListener('editRemoveImageBtn', 'click', () => this.removeImage('editUserImagePreview'));

            // Address Management
            this.safeAddEventListener('addUserAddressBtn', 'click', () => this.showAddressModal());
            this.safeAddEventListener('addressForm', 'submit', this.handleAddressSubmit.bind(this));
            this.safeAddEventListener('closeAddressModal', 'click', () => this.closeModal('addressManagementModal'));
            this.safeAddEventListener('cancelAddressBtn', 'click', () => this.closeModal('addressManagementModal'));

            // Product management
            this.safeAddEventListener('addProductBtn', 'click', () => this.showProductModal());
            this.safeAddEventListener('closeAddProductModal', 'click', () => this.closeModal('addProductModal'));
            this.safeAddEventListener('cancelAddProduct', 'click', () => this.closeModal('addProductModal'));
            this.safeAddEventListener('uploadProductImageBtn', 'click', () => {
                const fileInput = document.getElementById('productImage');
                if (fileInput) fileInput.click();
            });
            this.safeAddEventListener('productImage', 'change', (e) => this.handleImagePreview('productImagePreview', e));
            this.safeAddEventListener('removeProductImageBtn', 'click', () => this.removeProductImage('productImagePreview'));
            
            // Edit Product Modal controls
            this.safeAddEventListener('closeEditProductModal', 'click', () => this.closeModal('editProductModal'));
            this.safeAddEventListener('cancelEditProduct', 'click', () => this.closeModal('editProductModal'));
            this.safeAddEventListener('editUploadProductImageBtn', 'click', () => {
                const fileInput = document.getElementById('editProductImage');
                if (fileInput) fileInput.click();
            });
            this.safeAddEventListener('editProductImage', 'change', (e) => this.handleImagePreview('editProductImagePreview', e));
            this.safeAddEventListener('editRemoveProductImageBtn', 'click', () => this.removeProductImage('editProductImagePreview'));
            
            // Form submissions
            this.safeAddEventListener('addProductForm', 'submit', this.handleAddProductSubmit.bind(this));
            this.safeAddEventListener('editProductForm', 'submit', this.handleEditProductSubmit.bind(this));
            this.safeAddEventListener('productSearch', 'input', this.debounce(this.searchProducts.bind(this), 300));
            this.safeAddEventListener('productCategoryFilter', 'change', this.filterProducts.bind(this));
            this.safeAddEventListener('productStatusFilter', 'change', this.filterProducts.bind(this));

            // Transaction management
            this.safeAddEventListener('transactionStatus', 'change', this.filterTransactions.bind(this));
            this.safeAddEventListener('transactionDateFrom', 'change', this.filterTransactions.bind(this));
            this.safeAddEventListener('transactionDateTo', 'change', this.filterTransactions.bind(this));
            this.safeAddEventListener('exportTransactions', 'click', this.exportTransactions.bind(this));

            // Global search
            this.safeAddEventListener('globalSearch', 'input', this.handleGlobalSearch.bind(this));

            // Close modals on outside click
            window.addEventListener('click', (e) => {
                if (e.target.classList.contains('modal')) {
                    this.closeModal();
                }
            });

            // Handle escape key for modals
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    this.closeModal();
                }
            });
        } catch (error) {
            console.error('Error binding events:', error);
        }
    }

    // Time Management
    initializeTime() {
        this.updateCurrentTime();
        setInterval(() => this.updateCurrentTime(), 1000);
    }

    updateCurrentTime() {
        const timeEl = document.getElementById('currentTime');
        if (timeEl) {
            const now = new Date();
            timeEl.textContent = now.toLocaleString('en-US', {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }
    }

    // Section Management
    showSection(section) {
        // Update navigation
        document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
        document.querySelector(`[data-section="${section}"]`).classList.add('active');

        // Update sections
        document.querySelectorAll('.content-section').forEach(sec => sec.classList.remove('active'));
        document.getElementById(section).classList.add('active');

        this.currentSection = section;

        // Load section data
        switch (section) {
            case 'dashboard':
                this.loadDashboardData();
                break;
            case 'users':
                this.loadUsers();
                break;
            case 'products':
                this.loadProducts();
                break;            case 'transactions':
                this.loadTransactions();
                break;
        }
    }

    // Dashboard Data Loading
    async loadDashboardData() {
        try {
            this.showLoading();
            
            // Load all dashboard stats
            const [statsResponse, recentTransactionsResponse, topProductsResponse] = await Promise.all([
                fetch(this.buildApiUrl('/dashboard/stats'), { credentials: 'include' }),
                fetch(this.buildApiUrl('/transactions?limit=5'), { credentials: 'include' }),
                fetch(this.buildApiUrl('/products/top?limit=5'), { credentials: 'include' })
            ]);

            if (statsResponse.ok) {
                const stats = await statsResponse.json();
                this.updateDashboardStats(stats);
                this.updateSidebarCounts(stats);
            } else {
                console.error('Failed to load dashboard stats:', statsResponse.status, statsResponse.statusText);
            }

            if (recentTransactionsResponse.ok) {
                const recentData = await recentTransactionsResponse.json();
                this.renderRecentTransactions(recentData.transactions || []);
            } else {
                console.error('Failed to load recent transactions:', recentTransactionsResponse.status);
            }            if (topProductsResponse.ok) {
                const topProductsData = await topProductsResponse.json();
                // Handle both direct array and wrapped response formats
                const topProducts = topProductsData.products || topProductsData || [];
                this.renderTopProducts(topProducts);
            } else {
                console.error('Failed to load top products:', topProductsResponse.status);
            }

        } catch (error) {
            console.error('Error loading dashboard data:', error);
            this.showToast('Error loading dashboard data', 'error');
        } finally {
            this.hideLoading();
        }
    }

    updateDashboardStats(stats) {
        // Update main stats cards
        this.updateElement('totalUsers', stats.totalUsers || 0);
        this.updateElement('totalProducts', stats.totalProducts || 0);
        this.updateElement('totalTransactions', stats.totalTransactions || 0);
        this.updateElement('totalRevenue', `₱${(stats.totalRevenue || 0).toLocaleString()}`);

        // Update change indicators
        this.updateElement('userChange', `+${stats.newUsersThisMonth || 0} this month`);
        this.updateElement('productChange', `+${stats.productsInStock || 0} in stock`);
        this.updateElement('transactionChange', `+${stats.transactionsToday || 0} today`);
        this.updateElement('revenueChange', `+₱${(stats.revenueThisMonth || 0).toLocaleString()} this month`);
    }

    updateSidebarCounts(stats) {
        this.updateElement('userCount', stats.totalUsers || 0);
        this.updateElement('productCount', stats.totalProducts || 0);
        this.updateElement('transactionCount', stats.totalTransactions || 0);
    }

    renderRecentTransactions(transactions) {
        const container = document.getElementById('recentTransactions');
        if (!container) return;

        if (transactions.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-receipt"></i>
                    <h3>No recent transactions</h3>
                    <p>Recent transactions will appear here</p>
                </div>
            `;
            return;
        }

        container.innerHTML = transactions.map(transaction => `
            <div class="transaction-item">
                <div class="item-info">
                    <div class="item-title">#${transaction.transactionId}</div>
                    <div class="item-subtitle">
                        ${(transaction.user || transaction.userId)?.firstName || 'Unknown'} ${(transaction.user || transaction.userId)?.lastName || 'Customer'} • 
                        ${new Date(transaction.createdAt).toLocaleDateString()}
                    </div>
                </div>
                <div class="item-value">₱${transaction.totalAmount.toLocaleString()}</div>
                <span class="status-badge status-${transaction.status}">${transaction.status}</span>
            </div>
        `).join('');
    }

    renderTopProducts(products) {
        const container = document.getElementById('topProducts');
        if (!container) return;

        if (products.length === 0) {
            container.innerHTML = `
                <tr>
                    <td colspan="5" class="empty-state">
                        <i class="fas fa-box"></i>
                        <h3>No product data</h3>
                        <p>Top products will appear here once orders are placed</p>
                    </td>
                </tr>
            `;
            return;
        }

        container.innerHTML = products.map((product, index) => `
            <tr>
                <td>#${index + 1}</td>
                <td>${product.name || 'Unknown Product'}</td>
                <td>${product.category || 'N/A'}</td>
                <td>${product.stock || 0}</td>
                <td>${product.salesCount || 0} sold</td>
            </tr>
        `).join('');
    }

    // User Management
    async loadUsers(page = 1, search = '', role = '') {
        try {
            this.showLoading();
            
            const queryParams = new URLSearchParams({
                page: page.toString(),
                limit: '10',
                ...(search && { search }),
                ...(role && { role })
            });

            const response = await fetch(this.buildApiUrl(`/users?${queryParams}`), {
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                this.renderUsersTable(data.users);
                this.renderPagination('users', data.currentPage, data.totalPages);
            } else {
                throw new Error('Failed to load users');
            }
        } catch (error) {
            console.error('Error loading users:', error);
            this.showToast('Error loading users', 'error');
        } finally {
            this.hideLoading();
        }
    }

    renderUsersTable(users) {
        const container = document.getElementById('usersTable');
        if (!container) return;

        if (users.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-users"></i>
                    <h3>No users found</h3>
                    <p>Users will appear here when added</p>
                </div>
            `;
            return;
        }        container.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th>Profile</th>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Phone</th>
                        <th>Role</th>
                        <th>Joined</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${users.map(user => `
                        <tr>
                            <td>
                                <div class="user-profile-cell">
                                    ${user.profileImage 
                                        ? `<img src="${user.profileImage}" alt="Profile" class="table-profile-image">` 
                                        : `<div class="table-profile-placeholder"><i class="fas fa-user"></i></div>`
                                    }
                                </div>
                            </td>
                            <td>${user.firstName} ${user.lastName}</td>
                            <td>${user.email}</td>
                            <td>${user.phoneNumber || 'N/A'}</td>
                            <td><span class="status-badge status-${user.role}">${user.role}</span></td>
                            <td>${new Date(user.createdAt).toLocaleDateString()}</td>
                            <td>
                                <button class="btn-secondary" onclick="adminDashboard.editUser('${user._id}')">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn-danger" onclick="adminDashboard.deleteUser('${user._id}')">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }
    
    showUserModal(userId = null) {
        if (userId) {
            // Edit mode
            this.showEditUserModal(userId);
        } else {
            // Add mode
            this.showAddUserModal();
        }
    }

    showAddUserModal() {
        const modal = document.getElementById('addUserModal');
        const form = document.getElementById('addUserForm');
        
        // Reset form
        form.reset();
        this.clearFormErrors('add');
        this.removeImage('userImagePreview');
        
        // Show modal - reset display style and add active class
        modal.style.display = '';
        modal.classList.add('active');
        
        // Focus on first input
        setTimeout(() => {
            document.getElementById('firstName').focus();
        }, 100);
    }

    showEditUserModal(userId) {
        const modal = document.getElementById('editUserModal');
        const form = document.getElementById('editUserForm');
        
        // Reset form
        form.reset();
        this.clearFormErrors('edit');
        this.removeImage('editUserImagePreview');
        
        // Clear password fields explicitly
        const passwordFields = ['editCurrentPassword', 'editNewPassword', 'editConfirmNewPassword'];
        passwordFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) field.value = '';
        });
        
        // Clear any existing addresses immediately
        this.clearAddressesContainer();
        
        // Set the user ID
        document.getElementById('editUserId').value = userId;
        
        // Load user data
        this.loadUserForEdit(userId);
        
        // Show modal - reset display style and add active class
        modal.style.display = '';
        modal.classList.add('active');
    }
    
    async loadUserForEdit(userId) {
        try {
            const response = await fetch(this.buildApiUrl(`/users/${userId}`), {
                credentials: 'include'
            });

            if (response.ok) {
                const user = await response.json();
                document.getElementById('editFirstName').value = user.firstName;
                document.getElementById('editLastName').value = user.lastName;
                document.getElementById('editEmail').value = user.email;
                document.getElementById('editPhone').value = user.phoneNumber || '';
                document.getElementById('editRole').value = user.role;
                
                // Load user addresses for the address management system
                await this.loadUserAddresses(userId);
                
                // Load profile image if exists
                if (user.profileImage) {
                    this.setImagePreview('editUserImagePreview', user.profileImage);
                    document.getElementById('editRemoveImageBtn').style.display = 'inline-flex';
                }
            }
        } catch (error) {
            console.error('Error loading user for edit:', error);
            this.showToast('Error loading user data', 'error');
        }
    }
    
    async handleUserSubmit(e) {
        e.preventDefault();
        
        if (!this.validateUserForm('add')) {
            return;
        }
        
        const formData = new FormData(e.target);
        const imageFile = formData.get('profileImage');
        
        // Check if there's an image file to upload
        if (imageFile && imageFile.size > 0) {
            // The file will be automatically included in FormData
            // but we need to make sure it's using the correct field name
            formData.set('profileImage', imageFile);
        }

        try {
            this.showLoading();
            
            const response = await fetch(this.buildApiUrl('/users'), {
                method: 'POST',
                credentials: 'include',
                body: formData // Send FormData directly, don't set Content-Type header
            });

            if (response.ok) {
                this.closeModal('addUserModal');
                this.loadUsers(this.currentPage.users);
                this.showToast('User created successfully!', 'success');
            } else {
                // Handle different types of errors
                let errorMessage = 'Error creating user';
                
                if (response.status === 413) {
                    errorMessage = 'Image file is too large. Please use a smaller image.';
                } else if (response.status === 400) {
                    try {
                        const errorData = await response.json();
                        this.handleFormErrors(errorData.errors || { general: errorData.message }, 'add');
                        return;
                    } catch {
                        errorMessage = 'Invalid data provided';
                    }
                } else if (response.status === 500) {
                    errorMessage = 'Server error. Please try again later.';
                }
                
                this.showToast(errorMessage, 'error');
            }
        } catch (error) {
            console.error('Error creating user:', error);
            this.showToast('Network error. Please check your connection.', 'error');
        } finally {
            this.hideLoading();
        }
    }

    async handleEditUserSubmit(e) {
        e.preventDefault();
        
        if (!this.validateUserForm('edit')) {
            return;
        }
        
        const formData = new FormData(e.target);
        const imageFile = formData.get('profileImage');
        const userId = formData.get('userId');
        
        // Check if there's an image file to upload
        if (imageFile && imageFile.size > 0) {
            // The file will be automatically included in FormData
            // but we need to make sure it's using the correct field name
            formData.set('profileImage', imageFile);
        }

        try {
            this.showLoading();
            
            const response = await fetch(this.buildApiUrl(`/users/${userId}`), {
                method: 'PUT',
                credentials: 'include',
                body: formData // Send FormData directly, don't set Content-Type header
            });

            if (response.ok) {
                this.closeModal('editUserModal');
                this.loadUsers(this.currentPage.users);
                this.showToast('User updated successfully!', 'success');
            } else {
                // Handle different types of errors
                let errorMessage = 'Error updating user';
                
                if (response.status === 413) {
                    errorMessage = 'Image file is too large. Please use a smaller image.';
                } else if (response.status === 400) {
                    try {
                        const errorData = await response.json();
                        this.handleFormErrors(errorData.errors || { general: errorData.message }, 'edit');
                        return;
                    } catch {
                        errorMessage = 'Invalid data provided';
                    }
                } else if (response.status === 500) {
                    errorMessage = 'Server error. Please try again later.';
                }
                
                this.showToast(errorMessage, 'error');
            }
        } catch (error) {
            console.error('Error updating user:', error);
            this.showToast('Network error. Please check your connection.', 'error');
        } finally {
            this.hideLoading();
        }
    }
    
    // Helper function to convert image to base64 with compression
    convertImageToBase64(file) {
        return new Promise((resolve, reject) => {
            // First, compress the image if it's too large
            this.compressImage(file)
                .then(compressedFile => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = reject;
                    reader.readAsDataURL(compressedFile);
                })
                .catch(reject);
        });
    }

    // Image compression function
    compressImage(file, maxWidth = 800, maxHeight = 600, quality = 0.7) {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();

            img.onload = () => {
                // Calculate new dimensions
                let { width, height } = img;
                
                if (width > height) {
                    if (width > maxWidth) {
                        height = (height * maxWidth) / width;
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = (width * maxHeight) / height;
                        height = maxHeight;
                    }
                }

                canvas.width = width;
                canvas.height = height;

                // Draw and compress
                ctx.drawImage(img, 0, 0, width, height);
                
                canvas.toBlob(resolve, 'image/jpeg', quality);
            };

            img.src = URL.createObjectURL(file);
        });
    }

    async editUser(userId) {
        this.showUserModal(userId);
    }

    async deleteUser(userId) {
        if (!confirm('Are you sure you want to delete this user?')) return;        try {
            this.showLoading();
            const response = await fetch(this.buildApiUrl(`/users/${userId}`), {
                method: 'DELETE',
                credentials: 'include'
            });

            if (response.ok) {
                this.loadUsers(this.currentPage.users);
                this.showToast('User deleted successfully!', 'success');
            } else {
                throw new Error('Failed to delete user');
            }
        } catch (error) {
            console.error('Error deleting user:', error);
            this.showToast('Error deleting user', 'error');
        } finally {
            this.hideLoading();
        }
    }

    searchUsers() {
        const search = document.getElementById('userSearch').value;
        const role = document.getElementById('userRoleFilter').value;
        this.currentPage.users = 1;
        this.loadUsers(1, search, role);
    }

    filterUsers() {
        this.searchUsers();
    }

    // User Image Handling
    handleUserImagePreview(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Validate file type
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            this.showToast('Please select a valid image file (JPEG, PNG, GIF, or WebP)', 'error');
            event.target.value = ''; // Clear the input
            return;
        }

        // Validate file size (5MB limit)
        const maxSize = 5 * 1024 * 1024; // 5MB in bytes
        if (file.size > maxSize) {
            const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
            this.showToast(`Image size (${fileSizeMB}MB) exceeds the 5MB limit. Please choose a smaller image.`, 'error');
            event.target.value = ''; // Clear the input
            return;
        }

        // Show loading state while processing
        const previewImg = document.getElementById('userPreviewImg');
        const placeholderIcon = document.getElementById('userPlaceholderIcon');
        const removeBtn = document.getElementById('removeUserImageBtn');
        
        // Temporarily show loading
        placeholderIcon.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

        const reader = new FileReader();
        reader.onload = (e) => {
            previewImg.src = e.target.result;
            previewImg.style.display = 'block';
            placeholderIcon.style.display = 'none';
            removeBtn.style.display = 'inline-flex';
            
            // Show success message
            const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
            this.showToast(`Image uploaded successfully (${fileSizeMB}MB)`, 'success');
        };
        
        reader.onerror = () => {
            this.showToast('Error reading the image file. Please try again.', 'error');
            placeholderIcon.innerHTML = '<i class="fas fa-user"></i>';
            event.target.value = ''; // Clear the input
        };
        
        reader.readAsDataURL(file);
    }    removeUserImage() {
        const fileInput = document.getElementById('userProfileImage');
        const previewImg = document.getElementById('userPreviewImg');
        const placeholderIcon = document.getElementById('userPlaceholderIcon');
        const removeBtn = document.getElementById('removeUserImageBtn');

        fileInput.value = '';
        previewImg.src = '#';
        previewImg.style.display = 'none';
        placeholderIcon.innerHTML = '<i class="fas fa-user"></i>';
        placeholderIcon.style.display = 'block';
        removeBtn.style.display = 'none';
        
        this.showToast('Profile image removed', 'info');
    }

    // ===============================
    // Address Management Methods
    // ===============================
    
    // Load user addresses for editing
    async loadUserAddresses(userId) {
        try {
            const container = document.getElementById('userAddressesContainer');
            const loadingDiv = document.getElementById('loadingAddresses');
            const noAddressesDiv = document.getElementById('noAddresses');
            
            // Clear any existing addresses first
            this.clearAddressesContainer();
            
            // Show loading state
            loadingDiv.style.display = 'flex';
            noAddressesDiv.style.display = 'none';
            
            const response = await fetch(this.buildApiUrl(`/users/${userId}`), {
                credentials: 'include'
            });
            
            if (!response.ok) {
                throw new Error('Failed to load user data');
            }
            
            const userData = await response.json();
            const addresses = userData.addresses || [];
            
            // Hide loading
            loadingDiv.style.display = 'none';
            
            if (addresses.length === 0) {
                noAddressesDiv.style.display = 'block';
                return;
            }
            
            // Verify addresses belong to the correct user
            const validAddresses = addresses.filter(addr => 
                addr.userId === userId || addr.userId.toString() === userId.toString()
            );
            
            if (validAddresses.length === 0) {
                console.log('No valid addresses found for user after filtering:', userId);
                noAddressesDiv.style.display = 'block';
                return;
            }
            
            // Render addresses
            this.renderUserAddresses(validAddresses, userId);
            
        } catch (error) {
            console.error('Error loading user addresses:', error);
            document.getElementById('loadingAddresses').style.display = 'none';
            document.getElementById('noAddresses').style.display = 'block';
            this.showToast('Error loading user addresses', 'error');
        }
    }
    
    // Clear addresses container 
    clearAddressesContainer() {
        const container = document.getElementById('userAddressesContainer');
        if (container) {
            const existingAddresses = container.querySelectorAll('.address-card');
            existingAddresses.forEach(card => card.remove());
        }
        
        // Also hide the no addresses message initially
        const noAddressesDiv = document.getElementById('noAddresses');
        if (noAddressesDiv) {
            noAddressesDiv.style.display = 'none';
        }
    }
    
    // Render user addresses
    renderUserAddresses(addresses, userId) {
        const container = document.getElementById('userAddressesContainer');
        const existingAddresses = container.querySelectorAll('.address-card');
        existingAddresses.forEach(card => card.remove());
        
        addresses.forEach(address => {
            const addressCard = this.createAddressCard(address, userId);
            container.appendChild(addressCard);
        });
    }
    
    // Create address card element
    createAddressCard(address, userId) {
        const card = document.createElement('div');
        card.className = `address-card ${address.isPrimary ? 'primary' : ''}`;
        card.dataset.addressId = address._id;
        
        card.innerHTML = `
            <div class="address-type-badge ${address.isPrimary ? 'primary' : ''}" data-type="${address.type}">${address.type}</div>
            <div class="address-content">
                <h5>${address.fullName}</h5>
                <div class="address-text">
                    ${address.street}<br>
                    ${address.barangay}, ${address.city}<br>
                    ${address.province}
                </div>
                <div class="phone">
                    <i class="fas fa-phone"></i>
                    ${address.phone}
                </div>
            </div>
            <div class="address-actions">
                <button class="btn edit-address-btn" onclick="adminDashboard.editAddress('${userId}', '${address._id}')">
                    <i class="fas fa-edit"></i>
                    Edit
                </button>
                ${!address.isPrimary ? `
                    <button class="btn set-primary-btn" onclick="adminDashboard.setPrimaryAddress('${userId}', '${address._id}')">
                        <i class="fas fa-star"></i>
                        Set Primary
                    </button>
                ` : ''}
                <button class="btn delete-address-btn" onclick="adminDashboard.deleteAddress('${userId}', '${address._id}')">
                    <i class="fas fa-trash"></i>
                    Delete
                </button>
            </div>
        `;
        
        return card;
    }
    
    // Show address management modal
    showAddressModal(userId = null, addressId = null) {
        const modal = document.getElementById('addressManagementModal');
        const form = document.getElementById('addressForm');
        const title = document.getElementById('addressModalTitle');
        
        // Clear form
        form.reset();
        this.clearFormErrors('addressForm');
        
        // Set user ID
        const userIdInput = document.getElementById('addressUserId');
        if (userIdInput) {
            userIdInput.value = userId || document.getElementById('editUserId').value;
        }
        
        if (addressId) {
            // Editing existing address
            title.textContent = 'Edit Address';
            document.getElementById('addressId').value = addressId;
            this.populateAddressForm(userId || document.getElementById('editUserId').value, addressId);
        } else {
            // Adding new address
            title.textContent = 'Add New Address';
            document.getElementById('addressId').value = '';
        }
        
        this.showModal('addressManagementModal');
    }
    
    // Populate address form for editing
    async populateAddressForm(userId, addressId) {
        try {
            const response = await fetch(this.buildApiUrl(`/addresses/${addressId}`), {
                credentials: 'include'
            });
            
            if (!response.ok) {
                throw new Error('Failed to load address data');
            }
            
            const addressData = await response.json();
            const address = addressData.address;
            
            if (!address) {
                this.showToast('Address not found', 'error');
                return;
            }
            
            // Populate form fields
            document.getElementById('addressType').value = address.type || '';
            document.getElementById('isPrimary').checked = address.isPrimary || false;
            document.getElementById('addressFullName').value = address.fullName || '';
            document.getElementById('addressStreet').value = address.street || '';
            document.getElementById('addressBarangay').value = address.barangay || '';
            document.getElementById('addressCity').value = address.city || '';
            document.getElementById('addressProvince').value = address.province || '';
            document.getElementById('addressPhone').value = address.phone || '';
            
        } catch (error) {
            console.error('Error loading address data:', error);
            this.showToast('Error loading address data', 'error');
        }
    }
    
    // Handle address form submission
    async handleAddressSubmit(e) {
        e.preventDefault();
        
        try {
            this.showLoading();
            
            const formData = new FormData(e.target);
            const userId = formData.get('userId');
            const addressId = formData.get('addressId');
            
            const addressData = {
                type: formData.get('type'),
                isPrimary: formData.has('isPrimary'),
                fullName: formData.get('fullName'),
                street: formData.get('street'),
                barangay: formData.get('barangay'),
                city: formData.get('city'),
                province: formData.get('province'),
                phone: formData.get('phone')
            };
            
            const url = addressId 
                ? this.buildApiUrl(`/users/${userId}/addresses/${addressId}`)
                : this.buildApiUrl(`/users/${userId}/addresses`);
            
            const method = addressId ? 'PUT' : 'POST';
            
            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(addressData)
            });
            
            const result = await response.json();
            
            if (response.ok) {
                this.showToast(
                    addressId ? 'Address updated successfully!' : 'Address added successfully!',
                    'success'
                );
                this.closeModal('addressManagementModal');
                
                // Reload addresses in the edit user modal
                await this.loadUserAddresses(userId);
            } else {
                throw new Error(result.message || 'Failed to save address');
            }
            
        } catch (error) {
            console.error('Error saving address:', error);
            this.showToast(error.message || 'Error saving address', 'error');
        } finally {
            this.hideLoading();
        }
    }
    
    // Edit existing address
    editAddress(userId, addressId) {
        this.showAddressModal(userId, addressId);
    }
    
    // Set primary address
    async setPrimaryAddress(userId, addressId) {
        try {
            this.showLoading();
            
            const response = await fetch(this.buildApiUrl(`/users/${userId}/addresses/${addressId}/primary`), {
                method: 'PUT',
                credentials: 'include'
            });
            
            if (response.ok) {
                this.showToast('Primary address updated successfully!', 'success');
                await this.loadUserAddresses(userId);
            } else {
                throw new Error('Failed to set primary address');
            }
            
        } catch (error) {
            console.error('Error setting primary address:', error);
            this.showToast('Error setting primary address', 'error');
        } finally {
            this.hideLoading();
        }
    }
    
    // Delete address
    async deleteAddress(userId, addressId) {
        if (!confirm('Are you sure you want to delete this address?')) {
            return;
        }
        
        try {
            this.showLoading();
            
            const response = await fetch(this.buildApiUrl(`/users/${userId}/addresses/${addressId}`), {
                method: 'DELETE',
                credentials: 'include'
            });
            
            if (response.ok) {
                this.showToast('Address deleted successfully!', 'success');
                await this.loadUserAddresses(userId);
            } else {
                throw new Error('Failed to delete address');
            }
            
        } catch (error) {
            console.error('Error deleting address:', error);
            this.showToast('Error deleting address', 'error');
        } finally {
            this.hideLoading();
        }
    }

    // ===============================
    // Product Management
    // ===============================
    async loadProducts(page = 1, search = '', category = '', status = '') {
        try {
            this.showLoading();
            
            const queryParams = new URLSearchParams({
                page: page.toString(),
                limit: '10',
                ...(search && { search }),
                ...(category && { category }),
                ...(status && { isActive: status })
            });

            const response = await fetch(this.buildApiUrl(`/products?${queryParams}`), {
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                this.renderProductsTable(data.products);
                this.renderPagination('products', data.currentPage, data.totalPages);
                this.updateProductStats(data.stats);
            } else {
                throw new Error('Failed to load products');
            }
        } catch (error) {
            console.error('Error loading products:', error);
            this.showToast('Error loading products', 'error');
        } finally {
            this.hideLoading();
        }
    }

    renderProductsTable(products) {
        const container = document.getElementById('productsTable');
        if (!container) return;

        if (products.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-box"></i>
                    <h3>No products found</h3>
                    <p>Products will appear here when added</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th>Product</th>
                        <th>Category</th>
                        <th>Price</th>
                        <th>Stock</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${products.map(product => `
                        <tr>
                            <td>
                                <div class="product-info">
                                    ${product.image ? `<img src="${product.image}" alt="${product.name}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px; margin-right: 8px;">` : ''}
                                    <div>
                                        <div class="font-semibold">${product.name}</div>
                                        <div class="text-sm text-secondary">${product.description.substring(0, 50)}...</div>
                                    </div>
                                </div>
                            </td>
                            <td><span class="status-badge">${product.category}</span></td>
                            <td>₱${product.price.toLocaleString()}</td>
                            <td>
                                <span class="${product.stock <= 10 ? 'text-danger font-semibold' : product.stock <= 20 ? 'text-warning font-semibold' : ''}">
                                    ${product.stock} ${product.unit}
                                </span>
                            </td>
                            <td>
                                <span class="status-badge status-${product.isActive ? 'completed' : 'cancelled'}">
                                    ${product.isActive ? 'Active' : 'Inactive'}
                                </span>
                            </td>
                            <td>
                                <button class="btn-secondary" onclick="adminDashboard.editProduct('${product._id}')">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn-danger" onclick="adminDashboard.deleteProduct('${product._id}')">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    updateProductStats(stats) {
        if (stats) {
            this.updateElement('activeProducts', stats.active || 0);
            this.updateElement('lowStock', stats.lowStock || 0);
            this.updateElement('outOfStock', stats.outOfStock || 0);
        }
    }

    showProductModal(productId = null) {
        const addModal = document.getElementById('addProductModal');
        const editModal = document.getElementById('editProductModal');
        let modal, form, title;

        if (productId) {
            // Edit mode - use edit modal
            modal = editModal;
            form = document.getElementById('editProductForm');
            title = document.querySelector('#editProductModal .modal-header h3');
            
            // Reset form and clear image preview
            if (form) form.reset();
            this.clearFormErrors();
            this.removeProductImage('editProductImagePreview');
            
            // Initialize image state tracking
            this.originalProductImage = null;
            this.productImageState = 'unchanged';
            
            this.isEditing.product = true;
            this.editingId.product = productId;
            if (title) title.textContent = 'Edit Product';
            this.loadProductForEdit(productId);
        } else {
            // Add mode - use add modal
            modal = addModal;
            form = document.getElementById('addProductForm');
            title = document.querySelector('#addProductModal .modal-header h3');
            
            // Reset form and clear image preview
            if (form) form.reset();
            this.clearFormErrors();
            this.removeProductImage('productImagePreview');
            
            // Initialize image state tracking for add mode
            this.originalProductImage = null;
            this.productImageState = 'unchanged';
            
            this.isEditing.product = false;
            this.editingId.product = null;
            if (title) title.textContent = 'Add New Product';
        }

        if (modal) {
            modal.style.display = 'flex';
            modal.classList.add('active');
            
            // Ensure cancel button event listener is bound
            const cancelBtn = modal.querySelector('.btn-secondary');
            if (cancelBtn) {
                // Remove existing listeners to prevent duplicates
                const newCancelBtn = cancelBtn.cloneNode(true);
                cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
                
                // Add fresh event listener
                newCancelBtn.addEventListener('click', () => {
                    this.closeModal(modal.id);
                });
            }
        }
    }
    
    async loadProductForEdit(productId) {
        try {
            const response = await fetch(this.buildApiUrl(`/products/${productId}`), {
                credentials: 'include'
            });

            if (response.ok) {
                const product = await response.json();
                
                // Populate edit form fields
                document.getElementById('editProductId').value = productId;
                document.getElementById('editProductName').value = product.name || '';
                document.getElementById('editProductDescription').value = product.description || '';
                document.getElementById('editProductPrice').value = product.price || '';
                document.getElementById('editProductCategory').value = product.category || '';
                document.getElementById('editProductStock').value = product.stock || '';
                document.getElementById('editProductUnit').value = product.unit || '';
                document.getElementById('editProductFarmer').value = product.farmer || '';
                
                // Load existing image if available and track original image
                if (product.image) {
                    this.setImagePreview('editProductImagePreview', product.image);
                    const removeBtn = document.getElementById('editRemoveProductImageBtn');
                    if (removeBtn) {
                        removeBtn.style.display = 'inline-flex';
                    }
                    // Store original image URL and track state
                    this.originalProductImage = product.image;
                    this.productImageState = 'unchanged'; // unchanged, changed, deleted
                } else {
                    this.originalProductImage = null;
                    this.productImageState = 'unchanged';
                }
            } else {
                throw new Error('Failed to load product data');
            }
        } catch (error) {
            console.error('Error loading product for edit:', error);
            this.showToast('Error loading product data', 'error');
        }
    }

    async handleAddProductSubmit(e) {
        e.preventDefault();
        
        if (!this.validateProductForm('add')) {
            return;
        }
        
        const formData = new FormData(e.target);
        
        // Check if there's an image file to upload
        const imageInput = document.getElementById('productImage');
        if (imageInput.files[0]) {
            // The file will be automatically included in FormData
            // but we need to make sure it's using the correct field name
            formData.set('productImage', imageInput.files[0]);
        }

        try {
            this.showLoading();
            
            const response = await fetch(this.buildApiUrl('/products'), {
                method: 'POST',
                credentials: 'include',
                body: formData // Send FormData directly, don't set Content-Type header
            });

            if (response.ok) {
                const result = await response.json();
                this.showToast('Product added successfully!', 'success');
                
                // Reset the form
                const form = document.getElementById('addProductForm');
                if (form) {
                    form.reset();
                    // Clear image preview
                    this.clearImagePreview('productImagePreview');
                    // Hide remove image button
                    const removeBtn = document.getElementById('removeProductImageBtn');
                    if (removeBtn) removeBtn.style.display = 'none';
                }
                
                this.closeModal('addProductModal');
                this.loadProducts(); // Refresh the products list
            } else {
                const error = await response.json();
                this.showToast(error.message || 'Failed to add product', 'error');
            }
        } catch (error) {
            console.error('Error adding product:', error);
            this.showToast('Error adding product', 'error');
        } finally {
            this.hideLoading();
        }
    }

    async handleEditProductSubmit(e) {
        e.preventDefault();
        
        if (!this.validateProductForm('edit')) {
            return;
        }
        
        const formData = new FormData(e.target);
        const productId = document.getElementById('editProductId').value;
        
        // Handle image state
        const imageInput = document.getElementById('editProductImage');
        
        if (this.productImageState === 'changed' && imageInput.files[0]) {
            // New image selected - upload it
            formData.set('productImage', imageInput.files[0]);
        } else if (this.productImageState === 'deleted') {
            // Image was explicitly deleted
            formData.set('removeProductImage', 'true');
        } else if (this.productImageState === 'unchanged') {
            // Keep existing image - don't send any image data
            // The server should preserve the existing image
        }

        try {
            this.showLoading();
            
            const response = await fetch(this.buildApiUrl(`/products/${productId}`), {
                method: 'PUT',
                credentials: 'include',
                body: formData // Send FormData directly, don't set Content-Type header
            });

            if (response.ok) {
                const result = await response.json();
                this.showToast('Product updated successfully!', 'success');
                this.closeModal('editProductModal');
                this.loadProducts(); // Refresh the products list
            } else {
                const error = await response.json();
                this.showToast(error.message || 'Failed to update product', 'error');
            }
        } catch (error) {
            console.error('Error updating product:', error);
            this.showToast('Error updating product', 'error');
        } finally {
            this.hideLoading();
        }
    }

    // Helper function to convert file to base64
    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    }

    // Product validation function
    validateProductForm(mode) {
        let isValid = true;
        const requiredFields = [];
        
        if (mode === 'edit') {
            requiredFields.push(
                { id: 'editProductName', name: 'Product Name' },
                { id: 'editProductCategory', name: 'Category' },
                { id: 'editProductPrice', name: 'Price' },
                { id: 'editProductStock', name: 'Stock' },
                { id: 'editProductUnit', name: 'Unit' }
            );
        } else {
            requiredFields.push(
                { id: 'productName', name: 'Product Name' },
                { id: 'productCategory', name: 'Category' },
                { id: 'productPrice', name: 'Price' },
                { id: 'productStock', name: 'Stock' },
                { id: 'productUnit', name: 'Unit' }
            );
        }

        requiredFields.forEach(field => {
            const element = document.getElementById(field.id);
            const errorElement = document.getElementById(field.id + 'Error');
            
            if (element && (!element.value || element.value.trim() === '')) {
                if (errorElement) {
                    errorElement.textContent = `${field.name} is required`;
                    errorElement.style.display = 'block';
                }
                element.classList.add('error');
                isValid = false;
            } else if (element && errorElement) {
                errorElement.style.display = 'none';
                element.classList.remove('error');
            }
        });

        return isValid;
    }

    async editProduct(productId) {
        this.showProductModal(productId);
    }

    async deleteProduct(productId) {
        if (!confirm('Are you sure you want to delete this product?')) return;        try {
            this.showLoading();
            const response = await fetch(this.buildApiUrl(`/products/${productId}`), {
                method: 'DELETE',
                credentials: 'include'
            });

            if (response.ok) {
                this.loadProducts(this.currentPage.products);
                this.showToast('Product deleted successfully!', 'success');
            } else {
                throw new Error('Failed to delete product');
            }
        } catch (error) {
            console.error('Error deleting product:', error);
            this.showToast('Error deleting product', 'error');
        } finally {
            this.hideLoading();
        }
    }

    searchProducts() {
        const search = document.getElementById('productSearch').value;
        const category = document.getElementById('productCategoryFilter').value;
        const status = document.getElementById('productStatusFilter').value;
        this.currentPage.products = 1;
        this.loadProducts(1, search, category, status);
    }

    filterProducts() {
        this.searchProducts();
    }

    // Transaction Management
    async loadTransactions(page = 1, status = '', dateFrom = '', dateTo = '') {
        try {
            this.showLoading();
            
            const queryParams = new URLSearchParams({
                page: page.toString(),
                limit: '10',
                ...(status && { status }),
                ...(dateFrom && { dateFrom }),
                ...(dateTo && { dateTo })
            });

            const response = await fetch(this.buildApiUrl(`/transactions?${queryParams}`), {
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                this.renderTransactionsTable(data.transactions);
                this.renderPagination('transactions', data.currentPage, data.totalPages);
                this.updateTransactionStats(data.stats);
            } else {
                throw new Error('Failed to load transactions');
            }
        } catch (error) {
            console.error('Error loading transactions:', error);
            this.showToast('Error loading transactions', 'error');
        } finally {
            this.hideLoading();
        }
    }

    renderTransactionsTable(transactions) {
        const container = document.getElementById('transactionsTable');
        if (!container) return;

        if (transactions.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-receipt"></i>
                    <h3>No transactions found</h3>
                    <p>Transactions will appear here when customers make purchases</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th>Transaction ID</th>
                        <th>Customer</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th>Date</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${transactions.map(transaction => `
                        <tr>
                            <td>
                                <div class="font-semibold">#${transaction.transactionId}</div>
                                <div class="text-sm text-secondary">${transaction.items?.length || 0} items</div>
                            </td>
                            <td>
                                <div>${(transaction.user || transaction.userId)?.firstName || 'Unknown'} ${(transaction.user || transaction.userId)?.lastName || 'Customer'}</div>
                                <div class="text-sm text-secondary">${(transaction.user || transaction.userId)?.email || 'No email'}</div>
                            </td>
                            <td class="font-semibold">₱${transaction.totalAmount.toLocaleString()}</td>
                            <td>
                                <select onchange="adminDashboard.updateTransactionStatus('${transaction._id}', this.value)" class="status-select">
                                    <option value="pending" ${transaction.status === 'pending' ? 'selected' : ''}>Pending</option>
                                    <option value="confirmed" ${transaction.status === 'confirmed' ? 'selected' : ''}>Confirmed</option>
                                    <option value="processing" ${transaction.status === 'processing' ? 'selected' : ''}>Processing</option>
                                    <option value="shipped" ${transaction.status === 'shipped' ? 'selected' : ''}>Shipped</option>
                                    <option value="delivered" ${transaction.status === 'delivered' ? 'selected' : ''}>Delivered</option>
                                    <option value="cancelled" ${transaction.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                                    <option value="refunded" ${transaction.status === 'refunded' ? 'selected' : ''}>Refunded</option>
                                </select>
                            </td>
                            <td>
                                <div>${new Date(transaction.createdAt).toLocaleDateString()}</div>
                                <div class="text-sm text-secondary">${new Date(transaction.createdAt).toLocaleTimeString()}</div>
                            </td>
                            <td>
                                <button class="btn-secondary" onclick="adminDashboard.viewTransactionDetails('${transaction._id}')">
                                    <i class="fas fa-eye"></i>
                                </button>
                                <button class="btn-danger" onclick="adminDashboard.deleteTransaction('${transaction._id}')">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    updateTransactionStats(stats) {
        if (stats) {
            this.updateElement('completedTransactions', stats.completed || 0);
            this.updateElement('pendingTransactions', stats.pending || 0);
            this.updateElement('cancelledTransactions', stats.cancelled || 0);
            this.updateElement('todayRevenue', `₱${(stats.todayRevenue || 0).toLocaleString()}`);
        }
    }

    async updateTransactionStatus(transactionId, status) {
        try {
            const response = await fetch(this.buildApiUrl(`/transactions/${transactionId}`), {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ status })
            });

            if (response.ok) {
                this.showToast('Transaction status updated!', 'success');
                this.loadTransactions(this.currentPage.transactions);
            } else {
                throw new Error('Failed to update transaction status');
            }
        } catch (error) {
            console.error('Error updating transaction status:', error);
            this.showToast('Error updating transaction status', 'error');
        }
    }

    async deleteTransaction(transactionId) {
        if (!confirm('Are you sure you want to delete this transaction?')) return;

        try {
            this.showLoading();            
            const response = await fetch(this.buildApiUrl(`/transactions/${transactionId}`), {
                method: 'DELETE',
                credentials: 'include'
            });

            if (response.ok) {
                this.loadTransactions(this.currentPage.transactions);
                this.showToast('Transaction deleted successfully!', 'success');
            } else {
                throw new Error('Failed to delete transaction');
            }
        } catch (error) {
            console.error('Error deleting transaction:', error);
            this.showToast('Error deleting transaction', 'error');
        } finally {
            this.hideLoading();
        }
    }

    viewTransactionDetails(transactionId) {
        // This could open a modal with detailed transaction information
        this.showToast('Transaction details feature coming soon!', 'info');
    }

    filterTransactions() {
        const status = document.getElementById('transactionStatus').value;
        const dateFrom = document.getElementById('transactionDateFrom').value;
        const dateTo = document.getElementById('transactionDateTo').value;
        this.currentPage.transactions = 1;
        this.loadTransactions(1, status, dateFrom, dateTo);
    }

    async exportTransactions() {
        try {
            this.showToast('Exporting transactions...', 'info');
            const response = await fetch(this.buildApiUrl('/transactions/export'), {
                credentials: 'include'
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `transactions_${new Date().toISOString().split('T')[0]}.csv`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                this.showToast('Transactions exported successfully!', 'success');
            } else {
                throw new Error('Failed to export transactions');
            }
        } catch (error) {
            console.error('Error exporting transactions:', error);
            this.showToast('Error exporting transactions', 'error');
        }
    }

    // Utility Methods
    renderPagination(section, currentPage, totalPages) {
        const container = document.getElementById(`${section}Pagination`);
        if (!container) return;

        if (totalPages <= 1) {
            container.innerHTML = '';
            return;
        }

        let pagination = '';

        // Previous button
        pagination += `
            <button onclick="adminDashboard.changePage('${section}', ${currentPage - 1})" 
                    ${currentPage === 1 ? 'disabled' : ''}>
                <i class="fas fa-chevron-left"></i>
            </button>
        `;
        
        // Page numbers
        const startPage = Math.max(1, currentPage - 2);
        const endPage = Math.min(totalPages, currentPage + 2);

        if (startPage > 1) {
            pagination += `<button onclick="adminDashboard.changePage('${section}', 1)">1</button>`;
            if (startPage > 2) {
                pagination += `<span>...</span>`;
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            pagination += `
                <button onclick="adminDashboard.changePage('${section}', ${i})" 
                        ${i === currentPage ? 'class="active"' : ''}>${i}</button>
            `;
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                pagination += `<span>...</span>`;
            }
            pagination += `<button onclick="adminDashboard.changePage('${section}', ${totalPages})">${totalPages}</button>`;
        }
        
        // Next button
        pagination += `
            <button onclick="adminDashboard.changePage('${section}', ${currentPage + 1})" 
                    ${currentPage === totalPages ? 'disabled' : ''}>
                <i class="fas fa-chevron-right"></i>
            </button>
        `;

        container.innerHTML = pagination;
    }

    changePage(section, page) {
        if (page < 1) return;
        
        this.currentPage[section] = page;
        
        switch (section) {
            case 'users':
                const userSearch = document.getElementById('userSearch').value;
                const userRole = document.getElementById('userRoleFilter').value;
                this.loadUsers(page, userSearch, userRole);
                break;
            case 'products':
                const productSearch = document.getElementById('productSearch').value;
                const productCategory = document.getElementById('productCategoryFilter').value;
                const productStatus = document.getElementById('productStatusFilter').value;
                this.loadProducts(page, productSearch, productCategory, productStatus);
                break;
            case 'transactions':
                const transactionStatus = document.getElementById('transactionStatus').value;
                const dateFrom = document.getElementById('transactionDateFrom').value;
                const dateTo = document.getElementById('transactionDateTo').value;
                this.loadTransactions(page, transactionStatus, dateFrom, dateTo);
                break;
        }
    }

    handleGlobalSearch() {
        const query = document.getElementById('globalSearch').value;
        if (query.length > 2) {
            // Implement global search across all sections
            this.showToast('Global search functionality coming soon!', 'info');
        }
    }

    // Modal Management
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            // Reset display style and add active class
            modal.style.display = '';
            modal.classList.add('active');
        }
    }

    closeModal(modalId = null) {
        if (modalId) {
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.classList.remove('active');
                // Use setTimeout to ensure the modal can be reopened immediately
                setTimeout(() => {
                    modal.style.display = 'none';
                }, 50);
                
                // Clear form when closing add product modal
                if (modalId === 'addProductModal') {
                    const form = document.getElementById('addProductForm');
                    if (form) {
                        form.reset();
                        this.clearImagePreview('productImagePreview');
                        const removeBtn = document.getElementById('removeProductImageBtn');
                        if (removeBtn) removeBtn.style.display = 'none';
                    }
                }
                
                // Reset image state when closing any product modal
                if (modalId === 'addProductModal' || modalId === 'editProductModal') {
                    this.originalProductImage = null;
                    this.productImageState = 'unchanged';
                }
                
                // Clear addresses when closing edit user modal
                if (modalId === 'editUserModal') {
                    this.clearAddressesContainer();
                }
            }
        } else {
            document.querySelectorAll('.modal').forEach(modal => {
                modal.classList.remove('active');
                setTimeout(() => {
                    modal.style.display = 'none';
                }, 50);
            });
            // Clear addresses when closing all modals
            this.clearAddressesContainer();
        }
        this.clearFormErrors();
    }

    // Image Handling
    handleImagePreview(previewId, event) {
        const file = event.target.files[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            this.showToast('Please select a valid image file', 'error');
            event.target.value = '';
            return;
        }

        // Validate file size (2MB max to prevent server errors)
        if (file.size > 2 * 1024 * 1024) {
            this.showToast('Image size must be less than 2MB. Please choose a smaller image.', 'error');
            event.target.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            this.setImagePreview(previewId, e.target.result);
            
            // Show remove button based on preview type
            let removeBtn = null;
            if (previewId.includes('product')) {
                removeBtn = previewId.includes('edit') ? 
                    document.getElementById('editRemoveProductImageBtn') : 
                    document.getElementById('removeProductImageBtn');
            } else {
                removeBtn = previewId.includes('edit') ? 
                    document.getElementById('editRemoveImageBtn') : 
                    document.getElementById('removeImageBtn');
            }
            
            if (removeBtn) {
                removeBtn.style.display = 'inline-flex';
            }
            
            // Track image state for edit product form
            if (previewId === 'editProductImagePreview') {
                this.productImageState = 'changed';
            }
            
            // Clear any existing remove flags since user selected a new image
            const form = event.target.closest('form');
            if (form) {
                const profileRemoveFlag = form.querySelector('input[name="removeProfileImage"]');
                const productRemoveFlag = form.querySelector('input[name="removeProductImage"]');
                if (profileRemoveFlag) profileRemoveFlag.value = 'false';
                if (productRemoveFlag) productRemoveFlag.value = 'false';
            }
            
            this.showToast('Image uploaded successfully', 'success');
        };
        
        reader.onerror = () => {
            this.showToast('Error reading image file', 'error');
            event.target.value = '';
        };
        
        reader.readAsDataURL(file);
    }

    setImagePreview(previewId, imageSrc) {
        const preview = document.getElementById(previewId);
        if (preview) {
            const img = preview.querySelector('img');
            const icon = preview.querySelector('.placeholder-icon');
            
            if (!img) {
                // Create img element if it doesn't exist
                const newImg = document.createElement('img');
                newImg.src = imageSrc;
                preview.appendChild(newImg);
            } else {
                img.src = imageSrc;
                img.style.display = 'block';
            }
            
            if (icon) {
                icon.style.display = 'none';
            }
        }
    }

    clearImagePreview(previewId) {
        const preview = document.getElementById(previewId);
        if (preview) {
            const img = preview.querySelector('img');
            const icon = preview.querySelector('.placeholder-icon');
            
            if (img) {
                img.remove();
            }
            
            if (icon) {
                icon.style.display = 'block';
            }
        }
    }

    removeImage(previewId) {
        const preview = document.getElementById(previewId);
        if (preview) {
            const img = preview.querySelector('img');
            const icon = preview.querySelector('.placeholder-icon');
            
            if (img) {
                img.remove();
            }
            
            if (icon) {
                icon.style.display = 'block';
            }
        }
        
        // Clear file input and hide remove button
        const isEdit = previewId.includes('edit');
        const fileInput = document.getElementById(isEdit ? 'editProfileImage' : 'profileImage');
        const removeBtn = document.getElementById(isEdit ? 'editRemoveImageBtn' : 'removeImageBtn');
        
        console.log('isEdit:', isEdit);
        console.log('fileInput found:', !!fileInput);
        console.log('removeBtn found:', !!removeBtn);
        
        if (fileInput) fileInput.value = '';
        if (removeBtn) removeBtn.style.display = 'none';
        
        // Set a flag to indicate image should be removed
        const form = fileInput?.closest('form');
        console.log('form found:', !!form);
        console.log('form id:', form?.id);
        
        if (form) {
            let removeFlag = form.querySelector('input[name="removeProfileImage"]');
            if (!removeFlag) {
                removeFlag = document.createElement('input');
                removeFlag.type = 'hidden';
                removeFlag.name = 'removeProfileImage';
                form.appendChild(removeFlag);
                console.log('Created new removeProfileImage hidden input');
            } else {
                console.log('Found existing removeProfileImage hidden input');
            }
            removeFlag.value = 'true';
            console.log('Set removeProfileImage flag to:', removeFlag.value);
        }
        console.log('========================');
    }

    removeProductImage(previewId) {
        const preview = document.getElementById(previewId);
        if (preview) {
            const img = preview.querySelector('img');
            const icon = preview.querySelector('.placeholder-icon');
            
            if (img) {
                img.remove();
            }
            
            if (icon) {
                icon.style.display = 'block';
            }
        }
        
        // Clear file input and hide remove button
        const isEdit = previewId.includes('edit');
        const fileInput = document.getElementById(isEdit ? 'editProductImage' : 'productImage');
        const removeBtn = document.getElementById(isEdit ? 'editRemoveProductImageBtn' : 'removeProductImageBtn');
        
        if (fileInput) fileInput.value = '';
        if (removeBtn) removeBtn.style.display = 'none';
        
        // Set a flag to indicate image should be removed
        const form = fileInput?.closest('form');
        if (form) {
            let removeFlag = form.querySelector('input[name="removeProductImage"]');
            if (!removeFlag) {
                removeFlag = document.createElement('input');
                removeFlag.type = 'hidden';
                removeFlag.name = 'removeProductImage';
                form.appendChild(removeFlag);
            }
            removeFlag.value = 'true';
        }
        
        // Track image state for edit product form
        if (previewId === 'editProductImagePreview') {
            this.productImageState = 'deleted';
        }
    }

    // Form Validation
    validateUserForm(mode) {
        let isValid = true;
        
        // Required fields with correct IDs
        const requiredFields = [];
        
        if (mode === 'edit') {
            requiredFields.push(
                { id: 'editFirstName', name: 'First Name' },
                { id: 'editLastName', name: 'Last Name' },
                { id: 'editEmail', name: 'Email' },
                { id: 'editRole', name: 'Role' }
            );
        } else {
            requiredFields.push(
                { id: 'firstName', name: 'First Name' },
                { id: 'lastName', name: 'Last Name' },
                { id: 'email', name: 'Email' },
                { id: 'role', name: 'Role' },
                { id: 'password', name: 'Password' },
                { id: 'confirmPassword', name: 'Confirm Password' }
            );
        }
        
        requiredFields.forEach(field => {
            const element = document.getElementById(field.id);
            const errorElement = document.getElementById(`${field.id}Error`);
            
            if (element && !element.value.trim()) {
                this.showFieldError(errorElement, `${field.name} is required`);
                isValid = false;
            } else if (element) {
                this.clearFieldError(errorElement);
            }
        });
        
        // Email validation
        const emailField = document.getElementById(mode === 'edit' ? 'editEmail' : 'email');
        const emailError = document.getElementById(mode === 'edit' ? 'editEmailError' : 'emailError');
        if (emailField && emailField.value && !this.isValidEmail(emailField.value)) {
            this.showFieldError(emailError, 'Please enter a valid email address');
            isValid = false;
        }
        
        // Password validation (only for add mode)
        if (mode === 'add') {
            const password = document.getElementById('password')?.value;
            const confirmPassword = document.getElementById('confirmPassword')?.value;
            const passwordError = document.getElementById('passwordError');
            const confirmPasswordError = document.getElementById('confirmPasswordError');
            
            if (password && password.length < 6) {
                this.showFieldError(passwordError, 'Password must be at least 6 characters long');
                isValid = false;
            }
            
            if (password !== confirmPassword) {
                this.showFieldError(confirmPasswordError, 'Passwords do not match');
                isValid = false;
            }
        }
        
        // Password change validation (for edit mode)
        if (mode === 'edit') {
            const currentPassword = document.getElementById('editCurrentPassword')?.value;
            const newPassword = document.getElementById('editNewPassword')?.value;
            const confirmNewPassword = document.getElementById('editConfirmNewPassword')?.value;
            
            const currentPasswordError = document.getElementById('editCurrentPasswordError');
            const newPasswordError = document.getElementById('editNewPasswordError');
            const confirmNewPasswordError = document.getElementById('editConfirmNewPasswordError');
            
            // If any password field is filled, all must be filled
            if (currentPassword || newPassword || confirmNewPassword) {
                if (!currentPassword) {
                    this.showFieldError(currentPasswordError, 'Current password is required to change password');
                    isValid = false;
                } else {
                    this.clearFieldError(currentPasswordError);
                }
                
                if (!newPassword) {
                    this.showFieldError(newPasswordError, 'New password is required');
                    isValid = false;
                } else if (newPassword.length < 6) {
                    this.showFieldError(newPasswordError, 'New password must be at least 6 characters long');
                    isValid = false;
                } else {
                    this.clearFieldError(newPasswordError);
                }
                
                if (!confirmNewPassword) {
                    this.showFieldError(confirmNewPasswordError, 'Please confirm new password');
                    isValid = false;
                } else if (newPassword !== confirmNewPassword) {
                    this.showFieldError(confirmNewPasswordError, 'New passwords do not match');
                    isValid = false;
                } else {
                    this.clearFieldError(confirmNewPasswordError);
                }
                
                // Check if new password is different from current
                if (currentPassword && newPassword && currentPassword === newPassword) {
                    this.showFieldError(newPasswordError, 'New password must be different from current password');
                    isValid = false;
                }
            } else {
                // Clear any existing password errors if no password change is attempted
                this.clearFieldError(currentPasswordError);
                this.clearFieldError(newPasswordError);
                this.clearFieldError(confirmNewPasswordError);
            }
        }
        
        return isValid;
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    showFieldError(errorElement, message) {
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.classList.add('show');
        }
    }

    clearFieldError(errorElement) {
        if (errorElement) {
            errorElement.textContent = '';
            errorElement.classList.remove('show');
        }
    }

    // Form Handling
    clearFormErrors(mode = 'all') {
        if (mode === 'all') {
            document.querySelectorAll('.form-error').forEach(error => {
                error.classList.remove('show');
                error.textContent = '';
            });
        } else {
            const prefix = mode === 'edit' ? 'edit' : '';
            const form = document.getElementById(`${prefix ? 'edit' : 'add'}UserForm`);
            if (form) {
                form.querySelectorAll('.form-error').forEach(error => {
                    error.classList.remove('show');
                    error.textContent = '';
                });
            }
        }
    }

    handleFormErrors(errors, mode = 'add') {
        Object.keys(errors).forEach(field => {
            let fieldId = field;
            
            // Handle field name mapping for edit mode
            if (mode === 'edit') {
                // Special handling for password fields
                if (field === 'currentPassword') {
                    fieldId = 'editCurrentPassword';
                } else if (field === 'newPassword') {
                    fieldId = 'editNewPassword';
                } else if (field === 'confirmNewPassword') {
                    fieldId = 'editConfirmNewPassword';
                } else if (field === 'password') {
                    fieldId = 'editNewPassword'; // Map general password errors to new password field
                } else {
                    fieldId = `edit${field.charAt(0).toUpperCase() + field.slice(1)}`;
                }
            }
            
            const errorElement = document.getElementById(`${fieldId}Error`);
            if (errorElement) {
                this.showFieldError(errorElement, errors[field]);
            }
        });
    }

    // Loading and Notifications
    showLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.style.display = 'flex';
            overlay.classList.add('show');
        }
    }

    hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.style.display = 'none';
            overlay.classList.remove('show');
        }
    }

    showToast(message, type = 'info', duration = 3000) {
        let container = document.getElementById('toastContainer');
        
        // Create container if it doesn't exist
        if (!container) {
            container = document.createElement('div');
            container.id = 'toastContainer';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };

        toast.innerHTML = `
            <div class="toast-header">
                <div class="toast-title">
                    <i class="${icons[type] || icons.info}"></i>
                    ${type.charAt(0).toUpperCase() + type.slice(1)}
                </div>
                <button class="toast-close" onclick="this.parentElement.parentElement.remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="toast-message">${message}</div>
        `;

        container.appendChild(toast);

        // Auto remove after duration
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, duration);
    }

    updateElement(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }

    // Logout
    async handleLogout() {
        if (confirm('Are you sure you want to logout?')) {
            try {
                await fetch(`${this.apiConfig.baseUrl}/api/users/logout`, {
                    method: 'POST',
                    credentials: 'include'
                });
            } catch (error) {
                console.error('Logout error:', error);
            }            localStorage.removeItem('user');
            localStorage.removeItem('isLoggedIn');
            this.currentUser = null;
            window.location.href = window.AuthUtils ? window.AuthUtils.createUrl('/login') : '/login';
        }
    }

    // Utility function
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize the admin dashboard only once
    if (!window.adminDashboard) {
        window.adminDashboard = new ModernAdminDashboard();
    }
});

// Export for global access
window.ModernAdminDashboard = ModernAdminDashboard;
