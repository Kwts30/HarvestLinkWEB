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
    }    // Setup API configuration for multi-domain support
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
        
        console.log('🌐 API Base URL configured:', baseUrl);
        
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
        await this.checkAuth();
        this.bindEvents();
        this.initializeTime();
        this.loadDashboardData();
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

    // Event Bindings
    bindEvents() {
        // Sidebar navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = e.currentTarget.dataset.section;
                this.showSection(section);
            });
        });

        // Logout button
        document.getElementById('logoutBtn').addEventListener('click', this.handleLogout.bind(this));

        // Modal controls
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', this.closeModal.bind(this));
        });        // User management
        document.getElementById('addUserBtn').addEventListener('click', () => this.showUserModal());
        document.getElementById('userForm').addEventListener('submit', this.handleUserSubmit.bind(this));
        document.getElementById('userSearch').addEventListener('input', this.debounce(this.searchUsers.bind(this), 300));
        document.getElementById('userRoleFilter').addEventListener('change', this.filterUsers.bind(this));
        
        // User image upload
        document.getElementById('userProfileImage').addEventListener('change', this.handleUserImagePreview.bind(this));
        document.getElementById('removeUserImageBtn').addEventListener('click', this.removeUserImage.bind(this));

        // Product management
        document.getElementById('addProductBtn').addEventListener('click', () => this.showProductModal());
        document.getElementById('productForm').addEventListener('submit', this.handleProductSubmit.bind(this));
        document.getElementById('productSearch').addEventListener('input', this.debounce(this.searchProducts.bind(this), 300));
        document.getElementById('productCategoryFilter').addEventListener('change', this.filterProducts.bind(this));
        document.getElementById('productStatusFilter').addEventListener('change', this.filterProducts.bind(this));        // Transaction management
        document.getElementById('transactionStatus').addEventListener('change', this.filterTransactions.bind(this));
        document.getElementById('transactionDateFrom').addEventListener('change', this.filterTransactions.bind(this));
        document.getElementById('transactionDateTo').addEventListener('change', this.filterTransactions.bind(this));
        document.getElementById('exportTransactions').addEventListener('click', this.exportTransactions.bind(this));        // Global search
        document.getElementById('globalSearch').addEventListener('input', this.handleGlobalSearch.bind(this));

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
    }    // Dashboard Data Loading
    async loadDashboardData() {
        try {
            this.showLoading();
            
            // Load all dashboard stats
            const [statsResponse, recentTransactionsResponse, topProductsResponse] = await Promise.all([
                fetch(this.buildApiUrl('/dashboard/stats'), { credentials: 'include' }),
                fetch(this.buildApiUrl('/transactions?limit=5&sort=-createdAt'), { credentials: 'include' }),
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
                const topProducts = await topProductsResponse.json();
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
                        ${transaction.user.firstName} ${transaction.user.lastName} • 
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
                <div class="empty-state">
                    <i class="fas fa-box"></i>
                    <h3>No product data</h3>
                    <p>Top products will appear here</p>
                </div>
            `;
            return;
        }

        container.innerHTML = products.map((product, index) => `
            <div class="product-item">
                <div class="item-info">
                    <div class="item-title">${product.name}</div>
                    <div class="item-subtitle">${product.sales || 0} sold</div>
                </div>
                <div class="item-value">#${index + 1}</div>
            </div>
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
    }    showUserModal(userId = null) {
        const modal = document.getElementById('userModal');
        const form = document.getElementById('userForm');
        const title = document.getElementById('userModalTitle');
        const passwordGroup = document.getElementById('passwordGroup');

        // Reset form
        form.reset();
        this.clearFormErrors();
        this.removeUserImage(); // Reset image preview

        if (userId) {
            // Edit mode
            this.isEditing.user = true;
            this.editingId.user = userId;
            title.textContent = 'Edit User';
            passwordGroup.style.display = 'none';
            this.loadUserForEdit(userId);
        } else {
            // Add mode
            this.isEditing.user = false;
            this.editingId.user = null;
            title.textContent = 'Add New User';
            passwordGroup.style.display = 'block';            document.getElementById('userPassword').required = true;
        }        modal.style.display = 'flex';
        modal.classList.add('active');
    }async loadUserForEdit(userId) {
        try {
            const response = await fetch(this.buildApiUrl(`/users/${userId}`), {
                credentials: 'include'
            });            if (response.ok) {
                const user = await response.json();
                document.getElementById('userFirstName').value = user.firstName;
                document.getElementById('userLastName').value = user.lastName;
                document.getElementById('userEmail').value = user.email;
                document.getElementById('userUsername').value = user.username;
                document.getElementById('userPhone').value = user.phoneNumber || '';
                document.getElementById('userRole').value = user.role;
                
                // Load profile image if exists
                if (user.profileImage) {
                    const previewImg = document.getElementById('userPreviewImg');
                    const placeholderIcon = document.getElementById('userPlaceholderIcon');
                    const removeBtn = document.getElementById('removeUserImageBtn');
                    
                    previewImg.src = user.profileImage;
                    previewImg.style.display = 'block';
                    placeholderIcon.style.display = 'none';
                    removeBtn.style.display = 'inline-flex';
                }
            }
        } catch (error) {
            console.error('Error loading user for edit:', error);
            this.showToast('Error loading user data', 'error');
        }
    }    async handleUserSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const imageFile = formData.get('profileImage');
          // Prepare user data
        const userData = {
            firstName: formData.get('firstName'),
            lastName: formData.get('lastName'),
            email: formData.get('email'),
            username: formData.get('username'),
            phoneNumber: formData.get('phoneNumber'),
            role: formData.get('role')
        };
        
        // Add password only for new users
        if (!this.isEditing.user) {
            userData.password = formData.get('password');
        }
        
        // Handle profile image
        if (imageFile && imageFile.size > 0) {
            try {
                const imageBase64 = await this.convertImageToBase64(imageFile);
                userData.profileImage = imageBase64;
            } catch (error) {
                this.showToast('Error processing image', 'error');
                return;
            }
        }

        try {
            this.showLoading();
            
            const url = this.isEditing.user 
                ? this.buildApiUrl(`/users/${this.editingId.user}`)
                : this.buildApiUrl('/users');
            
            const method = this.isEditing.user ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(userData)
            });

            if (response.ok) {
                this.closeModal();
                this.loadUsers(this.currentPage.users);
                this.showToast(
                    this.isEditing.user ? 'User updated successfully!' : 'User created successfully!',
                    'success'
                );
            } else {
                const error = await response.json();
                this.handleFormErrors(error.errors || { general: error.message });
            }
        } catch (error) {
            console.error('Error saving user:', error);
            this.showToast('Error saving user', 'error');
        } finally {
            this.hideLoading();
        }
    }
    
    // Helper function to convert image to base64
    convertImageToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
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
    }    // User Image Handling
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

    // Product Management
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
        const modal = document.getElementById('productModal');
        const form = document.getElementById('productForm');
        const title = document.getElementById('productModalTitle');

        // Reset form
        form.reset();
        this.clearFormErrors();

        if (productId) {
            // Edit mode
            this.isEditing.product = true;
            this.editingId.product = productId;
            title.textContent = 'Edit Product';
            this.loadProductForEdit(productId);
        } else {
            // Add mode
            this.isEditing.product = false;
            this.editingId.product = null;
            title.textContent = 'Add New Product';
            document.getElementById('productActive').checked = true;        }

        modal.style.display = 'flex';
        modal.classList.add('active');
    }async loadProductForEdit(productId) {
        try {
            const response = await fetch(this.buildApiUrl(`/products/${productId}`), {
                credentials: 'include'
            });

            if (response.ok) {
                const product = await response.json();
                document.getElementById('productName').value = product.name;
                document.getElementById('productDescription').value = product.description;
                document.getElementById('productPrice').value = product.price;
                document.getElementById('productCategory').value = product.category;
                document.getElementById('productStock').value = product.stock;
                document.getElementById('productUnit').value = product.unit;
                document.getElementById('productImage').value = product.image || '';
                document.getElementById('productActive').checked = product.isActive;
            }
        } catch (error) {
            console.error('Error loading product for edit:', error);
            this.showToast('Error loading product data', 'error');
        }
    }

    async handleProductSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const productData = Object.fromEntries(formData.entries());
        
        // Convert checkbox to boolean
        productData.isActive = productData.isActive === 'on';

        try {
            this.showLoading();            const url = this.isEditing.product 
                ? this.buildApiUrl(`/products/${this.editingId.product}`)
                : this.buildApiUrl('/products');
            
            const method = this.isEditing.product ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(productData)
            });

            if (response.ok) {
                this.closeModal();
                this.loadProducts(this.currentPage.products);
                this.showToast(
                    this.isEditing.product ? 'Product updated successfully!' : 'Product created successfully!',
                    'success'
                );
            } else {
                const error = await response.json();
                this.handleFormErrors(error.errors || { general: error.message });
            }
        } catch (error) {
            console.error('Error saving product:', error);
            this.showToast('Error saving product', 'error');
        } finally {
            this.hideLoading();
        }
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
                                <div>${transaction.user.firstName} ${transaction.user.lastName}</div>
                                <div class="text-sm text-secondary">${transaction.user.email}</div>
                            </td>
                            <td class="font-semibold">₱${transaction.totalAmount.toLocaleString()}</td>
                            <td>
                                <select onchange="adminDashboard.updateTransactionStatus('${transaction._id}', this.value)" class="status-select">
                                    <option value="pending" ${transaction.status === 'pending' ? 'selected' : ''}>Pending</option>
                                    <option value="completed" ${transaction.status === 'completed' ? 'selected' : ''}>Completed</option>
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
    }    async updateTransactionStatus(transactionId, status) {
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
            this.showLoading();            const response = await fetch(this.buildApiUrl(`/transactions/${transactionId}`), {
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
        }    }    // Utility Methods
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
    }    // Modal Management
    closeModal() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('active');
            modal.style.display = 'none';
        });
        this.clearFormErrors();
    }

    // Form Handling
    clearFormErrors() {
        document.querySelectorAll('.form-error').forEach(error => {
            error.style.display = 'none';
            error.textContent = '';
        });
        document.querySelectorAll('.input-error').forEach(input => {
            input.classList.remove('input-error');
        });
    }

    handleFormErrors(errors) {
        this.clearFormErrors();
        
        Object.keys(errors).forEach(field => {
            const errorElement = document.getElementById(`${field}Error`);
            const inputElement = document.getElementById(field);
            
            if (errorElement && inputElement) {
                errorElement.textContent = errors[field];
                errorElement.style.display = 'block';
                inputElement.classList.add('input-error');
            }
        });
    }

    // Loading and Notifications
    showLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) overlay.style.display = 'block';
    }

    hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) overlay.style.display = 'none';
    }

    showToast(message, type = 'info', duration = 3000) {
        const container = document.getElementById('toastContainer');
        if (!container) {
            // Fallback to simple alert if container doesn't exist
            alert(message);
            return;
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

// Initialize the admin dashboard
const adminDashboard = new ModernAdminDashboard();
