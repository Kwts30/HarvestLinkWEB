// Quick script to update EJS files to standalone HTML structure
const files = [
    'signup.ejs',
    'cart.ejs', 
    'checkout.ejs',
    'contacts.ejs',
    'admin.ejs'
];

const headerHTML = `    <header>
        <nav class="navbar">
            <div class="nav-left">
                <h1>HARVESTLINK</h1>
            </div>
            <div class="nav-center">
                <div class="logo-circle">
                    <img src="/assets/homepage/harvestlink logo.png" alt="HarvestLink Logo">
                </div>
            </div>
            <div class="hamburger-menu">
                <div class="hamburger">
                    <div class="line line1"></div>
                    <div class="line line2"></div>
                    <div class="line line3"></div>
                </div>
            </div>
        </nav>        
        <div class="nav-overlay">
            <button class="close-menu">×</button>
            <div class="nav-logo">
                <img src="/assets/homepage/harvestlink logo full.png" alt="HarvestLink Logo">
            </div>
            <ul class="nav-links">
                <li><a href="/">Home</a></li>
                <li><a href="/shop">Shop</a></li>
                <li><a href="/contacts">Contact</a></li>
                <% if (isAuthenticated) { %>
                    <% if (user && user.role === 'admin') { %>
                        <li><a href="/admin">Admin</a></li>
                    <% } %>
                    <li><a href="#" onclick="logout()">Logout</a></li>
                <% } else { %>
                    <li><a href="/login">Login</a></li>
                <% } %>
            </ul>
        </div>    
    </header>`;

const footerHTML = `    <footer>
        <div class="footer-content">
            <div class="footer-section">
                <h3>About HarvestLink</h3>
                <p>Connecting farmers directly with consumers for the freshest produce and supporting local agriculture.</p>
            </div>
            <div class="footer-section">
                <h3>Quick Links</h3>
                <ul>
                    <li><a href="/">Home</a></li>
                    <li><a href="/shop">Shop</a></li>
                    <li><a href="/contacts">Contact</a></li>
                    <li><a href="/login">Login</a></li>
                </ul>
            </div>
            <div class="footer-section">
                <h3>Follow Us</h3>
                <div class="social-links">
                    <a href="https://facebook.com/harvestlink" target="_blank" class="social-link">
                        <img src="/assets/homepage/facebook.png" alt="Facebook">
                        Facebook
                    </a>
                    <a href="https://instagram.com/harvestlink" target="_blank" class="social-link">
                        <img src="/assets/homepage/instagram.png" alt="Instagram">
                        Instagram
                    </a>
                </div>
            </div>
            <div class="footer-section">
                <h3>Contact Us</h3>
                <p>Email: info@harvestlink.com</p>
                <p>Phone: +63 912 345 6789</p>
                <p>Address: Davao City, Philippines</p>
            </div>
        </div>
        <div class="footer-bottom">
            <p>&copy; 2025 HarvestLink Incorporated. All rights reserved.</p>
        </div>
    </footer>`;

console.log('Header HTML:', headerHTML);
console.log('Footer HTML:', footerHTML);
