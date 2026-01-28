# 🔧 Netlify TOML Configuration Fix

## ❌ Error Fixed

```
Can't redefine an existing key at row 11, col 12, pos 258:
[[functions]]
```

## 🐛 Problem

The `netlify.toml` had a TOML syntax error - we can't have both `[functions]` and `[[functions]]` sections in the same file.

## ✅ Solution

### 1. Fixed netlify.toml
Removed the conflicting `[[functions]]` section. The file now has:
```toml
[functions]
  node_bundler = "esbuild"
```

### 2. Configure Schedule in Netlify Dashboard Instead

**After deployment**, configure the schedule through Netlify's UI:

1. Go to your Netlify dashboard
2. Navigate to: **Site settings > Functions**
3. Find `scheduled-tasks` in the list
4. Click on it and select **"Add trigger"** or **"Edit settings"**
5. Set the schedule: `0 * * * *` (runs every hour at minute 0)
6. Save

### Alternative: Netlify CLI Method

You can also use `netlify.toml` with the correct syntax for scheduled functions:

```toml
[functions."scheduled-tasks"]
  schedule = "@hourly"
```

Or:

```toml
[functions."scheduled-tasks"]
  schedule = "0 * * * *"
```

## 🚀 Deploy Now

```bash
git add netlify.toml netlify/functions/scheduled-tasks.js
git commit -m "Fix netlify.toml syntax error for scheduled functions"
git push origin main
```

## ⚠️ Important Notes

1. **First Deployment**: The function must be deployed first before you can configure its schedule in the dashboard
2. **Schedule Format**: Use cron syntax (e.g., `0 * * * *` = every hour)
3. **Common Schedules**:
   - `@hourly` = Every hour
   - `@daily` = Every day at midnight
   - `0 */2 * * *` = Every 2 hours
   - `0 8 * * *` = Every day at 8 AM
   - `0 18 * * *` = Every day at 6 PM

## ✅ Verification

After deployment:
1. Check **Netlify Dashboard > Functions**
2. Verify `scheduled-tasks` appears
3. Configure schedule in dashboard
4. Wait for next scheduled time or use manual trigger
5. Check function logs to verify execution

## 📝 What Changed

- ✅ Removed conflicting `[[functions]]` from netlify.toml
- ✅ Added schedule info as comments in scheduled-tasks.js
- ✅ Schedule now configured via Netlify dashboard

---

**Status**: ✅ Ready to deploy (error fixed!)
