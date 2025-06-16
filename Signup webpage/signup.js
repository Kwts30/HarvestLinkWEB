document.addEventListener('DOMContentLoaded', () => {
    const hamburger = document.querySelector('.hamburger');
    const hamburgerMenu = document.querySelector('.hamburger-menu');
    const navOverlay = document.querySelector('.nav-overlay');
    const closeMenu = document.querySelector('.close-menu');
    const navLinks = document.querySelectorAll('.nav-links a');
    const navbar = document.querySelector('.navbar');
    const signupForm = document.querySelector('#signupForm');
    const messageDiv = document.querySelector('#message');    // Handle form submission
    signupForm.addEventListener('submit', async function (e) {
        e.preventDefault(); // Prevent form from reloading page

        // Clear previous messages
        hideMessage();

        // Get form data
        const formData = new FormData(signupForm);
        const userData = {
            firstName: formData.get('firstName').trim(),
            lastName: formData.get('lastName').trim(),
            username: formData.get('username').trim(),
            email: formData.get('email').trim(),
            password: formData.get('password'),
            confirmPassword: formData.get('confirmPassword')
        };

        // Comprehensive validation
        const validationError = validateForm(userData);
        if (validationError) {
            showMessage(validationError, 'error');
            return;
        }

        try {
            // Show loading state
            const submitBtn = signupForm.querySelector('.signup-btn');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Creating Account...';
            submitBtn.disabled = true;            // Send data to backend
            const apiUrl = window.API_CONFIG ? `${window.API_CONFIG.API_ENDPOINT}/users/register` : 'http://localhost:3000/api/users/register';
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(userData)
            });

            const result = await response.json();

            if (result.success) {
                showMessage('Account created successfully! Redirecting to login...', 'success');
                signupForm.reset(); // Clear the form
                // Redirect to login page after 2 seconds
                setTimeout(() => {
                    window.location.href = '../Login webpage/login.html';
                }, 2000);
            } else {
                showMessage(result.message || 'Registration failed. Please try again.', 'error');
            }

            // Reset button
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;

        } catch (error) {
            console.error('Registration error:', error);
            showMessage('Network error. Please check your connection and try again.', 'error');
            
            // Reset button
            const submitBtn = signupForm.querySelector('.signup-btn');
            submitBtn.textContent = 'Sign Up';
            submitBtn.disabled = false;
        }
    });

    // Validation function
    function validateForm(userData) {
        // Check for empty fields
        if (!userData.firstName) return 'First name is required';
        if (!userData.lastName) return 'Last name is required';
        if (!userData.username) return 'Username is required';
        if (!userData.email) return 'Email is required';
        if (!userData.password) return 'Password is required';
        if (!userData.confirmPassword) return 'Please confirm your password';

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(userData.email)) {
            return 'Please enter a valid email address';
        }

        // Username validation
        if (userData.username.length < 3) {
            return 'Username must be at least 3 characters long';
        }
        if (!/^[a-zA-Z0-9_]+$/.test(userData.username)) {
            return 'Username can only contain letters, numbers, and underscores';
        }

        // Password validation
        if (userData.password.length < 6) {
            return 'Password must be at least 6 characters long';
        }
        if (userData.password !== userData.confirmPassword) {
            return 'Passwords do not match';
        }

        // Name validation
        if (userData.firstName.length < 2) {
            return 'First name must be at least 2 characters long';
        }
        if (userData.lastName.length < 2) {
            return 'Last name must be at least 2 characters long';
        }

        return null; // No errors
    }    // Function to show messages
    function showMessage(message, type) {
        messageDiv.textContent = message;
        messageDiv.className = `message ${type}`;
        messageDiv.style.display = 'block';
        
        // Hide message after 5 seconds for success messages
        if (type === 'success') {
            setTimeout(() => {
                hideMessage();
            }, 5000);
        }
    }

    // Function to hide messages
    function hideMessage() {
        messageDiv.style.display = 'none';
        messageDiv.textContent = '';
        messageDiv.className = 'message';
    }

    // Toggle menu on hamburger click
    hamburger.addEventListener('click', function() {
        this.classList.toggle('active');
        navOverlay.classList.toggle('active');
        document.body.style.overflow = navOverlay.classList.contains('active') ? 'hidden' : '';
        navbar.style.opacity = navOverlay.classList.contains('active') ? '0' : '1';
        navbar.style.visibility = navOverlay.classList.contains('active') ? 'hidden' : 'visible';
    });    // Close menu on close button click
    closeMenu.addEventListener('click', function() {
        hamburger.classList.remove('active');
        navOverlay.classList.remove('active');
        document.body.style.overflow = '';
        navbar.style.opacity = '1';
        navbar.style.visibility = 'visible';
    });    // Close menu when clicking a link
    navLinks.forEach(link => {
        link.addEventListener('click', function() {
            hamburger.classList.remove('active');
            navOverlay.classList.remove('active');
            document.body.style.overflow = '';
            navbar.style.opacity = '1';
            navbar.style.visibility = 'visible';
        });
    });
});