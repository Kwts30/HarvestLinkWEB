import multer from "multer";
import path from "path";

// Configure multer storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "uploads/"); // folder to save uploaded files
    },
    filename: function (req, file, cb) {
        // Create unique suffix for the filename
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        
        // Get the file extension
        const ext = path.extname(file.originalname);
        
        // Set the filename to fieldname + unique suffix + extension
        cb(null, file.fieldname + "-" + uniqueSuffix + ext);
    }
});

// File filter for images only
const fileFilter = (req, file, cb) => {
    // Check if the file is an image
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed!'), false);
    }
};

// Create upload middleware with enhanced configuration
const upload = multer({ 
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
        files: 1 // Only allow 1 file per upload
    }
});

export default upload;
