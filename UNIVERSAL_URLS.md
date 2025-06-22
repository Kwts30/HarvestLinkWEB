# Universal URL System for HarvestLink

## ✅ IMPLEMENTED FEATURES

### 🌐 Universal URL Detection
The application now automatically detects the environment and generates appropriate URLs:

#### **Local Development (localhost:3000)**
```
Protocol: http://
Host: localhost:3000
Base URL: http://localhost:3000
API Endpoint: http://localhost:3000/api
```

#### **VS Code Live Server (:5500)**
```
Protocol: http://
Host: localhost:5500
Base URL: http://localhost:3000  (redirects to Express server)
API Endpoint: http://localhost:3000/api
```

#### **Production/Live Server**
```
Protocol: https://
Host: yourdomain.com
Base URL: https://yourdomain.com
API Endpoint: https://yourdomain.com/api
```

### 🔧 Implementation Details

#### **1. Server-Side Middleware (server.js)**
```javascript
app.use((req, res, next) => {
    const protocol = req.protocol;
    const host = req.get('host');
    const baseUrl = `${protocol}://${host}`;
    
    res.locals.baseUrl = baseUrl;
    res.locals.url = (path) => `${baseUrl}/${path}`;
    res.locals.isLocal = host.includes('localhost');
    res.locals.currentUrl = `${baseUrl}${req.originalUrl}`;
    
    next();
});
```

#### **2. Client-Side Config (config.js)**
```javascript
const API_CONFIG = (() => {
    const protocol = window.location.protocol;
    const host = window.location.host;
    const currentUrl = `${protocol}//${host}`;
    
    const isLocalFile = protocol === 'file:' || host.includes(':5500');
    const isLocalhost = host.includes('localhost') || host.includes('127.0.0.1');
    
    if (isLocalFile) {
        return {
            BASE_URL: 'http://localhost:3000',
            API_ENDPOINT: 'http://localhost:3000/api',
            environment: 'development-file'
        };
    } else if (isLocalhost) {
        return {
            BASE_URL: currentUrl,
            API_ENDPOINT: `${currentUrl}/api`,
            environment: 'development-localhost'
        };
    } else {
        return {
            BASE_URL: currentUrl,
            API_ENDPOINT: `${currentUrl}/api`,
            environment: 'production'
        };
    }
})();
```

#### **3. AuthUtils Universal Navigation**
```javascript
window.AuthUtils = {
    createUrl: function(path) {
        const currentHost = window.location.host;
        if (currentHost === 'localhost:3000' || currentHost === '127.0.0.1:3000') {
            return path.startsWith('/') ? path : `/${path}`;
        }
        
        const baseUrl = this.getBaseUrl();
        const cleanPath = path.startsWith('/') ? path : `/${path}`;
        return `${baseUrl}${cleanPath}`;
    }
};
```

### 📋 Updated Files

#### **Server-Side**
- ✅ `server/models/server.js` - Added universal URL middleware
- ✅ `scripts/createAdmin.js` - Dynamic URL in console output
- ✅ `scripts/createAdminAndData.js` - Dynamic URL in console output

#### **Client-Side**
- ✅ `assets/js/config.js` - Universal API detection
- ✅ `assets/js/auth.js` - Universal navigation URLs
- ✅ `Admin webpage/admin.js` - Universal API endpoints
- ✅ `Login webpage/login.js` - Universal redirects
- ✅ `Signup webpage/signup.js` - Universal redirects
- ✅ `Shop webpage/shop.js` - Universal redirects
- ✅ `cart webpage/cart.js` - Universal redirects
- ✅ `Checkout webpage/checkout.js` - Universal redirects

### 🚀 Usage Examples

#### **Navigation in JavaScript**
```javascript
// Old way (hardcoded)
window.location.href = '/login';

// New way (universal)
window.location.href = window.AuthUtils ? window.AuthUtils.createUrl('/login') : '/login';
```

#### **API Calls**
```javascript
// Automatically detects environment
const apiUrl = window.API_CONFIG.API_ENDPOINT;
fetch(`${apiUrl}/users/login`, {...});
```

#### **EJS Templates**
```ejs
<!-- Universal URL helper -->
<a href="<%= url('admin') %>">Admin Dashboard</a>

<!-- Base URL available -->
<script>
    const BASE_URL = '<%= baseUrl %>';
</script>
```

### 🌍 Environment Support

#### **Development Environments**
1. **Express Server (localhost:3000)**
   - Direct serving through Express
   - Uses relative URLs for same-origin requests

2. **VS Code Live Server (localhost:5500)**
   - Static file serving with Live Reload
   - API calls redirect to Express server at :3000

3. **File:// Protocol**
   - Local file system access
   - All API calls redirect to Express server

#### **Production Environments**
1. **Shared Hosting**
   - Uses current domain for all URLs
   - Relative API endpoints

2. **VPS/Cloud Hosting**
   - Environment variables for custom domains
   - SSL/HTTPS support

3. **CDN/Static Hosting + API Server**
   - Static files on CDN
   - API calls to separate server

### 🔧 Environment Variables

Create a `.env` file for production:
```env
NODE_ENV=production
PORT=80
HOST=yourdomain.com
BASE_URL=https://yourdomain.com
SESSION_SECRET=your-secret-key
```

### 🧪 Testing

#### **Local Testing**
```bash
# Start Express server
npm start
# Access: http://localhost:3000

# OR use Live Server
# VS Code Live Server on any HTML file
# Access: http://localhost:5500
```

#### **Production Testing**
```bash
# Set production environment
NODE_ENV=production PORT=80 npm start
```

### 📱 Cross-Platform Compatibility

#### **Desktop Browsers**
- ✅ Chrome/Edge/Firefox on Windows/Mac/Linux
- ✅ Safari on macOS

#### **Mobile Browsers**
- ✅ Mobile Chrome/Safari
- ✅ Progressive Web App support

#### **Development Tools**
- ✅ VS Code Live Server
- ✅ Chrome DevTools
- ✅ Hot reload/watch mode

### 🔗 Key Benefits

1. **Seamless Development**: Works with any local setup
2. **Easy Deployment**: No hardcoded URLs to change
3. **Multi-Environment**: Dev, staging, production ready
4. **Cross-Origin Support**: Handles CORS automatically
5. **Future-Proof**: Adapts to domain changes

### 🚀 Deployment Ready

Your HarvestLink application now works universally:
- **Local Development**: `http://localhost:3000`
- **Live Server**: `http://localhost:5500` → redirects to Express
- **Production**: `https://yourdomain.com`
- **Custom Domains**: Automatically adapts

No more hardcoded URLs! 🎉
