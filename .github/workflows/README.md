# GitHub Actions Workflows

## ping-render.yml

This workflow pings your Render service every 10 minutes to keep it alive on the free tier.

### Setup:

1. **Get your Render service URL**
   - Go to Render dashboard → Your service
   - Copy the URL (e.g., `https://matrix-bot.onrender.com`)

2. **Add GitHub Secret**
   - Go to your GitHub repo → **Settings** → **Secrets and variables** → **Actions**
   - Click **"New repository secret"**
   - Name: `RENDER_URL`
   - Value: Your Render service URL (e.g., `https://matrix-bot.onrender.com`)
   - Click **"Add secret"**

3. **Update the workflow** (if you didn't set the secret):
   - Edit `.github/workflows/ping-render.yml`
   - Replace `https://your-bot.onrender.com` with your actual Render URL

### How it works:

- Runs every 10 minutes automatically
- Pings your Render service's `/health` endpoint
- Keeps the service "active" so Render doesn't stop it
- Can also be triggered manually via "Run workflow"

### Manual trigger:

1. Go to **Actions** tab in GitHub
2. Select **"Ping Render Service"** workflow
3. Click **"Run workflow"** → **"Run workflow"**

---

**Note:** The bot also has a built-in health check server that responds to `/health` requests. This GitHub Action just pings it periodically to keep Render from stopping the service.
