# 🚂 Railway Deployment Guide

## Quick Setup

### 1. Connect GitHub Repository

1. Go to [railway.app](https://railway.app)
2. Sign up/Login with GitHub
3. Click **"New Project"** → **"Deploy from GitHub repo"**
4. Select your `botelemment` repository
5. Railway will automatically detect Node.js and start deploying

### 2. Configure Environment Variables

In Railway dashboard, go to your project → **Variables** tab, add:

```env
HOMESERVER_URL=https://matrix.org
ACCESS_TOKEN=your_access_token_here
ADMIN_USERS=@admin1:matrix.org,@admin2:matrix.org
DEFAULT_ROLE=Neverificat
VERIFICATION_CONTACTS=@admin1:example.com,admin@example.com
DEALER_DOMAIN=yourdomain.com
BOT_DISPLAY_NAME=bot
IGNORED_ROOMS=!roomid:matrix.org
```

**Important**: 
- Replace `ACCESS_TOKEN` with the token you got from Element
- Replace `ADMIN_USERS` with your Matrix user IDs
- Replace `DEALER_DOMAIN` with your domain

### 3. Set Start Command

1. Go to **Settings** → **Deploy**
2. Set **Start Command**: `node bot.js`
3. Railway will auto-restart on deploy

### 4. Deploy

Railway will automatically deploy when you push to GitHub. Or click **"Deploy"** manually.

---

## 🌐 Custom Domain Setup (Your Domain)

### Step 1: Get Railway Domain

1. In Railway dashboard, go to your service
2. Click **Settings** → **Networking**
3. Railway provides a default domain like: `your-app.up.railway.app`
4. Copy this domain (you'll need it for DNS)

### Step 2: Add Custom Domain in Railway

1. In **Settings** → **Networking**
2. Click **"Custom Domain"**
3. Enter your domain (e.g., `bot.yourdomain.com`)
4. Railway will show you DNS records to add

### Step 3: Configure DNS Records

Go to your domain registrar's DNS settings (e.g., Cloudflare, Namecheap, GoDaddy) and add:

#### Option A: CNAME Record (Recommended)

```
Type: CNAME
Name: bot (or @ for root domain, or subdomain you want)
Value: your-app.up.railway.app
TTL: Auto or 3600
```

**Example:**
- If you want `bot.yourdomain.com`:
  - Name: `bot`
  - Value: `your-app.up.railway.app`
  
- If you want `yourdomain.com` (root):
  - Name: `@` (or leave blank)
  - Value: `your-app.up.railway.app`

#### Option B: A Record (If Railway provides IP)

Railway usually uses CNAME, but if they provide an IP:

```
Type: A
Name: bot (or @)
Value: [Railway IP address]
TTL: Auto or 3600
```

### Step 4: SSL Certificate

Railway automatically provisions SSL certificates via Let's Encrypt. Wait 5-10 minutes after adding DNS records.

### Step 5: Verify

1. Check DNS propagation: [dnschecker.org](https://dnschecker.org)
2. Wait for SSL certificate (Railway dashboard will show status)
3. Your bot will be accessible at your custom domain

---

## 📋 DNS Configuration Examples

### Cloudflare

1. Login to Cloudflare
2. Select your domain
3. Go to **DNS** → **Records**
4. Click **Add record**:
   - **Type**: CNAME
   - **Name**: `bot` (or your subdomain)
   - **Target**: `your-app.up.railway.app`
   - **Proxy status**: DNS only (gray cloud) - **Important!**
   - **TTL**: Auto
5. Click **Save**

**Note**: Make sure the cloud is **gray** (DNS only), not orange (proxied), for Railway to work properly.

### Namecheap

1. Login to Namecheap
2. Go to **Domain List** → Select domain → **Advanced DNS**
3. Click **Add New Record**:
   - **Type**: CNAME Record
   - **Host**: `bot` (or your subdomain)
   - **Value**: `your-app.up.railway.app`
   - **TTL**: Automatic
4. Click **Save**

### GoDaddy

1. Login to GoDaddy
2. Go to **My Products** → **DNS**
3. Click **Add**:
   - **Type**: CNAME
   - **Name**: `bot` (or your subdomain)
   - **Value**: `your-app.up.railway.app`
   - **TTL**: 1 hour
4. Click **Save**

---

## 🔍 Troubleshooting

### DNS Not Working

1. **Wait 24-48 hours** for DNS propagation (usually faster, 5-30 minutes)
2. Check DNS propagation: [dnschecker.org](https://dnschecker.org)
3. Verify CNAME record is correct
4. Make sure TTL is not too high (use Auto or 3600)

### SSL Certificate Not Issued

1. Wait 10-15 minutes after DNS is propagated
2. Check Railway dashboard → Settings → Networking
3. Make sure DNS is pointing correctly
4. Try removing and re-adding the custom domain

### Bot Not Starting

1. Check Railway logs: **Deployments** → Click deployment → **View Logs**
2. Verify all environment variables are set
3. Check that `ACCESS_TOKEN` is valid
4. Verify `HOMESERVER_URL` is correct

### Custom Domain Shows Railway Default Page

- This is normal! Railway serves a default page, but your bot runs in the background
- The domain is just for DNS/SSL - your bot connects to Matrix, not HTTP
- You don't need to serve a website - the bot works via Matrix protocol

---

## 💡 Important Notes

1. **Your bot doesn't need HTTP/HTTPS** - it connects to Matrix via the Matrix protocol
2. **The domain is just for DNS/SSL** - Railway needs it for SSL certificate
3. **The bot runs in the background** - you won't see a website at your domain
4. **Railway free tier**: $5 credit/month (usually enough for a bot)
5. **Auto-deploy**: Every push to GitHub automatically deploys

---

## 🚀 Next Steps

1. ✅ Repository is on GitHub
2. ✅ Railway project created
3. ✅ Environment variables set
4. ✅ Custom domain configured (optional)
5. ✅ Bot is running!

Check Railway logs to see if the bot connected successfully to Matrix!
