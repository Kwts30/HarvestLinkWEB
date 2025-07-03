import bcrypt from 'bcrypt';
import User from '../models/User.js';

/**
 * Middleware to verify old password when changing user passwords
 * This middleware should be used before any password change operations
 */
const verifyOldPassword = async (req, res, next) => {
    try {
        // Only check password if password change is being attempted
        if (!req.body.currentPassword && !req.body.newPassword && !req.body.confirmNewPassword) {
            // No password change attempted, skip verification
            return next();
        }

        // If any password field is provided, all must be provided
        if (!req.body.currentPassword || !req.body.newPassword || !req.body.confirmNewPassword) {
            console.log('❌ Missing password fields:', {
                currentPassword: !!req.body.currentPassword,
                newPassword: !!req.body.newPassword,
                confirmNewPassword: !!req.body.confirmNewPassword
            });
            return res.status(400).json({
                success: false,
                message: 'All password fields are required for password change',
                errors: {
                    currentPassword: !req.body.currentPassword ? 'Current password is required' : '',
                    newPassword: !req.body.newPassword ? 'New password is required' : '',
                    confirmNewPassword: !req.body.confirmNewPassword ? 'Password confirmation is required' : ''
                }
            });
        }

        console.log('✅ All password fields provided');

        // Get the user ID from params or body
        const userId = req.params.id || req.body.userId;
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required',
                errors: {
                    general: 'User ID is missing'
                }
            });
        }

        // Fetch the user from database
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
                errors: {
                    general: 'User does not exist'
                }
            });
        }

        // Verify the current password
        const isCurrentPasswordValid = await bcrypt.compare(req.body.currentPassword, user.password);
        if (!isCurrentPasswordValid) {
            return res.status(400).json({
                success: false,
                message: 'Current password is incorrect',
                errors: {
                    currentPassword: 'The current password you entered is incorrect'
                }
            });
        }

        // Validate new password
        if (req.body.newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'New password must be at least 6 characters long',
                errors: {
                    newPassword: 'Password must contain at least 6 characters'
                }
            });
        }

        // Check if new password matches confirmation
        if (req.body.newPassword !== req.body.confirmNewPassword) {
            return res.status(400).json({
                success: false,
                message: 'New passwords do not match',
                errors: {
                    confirmNewPassword: 'Password confirmation does not match'
                }
            });
        }

        // Ensure new password is different from current password
        const isSamePassword = await bcrypt.compare(req.body.newPassword, user.password);
        if (isSamePassword) {
            return res.status(400).json({
                success: false,
                message: 'New password must be different from current password',
                errors: {
                    newPassword: 'Please choose a different password from your current one'
                }
            });
        }

        // Store the verified user in request for use in next middleware/route
        req.verifiedUser = user;

        // All validations passed, proceed to next middleware
        next();

    } catch (error) {
        console.error('Password verification middleware error:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error during password verification',
            errors: {
                general: 'An internal error occurred. Please try again.'
            }
        });
    }
};

/**
 * Middleware to hash the new password after verification
 * This should be used after verifyOldPassword middleware
 */
const hashNewPassword = async (req, res, next) => {
    try {
        // Only hash if password change is being attempted and verification passed
        if (req.body.newPassword && req.verifiedUser) {
            const saltRounds = 10;
            const hashedPassword = await bcrypt.hash(req.body.newPassword, saltRounds);
            
            // Replace the plain text password with hashed version
            req.body.password = hashedPassword;
            
            // Clean up password fields from body to avoid confusion
            delete req.body.currentPassword;
            delete req.body.newPassword;
            delete req.body.confirmNewPassword;
        }

        next();

    } catch (error) {
        console.error('Password hashing middleware error:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error during password processing',
            errors: {
                general: 'An internal error occurred. Please try again.'
            }
        });
    }
};

/**
 * Combined middleware function that verifies old password and hashes new password
 * Use this for complete password change validation and processing
 * Works for both admin (editing any user) and user (editing their own profile) scenarios
 */
const processPasswordChange = async (req, res, next) => {
    try {
        // Only check password if password change is being attempted
        if (!req.body.currentPassword && !req.body.newPassword && !req.body.confirmNewPassword) {
            return next();
        }

        // If any password field is provided, all must be provided
        if (!req.body.currentPassword || !req.body.newPassword || !req.body.confirmNewPassword) {
            return res.status(400).json({
                success: false,
                message: 'All password fields are required for password change',
                errors: {
                    currentPassword: !req.body.currentPassword ? 'Current password is required' : '',
                    newPassword: !req.body.newPassword ? 'New password is required' : '',
                    confirmNewPassword: !req.body.confirmNewPassword ? 'Password confirmation is required' : ''
                }
            });
        }

        // Get the user ID from params, body, or authenticated session
        // For admin routes: req.params.id or req.body.userId
        // For user profile routes: req.user._id or req.user.id
        const userId = req.params.id || req.body.userId || (req.user && (req.user._id || req.user.id));
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required',
                errors: {
                    general: 'User ID is missing or user not authenticated'
                }
            });
        }

        // Fetch the user from database
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
                errors: {
                    general: 'User does not exist'
                }
            });
        }

        // Verify the current password
        const isCurrentPasswordValid = await bcrypt.compare(req.body.currentPassword, user.password);
        
        if (!isCurrentPasswordValid) {
            return res.status(400).json({
                success: false,
                message: 'Current password is incorrect',
                errors: {
                    currentPassword: 'The current password you entered is incorrect'
                }
            });
        }

        // Validate new password
        if (req.body.newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'New password must be at least 6 characters long',
                errors: {
                    newPassword: 'Password must contain at least 6 characters'
                }
            });
        }

        // Check if new password matches confirmation
        if (req.body.newPassword !== req.body.confirmNewPassword) {
            return res.status(400).json({
                success: false,
                message: 'New passwords do not match',
                errors: {
                    confirmNewPassword: 'Password confirmation does not match'
                }
            });
        }

        // Ensure new password is different from current password
        const isSamePassword = await bcrypt.compare(req.body.newPassword, user.password);
        if (isSamePassword) {
            return res.status(400).json({
                success: false,
                message: 'New password must be different from current password',
                errors: {
                    newPassword: 'Please choose a different password from your current one'
                }
            });
        }

        // Hash the new password
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(req.body.newPassword, saltRounds);
        
        // Replace the plain text password with hashed version
        req.body.password = hashedPassword;
        
        // Clean up password fields from body to avoid confusion
        delete req.body.currentPassword;
        delete req.body.newPassword;
        delete req.body.confirmNewPassword;

        // Store the verified user in request for use in next middleware/route
        req.verifiedUser = user;

        // All validations passed, proceed to next middleware
        next();

    } catch (error) {
        console.error('Password change middleware error:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error during password verification',
            errors: {
                general: 'An internal error occurred. Please try again.'
            }
        });
    }
};

export {
    verifyOldPassword,
    hashNewPassword,
    processPasswordChange
};
