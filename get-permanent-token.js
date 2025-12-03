import dotenv from "dotenv";
dotenv.config();

const homeserverUrl = process.env.HOMESERVER_URL || "https://matrix.org";
const botUsername = process.env.BOT_USERNAME || "";
const botPassword = process.env.BOT_PASSWORD || "";

async function getPermanentToken() {
    if (!botUsername || !botPassword) {
        console.error("❌ BOT_USERNAME și BOT_PASSWORD trebuie să fie setate în .env");
        console.log("\n💡 Adaugă în .env:");
        console.log("   BOT_USERNAME=@yourbot:matrix.org");
        console.log("   BOT_PASSWORD=your_password");
        return;
    }

    try {
        console.log(`🔐 Conectare la ${homeserverUrl}...`);
        console.log(`👤 Utilizator: ${botUsername}\n`);

        const response = await fetch(`${homeserverUrl}/_matrix/client/r0/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                type: "m.login.password",
                user: botUsername,
                password: botPassword
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        const accessToken = data.access_token;
        const userId = data.user_id;
        const deviceId = data.device_id;

        console.log("✅ Token obținut cu succes!\n");
        console.log("📋 Detalii:");
        console.log(`   User ID: ${userId}`);
        console.log(`   Device ID: ${deviceId}`);
        console.log(`   Access Token: ${accessToken.substring(0, 20)}...\n`);
        console.log("📝 Adaugă în .env:");
        console.log(`   ACCESS_TOKEN=${accessToken}\n`);
        console.log("💡 NOTĂ: Token-ul poate expira. Pentru token permanent,");
        console.log("   folosește BOT_USERNAME și BOT_PASSWORD în loc de ACCESS_TOKEN!");
        console.log("   (bot-ul va obține automat un token nou la fiecare pornire)\n");

        return { accessToken, userId, deviceId };
    } catch (error) {
        console.error("❌ Eroare la obținerea token-ului:", error.message);
        console.log("\n💡 Verifică că:");
        console.log("   1. BOT_USERNAME este corect (format: @user:matrix.org)");
        console.log("   2. BOT_PASSWORD este corect");
        console.log("   3. HOMESERVER_URL este corect");
        return null;
    }
}

getPermanentToken();
