-- Fix missing enum values for V2 architecture
ALTER TYPE payment_status_enum ADD VALUE IF NOT EXISTS 'created';
ALTER TYPE payment_status_enum ADD VALUE IF NOT EXISTS 'captured';
