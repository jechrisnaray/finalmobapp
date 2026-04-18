import { query, mutation } from './_generated/server';
import { v } from 'convex/values';

// Get habit logs for a user on a specific date
export const getLogsByDate = query({
  args: {
    userId: v.id('users'),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('habitLogs')
      .withIndex('by_user_and_date', (q) =>
        q.eq('userId', args.userId).eq('date', args.date)
      )
      .collect();
  },
});

// Get habit logs for a specific habit within a date range
export const getLogsByHabit = query({
  args: {
    habitId: v.id('habits'),
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    const logs = await ctx.db
      .query('habitLogs')
      .withIndex('by_habit_and_date', (q) =>
        q.eq('habitId', args.habitId).gte('date', args.startDate).lte('date', args.endDate)
      )
      .collect();
    return logs;
  },
});

// Toggle a habit log (check/uncheck)
export const toggleHabitLog = mutation({
  args: {
    habitId: v.id('habits'),
    userId: v.id('users'),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if log already exists
    const existing = await ctx.db
      .query('habitLogs')
      .withIndex('by_habit_and_date', (q) =>
        q.eq('habitId', args.habitId).eq('date', args.date)
      )
      .filter((q) => q.eq(q.field('userId'), args.userId))
      .unique();

    if (existing) {
      if (existing.isDone) {
        // If done, delete the log (uncheck)
        await ctx.db.delete(existing._id);
        return { action: 'unchecked', logId: null };
      } else {
        // If exists but not done, mark as done
        await ctx.db.patch(existing._id, { isDone: true });
        return { action: 'checked', logId: existing._id };
      }
    } else {
      // Create new log as done
      const logId = await ctx.db.insert('habitLogs', {
        habitId: args.habitId,
        userId: args.userId,
        date: args.date,
        isDone: true,
      });
      return { action: 'checked', logId };
    }
  },
});



// Get completion stats for a user (today)
export const getTodayStats = query({
  args: {
    userId: v.id('users'),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    // Get all habits for user
    const habits = await ctx.db
      .query('habits')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .collect();

    // Get today's logs
    const logs = await ctx.db
      .query('habitLogs')
      .withIndex('by_user_and_date', (q) =>
        q.eq('userId', args.userId).eq('date', args.date)
      )
      .filter((q) => q.eq(q.field('isDone'), true))
      .collect();

    return {
      totalHabits: habits.length,
      completedToday: logs.length,
    };
  },
});
