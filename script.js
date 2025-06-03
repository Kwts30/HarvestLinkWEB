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