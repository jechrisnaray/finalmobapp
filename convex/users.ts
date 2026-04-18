import { query, mutation } from './_generated/server';
import { v } from 'convex/values';

// Get user by ID
export const getUser = query({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

// Get user by name
export const getUserByName = query({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('users')
      .withIndex('by_name', (q) => q.eq('name', args.name))
      .unique();
  },
});

// Update user profile
export const updateUser = mutation({
  args: {
    userId: v.id('users'),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId, ...updates } = args;

    const cleanUpdates: Record<string, string> = {};
    if (updates.name !== undefined) cleanUpdates.name = updates.name;

    await ctx.db.patch(userId, cleanUpdates);
    return userId;
  },
});
