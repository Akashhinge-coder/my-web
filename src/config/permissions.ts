import type { Permission } from "@/types/domain";

export const DEFAULT_PERMISSIONS: Permission[] = [
  { id: "orders.view", name: "View Orders", group: "Operations", description: "Can view live orders", dangerous: false, requires_confirmation: false, audit_required: false, confirmation_strategy: "NONE" },
  { id: "orders.edit", name: "Edit Orders", group: "Operations", description: "Can modify live orders", dangerous: false, requires_confirmation: false, audit_required: false, confirmation_strategy: "NONE" },
  { id: "orders.assign", name: "Assign Orders", group: "Operations", description: "Can assign orders to staff", dangerous: false, requires_confirmation: false, audit_required: false, confirmation_strategy: "NONE" },
  { id: "tables.manage", name: "Manage Tables", group: "Operations", description: "Can open, close, or move tables", dangerous: false, requires_confirmation: false, audit_required: false, confirmation_strategy: "NONE" },
  { id: "reservations.manage", name: "Manage Reservations", group: "Operations", description: "Can create and manage reservations", dangerous: false, requires_confirmation: false, audit_required: false, confirmation_strategy: "NONE" },
  { id: "waitlist.manage", name: "Manage Waitlist", group: "Operations", description: "Can manage the waitlist and walk-in queues", dangerous: false, requires_confirmation: false, audit_required: false, confirmation_strategy: "NONE" },
  { id: "menu.view", name: "View Menu", group: "Menu", description: "Can view menu items and settings", dangerous: false, requires_confirmation: false, audit_required: false, confirmation_strategy: "NONE" },
  { id: "menu.edit", name: "Edit Menu", group: "Menu", description: "Can add, edit, or delete menu items", dangerous: false, requires_confirmation: false, audit_required: false, confirmation_strategy: "NONE" },
  { id: "billing.view", name: "View Billing", group: "Business", description: "Can view past bills and analytics", dangerous: false, requires_confirmation: false, audit_required: false, confirmation_strategy: "NONE" },
  { id: "payments.capture", name: "Capture Payments", group: "Business", description: "Can mark payments as paid or record cash", dangerous: false, requires_confirmation: false, audit_required: false, confirmation_strategy: "NONE" },
  { id: "payments.refund", name: "Refund Payments", group: "Business", description: "Can issue refunds", dangerous: true, requires_confirmation: true, audit_required: true, confirmation_strategy: "PASSWORD" },
  { id: "staff.manage", name: "Manage Staff", group: "Management", description: "Can add, edit, or suspend staff", dangerous: true, requires_confirmation: true, audit_required: true, confirmation_strategy: "NONE" },
  { id: "inventory.manage", name: "Manage Inventory", group: "Management", description: "Can modify inventory levels", dangerous: false, requires_confirmation: false, audit_required: false, confirmation_strategy: "NONE" },
  { id: "settings.manage", name: "Manage Settings", group: "Management", description: "Can edit restaurant settings", dangerous: true, requires_confirmation: false, audit_required: true, confirmation_strategy: "NONE" }
];

export const ROLE_TEMPLATES: Record<string, string[]> = {
  admin: [
    "orders.view", "orders.edit", "orders.assign", "tables.manage", "reservations.manage", "waitlist.manage",
    "menu.view", "menu.edit", "billing.view", "payments.capture", "payments.refund",
    "staff.manage", "inventory.manage", "settings.manage"
  ],
  manager: [
    "orders.view", "orders.edit", "orders.assign", "tables.manage", "reservations.manage", "waitlist.manage",
    "menu.view", "menu.edit", "billing.view", "payments.capture",
    "staff.manage", "inventory.manage"
  ],
  waiter: [
    "orders.view", "orders.edit", "tables.manage", "reservations.manage", "waitlist.manage", "menu.view"
  ],
  kitchen: [
    "orders.view"
  ]
};
