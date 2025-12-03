# 🏠 Ghid: Ce este HOMESERVER_URL și cum să folosești propriul domeniu

## 📚 Ce este HOMESERVER_URL?

**HOMESERVER_URL** este adresa serverului Matrix unde botul se conectează pentru a comunica.

### Exemplu:
```
HOMESERVER_URL=https://matrix.org
```

Aceasta înseamnă că botul se conectează la serverul Matrix de la `matrix.org`.

---

## 🔍 Diferența Importantă

### 1. **HOMESERVER_URL** (unde botul se conectează)
- Este adresa **reală** a serverului Matrix
- Trebuie să fie un server Matrix funcțional
- Exemple: `https://matrix.org`, `https://matrix.example.com`

### 2. **DEALER_DOMAIN** (doar text pentru mesaje)
- Este **doar text** afișat în mesajele de bun venit
- **NU** trebuie să fie un server real
- Poate fi orice: `nwo1.xyz`, `admin.com`, `whatever`

---

## 🎯 Pentru domeniul tău `nwo1.xyz`

Ai **2 opțiuni**:

### ✅ Opțiunea 1: Folosește `nwo1.xyz` doar ca DEALER_DOMAIN (Recomandat - Simplu)

**Ce înseamnă:**
- Botul se conectează la `matrix.org` (sau alt homeserver existent)
- În mesaje apare `nwo1.xyz` ca domeniu dealer/admin
- **NU** trebuie să configurezi un server Matrix

**Cum să faci:**

1. **În fișierul `.env`**:
   ```env
   HOMESERVER_URL=https://matrix.org
   DEALER_DOMAIN=nwo1.xyz
   ```

2. **Gata!** Botul va folosi `matrix.org` pentru conexiune și va afișa `nwo1.xyz` în mesaje.

**Avantaje:**
- ✅ Foarte simplu
- ✅ Funcționează imediat
- ✅ Nu necesită configurare server

---

### ⚙️ Opțiunea 2: Configurează propriul Homeserver Matrix pe `nwo1.xyz` (Avansat)

**Ce înseamnă:**
- Configurezi un server Matrix (Synapse) pe domeniul tău
- Botul se conectează la `https://nwo1.xyz` sau `https://matrix.nwo1.xyz`
- Utilizatorii pot crea conturi `@user:nwo1.xyz`

**Cum să faci:**

#### Pasul 1: Configurează DNS

Adaugă în DNS-ul domeniului tău:

```
A     @              -> IP-ul serverului tău
A     matrix         -> IP-ul serverului tău
CNAME _matrix._tcp   -> matrix.nwo1.xyz
```

#### Pasul 2: Instalează Synapse (Server Matrix)

Pe serverul tău (VPS/Cloud):

```bash
# Instalează Synapse
sudo apt update
sudo apt install -y python3-pip python3-venv python3-dev
sudo apt install -y build-essential libssl-dev libffi-dev python3-setuptools

# Creează utilizator pentru Synapse
sudo adduser --system --group --home /var/lib/matrix-synapse synapse

# Instalează Synapse
sudo python3 -m venv /opt/venv/matrix-synapse
source /opt/venv/matrix-synapse/bin/activate
pip install --upgrade pip
pip install matrix-synapse

# Generează configurație
python -m synapse.app.homeserver \
    --server-name nwo1.xyz \
    --config-path /etc/matrix-synapse/homeserver.yaml \
    --generate-config \
    --report-stats=no
```

#### Pasul 3: Configurează Synapse

Editează `/etc/matrix-synapse/homeserver.yaml`:

```yaml
server_name: "nwo1.xyz"
public_baseurl: "https://matrix.nwo1.xyz"

listeners:
  - port: 8008
    type: http
    bind_addresses: ['::1', '127.0.0.1']
    resources:
      - names: [client, federation]
        compress: false
```

#### Pasul 4: Configurează Nginx (Reverse Proxy)

```nginx
server {
    listen 443 ssl http2;
    server_name matrix.nwo1.xyz;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://127.0.0.1:8008;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Host $host;
    }
}
```

#### Pasul 5: Configurează botul

În `.env`:
```env
HOMESERVER_URL=https://matrix.nwo1.xyz
DEALER_DOMAIN=nwo1.xyz
```

**Avantaje:**
- ✅ Control complet
- ✅ Utilizatori `@user:nwo1.xyz`
- ✅ Server propriu

**Dezavantaje:**
- ❌ Complex de configurat
- ❌ Necesită server VPS
- ❌ Necesită mentenanță

---

## 🚀 Recomandarea Mea

**Pentru început**: Folosește **Opțiunea 1**
- Setează `DEALER_DOMAIN=nwo1.xyz` în `.env`
- Lasă `HOMESERVER_URL=https://matrix.org`
- Botul va funcționa perfect și va afișa `nwo1.xyz` în mesaje

**Dacă vrei control complet mai târziu**: Configurează propriul homeserver (Opțiunea 2)

---

## 📝 Configurare Rapidă (Opțiunea 1)

1. **Editează `.env`**:
   ```env
   HOMESERVER_URL=https://matrix.org
   DEALER_DOMAIN=nwo1.xyz
   ```

2. **Restartează botul**

3. **Gata!** Mesajele vor afișa `nwo1.xyz` ca domeniu dealer/admin.

---

## 🔗 Resurse Utile

- [Synapse Installation Guide](https://matrix-org.github.io/synapse/latest/setup/installation.html)
- [Matrix Server Setup](https://matrix.org/docs/guides/federating-your-server)
- [Element Server Guide](https://element.io/help#federation)

---

## ❓ FAQ

**Q: Pot folosi `nwo1.xyz` direct ca HOMESERVER_URL fără să configurez server?**
A: Nu. HOMESERVER_URL trebuie să fie un server Matrix funcțional. Dacă nu ai configurat Synapse pe `nwo1.xyz`, nu va funcționa.

**Q: Ce se întâmplă dacă pun `HOMESERVER_URL=https://nwo1.xyz` fără server?**
A: Botul va da eroare la conectare. Trebuie să existe un server Matrix real la acea adresă.

**Q: DEALER_DOMAIN trebuie să fie real?**
A: Nu! DEALER_DOMAIN este doar text afișat în mesaje. Poate fi orice.

**Q: Pot folosi `nwo1.xyz` pentru ambele?**
A: Da, dar pentru HOMESERVER_URL trebuie să configurezi serverul Matrix mai întâi.

---

**Succes! 🎉**

