# 🔄 Cum să schimbi Username-ul Botului

## ⚠️ Important: Nu poți schimba username-ul unui cont Matrix existent!

**Matrix ID-ul** (`@username:homeserver`) **NU** poate fi schimbat după ce contul este creat.

## 🎯 Ce vrei să obții?

### Opțiunea 1: `@nwo1.xyz:matrix.org` (username nou pe matrix.org)

**Ce înseamnă:**
- Username: `nwo1.xyz`
- Homeserver: `matrix.org`
- Format: `@nwo1.xyz:matrix.org`

**Cum să faci:**

1. **Creează un cont NOU pe matrix.org**:
   - Mergi la [app.element.io](https://app.element.io)
   - Click "Create Account"
   - **Username**: `nwo1.xyz` (sau ce vrei tu)
   - **Password**: alege o parolă
   - **Email**: adaugă email-ul tău

2. **Obține Access Token pentru noul cont**:
   - Loghează-te cu noul cont
   - Settings → Help & About → Access Token
   - Copiază token-ul

3. **Actualizează `.env`**:
   ```env
   HOMESERVER_URL=https://matrix.org
   ACCESS_TOKEN=noul_token_aici
   DEALER_DOMAIN=nwo1.xyz
   BOT_DISPLAY_NAME=nwo1.xyz
   ```

4. **Restartează botul**

**Rezultat:** Botul va avea Matrix ID `@nwo1.xyz:matrix.org`

---

### Opțiunea 2: `@username:nwo1.xyz` (pe propriul homeserver)

**Ce înseamnă:**
- Username: orice (ex: `bot`, `admin`, etc.)
- Homeserver: `nwo1.xyz` (propriul tău server)
- Format: `@bot:nwo1.xyz` sau `@admin:nwo1.xyz`

**Cum să faci:**

1. **Configurează propriul Homeserver Matrix** pe `nwo1.xyz`
   - Vezi `HOMESERVER_GUIDE.md` pentru instrucțiuni detaliate
   - Instalează Synapse pe serverul tău
   - Configurează DNS pentru `nwo1.xyz`

2. **Creează cont pe propriul homeserver**:
   ```bash
   # Pe serverul tău, după ce Synapse este configurat
   register_new_matrix_user -c /etc/matrix-synapse/homeserver.yaml https://matrix.nwo1.xyz
   ```

3. **Obține Access Token** pentru contul nou

4. **Actualizează `.env`**:
   ```env
   HOMESERVER_URL=https://matrix.nwo1.xyz
   ACCESS_TOKEN=token_de_pe_nwo1.xyz
   DEALER_DOMAIN=nwo1.xyz
   BOT_DISPLAY_NAME=bot
   ```

**Rezultat:** Botul va avea Matrix ID `@username:nwo1.xyz`

---

## 📝 Pași Rapizi pentru Opțiunea 1 (Recomandat)

### 1. Creează cont nou pe matrix.org

1. Mergi la: https://app.element.io
2. Click **"Create Account"**
3. **Username**: `nwo1xyz` sau `nwo1` (verifică disponibilitatea)
   - ⚠️ **Notă**: `nwo1.xyz` poate să nu fie disponibil (punctele pot fi problematice)
   - Încearcă: `nwo1xyz`, `nwo1bot`, `nwo1_bot`, etc.
4. Completează formularul și creează contul

### 2. Obține Access Token

1. Loghează-te cu noul cont
2. Click pe **profil** (stânga sus)
3. **Settings** → **Help & About**
4. Scroll până la **"Access Token"**
5. Click **"Show"** sau **"Reveal"**
6. **Copiază token-ul** (foarte lung, începe cu `mat_` sau `syt_`)

### 3. Actualizează configurația botului

**Editează `.env`**:
```env
HOMESERVER_URL=https://matrix.org
ACCESS_TOKEN=noul_token_copiat_aici
ADMIN_USERS=@wormunpol:matrix.org  # sau noul tău admin ID
DEFAULT_ROLE=Neverificat
VERIFICATION_CONTACTS=@admin1:nwo1.xyz,@admin2:nwo1.xyz
DEALER_DOMAIN=nwo1.xyz
BOT_DISPLAY_NAME=nwo1xyz
IGNORED_ROOMS=
```

### 4. Restartează botul

```bash
node bot.js
```

### 5. Verifică

Botul va afișa în consolă:
```
Found userId: @nwo1xyz:matrix.org
Bot user ID: @nwo1xyz:matrix.org
```

---

## ⚠️ Probleme Comune

### "Username already taken"
- Matrix.org are mulți utilizatori
- Încearcă variante: `nwo1xyz`, `nwo1bot`, `nwo1_xyz`, `nwo1bot2024`, etc.

### "Invalid username format"
- Username-urile Matrix nu pot conține puncte în unele cazuri
- Folosește: `nwo1xyz` în loc de `nwo1.xyz`

### "Cannot change existing account"
- Corect! Nu poți schimba username-ul unui cont existent
- Trebuie să creezi un cont NOU

---

## 🔄 Migrare Date (Opțional)

Dacă vrei să păstrezi datele vechi (muted users, roles, etc.):

1. **Copiază `data.json`** din vechiul bot
2. **Pune-l în noul proiect**
3. **Actualizează user IDs** în `data.json` dacă e necesar

---

## ✅ Rezumat

**Pentru `@nwo1.xyz:matrix.org`:**
1. Creează cont nou pe matrix.org cu username `nwo1xyz` (sau similar)
2. Obține access token
3. Actualizează `.env` cu noul token
4. Restartează botul

**Pentru `@username:nwo1.xyz`:**
1. Configurează propriul homeserver Matrix pe `nwo1.xyz`
2. Creează cont pe homeserver-ul tău
3. Actualizează `.env` cu `HOMESERVER_URL=https://matrix.nwo1.xyz`

---

**Succes! 🚀**

