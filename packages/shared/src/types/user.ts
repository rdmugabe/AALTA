import { z } from 'zod';

// ============ ENUMS ============

export const UserRole = {
  PUBLIC: 'PUBLIC',
  JOURNALIST: 'JOURNALIST',
  RESEARCHER: 'RESEARCHER',
  FACILITY_OPERATOR: 'FACILITY_OPERATOR',
  DATA_ADMIN: 'DATA_ADMIN',
  SUPER_ADMIN: 'SUPER_ADMIN',
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const AuditAction = {
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  SCORE_CALCULATION: 'SCORE_CALCULATION',
  DATA_IMPORT: 'DATA_IMPORT',
} as const;
export type AuditAction = (typeof AuditAction)[keyof typeof AuditAction];

// ============ SCHEMAS ============

export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  passwordHash: z.string().nullable(),

  role: z.nativeEnum(UserRole),

  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  organization: z.string().nullable(),

  facilityAccess: z.array(z.string()),

  emailVerified: z.boolean().default(false),
  lastLoginAt: z.date().nullable(),

  createdAt: z.date(),
  updatedAt: z.date(),
});

export type User = z.infer<typeof UserSchema>;

export const CreateUserSchema = UserSchema.omit({
  id: true,
  emailVerified: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateUser = z.infer<typeof CreateUserSchema>;

export const PublicUserSchema = UserSchema.omit({
  passwordHash: true,
  facilityAccess: true,
});

export type PublicUser = z.infer<typeof PublicUserSchema>;

// ============ AUDIT LOG ============

export const AuditLogSchema = z.object({
  id: z.string(),
  entityType: z.string(),
  entityId: z.string(),
  action: z.nativeEnum(AuditAction),
  previousData: z.record(z.unknown()).nullable(),
  newData: z.record(z.unknown()).nullable(),
  performedBy: z.string().nullable(),
  ipAddress: z.string().nullable(),
  createdAt: z.date(),
});

export type AuditLog = z.infer<typeof AuditLogSchema>;

// ============ PERMISSIONS ============

export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  PUBLIC: ['read:facilities', 'read:violations', 'read:reports'],
  JOURNALIST: ['read:facilities', 'read:violations', 'read:reports', 'export:data', 'api:access'],
  RESEARCHER: ['read:facilities', 'read:violations', 'read:reports', 'export:data', 'api:access', 'read:analytics'],
  FACILITY_OPERATOR: ['read:facilities', 'read:violations', 'read:reports', 'claim:facility', 'respond:violations'],
  DATA_ADMIN: ['read:facilities', 'read:violations', 'read:reports', 'export:data', 'api:access', 'write:facilities', 'import:data'],
  SUPER_ADMIN: ['*'],
};

export function hasPermission(role: UserRole, permission: string): boolean {
  const permissions = ROLE_PERMISSIONS[role];
  return permissions.includes('*') || permissions.includes(permission);
}
