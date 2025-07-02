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

/**
 * Safely deletes a file from the uploads directory
 * @param {string} imagePath - The image path (e.g., '/uploads/filename.jpg')
 * @param {boolean} sync - Whether to delete synchronously (default: true)
 * @returns {boolean} True if file was successfully deleted or didn't exist
 */
export function deleteUploadedFile(imagePath, sync = true) {
    console.log('FileUtils: Attempting to delete file:', imagePath);
    
    if (!imagePath || !imagePath.startsWith('/uploads/')) {
        console.log('FileUtils: Invalid image path, not deleting:', imagePath);
        return false;
    }
    
    const fullPath = path.join(process.cwd(), 'uploads', path.basename(imagePath));
    console.log('FileUtils: Full path to delete:', fullPath);
    
    if (!fs.existsSync(fullPath)) {
        console.log('FileUtils: File does not exist:', fullPath);
        return true; // Consider non-existent files as successfully "deleted"
    }
    
    try {
        if (sync) {
            fs.unlinkSync(fullPath);
            console.log('FileUtils: Successfully deleted file (sync):', fullPath);
        } else {
            fs.unlink(fullPath, (err) => {
                if (err) {
                    console.error('FileUtils: Error deleting file (async):', err);
                } else {
                    console.log('FileUtils: Successfully deleted file (async):', fullPath);
                }
            });
        }
        return true;
    } catch (err) {
        console.error('FileUtils: Error deleting file:', err);
        return false;
    }
}

/**
 * Cleans up orphaned files by checking if they exist in the database
 * @param {Array} validPaths - Array of valid file paths that should not be deleted
 */
export function cleanupOrphanedFiles(validPaths = []) {
    try {
        const uploadsDir = path.join(process.cwd(), 'uploads');
        if (!fs.existsSync(uploadsDir)) {
            return;
        }
        
        const files = fs.readdirSync(uploadsDir);
        const validBasenames = validPaths.map(p => path.basename(p));
        
        files.forEach(file => {
            if (!validBasenames.includes(file)) {
                const filePath = path.join(uploadsDir, file);
                const stats = fs.statSync(filePath);
                const fileAge = Date.now() - stats.mtime.getTime();
                const oneHour = 60 * 60 * 1000;
                
                // Only delete files older than 1 hour to avoid deleting recently uploaded files
                if (fileAge > oneHour) {
                    try {
                        fs.unlinkSync(filePath);
                        console.log('FileUtils: Cleaned up orphaned file:', file);
                    } catch (err) {
                        console.error('FileUtils: Error cleaning up file:', err);
                    }
                }
            }
        });
    } catch (err) {
        console.error('FileUtils: Error during cleanup:', err);
    }
}
