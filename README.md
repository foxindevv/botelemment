# Matrix Mute Bot for Element

A Matrix bot for Element that sends welcome messages and provides mute/unmute functionality with role management.

## Features

- 🎉 **Welcome Messages**: Automatically greets new users with a customizable welcome message
- 🔇 **Mute/Unmute**: Mute users until they are freed by an admin
- 👤 **Role Management**: Assign and manage user roles
- 🛡️ **Admin Commands**: Secure admin-only commands for moderation
- 📝 **Message Filtering**: Automatically deletes messages from muted users

**Note**: This bot uses the official `matrix-js-sdk` package from Matrix.org, which is the standard and well-maintained SDK for Matrix bots.

## Quick Start

**Need the bot token?** → See [Step 2: Get Your Bot Access Token](#2-get-your-bot-access-token) below

**Want to host it for free?** → See [HOSTING.md](./HOSTING.md) for free hosting options (Railway, Fly.io, Oracle Cloud, etc.)

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Get Your Bot Access Token

The access token (also called "bot token") is what authenticates your bot with Matrix. Here's how to get it:

#### Method 1: Using Element (Easiest)

1. **Create a Matrix account** (if you don't have one):
   - Go to [app.element.io](https://app.element.io) or your Element instance
   - Sign up for a new account (this will be your bot account)
   - **Recommended**: Use a dedicated account for the bot (e.g., `@mybot:matrix.org`)

2. **Get the Access Token**:
   - Open Element (web or desktop app)
   - Click on your **profile picture/avatar** (top left)
   - Go to **Settings** (gear icon)
   - Scroll down and click **"Help & About"** (or "Advanced" in some versions)
   - Scroll down to find **"Access Token"** section
   - Click **"Show"** or **"Reveal"** to display the token
   - **Copy the entire token** (it's a long string starting with `mat_`, `syt_`, or `MDAx...`)

   **Alternative path in Element**:
   - Settings → **Security & Privacy** → Scroll to bottom → **Access Token**
   - Or Settings → **Advanced** → **Access Token**

#### Method 2: Using curl/HTTP (Advanced)

If you prefer to get the token programmatically:

```bash
curl -X POST https://matrix.org/_matrix/client/r0/login \
  -H "Content-Type: application/json" \
  -d '{
    "type": "m.login.password",
    "user": "@yourbot:matrix.org",
    "password": "your_password"
  }'
```

The response will contain an `access_token` field. Copy that value.

#### Important Notes:

- ⚠️ **Keep your access token secret!** Never share it publicly or commit it to Git
- 🔄 If you lose your token, you can generate a new one from Element Settings
- 🚫 Each access token can be revoked individually from Element Settings → Security
- 📝 The token looks like: `mat_...` or `syt_...` (very long string, typically 100+ characters)

#### Finding Your Bot's Matrix ID

Your bot's Matrix ID is in the format `@username:homeserver`. Here's how to find it:

**Method 1: When bot starts (Easiest)**
- When you run `node bot.js`, the bot will print:
  ```
  Found userId: @yourusername:matrix.org
  Bot user ID: @yourusername:matrix.org
  ```
- That's your bot's Matrix ID!

**Method 2: In Element**
- Open Element with your bot account
- Click your **profile picture** (top left)
- Your Matrix ID is shown under your display name (e.g., `@username:matrix.org`)

**Method 3: From your account**
- Your Matrix ID is: `@` + the username you chose + `:` + your homeserver
- Example: If you signed up as `mybot` on `matrix.org`, your ID is `@mybot:matrix.org`
- If you signed up on a different server (e.g., `example.com`), it would be `@mybot:example.com`

**Your bot's Matrix ID** (from the terminal output): `@wormunpol:matrix.org`

### 3. Configure the Bot

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and fill in your configuration:
   - `HOMESERVER_URL`: Your Matrix homeserver (default: https://matrix.org)
   - `ACCESS_TOKEN`: The access token you copied
   - `ADMIN_USERS`: Comma-separated list of admin user IDs (e.g., `@admin1:matrix.org,@admin2:matrix.org`)
   - `DEFAULT_ROLE`: Default role for new users (default: "Neverificat")
   - `VERIFICATION_CONTACTS`: Comma-separated list of verification contacts
   - `DEALER_DOMAIN`: Your dealer/admin domain (see below for setup)

#### Configuring Your Domain

The `DEALER_DOMAIN` is the domain name that appears in welcome messages to indicate which domain dealers/admins use. This is purely informational and helps users identify legitimate admin accounts.

**✅ YES - You can use ANY domain!**

The domain is **just text** displayed in welcome messages. It doesn't need to:
- ❌ Be a real registered domain
- ❌ Have DNS records or website
- ❌ Be accessible or exist
- ❌ Match your Matrix homeserver

**You can literally use anything:**
- Real domains: `example.com`, `mycompany.com`, `matrix.org`
- Made-up domains: `admin.xyz`, `support.net`, `help.io`
- Any text: `admin`, `support`, `verdesidulce.xyz`

**To set up your domain:**

1. **Choose ANY domain/text you want** - it's just displayed as-is

2. **Set it in `.env`**:
   ```env
   DEALER_DOMAIN=anydomain.com
   ```
   
   Or even:
   ```env
   DEALER_DOMAIN=admin
   DEALER_DOMAIN=mycompany.xyz
   DEALER_DOMAIN=whatever-you-want
   ```

3. **Update verification contacts** (optional):
   ```env
   VERIFICATION_CONTACTS=@admin1:yourdomain.com,@admin2:yourdomain.com
   ```
   
   **You can use ANY format** - these are just displayed as text in welcome messages:
   - **Matrix IDs** (clickable in Element): `@username:domain.com`
   - **Email addresses**: `admin@example.com`
   - **Plain text**: `adminverde`, `Support Team`
   - **Mix of formats**: `@admin1:matrix.org,admin@example.com,Support Team`
   
   **Examples:**
   ```env
   # Matrix IDs only
   VERIFICATION_CONTACTS=@admin1:matrix.org,@admin2:matrix.org
   
   # Email addresses
   VERIFICATION_CONTACTS=admin@example.com,support@example.com
   
   # Mixed (Matrix IDs + emails + plain text)
   VERIFICATION_CONTACTS=@admin1:matrix.org,admin@example.com,Support Team
   
   # Just plain text/usernames
   VERIFICATION_CONTACTS=adminverde,support,helpdesk
   ```
   
   **Note**: These contacts are displayed exactly as you type them in the welcome message. Matrix IDs will be clickable in Element, but emails and plain text are just displayed as text.

**Example configurations:**

```env
# Example 1: Using Matrix.org
DEALER_DOMAIN=matrix.org
VERIFICATION_CONTACTS=@admin1:matrix.org,@admin2:matrix.org

# Example 2: Using custom domain
DEALER_DOMAIN=mycompany.com
VERIFICATION_CONTACTS=@support:mycompany.com,@admin:mycompany.com

# Example 3: Mixed contacts
DEALER_DOMAIN=example.com
VERIFICATION_CONTACTS=@admin1:example.com,admin2,@support:otherdomain.com
```

**Important**: The domain is **purely cosmetic text** - it's displayed in welcome messages but doesn't need to exist or be registered. You can use literally any text/domain you want!

### 4. Invite Bot to Rooms and Set Permissions

**You don't need to create a room** - just invite the bot to an existing room and give it permissions:

1. **Invite the bot to your room**:
   - In Element, go to your room
   - Click the room name (top) → **People** → **Invite to this room**
   - Enter your bot's Matrix ID (find it above - it's printed when the bot starts, or check Element profile)
   - Example: `@wormunpol:matrix.org` (replace with your actual bot's ID)

2. **Give the bot permissions** (IMPORTANT!):
   - In the room, click the room name → **Settings** (gear icon)
   - Go to **Roles & Permissions** (or **Permissions**)
   - Find your bot in the member list
   - Set the bot's power level to at least **0** (Moderator) or higher
   - **Recommended**: Set it to **50** (Moderator) or **100** (Admin) for full functionality
   
   **Alternative method**:
   - Click the bot's name in the member list
   - Click **Set power level** or **Make Moderator**
   - Set to at least **0** (Moderator)

**Why?** The bot needs power level 0+ to send messages. Without this, you'll see errors like:
```
user_level (-10) < send_level (0)
```

**Note**: If you're the room admin/creator, you can also use `/op @bot:matrix.org` command in some Matrix clients.

### 5. Run the Bot

```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

## Commands

### Admin Commands

- `!mute @user:domain.com [reason]` - Mute a user (prevents them from sending messages)
- `!unmute @user:domain.com` - Unmute a user
- `!free @user:domain.com` - Same as unmute
- `!setrole @user:domain.com RoleName` - Set a user's role
- `!muted` - List all currently muted users

### User Commands

- `!help` - Show available commands

## How It Works

### Welcome Messages

When a new user joins a room, the bot automatically sends a welcome message with:
- User profile information
- Assigned role
- Verification contact information
- User address and name

### Mute Functionality

When a user is muted:
1. Their power level is set to -1 in the room
2. Their messages are automatically deleted
3. They remain muted until an admin uses `!unmute` or `!free`

### Role Management

Roles are stored per user and displayed in welcome messages. Admins can change roles using the `!setrole` command.

## Data Storage

The bot stores:
- Muted users list (`data.json`)
- User roles (`data.json`)
- Bot state (`storage/` directory)

## Troubleshooting

### Bot doesn't respond

- Check that the bot is invited to the room
- Verify the bot has appropriate power levels
- Check console logs for errors

### Mute doesn't work

- Ensure the bot has moderator/admin permissions in the room
- Check that you're using the correct user ID format (`@user:domain.com`)

### Welcome message not sent

- Make sure the bot is online and running
- Check that the bot joined the room before the user

## License

MIT

