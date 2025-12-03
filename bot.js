import sdk from "matrix-js-sdk";
import * as dotenv from "dotenv";
import fs from "fs";
import Olm from "@matrix-org/olm";
import http from "http";

dotenv.config();

// Load configuration
const config = {
    homeserverUrl: process.env.HOMESERVER_URL || "https://matrix.org",
    accessToken: process.env.ACCESS_TOKEN || "",
    // Password-based login (alternative to access token)
    botUsername: process.env.BOT_USERNAME || "",
    botPassword: process.env.BOT_PASSWORD || "",
    adminUsers: (process.env.ADMIN_USERS || "").split(",").map(u => u.trim()).filter(u => u),
    defaultRole: process.env.DEFAULT_ROLE || "Neverificat",
    verificationContacts: (process.env.VERIFICATION_CONTACTS || "").split(",").map(c => c.trim()).filter(c => c),
    dealerDomain: process.env.DEALER_DOMAIN || "example.com",
    botDisplayName: process.env.BOT_DISPLAY_NAME || "bot",
    ignoredRooms: (process.env.IGNORED_ROOMS || "").split(",").map(r => r.trim()).filter(r => r)
};

// Log admin users on startup for debugging
console.log("🔐 Admin users configured:", config.adminUsers);

// Storage for muted users and roles
const storageFile = "./data.json";

function loadData() {
    try {
        if (fs.existsSync(storageFile)) {
            const data = fs.readFileSync(storageFile, "utf8");
            return JSON.parse(data);
        }
    } catch (error) {
        console.error("Error loading data:", error);
    }
    return {
        mutedUsers: {},
        userRoles: {},
        bannedUsers: {},
        lockedRooms: {},
        warnings: {},
        roomRules: {},
        intervalMessages: {}
    };
}

function saveData(data) {
    try {
        fs.writeFileSync(storageFile, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error("Error saving data:", error);
    }
}

let data = loadData();

// Initialize Matrix client
// We need to get userId first from the access token
let client;

async function initializeClient() {
    // Initialize OLM library for encryption
    try {
        await Olm.init();
        // Make OLM available globally for matrix-js-sdk
        global.Olm = Olm;
        console.log("✅ OLM library initialized");
    } catch (error) {
        console.warn("⚠️  Could not initialize OLM library:", error.message);
    }
    
    let accessToken = config.accessToken;
    let userId;
    
    // Option 1: Use password-based login (recommended - automatic token refresh)
    if (config.botUsername && config.botPassword) {
        console.log("🔐 Logging in with username/password (automatic token)...");
        try {
            const loginResponse = await fetch(`${config.homeserverUrl}/_matrix/client/r0/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    type: "m.login.password",
                    user: config.botUsername,
                    password: config.botPassword
                })
            });
            
            if (!loginResponse.ok) {
                const errorText = await loginResponse.text();
                throw new Error(`Login failed: HTTP ${loginResponse.status}\n${errorText}`);
            }
            
            const loginData = await loginResponse.json();
            accessToken = loginData.access_token;
            userId = loginData.user_id;
            console.log(`✅ Logged in successfully as ${userId}`);
            console.log(`🔑 Access token obtained (valid until revoked)`);
        } catch (error) {
            console.error("❌ Password login failed:", error.message);
            throw new Error(`Password login failed: ${error.message}\n\nVerifică BOT_USERNAME și BOT_PASSWORD în .env`);
        }
    }
    // Option 2: Use existing access token
    else if (config.accessToken && config.accessToken.trim() !== "") {
        console.log("🔑 Using existing access token...");
        try {
            const response = await fetch(`${config.homeserverUrl}/_matrix/client/r0/account/whoami`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${config.accessToken}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                if (response.status === 401) {
                    throw new Error(`HTTP 401: Token invalid sau expirat!\n\n💡 RECOMANDARE: Folosește BOT_USERNAME și BOT_PASSWORD în loc de ACCESS_TOKEN pentru token permanent!\n\n📝 Sau obține un token nou:\n1. Deschide Element\n2. Settings → Help & About\n3. Scroll la "Access Token"\n4. Copiază token-ul și adaugă-l în .env`);
                }
                throw new Error(`HTTP ${response.status}: ${response.statusText}\n${errorText}`);
            }
            
            const data = await response.json();
            userId = data.user_id;
            console.log("✅ Found userId:", userId);
        } catch (error) {
            console.error("❌ Failed to get userId:", error.message);
            throw error;
        }
    }
    // No authentication method provided
    else {
        throw new Error(`Nu ai configurat autentificarea!\n\nOpțiunea 1 (RECOMANDAT - token permanent):\nBOT_USERNAME=@yourbot:matrix.org\nBOT_PASSWORD=your_password\n\nOpțiunea 2:\nACCESS_TOKEN=mat_...`);
    }
    
    // Now create the actual client with userId
    client = sdk.createClient({
        baseUrl: config.homeserverUrl,
        accessToken: accessToken,
        userId: userId,
        store: new sdk.MemoryStore()
    });
    
    // Initialize crypto for encryption support
    try {
        await client.initCrypto();
        console.log("✅ Encryption support enabled");
    } catch (error) {
        // Crypto initialization may fail if not needed - that's okay
        console.warn("⚠️  Encryption not available (encrypted rooms may not work):", error.message);
    }
    
    return client;
}

// Helper function to check if user is admin
function isAdmin(userId) {
    if (!userId) {
        console.log(`⚠️ isAdmin called with null/undefined userId`);
        return false;
    }
    
    // Normalize userId (remove any extra spaces)
    const normalizedUserId = userId.trim();
    
    // Check exact match first
    for (const admin of config.adminUsers) {
        const adminTrimmed = admin.trim();
        if (normalizedUserId === adminTrimmed) {
            console.log(`✅ Exact match: ${normalizedUserId} === ${adminTrimmed}`);
            return true;
        }
    }
    
    // Check partial match (for cases like "fixzzeesup" matching "@fixzzeesup:matrix.org")
    for (const admin of config.adminUsers) {
        const adminTrimmed = admin.trim();
        // Remove @ and :domain parts for comparison
        const adminUsername = adminTrimmed.replace(/^@/, "").split(":")[0];
        const userIdUsername = normalizedUserId.replace(/^@/, "").split(":")[0];
        
        // Check if userId contains admin string or usernames match
        if (normalizedUserId.includes(adminTrimmed) || userIdUsername === adminUsername || adminTrimmed.includes(userIdUsername)) {
            console.log(`✅ Partial match: userId="${normalizedUserId}" matches admin="${adminTrimmed}" (username: ${userIdUsername} === ${adminUsername})`);
            return true;
        }
    }
    
    console.log(`❌ No match found for ${normalizedUserId} against admins:`, config.adminUsers);
    return false;
}

// Helper function to get user display name
async function getUserDisplayName(userId) {
    try {
        const profile = await client.getProfileInfo(userId);
        return profile.displayname || userId.split(":")[0].substring(1);
    } catch (error) {
        return userId.split(":")[0].substring(1);
    }
}

// Helper function to get user role
function getUserRole(userId) {
    return data.userRoles[userId] || config.defaultRole;
}

// Helper function to set user role
function setUserRole(userId, role) {
    data.userRoles[userId] = role;
    saveData(data);
}

// Format welcome message
function formatWelcomeMessage(userId, displayName, profileId) {
    const role = getUserRole(userId);
    const address = userId;
    const name = displayName;
    
    let message = `Salut @${displayName} bine ai venit la chatul New World Order de pe Element!\n\n`;
    message += `Acest spatiu este mult mai safe pentru voi cat si pentru noi.\n\n`;
    message += `Va trebui sa va verificati la un admin pentru a putea accessa canalul.\n\n`;
    
    if (config.verificationContacts.length > 0) {
        message += `❗ Pentru verificare ne poti contacta aici:\n\n`;
        config.verificationContacts.forEach(contact => {
            message += `▫️ ${contact}\n`;
        });
        message += `\n`;
    }
    
    message += `👤 Adresa: ${address}\n`;
    message += `👤 Nume: ${name}\n`;
    message += `🆔 Profil: ${profileId}\n`;
    message += `📜 Rol: ${role}\n\n`;
    message += `⚠️ ATENTIE LA SCAMMERI:\n`;
    message += `Daca este mai safe nu inseamna ca nu vor fi scammeri.\n`;
    message += `Nici un vendor nu va v-a contacta vreodata primul in privat.\n`;
    message += `Daca va abordeaza, este teapa!\n\n`;
    message += `Stati cu ochii in 4, semnalati orice user care va abordeaza in privat si nu cumparati decat de la autorizati...`;
    
    return message;
}

// Set admin power level (80) for admin users
async function setAdminPowerLevel(roomId, userId) {
    try {
        // Get current power levels
        const currentPowerLevels = await client.getStateEvent(roomId, "m.room.power_levels", "");
        
        // Check current power level
        const currentLevel = currentPowerLevels.users?.[userId];
        if (currentLevel !== undefined && currentLevel >= 80) {
            console.log(`✅ User ${userId} already has admin power level (${currentLevel})`);
            return true;
        }
        
        // Create a completely new clean JSON object
        const powerLevels = {
            users: { ...(currentPowerLevels.users || {}) },
            users_default: currentPowerLevels.users_default ?? 0,
            events: { ...(currentPowerLevels.events || {}) },
            state_default: currentPowerLevels.state_default ?? 0,
            ban: currentPowerLevels.ban ?? 50,
            kick: currentPowerLevels.kick ?? 50,
            redact: currentPowerLevels.redact ?? 50
        };
        
        // Set user's power level to 80 (admin level)
        powerLevels.users[userId] = 80;
        
        // Use direct HTTP API call to avoid SDK serialization issues
        const encodedRoomId = encodeURIComponent(roomId);
        const response = await fetch(`${config.homeserverUrl}/_matrix/client/v3/rooms/${encodedRoomId}/state/m.room.power_levels/`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${config.accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(powerLevels)
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`HTTP ${response.status}: ${errorData.error || response.statusText}`);
        }
        
        console.log(`✅ Set admin power level (80) for user ${userId} in room ${roomId}`);
        return true;
    } catch (error) {
        console.error(`❌ Failed to set admin power level for ${userId}:`, error.message);
        return false;
    }
}

// Mute user function
async function muteUser(roomId, userId, reason = "") {
    try {
        // Get current power levels
        const currentPowerLevels = await client.getStateEvent(roomId, "m.room.power_levels", "");
        
        // Create a completely new clean JSON object
        const powerLevels = {
            users: { ...(currentPowerLevels.users || {}) },
            users_default: currentPowerLevels.users_default ?? 0,
            events: { ...(currentPowerLevels.events || {}) },
            state_default: currentPowerLevels.state_default ?? 0,
            ban: currentPowerLevels.ban ?? 50,
            kick: currentPowerLevels.kick ?? 50,
            redact: currentPowerLevels.redact ?? 50
        };
        
        // Set user's power level to -1 (effectively mutes them)
        powerLevels.users[userId] = -1;
        
        // Use direct HTTP API call to avoid SDK serialization issues
        const encodedRoomId = encodeURIComponent(roomId);
        const response = await fetch(`${config.homeserverUrl}/_matrix/client/v3/rooms/${encodedRoomId}/state/m.room.power_levels/`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${config.accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(powerLevels)
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`HTTP ${response.status}: ${errorData.error || response.statusText}`);
        }
        
        // Store mute information
        data.mutedUsers[userId] = {
            roomId: roomId,
            timestamp: Date.now(),
            reason: reason
        };
        saveData(data);
        
        console.log(`✅ Successfully muted user ${userId}`);
        return true;
    } catch (error) {
        console.error("Error muting user:", error);
        return false;
    }
}

// Unmute user function
async function unmuteUser(roomId, userId) {
    try {
        const currentPowerLevels = await client.getStateEvent(roomId, "m.room.power_levels", "");
        
        // Check user's current power level
        const userPowerLevel = currentPowerLevels.users?.[userId];
        const usersDefault = currentPowerLevels.users_default ?? 0;
        const effectivePowerLevel = userPowerLevel !== undefined ? userPowerLevel : usersDefault;
        
        // If user has high power level (>= 50, admin level), we can't modify it
        // Just remove from muted users list
        if (effectivePowerLevel >= 50) {
            console.log(`⚠️ User ${userId} has power level ${effectivePowerLevel} (admin). Cannot modify power level, but removing from muted list.`);
            delete data.mutedUsers[userId];
            saveData(data);
            return true;
        }
        
        // If user is explicitly set to -1 (muted), restore to default (0)
        if (userPowerLevel === -1) {
            const powerLevels = {
                users: { ...(currentPowerLevels.users || {}) },
                users_default: currentPowerLevels.users_default ?? 0,
                events: { ...(currentPowerLevels.events || {}) },
                state_default: currentPowerLevels.state_default ?? 0,
                ban: currentPowerLevels.ban ?? 50,
                kick: currentPowerLevels.kick ?? 50,
                redact: currentPowerLevels.redact ?? 50
            };
            
            // Set to 0 (default) instead of deleting
            powerLevels.users[userId] = 0;
            
            // Use direct HTTP API call to avoid SDK serialization issues
            const encodedRoomId = encodeURIComponent(roomId);
            const response = await fetch(`${config.homeserverUrl}/_matrix/client/v3/rooms/${encodedRoomId}/state/m.room.power_levels/`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${config.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(powerLevels)
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                // If we can't modify power level, at least remove from muted list
                if (response.status === 403) {
                    console.log(`⚠️ Cannot modify power level for ${userId}, but removing from muted list`);
                    delete data.mutedUsers[userId];
                    saveData(data);
                    return true;
                }
                throw new Error(`HTTP ${response.status}: ${errorData.error || response.statusText}`);
            }
        } else {
            // User doesn't have explicit -1 power level, just remove from muted list
            console.log(`ℹ️ User ${userId} doesn't have explicit mute power level, removing from muted list`);
        }
        
        // Remove from muted users
        delete data.mutedUsers[userId];
        saveData(data);
        
        console.log(`✅ Successfully unmuted user ${userId}`);
        return true;
    } catch (error) {
        console.error("Error unmuting user:", error);
        // Even if power level modification fails, remove from muted list
        if (data.mutedUsers[userId]) {
            delete data.mutedUsers[userId];
            saveData(data);
            console.log(`✅ Removed ${userId} from muted users list despite error`);
        }
        return false;
    }
}

// Check if user is muted
function isMuted(userId) {
    return !!data.mutedUsers[userId];
}

// Check if user is banned
function isBanned(userId) {
    return !!data.bannedUsers[userId];
}

// Warning functions
function warnUser(userId, reason = "", adminId = "") {
    if (!data.warnings[userId]) {
        data.warnings[userId] = [];
    }
    data.warnings[userId].push({
        timestamp: Date.now(),
        reason: reason,
        adminId: adminId
    });
    saveData(data);
}

function unwarnUser(userId, index = null) {
    if (!data.warnings[userId] || data.warnings[userId].length === 0) {
        return false;
    }
    if (index !== null && index >= 0 && index < data.warnings[userId].length) {
        data.warnings[userId].splice(index, 1);
    } else {
        data.warnings[userId].pop(); // Remove last warning
    }
    if (data.warnings[userId].length === 0) {
        delete data.warnings[userId];
    }
    saveData(data);
    return true;
}

function getUserWarnings(userId) {
    return data.warnings[userId] || [];
}

// Unban user function
async function unbanUser(roomId, userId) {
    try {
        // Remove from banned users
        delete data.bannedUsers[userId];
        saveData(data);
        
        // Try to invite user back (if they were banned from this room)
        try {
            await client.invite(roomId, userId);
        } catch (error) {
            // User might already be in room or invite failed - that's okay
            console.log(`Could not invite user ${userId} back to room: ${error.message}`);
        }
        
        return true;
    } catch (error) {
        console.error("Error unbanning user:", error);
        return false;
    }
}

// Ban user function
async function banUser(roomId, userId, reason = "") {
    try {
        // Kick user from room
        await client.kick(roomId, userId, reason || "Banned by admin");
        
        // Store ban information
        data.bannedUsers[userId] = {
            roomId: roomId,
            timestamp: Date.now(),
            reason: reason
        };
        saveData(data);
        
        return true;
    } catch (error) {
        console.error("Error banning user:", error);
        return false;
    }
}

// Kick user function
async function kickUser(roomId, userId, reason = "") {
    try {
        // Check bot's power level first
        const powerInfo = await checkBotPowerLevel(roomId);
        if (!powerInfo) {
            console.error("❌ Could not check bot power level");
            return false;
        }
        
        // Get kick requirement
        const currentPowerLevels = await client.getStateEvent(roomId, "m.room.power_levels", "");
        const kickLevel = currentPowerLevels.kick ?? 50;
        
        // Check if bot has enough power to kick
        if (powerInfo.botPowerLevel < kickLevel) {
            console.error(`❌ Bot power level (${powerInfo.botPowerLevel}) is too low to kick (requires ${kickLevel})`);
            return false;
        }
        
        // Check if target user is admin (power level >= 50)
        const targetUserLevel = currentPowerLevels.users?.[userId] ?? currentPowerLevels.users_default ?? 0;
        if (targetUserLevel >= 50) {
            console.error(`❌ Cannot kick admin user ${userId} (power level: ${targetUserLevel})`);
            return false;
        }
        
        await client.kick(roomId, userId, reason || "Kicked by admin");
        console.log(`✅ Successfully kicked user ${userId} from room ${roomId}`);
        return true;
    } catch (error) {
        console.error("Error kicking user:", error);
        return false;
    }
}

// Lock chat function (set send level to admin only)
async function lockChat(roomId) {
    try {
        const currentPowerLevels = await client.getStateEvent(roomId, "m.room.power_levels", "");
        
        // Create a completely new clean JSON object
        const powerLevels = {
            users: { ...(currentPowerLevels.users || {}) },
            users_default: currentPowerLevels.users_default ?? 0,
            events: { ...(currentPowerLevels.events || {}) },
            state_default: currentPowerLevels.state_default ?? 0,
            ban: currentPowerLevels.ban ?? 50,
            kick: currentPowerLevels.kick ?? 50,
            redact: currentPowerLevels.redact ?? 50
        };
        
        // Set message send level to 50 (admin level)
        powerLevels.events["m.room.message"] = 50;
        
        // Use direct HTTP API call to avoid SDK serialization issues
        const encodedRoomId = encodeURIComponent(roomId);
        const response = await fetch(`${config.homeserverUrl}/_matrix/client/v3/rooms/${encodedRoomId}/state/m.room.power_levels/`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${config.accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(powerLevels)
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`HTTP ${response.status}: ${errorData.error || response.statusText}`);
        }
        
        // Store locked room
        data.lockedRooms[roomId] = {
            timestamp: Date.now()
        };
        saveData(data);
        
        return true;
    } catch (error) {
        console.error("Error locking chat:", error);
        return false;
    }
}

// Unlock chat function
async function unlockChat(roomId) {
    try {
        const currentPowerLevels = await client.getStateEvent(roomId, "m.room.power_levels", "");
        
        // Create a completely new clean JSON object
        const powerLevels = {
            users: { ...(currentPowerLevels.users || {}) },
            users_default: currentPowerLevels.users_default ?? 0,
            events: { ...(currentPowerLevels.events || {}) },
            state_default: currentPowerLevels.state_default ?? 0,
            ban: currentPowerLevels.ban ?? 50,
            kick: currentPowerLevels.kick ?? 50,
            redact: currentPowerLevels.redact ?? 50
        };
        
        // Remove message send level restriction (defaults to 0)
        delete powerLevels.events["m.room.message"];
        
        // Use direct HTTP API call to avoid SDK serialization issues
        const encodedRoomId = encodeURIComponent(roomId);
        const response = await fetch(`${config.homeserverUrl}/_matrix/client/v3/rooms/${encodedRoomId}/state/m.room.power_levels/`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${config.accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(powerLevels)
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`HTTP ${response.status}: ${errorData.error || response.statusText}`);
        }
        
        // Remove from locked rooms
        delete data.lockedRooms[roomId];
        saveData(data);
        
        return true;
    } catch (error) {
        console.error("Error unlocking chat:", error);
        return false;
    }
}

// Check bot's power level in a room
async function checkBotPowerLevel(roomId) {
    try {
        const powerLevels = await client.getStateEvent(roomId, "m.room.power_levels", "");
        const botUserId = client.getUserId();
        
        // Check all possible power level sources
        const explicitUserLevel = powerLevels.users?.[botUserId];
        const usersDefault = powerLevels.users_default ?? 0;
        const botPowerLevel = explicitUserLevel !== undefined ? explicitUserLevel : usersDefault;
        
        // Check send level requirements
        const messageSendLevel = powerLevels.events?.["m.room.message"];
        const stateDefault = powerLevels.state_default ?? 0;
        const sendLevel = messageSendLevel !== undefined ? messageSendLevel : stateDefault;
        
        console.log(`\n📊 Power Level Check for room ${roomId}:`);
        console.log(`   Bot user: ${botUserId}`);
        console.log(`   Explicit user level: ${explicitUserLevel !== undefined ? explicitUserLevel : '(not set)'}`);
        console.log(`   Users default: ${usersDefault}`);
        console.log(`   Bot power level (effective): ${botPowerLevel}`);
        console.log(`   Message send level: ${messageSendLevel !== undefined ? messageSendLevel : '(not set)'}`);
        console.log(`   State default: ${stateDefault}`);
        console.log(`   Required send level (effective): ${sendLevel}`);
        console.log(`   Can send messages: ${botPowerLevel >= sendLevel ? '✅ YES' : '❌ NO'}`);
        
        // Show all users with power levels for debugging
        if (powerLevels.users) {
            console.log(`   All user power levels:`);
            Object.entries(powerLevels.users).forEach(([userId, level]) => {
                const marker = userId === botUserId ? ' 👈 YOU' : '';
                console.log(`     ${userId}: ${level}${marker}`);
            });
        }
        console.log('');
        
        return { botPowerLevel, sendLevel, canSend: botPowerLevel >= sendLevel, powerLevels };
    } catch (error) {
        console.error(`Error checking power level:`, error.message);
        return null;
    }
}

// Check if room should be ignored
function isIgnoredRoom(roomId) {
    return config.ignoredRooms.some(ignored => roomId.includes(ignored) || roomId === ignored);
}

// Helper function to find user by username or ID
async function findUserInRoom(roomId, targetUser) {
    if (targetUser.startsWith("@")) {
        return targetUser;
    }
    
    const room = client.getRoom(roomId);
    if (room) {
        const members = room.getMembers();
        const foundMember = members.find(m => {
            const name = m.name || m.userId.split(":")[0].substring(1);
            return name.toLowerCase().includes(targetUser.toLowerCase()) || 
                   m.userId.toLowerCase().includes(targetUser.toLowerCase());
        });
        if (foundMember) {
            return foundMember.userId;
        }
    }
    return null;
}

// Send message helper
async function sendMessage(roomId, text) {
    // Skip ignored rooms
    if (isIgnoredRoom(roomId)) {
        return;
    }
    
    try {
        const content = {
            body: text,
            msgtype: "m.text"
        };
        await client.sendMessage(roomId, content);
    } catch (error) {
        if (error.errcode === 'M_FORBIDDEN') {
            // Only show warning once per room to avoid spam
            const roomName = client.getRoom(roomId)?.name || roomId;
            console.error(`⚠️  Bot doesn't have permission to send messages in room: ${roomName}`);
            console.error(`   Room ID: ${roomId}`);
            console.error(`   (This room will be ignored. Set permissions if you want the bot to work here.)`);
        } else if (error.message && error.message.includes("encryption")) {
            // Encryption error - room is encrypted but crypto not fully initialized
            console.warn(`⚠️  Room ${roomId} is encrypted. Bot may not be able to send messages here.`);
        } else {
            console.error(`Error sending message to room ${roomId}:`, error.message);
        }
        // Don't throw - just log the error so bot continues running
    }
}

// Send image helper
async function sendImage(roomId, imageUrl, caption = "") {
    // Skip ignored rooms
    if (isIgnoredRoom(roomId)) {
        return;
    }
    
    try {
        // Download image from URL
        let imageBuffer;
        let contentType = "image/jpeg";
        let filename = "image.jpg";
        
        if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
            // Download from URL
            const response = await fetch(imageUrl);
            if (!response.ok) {
                throw new Error(`Failed to download image: ${response.statusText}`);
            }
            imageBuffer = Buffer.from(await response.arrayBuffer());
            contentType = response.headers.get("content-type") || "image/jpeg";
            
            // Extract filename from URL or content-type
            const urlParts = imageUrl.split("/");
            filename = urlParts[urlParts.length - 1].split("?")[0] || "image.jpg";
            if (!filename.includes(".")) {
                const ext = contentType.split("/")[1] || "jpg";
                filename = `image.${ext}`;
            }
        } else if (fs.existsSync(imageUrl)) {
            // Read from local file
            imageBuffer = fs.readFileSync(imageUrl);
            const ext = imageUrl.split(".").pop().toLowerCase();
            filename = imageUrl.split("/").pop() || "image.jpg";
            
            // Determine content type from extension
            const mimeTypes = {
                "jpg": "image/jpeg",
                "jpeg": "image/jpeg",
                "png": "image/png",
                "gif": "image/gif",
                "webp": "image/webp"
            };
            contentType = mimeTypes[ext] || "image/jpeg";
        } else {
            throw new Error("Image URL or file path not found");
        }
        
        // Upload image to Matrix server
        const uploadResponse = await client.uploadContent(imageBuffer, {
            name: filename,
            type: contentType,
            rawResponse: false
        });
        
        if (!uploadResponse || !uploadResponse.content_uri) {
            throw new Error("Failed to upload image to Matrix server");
        }
        
        // Get image dimensions (optional, for better display)
        // For now, we'll send without dimensions
        
        // Send image message
        const content = {
            body: caption || filename,
            msgtype: "m.image",
            url: uploadResponse.content_uri,
            info: {
                mimetype: contentType,
                size: imageBuffer.length
            }
        };
        
        await client.sendMessage(roomId, content);
        console.log(`📷 Image sent to room ${roomId}: ${filename}`);
        return true;
    } catch (error) {
        console.error(`Error sending image to room ${roomId}:`, error.message);
        return false;
    }
}

// Function to set up event handlers
function setupEventHandlers(client) {
    // Auto-join rooms when invited
    client.on("RoomMember.membership", async (event, member, oldMembership) => {
        const roomId = member.roomId;
        
        // Skip ignored rooms
        if (isIgnoredRoom(roomId)) {
            console.log(`⏭️  Ignoring room: ${roomId}`);
            return;
        }
        
        // If bot is invited, auto-join
        if (member.userId === client.getUserId() && member.membership === "invite") {
            console.log(`\n📨 Bot received invite to room: ${roomId}`);
            try {
                await client.joinRoom(roomId);
                console.log(`✅ Bot joined room: ${roomId}`);
                await checkBotPowerLevel(roomId);
            } catch (error) {
                console.error(`❌ Failed to join room ${roomId}:`, error.message);
            }
            return;
        }
        
        // Check if bot joined a room
        if (member.userId === client.getUserId() && member.membership === "join") {
            const room = client.getRoom(roomId);
            const roomName = room?.name || roomId;
            console.log(`\n🤖 Bot joined room: ${roomName}`);
            const powerInfo = await checkBotPowerLevel(roomId);
            if (powerInfo && !powerInfo.canSend) {
                console.log(`   ⚠️  Bot cannot send messages in this room. Set permissions in Element to enable bot functionality.`);
            } else if (powerInfo && powerInfo.canSend) {
                console.log(`   ✅ Bot is ready to work in this room!`);
                
                // Check for existing admin users and set their power levels
                try {
                    const members = room?.getMembers() || [];
                    const joinedMembers = members.filter(m => m.membership === "join");
                    console.log(`   🔍 Checking ${joinedMembers.length} existing members for admin users...`);
                    
                    for (const member of joinedMembers) {
                        if (member.userId === client.getUserId()) continue; // Skip bot
                        if (isAdmin(member.userId)) {
                            console.log(`   👑 Found admin user: ${member.userId}`);
                            await setAdminPowerLevel(roomId, member.userId);
                        }
                    }
                } catch (error) {
                    console.error(`   ⚠️  Error checking existing members:`, error.message);
                }
                
                // Send online message
                await sendMessage(roomId, "🤖 Bot online! Scrie !help pentru comenzi.");
            }
            return;
        }
        
        if (member.membership !== "join") return;
        if (member.userId === client.getUserId()) return; // Ignore bot's own joins
        
        const userId = member.userId;
        const roomId = member.roomId;
        
        // Handle admin users - set power level 80 automatically
        if (isAdmin(userId)) {
            console.log(`👑 Admin user detected: ${userId}`);
            console.log(`🔧 Setting admin power level (80) for ${userId}...`);
            const adminSet = await setAdminPowerLevel(roomId, userId);
            if (adminSet) {
                console.log(`✅ Admin ${userId} granted power level 80 in room ${roomId}`);
            } else {
                console.error(`⚠️  Failed to set admin power level for ${userId} - bot may need higher permissions!`);
            }
            // Don't mute admin users, but still send welcome message
            const displayName = await getUserDisplayName(userId);
            const profileId = displayName;
            const welcomeMsg = formatWelcomeMessage(userId, displayName, profileId);
            await sendMessage(roomId, welcomeMsg);
            return;
        }
        
        // For non-admin users: auto-mute IMMEDIATELY when they join
        const displayName = await getUserDisplayName(userId);
        const profileId = displayName;
        
        console.log(`🔇 Auto-muting new user: ${userId} in room ${roomId}`);
        const muteSuccess = await muteUser(roomId, userId, "Utilizator nou - mutat automat");
        
        if (!muteSuccess) {
            console.error(`⚠️  Failed to auto-mute user ${userId} - bot may not have permissions!`);
        } else {
            console.log(`✅ Successfully auto-muted user ${userId}`);
        }
        
        // Send welcome message (will handle permission errors gracefully)
        const welcomeMsg = formatWelcomeMessage(userId, displayName, profileId);
        await sendMessage(roomId, welcomeMsg);
    });

    client.on("Room.timeline", async (event, room, toStartOfTimeline) => {
    if (toStartOfTimeline) return; // Ignore old events
    if (event.getType() !== "m.room.message") return;
    if (event.getSender() === client.getUserId()) return;
    
    const roomId = room.roomId;
    
    // Skip ignored rooms
    if (isIgnoredRoom(roomId)) {
        return;
    }
    
    const content = event.getContent();
    if (!content.body) return;
    
    const body = content.body.trim();
    const userId = event.getSender();
    const isAdminUser = isAdmin(userId);
    
    // DEBUG: Log admin check for every message
    console.log(`🔍 Message from ${userId} - Admin check: ${isAdminUser ? '✅ IS ADMIN' : '❌ NOT ADMIN'}`);
    if (!isAdminUser) {
        console.log(`   Configured admins:`, config.adminUsers);
        console.log(`   User ID: "${userId}"`);
    }
    
    // CRITICAL: Skip all message deletion logic for admin users
    if (isAdminUser) {
        // Admin users can always send messages - skip all mute/ban checks
        // Continue to process commands normally
        // No message deletion for admins!
        console.log(`✅ Admin user ${userId} - skipping all deletion checks`);
    } else {
        // Check if user has "Neverificat" role and auto-mute + delete message
        const userRole = getUserRole(userId);
        if (userRole === "Neverificat" || userRole === config.defaultRole) {
            // Auto-mute user if they try to send a message while unverified
            if (!isMuted(userId)) {
                console.log(`🔇 Auto-muting unverified user ${userId} for sending message`);
                await muteUser(roomId, userId, "Utilizator neverificat - mutat automat pentru trimitere mesaj");
            }
            
            // Delete the message (without txnId to avoid duplicates)
            try {
                await client.redactEvent(roomId, event.getId());
                console.log(`🗑️ Deleted message from unverified user ${userId}`);
            } catch (error) {
                console.error("Error redacting message from unverified user:", error);
            }
            
            // Don't process commands from unverified users
            return;
        }
        
        // If user is muted or banned, delete their messages (but NOT if they're admin - already checked above)
        if (isMuted(userId) || isBanned(userId)) {
            try {
                await client.redactEvent(roomId, event.getId());
                console.log(`🗑️ Deleted message from muted/banned user ${userId}`);
            } catch (error) {
                console.error("Error redacting message:", error);
            }
            return; // Don't process commands from muted/banned users
        }
    }
    
    // Parse commands
    const parts = body.split(" ");
    const command = parts[0].toLowerCase();
    
    // Mute command (admin only)
    if (command === "!mute" && isAdminUser) {
        if (parts.length < 2) {
            await sendMessage(roomId, "Utilizare: !mute @utilizator:domain.com [motiv]\nSau: !mute nume_utilizator [motiv]");
            return;
        }
        
        let targetUser = await findUserInRoom(roomId, parts[1]);
        if (!targetUser) {
            await sendMessage(roomId, `❌ Utilizator "${parts[1]}" nu a fost găsit. Folosește ID-ul complet Matrix: @utilizator:domain.com`);
            return;
        }
        
        const reason = parts.slice(2).join(" ") || "Mutat de admin";
        
        if (await muteUser(roomId, targetUser, reason)) {
            const displayName = await getUserDisplayName(targetUser);
            await sendMessage(roomId, `✅ Utilizatorul ${displayName} (${targetUser}) a fost mutat.\nMotiv: ${reason}`);
        } else {
            await sendMessage(roomId, `❌ Nu s-a putut muta utilizatorul ${targetUser}`);
        }
        return;
    }
    
    // Unmute/free command (admin only) - requires reason
    if ((command === "!unmute" || command === "!free") && isAdminUser) {
        if (parts.length < 3) {
            await sendMessage(roomId, "Utilizare: !free @utilizator:domain.com motiv\nSau: !free nume_utilizator motiv\n\n⚠️ Motivul este obligatoriu!");
            return;
        }
        
        let targetUser = await findUserInRoom(roomId, parts[1]);
        if (!targetUser) {
            await sendMessage(roomId, `❌ Utilizator "${parts[1]}" nu a fost găsit. Folosește ID-ul complet Matrix: @utilizator:domain.com`);
            return;
        }
        
        const reason = parts.slice(2).join(" ");
        
        if (await unmuteUser(roomId, targetUser)) {
            const displayName = await getUserDisplayName(targetUser);
            await sendMessage(roomId, `✅ Utilizatorul ${displayName} (${targetUser}) a fost eliberat.\nMotiv: ${reason}`);
        } else {
            await sendMessage(roomId, `❌ Nu s-a putut elibera utilizatorul ${targetUser}`);
        }
        return;
    }
    
    // Kick command (admin only)
    if (command === "!kick" && isAdminUser) {
        if (parts.length < 2) {
            await sendMessage(roomId, "Utilizare: !kick @utilizator:domain.com [motiv]\nSau: !kick nume_utilizator [motiv]");
            return;
        }
        
        let targetUser = await findUserInRoom(roomId, parts[1]);
        if (!targetUser) {
            await sendMessage(roomId, `❌ Utilizator "${parts[1]}" nu a fost găsit. Folosește ID-ul complet Matrix: @utilizator:domain.com`);
            return;
        }
        
        const reason = parts.slice(2).join(" ") || "Dat afară de admin";
        
        const kickResult = await kickUser(roomId, targetUser, reason);
        if (kickResult) {
            const displayName = await getUserDisplayName(targetUser);
            await sendMessage(roomId, `✅ Utilizatorul ${displayName} (${targetUser}) a fost dat afară.\nMotiv: ${reason}`);
        } else {
            // Check why it failed
            const powerInfo = await checkBotPowerLevel(roomId);
            const currentPowerLevels = await client.getStateEvent(roomId, "m.room.power_levels", "").catch(() => null);
            const targetUserLevel = currentPowerLevels?.users?.[targetUser] ?? currentPowerLevels?.users_default ?? 0;
            
            let errorMsg = `❌ Nu s-a putut da afară utilizatorul ${targetUser}`;
            if (powerInfo && powerInfo.botPowerLevel < 50) {
                errorMsg += `\n⚠️ Bot-ul nu are permisiuni suficiente (nivel: ${powerInfo.botPowerLevel}, necesar: 50+)`;
            } else if (targetUserLevel >= 50) {
                errorMsg += `\n⚠️ Nu se pot da afară utilizatori admin (nivel: ${targetUserLevel})`;
            } else {
                errorMsg += `\n⚠️ Verifică permisiunile bot-ului în cameră`;
            }
            await sendMessage(roomId, errorMsg);
        }
        return;
    }
    
    // Ban command (admin only)
    if (command === "!ban" && isAdminUser) {
        if (parts.length < 2) {
            await sendMessage(roomId, "Utilizare: !ban @utilizator:domain.com [motiv]\nSau: !ban nume_utilizator [motiv]");
            return;
        }
        
        let targetUser = await findUserInRoom(roomId, parts[1]);
        if (!targetUser) {
            await sendMessage(roomId, `❌ Utilizator "${parts[1]}" nu a fost găsit. Folosește ID-ul complet Matrix: @utilizator:domain.com`);
            return;
        }
        
        const reason = parts.slice(2).join(" ") || "Banat de admin";
        
        if (await banUser(roomId, targetUser, reason)) {
            const displayName = await getUserDisplayName(targetUser);
            await sendMessage(roomId, `✅ Utilizatorul ${displayName} (${targetUser}) a fost banat.\nMotiv: ${reason}`);
        } else {
            await sendMessage(roomId, `❌ Nu s-a putut bana utilizatorul ${targetUser}`);
        }
        return;
    }
    
    // Lock chat command (admin only)
    if (command === "!lockchat" && isAdminUser) {
        if (await lockChat(roomId)) {
            await sendMessage(roomId, `🔒 Chat-ul a fost blocat. Doar adminii pot trimite mesaje.`);
        } else {
            await sendMessage(roomId, `❌ Nu s-a putut bloca chat-ul`);
        }
        return;
    }
    
    // Unlock chat command (admin only)
    if (command === "!unlockchat" && isAdminUser) {
        if (await unlockChat(roomId)) {
            await sendMessage(roomId, `🔓 Chat-ul a fost deblocat. Toți utilizatorii pot trimite mesaje.`);
        } else {
            await sendMessage(roomId, `❌ Nu s-a putut debloca chat-ul`);
        }
        return;
    }
    
    // Unban command (admin only)
    if (command === "!unban" && isAdminUser) {
        if (parts.length < 2) {
            await sendMessage(roomId, "Utilizare: !unban @utilizator:domain.com\nSau: !unban nume_utilizator");
            return;
        }
        
        let targetUser = await findUserInRoom(roomId, parts[1]);
        if (!targetUser) {
            // Try to unban even if user not in room
            targetUser = parts[1].startsWith("@") ? parts[1] : `@${parts[1]}`;
        }
        
        if (await unbanUser(roomId, targetUser)) {
            await sendMessage(roomId, `✅ Utilizatorul ${targetUser} a fost debanat.`);
        } else {
            await sendMessage(roomId, `❌ Nu s-a putut debana utilizatorul ${targetUser}`);
        }
        return;
    }
    
    // Warn command (admin only)
    if (command === "!warn" && isAdminUser) {
        if (parts.length < 2) {
            await sendMessage(roomId, "Utilizare: !warn @utilizator:domain.com [motiv]\nSau: !warn nume_utilizator [motiv]");
            return;
        }
        
        let targetUser = await findUserInRoom(roomId, parts[1]);
        if (!targetUser) {
            await sendMessage(roomId, `❌ Utilizator "${parts[1]}" nu a fost găsit. Folosește ID-ul complet Matrix: @utilizator:domain.com`);
            return;
        }
        
        const reason = parts.slice(2).join(" ") || "Avertisment de la admin";
        warnUser(targetUser, reason, userId);
        
        const warnings = getUserWarnings(targetUser);
        const displayName = await getUserDisplayName(targetUser);
        await sendMessage(roomId, `⚠️ Utilizatorul ${displayName} (${targetUser}) a primit un avertisment.\nMotiv: ${reason}\nTotal avertismente: ${warnings.length}`);
        return;
    }
    
    // Unwarn command (admin only)
    if (command === "!unwarn" && isAdminUser) {
        if (parts.length < 2) {
            await sendMessage(roomId, "Utilizare: !unwarn @utilizator:domain.com [index]\nSau: !unwarn nume_utilizator [index]\n\nDacă nu specifici index, se va șterge ultimul avertisment.");
            return;
        }
        
        let targetUser = await findUserInRoom(roomId, parts[1]);
        if (!targetUser) {
            await sendMessage(roomId, `❌ Utilizator "${parts[1]}" nu a fost găsit. Folosește ID-ul complet Matrix: @utilizator:domain.com`);
            return;
        }
        
        const index = parts.length > 2 ? parseInt(parts[2]) - 1 : null;
        if (unwarnUser(targetUser, index)) {
            const warnings = getUserWarnings(targetUser);
            const displayName = await getUserDisplayName(targetUser);
            await sendMessage(roomId, `✅ Avertisment șters pentru ${displayName} (${targetUser}).\nAvertismente rămase: ${warnings.length}`);
        } else {
            await sendMessage(roomId, `❌ Nu există avertismente pentru acest utilizator.`);
        }
        return;
    }
    
    // Warnings command (admin only)
    if (command === "!warns" && isAdminUser) {
        if (parts.length < 2) {
            await sendMessage(roomId, "Utilizare: !warns @utilizator:domain.com\nSau: !warns nume_utilizator");
            return;
        }
        
        let targetUser = await findUserInRoom(roomId, parts[1]);
        if (!targetUser) {
            await sendMessage(roomId, `❌ Utilizator "${parts[1]}" nu a fost găsit. Folosește ID-ul complet Matrix: @utilizator:domain.com`);
            return;
        }
        
        const warnings = getUserWarnings(targetUser);
        if (warnings.length === 0) {
            const displayName = await getUserDisplayName(targetUser);
            await sendMessage(roomId, `✅ ${displayName} (${targetUser}) nu are avertismente.`);
        } else {
            const displayName = await getUserDisplayName(targetUser);
            let msg = `⚠️ Avertismente pentru ${displayName} (${targetUser}):\n\n`;
            for (let idx = 0; idx < warnings.length; idx++) {
                const warn = warnings[idx];
                msg += `${idx + 1}. ${new Date(warn.timestamp).toLocaleString('ro-RO')}\n`;
                msg += `   Motiv: ${warn.reason}\n`;
                if (warn.adminId) {
                    try {
                        const adminName = await getUserDisplayName(warn.adminId);
                        msg += `   De la: ${adminName}\n`;
                    } catch (e) {
                        msg += `   De la: ${warn.adminId}\n`;
                    }
                }
                msg += "\n";
            }
            await sendMessage(roomId, msg);
        }
        return;
    }
    
    // Info command - can show group info or user info
    if (command === "!info") {
        // If username provided, show user info
        if (parts.length >= 2) {
            let targetUser = await findUserInRoom(roomId, parts[1]);
            if (!targetUser) {
                await sendMessage(roomId, `❌ Utilizator "${parts[1]}" nu a fost găsit. Folosește ID-ul complet Matrix: @utilizator:domain.com`);
                return;
            }
            
            const displayName = await getUserDisplayName(targetUser);
            const role = getUserRole(targetUser);
            const warnings = getUserWarnings(targetUser);
            const isMutedUser = isMuted(targetUser);
            const isBannedUser = isBanned(targetUser);
            const isAdminUserCheck = isAdmin(targetUser);
            
            let msg = `ℹ️ Informații despre utilizator:\n\n`;
            msg += `👤 Nume: ${displayName}\n`;
            msg += `🆔 ID: ${targetUser}\n`;
            msg += `📜 Rol: ${role}\n`;
            
            // Status
            if (isAdminUserCheck) {
                msg += `🛡️ Status: Admin\n`;
            } else if (isBannedUser) {
                msg += `🚫 Status: Banat\n`;
            } else if (isMutedUser) {
                msg += `🔇 Status: Mutat\n`;
            } else {
                msg += `✅ Status: Liber\n`;
            }
            
            // Warnings
            if (warnings.length > 0) {
                msg += `⚠️ Avertismente: ${warnings.length}\n`;
            }
            
            // Mute info
            if (isMutedUser && data.mutedUsers[targetUser]) {
                const muteInfo = data.mutedUsers[targetUser];
                msg += `\n🔇 Mutat de la: ${new Date(muteInfo.timestamp).toLocaleString('ro-RO')}\n`;
                if (muteInfo.reason) {
                    msg += `📝 Motiv: ${muteInfo.reason}\n`;
                }
            }
            
            await sendMessage(roomId, msg);
            return;
        }
        
        // Otherwise show group info
        const room = client.getRoom(roomId);
        const roomName = room?.name || "Fără nume";
        const members = room?.getMembers() || [];
        const memberCount = members.filter(m => m.membership === "join").length;
        
        let msg = `ℹ️ Informații despre grup:\n\n`;
        msg += `📛 Nume: ${roomName}\n`;
        msg += `🆔 ID Cameră: ${roomId}\n`;
        msg += `👥 Membri: ${memberCount}\n`;
        msg += `🤖 Bot: ${client.getUserId()}\n`;
        
        if (data.roomRules[roomId]) {
            msg += `\n📜 Reguli: ${data.roomRules[roomId]}`;
        }
        
        await sendMessage(roomId, msg);
        return;
    }
    
    // Rules command
    if (command === "!rules") {
        if (data.roomRules[roomId]) {
            await sendMessage(roomId, `📜 Regulile grupului:\n\n${data.roomRules[roomId]}`);
        } else {
            await sendMessage(roomId, `📜 Nu există reguli setate pentru acest grup.\nAdminii pot seta reguli cu: !setrules text_reguli`);
        }
        return;
    }
    
    // Set rules command (admin only)
    if (command === "!setrules" && isAdminUser) {
        if (parts.length < 2) {
            await sendMessage(roomId, "Utilizare: !setrules text_reguli\n\nExemplu: !setrules 1. Respectă pe ceilalți\n2. Fără spam");
            return;
        }
        
        const rules = parts.slice(1).join(" ");
        data.roomRules[roomId] = rules;
        saveData(data);
        
        await sendMessage(roomId, `✅ Regulile grupului au fost setate:\n\n${rules}`);
        return;
    }
    
    // ID command
    if (command === "!id") {
        const displayName = await getUserDisplayName(userId);
        await sendMessage(roomId, `🆔 Informații despre tine:\n\n👤 Nume: ${displayName}\n🆔 ID: ${userId}\n📛 Cameră: ${roomId}`);
        return;
    }
    
    // Stats command (admin only)
    if (command === "!stats" && isAdminUser) {
        const room = client.getRoom(roomId);
        const members = room?.getMembers() || [];
        const memberCount = members.filter(m => m.membership === "join").length;
        const mutedCount = Object.keys(data.mutedUsers).length;
        const bannedCount = Object.keys(data.bannedUsers).length;
        const warnedCount = Object.keys(data.warnings).length;
        const totalWarnings = Object.values(data.warnings).reduce((sum, warns) => sum + warns.length, 0);
        
        let msg = `📊 Statistici Bot:\n\n`;
        msg += `👥 Membri în grup: ${memberCount}\n`;
        msg += `🔇 Utilizatori mutați: ${mutedCount}\n`;
        msg += `🚫 Utilizatori banați: ${bannedCount}\n`;
        msg += `⚠️ Utilizatori cu avertismente: ${warnedCount}\n`;
        msg += `📝 Total avertismente: ${totalWarnings}\n`;
        msg += `📜 Roluri unice: ${new Set(Object.values(data.userRoles)).size}\n`;
        
        if (data.intervalMessages[roomId]) {
            msg += `⏰ Mesaje programate: ${Object.keys(data.intervalMessages[roomId]).length}`;
        }
        
        await sendMessage(roomId, msg);
        return;
    }
    
    // Set interval message command (admin only)
    if (command === "!setinterval" && isAdminUser) {
        if (parts.length < 3) {
            await sendMessage(roomId, "Utilizare: !setinterval nume_interval minute mesaj\n\nExemplu: !setinterval reminder 60 Nu uita să verifici regulile!");
            return;
        }
        
        const intervalName = parts[1];
        const minutes = parseInt(parts[2]);
        const message = parts.slice(3).join(" ");
        
        if (isNaN(minutes) || minutes < 1) {
            await sendMessage(roomId, "❌ Numărul de minute trebuie să fie un număr valid mai mare decât 0.");
            return;
        }
        
        if (!message) {
            await sendMessage(roomId, "❌ Mesajul nu poate fi gol.");
            return;
        }
        
        if (!data.intervalMessages[roomId]) {
            data.intervalMessages[roomId] = {};
        }
        
        data.intervalMessages[roomId][intervalName] = {
            minutes: minutes,
            message: message,
            lastSent: 0
        };
        saveData(data);
        
        await sendMessage(roomId, `✅ Mesaj programat "${intervalName}" setat pentru a fi trimis la fiecare ${minutes} minute.\nMesaj: ${message}`);
        return;
    }
    
    // Remove interval message command (admin only)
    if (command === "!removeinterval" && isAdminUser) {
        if (parts.length < 2) {
            await sendMessage(roomId, "Utilizare: !removeinterval nume_interval");
            return;
        }
        
        const intervalName = parts[1];
        
        if (data.intervalMessages[roomId] && data.intervalMessages[roomId][intervalName]) {
            delete data.intervalMessages[roomId][intervalName];
            if (Object.keys(data.intervalMessages[roomId]).length === 0) {
                delete data.intervalMessages[roomId];
            }
            saveData(data);
            await sendMessage(roomId, `✅ Mesajul programat "${intervalName}" a fost șters.`);
        } else {
            await sendMessage(roomId, `❌ Nu există un mesaj programat cu numele "${intervalName}".`);
        }
        return;
    }
    
    // List interval messages command (admin only)
    if (command === "!listintervals" && isAdminUser) {
        if (!data.intervalMessages[roomId] || Object.keys(data.intervalMessages[roomId]).length === 0) {
            await sendMessage(roomId, "📋 Nu există mesaje programate pentru acest grup.");
        } else {
            let msg = `⏰ Mesaje programate:\n\n`;
            for (const [name, interval] of Object.entries(data.intervalMessages[roomId])) {
                msg += `📌 ${name}\n`;
                msg += `   Interval: ${interval.minutes} minute\n`;
                msg += `   Mesaj: ${interval.message}\n\n`;
            }
            await sendMessage(roomId, msg);
        }
        return;
    }
    
    // Send image command (admin only)
    if (command === "!sendimage" && isAdminUser) {
        if (parts.length < 2) {
            await sendMessage(roomId, "Utilizare: !sendimage URL_imagine [text]\nSau: !sendimage cale/fisier.jpg [text]\n\nExemplu: !sendimage https://example.com/image.png Aceasta este o imagine");
            return;
        }
        
        const imageUrl = parts[1];
        const caption = parts.slice(2).join(" ") || "";
        
        if (await sendImage(roomId, imageUrl, caption)) {
            await sendMessage(roomId, `✅ Imagine trimisă!`);
        } else {
            await sendMessage(roomId, `❌ Nu s-a putut trimite imaginea. Verifică URL-ul sau calea fișierului.`);
        }
        return;
    }
    
    // Set scammer warning message command (admin only)
    if (command === "!setscammermessage" && isAdminUser) {
        if (parts.length < 2) {
            await sendMessage(roomId, "Utilizare: !setscammermessage minute\n\nExemplu: !setscammermessage 120\n\nSetează mesajul despre scammeri să fie trimis automat la fiecare X minute.");
            return;
        }
        
        const minutes = parseInt(parts[1]);
        
        if (isNaN(minutes) || minutes < 1) {
            await sendMessage(roomId, "❌ Numărul de minute trebuie să fie un număr valid mai mare decât 0.");
            return;
        }
        
        const scammerMessage = `⚠️ ATENTIE LA SCAMMERI:\n\nDaca este mai safe nu inseamna ca nu vor fi scammeri.\nNici un vendor nu va v-a contacta vreodata primul in privat.\nDaca va abordeaza, este teapa!\n\nStati cu ochii in 4, semnalati orice user care va abordeaza in privat si nu cumparati decat de la autorizati...`;
        
        if (!data.intervalMessages[roomId]) {
            data.intervalMessages[roomId] = {};
        }
        
        data.intervalMessages[roomId]["scammer_warning"] = {
            minutes: minutes,
            message: scammerMessage,
            lastSent: 0
        };
        saveData(data);
        
        await sendMessage(roomId, `✅ Mesajul despre scammeri a fost setat să fie trimis automat la fiecare ${minutes} minute.`);
        return;
    }
    
    // Remove scammer warning message command (admin only)
    if (command === "!removescammermessage" && isAdminUser) {
        if (data.intervalMessages[roomId] && data.intervalMessages[roomId]["scammer_warning"]) {
            delete data.intervalMessages[roomId]["scammer_warning"];
            if (Object.keys(data.intervalMessages[roomId]).length === 0) {
                delete data.intervalMessages[roomId];
            }
            saveData(data);
            await sendMessage(roomId, `✅ Mesajul automat despre scammeri a fost dezactivat.`);
        } else {
            await sendMessage(roomId, `❌ Nu există un mesaj automat despre scammeri activat.`);
        }
        return;
    }
    
    // Set role command (admin only)
    if (command === "!setrole" && isAdminUser) {
        if (parts.length < 3) {
            await sendMessage(roomId, "Utilizare: !setrole @utilizator:domain.com NumeRol\nSau: !setrole nume_utilizator NumeRol");
            return;
        }
        
        let targetUser = await findUserInRoom(roomId, parts[1]);
        if (!targetUser) {
            await sendMessage(roomId, `❌ Utilizator "${parts[1]}" nu a fost găsit. Folosește ID-ul complet Matrix: @utilizator:domain.com`);
            return;
        }
        
        const role = parts.slice(2).join(" ");
        
        setUserRole(targetUser, role);
        const displayName = await getUserDisplayName(targetUser);
        await sendMessage(roomId, `✅ Rolul pentru ${displayName} (${targetUser}) a fost setat la: ${role}`);
        return;
    }
    
    // Check mute status command
    if (command === "!muted" && isAdminUser) {
        const mutedList = Object.keys(data.mutedUsers);
        if (mutedList.length === 0) {
            await sendMessage(roomId, "Nu sunt utilizatori mutați momentan.");
        } else {
            let msg = "👥 Utilizatori mutați:\n\n";
            for (const user of mutedList) {
                const muteInfo = data.mutedUsers[user];
                try {
                    const displayName = await getUserDisplayName(user);
                    msg += `- ${displayName} (${user})\n`;
                } catch (error) {
                    msg += `- ${user}\n`;
                }
                msg += `  📅 De la: ${new Date(muteInfo.timestamp).toLocaleString('ro-RO')}\n`;
                if (muteInfo.reason) msg += `  📝 Motiv: ${muteInfo.reason}\n`;
                msg += "\n";
            }
            await sendMessage(roomId, msg);
        }
        return;
    }
    
    // Check bot power level command (admin only)
    if (command === "!checkpower" && isAdminUser) {
        const powerInfo = await checkBotPowerLevel(roomId);
        if (powerInfo) {
            await sendMessage(roomId, `📊 Nivel putere bot: ${powerInfo.botPowerLevel}\n📊 Nivel necesar: ${powerInfo.sendLevel}\n📤 Poate trimite mesaje: ${powerInfo.canSend ? '✅ DA' : '❌ NU'}`);
        }
        return;
    }
    
    // Help command (available to everyone)
    if (command === "!help" || command === "!commands") {
        let helpMsg = "🤖 Comenzile Botului:\n\n";
        helpMsg += "📋 Comenzi generale:\n";
        helpMsg += "!help - Afișează acest mesaj de ajutor\n";
        helpMsg += "!commands - La fel ca !help\n";
        helpMsg += "!status / !online - Verifică dacă botul este online\n\n";
        
        helpMsg += "📜 Comenzi roluri:\n";
        helpMsg += "!roles - Listează toate rolurile disponibile\n";
        helpMsg += "!myrole - Afișează rolul tău curent\n";
        helpMsg += "!role @utilizator - Afișează rolul unui utilizator\n";
        helpMsg += "!role nume_utilizator - La fel, dar cu nume\n\n";
        
        helpMsg += "ℹ️ Comenzi informații:\n";
        helpMsg += "!info - Informații despre grup\n";
        helpMsg += "!info @utilizator - Informații despre un utilizator (rol, status)\n";
        helpMsg += "!id - Afișează ID-ul tău\n";
        helpMsg += "!rules - Afișează regulile grupului\n";
        
        if (isAdminUser) {
            helpMsg += "\n🛡️ Comenzi admin:\n";
            helpMsg += "!mute @utilizator [motiv] - Mută un utilizator\n";
            helpMsg += "!free @utilizator motiv - Eliberează un utilizator (motiv obligatoriu)\n";
            helpMsg += "!kick @utilizator [motiv] - Dă afară un utilizator\n";
            helpMsg += "!ban @utilizator [motiv] - Banează un utilizator\n";
            helpMsg += "!unban @utilizator - Debanează un utilizator\n";
            helpMsg += "!warn @utilizator [motiv] - Avertizează un utilizator\n";
            helpMsg += "!unwarn @utilizator [index] - Șterge un avertisment\n";
            helpMsg += "!warns @utilizator - Vezi avertismentele unui utilizator\n";
            helpMsg += "!lockchat - Blochează chat-ul (doar adminii pot scrie)\n";
            helpMsg += "!unlockchat - Deblochează chat-ul\n";
            helpMsg += "!setrules text - Setează regulile grupului\n";
            helpMsg += "!setrole @utilizator NumeRol - Setează rolul unui utilizator\n";
            helpMsg += "!allroles - Listează toți utilizatorii și rolurile lor\n";
            helpMsg += "!muted - Listează toți utilizatorii mutați\n";
            helpMsg += "!stats - Statistici despre bot\n";
            helpMsg += "!checkpower - Verifică nivelul de putere al botului\n";
            helpMsg += "!setinterval nume minute mesaj - Programează mesaj la interval\n";
            helpMsg += "!removeinterval nume - Șterge mesaj programat\n";
            helpMsg += "!listintervals - Listează mesajele programate\n";
            helpMsg += "!setscammermessage minute - Activează mesaj automat despre scammeri\n";
            helpMsg += "!removescammermessage - Dezactivează mesajul automat despre scammeri\n";
            helpMsg += "!sendimage URL [text] - Trimite o imagine (din URL sau fișier local)\n\n";
            helpMsg += "💡 Poți folosi numele utilizatorului în loc de @utilizator:domain.com pentru majoritatea comenzilor!";
        } else {
            helpMsg += "\n💡 Sfat: Unele comenzi sunt doar pentru admini. Contactează un admin pentru acces.\n";
        }
        
        await sendMessage(roomId, helpMsg);
        return;
    }
    
    // Status command
    if (command === "!status" || command === "!online") {
        await sendMessage(roomId, "✅ Botul este online și gata! Scrie !help pentru comenzi.");
        return;
    }
    
    // Role commands
    if (command === "!roles") {
        const allRoles = Object.values(data.userRoles);
        const uniqueRoles = [...new Set(allRoles)];
        const defaultRole = config.defaultRole;
        
        let msg = "📜 Roluri Disponibile:\n\n";
        if (uniqueRoles.length === 0 && !defaultRole) {
            msg += "Nu au fost atribuite roluri personalizate încă.\n";
        } else {
            if (defaultRole) {
                msg += `🔹 ${defaultRole} (Rol implicit pentru utilizatori noi)\n`;
            }
            uniqueRoles.forEach(role => {
                if (role !== defaultRole) {
                    const count = allRoles.filter(r => r === role).length;
                    msg += `🔹 ${role} (${count} utilizator${count !== 1 ? 'i' : ''})\n`;
                }
            });
        }
        msg += `\n💡 Folosește !myrole pentru a vedea rolul tău, sau !role @utilizator pentru a vedea rolul cuiva.`;
        
        await sendMessage(roomId, msg);
        return;
    }
    
    // My role command
    if (command === "!myrole") {
        const role = getUserRole(userId);
        await sendMessage(roomId, `📜 Rolul tău: ${role}`);
        return;
    }
    
    // Get user role command
    if (command === "!role") {
        if (parts.length < 2) {
            await sendMessage(roomId, "Utilizare: !role @utilizator:domain.com\nSau: !role nume_utilizator");
            return;
        }
        
        let targetUser = await findUserInRoom(roomId, parts[1]);
        if (!targetUser) {
            await sendMessage(roomId, `❌ Utilizator "${parts[1]}" nu a fost găsit. Folosește ID-ul complet Matrix: @utilizator:domain.com`);
            return;
        }
        
        const role = getUserRole(targetUser);
        const displayName = await getUserDisplayName(targetUser);
        await sendMessage(roomId, `📜 Rolul pentru ${displayName} (${targetUser}): ${role}`);
        return;
    }
    
    // List all users and their roles (admin only)
    if (command === "!allroles" && isAdminUser) {
        const rolesList = Object.entries(data.userRoles);
        if (rolesList.length === 0) {
            await sendMessage(roomId, "Nu au fost atribuite roluri personalizate. Toți utilizatorii au rolul implicit.");
        } else {
            let msg = "📜 Toate Rolurile Utilizatorilor:\n\n";
            for (const [user, role] of rolesList) {
                try {
                    const displayName = await getUserDisplayName(user);
                    msg += `👤 ${displayName} (${user}): ${role}\n`;
                } catch (error) {
                    msg += `👤 ${user}: ${role}\n`;
                }
            }
            await sendMessage(roomId, msg);
        }
        return;
    }
    
    });
}

// Start HTTP server for health checks (keeps Render alive)
const PORT = process.env.PORT || 3000;
const healthServer = http.createServer((req, res) => {
    if (req.url === '/health' || req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
            status: 'ok', 
            bot: 'online',
            timestamp: new Date().toISOString()
        }));
    } else {
        res.writeHead(404);
        res.end('Not Found');
    }
});

healthServer.listen(PORT, () => {
    console.log(`✅ Health check server running on port ${PORT}`);
    console.log(`   Health endpoint: http://localhost:${PORT}/health`);
});

// Start the bot
console.log("Starting Matrix bot...");
initializeClient().then(async (initializedClient) => {
    // Set the global client variable
    client = initializedClient;
    
    console.log("Bot user ID:", client.getUserId());
    
    // Set bot display name
    try {
        await client.setDisplayName(config.botDisplayName);
        console.log(`✅ Bot display name set to: "${config.botDisplayName}"`);
    } catch (error) {
        console.warn(`⚠️  Could not set display name: ${error.message}`);
    }
    
    // Set up event handlers after client is initialized
    setupEventHandlers(client);
    
    // Start the client
    await client.startClient({ initialSyncLimit: 10 });
    console.log("Bot started successfully!");
    console.log("Listening for events...");
    
    // Check for pending invites and auto-join, also process existing rooms
    setTimeout(async () => {
        try {
            const rooms = client.getRooms();
            for (const room of rooms) {
                const roomId = room.roomId;
                
                // Skip ignored rooms
                if (isIgnoredRoom(roomId)) {
                    console.log(`⏭️  Skipping ignored room: ${roomId}`);
                    continue;
                }
                
                // Check for pending invites
                const members = room.getMembersWithMembership("invite");
                const botMember = members.find(m => m.userId === client.getUserId());
                if (botMember) {
                    console.log(`\n📨 Found pending invite to room: ${roomId}`);
                    try {
                        await client.joinRoom(roomId);
                        console.log(`✅ Bot joined room: ${roomId}`);
                        await checkBotPowerLevel(roomId);
                    } catch (error) {
                        console.error(`❌ Failed to join room ${roomId}:`, error.message);
                    }
                    continue;
                }
                
                // Process existing rooms: set admin power levels for admin users
                try {
                    const joinedMembers = room.getMembersWithMembership("join");
                    const botIsMember = joinedMembers.some(m => m.userId === client.getUserId());
                    
                    if (botIsMember) {
                        console.log(`\n🔍 Processing existing room: ${room.name || roomId}`);
                        for (const member of joinedMembers) {
                            if (member.userId === client.getUserId()) continue; // Skip bot
                            if (isAdmin(member.userId)) {
                                console.log(`   👑 Setting admin power level for: ${member.userId}`);
                                await setAdminPowerLevel(roomId, member.userId);
                            }
                        }
                    }
                } catch (error) {
                    console.error(`⚠️  Error processing room ${roomId}:`, error.message);
                }
            }
        } catch (error) {
            console.error("Error checking for invites:", error.message);
        }
    }, 2000); // Wait 2 seconds for sync to complete
    
    // Start interval message checker
    setInterval(() => {
        (async () => {
            try {
                const rooms = client.getRooms();
                for (const room of rooms) {
                    const roomId = room.roomId;
                    
                    if (isIgnoredRoom(roomId)) continue;
                    if (!data.intervalMessages[roomId]) continue;
                    
                    const now = Date.now();
                    for (const [name, interval] of Object.entries(data.intervalMessages[roomId])) {
                        const intervalMs = interval.minutes * 60 * 1000;
                        const timeSinceLastSent = now - interval.lastSent;
                        
                        if (timeSinceLastSent >= intervalMs) {
                            await sendMessage(roomId, interval.message);
                            data.intervalMessages[roomId][name].lastSent = now;
                            saveData(data);
                            console.log(`📨 Sent interval message "${name}" to room ${roomId}`);
                        }
                    }
                }
            } catch (error) {
                console.error("Error checking interval messages:", error.message);
            }
        })();
    }, 60000); // Check every minute
}).catch((error) => {
    console.error("Failed to start bot:", error);
    process.exit(1);
});
