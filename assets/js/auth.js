// Authentication utility functions
window.AuthUtils = {
    // Get universal base URL
    getBaseUrl: function() {
        if (window.API_CONFIG) {
            return window.API_CONFIG.BASE_URL;
        }
        
        // Fallback detection
        const protocol = window.location.protocol;
        const host = window.location.host;
        const isLocalFile = protocol === 'file:' || host.includes(':5500');
        
        return isLocalFile ? 'http://localhost:3000' : `${protocol}//${host}`;
    },

    // Create universal URL for navigation
    createUrl: function(path) {
        // For same-origin navigation, use relative paths
        const currentHost = window.location.host;
        if (currentHost === 'localhost:3000' || currentHost === '127.0.0.1:3000') {
            return path.startsWith('/') ? path : `/${path}`;
        }
        
        // For cross-origin (like Live Server), use full URL
        const baseUrl = this.getBaseUrl();
        const cleanPath = path.startsWith('/') ? path : `/${path}`;
        return `${baseUrl}${cleanPath}`;
    },

    // Check if user is logged in
    isLoggedIn: function() {
        return localStorage.getItem('isLoggedIn') === 'true';
    },

    // Get current user data
    getCurrentUser: function() {
        const userStr = localStorage.getItem('user');
        return userStr ? JSON.parse(userStr) : null;
    },

    // Set user data after login
    setUserData: function(userData) {
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('isLoggedIn', 'true');
    },

    // Clear user data on logout
    clearUserData: function() {
        localStorage.removeItem('user');
        localStorage.removeItem('isLoggedIn');
    },    // Redirect to login if not authenticated
    requireAuth: function(redirectPath = '/login') {
        if (!this.isLoggedIn()) {
            window.location.href = this.createUrl(redirectPath);
            return false;
        }
        return true;
    },

    // Logout user
    logout: async function() {
        try {
            const apiUrl = window.API_CONFIG ? `${window.API_CONFIG.API_ENDPOINT}/users/logout` : 'http://localhost:3000/api/users/logout';
            await fetch(apiUrl, {
                method: 'POST',
                credentials: 'include'
            });
        } catch (error) {
            console.error('Logout error:', error);        } finally {
            this.clearUserData();
            window.location.href = this.createUrl('/login');
        }
    },    // Update navigation based on auth status
    updateNavigation: function() {
        const isLoggedIn = this.isLoggedIn();
        const user = this.getCurrentUser();
        
        // Find the nav-links container
        const navLinksContainer = document.querySelector('.nav-links');
        if (!navLinksContainer) return;

        if (isLoggedIn && user) {
            // Update login link to show logout
            const loginLink = navLinksContainer.querySelector('a[href*="login"]');
            if (loginLink) {
                const loginLi = loginLink.parentElement;
                
                // Replace login link with simple logout
                loginLi.innerHTML = '<a href="#" class="logout-link">Logout</a>';
                
                // Add logout functionality
                const logoutBtn = loginLi.querySelector('.logout-link');
                logoutBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.showLogoutConfirmationEnhanced();
                });
            }

            // Add admin dashboard link for admin users
            if (user.role === 'admin') {
                const adminLinkExists = navLinksContainer.querySelector('a[href*="admin"]');
                if (!adminLinkExists) {
                    const adminLi = document.createElement('li');
                    adminLi.innerHTML = '<a href="' + this.createUrl('/admin') + '" class="admin-link">Admin</a>';
                    // Insert before logout link
                    const logoutLi = navLinksContainer.querySelector('.logout-link').parentElement;
                    navLinksContainer.insertBefore(adminLi, logoutLi);
                }
            }
        } else {
            // User not logged in - ensure login link is present
            const loginLink = navLinksContainer.querySelector('a[href*="login"]');
            const logoutLink = navLinksContainer.querySelector('.logout-link');
            const adminLink = navLinksContainer.querySelector('.admin-link');
            
            // Remove admin link if exists
            if (adminLink) {
                adminLink.parentElement.remove();
            }
            
            if (logoutLink) {
                // Replace logout with login
                const logoutLi = logoutLink.parentElement;
                logoutLi.innerHTML = '<a href="' + this.createUrl('/login') + '">Login</a>';
            } else if (!loginLink) {
                // Add login link if it doesn't exist
                const loginLi = document.createElement('li');
                loginLi.innerHTML = '<a href="' + this.createUrl('/login') + '">Login</a>';
                navLinksContainer.appendChild(loginLi);
            }
        }

        // Add user info display if needed
        this.updateUserInfoElements(isLoggedIn, user);
    },

    // Show logout confirmation
    showLogoutConfirmation: function() {
        const confirmed = confirm('Are you sure you want to logout?');
        if (confirmed) {
            this.logout();
        }
    },    // Enhanced logout with better UX
    logoutEnhanced: async function() {
        try {
            // Show loading state
            const logoutLinks = document.querySelectorAll('.logout-link, .logout-btn');
            logoutLinks.forEach(btn => {
                btn.textContent = 'Logging out...';
                btn.style.opacity = '0.6';
                btn.style.pointerEvents = 'none';
            });

            // Call backend logout
            const apiUrl = window.API_CONFIG ? `${window.API_CONFIG.API_ENDPOINT}/users/logout` : 'http://localhost:3000/api/users/logout';
            await fetch(apiUrl, {
                method: 'POST',
                credentials: 'include'
            });

            // Clear local data
            this.clearUserData();
            
            // Show success message briefly
            this.showLogoutSuccess();            // Redirect after a short delay
            setTimeout(() => {
                window.location.href = this.createUrl('/login');
            }, 1500);
            
        } catch (error) {
            console.error('Logout error:', error);            // Even if backend fails, clear local data and redirect
            this.clearUserData();
            window.location.href = this.createUrl('/login');
        }
    },

    // Enhanced logout confirmation
    showLogoutConfirmationEnhanced: function() {
        const user = this.getCurrentUser();
        const userName = user ? user.firstName : 'User';
        
        const confirmed = confirm(
            `Are you sure you want to logout?`
        );
        
        if (confirmed) {
            this.logoutEnhanced();
        }
    },

    // Update user info elements across the page
    updateUserInfoElements: function(isLoggedIn, user) {
        if (isLoggedIn && user) {
            const userInfoElements = document.querySelectorAll('.user-info');
            userInfoElements.forEach(element => {
                element.textContent = `Welcome, ${user.firstName} ${user.lastName}!`;
                element.style.display = 'block';
            });

            // Update any username displays
            const usernameElements = document.querySelectorAll('.username-display');
            usernameElements.forEach(element => {
                element.textContent = user.username;
            });
        } else {
            // Hide user info elements when not logged in
            const userInfoElements = document.querySelectorAll('.user-info');
            userInfoElements.forEach(element => {
                element.style.display = 'none';
            });
        }
    }
};

// Auto-update navigation on page load
document.addEventListener('DOMContentLoaded', () => {
    window.AuthUtils.updateNavigation();
});

// Global logout function for templates to use
window.logout = function() {
    // Show confirmation before logout
    if (confirm('Are you sure you want to logout?')) {
        return window.AuthUtils.logout();
    }
};
