import * as Yup from 'yup';

// Enhanced validation schemas with comprehensive security checks

// Common validation patterns
const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
const phoneRegex = /^[+]?[0-9\s\-\(\)]{10,15}$/;
const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
const nameRegex = /^[a-zA-Z\s\u00C0-\u017F\u0100-\u017F\u0180-\u024F\u1E00-\u1EFF]{2,50}$/;
const alphanumericRegex = /^[a-zA-Z0-9\s\-_]{1,100}$/;

// Enhanced login validation schema with security checks
export const loginSchema = Yup.object().shape({
  email: Yup.string()
    .email('Please enter a valid email address')
    .matches(emailRegex, 'Invalid email format')
    .max(254, 'Email is too long')
    .when('$loginMethod', {
      is: 'email',
      then: (schema) => schema
        .required('Email is required')
        .test('no-sql-injection', 'Invalid email format', function(value) {
          if (!value) return true;
          const sqlPatterns = /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|OR|AND)\b)|(\b(script|javascript|vbscript|onload|onerror)\b)/i;
          return !sqlPatterns.test(value);
        }),
      otherwise: (schema) => schema.notRequired(),
    }),
  phone_number: Yup.string()
    .matches(phoneRegex, 'Please enter a valid phone number')
    .min(10, 'Phone number must be at least 10 digits')
    .max(15, 'Phone number must be less than 15 digits')
    .when('$loginMethod', {
      is: 'phone',
      then: (schema) => schema
        .required('Phone number is required')
        .test('no-international-calls', 'International calls not supported', function(value) {
          if (!value) return true;
          return !value.startsWith('+') || value.startsWith('+234');
        }),
      otherwise: (schema) => schema.notRequired(),
    }),
  password: Yup.string()
    .required('Password is required'),
});

// Enhanced sign up validation schema
export const signUpSchema = Yup.object().shape({
  firstName: Yup.string()
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name must be less than 50 characters')
    .matches(nameRegex, 'First name can only contain letters and spaces')
    .required('First name is required')
    .test('no-special-chars', 'First name contains invalid characters', function(value) {
      if (!value) return true;
      const specialChars = /[<>\"'%;()&+]/;
      return !specialChars.test(value);
    }),
  lastName: Yup.string()
    .min(2, 'Last name must be at least 2 characters')
    .max(50, 'Last name must be less than 50 characters')
    .matches(nameRegex, 'Last name can only contain letters and spaces')
    .required('Last name is required')
    .test('no-special-chars', 'Last name contains invalid characters', function(value) {
      if (!value) return true;
      const specialChars = /[<>\"'%;()&+]/;
      return !specialChars.test(value);
    }),
  email: Yup.string()
    .email('Please enter a valid email address')
    .matches(emailRegex, 'Invalid email format')
    .max(254, 'Email is too long')
    .required('Email is required')
    .test('no-disposable-email', 'Disposable email addresses are not allowed', function(value) {
      if (!value) return true;
      const disposableDomains = ['10minutemail.com', 'tempmail.org', 'guerrillamail.com'];
      const domain = value.split('@')[1]?.toLowerCase();
      return !disposableDomains.includes(domain);
    }),
  phone: Yup.string()
    .matches(phoneRegex, 'Please enter a valid phone number')
    .min(10, 'Phone number must be at least 10 digits')
    .max(15, 'Phone number must be less than 15 digits')
    .required('Phone number is required')
    .test('no-international-calls', 'International calls not supported', function(value) {
      if (!value) return true;
      return !value.startsWith('+') || value.startsWith('+234');
    }),
  password: Yup.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password is too long')
    .matches(strongPasswordRegex, 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')
    .required('Password is required')
    .test('no-common-passwords', 'Password is too common', function(value) {
      if (!value) return true;
      const commonPasswords = ['password', '123456', 'qwerty', 'abc123', 'password123', 'admin', 'user'];
      return !commonPasswords.includes(value.toLowerCase());
    }),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('password')], 'Passwords must match')
    .required('Please confirm your password'),
});

// Enhanced step 1 validation schema
export const step1Schema = Yup.object().shape({
  firstName: Yup.string()
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name must be less than 50 characters')
    .matches(nameRegex, 'First name can only contain letters and spaces')
    .required('First name is required')
    .test('no-xss', 'Invalid characters detected', function(value) {
      if (!value) return true;
      const xssPatterns = /<script|javascript:|vbscript:|onload=|onerror=/i;
      return !xssPatterns.test(value);
    }),
  lastName: Yup.string()
    .min(2, 'Last name must be at least 2 characters')
    .max(50, 'Last name must be less than 50 characters')
    .matches(nameRegex, 'Last name can only contain letters and spaces')
    .required('Last name is required')
    .test('no-xss', 'Invalid characters detected', function(value) {
      if (!value) return true;
      const xssPatterns = /<script|javascript:|vbscript:|onload=|onerror=/i;
      return !xssPatterns.test(value);
    }),
  email: Yup.string()
    .email('Please enter a valid email address')
    .matches(emailRegex, 'Invalid email format')
    .max(254, 'Email is too long')
    .required('Email is required')
    .test('no-sql-injection', 'Invalid email format', function(value) {
      if (!value) return true;
      const sqlPatterns = /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|OR|AND)\b)|(\b(script|javascript|vbscript|onload|onerror)\b)/i;
      return !sqlPatterns.test(value);
    }),
  phone: Yup.string()
    .matches(phoneRegex, 'Please enter a valid phone number')
    .min(10, 'Phone number must be at least 10 digits')
    .max(15, 'Phone number must be less than 15 digits')
    .required('Phone number is required')
    .test('no-international-calls', 'International calls not supported', function(value) {
      if (!value) return true;
      return !value.startsWith('+') || value.startsWith('+234');
    }),
});

// Enhanced forgot password validation schema
export const forgotPasswordSchema = Yup.object().shape({
  email: Yup.string()
    .email('Please enter a valid email address')
    .matches(emailRegex, 'Invalid email format')
    .max(254, 'Email is too long')
    .required('Email is required')
    .test('no-sql-injection', 'Invalid email format', function(value) {
      if (!value) return true;
      const sqlPatterns = /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|OR|AND)\b)|(\b(script|javascript|vbscript|onload|onerror)\b)/i;
      return !sqlPatterns.test(value);
    }),
});

// Enhanced reset password validation schema
export const resetPasswordSchema = Yup.object().shape({
  password: Yup.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password is too long')
    .matches(strongPasswordRegex, 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')
    .required('Password is required')
    .test('no-common-passwords', 'Password is too common', function(value) {
      if (!value) return true;
      const commonPasswords = ['password', '123456', 'qwerty', 'abc123', 'password123', 'admin', 'user'];
      return !commonPasswords.includes(value.toLowerCase());
    }),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('password')], 'Passwords must match')
    .required('Please confirm your password'),
});

// Enhanced profile update validation schema
export const profileUpdateSchema = Yup.object().shape({
  firstName: Yup.string()
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name must be less than 50 characters')
    .matches(nameRegex, 'First name can only contain letters and spaces')
    .required('First name is required')
    .test('no-xss', 'Invalid characters detected', function(value) {
      if (!value) return true;
      const xssPatterns = /<script|javascript:|vbscript:|onload=|onerror=/i;
      return !xssPatterns.test(value);
    }),
  lastName: Yup.string()
    .min(2, 'Last name must be at least 2 characters')
    .max(50, 'Last name must be less than 50 characters')
    .matches(nameRegex, 'Last name can only contain letters and spaces')
    .required('Last name is required')
    .test('no-xss', 'Invalid characters detected', function(value) {
      if (!value) return true;
      const xssPatterns = /<script|javascript:|vbscript:|onload=|onerror=/i;
      return !xssPatterns.test(value);
    }),
  email: Yup.string()
    .email('Please enter a valid email address')
    .matches(emailRegex, 'Invalid email format')
    .max(254, 'Email is too long')
    .required('Email is required')
    .test('no-sql-injection', 'Invalid email format', function(value) {
      if (!value) return true;
      const sqlPatterns = /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|OR|AND)\b)|(\b(script|javascript|vbscript|onload|onerror)\b)/i;
      return !sqlPatterns.test(value);
    }),
  phone: Yup.string()
    .matches(phoneRegex, 'Please enter a valid phone number')
    .min(10, 'Phone number must be at least 10 digits')
    .max(15, 'Phone number must be less than 15 digits')
    .required('Phone number is required')
    .test('no-international-calls', 'International calls not supported', function(value) {
      if (!value) return true;
      return !value.startsWith('+') || value.startsWith('+234');
    }),
});

// Enhanced address validation schema
export const addressSchema = Yup.object().shape({
  street: Yup.string()
    .min(5, 'Street address must be at least 5 characters')
    .max(100, 'Street address must be less than 100 characters')
    .matches(alphanumericRegex, 'Street address contains invalid characters')
    .required('Street address is required')
    .test('no-xss', 'Invalid characters detected', function(value) {
      if (!value) return true;
      const xssPatterns = /<script|javascript:|vbscript:|onload=|onerror=/i;
      return !xssPatterns.test(value);
    }),
  city: Yup.string()
    .min(2, 'City must be at least 2 characters')
    .max(50, 'City must be less than 50 characters')
    .matches(nameRegex, 'City can only contain letters and spaces')
    .required('City is required'),
  state: Yup.string()
    .min(2, 'State must be at least 2 characters')
    .max(50, 'State must be less than 50 characters')
    .matches(nameRegex, 'State can only contain letters and spaces')
    .required('State is required'),
  zipCode: Yup.string()
    .matches(/^[0-9]{5}(-[0-9]{4})?$/, 'Please enter a valid ZIP code')
    .required('ZIP code is required'),
});

// Enhanced contact form validation schema
export const contactSchema = Yup.object().shape({
  name: Yup.string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be less than 50 characters')
    .matches(nameRegex, 'Name can only contain letters and spaces')
    .required('Name is required')
    .test('no-xss', 'Invalid characters detected', function(value) {
      if (!value) return true;
      const xssPatterns = /<script|javascript:|vbscript:|onload=|onerror=/i;
      return !xssPatterns.test(value);
    }),
  email: Yup.string()
    .email('Please enter a valid email address')
    .matches(emailRegex, 'Invalid email format')
    .max(254, 'Email is too long')
    .required('Email is required')
    .test('no-sql-injection', 'Invalid email format', function(value) {
      if (!value) return true;
      const sqlPatterns = /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|OR|AND)\b)|(\b(script|javascript|vbscript|onload|onerror)\b)/i;
      return !sqlPatterns.test(value);
    }),
  subject: Yup.string()
    .min(5, 'Subject must be at least 5 characters')
    .max(100, 'Subject must be less than 100 characters')
    .matches(alphanumericRegex, 'Subject contains invalid characters')
    .required('Subject is required')
    .test('no-xss', 'Invalid characters detected', function(value) {
      if (!value) return true;
      const xssPatterns = /<script|javascript:|vbscript:|onload=|onerror=/i;
      return !xssPatterns.test(value);
    }),
  message: Yup.string()
    .min(10, 'Message must be at least 10 characters')
    .max(1000, 'Message must be less than 1000 characters')
    .required('Message is required')
    .test('no-xss', 'Invalid characters detected', function(value) {
      if (!value) return true;
      const xssPatterns = /<script|javascript:|vbscript:|onload=|onerror=/i;
      return !xssPatterns.test(value);
    })
    .test('no-spam', 'Message appears to be spam', function(value) {
      if (!value) return true;
      const spamPatterns = /(click here|buy now|free money|make money|work from home|viagra|casino|lottery)/i;
      return !spamPatterns.test(value);
    }),
});

// File upload validation schema
export const fileUploadSchema = Yup.object().shape({
  file: Yup.mixed()
    .required('File is required')
    .test('file-size', 'File size must be less than 10MB', function(value) {
      if (!value) return true;
      return value.size <= 10 * 1024 * 1024; // 10MB
    })
    .test('file-type', 'Invalid file type', function(value) {
      if (!value) return true;
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      return allowedTypes.includes(value.type);
    })
    .test('file-name', 'Invalid file name', function(value) {
      if (!value) return true;
      const fileName = value.name || '';
      const invalidChars = /[<>:"/\\|?*]/;
      return !invalidChars.test(fileName);
    }),
});

// Payment validation schema
export const paymentSchema = Yup.object().shape({
  amount: Yup.number()
    .min(0.01, 'Amount must be greater than 0')
    .max(1000000, 'Amount is too large')
    .required('Amount is required'),
  cardNumber: Yup.string()
    .matches(/^[0-9]{13,19}$/, 'Invalid card number')
    .required('Card number is required'),
  expiryDate: Yup.string()
    .matches(/^(0[1-9]|1[0-2])\/([0-9]{2})$/, 'Invalid expiry date')
    .required('Expiry date is required'),
  cvv: Yup.string()
    .matches(/^[0-9]{3,4}$/, 'Invalid CVV')
    .required('CVV is required'),
  cardholderName: Yup.string()
    .min(2, 'Cardholder name must be at least 2 characters')
    .max(50, 'Cardholder name must be less than 50 characters')
    .matches(nameRegex, 'Cardholder name can only contain letters and spaces')
    .required('Cardholder name is required'),
});

// Utility function to sanitize input
export const sanitizeInput = (input: string): string => {
  if (!input) return '';
  
  return input
    .trim()
    .replace(/[<>\"'%;()&+]/g, '') // Remove potentially dangerous characters
    .replace(/\s+/g, ' ') // Normalize whitespace
    .substring(0, 1000); // Limit length
};

// Utility function to validate file upload
export const validateFileUpload = (file: any): { valid: boolean; error?: string } => {
  if (!file) {
    return { valid: false, error: 'No file provided' };
  }

  // Check file size (10MB limit)
  if (file.size > 10 * 1024 * 1024) {
    return { valid: false, error: 'File size must be less than 10MB' };
  }

  // Check file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Invalid file type' };
  }

  // Check file name
  const fileName = file.name || '';
  const invalidChars = /[<>:"/\\|?*]/;
  if (invalidChars.test(fileName)) {
    return { valid: false, error: 'Invalid file name' };
  }

  return { valid: true };
};