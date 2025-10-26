-- Migration: Add payment_signature field and PAYMENT_PENDING status
-- This migration adds support for client-side SOL payment verification

-- Add payment_signature field to track SOL payment transactions
ALTER TABLE ipo_applications 
ADD COLUMN payment_signature VARCHAR(100) NULL COMMENT 'SOL payment transaction signature';

-- Update status enum to include PAYMENT_PENDING
ALTER TABLE ipo_applications 
MODIFY COLUMN status ENUM('PAYMENT_PENDING', 'PENDING', 'ALLOTTED', 'REJECTED', 'REFUNDED') DEFAULT 'PENDING';

-- Add index for payment_signature for faster lookups
CREATE INDEX idx_payment_signature ON ipo_applications(payment_signature);

-- Update any existing PENDING applications to maintain backward compatibility
-- (This is safe as it doesn't change the meaning of existing data)