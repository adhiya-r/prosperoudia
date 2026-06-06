const os = require('node:os');
const database = require('../config/database');
const healthController = require('./healthController');
const userRepository = require('../repositories/userRepository');
const warehouseService = require('../services/warehouseService');
const auditLogService = require('../services/auditLogService');
const { verifyPassword, hashPassword } = require('../utils/password');
const {
  validateAccountUpdatePayload,
  validatePasswordChangePayload
} = require('../validators/userValidator');

let lastCpuSnapshot = null;

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / (1024 ** index);
  return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function formatSeconds(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return '0 menit';
  }

  const totalMinutes = Math.floor(seconds / 60);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  const parts = [];
  if (days) {
    parts.push(`${days} hari`);
  }
  if (hours) {
    parts.push(`${hours} jam`);
  }
  if (minutes || !parts.length) {
    parts.push(`${minutes} menit`);
  }

  return parts.join(' ');
}

function getResponseMetrics(req) {
  const runtimeMetrics = req.app.locals.runtimeMetrics ?? {};

  return {
    requestCount: runtimeMetrics.requestCount ?? 0,
    avgResponseTimeMs: runtimeMetrics.avgResponseTimeMs ?? 0,
    lastResponseTimeMs: runtimeMetrics.lastResponseTimeMs ?? 0,
    lastRequestAt: runtimeMetrics.lastRequestAt ?? null,
    startedAt: runtimeMetrics.startedAt ?? null
  };
}

function takeCpuSnapshot() {
  const cpus = os.cpus();
  const totals = cpus.reduce(
    (accumulator, cpu) => {
      const times = cpu.times ?? {};
      const total = Object.values(times).reduce((sum, value) => sum + Number(value || 0), 0);
      const idle = Number(times.idle || 0);

      return {
        idle: accumulator.idle + idle,
        total: accumulator.total + total
      };
    },
    { idle: 0, total: 0 }
  );

  return {
    idle: totals.idle,
    total: totals.total,
    timestamp: Date.now()
  };
}

function getCpuUsagePercent() {
  const currentSnapshot = takeCpuSnapshot();

  if (!lastCpuSnapshot) {
    lastCpuSnapshot = currentSnapshot;
    return null;
  }

  const idleDelta = currentSnapshot.idle - lastCpuSnapshot.idle;
  const totalDelta = currentSnapshot.total - lastCpuSnapshot.total;
  lastCpuSnapshot = currentSnapshot;

  if (totalDelta <= 0) {
    return null;
  }

  const usagePercent = ((totalDelta - idleDelta) / totalDelta) * 100;
  return Math.max(0, Math.min(100, Number(usagePercent.toFixed(1))));
}

function getSystemUptimeSeconds() {
  try {
    return os.uptime();
  } catch (error) {
    return process.uptime();
  }
}

function getServerResources(req) {
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;
  const cpuLoad = os.loadavg();
  const processMemory = process.memoryUsage();
  const cpuUsagePercent = getCpuUsagePercent();
  const responseMetrics = getResponseMetrics(req);

  return {
    hostname: os.hostname(),
    platform: `${os.type()} ${os.release()}`,
    uptimeText: formatSeconds(getSystemUptimeSeconds()),
    totalMemoryText: formatBytes(totalMemory),
    usedMemoryText: formatBytes(usedMemory),
    freeMemoryText: formatBytes(freeMemory),
    memoryUsagePercent: totalMemory > 0 ? Math.round((usedMemory / totalMemory) * 100) : 0,
    processMemoryText: formatBytes(processMemory.rss ?? 0),
    heapUsedText: formatBytes(processMemory.heapUsed ?? 0),
    cpuUsagePercent,
    cpuUsageText: cpuUsagePercent === null ? 'Sampling...' : `${cpuUsagePercent}%`,
    cpuLoadText: cpuLoad.map((value) => value.toFixed(2)).join(' / '),
    cpuCoreCount: os.cpus().length,
    ...responseMetrics
  };
}

function renderMonitoringPage(res, config) {
  return res.render('pages/system/monitoring', {
    activePage: config.activePage,
    pageTitle: config.pageTitle,
    monitoringTitle: config.monitoringTitle,
    monitoringDescription: config.monitoringDescription,
    monitoringMetrics: config.monitoringMetrics,
    primaryPanelTitle: config.primaryPanelTitle,
    primaryPanelDescription: config.primaryPanelDescription,
    primaryRows: config.primaryRows,
    secondaryPanelTitle: config.secondaryPanelTitle,
    secondaryPanelDescription: config.secondaryPanelDescription,
    secondaryRows: config.secondaryRows
  });
}

function getFlash(req) {
  return {
    flashMessage: req.query.message ?? null,
    flashType: req.query.type ?? 'info'
  };
}

function renderProfilePage(res, config) {
  return res.render('pages/system/profile', {
    pageTitle: config.pageTitle,
    profileSummary: config.profileSummary,
    accountFields: config.accountFields,
    passwordFields: config.passwordFields,
    accountAction: config.accountAction,
    passwordAction: config.passwordAction,
    accountErrors: config.accountErrors ?? {},
    passwordErrors: config.passwordErrors ?? {},
    accountErrorSummary: config.accountErrorSummary ?? [],
    passwordErrorSummary: config.passwordErrorSummary ?? [],
    flashMessage: config.flashMessage ?? null,
    flashType: config.flashType ?? 'info'
  });
}

async function getProfileContext(req) {
  const userId = req.session?.user?.id ?? null;
  if (!userId) {
    return null;
  }

  const [user, roles] = await Promise.all([
    userRepository.findById(userId),
    userRepository.findRolesByUserId(userId)
  ]);

  if (!user) {
    return null;
  }

  const primaryRole = roles[0] ?? null;

  return {
    user,
    roles,
    primaryRole
  };
}

function buildProfileSummary(context) {
  return [
    { label: 'Username', value: context.user.username ?? '-' },
    { label: 'Email', value: context.user.email ?? '-' },
    { label: 'Role', value: context.primaryRole?.display_name ?? context.primaryRole?.name ?? 'User' }
  ];
}

function buildSessionUserFromContext(currentSessionUser, context, extra = {}) {
  const primaryRole = context.primaryRole ?? currentSessionUser?.primaryRole ?? null;

  return {
    ...currentSessionUser,
    ...extra,
    id: context.user.id,
    full_name: context.user.full_name,
    email: context.user.email,
    assigned_warehouse_id: context.user.assigned_warehouse_id ?? null,
    primaryRole,
    roles: context.roles,
    role: primaryRole?.name ?? currentSessionUser?.role ?? null
  };
}

async function showMonitoringOverview(req, res) {
  const healthSnapshot = await healthController.getHealthSnapshot().catch(() => ({
    status: 'degraded',
    database: 'unavailable',
    timestamp: new Date().toISOString()
  }));
  const serverResources = getServerResources(req);

  return renderMonitoringPage(res, {
    activePage: 'monitoring-overview',
    pageTitle: 'Monitoring',
    monitoringTitle: 'Monitoring',
    monitoringDescription: 'Pantau status sistem inti tanpa membuka halaman yang terlalu panjang.',
    monitoringMetrics: [
      { label: 'Service Status', value: healthSnapshot.status === 'ok' ? 'Aktif' : 'Perlu perhatian' },
      { label: 'Database', value: healthSnapshot.database === 'connected' ? 'Terhubung' : 'Tidak tersedia' },
      { label: 'Avg Response', value: `${serverResources.avgResponseTimeMs} ms` },
      { label: 'Memory Usage', value: `${serverResources.memoryUsagePercent}%` }
    ],
    primaryPanelTitle: 'Ringkasan Sistem',
    primaryPanelDescription: 'Status cepat untuk service utama dan request yang baru berjalan.',
    primaryRows: [
      { label: 'Service', value: healthSnapshot.status === 'ok' ? 'Aktif' : 'Perlu perhatian', tone: healthSnapshot.status === 'ok' ? 'success' : 'warning' },
      { label: 'Database', value: healthSnapshot.database === 'connected' ? 'Terhubung' : 'Tidak tersedia', tone: healthSnapshot.database === 'connected' ? 'success' : 'warning' },
      { label: 'Rata-rata response', value: `${serverResources.avgResponseTimeMs} ms`, tone: 'neutral' },
      { label: 'Request tercatat', value: String(serverResources.requestCount), tone: 'neutral' }
    ],
    secondaryPanelTitle: 'Akses Cepat',
    secondaryPanelDescription: 'Buka subpage monitoring untuk detail yang lebih spesifik.',
    secondaryRows: [
      { label: 'System Health', value: 'Lihat status service dan database', href: '/monitoring/health' },
      { label: 'Server Resources', value: 'Lihat CPU, memory, dan uptime', href: '/monitoring/resources' },
      { label: 'Audit Logs', value: 'Lihat jejak aktivitas user', href: '/audit-logs' }
    ]
  });
}

async function showMonitoringHealth(req, res) {
  const healthSnapshot = await healthController.getHealthSnapshot().catch(() => ({
    status: 'degraded',
    database: 'unavailable',
    timestamp: new Date().toISOString()
  }));
  const responseMetrics = getResponseMetrics(req);

  return renderMonitoringPage(res, {
    activePage: 'monitoring-health',
    pageTitle: 'System Health',
    monitoringTitle: 'System Health',
    monitoringDescription: 'Status service utama dan koneksi database untuk validasi cepat.',
    monitoringMetrics: [
      { label: 'Service', value: healthSnapshot.status === 'ok' ? 'Aktif' : 'Degraded' },
      { label: 'Database', value: healthSnapshot.database === 'connected' ? 'Connected' : 'Unavailable' },
      { label: 'Last Check', value: new Date(healthSnapshot.timestamp).toLocaleTimeString('id-ID') }
    ],
    primaryPanelTitle: 'Health Snapshot',
    primaryPanelDescription: 'Snapshot ini memakai sumber data yang sama dengan endpoint `/health`.',
    primaryRows: [
      { label: 'Aplikasi', value: healthSnapshot.status === 'ok' ? 'Aktif' : 'Perlu perhatian', tone: healthSnapshot.status === 'ok' ? 'success' : 'warning' },
      { label: 'PostgreSQL', value: healthSnapshot.database === 'connected' ? 'Terhubung' : 'Tidak tersedia', tone: healthSnapshot.database === 'connected' ? 'success' : 'warning' },
      { label: 'Pemeriksaan terakhir', value: new Date(healthSnapshot.timestamp).toLocaleString('id-ID'), tone: 'neutral' }
    ],
    secondaryPanelTitle: 'Response Metrics',
    secondaryPanelDescription: 'Ringkasan sederhana dari request yang diproses aplikasi.',
    secondaryRows: [
      { label: 'Rata-rata response', value: `${responseMetrics.avgResponseTimeMs} ms` },
      { label: 'Response terakhir', value: `${responseMetrics.lastResponseTimeMs} ms` },
      { label: 'Request tercatat', value: String(responseMetrics.requestCount) },
      { label: 'Update terakhir', value: responseMetrics.lastRequestAt ? new Date(responseMetrics.lastRequestAt).toLocaleString('id-ID') : '-' }
    ]
  });
}

function showMonitoringResources(req, res) {
  const resources = getServerResources(req);

  return renderMonitoringPage(res, {
    activePage: 'monitoring-resources',
    pageTitle: 'Server Resources',
    monitoringTitle: 'Server Resources',
    monitoringDescription: 'Pantau resource server dasar tanpa panel teknis yang terlalu berat.',
    monitoringMetrics: [
      { label: 'CPU Usage', value: resources.cpuUsageText },
      { label: 'Memory Used', value: resources.usedMemoryText },
      { label: 'Uptime', value: resources.uptimeText },
      { label: 'Cores', value: String(resources.cpuCoreCount) }
    ],
    primaryPanelTitle: 'Resource Snapshot',
    primaryPanelDescription: 'Data ini dibaca langsung dari host server dan proses Node.js yang sedang berjalan.',
    primaryRows: [
      { label: 'Hostname', value: resources.hostname },
      { label: 'Platform', value: resources.platform },
      { label: 'CPU usage', value: resources.cpuUsageText },
      { label: 'CPU load average', value: resources.cpuLoadText },
      { label: 'CPU cores', value: String(resources.cpuCoreCount) },
      { label: 'Memory terpakai', value: `${resources.usedMemoryText} (${resources.memoryUsagePercent}%)` },
      { label: 'Memory bebas', value: resources.freeMemoryText },
      { label: 'Total memory', value: resources.totalMemoryText }
    ],
    secondaryPanelTitle: 'Runtime',
    secondaryPanelDescription: 'Ringkasan kecil untuk runtime aplikasi yang sedang berjalan.',
    secondaryRows: [
      { label: 'System uptime', value: resources.uptimeText },
      { label: 'Process RSS', value: resources.processMemoryText },
      { label: 'Heap used', value: resources.heapUsedText },
      { label: 'Rata-rata response', value: `${resources.avgResponseTimeMs} ms` },
      { label: 'Response terakhir', value: `${resources.lastResponseTimeMs} ms` },
      { label: 'Request tercatat', value: String(resources.requestCount) }
    ]
  });
}

async function showProfile(req, res) {
  const context = await getProfileContext(req);

  if (!context) {
    return res.status(404).render('pages/not-found', { pageTitle: 'Profile Not Found' });
  }

  return renderProfilePage(res, {
    pageTitle: 'Profile',
    profileSummary: buildProfileSummary(context),
    accountFields: [
      { name: 'full_name', label: 'Full Name', type: 'text', required: true, value: context.user.full_name ?? '' },
      { name: 'username', label: 'Username', type: 'text', required: true, value: context.user.username ?? '' },
      { name: 'email', label: 'Email', type: 'email', required: false, value: context.user.email ?? '' }
    ],
    passwordFields: [
      { name: 'current_password', label: 'Current Password', type: 'password', required: true, value: '' },
      { name: 'new_password', label: 'New Password', type: 'password', required: true, value: '' },
      { name: 'password_confirmation', label: 'Confirm Password', type: 'password', required: true, value: '' }
    ],
    accountAction: '/profile',
    passwordAction: '/profile/password',
    ...getFlash(req)
  });
}

async function updateProfile(req, res) {
  const context = await getProfileContext(req);

  if (!context) {
    return res.status(404).render('pages/not-found', { pageTitle: 'Profile Not Found' });
  }

  const validation = validateAccountUpdatePayload(req.body);

  if (!validation.valid) {
    return renderProfilePage(res, {
      pageTitle: 'Profile',
      profileSummary: buildProfileSummary(context),
      accountFields: [
        { name: 'full_name', label: 'Full Name', type: 'text', required: true, value: req.body.full_name ?? '', error: validation.errors.full_name ?? null },
        { name: 'username', label: 'Username', type: 'text', required: true, value: req.body.username ?? '', error: validation.errors.username ?? null },
        { name: 'email', label: 'Email', type: 'email', required: false, value: req.body.email ?? '', error: validation.errors.email ?? null }
      ],
      passwordFields: [
        { name: 'current_password', label: 'Current Password', type: 'password', required: true, value: '' },
        { name: 'new_password', label: 'New Password', type: 'password', required: true, value: '' },
        { name: 'password_confirmation', label: 'Confirm Password', type: 'password', required: true, value: '' }
      ],
      accountAction: '/profile',
      passwordAction: '/profile/password',
      flashMessage: 'Validation failed',
      flashType: 'danger',
      accountErrors: validation.errors,
      accountErrorSummary: Object.values(validation.errors)
    });
  }

  const duplicateUsername = await userRepository.findByUsername(validation.value.username);
  if (duplicateUsername && Number(duplicateUsername.id) !== Number(context.user.id)) {
    return renderProfilePage(res, {
      pageTitle: 'Profile',
      profileSummary: buildProfileSummary(context),
      accountFields: [
        { name: 'full_name', label: 'Full Name', type: 'text', required: true, value: req.body.full_name ?? '' },
        { name: 'username', label: 'Username', type: 'text', required: true, value: req.body.username ?? '', error: 'Username sudah digunakan' },
        { name: 'email', label: 'Email', type: 'email', required: false, value: req.body.email ?? '' }
      ],
      passwordFields: [
        { name: 'current_password', label: 'Current Password', type: 'password', required: true, value: '' },
        { name: 'new_password', label: 'New Password', type: 'password', required: true, value: '' },
        { name: 'password_confirmation', label: 'Confirm Password', type: 'password', required: true, value: '' }
      ],
      accountAction: '/profile',
      passwordAction: '/profile/password',
      flashMessage: 'Username sudah digunakan',
      flashType: 'danger',
      accountErrors: { username: 'Username sudah digunakan' },
      accountErrorSummary: ['Username sudah digunakan']
    });
  }

  const duplicateEmail = validation.value.email ? await userRepository.findByEmail(validation.value.email) : null;
  if (duplicateEmail && Number(duplicateEmail.id) !== Number(context.user.id)) {
    return renderProfilePage(res, {
      pageTitle: 'Profile',
      profileSummary: buildProfileSummary(context),
      accountFields: [
        { name: 'full_name', label: 'Full Name', type: 'text', required: true, value: req.body.full_name ?? '' },
        { name: 'username', label: 'Username', type: 'text', required: true, value: req.body.username ?? '' },
        { name: 'email', label: 'Email', type: 'email', required: false, value: req.body.email ?? '', error: 'Email sudah digunakan' }
      ],
      passwordFields: [
        { name: 'current_password', label: 'Current Password', type: 'password', required: true, value: '' },
        { name: 'new_password', label: 'New Password', type: 'password', required: true, value: '' },
        { name: 'password_confirmation', label: 'Confirm Password', type: 'password', required: true, value: '' }
      ],
      accountAction: '/profile',
      passwordAction: '/profile/password',
      flashMessage: 'Email sudah digunakan',
      flashType: 'danger',
      accountErrors: { email: 'Email sudah digunakan' },
      accountErrorSummary: ['Email sudah digunakan']
    });
  }

  const currentUserSnapshot = {
    id: context.user.id,
    full_name: context.user.full_name,
    username: context.user.username,
    email: context.user.email,
    assigned_warehouse_id: context.user.assigned_warehouse_id,
    is_active: context.user.is_active,
    primaryRole: context.primaryRole,
    roles: context.roles
  };

  const updatedUser = await database.transaction(async (trx) => {
    const user = await userRepository.updateUser(
      context.user.id,
      {
        full_name: validation.value.full_name,
        username: validation.value.username,
        email: validation.value.email,
        assigned_warehouse_id: context.user.assigned_warehouse_id,
        is_active: context.user.is_active
      },
      trx
    );

    await auditLogService.logAction(
      auditLogService.buildAuditPayload(req.session?.user ?? null, req, {
        action: 'PROFILE_UPDATED',
        entity_type: 'user',
        entity_id: user.id,
        old_value: currentUserSnapshot,
        new_value: user
      }),
      trx
    );

    return user;
  });

  if (req.session?.user) {
    req.session.user = buildSessionUserFromContext(req.session.user, {
      user: updatedUser,
      roles: context.roles,
      primaryRole: context.primaryRole
    });
  }

  return res.redirect('/profile?type=success&message=Profil%20berhasil%20diperbarui');
}

async function changePassword(req, res) {
  const context = await getProfileContext(req);

  if (!context) {
    return res.status(404).render('pages/not-found', { pageTitle: 'Profile Not Found' });
  }

  const validation = validatePasswordChangePayload(req.body);

  if (!validation.valid) {
    return renderProfilePage(res, {
      pageTitle: 'Profile',
      profileSummary: buildProfileSummary(context),
      accountFields: [
        { name: 'full_name', label: 'Full Name', type: 'text', required: true, value: context.user.full_name ?? '' },
        { name: 'username', label: 'Username', type: 'text', required: true, value: context.user.username ?? '' },
        { name: 'email', label: 'Email', type: 'email', required: false, value: context.user.email ?? '' }
      ],
      passwordFields: [
        { name: 'current_password', label: 'Current Password', type: 'password', required: true, value: '' },
        { name: 'new_password', label: 'New Password', type: 'password', required: true, value: '' },
        { name: 'password_confirmation', label: 'Confirm Password', type: 'password', required: true, value: '' }
      ],
      accountAction: '/profile',
      passwordAction: '/profile/password',
      flashMessage: 'Validation failed',
      flashType: 'danger',
      passwordErrors: validation.errors,
      passwordErrorSummary: Object.values(validation.errors)
    });
  }

  const passwordMatches = await verifyPassword(validation.value.current_password, context.user.password_hash);
  if (!passwordMatches) {
    return renderProfilePage(res, {
      pageTitle: 'Profile',
      profileSummary: buildProfileSummary(context),
      accountFields: [
        { name: 'full_name', label: 'Full Name', type: 'text', required: true, value: context.user.full_name ?? '' },
        { name: 'username', label: 'Username', type: 'text', required: true, value: context.user.username ?? '' },
        { name: 'email', label: 'Email', type: 'email', required: false, value: context.user.email ?? '' }
      ],
      passwordFields: [
        { name: 'current_password', label: 'Current Password', type: 'password', required: true, value: '' },
        { name: 'new_password', label: 'New Password', type: 'password', required: true, value: '' },
        { name: 'password_confirmation', label: 'Confirm Password', type: 'password', required: true, value: '' }
      ],
      accountAction: '/profile',
      passwordAction: '/profile/password',
      flashMessage: 'Password saat ini salah',
      flashType: 'danger',
      passwordErrors: { current_password: 'Password saat ini salah' },
      passwordErrorSummary: ['Password saat ini salah']
    });
  }

  try {
    await database.transaction(async (trx) => {
      const passwordHash = await hashPassword(validation.value.new_password);
      await userRepository.updatePassword(context.user.id, passwordHash, trx);
      await auditLogService.logAction(
        auditLogService.buildAuditPayload(req.session?.user ?? null, req, {
          action: 'PROFILE_PASSWORD_CHANGED',
          entity_type: 'user',
          entity_id: context.user.id,
          old_value: null,
          new_value: { password_changed: true }
        }),
        trx
      );
    });
  } catch (error) {
    return renderProfilePage(res, {
      pageTitle: 'Profile',
      profileSummary: buildProfileSummary(context),
      accountFields: [
        { name: 'full_name', label: 'Full Name', type: 'text', required: true, value: context.user.full_name ?? '' },
        { name: 'username', label: 'Username', type: 'text', required: true, value: context.user.username ?? '' },
        { name: 'email', label: 'Email', type: 'email', required: false, value: context.user.email ?? '' }
      ],
      passwordFields: [
        { name: 'current_password', label: 'Current Password', type: 'password', required: true, value: '' },
        { name: 'new_password', label: 'New Password', type: 'password', required: true, value: '' },
        { name: 'password_confirmation', label: 'Confirm Password', type: 'password', required: true, value: '' }
      ],
      accountAction: '/profile',
      passwordAction: '/profile/password',
      flashMessage: error.message || 'Gagal memperbarui password',
      flashType: 'danger',
      passwordErrors: { new_password: error.message || 'Gagal memperbarui password' },
      passwordErrorSummary: [error.message || 'Gagal memperbarui password']
    });
  }

  return res.redirect('/profile?type=success&message=Password%20berhasil%20diperbarui');
}

module.exports = {
  showMonitoringOverview,
  showMonitoringHealth,
  showMonitoringResources,
  showProfile,
  updateProfile,
  changePassword
};
