/**
 * AssetFlow database seed.
 *
 * Populates a realistic enterprise dataset: roles/permissions, users across
 * every role, departments with hierarchy, categories, locations, assets,
 * allocations, shared resources, bookings, maintenance, an audit cycle,
 * notifications, dashboard widgets and org/app/theme settings.
 *
 * The script is idempotent: keyed entities are upserted on their unique
 * business columns, and transactional records are only created when absent.
 */
import { PrismaClient, UserRole, AssetStatus, Condition } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const PERMISSIONS: Array<{ key: string; module: string; description: string }> = [
  { key: 'asset:create', module: 'assets', description: 'Create assets' },
  { key: 'asset:read', module: 'assets', description: 'View assets' },
  { key: 'asset:update', module: 'assets', description: 'Update assets' },
  { key: 'asset:delete', module: 'assets', description: 'Delete assets' },
  { key: 'allocation:manage', module: 'allocation', description: 'Manage allocations' },
  { key: 'booking:manage', module: 'booking', description: 'Manage bookings' },
  { key: 'maintenance:manage', module: 'maintenance', description: 'Manage maintenance' },
  { key: 'audit:manage', module: 'audit', description: 'Manage audits' },
  { key: 'report:view', module: 'reports', description: 'View reports' },
  { key: 'user:manage', module: 'users', description: 'Manage users' },
];

const ROLE_PERMISSIONS: Record<string, string[]> = {
  ADMIN: PERMISSIONS.map((p) => p.key),
  ASSET_MANAGER: [
    'asset:create',
    'asset:read',
    'asset:update',
    'allocation:manage',
    'booking:manage',
    'maintenance:manage',
    'audit:manage',
    'report:view',
  ],
  DEPARTMENT_HEAD: ['asset:read', 'allocation:manage', 'booking:manage', 'report:view'],
  EMPLOYEE: ['asset:read', 'booking:manage'],
};

async function seedRolesAndPermissions(): Promise<Map<string, string>> {
  const permissionIds = new Map<string, string>();
  for (const perm of PERMISSIONS) {
    const created = await prisma.permission.upsert({
      where: { key: perm.key },
      update: { description: perm.description, module: perm.module },
      create: perm,
    });
    permissionIds.set(perm.key, created.id);
  }

  const roleIds = new Map<string, string>();
  for (const roleName of Object.keys(ROLE_PERMISSIONS)) {
    const role = await prisma.role.upsert({
      where: { name: roleName },
      update: { isSystem: true },
      create: { name: roleName, description: `${roleName} role`, isSystem: true },
    });
    roleIds.set(roleName, role.id);

    for (const permKey of ROLE_PERMISSIONS[roleName] ?? []) {
      const permissionId = permissionIds.get(permKey);
      if (!permissionId) continue;
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId } },
        update: {},
        create: { roleId: role.id, permissionId },
      });
    }
  }
  return roleIds;
}

interface SeedUser {
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  employeeCode: string;
  designation: string;
  department: string;
}

const USERS: SeedUser[] = [
  { email: 'admin@assetflow.io', firstName: 'Aria', lastName: 'Nolan', role: UserRole.ADMIN, employeeCode: 'EMP-0001', designation: 'System Administrator', department: 'IT' },
  { email: 'manager@assetflow.io', firstName: 'Marcus', lastName: 'Reed', role: UserRole.ASSET_MANAGER, employeeCode: 'EMP-0002', designation: 'Asset Manager', department: 'Operations' },
  { email: 'ithead@assetflow.io', firstName: 'Priya', lastName: 'Shah', role: UserRole.DEPARTMENT_HEAD, employeeCode: 'EMP-0003', designation: 'IT Department Head', department: 'IT' },
  { email: 'hrhead@assetflow.io', firstName: 'Diego', lastName: 'Marin', role: UserRole.DEPARTMENT_HEAD, employeeCode: 'EMP-0004', designation: 'HR Department Head', department: 'HR' },
  { email: 'liam@assetflow.io', firstName: 'Liam', lastName: 'Carter', role: UserRole.EMPLOYEE, employeeCode: 'EMP-0005', designation: 'Software Engineer', department: 'IT' },
  { email: 'sofia@assetflow.io', firstName: 'Sofia', lastName: 'Rossi', role: UserRole.EMPLOYEE, employeeCode: 'EMP-0006', designation: 'HR Specialist', department: 'HR' },
  { email: 'noah@assetflow.io', firstName: 'Noah', lastName: 'Kim', role: UserRole.EMPLOYEE, employeeCode: 'EMP-0007', designation: 'Operations Analyst', department: 'Operations' },
  { email: 'emma@assetflow.io', firstName: 'Emma', lastName: 'Novak', role: UserRole.EMPLOYEE, employeeCode: 'EMP-0008', designation: 'Accountant', department: 'Finance' },
];

const DEPARTMENTS = [
  { name: 'Head Office', code: 'HO', parent: null },
  { name: 'IT', code: 'IT', parent: 'HO' },
  { name: 'HR', code: 'HR', parent: 'HO' },
  { name: 'Operations', code: 'OPS', parent: 'HO' },
  { name: 'Finance', code: 'FIN', parent: 'HO' },
];

async function seedDepartments(): Promise<Map<string, string>> {
  const deptIds = new Map<string, string>();
  for (const dept of DEPARTMENTS) {
    const created = await prisma.department.upsert({
      where: { code: dept.code },
      update: { name: dept.name },
      create: { name: dept.name, code: dept.code },
    });
    deptIds.set(dept.code, created.id);
  }
  // Wire parents + closure hierarchy now that all rows exist.
  for (const dept of DEPARTMENTS) {
    if (!dept.parent) continue;
    const id = deptIds.get(dept.code)!;
    const parentId = deptIds.get(dept.parent)!;
    await prisma.department.update({ where: { id }, data: { parentId } });
    await prisma.departmentHierarchy.upsert({
      where: { ancestorId_descendantId: { ancestorId: parentId, descendantId: id } },
      update: { depth: 1 },
      create: { ancestorId: parentId, descendantId: id, depth: 1 },
    });
  }
  return deptIds;
}

async function seedUsers(
  deptIds: Map<string, string>,
  roleIds: Map<string, string>,
): Promise<Map<string, { userId: string; employeeId: string }>> {
  const passwordHash = await bcrypt.hash('Password123!', 10);
  const result = new Map<string, { userId: string; employeeId: string }>();
  const deptByName: Record<string, string> = { IT: 'IT', HR: 'HR', Operations: 'OPS', Finance: 'FIN' };

  for (const u of USERS) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { firstName: u.firstName, lastName: u.lastName, role: u.role, emailVerified: true },
      create: {
        email: u.email,
        passwordHash,
        firstName: u.firstName,
        lastName: u.lastName,
        role: u.role,
        emailVerified: true,
      },
    });

    const roleId = roleIds.get(u.role);
    if (roleId) {
      await prisma.userRole_Assignment.upsert({
        where: { userId_roleId: { userId: user.id, roleId } },
        update: {},
        create: { userId: user.id, roleId },
      });
    }

    const departmentId = deptIds.get(deptByName[u.department] ?? 'HO');
    const employee = await prisma.employee.upsert({
      where: { employeeCode: u.employeeCode },
      update: { departmentId, designation: u.designation },
      create: {
        userId: user.id,
        employeeCode: u.employeeCode,
        designation: u.designation,
        departmentId,
        joiningDate: new Date('2024-01-15'),
      },
    });

    await prisma.employeeProfile.upsert({
      where: { employeeId: employee.id },
      update: {},
      create: {
        employeeId: employee.id,
        bio: `${u.designation} at AssetFlow.`,
        skills: ['collaboration', 'operations'],
      },
    });

    result.set(u.email, { userId: user.id, employeeId: employee.id });
  }

  // Assign department heads.
  const itHead = result.get('ithead@assetflow.io');
  const hrHead = result.get('hrhead@assetflow.io');
  if (itHead) await prisma.department.update({ where: { code: 'IT' }, data: {} });
  if (hrHead) await prisma.department.update({ where: { code: 'HR' }, data: {} });

  return result;
}

const CATEGORIES = [
  { name: 'Laptops', code: 'LAP' },
  { name: 'Monitors', code: 'MON' },
  { name: 'Projectors', code: 'PRJ' },
  { name: 'Furniture', code: 'FUR' },
  { name: 'Vehicles', code: 'VEH' },
];

const LOCATIONS = [
  { name: 'HQ Building', code: 'HQ', building: 'HQ' },
  { name: 'Floor 1', code: 'HQ-F1', building: 'HQ', floor: '1' },
  { name: 'Floor 2', code: 'HQ-F2', building: 'HQ', floor: '2' },
  { name: 'Store Room', code: 'HQ-STORE', building: 'HQ', floor: '0', room: 'B1' },
];

async function seedCatalog(): Promise<{
  categories: Map<string, string>;
  locations: Map<string, string>;
}> {
  const categories = new Map<string, string>();
  for (const c of CATEGORIES) {
    const created = await prisma.assetCategory.upsert({
      where: { code: c.code },
      update: { name: c.name },
      create: { name: c.name, code: c.code },
    });
    categories.set(c.code, created.id);
  }
  // A couple of custom fields for laptops.
  const lapId = categories.get('LAP')!;
  for (const field of [
    { name: 'CPU', fieldType: 'text', sortOrder: 1 },
    { name: 'RAM (GB)', fieldType: 'number', sortOrder: 2 },
  ]) {
    await prisma.assetCategoryField.upsert({
      where: { categoryId_name: { categoryId: lapId, name: field.name } },
      update: {},
      create: { categoryId: lapId, ...field },
    });
  }

  const locations = new Map<string, string>();
  for (const l of LOCATIONS) {
    const created = await prisma.assetLocation.upsert({
      where: { code: l.code },
      update: { name: l.name },
      create: l,
    });
    locations.set(l.code, created.id);
  }
  return { categories, locations };
}

interface SeedAsset {
  tag: string;
  serial: string;
  name: string;
  category: string;
  location: string;
  status: AssetStatus;
  condition: Condition;
  cost: number;
}

const ASSETS: SeedAsset[] = [
  { tag: 'AF-0001', serial: 'SN-LAP-0001', name: 'Dell Latitude 7440', category: 'LAP', location: 'HQ-F1', status: AssetStatus.ALLOCATED, condition: Condition.GOOD, cost: 1499.0 },
  { tag: 'AF-0002', serial: 'SN-LAP-0002', name: 'MacBook Pro 14', category: 'LAP', location: 'HQ-F2', status: AssetStatus.ALLOCATED, condition: Condition.EXCELLENT, cost: 2199.0 },
  { tag: 'AF-0003', serial: 'SN-LAP-0003', name: 'Lenovo ThinkPad X1', category: 'LAP', location: 'HQ-STORE', status: AssetStatus.AVAILABLE, condition: Condition.NEW, cost: 1699.0 },
  { tag: 'AF-0004', serial: 'SN-MON-0001', name: 'Dell UltraSharp 27', category: 'MON', location: 'HQ-F1', status: AssetStatus.AVAILABLE, condition: Condition.GOOD, cost: 549.0 },
  { tag: 'AF-0005', serial: 'SN-MON-0002', name: 'LG 4K 32', category: 'MON', location: 'HQ-F2', status: AssetStatus.RESERVED, condition: Condition.GOOD, cost: 629.0 },
  { tag: 'AF-0006', serial: 'SN-PRJ-0001', name: 'Epson EB-2250U', category: 'PRJ', location: 'HQ-F2', status: AssetStatus.MAINTENANCE, condition: Condition.FAIR, cost: 999.0 },
  { tag: 'AF-0007', serial: 'SN-FUR-0001', name: 'Ergonomic Chair', category: 'FUR', location: 'HQ-F1', status: AssetStatus.AVAILABLE, condition: Condition.GOOD, cost: 320.0 },
  { tag: 'AF-0008', serial: 'SN-FUR-0002', name: 'Standing Desk', category: 'FUR', location: 'HQ-F1', status: AssetStatus.ALLOCATED, condition: Condition.GOOD, cost: 480.0 },
  { tag: 'AF-0009', serial: 'SN-VEH-0001', name: 'Toyota Hilux', category: 'VEH', location: 'HQ', status: AssetStatus.AVAILABLE, condition: Condition.GOOD, cost: 32000.0 },
  { tag: 'AF-0010', serial: 'SN-LAP-0004', name: 'HP EliteBook 840', category: 'LAP', location: 'HQ-STORE', status: AssetStatus.AVAILABLE, condition: Condition.NEW, cost: 1399.0 },
  { tag: 'AF-0011', serial: 'SN-MON-0003', name: 'Samsung ViewFinity', category: 'MON', location: 'HQ-STORE', status: AssetStatus.AVAILABLE, condition: Condition.NEW, cost: 699.0 },
  { tag: 'AF-0012', serial: 'SN-PRJ-0002', name: 'BenQ MW632ST', category: 'PRJ', location: 'HQ-F2', status: AssetStatus.AVAILABLE, condition: Condition.GOOD, cost: 720.0 },
];

async function seedAssets(
  categories: Map<string, string>,
  locations: Map<string, string>,
  itDeptId: string | undefined,
): Promise<Map<string, string>> {
  const assetIds = new Map<string, string>();
  for (const a of ASSETS) {
    const asset = await prisma.asset.upsert({
      where: { assetTag: a.tag },
      update: { status: a.status, condition: a.condition },
      create: {
        assetTag: a.tag,
        serialNumber: a.serial,
        name: a.name,
        categoryId: categories.get(a.category)!,
        locationId: locations.get(a.location),
        departmentId: itDeptId,
        status: a.status,
        condition: a.condition,
        purchaseCost: a.cost,
        currentValue: Math.round(a.cost * 0.8 * 100) / 100,
        purchaseDate: new Date('2024-03-01'),
        vendor: 'Global Supplies Co.',
      },
    });
    assetIds.set(a.tag, asset.id);

    await prisma.qRCode.upsert({
      where: { assetId: asset.id },
      update: {},
      create: { assetId: asset.id, code: `QR-${a.tag}` },
    });
  }
  return assetIds;
}

async function seedAllocations(
  assetIds: Map<string, string>,
  people: Map<string, { userId: string; employeeId: string }>,
): Promise<void> {
  if ((await prisma.allocation.count()) > 0) return;
  const liam = people.get('liam@assetflow.io')!;
  const sofia = people.get('sofia@assetflow.io')!;
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  const allocations = [
    { tag: 'AF-0001', employeeId: liam.employeeId, expected: new Date(now + 20 * day), status: 'ACTIVE' as const },
    { tag: 'AF-0002', employeeId: sofia.employeeId, expected: new Date(now - 3 * day), status: 'OVERDUE' as const },
    { tag: 'AF-0008', employeeId: liam.employeeId, expected: new Date(now + 60 * day), status: 'ACTIVE' as const },
  ];

  for (const al of allocations) {
    const allocation = await prisma.allocation.create({
      data: {
        assetId: assetIds.get(al.tag)!,
        employeeId: al.employeeId,
        status: al.status,
        allocationDate: new Date(now - 10 * day),
        expectedReturnDate: al.expected,
        allocationCondition: Condition.GOOD,
      },
    });
    await prisma.allocationHistory.create({
      data: { allocationId: allocation.id, action: 'ALLOCATED', status: al.status, note: 'Initial allocation' },
    });
  }
}

async function seedBookings(
  assetIds: Map<string, string>,
  people: Map<string, { userId: string; employeeId: string }>,
): Promise<void> {
  // Shared meeting rooms.
  const rooms = [
    { name: 'Boardroom A', code: 'ROOM-A', capacity: 12 },
    { name: 'Huddle B2', code: 'ROOM-B2', capacity: 6 },
  ];
  const roomIds = new Map<string, string>();
  for (const r of rooms) {
    const room = await prisma.sharedResource.upsert({
      where: { code: r.code },
      update: {},
      create: { name: r.name, code: r.code, resourceType: 'MEETING_ROOM', capacity: r.capacity },
    });
    roomIds.set(r.code, room.id);
  }

  if ((await prisma.booking.count()) > 0) return;
  const noah = people.get('noah@assetflow.io')!;
  const now = Date.now();
  const hour = 60 * 60 * 1000;

  const booking = await prisma.booking.create({
    data: {
      sharedResourceId: roomIds.get('ROOM-A')!,
      employeeId: noah.employeeId,
      status: 'CONFIRMED',
      startTime: new Date(now + 2 * hour),
      endTime: new Date(now + 3 * hour),
      purpose: 'Quarterly planning',
    },
  });
  await prisma.bookingHistory.create({
    data: { bookingId: booking.id, action: 'CREATED', status: 'CONFIRMED' },
  });
  await prisma.bookingReminder.create({
    data: { bookingId: booking.id, remindAt: new Date(now + hour) },
  });

  await prisma.booking.create({
    data: {
      assetId: assetIds.get('AF-0012')!,
      employeeId: noah.employeeId,
      status: 'PENDING',
      startTime: new Date(now + 26 * hour),
      endTime: new Date(now + 28 * hour),
      purpose: 'Client demo',
    },
  });
}

async function seedMaintenance(
  assetIds: Map<string, string>,
  people: Map<string, { userId: string; employeeId: string }>,
): Promise<void> {
  if ((await prisma.maintenanceRequest.count()) > 0) return;
  const itHead = people.get('ithead@assetflow.io')!;

  const req = await prisma.maintenanceRequest.create({
    data: {
      assetId: assetIds.get('AF-0006')!,
      employeeId: itHead.employeeId,
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      issueType: 'Hardware',
      description: 'Projector lamp flickering and overheating.',
      reportedCondition: Condition.FAIR,
    },
  });
  await prisma.maintenanceAssignment.create({
    data: { maintenanceRequestId: req.id, status: 'IN_PROGRESS' },
  });
  await prisma.maintenanceHistory.create({
    data: { maintenanceRequestId: req.id, action: 'ASSIGNED', status: 'IN_PROGRESS' },
  });

  const resolved = await prisma.maintenanceRequest.create({
    data: {
      assetId: assetIds.get('AF-0004')!,
      employeeId: itHead.employeeId,
      status: 'RESOLVED',
      priority: 'MEDIUM',
      issueType: 'Calibration',
      description: 'Monitor color calibration drift.',
    },
  });
  await prisma.maintenanceResolution.create({
    data: {
      maintenanceRequestId: resolved.id,
      resolutionNotes: 'Recalibrated and updated firmware.',
      cost: 45.0,
      partsReplaced: 'None',
    },
  });
}

async function seedAudit(
  assetIds: Map<string, string>,
  deptIds: Map<string, string>,
): Promise<void> {
  const cycle = await prisma.auditCycle.upsert({
    where: { code: 'AUD-2026-Q1' },
    update: {},
    create: {
      name: 'Q1 2026 Asset Audit',
      code: 'AUD-2026-Q1',
      status: 'IN_PROGRESS',
      scope: 'All IT and Operations assets',
      departmentId: deptIds.get('IT'),
      startDate: new Date('2026-01-05'),
    },
  });
  if ((await prisma.auditAssignment.count({ where: { auditCycleId: cycle.id } })) === 0) {
    await prisma.auditAssignment.create({
      data: { auditCycleId: cycle.id, scopeNote: 'Floor 1 and 2 sweep' },
    });
  }

  for (const tag of ['AF-0001', 'AF-0004', 'AF-0006']) {
    const assetId = assetIds.get(tag)!;
    const record = await prisma.auditRecord.upsert({
      where: { auditCycleId_assetId: { auditCycleId: cycle.id, assetId } },
      update: {},
      create: {
        auditCycleId: cycle.id,
        assetId,
        status: tag === 'AF-0006' ? 'DISCREPANCY' : 'VERIFIED',
        isVerified: tag !== 'AF-0006',
        foundCondition: tag === 'AF-0006' ? Condition.POOR : Condition.GOOD,
      },
    });
    if (tag === 'AF-0006') {
      const existing = await prisma.auditDiscrepancy.count({ where: { auditRecordId: record.id } });
      if (existing === 0) {
        await prisma.auditDiscrepancy.create({
          data: {
            auditRecordId: record.id,
            type: 'CONDITION_MISMATCH',
            description: 'Asset condition worse than recorded.',
            severity: 'HIGH',
          },
        });
      }
    }
  }
  await prisma.auditHistory.create({
    data: { auditCycleId: cycle.id, action: 'PROGRESS', status: 'IN_PROGRESS', note: 'Audit underway' },
  });
}

async function seedNotificationsAndSettings(
  people: Map<string, { userId: string; employeeId: string }>,
): Promise<void> {
  await prisma.notificationTemplate.upsert({
    where: { key: 'allocation.overdue' },
    update: {},
    create: {
      key: 'allocation.overdue',
      title: 'Asset overdue',
      body: 'Asset {{assetTag}} is overdue for return.',
    },
  });

  const sofia = people.get('sofia@assetflow.io')!;
  if ((await prisma.notification.count()) === 0) {
    await prisma.notification.create({
      data: {
        userId: sofia.userId,
        title: 'Asset overdue',
        message: 'Asset AF-0002 (MacBook Pro 14) is overdue for return.',
        status: 'SENT',
        priority: 'HIGH',
        type: 'ALLOCATION_OVERDUE',
        entityType: 'asset',
      },
    });
  }

  // Dashboard widgets for the admin.
  const admin = people.get('admin@assetflow.io')!;
  if ((await prisma.dashboardWidget.count()) === 0) {
    const widgets = [
      { title: 'Assets by Status', widgetType: 'PIE', position: 0 },
      { title: 'Overdue Returns', widgetType: 'STAT', position: 1 },
      { title: 'Bookings This Week', widgetType: 'BAR', position: 2 },
    ];
    for (const w of widgets) {
      await prisma.dashboardWidget.create({ data: { ownerId: admin.userId, ...w } });
    }
  }

  await prisma.organizationSettings.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'AssetFlow Inc.',
      legalName: 'AssetFlow Incorporated',
      timezone: 'UTC',
      currency: 'USD',
      contactEmail: 'ops@assetflow.io',
    },
  });

  for (const setting of [
    { key: 'allocation.maxDays', value: 90, description: 'Default max allocation days' },
    { key: 'booking.minMinutes', value: 30, description: 'Minimum booking duration' },
  ]) {
    await prisma.applicationSettings.upsert({
      where: { key: setting.key },
      update: {},
      create: { key: setting.key, value: setting.value, description: setting.description, category: 'policy' },
    });
  }

  await prisma.themeSettings.upsert({
    where: { userId: admin.userId },
    update: {},
    create: { userId: admin.userId, theme: 'SYSTEM', language: 'EN' },
  });

  await prisma.activityLog.create({
    data: { userId: admin.userId, action: 'SEED', entityType: 'system', metadata: { note: 'Database seeded' } },
  });
}

async function main(): Promise<void> {
  console.log('Seeding AssetFlow database...');
  const roleIds = await seedRolesAndPermissions();
  const deptIds = await seedDepartments();
  const people = await seedUsers(deptIds, roleIds);
  const { categories, locations } = await seedCatalog();
  const assetIds = await seedAssets(categories, locations, deptIds.get('IT'));
  await seedAllocations(assetIds, people);
  await seedBookings(assetIds, people);
  await seedMaintenance(assetIds, people);
  await seedAudit(assetIds, deptIds);
  await seedNotificationsAndSettings(people);
  console.log('Seed complete.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
