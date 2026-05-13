// ════════════════════════════════════════════════
//  SCADENZARIO — Invia notifiche FCM
//  Girato ogni ora da GitHub Actions
// ════════════════════════════════════════════════

const admin = require('firebase-admin');

// ── Init Firebase Admin ───────────────────────────────────────────────────────
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({
  credential:  admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DATABASE_URL
});
const db       = admin.database();
const messaging = admin.messaging();

// ── Utils ─────────────────────────────────────────────────────────────────────
function daysUntil(dateStr) {
  const today  = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + 'T00:00:00'); target.setHours(0, 0, 0, 0);
  return Math.round((target - today) / (1000 * 60 * 60 * 24));
}

function todayKey() {
  return new Date().toISOString().split('T')[0];
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const today = todayKey();

  // Carica tutti i token FCM registrati
  const tokensSnap = await db.ref('fcm_tokens').once('value');
  const tokensData = tokensSnap.val() || {};
  const tokens     = Object.values(tokensData).map(d => d.token).filter(Boolean);

  if (!tokens.length) {
    console.log('Nessun token FCM registrato, niente da fare.');
    process.exit(0);
  }

  // Carica tutte le scadenze (Luca + Vanessa)
  const scadSnap = await db.ref('scadenzario').once('value');
  const allData  = scadSnap.val() || {};

  let sent = 0;

  for (const owner of Object.keys(allData)) {
    const items = Object.entries(allData[owner] || {}).map(([id, v]) => ({ id, ...v }));

    for (const item of items) {
      const days = daysUntil(item.date);
      if (days < 0 || days > (item.notifyDays || 30)) continue;

      // Controlla se già notificato oggi per questo item
      const notifPath = `notif_sent/${item.id}/${today}`;
      const alreadySnap = await db.ref(notifPath).once('value');
      if (alreadySnap.val()) continue;

      const body = days === 0
        ? '⚡ Scade oggi!'
        : `Scade tra ${days} giorn${days === 1 ? 'o' : 'i'}`;

      const ownerLabel = owner.charAt(0).toUpperCase() + owner.slice(1);
      const title = `📅 ${item.name}`;

      // Invia a tutti i dispositivi registrati
      const message = {
        notification: { title, body: `[${ownerLabel}] ${body}` },
        tokens
      };

      try {
        const result = await messaging.sendEachForMulticast(message);
        console.log(`✅ "${item.name}" → ${result.successCount} ok, ${result.failureCount} errori`);
        sent++;

        // Segna come notificato
        await db.ref(notifPath).set(true);
      } catch (err) {
        console.error(`❌ Errore per "${item.name}":`, err.message);
      }
    }
  }

  console.log(`\nFatto. Notifiche inviate: ${sent}`);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
