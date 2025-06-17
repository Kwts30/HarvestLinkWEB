// API Configuration
const API_CONFIG = {
    // Development - when using Live Server or file:// protocol
    development: {
        BASE_URL: 'http://localhost:3000',
        API_ENDPOINT: 'http://localhost:3000/api'
    },
    // Production - when serving through Express server
    production: {
        BASE_URL: '',  // Same origin
        API_ENDPOINT: '/api'
    }
};

// Auto-detect environment
const isLocalFile = window.location.protocol === 'file:' || window.location.port === '5500';
const isLocalhost3000 = window.location.host === 'localhost:3000' || window.location.host === '127.0.0.1:3000';

let currentConfig;
if (isLocalFile) {
    currentConfig = API_CONFIG.development;
} else if (isLocalhost3000) {
    // When serving from localhost:3000, use full URL
    currentConfig = API_CONFIG.development;
} else {
    currentConfig = API_CONFIG.production;
}

console.log('🔧 API Config:', { 
    protocol: window.location.protocol, 
    host: window.location.host, 
    port: window.location.port,
    isLocalFile,
    isLocalhost3000,
    selectedConfig: currentConfig
});

// Export for use in other files
window.API_CONFIG = currentConfig;
