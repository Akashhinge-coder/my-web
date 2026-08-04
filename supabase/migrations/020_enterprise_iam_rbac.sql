-- ==============================================================================
-- ADR-002: Enterprise IAM & RBAC (020_enterprise_iam_rbac.sql)
-- ==============================================================================

-- 1. Create confirmation strategy enum
CREATE TYPE confirmation_strategy AS ENUM ('PASSWORD', 'OTP', 'DOUBLE_CONFIRMATION', 'NONE');

-- 2. Create permissions table
CREATE TABLE permissions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    "group" TEXT NOT NULL,
    description TEXT,
    dangerous BOOLEAN NOT NULL DEFAULT false,
    requires_confirmation BOOLEAN NOT NULL DEFAULT false,
    audit_required BOOLEAN NOT NULL DEFAULT false,
    confirmation_strategy confirmation_strategy NOT NULL DEFAULT 'NONE'
);

-- 3. Create roles table
CREATE TABLE roles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    system_role BOOLEAN NOT NULL DEFAULT false,
    permission_version INT NOT NULL DEFAULT 1
);

-- 4. Create role_permissions
CREATE TABLE role_permissions (
    role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id TEXT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- 5. Extend Staff Table
CREATE TYPE staff_status AS ENUM ('INVITED', 'ACTIVE', 'SUSPENDED', 'LEFT', 'LOCKED');

-- Temporarily allow null for role_id to migrate existing rows
ALTER TABLE staff ADD COLUMN role_id TEXT REFERENCES roles(id);
ALTER TABLE staff ADD COLUMN username TEXT;
ALTER TABLE staff ADD COLUMN must_change_password BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE staff ADD COLUMN password_changed_at TIMESTAMPTZ;
ALTER TABLE staff ADD COLUMN temporary_password_expires_at TIMESTAMPTZ;
ALTER TABLE staff ADD COLUMN failed_login_attempts INT NOT NULL DEFAULT 0;
ALTER TABLE staff ADD COLUMN locked_until TIMESTAMPTZ;
ALTER TABLE staff ADD COLUMN last_login_at TIMESTAMPTZ;
ALTER TABLE staff ADD COLUMN status staff_status NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE staff ADD COLUMN is_emergency_admin BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE staff ADD COLUMN deleted_at TIMESTAMPTZ;
ALTER TABLE staff ADD COLUMN provider TEXT;
ALTER TABLE staff ADD COLUMN provider_user_id TEXT;

-- Enforce unique username per restaurant
ALTER TABLE staff ADD CONSTRAINT staff_restaurant_id_username_key UNIQUE (restaurant_id, username);

-- Migrate existing role to role_id
INSERT INTO roles (id, name, description, system_role) VALUES
('admin', 'Admin', 'Full access to all operations.', true),
('manager', 'Manager', 'Manage most operations, billing, and staff.', true),
('waiter', 'Waiter', 'Manage tables, orders, and reservations.', true),
('kitchen', 'Kitchen', 'View kitchen display and live orders.', true),
('superadmin', 'Superadmin', 'Platform superadmin.', true)
ON CONFLICT (id) DO NOTHING;

UPDATE staff SET role_id = role::text;
ALTER TABLE staff ALTER COLUMN role_id SET NOT NULL;

-- Drop dependent policies before dropping the column
DROP POLICY IF EXISTS "Enable update for admins on their own integrations" ON restaurant_payment_integrations;

ALTER TABLE staff DROP COLUMN role;
DROP TYPE staff_role CASCADE;

-- Recreate dependent policies with role_id
CREATE POLICY "Enable update for admins on their own integrations"
  ON restaurant_payment_integrations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff 
      WHERE staff.user_id = auth.uid() 
      AND staff.restaurant_id = restaurant_payment_integrations.restaurant_id
      AND staff.role_id IN ('admin', 'manager')
    )
  );

-- 6. Create staff_permission_overrides
CREATE TABLE staff_permission_overrides (
    staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    permission_id TEXT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    is_granted BOOLEAN NOT NULL,
    PRIMARY KEY (staff_id, permission_id)
);

-- 7. Create staff_sessions
CREATE TABLE staff_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL,
    device_name TEXT,
    ip TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMPTZ
);

-- RLS Policies
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_permission_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_permissions" ON permissions FOR SELECT USING (true);
CREATE POLICY "public_read_roles" ON roles FOR SELECT USING (true);
CREATE POLICY "public_read_role_permissions" ON role_permissions FOR SELECT USING (true);

-- Staff overrides follow staff isolation
CREATE POLICY "restaurant_isolation_staff_overrides" ON staff_permission_overrides FOR ALL USING (
    staff_id IN (
        SELECT id FROM staff WHERE restaurant_id IN (
            SELECT id FROM restaurants WHERE owner_id = auth.uid()
            UNION
            SELECT restaurant_id FROM staff WHERE user_id = auth.uid()
        )
    )
);

-- Staff sessions follow staff isolation
CREATE POLICY "restaurant_isolation_staff_sessions" ON staff_sessions FOR ALL USING (
    staff_id IN (
        SELECT id FROM staff WHERE restaurant_id IN (
            SELECT id FROM restaurants WHERE owner_id = auth.uid()
            UNION
            SELECT restaurant_id FROM staff WHERE user_id = auth.uid()
        )
    )
);

-- Initial Permissions Seed
INSERT INTO permissions (id, name, "group", description, dangerous) VALUES
('orders.view', 'View Orders', 'Operations', 'Can view live orders', false),
('orders.edit', 'Edit Orders', 'Operations', 'Can modify live orders', false),
('orders.assign', 'Assign Orders', 'Operations', 'Can assign orders to staff', false),
('tables.manage', 'Manage Tables', 'Operations', 'Can open, close, or move tables', false),
('reservations.manage', 'Manage Reservations', 'Operations', 'Can create and manage reservations', false),
('menu.view', 'View Menu', 'Menu', 'Can view menu items and settings', false),
('menu.edit', 'Edit Menu', 'Menu', 'Can add, edit, or delete menu items', false),
('billing.view', 'View Billing', 'Business', 'Can view past bills and analytics', false),
('payments.capture', 'Capture Payments', 'Business', 'Can mark payments as paid or record cash', false),
('payments.refund', 'Refund Payments', 'Business', 'Can issue refunds', true),
('staff.manage', 'Manage Staff', 'Management', 'Can add, edit, or suspend staff', true),
('inventory.manage', 'Manage Inventory', 'Management', 'Can modify inventory levels', false),
('settings.manage', 'Manage Settings', 'Management', 'Can edit restaurant settings', true)
ON CONFLICT (id) DO NOTHING;

-- Initial Role Permissions Seed
INSERT INTO role_permissions (role_id, permission_id) VALUES
-- Admin
('admin', 'orders.view'), ('admin', 'orders.edit'), ('admin', 'orders.assign'), ('admin', 'tables.manage'), ('admin', 'reservations.manage'),
('admin', 'menu.view'), ('admin', 'menu.edit'), ('admin', 'billing.view'), ('admin', 'payments.capture'), ('admin', 'payments.refund'),
('admin', 'staff.manage'), ('admin', 'inventory.manage'), ('admin', 'settings.manage'),
-- Manager
('manager', 'orders.view'), ('manager', 'orders.edit'), ('manager', 'orders.assign'), ('manager', 'tables.manage'), ('manager', 'reservations.manage'),
('manager', 'menu.view'), ('manager', 'menu.edit'), ('manager', 'billing.view'), ('manager', 'payments.capture'),
('manager', 'staff.manage'), ('manager', 'inventory.manage'),
-- Waiter
('waiter', 'orders.view'), ('waiter', 'orders.edit'), ('waiter', 'tables.manage'), ('waiter', 'reservations.manage'), ('waiter', 'menu.view'),
-- Kitchen
('kitchen', 'orders.view')
ON CONFLICT DO NOTHING;
