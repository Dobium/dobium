# Database Persistence Guide

## Current Setup

Your application uses **two databases**:

1. **Supabase** - For authentication and user profiles (cloud-hosted, always persistent)
2. **PostgreSQL** - For transactions and backend data (configured via `DATABASE_URL`)

## Why Your Database Might Reset

Your database is **NOT being reset by the code** - the issue is likely one of these:

### 1. Using Different Databases in Development vs Production
- **Development**: Local PostgreSQL (`postgresql://localhost:5432/samsa_dev`)
- **Production**: Different database or no database configured

### 2. Deployment Platform Resets
Some platforms reset ephemeral storage on each deployment if you don't use a persistent database.

## Solution: Ensure Production Database Persistence

### Option 1: Use Supabase PostgreSQL (Recommended)

Since you're already using Supabase for auth, use their PostgreSQL database:

1. **Get your Supabase database URL**:
   - Go to https://app.supabase.com/project/YOUR_PROJECT/settings/database
   - Copy the "Connection string" (URI format)
   - It looks like: `postgresql://postgres:[YOUR-PASSWORD]@db.xxx.supabase.co:5432/postgres`

2. **Set environment variable in your deployment platform**:
   ```
   DATABASE_URL=postgresql://postgres:[PASSWORD]@db.xxx.supabase.co:5432/postgres
   ```

3. **Your data will persist** because Supabase provides a permanent cloud database

### Option 2: Use Railway/Render PostgreSQL

1. **Railway**: Add PostgreSQL plugin, copy `DATABASE_URL`
2. **Render**: Create PostgreSQL database, copy connection string

### Option 3: Use Vercel + External Database

If deploying to Vercel, you MUST use an external database (Supabase, Railway, etc.) because Vercel is serverless and has no persistent storage.

## Verify Your Setup

### Check Current Database Configuration

Your code at `backend/lib/database/connection.js` shows:
```javascript
const sequelize = new Sequelize(
  process.env.DATABASE_URL || 'postgresql://localhost:5432/samsa_dev',
  // ...
);
```

This means:
- ✅ If `DATABASE_URL` is set → uses that database (persistent in production)
- ⚠️ If `DATABASE_URL` is NOT set → uses local database (only works locally)

### Database Sync Settings

Your code at `backend/server.js` line 924:
```javascript
await sequelize.sync({ alter: false });
```

This is **SAFE** - it will:
- ✅ Create tables if they don't exist
- ✅ Keep existing data intact
- ❌ NEVER drop or reset tables

## Action Items

1. **Set `DATABASE_URL` in your deployment environment**
   - Use Supabase, Railway, Render, or another PostgreSQL provider
   - Add the environment variable to your deployment platform

2. **Verify in production**:
   - Check your deployment platform's environment variables
   - Ensure `DATABASE_URL` points to a persistent database

3. **Test**:
   - Deploy your app
   - Create some test data
   - Redeploy (push new changes)
   - Verify data is still there

## Common Deployment Platforms

### Vercel
- Environment Variables → Add `DATABASE_URL`
- Must use external database (Supabase recommended)

### Render
- Environment → Add `DATABASE_URL`
- Can use Render's PostgreSQL or external

### Railway
- Variables → Add `DATABASE_URL`
- Can use Railway's PostgreSQL plugin

### Heroku
- Config Vars → Add `DATABASE_URL`
- Can use Heroku Postgres add-on

## Important Notes

- ✅ Your code is **already configured correctly** to prevent resets
- ✅ The `{ alter: false }` setting ensures data safety
- ⚠️ You just need to ensure `DATABASE_URL` points to a **persistent production database**
- ⚠️ Never use `{ force: true }` in production (this would reset the database)

## Need Help?

If data is still resetting after setting `DATABASE_URL`, check:
1. Is the environment variable actually set in production?
2. Is the database connection successful? (check deployment logs)
3. Are you looking at the same database in dev vs production?
