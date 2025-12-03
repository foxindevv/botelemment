# 🚀 Complete Setup Guide: Matrix Server + Railway Deployment

## 📋 Quick Decision: Do You Need Your Own Matrix Server?

### Option 1: Use matrix.org (Easiest - Recommended to Start) ✅

**Best for:** Getting started quickly, no server management

**Steps:**
1. Create bot account on [matrix.org](https://app.element.io)
2. Get access token from Element
3. Deploy to Railway
4. Done!

**Pros:**
- ✅ Zero setup
- ✅ Zero maintenance
- ✅ Works immediately
- ✅ Free

**Cons:**
- ❌ Bot ID will be `@yourbot:matrix.org` (not `@bot:nwo1.xyz`)

---

### Option 2: Your Own Matrix Server (Advanced) ⚙️

**Best for:** Custom domain, full control, `@bot:nwo1.xyz` format

**Requirements:**
- VPS/Cloud server (Oracle Cloud Free Tier recommended)
- Domain name (nwo1.xyz)
- DNS access
- Some technical knowledge

**See:** `HOMESERVER_HOSTING.md` for full setup guide

---

## 🎯 Recommended Path: Start Simple, Upgrade Later

1. **Start with matrix.org** → Deploy to Railway → Get bot working
2. **Later:** Set up your own Matrix server if needed

---

## 🚂 Railway Deployment (Bot Hosting)

### Step 1: Connect GitHub to Railway

1. Go to [railway.app](https://railway.app)
2. Sign up/Login with GitHub
3. Click **"New Project"** → **"Deploy from GitHub repo"**
4. Select `foxindevv/botelemment`
5. Railway auto-detects Node.js

### Step 2: Configure Environment Variables

In Railway dashboard → **Variables** tab, add:

```env
# Matrix Connection
HOMESERVER_URL=https://matrix.org
ACCESS_TOKEN=your_token_from_element_here

# OR use password-based (recommended):
# BOT_USERNAME=@yourbot:matrix.org
# BOT_PASSWORD=your_password_here

# Admin & Configuration
ADMIN_USERS=@yourusername:matrix.org,@admin2:matrix.org
DEFAULT_ROLE=Neverificat
VERIFICATION_CONTACTS=@admin1:matrix.org,admin@example.com
DEALER_DOMAIN=nwo1.xyz
BOT_DISPLAY_NAME=bot
IGNORED_ROOMS=
```

**Important:**
- Get `ACCESS_TOKEN` from Element: Settings → Help & About → Access Token
- Add your Matrix user ID to `ADMIN_USERS` so bot doesn't delete your messages

### Step 3: Set Start Command

1. Railway dashboard → **Settings** → **Deploy**
2. **Start Command**: `node bot.js`
3. Save

### Step 4: Deploy

Railway auto-deploys on every GitHub push, or click **"Deploy"** manually.

### Step 5: Check Logs

1. Railway dashboard → **Deployments** → Click latest deployment
2. **View Logs** to see if bot connected successfully
3. Look for: `✅ Bot connected successfully` or similar

---

## 🏠 Matrix Server Setup (If You Want Your Own)

### Quick Setup on Oracle Cloud (Free Forever)

#### 1. Create VM

1. Go to [Oracle Cloud](https://cloud.oracle.com)
2. Create **VM Instance**:
   - **Shape**: VM.Standard.A1.Flex
   - **OCPUs**: 2
   - **Memory**: 12GB
   - **OS**: Ubuntu 22.04
   - **Storage**: 50GB

#### 2. Configure DNS

In your domain DNS (nwo1.xyz):

```
Type: A
Name: matrix
Value: [Your VM IP address]
TTL: Auto

Type: SRV
Name: _matrix._tcp
Priority: 10
Weight: 5
Port: 443
Target: matrix.nwo1.xyz
```

#### 3. Install Synapse

```bash
# SSH into your VM
ssh ubuntu@your-vm-ip

# Install dependencies
sudo apt update
sudo apt install -y python3-pip python3-venv python3-dev build-essential libssl-dev libffi-dev

# Create synapse user
sudo adduser --system --group --home /var/lib/matrix-synapse synapse

# Install Synapse
sudo python3 -m venv /opt/venv/matrix-synapse
source /opt/venv/matrix-synapse/bin/activate
pip install --upgrade pip
pip install matrix-synapse

# Generate config
sudo mkdir -p /etc/matrix-synapse
python -m synapse.app.homeserver \
    --server-name nwo1.xyz \
    --config-path /etc/matrix-synapse/homeserver.yaml \
    --generate-config \
    --report-stats=no
```

#### 4. Configure Nginx + SSL

```bash
# Install Nginx
sudo apt install -y nginx certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d matrix.nwo1.xyz

# Configure Nginx (auto-configured by certbot)
```

#### 5. Start Synapse

```bash
sudo systemctl enable matrix-synapse
sudo systemctl start matrix-synapse
```

#### 6. Create Bot Account

```bash
# Register bot user
register_new_matrix_user -c /etc/matrix-synapse/homeserver.yaml https://localhost:8008
```

#### 7. Update Railway Environment Variables

```env
HOMESERVER_URL=https://matrix.nwo1.xyz
ACCESS_TOKEN=token_from_your_server
DEALER_DOMAIN=nwo1.xyz
```

---

## 🌐 Custom Domain on Railway (Optional)

If you want `bot.nwo1.xyz` pointing to Railway:

### 1. Add Domain in Railway

1. Railway dashboard → **Settings** → **Networking**
2. Click **"Custom Domain"**
3. Enter: `bot.nwo1.xyz`
4. Railway shows DNS records

### 2. Configure DNS

In your domain DNS:

```
Type: CNAME
Name: bot
Value: your-app.up.railway.app
TTL: Auto
```

### 3. Wait for SSL

Railway auto-provisions SSL. Wait 5-10 minutes.

**Note:** This is just for DNS/SSL. Your bot connects via Matrix protocol, not HTTP.

---

## ✅ Checklist

### For Quick Start (matrix.org):

- [ ] Created bot account on matrix.org
- [ ] Got access token from Element
- [ ] Created Railway project
- [ ] Added environment variables to Railway
- [ ] Set start command: `node bot.js`
- [ ] Deployed and checked logs
- [ ] Bot is online and responding

### For Own Matrix Server:

- [ ] Created VPS (Oracle Cloud recommended)
- [ ] Configured DNS records
- [ ] Installed Synapse
- [ ] Configured Nginx + SSL
- [ ] Created bot account on your server
- [ ] Got access token
- [ ] Updated Railway environment variables
- [ ] Deployed and tested

---

## 🔍 Troubleshooting

### Bot Not Starting on Railway

1. Check logs in Railway dashboard
2. Verify all environment variables are set
3. Check `ACCESS_TOKEN` is valid
4. Verify `HOMESERVER_URL` is correct

### Matrix Server Not Working

1. Check Synapse is running: `sudo systemctl status matrix-synapse`
2. Check Nginx: `sudo systemctl status nginx`
3. Check DNS propagation: [dnschecker.org](https://dnschecker.org)
4. Check firewall: `sudo ufw status`

### Bot Can't Connect

1. Verify `HOMESERVER_URL` is accessible
2. Check token is valid (not expired)
3. Verify bot account exists on homeserver
4. Check Railway logs for connection errors

---

## 📚 Additional Resources

- [Railway Docs](https://docs.railway.app)
- [Synapse Installation](https://matrix-org.github.io/synapse/latest/setup/installation.html)
- [Matrix Federation Guide](https://matrix.org/docs/guides/federating-your-server)
- [Oracle Cloud Free Tier](https://www.oracle.com/cloud/free/)

---

## 🎉 Next Steps

1. **Deploy bot to Railway** (follow Step 1-5 above)
2. **Test bot** - invite it to a room and try commands
3. **Set up Matrix server** (optional, if you want custom domain)
4. **Configure custom domain** (optional)

**Your bot should be running! Check Railway logs to confirm connection.**
