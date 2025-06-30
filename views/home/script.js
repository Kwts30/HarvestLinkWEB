document.addEventListener('DOMContentLoaded', () => {
    const hamburger = document.querySelector('.hamburger');
    const hamburgerMenu = document.querySelector('.hamburger-menu');
    const navOverlay = document.querySelector('.nav-overlay');
    const closeMenu = document.querySelector('.close-menu');
    const navLinks = document.querySelectorAll('.nav-links a');
      const navbar = document.querySelector('.navbar');

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
            const href = this.getAttribute('href');
            
            hamburger.classList.remove('active');
            navOverlay.classList.remove('active');
            document.body.style.overflow = '';
            navbar.style.opacity = '1';
            navbar.style.visibility = 'visible';
        });
    });

    // Animate hero content on page load
    const heroContent = document.querySelector('.hero-content');
    heroContent.style.opacity = '0';
    heroContent.style.transform = 'translate(-50%, -30%)';
    
    setTimeout(() => {
        heroContent.style.transition = 'all 1s ease';
        heroContent.style.opacity = '1';
        heroContent.style.transform = 'translate(-50%, -50%)';
    }, 500);

    // Animate farmers on scroll
    const farmers = document.querySelectorAll('.farmer');
    let animated = false;

    window.addEventListener('scroll', () => {
        if (window.scrollY > 100 && !animated) {
            farmers.forEach((farmer, index) => {
                setTimeout(() => {
                    farmer.style.transition = 'transform 0.5s ease';
                    farmer.style.transform = 'translateY(0)';
                }, index * 200);
            });
            animated = true;
        }
    });

    // Parallax effect for background
    const background = document.querySelector('.background-image');
    window.addEventListener('scroll', () => {
        const scrolled = window.pageYOffset;
        background.style.transform = `translateY(${scrolled * 0.5}px)`;
    });
});

// Testimonials Slideshow with Auto-Advance and Keyboard Navigation
document.addEventListener('DOMContentLoaded', () => {
    const slides = document.querySelectorAll('.testimonial-slide');
    const dots = document.querySelector('.testimonial-dots');
    const prevBtn = document.querySelector('.prev-btn');
    const nextBtn = document.querySelector('.next-btn');
    let currentSlide = 0;

    // Create dots
    slides.forEach((_, index) => {
        const dot = document.createElement('div');
        dot.classList.add('dot');
        if (index === 0) dot.classList.add('active');
        dot.addEventListener('click', () => goToSlide(index));
        dots.appendChild(dot);
    });

    // Show initial slide
    slides[0].classList.add('active');

    function updateDots() {
        document.querySelectorAll('.dot').forEach((dot, index) => {
            dot.classList.toggle('active', index === currentSlide);
        });
    }

    function goToSlide(index) {
        slides[currentSlide].classList.remove('active');
        currentSlide = (index + slides.length) % slides.length;
        slides[currentSlide].classList.add('active');
        updateDots();
    }

    function nextSlide() {
        goToSlide(currentSlide + 1);
    }

    function prevSlide() {
        goToSlide(currentSlide - 1);
    }

    // Event listeners
    prevBtn.addEventListener('click', prevSlide);
    nextBtn.addEventListener('click', nextSlide);

    // Auto-advance slides every 5 seconds
    setInterval(nextSlide, 5000);

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') prevSlide();
        if (e.key === 'ArrowRight') nextSlide();
    });
});

// Back to top button functionality
const backToTopButton = document.getElementById('back-to-top');

window.addEventListener('scroll', () => {
    if (window.scrollY > 300) {
        backToTopButton.classList.add('visible');
    } else {
        backToTopButton.classList.remove('visible');
    }
});

backToTopButton.addEventListener('click', () => {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
});

// Footer functionality
document.addEventListener('DOMContentLoaded', () => {
    // Initialize footer functionality
    initializeFooter();
    
    // Handle footer navigation clicks
    const footerLinks = document.querySelectorAll('footer a[href^="/"]');
    
    footerLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
        });
    });
    
    // Handle social media links
    const socialLinks = document.querySelectorAll('.social-link');
    
    socialLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            // Ensure external links open in new tab
            if (!this.hasAttribute('target')) {
                this.setAttribute('target', '_blank');
                this.setAttribute('rel', 'noopener noreferrer');
            }
        });
    });
    
    // Handle footer logout functionality (if present)
    const footerLogoutLink = document.querySelector('footer a[onclick*="logout"]');
    if (footerLogoutLink) {
        footerLogoutLink.addEventListener('click', function(e) {
            e.preventDefault();
            // Call the global logout function
            if (typeof window.logout === 'function') {
                window.logout();
            } else {
                console.error('Logout function not available');
            }
        });
    }
});

// Initialize footer functionality
function initializeFooter() {
    // Check if user is logged in and update footer accordingly
    if (typeof window.AuthUtils !== 'undefined' && window.AuthUtils.isLoggedIn()) {
        updateFooterForLoggedInUser();
    }
    
    // Add smooth scroll for internal links
    const internalLinks = document.querySelectorAll('footer a[href^="/"], footer a[href^="#"]');
    internalLinks.forEach(link => {
        if (link.getAttribute('href').startsWith('#')) {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth' });
                }
            });
        }
    });
}

// Update footer for logged in users
function updateFooterForLoggedInUser() {
    const footerLoginLink = document.querySelector('footer a[href="/login"]');
    if (footerLoginLink && typeof window.AuthUtils !== 'undefined') {
        const user = window.AuthUtils.getCurrentUser();
        if (user) {
            // Replace login link with logout
            footerLoginLink.setAttribute('href', '#');
            footerLoginLink.setAttribute('onclick', 'logout()');
            footerLoginLink.textContent = 'Logout';
            
            // Add profile link before logout
            const profileLi = document.createElement('li');
            profileLi.innerHTML = '<a href="/profile">Profile</a>';
            footerLoginLink.parentElement.parentElement.insertBefore(profileLi, footerLoginLink.parentElement);
            
            // Add admin link if user is admin
            if (user.role === 'admin') {
                const adminLi = document.createElement('li');
                adminLi.innerHTML = '<a href="/admin">Admin</a>';
                footerLoginLink.parentElement.parentElement.insertBefore(adminLi, footerLoginLink.parentElement);
            }
        }
    }
}

// Footer scroll effects
window.addEventListener('scroll', () => {
    const footer = document.querySelector('footer');
    if (footer) {
        const footerTop = footer.offsetTop;
        const scrollPosition = window.scrollY + window.innerHeight;
        
        // Add class when footer comes into view
        if (scrollPosition >= footerTop) {
            footer.classList.add('in-view');
        } else {
            footer.classList.remove('in-view');
        }
    }
});