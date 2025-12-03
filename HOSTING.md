# 🚀 Ghid de Hosting Gratuit pentru Bot

Acest ghid te va ajuta să hostezi botul Matrix gratuit și să ruleze permanent online.

## ⭐ Opțiuni Recomandate (în ordine)

### 1. **Fly.io** (Recomandat - Cel mai generos plan gratuit)

**Avantaje:**
- ✅ Plan gratuit generos (3 VMs gratuite)
- ✅ Rulare continuă 24/7
- ✅ Ușor de configurat
- ✅ Suport pentru Node.js

**Pași:**

1. **Creează cont**: [fly.io](https://fly.io) (necesită card, dar nu se percepe taxă pe planul gratuit)

2. **Instalează Fly CLI**:
   ```bash
   # Windows (PowerShell)
   iwr https://fly.io/install.ps1 -useb | iex
   
   # Mac/Linux
   curl -L https://fly.io/install.sh | sh
   ```

3. **Autentifică-te**:
   ```bash
   fly auth login
   ```

4. **Creează aplicația**:
   ```bash
   fly launch
   ```
   - Alege numele aplicației
   - Nu creea Postgres (apasă N)
   - Nu creea Redis (apasă N)

5. **Creează fișier `fly.toml`** în root-ul proiectului:
   ```toml
   app = "numele-tau-bot"
   primary_region = "iad"  # sau "fra", "lhr", etc.

   [build]

   [env]
     NODE_ENV = "production"

   [[services]]
     internal_port = 8080
     protocol = "tcp"
     processes = ["app"]

     [[services.ports]]
       port = 80
       handlers = ["http"]
   ```

6. **Creează fișier `Dockerfile`**:
   ```dockerfile
   FROM node:18-alpine

   WORKDIR /app

   COPY package*.json ./
   RUN npm ci --only=production

   COPY . .

   CMD ["node", "bot.js"]
   ```

7. **Configurează variabilele de mediu**:
   ```bash
   fly secrets set HOMESERVER_URL=https://matrix.org
   fly secrets set ACCESS_TOKEN=your_token_here
   fly secrets set ADMIN_USERS=your_admin_id
   fly secrets set DEFAULT_ROLE=Neverificat
   fly secrets set VERIFICATION_CONTACTS=contact1,contact2
   fly secrets set DEALER_DOMAIN=nwo.com
   fly secrets set BOT_DISPLAY_NAME=bot
   ```

8. **Deploy**:
   ```bash
   fly deploy
   ```

---

### 2. **Railway** (Simplu și rapid)

**Avantaje:**
- ✅ Foarte ușor de folosit
- ✅ Plan gratuit ($5 credit/lună)
- ✅ Deploy automat din GitHub

**Pași:**

1. **Creează cont**: [railway.app](https://railway.app) (conectează cu GitHub)

2. **Creează proiect nou** → "Deploy from GitHub repo"

3. **Selectează repository-ul** cu botul

4. **Configurează variabilele de mediu** în Railway dashboard:
   - `HOMESERVER_URL`
   - `ACCESS_TOKEN`
   - `ADMIN_USERS`
   - `DEFAULT_ROLE`
   - `VERIFICATION_CONTACTS`
   - `DEALER_DOMAIN`
   - `BOT_DISPLAY_NAME`

5. **Railway detectează automat Node.js** și deploy-ează

6. **Set start command**: `node bot.js`

---

### 3. **Render** (Simplu, dar se oprește după inactivitate)

**Avantaje:**
- ✅ Foarte simplu
- ✅ Plan gratuit
- ⚠️ Se oprește după 15 minute de inactivitate (nu ideal pentru bot)
- ⚠️ **NU** potrivit pentru hosting homeserver Matrix (vezi `HOMESERVER_HOSTING.md`)

**Pași:**

1. **Creează cont**: [render.com](https://render.com)

2. **New → Web Service**

3. **Conectează GitHub repository**

4. **Configurează**:
   - **Name**: `matrix-bot`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node bot.js`

5. **Adaugă Environment Variables**:
   - Toate variabilele din `.env`

6. **Deploy**

**Notă**: Render se oprește după inactivitate. Pentru bot continuu, folosește Fly.io sau Railway.

---

### 4. **Oracle Cloud Free Tier** (Cel mai bun pentru bot continuu)

**Avantaje:**
- ✅ VPS complet gratuit permanent
- ✅ 24/7 rulare garantată
- ✅ 2 VMs gratuite pentru totdeauna
- ✅ Control complet

**Pași:**

1. **Creează cont**: [oracle.com/cloud/free](https://www.oracle.com/cloud/free/)

2. **Creează VM Instance**:
   - **Shape**: VM.Standard.A1.Flex (ARM, gratuit)
   - **OS**: Ubuntu 22.04
   - **SSH Key**: Generează și salvează

3. **Conectează-te prin SSH**:
   ```bash
   ssh ubuntu@your-ip-address
   ```

4. **Instalează Node.js**:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

5. **Clonează proiectul**:
   ```bash
   git clone your-repo-url
   cd botelemment
   npm install
   ```

6. **Creează fișier `.env`**:
   ```bash
   nano .env
   # Adaugă toate variabilele
   ```

7. **Instalează PM2** (pentru rulare continuă):
   ```bash
   sudo npm install -g pm2
   pm2 start bot.js --name matrix-bot
   pm2 save
   pm2 startup  # Pentru auto-start la reboot
   ```

8. **Botul rulează permanent!**

---

### 5. **Replit** (Rapid, dar necesită plan pentru rulare continuă)

**Avantaje:**
- ✅ Foarte ușor
- ✅ Editor integrat
- ⚠️ Plan gratuit se oprește după inactivitate

**Pași:**

1. **Creează cont**: [replit.com](https://replit.com)

2. **Import from GitHub** → Selectează repository-ul

3. **Configurează Secrets** (în Tools → Secrets):
   - Toate variabilele de mediu

4. **Run** → Botul pornește

**Notă**: Pentru rulare continuă, necesită plan plătit sau folosește "Always On" (disponibil în planuri plătite).

---

## 📋 Comparație Rapidă

| Platform | Rulare Continuă | Dificultate | Recomandat |
|----------|----------------|-------------|------------|
| **Fly.io** | ✅ Da | ⭐⭐ Mediu | ⭐⭐⭐⭐⭐ |
| **Railway** | ✅ Da | ⭐ Foarte ușor | ⭐⭐⭐⭐ |
| **Render** | ❌ Nu (se oprește) | ⭐ Foarte ușor | ⭐⭐ |
| **Oracle Cloud** | ✅ Da | ⭐⭐⭐ Mediu | ⭐⭐⭐⭐⭐ |
| **Replit** | ⚠️ Cu plan plătit | ⭐ Foarte ușor | ⭐⭐ |

---

## 🎯 Recomandarea Mea

**Pentru început**: **Railway** - cel mai simplu și rapid
**Pentru rulare permanentă garantată**: **Oracle Cloud Free Tier** sau **Fly.io**

---

## 🔧 Configurare Comune pentru Toate Platformele

### Variabile de Mediu Necesare:

```env
HOMESERVER_URL=https://matrix.org
ACCESS_TOKEN=your_access_token_here
ADMIN_USERS=@admin1:matrix.org,@admin2:matrix.org
DEFAULT_ROLE=Neverificat
VERIFICATION_CONTACTS=@admin1:example.com,admin@example.com
DEALER_DOMAIN=nwo.com
BOT_DISPLAY_NAME=bot
IGNORED_ROOMS=!roomid:matrix.org
```

---

## 🐛 Troubleshooting

### Botul se oprește după câteva minute
- **Render/Replit**: Planul gratuit se oprește după inactivitate
- **Soluție**: Folosește Fly.io sau Oracle Cloud

### Eroare la deploy
- Verifică că toate variabilele de mediu sunt setate
- Verifică că `package.json` are scriptul `start: "node bot.js"`
- Verifică logurile pentru erori

### Botul nu răspunde
- Verifică că token-ul Matrix este valid
- Verifică că botul are permisiuni în camere
- Verifică logurile pentru erori

---

## 📚 Resurse Suplimentare

- [Fly.io Documentation](https://fly.io/docs/)
- [Railway Documentation](https://docs.railway.app/)
- [Oracle Cloud Free Tier](https://www.oracle.com/cloud/free/)
- [PM2 Process Manager](https://pm2.keymetrics.io/)

---

**Succes cu hosting-ul botului! 🚀**

