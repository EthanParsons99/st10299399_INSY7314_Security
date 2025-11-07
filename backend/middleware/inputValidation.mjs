// CORE VALIDATION PATTERNS

export const validationRules = {
  // USER AUTHENTICATION
  username: /^[a-zA-Z0-9_]{3,20}$/,
  password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,100}$/,
  
  // FINANCIAL DATA
  accountNumber: /^[0-9]{8,17}$/,
  swiftCode: /^[A-Z0-9]{8}([A-Z0-9]{3})?$/,
  amount: /^\d{1,10}(\.\d{1,2})?$/, // Max 10 digits before decimal
  currency: /^[A-Z]{3}$/,
  
  // PAYMENT DETAILS
  provider: /^[a-zA-Z0-9\s\-]{3,50}$/,
  recipientAccount: /^[0-9]{6,34}$/,
  
  // GENERAL
  email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  alphanumeric: /^[a-zA-Z0-9]+$/,
  numericString: /^[0-9]+$/,
  
  // IDENTIFIERS (for MongoDB ObjectIds, UUIDs, etc.)
  mongoObjectId: /^[a-fA-F0-9]{24}$/,
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  
  // SPECIFIC FORMATS
  phoneNumber: /^\+?[1-9]\d{1,14}$/, // E.164 format
  postalCode: /^[A-Z0-9\s-]{3,10}$/i,
  
  // TEXT FIELDS (with limited special characters)
  safeName: /^[a-zA-Z\s'-]{2,50}$/,
  safeAddress: /^[a-zA-Z0-9\s,.-]{5,100}$/,
  
  // DATE/TIME (ISO 8601)
  isoDate: /^\d{4}-\d{2}-\d{2}$/,
  isoDateTime: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/,
};


// DANGEROUS PATTERN DETECTION (BLACKLIST)


const dangerousPatterns = {
  // NoSQL Injection patterns
  noSqlInjection: /(\$where|\$ne|\$gt|\$lt|\$regex|\$in|\$nin|\$exists|\$or|\$and)/i,
  
  // SQL Injection patterns
  sqlInjection: /(union\s+select|insert\s+into|drop\s+table|delete\s+from|update\s+set|exec\s*\(|execute\s*\()/i,
  
  // XSS patterns
  xssPatterns: /(<script|<iframe|<object|<embed|javascript:|onerror=|onload=|onclick=)/i,
  
  // Command Injection
  commandInjection: /(;|\||&|`|\$\(|>|<|\n|\r)/,
  
  // Path Traversal
  pathTraversal: /(\.\.\/|\.\.\\)/,
  
  // LDAP Injection
  ldapInjection: /(\*|\(|\)|\||&)/,
};


// VALIDATION FUNCTIONS


// Validates input against a whitelist regex pattern

export function validateInput(value, rule) {
  if (value === null || value === undefined) return false;
  if (typeof value !== 'string' && typeof value !== 'number') return false;
  
  const stringValue = String(value);
  return rule.test(stringValue);
}


// Checks if input contains dangerous patterns (blacklist check)

export function checkForDangerousPatterns(input) {
  if (typeof input !== 'string') {
    input = String(input);
  }

  for (const [threatType, pattern] of Object.entries(dangerousPatterns)) {
    if (pattern.test(input)) {
      return { safe: false, threat: threatType };
    }
  }

  return { safe: true, threat: null };
}


//Sanitizes input by removing/escaping dangerous characters
//This is a BACKUP measure - validation should reject invalid input first

export function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  
  return input
    .replace(/[<>\"'`]/g, '') // Remove HTML/JS dangerous chars
    .replace(/\$/g, '') // Remove $ (NoSQL operator prefix)
    .replace(/\\/g, '') // Remove backslashes
    .trim()
    .slice(0, 1000); // Limit length to prevent buffer overflow attacks
}


// Deep sanitizes objects (useful for request bodies)

export function sanitizeObject(obj) {
  if (typeof obj !== 'object' || obj === null) {
    return sanitizeInput(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    // Sanitize keys to prevent prototype pollution
    const safeKey = key.replace(/^(?:__)|(?:prototype)|(?:constructor)/gi, '');
    
    if (typeof value === 'object' && value !== null) {
      sanitized[safeKey] = sanitizeObject(value);
    } else {
      sanitized[safeKey] = sanitizeInput(value);
    }
  }
  
  return sanitized;
}


// Validates a complete payment object

export function validatePaymentData(paymentData) {
  const errors = [];

  // Required fields check
  const requiredFields = ['amount', 'currency', 'provider', 'recipientAccount', 'swiftCode'];
  for (const field of requiredFields) {
    if (!paymentData[field]) {
      errors.push(`${field} is required`);
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  // Whitelist validation
  if (!validateInput(paymentData.amount, validationRules.amount)) {
    errors.push('Invalid amount format');
  }

  if (!validateInput(paymentData.currency, validationRules.currency)) {
    errors.push('Invalid currency format');
  }

  if (!validateInput(paymentData.provider, validationRules.provider)) {
    errors.push('Invalid provider format');
  }

  if (!validateInput(paymentData.recipientAccount, validationRules.recipientAccount)) {
    errors.push('Invalid recipient account format');
  }

  if (!validateInput(paymentData.swiftCode, validationRules.swiftCode)) {
    errors.push('Invalid SWIFT code format');
  }

  // Dangerous pattern check
  for (const [key, value] of Object.entries(paymentData)) {
    const dangerCheck = checkForDangerousPatterns(String(value));
    if (!dangerCheck.safe) {
      errors.push(`Dangerous pattern detected in ${key}: ${dangerCheck.threat}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}


// Validates user credentials

export function validateUserCredentials(credentials) {
  const errors = [];

  if (!credentials.name) {
    errors.push('Username is required');
  } else if (!validateInput(credentials.name, validationRules.username)) {
    errors.push('Invalid username format');
  }

  if (!credentials.password) {
    errors.push('Password is required');
  } else if (!validateInput(credentials.password, validationRules.password)) {
    errors.push('Password does not meet security requirements');
  }

  // Dangerous pattern check
  const nameCheck = checkForDangerousPatterns(credentials.name || '');
  if (!nameCheck.safe) {
    errors.push(`Security threat detected: ${nameCheck.threat}`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}


// Express middleware for validating request body against a schema

export function validateRequestBody(schema) {
  return (req, res, next) => {
    const errors = [];

    for (const [field, rule] of Object.entries(schema)) {
      const value = req.body[field];
      
      if (rule.required && !value) {
        errors.push(`${field} is required`);
        continue;
      }

      if (value && !validateInput(value, rule.pattern)) {
        errors.push(`${field} has invalid format`);
      }

      // Check for dangerous patterns
      if (value) {
        const dangerCheck = checkForDangerousPatterns(String(value));
        if (!dangerCheck.safe) {
          errors.push(`${field} contains dangerous pattern: ${dangerCheck.threat}`);
        }
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors 
      });
    }

    // Sanitize the request body as an additional security layer
    req.body = sanitizeObject(req.body);
    next();
  };
}


// Validates MongoDB ObjectId

export function isValidObjectId(id) {
  return validateInput(id, validationRules.mongoObjectId);
}


//Validates and sanitizes query parameters

export function validateQueryParams(query) {
  const sanitized = {};
  
  for (const [key, value] of Object.entries(query)) {
    // Only allow safe parameter names
    if (!/^[a-zA-Z0-9_-]{1,50}$/.test(key)) {
      continue; // Skip invalid parameter names
    }

    // Check for dangerous patterns in values
    const dangerCheck = checkForDangerousPatterns(String(value));
    if (!dangerCheck.safe) {
      continue; // Skip dangerous values
    }

    sanitized[key] = sanitizeInput(value);
  }

  return sanitized;
}

// VALIDATION MIDDLEWARE EXAMPLES

export const validatePaymentMiddleware = (req, res, next) => {
  const validation = validatePaymentData(req.body);
  
  if (!validation.valid) {
    return res.status(400).json({ 
      message: 'Invalid payment data', 
      errors: validation.errors 
    });
  }
  
  next();
};

export const validateLoginMiddleware = (req, res, next) => {
  const { name, password, accountNumber } = req.body;
  const errors = [];

  if (!name || !validateInput(name, validationRules.username)) {
    errors.push('Invalid username format');
  }

  if (!password) {
    errors.push('Password is required');
  }

  // For non-employee users, validate account number
  if (name !== process.env.EMPLOYEE_USERNAME) {
    if (!accountNumber || !validateInput(accountNumber, validationRules.accountNumber)) {
      errors.push('Invalid account number format');
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({ 
      message: 'Validation failed', 
      errors 
    });
  }

  next();
};

export default {
  validationRules,
  validateInput,
  sanitizeInput,
  sanitizeObject,
  checkForDangerousPatterns,
  validatePaymentData,
  validateUserCredentials,
  validateRequestBody,
  isValidObjectId,
  validateQueryParams,
  validatePaymentMiddleware,
  validateLoginMiddleware
};