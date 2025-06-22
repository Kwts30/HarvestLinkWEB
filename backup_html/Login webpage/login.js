document.addEventListener('DOMContentLoaded', () => {
    const hamburger = document.querySelector('.hamburger');
    const hamburgerMenu = document.querySelector('.hamburger-menu');
    const navOverlay = document.querySelector('.nav-overlay');
    const closeMenu = document.querySelector('.close-menu');
    const navLinks = document.querySelectorAll('.nav-links a');
    const navbar = document.querySelector('.navbar');
    const loginForm = document.querySelector('#loginForm');
    const messageDiv = document.querySelector('#message');

    // Debug: Check if elements exist
    console.log('Elements found:', {
        hamburger: !!hamburger,
        navOverlay: !!navOverlay,
        closeMenu: !!closeMenu,
        loginForm: !!loginForm,
        messageDiv: !!messageDiv
    });

    // Handle form submission
    if (loginForm) {
        loginForm.addEventListener('submit', async function (e) {
        e.preventDefault(); // Prevent form from reloading page

        // Clear previous messages
        hideMessage();

        // Get form data
        const formData = new FormData(loginForm);
        const loginData = {
            email: formData.get('email').trim(),
            password: formData.get('password')
        };

        // Basic validation
        if (!loginData.email || !loginData.password) {
            showMessage('Please fill in all fields', 'error');
            return;
        }

        try {
           
            // Show loading state
            const submitBtn = loginForm.querySelector('.login-btn');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Logging in...';
            submitBtn.disabled = true;

            // Send login request
            const apiUrl = window.API_CONFIG ? `${window.API_CONFIG.API_ENDPOINT}/users/login` : 'http://localhost:3000/api/users/login';
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include', // Important for sessions
                body: JSON.stringify(loginData)
            });

            const result = await response.json();            
            if (result.success) {
                showMessage('Login successful! Redirecting...', 'success');
                
                // Store user info in localStorage for easy access
                localStorage.setItem('user', JSON.stringify(result.user));
                localStorage.setItem('isLoggedIn', 'true');
                
                // Clear form
                loginForm.reset();
                
                // Check if user is admin and redirect accordingly
                if (result.user.role === 'admin') {
                    // Redirect to admin dashboard
                    setTimeout(() => {
                        window.location.href = window.AuthUtils ? window.AuthUtils.createUrl('/admin') : '/admin';
                    }, 1500);
                } 
                
                else {
                    // Redirect to shop for regular users
                    setTimeout(() => {
                        window.location.href = window.AuthUtils ? window.AuthUtils.createUrl('/shop') : '/shop';
                    }, 1500);
                }

            } else {
                showMessage(result.message || 'Login failed. Please try again.', 'error');
            }

            // Reset button
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;

        } catch (error) {
            console.error('Login error:', error);
            showMessage('Network error. Please check your connection and try again.', 'error');
            
            // Reset button
            const submitBtn = loginForm.querySelector('.login-btn');
            submitBtn.textContent = 'Login';
            submitBtn.disabled = false;
        }        
    });
    
    } else {
        console.error('Login form not found!');
    }

    // Function to show messages
    function showMessage(message, type) {
        if (messageDiv) {
            messageDiv.textContent = message;
            messageDiv.className = `message ${type}`;
            messageDiv.style.display = 'block';
            
            // Hide success messages after 3 seconds
            if (type === 'success') {
                setTimeout(() => {
                    hideMessage();
                }, 3000);
            }
        }
    }

    // Function to hide messages
    function hideMessage() {
        if (messageDiv) {
            messageDiv.style.display = 'none';
            messageDiv.textContent = '';
            messageDiv.className = 'message';
        }
    }

    // Toggle menu on hamburger click
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

    // Close menu on close button click
    if (closeMenu && hamburger && navOverlay) {
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

    // Close menu when clicking a link
    if (navLinks.length > 0 && hamburger && navOverlay) {
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
});