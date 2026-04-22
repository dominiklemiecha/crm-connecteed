# CRM Connecteed — Task List Completa

## Stato Progresso

| # | Task | Stato |
|---|------|-------|
| 1 | Setup progetto | COMPLETATA |
| 2 | Multi-tenant | COMPLETATA |
| 3 | Autenticazione + RBAC | COMPLETATA |
| 4 | Audit Log | COMPLETATA |
| 5 | Anagrafiche | COMPLETATA |
| 6 | CRM Lead | COMPLETATA |
| 7 | CRM Opportunità | COMPLETATA |
| 8 | Ticketing + SLA | COMPLETATA |
| 9 | Email integrata | COMPLETATA |
| 10 | Preventivi | COMPLETATA |
| 11 | Coda Approvazioni CEO | COMPLETATA |
| 12 | Contratti | COMPLETATA |
| 13 | Fatturazione | COMPLETATA |
| 14 | Progetti base | COMPLETATA |
| 15 | Document Management | COMPLETATA |
| 16 | Portale Cliente | COMPLETATA |
| 17 | Notifiche | COMPLETATA |
| 18 | Frontend React | COMPLETATA |

---

## TASK 1 — Setup Progetto (COMPLETATA)

**Obiettivo:** Inizializzare monorepo con backend NestJS e frontend React+Vite+TS, Docker per PostgreSQL e Redis.

### Sotto-task:
- 1.1 Inizializzare monorepo con struttura `/backend` (NestJS) e `/frontend` (React+Vite+TS)
- 1.2 Configurare `package.json` root con workspaces
- 1.3 Setup NestJS con TypeScript strict, moduli base (AppModule, ConfigModule, DatabaseModule)
- 1.4 Setup React + Vite + TypeScript con struttura cartelle (pages, components, hooks, services, types)
- 1.5 Docker Compose: PostgreSQL 16 + Redis 7
- 1.6 Configurazione `.env` con variabili ambiente (DB, Redis, JWT secret, porta)
- 1.7 Setup TypeORM con PostgreSQL e connessione
- 1.8 Configurare CORS, helmet, rate limiting base nel backend
- 1.9 File `.gitignore`, struttura base

---

## TASK 2 — Multi-tenant (COMPLETATA)

**Obiettivo:** Implementare isolamento dati completo per tenant con RLS PostgreSQL.

### Sotto-task:
- 2.1 Creare tabella `tenants` (id, name, slug, settings JSONB, created_at)
- 2.2 Implementare RLS policy su PostgreSQL per isolamento dati per tenant_id
- 2.3 Creare middleware NestJS che estrae tenant_id dal JWT/header e lo inietta nel contesto
- 2.4 Creare decorator `@CurrentTenant()` per accesso facile nei controller
- 2.5 Creare TenantModule con TenantService
- 2.6 Testare isolamento: query senza tenant_id NON deve restituire dati

---

## TASK 3 — Autenticazione + RBAC (COMPLETATA)

**Obiettivo:** Auth completa con JWT, refresh token, lockout, password policy, RBAC con 11 ruoli.

### Sotto-task:
- 3.1 Creare tabella `users` (id, tenant_id, email, password_hash, role, type: internal/client, status, failed_login_attempts, locked_until, last_login_at, refresh_token_hash, ms_oid, created_at)
- 3.2 Creare ruoli: Admin, CEO, Commerciale, PM, Dev, Design, Support, Admin/Legal + ruoli cliente (Admin cliente, Referente operativo, Referente amministrativo)
- 3.3 Implementare AuthModule con JWT (access + refresh token)
- 3.4 Implementare local auth: registrazione, login, password policy (complessità + lockout dopo 5 tentativi per 15 min)
- 3.5 Predisporre endpoint Microsoft SSO (OAuth2/OIDC) per utenti interni
- 3.6 Implementare RBAC guard con decorator `@Roles()` e `RolesGuard`
- 3.7 Creare permessi granulari per modulo (leads.read, leads.write, quotes.approve, ecc.)
- 3.8 Password policy: minimo 8 char, uppercase, lowercase, numero, simbolo speciale
- 3.9 Lockout account dopo 5 tentativi falliti per 15 minuti

---

## TASK 4 — Audit Log (COMPLETATA)

**Obiettivo:** Sistema di logging completo su tutte le entità e azioni del sistema.

### Sotto-task:
- 4.1 Creare tabella `audit_logs` (id, tenant_id, user_id, user_email, entity_type, entity_id, action, old_values JSONB, new_values JSONB, ip_address, user_agent, description, created_at)
- 4.2 Creare AuditModule con AuditService (globale, iniettabile ovunque)
- 4.3 Azioni tracciate: create, update, delete, status_change, approval, login, logout, login_failed, file_upload, file_download, assignment, escalation
- 4.4 API per consultare audit log con filtri (entity, user, date range, action)
- 4.5 Accesso solo Admin/CEO
- 4.6 Indici su (tenant_id, entity_type, entity_id) e (tenant_id, user_id) e (tenant_id, created_at)

---

## TASK 5 — Anagrafiche (COMPLETATA)

**Obiettivo:** Gestione master data: aziende clienti, contatti, catalogo prodotti/linee, reparti.

### Sotto-task:
- 5.1 Tabella `companies` (id, tenant_id, name, vat_number, fiscal_code, sdi_code, pec, phone, email, website, address JSONB, notes, status, created_at, updated_at)
- 5.2 Tabella `contacts` (id, tenant_id, company_id FK, first_name, last_name, email, phone, role, is_primary, notes, created_at)
- 5.3 Tabella `products` (id, tenant_id, code, name, description, category, is_active, created_at) — catalogo predefinito espandibile
- 5.4 Tabella `departments` (id, tenant_id, name, manager_id FK users, created_at)
- 5.5 CRUD completo per companies con ricerca e filtri
- 5.6 CRUD contatti con associazione ad azienda
- 5.7 CRUD prodotti/linee
- 5.8 CRUD reparti
- 5.9 Validazione P.IVA e Codice Fiscale italiano
- 5.10 Un cliente può avere più progetti e più utenti (relazioni)

---

## TASK 6 — CRM Lead

**Obiettivo:** Gestione completa lead con stati, pipeline Kanban, assegnazione, reminder automatici.

### Sotto-task:
- 6.1 Tabella `leads` (id, tenant_id, company_id, contact_id, source, owner_id FK users, assigned_to_user_id FK users, next_due_date, status enum, value_estimate_cents, probability, notes, created_at, updated_at)
- 6.2 Tabella `lead_products` (id, lead_id FK, product_id FK) — almeno 1 obbligatorio
- 6.3 State machine: `new` → `qualifying` → `qualified` → `unqualified`
- 6.4 Validazione: NON può avanzare di stato senza `assigned_to_user_id` e `next_due_date` compilati
- 6.5 Ogni lead DEVE avere almeno 1 prodotto associato (validazione in creazione e aggiornamento)
- 6.6 CRUD completo con filtri (stato, owner, data scadenza, prodotto, fonte)
- 6.7 Pipeline view (Kanban) — API endpoint `GET /leads/pipeline` che raggruppa per stato con conteggi e totali
- 6.8 Automazione: reminder su `next_due_date` (crea notifica 1 giorno prima)
- 6.9 Automazione: se `next_due_date` superata → notifica al commerciale owner
- 6.10 Endpoint conversione Lead → Opportunità: `POST /leads/:id/convert` — crea opportunità con dati lead, chiude lead come `qualified`
- 6.11 Audit log: `lead.create`, `lead.status_change`, `lead.convert`

---

## TASK 7 — CRM Opportunità

**Obiettivo:** Pipeline commerciale completa con 11 stati, conversione da lead, workflow fino a Won/Lost.

### Sotto-task:
- 7.1 Tabella `opportunities` (id, tenant_id, lead_id FK, company_id, contact_id, product_id, source, owner_id, assigned_to_user_id, next_due_date, status enum, estimated_value_cents, probability, lost_reason, notes, created_at, updated_at)
- 7.2 11 stati con transizioni valide:
  - `scoping` → `presales`
  - `presales` → `quote_preparing`
  - `quote_preparing` → `awaiting_ceo`
  - `awaiting_ceo` → `sent_to_client` (dopo approvazione CEO)
  - `sent_to_client` → `negotiation` | `accepted` | `lost`
  - `negotiation` → `accepted` | `lost`
  - `accepted` → `contract_signing`
  - `contract_signing` → `awaiting_payment`
  - `awaiting_payment` → `won` (solo quando pagamento OK)
  - Qualsiasi stato → `lost` (con motivo obbligatorio)
- 7.3 Validazione transizioni: solo transizioni valide ammesse (state machine)
- 7.4 `assigned_to_user_id` + `next_due_date` obbligatori per avanzare
- 7.5 CRUD con filtri (stato, owner, valore, probabilità, prodotto, date)
- 7.6 Pipeline Kanban API: `GET /opportunities/pipeline`
- 7.7 Collegamento a lead di origine (`lead_id`)
- 7.8 Trigger: quando opportunità → `won` + pagamento OK → creazione automatica progetto (TASK 14)
- 7.9 Quando → `lost`: campo `lost_reason` obbligatorio
- 7.10 Audit log: `opportunity.create`, `opportunity.status_change`

---

## TASK 8 — Ticketing + SLA

**Obiettivo:** Sistema ticketing centralizzato anti-email/WhatsApp con SLA engine e escalation automatica.

### Sotto-task:
- 8.1 Tabella `tickets` (id, tenant_id, ticket_number auto-generato, type, category, subcategory, priority enum, subject, description, status enum, assigned_to FK, assigned_team, sla_class enum, sla_deadline, first_response_at, resolved_at, channel, related_entity_type, related_entity_id, is_client_visible, created_by, created_at, updated_at, closed_at)
- 8.2 Tabella `ticket_messages` (id, ticket_id, author_id, author_type: customer/agent/system, content, attachments JSONB, is_internal boolean, created_at)
- 8.3 Tabella `sla_policies` (id, tenant_id, name, sla_class enum: presales/delivery/support/admin, priority, first_response_minutes, resolution_minutes, business_hours JSONB)
- 8.4 Tabella `escalations` (id, tenant_id, ticket_id, reason, escalated_to, created_at)
- 8.5 Stati ticket: `open` → `in_progress` → `waiting` → `closed`
- 8.6 SLA engine: calcola deadline in base a classe + priorità + business hours
- 8.7 Automazione escalation: se SLA prima risposta scade → crea ticket escalation automatico + notifica responsabile reparto + log sforamento
- 8.8 Regola ticket cliente: entrano SEMPRE in coda Support → Support assegna al reparto corretto
- 8.9 Collegamento ticket a entità: lead, opportunità, progetto (polymorphic via `related_entity_type` + `related_entity_id`)
- 8.10 CRUD ticket con filtri (stato, priorità, assegnato, team, SLA, data)
- 8.11 Thread messaggi con note interne (non visibili al cliente)
- 8.12 Audit log su assegnazioni, cambi stato, escalation

---

## TASK 9 — Email Integrata

**Obiettivo:** Sistema email interno con template e associazione ad entità del CRM.

### Sotto-task:
- 9.1 Tabella `emails` (id, tenant_id, from_address, to_address, cc, bcc, subject, body_text, body_html, direction: inbound/outbound, status, related_entity_type, related_entity_id, sent_at, received_at, created_at)
- 9.2 Tabella `email_templates` (id, tenant_id, name, subject_template, body_template, variables JSONB, created_at)
- 9.3 Regola: **1 email = 1 entità principale collegata** (lead, opportunità, progetto, ticket)
- 9.4 CRUD email con associazione ad entità
- 9.5 CRUD template email con variabili dinamiche (es. `{{company_name}}`, `{{project_name}}`)
- 9.6 Predisposizione integrazione Outlook (SMTP/IMAP config)
- 9.7 Invio email con template compilato: `POST /emails/send` con templateId + variabili
- 9.8 Timeline email per entità collegata: `GET /emails?entityType=opportunity&entityId=xxx`

---

## TASK 10 — Preventivi

**Obiettivo:** Sistema preventivi con versioning, composizione modulare, workflow approvazione CEO.

### Sotto-task:
- 10.1 Tabella `quotes` (id, tenant_id, quote_number auto, opportunity_id FK, company_id, status enum, current_version int, total_cents, margin_estimated_cents, notes, created_by, created_at, updated_at)
- 10.2 Tabella `quote_versions` (id, quote_id, version_number, deliverables JSONB, terms text, total_cents, created_by, created_at)
- 10.3 Tabella `quote_items` (id, quote_version_id, type enum: fixed/t_and_m/milestone, description, quantity, unit_price_cents, discount_percent, total_cents, sort_order)
- 10.4 Tabella `quote_text_library` (id, tenant_id, category, title, content, created_at) — libreria testi riutilizzabili
- 10.5 Tabella `quote_attachments` (id, quote_id, file_id FK)
- 10.6 Stati: `draft` → `revision` → `awaiting_ceo` → `approved` → `sent` → `accepted` | `declined`
- 10.7 Versioning: ogni modifica dopo invio crea nuova versione (v1, v2, v3...) con snapshot completo degli items
- 10.8 Libreria testi selezionabili per composizione rapida preventivo
- 10.9 Deliverable previsti per ogni versione
- 10.10 Calcolo margine stimato: (ricavo totale - costo stimato) con percentuale
- 10.11 Workflow approvazione:
  - Quando `status = awaiting_ceo` → sistema crea record in tabella `approvals` (type=quote)
  - CEO approva → `approval.status = approved`, `quote.status = approved`
  - CEO rifiuta → `approval.status = rejected` (note obbligatorie), `quote.status = draft` (torna in editing)
- 10.12 Dopo approval CEO → commerciale invia al cliente (`status = sent`) → pubblicazione in portale + email notifica
- 10.13 Cliente accetta → `quote.status = accepted`, `opportunity.status = accepted`, avvia generazione contratto
- 10.14 Cliente rifiuta → `quote.status = declined`, `opportunity.status = lost` (motivo obbligatorio)
- 10.15 Cliente richiede modifiche → nuova versione preventivo, torna a `awaiting_ceo`
- 10.16 Audit log su ogni transizione di stato e creazione versione

---

## TASK 11 — Coda Approvazioni CEO

**Obiettivo:** Dashboard unificata per CEO con tutte le approvazioni pendenti.

### Sotto-task:
- 11.1 Tabella `approvals` (id, tenant_id, type enum: quote/contract/change_request, entity_id UUID, status: pending/approved/rejected, requested_by FK, decided_by FK, decision_notes text, requested_at, decided_at)
- 11.2 API: `GET /approvals/pending` — lista unificata approvazioni pendenti per CEO (preventivi + contratti + change request)
- 11.3 API: `POST /approvals/:id/approve` — approva con aggiornamento entità collegata
- 11.4 API: `POST /approvals/:id/reject` — rifiuta con note OBBLIGATORIE + aggiornamento entità
- 11.5 Audit log obbligatorio su ogni decisione (chi, quando, note)
- 11.6 Notifica automatica al richiedente quando approvato/rifiutato
- 11.7 Filtri per tipo, data, richiedente
- 11.8 Contatore badge per CEO (quante approvazioni pendenti)

---

## TASK 12 — Contratti

**Obiettivo:** Gestione contratti con generazione PDF, workflow CEO, firma DocuSign OTP.

### Sotto-task:
- 12.1 Tabella `contracts` (id, tenant_id, contract_number auto, opportunity_id, quote_id, company_id, status enum, pdf_path, signed_pdf_path, signed_at, docusign_envelope_id, created_by, created_at, updated_at)
- 12.2 Tabella `contract_signatures` (id, contract_id, signer_email, signer_name, envelope_id, status, signed_at)
- 12.3 Stati: `draft` → `awaiting_ceo` → `ready_to_sign` → `signing` → `signed` → `void`
- 12.4 Generazione PDF da template HTML + dati quote/cliente (usare libreria come puppeteer o pdfkit)
- 12.5 Workflow:
  - `draft` → `awaiting_ceo` → crea approval (type=contract)
  - CEO approva → `ready_to_sign`
  - Invio DocuSign → `signing` con `envelope_id`
  - Webhook DocuSign `completed` → `signed`, salva PDF firmato, `signed_at`
  - Webhook DocuSign `declined/voided` → `void`
- 12.6 Dopo firma (`signed`) → passa ad Amministrazione (trigger creazione proforma)
- 12.7 Predisposizione endpoint webhook DocuSign: `POST /webhooks/docusign`
- 12.8 Audit log su tutte le transizioni

---

## TASK 13 — Amministrazione e Fatturazione

**Obiettivo:** Gestione proforma, fatture via API Fatture in Cloud, scadenziario, gate pagamento.

### Sotto-task:
- 13.1 Tabella `invoices` (id, tenant_id, invoice_number auto, type enum: proforma/invoice/credit_note, contract_id, opportunity_id, company_id, status enum, subtotal_cents, tax_cents, total_cents, due_date, paid_at, fatture_cloud_id, notes, created_by, created_at)
- 13.2 Tabella `invoice_items` (id, invoice_id, description, quantity, unit_price_cents, tax_rate, total_cents)
- 13.3 Tabella `payments` (id, tenant_id, invoice_id, amount_cents, method, status: pending/paid/overdue, payment_date, reference, notes, created_at)
- 13.4 Tabella `invoice_schedule` (id, tenant_id, invoice_id, installment_number, due_date, amount_cents, status, reminder_sent_at)
- 13.5 Flusso fatturazione:
  1. Amministrazione genera proforma da contratto firmato
  2. Predisposizione chiamata API Fatture in Cloud per creazione fattura ufficiale
  3. Aggiornamento scadenziario con rate/scadenze
- 13.6 Stati pagamento: `awaiting_payment` → `paid` → `overdue`
- 13.7 **GATE REGOLA CHIAVE:** il progetto NON parte finché il pagamento non è in stato `paid`
  - Verificare payment status prima di permettere creazione progetto
  - Se progetto già creato ma pagamento diventa `overdue` → opzione blocco progetto
- 13.8 Automazione: se scadenza pagamento superata → crea ticket admin automatico (sollecito)
- 13.9 Predisposizione integrazione API Fatture in Cloud (FIC):
  - Service con metodi: `createInvoice()`, `getInvoice()`, `getPaymentStatus()`
  - Config: `FIC_API_TOKEN`, `FIC_COMPANY_ID` in `.env`
- 13.10 Audit log su creazione fatture e registrazione pagamenti

---

## TASK 14 — Progetti Base

**Obiettivo:** Creazione automatica progetto da Won+Pagamento, WBS template, Gantt base.

### Sotto-task:
- 14.1 Tabella `projects` (id, tenant_id, project_number auto, company_id, opportunity_id, contract_id, name, description, status enum, pm_id FK users, start_date, end_date, progress_percent, created_at, updated_at)
- 14.2 Tabella `project_wbs_items` (id, project_id, phase, name, sort_order, status, created_at)
- 14.3 Tabella `wbs_templates` (id, tenant_id, product_id FK, name, phases JSONB) — template WBS per prodotto con fasi predefinite: Analisi, Design, Sviluppo, Test, Go-live
- 14.4 Tabella `gantt_tasks` (id, project_id, wbs_item_id FK nullable, name, assigned_to FK users, assigned_team, start_date_planned, end_date_planned, start_date_actual, end_date_actual, progress_pct int, dependency_type: FS, dependency_task_id FK, is_milestone boolean, status, sort_order, created_at, updated_at)
- 14.5 Trigger automatico creazione progetto:
  - Condizioni: Opportunità status = `won` AND Pagamento status = `paid`
  - Azioni sistema: crea Project con `status = ready`, collega company + opportunity + contract
- 14.6 Applica WBS template in base al prodotto dell'opportunità:
  - Genera `project_wbs_items` dalle fasi del template
  - Genera `gantt_tasks` con milestone per ogni fase
  - Imposta dipendenze base FS (Finish-to-Start) tra fasi sequenziali
- 14.7 Stati progetto: `pending_payment` → `ready` → `in_progress` → `delivered` → `closed`
- 14.8 PM può:
  - Impostare baseline (date planned)
  - Assegnare attività ai reparti/utenti
  - Cambiare status a `in_progress` al kickoff
- 14.9 Crea repository documenti progetto (directory virtuale)
- 14.10 API: `GET /projects/:id/gantt` — restituisce tasks con dipendenze per rendering Gantt
- 14.11 Audit log su creazione progetto, cambi stato, modifiche Gantt

---

## TASK 15 — Document Management

**Obiettivo:** Upload file con versioning, stati approvazione, visibilità client/internal.

### Sotto-task:
- 15.1 Tabella `files` (id, tenant_id, project_id nullable, entity_type, entity_id, name, original_name, mime_type, size_bytes, path, current_version int, status enum: draft/review/approved/obsolete, is_client_visible boolean, tags text[], uploaded_by FK, created_at)
- 15.2 Tabella `file_versions` (id, file_id, version_number, path, size_bytes, uploaded_by, notes, created_at)
- 15.3 Upload file con versioning automatico: ogni upload su file esistente crea nuova versione
- 15.4 Stati documento: `draft` → `review` → `approved` → `obsolete`
- 15.5 Flag `is_client_visible`: controlla visibilità nel portale cliente
- 15.6 Storage su server proprietario: cartella configurabile da `.env` (`UPLOAD_DIR`)
- 15.7 Limiti storage configurabili per cliente e progetto (in settings tenant/company/project)
- 15.8 Tag e ricerca per nome/tag: `GET /files?search=xxx&tags=logo,design`
- 15.9 Download sicuro con audit log (log chi scarica cosa e quando)
- 15.10 Endpoint: `POST /files/upload`, `GET /files/:id/download`, `GET /files/:id/versions`
- 15.11 Predisposizione ricerca full-text (Elasticsearch futuro)

---

## TASK 16 — Portale Cliente Base

**Obiettivo:** Area dedicata ai clienti con auth separata, dashboard progetti, ticket, documenti.

### Sotto-task:
- 16.1 Auth cliente separata: login user/password con stessa policy (complessità + lockout)
- 16.2 Multi-utente aziendale: più utenti per stessa azienda cliente
- 16.3 Dashboard cliente:
  - Lista progetti con stato e % avanzamento
  - Milestone principali con date
  - Calendario eventi/scadenze
- 16.4 Visualizzazione deliverable approvati (solo file con `is_client_visible = true` e `status = approved`)
- 16.5 Lista ticket aperti del cliente
- 16.6 To-do documenti: lista documenti richiesti dal team interno che il cliente deve caricare
- 16.7 Funzioni cliente:
  - Caricare documenti (upload file)
  - Rispondere a thread ticket (messaggi non interni)
  - Aprire nuovi ticket (supporto o richieste)
  - Approvare step progettuali (tramite ticket approval)
- 16.8 Regola routing: ticket cliente → SEMPRE entrano in coda Support → Support assegna al reparto
- 16.9 Notifiche: solo via email con link diretto al portale (no notifiche in-app per clienti)
- 16.10 API dedicate portale: prefisso `/portal/` con permessi limitati (solo dati propria azienda)
  - `GET /portal/projects`
  - `GET /portal/projects/:id`
  - `GET /portal/tickets`
  - `POST /portal/tickets`
  - `POST /portal/tickets/:id/reply`
  - `GET /portal/files`
  - `POST /portal/files/upload`

---

## TASK 17 — Notifiche

**Obiettivo:** Sistema notifiche email + in-app con trigger automatici su eventi del sistema.

### Sotto-task:
- 17.1 Tabella `notifications` (id, tenant_id, user_id, type, title, message, entity_type, entity_id, is_read boolean, channel: email/in_app/both, sent_at, read_at, created_at)
- 17.2 NotificationModule con NotificationService (globale)
- 17.3 Trigger notifiche (elenco completo):
  - Ticket assegnato / aggiornato / in attesa cliente
  - SLA vicino alla scadenza (80% tempo) / scaduto (con escalation)
  - Preventivo/contratto in attesa CEO
  - Preventivo inviato / accettato / rifiutato dal cliente
  - Firma DocuSign eventi (inviato, firmato, rifiutato)
  - Scadenze fatture e insoluti
  - Richieste documenti al cliente
  - Milestone approvabile / approvata
  - Ritardi Gantt (task in ritardo)
  - Lead con `next_due_date` in scadenza/scaduta
- 17.4 API:
  - `GET /notifications` — lista notifiche utente corrente
  - `POST /notifications/:id/read` — segna come letta
  - `POST /notifications/read-all` — segna tutte come lette
  - `GET /notifications/unread-count` — contatore badge
- 17.5 Predisposizione invio email transazionale (SMTP/SendGrid)
- 17.6 Predisposizione notifiche real-time via WebSocket (per badge in-app)
- 17.7 Tabella `notification_preferences` per configurazione preferenze per utente (quali notifiche ricevere e su quale canale)

---

## TASK 18 — Frontend React

**Obiettivo:** Interfaccia utente completa per tutti i moduli con layout, routing, dashboard.

### Sotto-task:
- 18.1 Layout principale:
  - Sidebar navigazione collassabile con icone + label per ogni modulo
  - Header con: nome utente, ruolo, notifiche (badge contatore), logout
  - Breadcrumb navigazione
- 18.2 Sistema routing con React Router:
  - `/` — Dashboard
  - `/login` — Login
  - `/companies` — Lista aziende
  - `/companies/:id` — Dettaglio azienda
  - `/contacts` — Lista contatti
  - `/leads` — Pipeline lead (Kanban)
  - `/leads/:id` — Dettaglio lead
  - `/opportunities` — Pipeline opportunità (Kanban)
  - `/opportunities/:id` — Dettaglio opportunità
  - `/tickets` — Lista ticket
  - `/tickets/:id` — Dettaglio ticket con thread
  - `/quotes` — Lista preventivi
  - `/quotes/:id` — Editor preventivo
  - `/approvals` — Coda approvazioni CEO
  - `/contracts` — Lista contratti
  - `/contracts/:id` — Dettaglio contratto
  - `/invoices` — Lista fatture + scadenziario
  - `/projects` — Lista progetti
  - `/projects/:id` — Dettaglio progetto con Gantt
  - `/files` — File manager
  - `/portal/*` — Portale cliente (layout separato)
- 18.3 Auth pages: login con email/password, forgot password, cambio password
- 18.4 Dashboard principale con:
  - KPI cards: lead attivi, opportunità in pipeline, valore pipeline, ticket aperti
  - Grafico pipeline (Recharts BarChart)
  - Attività recenti (timeline)
  - Approvazioni pendenti (per CEO)
- 18.5 Pagine Anagrafiche: lista con DataTable paginata, dettaglio con form edit
- 18.6 Pagine CRM: pipeline Kanban drag-and-drop per lead e opportunità
- 18.7 Pagine Ticketing: lista con filtri, dettaglio con thread messaggi e SLA timer
- 18.8 Pagine Preventivi: lista, editor con aggiunta items, seleziona da libreria testi, versioning sidebar
- 18.9 Pagina Coda CEO: cards approvazione con pulsanti Approva/Rifiuta e modale note
- 18.10 Pagine Contratti: lista con badge stato, dettaglio con timeline firma
- 18.11 Pagine Fatturazione: lista fatture, vista scadenziario con calendar/tabella
- 18.12 Pagine Progetti: lista con progress bar, dettaglio con tab (Overview, Gantt, Documenti, Ticket)
- 18.13 Pagine Documenti: file manager con upload drag-and-drop, filtri per tag/stato
- 18.14 Portale Cliente: layout dedicato più semplice con dashboard, ticket, documenti
- 18.15 Componenti comuni riutilizzabili:
  - `DataTable` — tabella paginata con sort e filtri
  - `Modal` — modale generico
  - `FormField` — input con label e validazione
  - `StatusBadge` — badge colorato per stati
  - `KPICard` — card con numero, label, trend
  - `KanbanBoard` — board drag-and-drop per pipeline
  - `Timeline` — lista eventi cronologica
  - `FileUpload` — upload con drag-and-drop
  - `EmptyState` — placeholder per liste vuote
- 18.16 Integrazione API con axios + interceptor JWT (già creato in `services/api.ts`)
- 18.17 Tema UI con Tailwind CSS: colori primary blue, grigi neutri, accenti per stati (verde=ok, giallo=warning, rosso=errore)
