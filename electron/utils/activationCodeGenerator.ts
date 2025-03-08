import { maskOperate } from './activationUtils';

interface ActivationCodeOptions {
  expirationTimestamp: number;  // Unix timestamp in seconds
  isBasicTier: boolean;        // true for basic tier, false for standard tier
  isRenewal: boolean;          // true for renewal, false for new user
  usageMultiplier?: number;    // 0-9, affects usage limits (default is 1)
}

export function generateActivationCode(productCode: string, options: ActivationCodeOptions): string {
  const {
    expirationTimestamp,
    isBasicTier,
    isRenewal,
    usageMultiplier = 1
  } = options;

  // Create activation code array (20 digits)
  const activationCode = Array(20).fill(0);
  
  // Calculate sum of first 10 digits of product code for verification
  let sum1 = 0;
  let sum2 = 0;
  for (let i = 0; i < 20; i++) {
    if (i < 10) {
      sum1 += parseInt(productCode[i], 10);
    } else {
      sum2 += parseInt(productCode[i], 10);
    }
  }

  // First 5 digits can be random (0-9)
  for (let i = 0; i < 5; i++) {
    activationCode[i] = Math.floor(Math.random() * 10);
  }

  // Position 5: Verification digit (sum1 % 10)
  activationCode[5] = sum1 % 10;
  
  // Position 6: Verification digit (sum2 % 10)
  activationCode[6] = sum2 % 10;

  // Position 7-8: Random digits
  activationCode[7] = Math.floor(Math.random() * 10);
  activationCode[8] = Math.floor(Math.random() * 10);

  // Position 9-18: Expiration timestamp
  const tsStr = expirationTimestamp.toString().padStart(10, '0');
  for (let i = 0; i < 9; i++) {
    activationCode[i + 9] = parseInt(tsStr[i], 10);
  }

  // Position 18: Usage multiplier (0-9)
  activationCode[18] = usageMultiplier;

  // Position 19: Tier and renewal status
  // Last digit format:
  // 0 for standard tier (new user)
  // 5 for basic tier (new user)
  // 1 for standard tier (renewal)
  // 6 for basic tier (renewal)
  let lastDigit = isBasicTier ? 5 : 0;
  if (isRenewal) {
    lastDigit += 1;
  }
  activationCode[19] = lastDigit;

  // Apply mask to hide the actual values
  const rawCode = activationCode.join('');
  return maskOperate(rawCode, 'add');
}

// Helper function to convert date to Unix timestamp
export function dateToTimestamp(date: Date): number {
  return Math.floor(date.getTime() / 1000);
}

// Example usage:
/*
const productCode = "12533040034942379009";
const expirationDate = new Date('2024-12-31');

const activationCode = generateActivationCode(productCode, {
  expirationTimestamp: dateToTimestamp(expirationDate),
  isBasicTier: true,
  isRenewal: false,
  usageMultiplier: 2
});
*/ 