import dotenv from "dotenv";
import { config } from "dotenv";

dotenv.config();

const token = process.env.ACCESS_TOKEN || "mat_y2akHoHcxqjsoy8BvUxuptKYxudAR3_pOqxE3";
const homeserverUrl = process.env.HOMESERVER_URL || "https://matrix.org";

async function getUserId() {
    try {
        const response = await fetch(`${homeserverUrl}/_matrix/client/r0/account/whoami`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        const userId = data.user_id;
        
        console.log("\n✅ User ID găsit:");
        console.log(`   ${userId}\n`);
        console.log("📝 Adaugă acest ID în fișierul .env:");
        console.log(`   ADMIN_USERS=${userId}\n`);
        console.log("Sau dacă ai deja admini:");
        console.log(`   ADMIN_USERS=${userId},@alt_admin:matrix.org\n`);
        
        return userId;
    } catch (error) {
        console.error("❌ Eroare la obținerea User ID:", error.message);
        console.log("\n💡 Verifică că:");
        console.log("   1. Token-ul este corect în .env");
        console.log("   2. HOMESERVER_URL este corect");
        return null;
    }
}

getUserId();

