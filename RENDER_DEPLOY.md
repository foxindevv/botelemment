# 🎨 Render Deployment Guide

## ⚠️ Important Note About Render Free Tier

**Render's free tier has a limitation:**
- ❌ Services stop after **15 minutes of inactivity**
- ❌ This means your bot will go offline if there's no activity
- ⚠️ **Not ideal for a Matrix bot** that needs to stay online 24/7

**Better alternatives:**
- ✅ **Railway** - $5 free credit/month (recommended)
- ✅ **Fly.io** - 3 free VMs, runs 24/7
- ✅ **Oracle Cloud** - Free VPS forever

**But if you still want to use Render**, here's how:

---

## 🚀 Render Deployment Steps

### Step 1: Create Render Account

1. Go to [render.com](https://render.com)
2. Sign up with GitHub (free)
3. Verify your email

### Step 2: Create New Web Service

1. Click **"New +"** → **"Web Service"**
2. Connect your GitHub account (if not already)
3. Select repository: `foxindevv/botelemment`
4. Click **"Connect"**

### Step 3: Configure Service

Fill in the settings:

- **Name**: `matrix-bot` (or any name)
- **Region**: Choose closest to you
- **Branch**: `main`
- **Root Directory**: Leave empty (or `.` if needed)
- **Environment**: `Node`
- **Build Command**: `npm install`
- **Start Command**: `node bot.js`

### Step 4: Set Environment Variables

Click **"Advanced"** → **"Add Environment Variable"**, add:

```env
HOMESERVER_URL=https://matrix.org
ACCESS_TOKEN=your_access_token_here
ADMIN_USERS=@yourusername:matrix.org,@admin2:matrix.org
DEFAULT_ROLE=Neverificat
VERIFICATION_CONTACTS=@admin1:matrix.org,admin@example.com
DEALER_DOMAIN=nwo1.xyz
BOT_DISPLAY_NAME=bot
IGNORED_ROOMS=
```

**Important:**
- Get `ACCESS_TOKEN` from Element: Settings → Help & About → Access Token
- Replace all placeholder values with your actual values

### Step 5: Deploy

1. Click **"Create Web Service"**
2. Render will start building and deploying
3. Wait for deployment to complete (2-5 minutes)
4. Check logs to see if bot connected

### Step 6: Check Logs

1. In Render dashboard, click on your service
2. Go to **"Logs"** tab
3. Look for: `✅ Bot connected` or similar success messages
4. Check for any errors

---

## 🔄 Keep Bot Alive (Workaround for Free Tier)

Since Render stops after inactivity, you have a few options:

### Option 1: Upgrade to Paid Plan
- **Starter Plan**: $7/month
- Bot runs 24/7 without stopping

### Option 2: Use GitHub Actions (Free & Automated) ⭐ RECOMMENDED

**Best option!** The bot includes a GitHub Action that automatically pings your Render service every 10 minutes.

**How to set up:**
1. Get your Render service URL (e.g., `https://matrix-bot.onrender.com`)
2. Go to your GitHub repo → **Settings** → **Secrets and variables** → **Actions**
3. Click **"New repository secret"**:
   - **Name**: `RENDER_URL`
   - **Value**: Your Render service URL
4. The workflow (`.github/workflows/ping-render.yml`) will automatically run every 10 minutes
5. Done! Your service will stay alive automatically

**Or edit the workflow file directly:**
- Edit `.github/workflows/ping-render.yml`
- Replace `https://your-bot.onrender.com` with your Render URL
- Commit and push

### Option 3: Use Uptime Monitor (Free)
- Set up an uptime monitor (like [UptimeRobot](https://uptimerobot.com))
- Configure it to ping your Render service every 10 minutes
- This keeps the service "active" and prevents it from stopping

**How to set up:**
1. In Render dashboard, get your service URL (e.g., `https://matrix-bot.onrender.com`)
2. Sign up for [UptimeRobot](https://uptimerobot.com) (free)
3. Add a new monitor:
   - **Monitor Type**: HTTP(s)
   - **URL**: Your Render service URL + `/health` (e.g., `https://matrix-bot.onrender.com/health`)
   - **Interval**: 5 minutes
4. This will ping your service every 5 minutes, keeping it alive

### Option 3: Switch to Railway or Fly.io
- Both have better free tiers for bots
- See `RAILWAY_DEPLOY.md` or `HOSTING.md` for alternatives

---

## 🌐 Custom Domain (Optional)

### Step 1: Add Domain in Render

1. In Render dashboard → Your service → **Settings**
2. Scroll to **"Custom Domains"**
3. Click **"Add Custom Domain"**
4. Enter your domain: `bot.nwo1.xyz`
5. Render will show DNS records to add

### Step 2: Configure DNS

In your domain DNS (nwo1.xyz):

```
Type: CNAME
Name: bot
Value: your-service.onrender.com
TTL: Auto
```

### Step 3: Wait for SSL

Render automatically provisions SSL certificates. Wait 5-10 minutes.

**Note:** This is just for DNS/SSL. Your bot connects via Matrix protocol, not HTTP.

---

## 🔍 Troubleshooting

### Bot Stops After 15 Minutes

**Problem:** Render free tier stops services after inactivity.

**Solutions:**
1. Set up UptimeRobot to ping your service (see above)
2. Upgrade to paid plan ($7/month)
3. Switch to Railway or Fly.io (better free options)

### Bot Not Starting

1. Check **Logs** tab in Render dashboard
2. Verify all environment variables are set correctly
3. Check `ACCESS_TOKEN` is valid (not expired)
4. Verify `HOMESERVER_URL` is correct

### Build Fails

1. Check **Logs** for build errors
2. Verify `package.json` exists and is valid
3. Make sure `node bot.js` is the correct start command
4. Check Node.js version compatibility

### Bot Can't Connect to Matrix

1. Verify `HOMESERVER_URL` is accessible
2. Check token is valid (get new one from Element if needed)
3. Verify bot account exists on homeserver
4. Check Render logs for connection errors

---

## 📊 Render vs Other Platforms

| Platform | Free Tier | 24/7 Uptime | Best For |
|----------|-----------|-------------|----------|
| **Render** | ✅ Yes | ❌ No (stops after 15min) | Testing, dev |
| **Railway** | ✅ $5 credit/month | ✅ Yes | Production bots |
| **Fly.io** | ✅ 3 VMs free | ✅ Yes | Production bots |
| **Oracle Cloud** | ✅ Free VPS | ✅ Yes | Full control |

---

## ✅ Checklist

- [ ] Created Render account
- [ ] Connected GitHub repository
- [ ] Created Web Service
- [ ] Set build command: `npm install`
- [ ] Set start command: `node bot.js`
- [ ] Added all environment variables
- [ ] Deployed service
- [ ] Checked logs for successful connection
- [ ] Set up UptimeRobot (to keep service alive on free tier)
- [ ] Tested bot in Element

---

## 💡 Recommendation

**For a Matrix bot that needs to stay online:**

1. **Best option**: Use **Railway** (see `RAILWAY_DEPLOY.md`)
   - $5 free credit/month
   - Runs 24/7
   - Auto-deploys from GitHub

2. **Second best**: Use **Fly.io** (see `HOSTING.md`)
   - 3 free VMs
   - Runs 24/7
   - More generous free tier

3. **Render**: Only if you:
   - Set up UptimeRobot to keep it alive
   - Or upgrade to paid plan
   - Or just need it for testing

---

## 🚀 Next Steps

1. Deploy to Render (follow steps above)
2. **Set up GitHub Action ping** (recommended - see Option 2 above) OR UptimeRobot to keep it alive
3. Test bot in Element
4. Verify health endpoint works: Visit `https://your-bot.onrender.com/health`
5. Consider switching to Railway/Fly.io for production (better free tiers)

**Your bot should be running! Check Render logs to confirm connection.**
