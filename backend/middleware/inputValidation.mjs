export const validationRules = {
  username: /^[a-zA-Z0-9_]{3,20}$/,
  password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  accountNumber: /^[0-9]{8,17}$/,
  swiftCode: /^[A-Z0-9]{8}([A-Z0-9]{3})?$/,
  amount: /^\d+(\.\d{1,2})?$/,
  currency: /^[A-Z]{3}$/,
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
};

export function validateInput(value, rule) {
  if (!value || typeof value !== 'string') return false;
  return rule.test(value);
}

export function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  return input
    .replace(/[<>\"'`]/g, '')
    .trim();
}
