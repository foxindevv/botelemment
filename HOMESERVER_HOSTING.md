# 🏠 Hosting Homeserver Matrix (Synapse) - Ghid Complet

## ⚠️ Diferența Importantă

### Bot Hosting vs Homeserver Hosting

**Bot Hosting** (ce am discutat în `HOSTING.md`):
- ✅ Ușor de hostat pe Render, Railway, Fly.io
- ✅ Botul se conectează la un homeserver existent (ex: matrix.org)
- ✅ Nu necesită server Matrix propriu

**Homeserver Hosting** (ce vrei acum):
- ⚠️ Mai complex - necesită server Matrix (Synapse)
- ⚠️ Necesită resurse mai mari (RAM, CPU, storage)
- ⚠️ Trebuie să ruleze 24/7 pentru federation

---

## 🎯 Poți hosta Homeserver Matrix pe Render?

### ❌ Render - NU Recomandat pentru Homeserver

**De ce nu:**
- ❌ Planul gratuit se oprește după 15 minute de inactivitate
- ❌ Homeserver-ul trebuie să ruleze 24/7 pentru federation
- ❌ Necesită resurse constante (nu doar când e activ)
- ❌ Storage limitat pe planul gratuit

**Concluzie:** Render este bun pentru bot, dar **NU** pentru homeserver Matrix.

---

## ✅ Opțiuni Recomandate pentru Homeserver Matrix

### 1. **Oracle Cloud Free Tier** ⭐⭐⭐⭐⭐ (Cel mai bun)

**Avantaje:**
- ✅ **2 VMs gratuite permanent** (ARM, 24GB RAM total)
- ✅ **200GB storage gratuit**
- ✅ **Rulare 24/7 garantată**
- ✅ **Perfect pentru Synapse**
- ✅ **Gratuit pentru totdeauna**

**Pași:**

1. **Creează cont**: [oracle.com/cloud/free](https://www.oracle.com/cloud/free/)
   - Necesită card (nu se percepe taxă pe planul gratuit)

2. **Creează VM Instance**:
   - **Shape**: VM.Standard.A1.Flex
   - **OCPUs**: 2 (gratuit)
   - **Memory**: 12GB (gratuit)
   - **OS**: Ubuntu 22.04
   - **Storage**: 50GB (gratuit)

3. **Configurează DNS**:
   ```
   A     @              -> IP-ul VM-ului tău
   A     matrix         -> IP-ul VM-ului tău
   SRV   _matrix._tcp   -> matrix.nwo1.xyz:443
   ```

4. **Instalează Synapse** (pe VM):
   ```bash
   # Conectează-te prin SSH
   ssh ubuntu@your-ip-address
   
   # Instalează Synapse
   sudo apt update
   sudo apt install -y python3-pip python3-venv python3-dev
   sudo apt install -y build-essential libssl-dev libffi-dev
   
   # Creează utilizator pentru Synapse
   sudo adduser --system --group --home /var/lib/matrix-synapse synapse
   
   # Instalează Synapse
   sudo python3 -m venv /opt/venv/matrix-synapse
   source /opt/venv/matrix-synapse/bin/activate
   pip install --upgrade pip
   pip install matrix-synapse
   
   # Generează configurație
   sudo mkdir -p /etc/matrix-synapse
   python -m synapse.app.homeserver \
       --server-name nwo1.xyz \
       --config-path /etc/matrix-synapse/homeserver.yaml \
       --generate-config \
       --report-stats=no
   ```

5. **Configurează Synapse**:
   ```yaml
   # /etc/matrix-synapse/homeserver.yaml
   server_name: "nwo1.xyz"
   public_baseurl: "https://matrix.nwo1.xyz"
   
   database:
     name: sqlite3
     args:
       database: /var/lib/matrix-synapse/homeserver.db
   
   listeners:
     - port: 8008
       type: http
       bind_addresses: ['127.0.0.1']
       resources:
         - names: [client, federation]
           compress: false
   ```

6. **Configurează Nginx** (reverse proxy):
   ```nginx
   server {
       listen 443 ssl http2;
       server_name matrix.nwo1.xyz;
       
       ssl_certificate /etc/letsencrypt/live/matrix.nwo1.xyz/fullchain.pem;
       ssl_certificate_key /etc/letsencrypt/live/matrix.nwo1.xyz/privkey.pem;
       
       location / {
           proxy_pass http://127.0.0.1:8008;
           proxy_set_header X-Forwarded-For $remote_addr;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_set_header Host $host;
       }
   }
   ```

7. **Instalează SSL** (Let's Encrypt):
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d matrix.nwo1.xyz
   ```

8. **Pornește Synapse**:
   ```bash
   sudo systemctl enable matrix-synapse
   sudo systemctl start matrix-synapse
   ```

**Cost:** **GRATUIT** pentru totdeauna!

---

### 2. **Hetzner Cloud** ⭐⭐⭐⭐ (Foarte bun, dar plătit)

**Avantaje:**
- ✅ Prețuri foarte bune (~€4/lună)
- ✅ Performanță excelentă
- ✅ Rulare 24/7 garantată
- ✅ Storage SSD rapid

**Dezavantaje:**
- ❌ Nu este gratuit (dar foarte ieftin)

**Pași similari cu Oracle Cloud**

---

### 3. **DigitalOcean** ⭐⭐⭐ (Bun, dar plătit)

**Avantaje:**
- ✅ Ușor de folosit
- ✅ Documentație excelentă
- ✅ $200 credit gratuit pentru început

**Dezavantaje:**
- ❌ După credit, costă ~$6/lună

---

### 4. **AWS Free Tier** ⭐⭐⭐ (Limitări)

**Avantaje:**
- ✅ 12 luni gratuit
- ✅ t2.micro instance

**Dezavantaje:**
- ❌ Doar 12 luni gratuit
- ❌ Resurse limitate (1GB RAM poate fi insuficient pentru Synapse)
- ❌ După 12 luni, costă ~$10/lună

---

### 5. **Contabo** ⭐⭐⭐⭐ (Foarte ieftin)

**Avantaje:**
- ✅ Prețuri foarte mici (~€3/lună)
- ✅ Resurse bune pentru preț
- ✅ Rulare 24/7

**Dezavantaje:**
- ❌ Nu este gratuit (dar foarte ieftin)

---

## 📊 Comparație Rapidă

| Platform | Cost | Rulare 24/7 | RAM | Recomandat |
|----------|------|-------------|-----|------------|
| **Oracle Cloud** | ✅ Gratuit | ✅ Da | 12GB | ⭐⭐⭐⭐⭐ |
| **Hetzner** | €4/lună | ✅ Da | 4GB | ⭐⭐⭐⭐ |
| **Contabo** | €3/lună | ✅ Da | 4GB | ⭐⭐⭐⭐ |
| **DigitalOcean** | $6/lună | ✅ Da | 1GB | ⭐⭐⭐ |
| **AWS Free Tier** | Gratuit 12 luni | ✅ Da | 1GB | ⭐⭐⭐ |
| **Render** | Gratuit | ❌ Nu | 512MB | ❌ |

---

## 🎯 Recomandarea Mea

### Pentru Homeserver Matrix:

**Opțiunea 1: Oracle Cloud Free Tier** (Cel mai bun)
- ✅ Complet gratuit
- ✅ Resurse suficiente (12GB RAM)
- ✅ Rulare 24/7 garantată
- ✅ Perfect pentru Synapse

**Opțiunea 2: Hetzner Cloud** (Dacă vrei ceva plătit)
- ✅ €4/lună (foarte ieftin)
- ✅ Performanță excelentă
- ✅ Ușor de configurat

---

## 🚀 Setup Rapid pe Oracle Cloud

### Pasul 1: Creează VM

1. Mergi la: https://cloud.oracle.com
2. **Create Instance**
3. **Shape**: VM.Standard.A1.Flex
4. **OCPUs**: 2
5. **Memory**: 12GB
6. **OS**: Ubuntu 22.04
7. **Create**

### Pasul 2: Configurează DNS

În DNS-ul domeniului `nwo1.xyz`:
```
A     matrix    -> IP-ul VM-ului
SRV   _matrix._tcp.nwo1.xyz.  10  5  443  matrix.nwo1.xyz.
```

### Pasul 3: Instalează Synapse

```bash
# Conectează-te
ssh ubuntu@your-ip

# Instalează Synapse (vezi instrucțiunile de mai sus)
```

### Pasul 4: Configurează Botul

În `.env`:
```env
HOMESERVER_URL=https://matrix.nwo1.xyz
ACCESS_TOKEN=token_de_pe_nwo1.xyz
DEALER_DOMAIN=nwo1.xyz
```

---

## ⚠️ Considerații Importante

### Resurse Necesare pentru Synapse:

- **RAM minim**: 1GB (recomandat 2GB+)
- **CPU**: 1 core (recomandat 2 cores)
- **Storage**: 10GB+ (crește cu utilizatorii)
- **Bandwidth**: Depinde de utilizare

### Mentenanță:

- ✅ Actualizări periodice Synapse
- ✅ Backup-uri pentru baza de date
- ✅ Monitorizare resurse
- ✅ Loguri și debugging

---

## 📚 Resurse Utile

- [Synapse Installation Guide](https://matrix-org.github.io/synapse/latest/setup/installation.html)
- [Oracle Cloud Free Tier](https://www.oracle.com/cloud/free/)
- [Matrix Server Setup](https://matrix.org/docs/guides/federating-your-server)
- [Hetzner Cloud](https://www.hetzner.com/cloud)

---

## 💡 Alternativă Simplă

**Dacă nu vrei să configurezi propriul homeserver:**

1. **Folosește matrix.org** (gratuit, deja configurat)
2. **Creează cont nou** cu username `nwo1xyz`
3. **Botul se conectează la matrix.org**
4. **Mesajele afișează `nwo1.xyz`** (prin DEALER_DOMAIN)

**Avantaje:**
- ✅ Zero configurare
- ✅ Zero mentenanță
- ✅ Funcționează imediat
- ✅ Gratuit

**Dezavantaje:**
- ❌ Matrix ID va fi `@nwo1xyz:matrix.org` (nu `@bot:nwo1.xyz`)

---

**Succes cu hosting-ul homeserver-ului! 🚀**

