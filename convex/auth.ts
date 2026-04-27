import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

/**
 * SHA-256 password hashing with per-user salt.
 * Uses the Web Crypto API available in Convex runtime.
 */
async function hashPassword(password: string, salt?: string): Promise<string> {
  const usedSalt = salt ?? crypto.randomUUID();
  const data = new TextEncoder().encode(usedSalt + password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  return `sha256:${usedSalt}:${hashHex}`;
}

async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  // Support legacy simpleHash format for existing users
  if (storedHash.startsWith('hs_')) {
    return storedHash === legacySimpleHash(password);
  }
  // SHA-256 format: "sha256:<salt>:<hash>"
  const parts = storedHash.split(':');
  if (parts.length !== 3 || parts[0] !== 'sha256') return false;
  const salt = parts[1];
  const expected = await hashPassword(password, salt);
  return expected === storedHash;
}

/** Legacy hash — kept only for backward compat with existing accounts */
function legacySimpleHash(password: string): string {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return `hs_${Math.abs(hash).toString(36)}_${password.length}`;
}

/**
 * Generate a cryptographically secure session token
 */
function generateToken(): string {
  return crypto.randomUUID() + '-' + crypto.randomUUID();
}

/**
 * Helper: delete all existing sessions for a user
 */
async function cleanupSessions(ctx: any, userId: any) {
  const oldSessions = await ctx.db
    .query('sessions')
    .withIndex('by_user', (q: any) => q.eq('userId', userId))
    .collect();
  for (const s of oldSessions) {
    await ctx.db.delete(s._id);
  }
}

// Register a new user
export const register = mutation({
  args: {
    name: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    // Validate
    if (args.name.trim().length < 2) {
      throw new Error('Nama minimal 2 karakter');
    }
    if (args.password.length < 6) {
      throw new Error('Password minimal 6 karakter');
    }

    // Check if name already exists
    const existing = await ctx.db
      .query('users')
      .withIndex('by_name', (q) => q.eq('name', args.name.trim()))
      .unique();

    if (existing) {
      throw new Error('Nama sudah terdaftar, gunakan nama lain');
    }

    // Create user with SHA-256 hashed password
    const passwordHash = await hashPassword(args.password);
    const userId = await ctx.db.insert('users', {
      name: args.name.trim(),
      passwordHash,
      createdAt: Date.now(),
    });

    // 🚀 AUTO-SEED: Create initial habits and 3 days of progress
    const initialHabits = [
      { title: 'Minum Air Putih', type: 'water', target: 8, unit: 'gelas', color: '#3B82F6', freq: 'daily' },
      { title: 'Istirahat Cukup', type: 'sleep', target: 8, unit: 'jam', color: '#8B5CF6', freq: 'daily' },
      { title: 'Olahraga (Sen, Rab, Jum)', type: 'exercise', target: 30, unit: 'menit', color: '#10B981', freq: 'custom', days: [1, 3, 5] },
      { title: 'Baca Buku (Sel, Kam)', type: 'general', color: '#F59E0B', freq: 'custom', days: [2, 4] },
      { title: 'Makan Sayur', type: 'general', color: '#EF4444', freq: 'daily' },
      { title: 'Review Mingguan', type: 'general', color: '#6366F1', freq: 'weekly' }, // Mingguan defaultnya hari ini/Minggu
    ];

    const habitIds = [];
    for (const h of initialHabits) {
      const id = await ctx.db.insert('habits', {
        userId,
        title: h.title,
        type: h.type as any ?? 'general',
        targetValue: (h as any).target,
        unit: (h as any).unit,
        color: h.color,
        frequency: h.freq as any,
        customDays: (h as any).days,
        createdAt: Date.now(),
      });
      habitIds.push(id);
    }

    // Create 3 days of logs
    const today = new Date();
    for (let i = 2; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayIndex = d.getDay(); // 0=Sun, 1=Mon, ...

      for (let j = 0; j < habitIds.length; j++) {
        const habitId = habitIds[j];
        const hConfig = initialHabits[j];

        // Check if habit is scheduled for this day
        let isScheduled = true;
        if (hConfig.freq === 'weekly') isScheduled = dayIndex === 0; // Sunday
        if (hConfig.freq === 'custom' && hConfig.days) isScheduled = hConfig.days.includes(dayIndex);

        if (isScheduled) {
          await ctx.db.insert('habit_progress', {
            userId,
            habitId,
            date: dateStr,
            isDone: Math.random() > 0.3,
            value: hConfig.type === 'general' ? 1 : Math.floor(Math.random() * 5) + 3,
          });
        }
      }
      
      // Add mood log (only if not already seeded for this date)
      const existingMood = await ctx.db
        .query('moodLogs')
        .withIndex('by_user_and_date', (q: any) => q.eq('userId', userId).eq('date', dateStr))
        .first();
      
      if (!existingMood) {
        await ctx.db.insert('moodLogs', {
          userId,
          mood: Math.floor(Math.random() * 3) + 3,
          date: dateStr,
        });
      }
    }

    // Create session (30 days expiry)
    const token = generateToken();
    await ctx.db.insert('sessions', {
      userId,
      token,
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
    });

    return { userId, token };
  },
});

// Login
export const login = mutation({
  args: {
    name: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_name', (q) => q.eq('name', args.name.trim()))
      .unique();

    if (!user) {
      throw new Error('Nama atau password salah');
    }

    // Verify password (supports both SHA-256 and legacy hash)
    const isValid = await verifyPassword(args.password, user.passwordHash);
    if (!isValid) {
      throw new Error('Nama atau password salah');
    }

    // If user still has legacy hash, upgrade to SHA-256
    if (user.passwordHash.startsWith('hs_')) {
      const newHash = await hashPassword(args.password);
      await ctx.db.patch(user._id, { passwordHash: newHash });
    }

    // Cleanup old sessions before creating new one
    await cleanupSessions(ctx, user._id);

    // Create session (30 days expiry)
    const token = generateToken();
    await ctx.db.insert('sessions', {
      userId: user._id,
      token,
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
    });

    return { userId: user._id, token, userName: user.name };
  },
});

// Verify session token
export const verifySession = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    if (!args.token) return null;

    const session = await ctx.db
      .query('sessions')
      .withIndex('by_token', (q) => q.eq('token', args.token))
      .unique();

    if (!session) return null;
    if (session.expiresAt < Date.now()) return null;

    const user = await ctx.db.get(session.userId);
    if (!user) return null;

    return {
      userId: user._id,
      name: user.name,
    };
  },
});

// Logout — delete session
export const logout = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query('sessions')
      .withIndex('by_token', (q) => q.eq('token', args.token))
      .unique();

    if (session) {
      await ctx.db.delete(session._id);
    }

    return { success: true };
  },
});
