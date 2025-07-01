import fs from 'fs';
import path from 'path';

/**
 * Ensures that the uploads directory exists
 * Creates the directory if it doesn't exist
 */
export function ensureUploadsDir() {
    const uploadsDir = path.join(process.cwd(), 'uploads');
    
    if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
        console.log('📁 Created uploads directory');
    }
}

/**
 * Ensures that a specific directory exists
 * @param {string} dirPath - The directory path to create
 */
export function ensureDirectory(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        console.log(`📁 Created directory: ${dirPath}`);
    }
}

/**
 * Gets the file extension from a filename
 * @param {string} filename - The filename
 * @returns {string} The file extension
 */
export function getFileExtension(filename) {
    return path.extname(filename).toLowerCase();
}

/**
 * Validates if a file type is allowed for images
 * @param {string} mimetype - The file mimetype
 * @returns {boolean} True if valid image type
 */
export function isValidImageType(mimetype) {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    return allowedTypes.includes(mimetype);
}

/**
 * Generates a unique filename
 * @param {string} originalName - The original filename
 * @returns {string} A unique filename
 */
export function generateUniqueFilename(originalName) {
    const ext = path.extname(originalName);
    const name = path.basename(originalName, ext);
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000000000);
    return `${name}-${timestamp}-${random}${ext}`;
}
