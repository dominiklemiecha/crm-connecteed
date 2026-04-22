#!/bin/bash
# ============================================================
# CRM Connecteed — SEED DEMO DATA
# Crea un dataset completo e realistico per presentazione
# ============================================================

BASE="http://localhost:3000/api/v1"
TENANT="a0000000-0000-0000-0000-000000000001"

req() {
  local method="$1" url="$2" data="$3"
  local args=(-s -X "$method" "$BASE$url" -H "Content-Type: application/json")
  [ -n "$TOKEN" ] && args+=(-H "Authorization: Bearer $TOKEN")
  [ -n "$data" ] && args+=(-d "$data")
  BODY=$(curl "${args[@]}")
}
extract() { echo "$BODY" | grep -o "\"$1\":\"[^\"]*\"" | head -1 | cut -d'"' -f4; }

echo "=== SEED DEMO DATA ==="
echo ""

# ─── ADMIN + LOGIN ─────────────────────────────────────────
echo "1. Creazione admin..."
BODY=$(curl -s -X POST "$BASE/auth/register" -H "Content-Type: application/json" -H "x-tenant-id: $TENANT" -d '{"email":"dominik@connecteed.com","password":"Admin123!@#","firstName":"Dominik","lastName":"Cecchin","role":"ceo","type":"internal"}')
BODY=$(curl -s -X POST "$BASE/auth/login" -H "Content-Type: application/json" -d '{"email":"dominik@connecteed.com","password":"Admin123!@#"}')
TOKEN=$(extract "accessToken")
ADMIN_ID=$(echo "$BODY" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "   Admin: $ADMIN_ID"

# ─── REPARTI ───────────────────────────────────────────────
echo "2. Reparti..."
for dept in "Development" "Design & UX" "Project Management" "Support" "Amministrazione" "Legal"; do
  req POST "/departments" "{\"name\":\"$dept\"}"
done
echo "   6 reparti creati"

# ─── PRODOTTI ──────────────────────────────────────────────
echo "3. Prodotti..."
for p in \
  '{"code":"WEB-APP","name":"Sviluppo Web Application","category":"Development","description":"Applicazione web full-stack personalizzata"}' \
  '{"code":"MOBILE","name":"App Mobile iOS/Android","category":"Development","description":"Applicazione mobile nativa o cross-platform"}' \
  '{"code":"ECOMMERCE","name":"Piattaforma E-commerce","category":"Development","description":"E-commerce B2B o B2C con gestione ordini"}' \
  '{"code":"CRM-CUSTOM","name":"CRM Personalizzato","category":"Development","description":"Sistema gestionale su misura"}' \
  '{"code":"CONSULTING","name":"Consulenza IT","category":"Servizi","description":"Consulenza strategica e tecnologica"}' \
  '{"code":"MAINTENANCE","name":"Manutenzione e Supporto","category":"Servizi","description":"Assistenza tecnica e manutenzione applicativa"}'; do
  req POST "/products" "$p"
done
PROD_WEBAPP=$(curl -s "$BASE/products" -H "Authorization: Bearer $TOKEN" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
PROD_ECOMM=$(curl -s "$BASE/products" -H "Authorization: Bearer $TOKEN" | grep -o '"id":"[^"]*"' | sed -n '3p' | cut -d'"' -f4)
PROD_CRM=$(curl -s "$BASE/products" -H "Authorization: Bearer $TOKEN" | grep -o '"id":"[^"]*"' | sed -n '4p' | cut -d'"' -f4)
echo "   6 prodotti creati"

# ─── TEAM (utenti interni) ─────────────────────────────────
echo "4. Team interno..."
for u in \
  '{"email":"marco.rossi@connecteed.com","password":"Team123!@#","firstName":"Marco","lastName":"Rossi","role":"commerciale","type":"internal"}' \
  '{"email":"laura.bianchi@connecteed.com","password":"Team123!@#","firstName":"Laura","lastName":"Bianchi","role":"pm","type":"internal"}' \
  '{"email":"andrea.verdi@connecteed.com","password":"Team123!@#","firstName":"Andrea","lastName":"Verdi","role":"dev","type":"internal"}' \
  '{"email":"sara.neri@connecteed.com","password":"Team123!@#","firstName":"Sara","lastName":"Neri","role":"design","type":"internal"}' \
  '{"email":"paolo.gialli@connecteed.com","password":"Team123!@#","firstName":"Paolo","lastName":"Gialli","role":"support","type":"internal"}' \
  '{"email":"giulia.ferrari@connecteed.com","password":"Team123!@#","firstName":"Giulia","lastName":"Ferrari","role":"admin_legal","type":"internal"}'; do
  req POST "/users" "$u"
done
echo "   7 utenti interni (admin + 6 team)"

# ─── AZIENDE CLIENTI ──────────────────────────────────────
echo "5. Aziende clienti..."

# Cliente 1 - PROGETTO COMPLETATO
req POST "/companies" '{"name":"TechStore Italia Srl","vatNumber":"IT12345678901","email":"info@techstore.it","phone":"+39 02 1234567","address":{"street":"Via Montenapoleone 15","city":"Milano","province":"MI","postalCode":"20121","country":"IT"},"notes":"Catena e-commerce elettronica, 3 punti vendita. Cliente dal 2024."}'
C1_ID=$(extract "id")

# Cliente 2 - PROGETTO IN CORSO
req POST "/companies" '{"name":"FoodDelivery SpA","vatNumber":"IT98765432109","email":"info@fooddelivery.it","phone":"+39 06 9876543","address":{"street":"Via del Corso 120","city":"Roma","province":"RM","postalCode":"00186","country":"IT"},"notes":"Startup food delivery, Serie A funding. Alto potenziale."}'
C2_ID=$(extract "id")

# Cliente 3 - IN FASE PREVENTIVO
req POST "/companies" '{"name":"ModaStyle Srl","vatNumber":"IT55566677788","email":"direzione@modastyle.it","phone":"+39 055 1234567","address":{"street":"Via Tornabuoni 8","city":"Firenze","province":"FI","postalCode":"50123","country":"IT"},"notes":"Brand moda italiano, 20 negozi + online."}'
C3_ID=$(extract "id")

# Cliente 4 - LEAD NUOVO
req POST "/companies" '{"name":"GreenEnergy Srl","vatNumber":"IT11122233344","email":"info@greenenergy.it","phone":"+39 011 5556677","address":{"street":"Corso Vittorio Emanuele 45","city":"Torino","province":"TO","postalCode":"10121","country":"IT"},"notes":"Azienda energie rinnovabili. Primo contatto da LinkedIn."}'
C4_ID=$(extract "id")

# Cliente 5 - LEAD PERSO
req POST "/companies" '{"name":"OldBank Spa","vatNumber":"IT99988877766","email":"it@oldbank.it","phone":"+39 02 9998877","address":{"street":"Piazza Affari 1","city":"Milano","province":"MI","postalCode":"20123","country":"IT"},"notes":"Banca tradizionale, molto conservativa."}'
C5_ID=$(extract "id")
echo "   5 aziende clienti"

# ─── CONTATTI ──────────────────────────────────────────────
echo "6. Contatti..."
req POST "/contacts" "{\"companyId\":\"$C1_ID\",\"firstName\":\"Giuseppe\",\"lastName\":\"Ferraro\",\"email\":\"giuseppe@techstore.it\",\"phone\":\"+39 333 1234567\",\"role\":\"Direttore IT\",\"isPrimary\":true}"
req POST "/contacts" "{\"companyId\":\"$C1_ID\",\"firstName\":\"Anna\",\"lastName\":\"Colombo\",\"email\":\"anna@techstore.it\",\"phone\":\"+39 333 7654321\",\"role\":\"Responsabile Acquisti\"}"
req POST "/contacts" "{\"companyId\":\"$C2_ID\",\"firstName\":\"Luca\",\"lastName\":\"Martini\",\"email\":\"luca@fooddelivery.it\",\"phone\":\"+39 348 1112233\",\"role\":\"CTO\",\"isPrimary\":true}"
req POST "/contacts" "{\"companyId\":\"$C3_ID\",\"firstName\":\"Chiara\",\"lastName\":\"Ricci\",\"email\":\"chiara@modastyle.it\",\"phone\":\"+39 347 9998877\",\"role\":\"Digital Manager\",\"isPrimary\":true}"
req POST "/contacts" "{\"companyId\":\"$C4_ID\",\"firstName\":\"Roberto\",\"lastName\":\"Esposito\",\"email\":\"roberto@greenenergy.it\",\"phone\":\"+39 340 5556677\",\"role\":\"CEO\",\"isPrimary\":true}"
req POST "/contacts" "{\"companyId\":\"$C5_ID\",\"firstName\":\"Mario\",\"lastName\":\"Draghi\",\"email\":\"mario@oldbank.it\",\"phone\":\"+39 02 1119999\",\"role\":\"CIO\",\"isPrimary\":true}"
echo "   6 contatti"

# ─── ACCESSI PORTALE CLIENTE ──────────────────────────────
echo "7. Accessi portale..."
req POST "/users" "{\"email\":\"giuseppe@techstore.it\",\"password\":\"Client123!@#\",\"firstName\":\"Giuseppe\",\"lastName\":\"Ferraro\",\"role\":\"client_admin\",\"type\":\"client\",\"companyId\":\"$C1_ID\"}"
req POST "/users" "{\"email\":\"luca@fooddelivery.it\",\"password\":\"Client123!@#\",\"firstName\":\"Luca\",\"lastName\":\"Martini\",\"role\":\"client_admin\",\"type\":\"client\",\"companyId\":\"$C2_ID\"}"
req POST "/users" "{\"email\":\"chiara@modastyle.it\",\"password\":\"Client123!@#\",\"firstName\":\"Chiara\",\"lastName\":\"Ricci\",\"role\":\"client_admin\",\"type\":\"client\",\"companyId\":\"$C3_ID\"}"
echo "   3 accessi portale"

# ─── LEAD (vari stati) ────────────────────────────────────
echo "8. Lead..."

# Lead 1 - NUOVO (GreenEnergy)
req POST "/leads" "{\"companyName\":\"GreenEnergy Srl\",\"companyId\":\"$C4_ID\",\"contactName\":\"Roberto Esposito\",\"contactEmail\":\"roberto@greenenergy.it\",\"source\":\"LinkedIn\",\"ownerId\":\"$ADMIN_ID\",\"assignedToUserId\":\"$ADMIN_ID\",\"nextDueDate\":\"2026-04-20T00:00:00Z\",\"valueEstimateCents\":9500000,\"probability\":40,\"productIds\":[\"$PROD_CRM\"],\"notes\":\"Primo contatto da LinkedIn. Interessato a CRM per gestione impianti.\"}"
LEAD_NEW=$(extract "id")

# Lead 2 - IN QUALIFICA (da qualificare)
req POST "/leads" "{\"companyName\":\"StartupXYZ\",\"contactName\":\"Alex Startup\",\"contactEmail\":\"alex@startupxyz.com\",\"source\":\"Website\",\"ownerId\":\"$ADMIN_ID\",\"assignedToUserId\":\"$ADMIN_ID\",\"nextDueDate\":\"2026-04-18T00:00:00Z\",\"valueEstimateCents\":3000000,\"probability\":25,\"productIds\":[\"$PROD_WEBAPP\"],\"notes\":\"Form dal sito. Startup early stage.\"}"
LEAD_QUAL=$(extract "id")
req PUT "/leads/$LEAD_QUAL/status" '{"status":"qualifying"}'

# Lead 3 - PERSO (OldBank)
req POST "/leads" "{\"companyName\":\"OldBank Spa\",\"companyId\":\"$C5_ID\",\"contactName\":\"Mario Draghi\",\"contactEmail\":\"mario@oldbank.it\",\"source\":\"Cold Email\",\"ownerId\":\"$ADMIN_ID\",\"assignedToUserId\":\"$ADMIN_ID\",\"nextDueDate\":\"2026-03-15T00:00:00Z\",\"valueEstimateCents\":25000000,\"probability\":10,\"productIds\":[\"$PROD_CRM\"],\"notes\":\"Cold outreach. Budget bloccato per il 2026.\"}"
LEAD_LOST=$(extract "id")
req PUT "/leads/$LEAD_LOST/status" '{"status":"qualifying"}'
req PUT "/leads/$LEAD_LOST/status" '{"status":"unqualified"}'

echo "   3 lead (nuovo, in qualifica, non qualificato)"

# ─── SCENARIO A: TECHSTORE (PROGETTO COMPLETATO) ──────────
echo "9. Scenario A: TechStore — flusso completo fino a progetto..."

# Opportunita
req POST "/opportunities" "{\"name\":\"E-commerce TechStore 2026\",\"companyId\":\"$C1_ID\",\"productId\":\"$PROD_ECOMM\",\"source\":\"Referral\",\"ownerId\":\"$ADMIN_ID\",\"assignedToUserId\":\"$ADMIN_ID\",\"nextDueDate\":\"2026-03-01T00:00:00Z\",\"estimatedValueCents\":12500000,\"probability\":90,\"notes\":\"Rifacimento piattaforma e-commerce. Migrazione da Magento.\"}"
OPP_A=$(extract "id")
for s in presales quote_preparing; do req PUT "/opportunities/$OPP_A/status" "{\"status\":\"$s\"}"; done

# Preventivo
req POST "/quotes" "{\"opportunityId\":\"$OPP_A\",\"companyId\":\"$C1_ID\",\"notes\":\"Preventivo per rifacimento piattaforma e-commerce TechStore\",\"items\":[{\"type\":\"fixed\",\"description\":\"Analisi e Design UX/UI\",\"quantity\":1,\"unitPriceCents\":2000000},{\"type\":\"fixed\",\"description\":\"Sviluppo Backend NestJS\",\"quantity\":1,\"unitPriceCents\":3500000},{\"type\":\"fixed\",\"description\":\"Sviluppo Frontend React\",\"quantity\":1,\"unitPriceCents\":3000000},{\"type\":\"fixed\",\"description\":\"Migrazione dati Magento\",\"quantity\":1,\"unitPriceCents\":1500000},{\"type\":\"fixed\",\"description\":\"Testing, QA e Deploy\",\"quantity\":1,\"unitPriceCents\":1000000},{\"type\":\"t_and_m\",\"description\":\"Formazione team (giornata)\",\"quantity\":10,\"unitPriceCents\":150000}]}"
Q_A=$(extract "id")

# CEO approval
req POST "/quotes/$Q_A/status" '{"status":"awaiting_ceo"}'
APP_A=$(curl -s "$BASE/approvals/pending" -H "Authorization: Bearer $TOKEN" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
req POST "/approvals/$APP_A/approve" '{"notes":"Approvato. Ottimo margine sul progetto."}'
req POST "/quotes/$Q_A/status" '{"status":"sent"}'
req POST "/quotes/$Q_A/status" '{"status":"accepted"}'

# Contratto
CT_A=$(curl -s "$BASE/contracts" -H "Authorization: Bearer $TOKEN" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
req POST "/contracts/$CT_A/status" '{"status":"awaiting_ceo"}'
APP_CT=$(curl -s "$BASE/approvals/pending" -H "Authorization: Bearer $TOKEN" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
req POST "/approvals/$APP_CT/approve" '{"notes":"Contratto approvato"}'
req POST "/contracts/$CT_A/status" '{"status":"signing"}'
req POST "/contracts/$CT_A/status" '{"status":"signed"}'

# Pagamento → auto progetto
INV_A=$(curl -s "$BASE/invoices" -H "Authorization: Bearer $TOKEN" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
INV_TOTAL=$(curl -s "$BASE/invoices/$INV_A" -H "Authorization: Bearer $TOKEN" | grep -o '"totalCents":"[^"]*"' | head -1 | cut -d'"' -f4)
[ -z "$INV_TOTAL" ] && INV_TOTAL=12500000
docker exec connecteed-postgres psql -U connecteed -d crm_connecteed -c "INSERT INTO payments (id, tenant_id, invoice_id, amount_cents, method, status, payment_date, reference) VALUES (gen_random_uuid(), '$TENANT', '$INV_A', $INV_TOTAL, 'bank_transfer', 'paid', '2026-03-10', 'CRO-TECHSTORE-001');" 2>/dev/null
docker exec connecteed-postgres psql -U connecteed -d crm_connecteed -c "UPDATE invoices SET status='paid', paid_at=NOW() WHERE id='$INV_A';" 2>/dev/null

# Crea progetto manualmente (il gate automatico potrebbe non scattare via SQL)
req POST "/projects" "{\"companyId\":\"$C1_ID\",\"opportunityId\":\"$OPP_A\",\"contractId\":\"$CT_A\",\"name\":\"E-commerce TechStore\",\"description\":\"Rifacimento piattaforma e-commerce con React + NestJS\"}"
PROJ_A=$(extract "id")

# Gantt tasks
req POST "/projects/$PROJ_A/gantt" '{"name":"Kickoff Meeting","assignedTeam":"Project Management","startDatePlanned":"2026-03-15","endDatePlanned":"2026-03-15","isMilestone":true}'
T1=$(extract "id")
req POST "/projects/$PROJ_A/gantt" '{"name":"Analisi Requisiti","assignedTeam":"Development","startDatePlanned":"2026-03-16","endDatePlanned":"2026-03-28"}'
T2=$(extract "id")
req POST "/projects/$PROJ_A/gantt" '{"name":"Design UX/UI","assignedTeam":"Design & UX","startDatePlanned":"2026-03-20","endDatePlanned":"2026-04-05"}'
T3=$(extract "id")
req POST "/projects/$PROJ_A/gantt" '{"name":"Milestone: Design Approvato","assignedTeam":"Project Management","startDatePlanned":"2026-04-05","endDatePlanned":"2026-04-05","isMilestone":true}'
req POST "/projects/$PROJ_A/gantt" '{"name":"Sviluppo Backend API","assignedTeam":"Development","startDatePlanned":"2026-04-06","endDatePlanned":"2026-05-10"}'
T5=$(extract "id")
req POST "/projects/$PROJ_A/gantt" '{"name":"Sviluppo Frontend React","assignedTeam":"Development","startDatePlanned":"2026-04-15","endDatePlanned":"2026-05-20"}'
req POST "/projects/$PROJ_A/gantt" '{"name":"Migrazione Dati Magento","assignedTeam":"Development","startDatePlanned":"2026-05-10","endDatePlanned":"2026-05-20"}'
req POST "/projects/$PROJ_A/gantt" '{"name":"Testing & QA","assignedTeam":"Development","startDatePlanned":"2026-05-21","endDatePlanned":"2026-06-01"}'
req POST "/projects/$PROJ_A/gantt" '{"name":"Go-Live","assignedTeam":"Project Management","startDatePlanned":"2026-06-05","endDatePlanned":"2026-06-05","isMilestone":true}'

# Aggiorna progresso
req PUT "/projects/gantt/$T1/progress" '{"progressPct":100}'
req PUT "/projects/gantt/$T2/progress" '{"progressPct":100}'
req PUT "/projects/gantt/$T3/progress" '{"progressPct":80}'
req PUT "/projects/gantt/$T5/progress" '{"progressPct":30}'

echo "   TechStore: Lead→Opp→Prev→CEO→Contratto→Pagamento→Progetto con 9 task"

# ─── SCENARIO B: FOODDELIVERY (IN CORSO) ──────────────────
echo "10. Scenario B: FoodDelivery — in fase preventivo..."

req POST "/opportunities" "{\"name\":\"App Delivery FoodDelivery\",\"companyId\":\"$C2_ID\",\"productId\":\"$PROD_WEBAPP\",\"source\":\"Evento\",\"ownerId\":\"$ADMIN_ID\",\"assignedToUserId\":\"$ADMIN_ID\",\"nextDueDate\":\"2026-04-30T00:00:00Z\",\"estimatedValueCents\":8500000,\"probability\":65,\"notes\":\"App delivery con tracking real-time. Hanno fretta.\"}"
OPP_B=$(extract "id")
for s in presales quote_preparing; do req PUT "/opportunities/$OPP_B/status" "{\"status\":\"$s\"}"; done

req POST "/quotes" "{\"opportunityId\":\"$OPP_B\",\"companyId\":\"$C2_ID\",\"notes\":\"Preventivo app delivery con tracking\",\"items\":[{\"type\":\"fixed\",\"description\":\"Design App Mobile\",\"quantity\":1,\"unitPriceCents\":1500000},{\"type\":\"fixed\",\"description\":\"Sviluppo App React Native\",\"quantity\":1,\"unitPriceCents\":3500000},{\"type\":\"fixed\",\"description\":\"Backend API + Real-time\",\"quantity\":1,\"unitPriceCents\":2500000},{\"type\":\"fixed\",\"description\":\"Testing e Release\",\"quantity\":1,\"unitPriceCents\":1000000}]}"
Q_B=$(extract "id")
req POST "/quotes/$Q_B/status" '{"status":"awaiting_ceo"}'
echo "   FoodDelivery: Opp in quote_preparing, preventivo in attesa CEO"

# ─── SCENARIO C: MODASTYLE (PRE-VENDITA) ──────────────────
echo "11. Scenario C: ModaStyle — opportunita in pre-vendita..."

req POST "/opportunities" "{\"name\":\"E-commerce Moda ModaStyle\",\"companyId\":\"$C3_ID\",\"productId\":\"$PROD_ECOMM\",\"source\":\"Partner\",\"ownerId\":\"$ADMIN_ID\",\"assignedToUserId\":\"$ADMIN_ID\",\"nextDueDate\":\"2026-05-15T00:00:00Z\",\"estimatedValueCents\":18000000,\"probability\":50,\"notes\":\"Grande progetto e-commerce moda. Concorrenza con altra agenzia.\"}"
OPP_C=$(extract "id")
req PUT "/opportunities/$OPP_C/status" '{"status":"presales"}'
echo "   ModaStyle: Opp in pre-vendita"

# ─── SCENARIO D: OPP PERSA ────────────────────────────────
echo "12. Scenario D: OldBank — opportunita persa..."

req POST "/opportunities" "{\"name\":\"Portale Banking OldBank\",\"companyId\":\"$C5_ID\",\"productId\":\"$PROD_WEBAPP\",\"source\":\"Cold Email\",\"ownerId\":\"$ADMIN_ID\",\"estimatedValueCents\":25000000,\"probability\":15}"
OPP_D=$(extract "id")
req PUT "/opportunities/$OPP_D/status" '{"status":"lost","lostReason":"Budget congelato. Decisione rimandata al 2027."}'
echo "   OldBank: Opp persa con motivo"

# ─── TICKET (vari stati) ──────────────────────────────────
echo "13. Ticket..."

req POST "/tickets" '{"subject":"Bug pagina checkout","description":"Il bottone Paga non funziona su Safari mobile","priority":"urgent","type":"bug","category":"frontend","slaClass":"support","channel":"portal","assignedTeam":"Development"}'
TK1=$(extract "id")
req POST "/tickets/$TK1/reply" '{"content":"Confermato il bug su Safari 17. Stiamo lavorando al fix.","isInternal":false}'
req POST "/tickets/$TK1/reply" '{"content":"Fix applicato in staging, da testare prima del deploy","isInternal":true}'

req POST "/tickets" '{"subject":"Richiesta preventivo personalizzazione","description":"Vorremmo aggiungere un modulo di loyalty points al nostro e-commerce","priority":"medium","type":"feature_request","category":"presales","slaClass":"presales","channel":"email","assignedTeam":"Development"}'

req POST "/tickets" '{"subject":"Fattura non ricevuta","description":"Non abbiamo ricevuto la fattura del mese di marzo","priority":"low","type":"question","category":"admin","slaClass":"admin","channel":"portal","assignedTeam":"Amministrazione"}'
TK3=$(extract "id")
req PUT "/tickets/$TK3/status" '{"status":"closed"}'

req POST "/tickets" '{"subject":"Tempistiche progetto app delivery","description":"Vorremmo sapere quando potremo iniziare il progetto e avere una timeline dettagliata","priority":"medium","slaClass":"delivery","channel":"portal","assignedTeam":"Support"}'

echo "   4 ticket (urgente con thread, richiesta, chiuso, dal portale)"

# ─── TIME ENTRIES ─────────────────────────────────────────
echo "14. Ore lavorate..."
if [ -n "$PROJ_A" ]; then
  for entry in \
    "{\"projectId\":\"$PROJ_A\",\"userId\":\"$ADMIN_ID\",\"date\":\"2026-03-15\",\"hours\":2,\"description\":\"Kickoff meeting con il cliente\",\"billable\":true}" \
    "{\"projectId\":\"$PROJ_A\",\"userId\":\"$ADMIN_ID\",\"date\":\"2026-03-16\",\"hours\":6,\"description\":\"Analisi requisiti funzionali\",\"billable\":true}" \
    "{\"projectId\":\"$PROJ_A\",\"userId\":\"$ADMIN_ID\",\"date\":\"2026-03-17\",\"hours\":8,\"description\":\"Analisi requisiti tecnici + architettura\",\"billable\":true}" \
    "{\"projectId\":\"$PROJ_A\",\"userId\":\"$ADMIN_ID\",\"date\":\"2026-03-20\",\"hours\":4,\"description\":\"Wireframe pagine principali\",\"billable\":true}" \
    "{\"projectId\":\"$PROJ_A\",\"userId\":\"$ADMIN_ID\",\"date\":\"2026-03-21\",\"hours\":6,\"description\":\"Design UI homepage + catalogo\",\"billable\":true}" \
    "{\"projectId\":\"$PROJ_A\",\"userId\":\"$ADMIN_ID\",\"date\":\"2026-04-06\",\"hours\":8,\"description\":\"Setup backend NestJS + DB schema\",\"billable\":true}" \
    "{\"projectId\":\"$PROJ_A\",\"userId\":\"$ADMIN_ID\",\"date\":\"2026-04-07\",\"hours\":7,\"description\":\"API prodotti + categorie\",\"billable\":true}" \
    "{\"projectId\":\"$PROJ_A\",\"userId\":\"$ADMIN_ID\",\"date\":\"2026-04-08\",\"hours\":6,\"description\":\"API carrello + checkout\",\"billable\":true}"; do
    req POST "/time-entries" "$entry"
  done
  echo "   8 entry ore lavorate"
fi

# ─── TEMPLATE DOCUMENTI ───────────────────────────────────
echo "15. Template documenti..."
req POST "/templates/ensure-defaults"
echo "   Template default creati"

# ─── NOTIFICHE ────────────────────────────────────────────
echo "16. Notifiche..."
# Le notifiche sono state create automaticamente dai workflow (approvazioni, ecc.)

echo ""
echo "============================================"
echo "  SEED COMPLETATO!"
echo "============================================"
echo ""
echo "  Credenziali:"
echo "    Admin:    dominik@connecteed.com / Admin123!@#"
echo "    Cliente:  giuseppe@techstore.it / Client123!@#"
echo "    Cliente:  luca@fooddelivery.it / Client123!@#"
echo "    Cliente:  chiara@modastyle.it / Client123!@#"
echo ""
echo "  Scenari:"
echo "    TechStore  → Progetto in corso (9 task, ore registrate)"
echo "    FoodDel.   → Preventivo in attesa CEO"
echo "    ModaStyle  → Opportunita in pre-vendita"
echo "    GreenEn.   → Lead nuovo"
echo "    OldBank    → Opportunita persa"
echo ""
echo "  Dashboard: http://localhost:5173"
echo "  Portale:   http://localhost:5173/portal/login"
echo "============================================"
