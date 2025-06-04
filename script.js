/*
=========================================
    HARVESTLINK JAVASCRIPT
    Version: 1.0
    Last Updated: June 4, 2025
=========================================

TABLE OF CONTENTS:
    1. Navigation Menu
    2. Hero Section Animations
    3. Testimonial Slider
    4. Back to Top Button
=========================================
*/

/*
-----------------------------------------
    1. NAVIGATION MENU
-----------------------------------------
*/
document.addEventListener('DOMContentLoaded', () => {
    const hamburger = document.querySelector('.hamburger');
    const hamburgerMenu = document.querySelector('.hamburger-menu');
    const navOverlay = document.querySelector('.nav-overlay');
    
    hamburgerMenu.addEventListener('click', () => {
        hamburger.classList.toggle('active');
        navOverlay.classList.toggle('active');
    });

    // Close menu when clicking a link
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', () => {
            navOverlay.classList.remove('active');
            hamburgerLines.forEach(line => {
                line.classList.remove('rotate-45', 'opacity-0', 'rotate--45');
            });
        });
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!hamburger.contains(e.target) && !navLinks.contains(e.target)) {
            hamburger.classList.remove('active');
            navLinks.classList.remove('active');
        }
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

// Testimonials Slideshow
document.addEventListener('DOMContentLoaded', function() {
    let slideIndex = 1;
    const slides = document.querySelectorAll('.testimonial-slide');
    const dotsContainer = document.querySelector('.testimonial-dots');
    
    // Create dots
    slides.forEach((_, index) => {
        const dot = document.createElement('span');
        dot.classList.add('dot');
        dot.addEventListener('click', () => currentSlide(index + 1));
        dotsContainer.appendChild(dot);
    });
    
    // Add event listeners to prev/next buttons
    document.querySelector('.prev-btn').addEventListener('click', () => plusSlides(-1));
    document.querySelector('.next-btn').addEventListener('click', () => plusSlides(1));
    
    showSlides(slideIndex);
    
    function plusSlides(n) {
        showSlides(slideIndex += n);
    }
    
    function currentSlide(n) {
        showSlides(slideIndex = n);
    }
    
    function showSlides(n) {
        const dots = document.querySelectorAll('.dot');
        
        if (n > slides.length) {slideIndex = 1}
        if (n < 1) {slideIndex = slides.length}
        
        slides.forEach(slide => slide.style.display = "none");
        dots.forEach(dot => dot.classList.remove('active'));
        
        slides[slideIndex-1].style.display = "block";
        dots[slideIndex-1].classList.add('active');
    }
});

/*
-----------------------------------------
    3. TESTIMONIAL SLIDER
-----------------------------------------
*/
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