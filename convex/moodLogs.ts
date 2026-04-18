import { query, mutation } from './_generated/server';
import { v } from 'convex/values';

// Get mood log for a specific date
export const getMoodByDate = query({
  args: {
    userId: v.id('users'),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('moodLogs')
      .withIndex('by_user_and_date', (q) =>
        q.eq('userId', args.userId).eq('date', args.date)
      )
      .unique();
  },
});

// Get weekly mood data (last 7 days)
export const getWeeklyMoods = query({
  args: {
    userId: v.id('users'),
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('moodLogs')
      .withIndex('by_user_and_date', (q) =>
        q.eq('userId', args.userId).gte('date', args.startDate).lte('date', args.endDate)
      )
      .collect();
  },
});

// Create or update mood log for today
export const createMoodLog = mutation({
  args: {
    userId: v.id('users'),
    mood: v.number(),
    note: v.optional(v.string()),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    // Validate mood range
    if (args.mood < 1 || args.mood > 5) {
      throw new Error('Mood harus antara 1-5');
    }

    // Check if mood already logged for this date
    const existing = await ctx.db
      .query('moodLogs')
      .withIndex('by_user_and_date', (q) =>
        q.eq('userId', args.userId).eq('date', args.date)
      )
      .unique();

    if (existing) {
      // Update existing mood log
      await ctx.db.patch(existing._id, {
        mood: args.mood,
        note: args.note,
      });
      return existing._id;
    }

    // Create new mood log
    const logId = await ctx.db.insert('moodLogs', {
      userId: args.userId,
      mood: args.mood,
      note: args.note,
      date: args.date,
    });
    return logId;
  },
});

// Get mood history (last N entries)
export const getMoodHistory = query({
  args: {
    userId: v.id('users'),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 30;
    return await ctx.db
      .query('moodLogs')
      .withIndex('by_user_and_date', (q) => q.eq('userId', args.userId))
      .order('desc')
      .take(limit);
  },
});

// Get average mood for a date range
export const getAverageMood = query({
  args: {
    userId: v.id('users'),
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    const moods = await ctx.db
      .query('moodLogs')
      .withIndex('by_user_and_date', (q) =>
        q.eq('userId', args.userId).gte('date', args.startDate).lte('date', args.endDate)
      )
      .collect();

    if (moods.length === 0) return null;

    const total = moods.reduce((sum, m) => sum + m.mood, 0);
    return {
      average: Math.round((total / moods.length) * 10) / 10,
      count: moods.length,
    };
  },
});
