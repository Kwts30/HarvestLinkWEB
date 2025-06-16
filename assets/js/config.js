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
const currentConfig = isLocalFile ? API_CONFIG.development : API_CONFIG.production;

// Export for use in other files
window.API_CONFIG = currentConfig;
