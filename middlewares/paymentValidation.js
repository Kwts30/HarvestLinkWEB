function validatePaymentReference(paymentMethod, referenceNumber) {
    const result = {
        success: false,
        error: null,
        validatedReference: null
    };

    // Remove any spaces and convert to string
    const cleanReference = String(referenceNumber || '').trim().replace(/\s+/g, '');

    switch (paymentMethod) {
        case 'gcash':
        case 'maya':
            // Both GCash and Maya require 12-digit reference numbers
            if (!cleanReference) {
                result.error = `Please enter a ${paymentMethod === 'gcash' ? 'GCash' : 'Maya'} reference number`;
                return result;
            }

            // Check if it's exactly 12 digits
            if (!/^\d{12}$/.test(cleanReference)) {
                result.error = `${paymentMethod === 'gcash' ? 'GCash' : 'Maya'} reference number must be exactly 12 digits`;
                return result;
            }

            // Additional validation: check for repeated digits (simple fraud detection)
            if (isRepeatedDigits(cleanReference)) {
                result.error = 'Invalid reference number format. Please check your transaction details.';
                return result;
            }

            result.success = true;
            result.validatedReference = cleanReference;
            break;

        case 'cod':
            // COD doesn't require reference number
            result.success = true;
            result.validatedReference = null;
            break;

        default:
            result.error = 'Invalid payment method';
            return result;
    }

    return result;
}

function isRepeatedDigits(str) {
    if (str.length < 2) return false;
    
    // Check if all digits are the same
    const firstDigit = str[0];
    return str.split('').every(digit => digit === firstDigit);
}

function validatePaymentReferenceInput(input, paymentMethod, errorElement, submitButton) {
    if (!input) return;

    const value = input.value.trim();
    const validation = validatePaymentReference(paymentMethod, value);

    // Clear previous errors
    if (errorElement) {
        errorElement.style.display = 'none';
        errorElement.textContent = '';
    }

    // Enable/disable submit button
    if (submitButton) {
        submitButton.disabled = !validation.success;
    }

    // Show error if validation failed and input is not empty
    if (!validation.success && value.length > 0) {
        if (errorElement) {
            errorElement.style.display = 'block';
            errorElement.textContent = validation.error;
        }
        
        // Add error styling to input
        input.classList.add('error');
    } else {
        // Remove error styling
        input.classList.remove('error');
    }

    return validation;
}

function validatePaymentReferenceMiddleware(req, res, next) {
    const { paymentMethod, referenceNumber } = req.body;

    // Skip validation for COD
    if (paymentMethod === 'cod') {
        return next();
    }

    const validation = validatePaymentReference(paymentMethod, referenceNumber);

    if (!validation.success) {
        return res.status(400).json({
            success: false,
            error: validation.error
        });
    }

    // Store validated reference in request
    req.validatedReference = validation.validatedReference;
    next();
}

function formatReferenceNumber(referenceNumber) {
    if (!referenceNumber) return '';
    
    const clean = String(referenceNumber).replace(/\D/g, '');
    
    // Format as XXXX-XXXX-XXXX for better readability
    if (clean.length === 12) {
        return `${clean.slice(0, 4)}-${clean.slice(4, 8)}-${clean.slice(8, 12)}`;
    }
    
    return clean;
}

export {
    validatePaymentReference,
    validatePaymentReferenceInput,
    validatePaymentReferenceMiddleware,
    formatReferenceNumber,
    isRepeatedDigits
};
