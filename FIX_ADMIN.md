# 🔧 Fix: Bot șterge mesajele tale

## Problema

Botul șterge mesajele tale pentru că nu ești marcat ca **admin** în configurație.

## Soluție Rapidă

### Pasul 1: Verifică User ID-ul tău

Când pornești botul, vezi în consolă:
```
Found userId: @wormunpol:matrix.org
Bot user ID: @wormunpol:matrix.org
```

**User ID-ul tău este:** `@wormunpol:matrix.org`

### Pasul 2: Actualizează `.env`

**IMPORTANT:** Trebuie să ai un fișier `.env` în folderul proiectului!

1. **Dacă nu ai `.env`**, copiază `env.example`:
   ```bash
   cp env.example .env
   ```

2. **Editează `.env`** și adaugă User ID-ul tău în `ADMIN_USERS`:

   ```env
   ADMIN_USERS=@wormunpol:matrix.org
   ```

   Sau dacă ai mai mulți admini:
   ```env
   ADMIN_USERS=@wormunpol:matrix.org,@alt_admin:matrix.org
   ```

3. **Actualizează și ACCESS_TOKEN** dacă ai unul nou:
   ```env
   ACCESS_TOKEN=mat_y2akHoHcxqjsoy8BvUxuptKYxudAR3_pOqxE3
   ```

### Pasul 3: Restartează botul

```bash
node bot.js
```

## Verificare

După restart, botul **NU** ar trebui să-ți mai șteargă mesajele.

## Cum funcționează verificarea admin

Botul verifică dacă User ID-ul tău este în lista `ADMIN_USERS`:
- Dacă **DA** → Mesajele tale **NU** sunt șterse
- Dacă **NU** → Mesajele tale **SUNT** șterse dacă ai rolul "Neverificat"

## Exemplu complet `.env`

```env
HOMESERVER_URL=https://matrix.org
ACCESS_TOKEN=mat_y2akHoHcxqjsoy8BvUxuptKYxudAR3_pOqxE3
ADMIN_USERS=@wormunpol:matrix.org
DEFAULT_ROLE=Neverificat
VERIFICATION_CONTACTS=@admin1:example.com,@admin2:example.com
DEALER_DOMAIN=nwo1.xyz
BOT_DISPLAY_NAME=bot
IGNORED_ROOMS=!xsLlpIgJqHURSLlVyO:matrix.org
```

## Script automat pentru a obține User ID

Rulează:
```bash
node get-user-id.js
```

Acest script va afișa User ID-ul tău pe baza token-ului din `.env`.

---

**După ce actualizezi `.env` și restartezi botul, mesajele tale nu vor mai fi șterse! ✅**

