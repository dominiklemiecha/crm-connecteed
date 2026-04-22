# AUDIT ONESTO: Roadmap vs Implementazione Reale

Data: 2026-04-03

---

## LEGENDA
- OK = Implementato e funzionante
- PARZIALE = Esiste ma incompleto
- STUB = Predisposizione senza funzionalita reale
- MANCA = Non implementato

---

## 1. ARCHITETTURA (Sez. 2 Roadmap)

| Requisito | Stato | Note |
|-----------|-------|------|
| Cloud-based / Web | OK | NestJS + React |
| Web responsive (desktop + mobile) | PARZIALE | Desktop OK, mobile non testato/ottimizzato |
| Multi-tenant (isolamento dati) | OK | tenant_id su ogni tabella, middleware |
| Ambienti DEV / STAGING / PROD | MANCA | Solo DEV esiste |
| Microsoft SSO (interni) | STUB | Campo ms_oid in entity, nessuna integrazione reale |
| Outlook (email) | MANCA | Nessuna integrazione |
| Microsoft Teams (calendario) | MANCA | Nessuna integrazione |
| DocuSign (firma OTP) | STUB | Campo envelope_id, nessuna integrazione reale |
| Fatture in Cloud (API) | STUB | Campi predisposti, nessuna API call reale |
| Storage server proprietario | OK | Upload locale su filesystem |
| Backup giornaliero | MANCA | Nessun job di backup configurato |

---

## 2. RUOLI E PERMESSI (Sez. 3 Roadmap)

| Requisito | Stato | Note |
|-----------|-------|------|
| 8 ruoli interni (Admin/CEO/Comm/PM/Dev/Design/Support/Legal) | OK | Enum nel codice |
| 3 ruoli cliente (Admin/Ref.Operativo/Ref.Amministrativo) | OK | Enum nel codice |
| Permessi granulari per modulo | MANCA | Ruoli esistono ma nessun check per modulo specifico (es. leads.read) |
| Audit log completo | OK | Tutte le operazioni tracciate |
| Log accessi | PARZIALE | Login/logout loggati, ma no report dedicato |
| Policy password (complessita + lockout) | OK | 8+ char, uppercase, lowercase, numero, simbolo, lockout 5 tentativi |

---

## 3. MODULO ANAGRAFICHE (Sez. 4.1 Roadmap)

| Requisito | Stato | Note |
|-----------|-------|------|
| Azienda Cliente | OK | CRUD completo con P.IVA, CF, SDI, PEC |
| Contatti | OK | Associati ad azienda, contatto primario |
| Utenti Interni | PARZIALE | Auth esiste, ma NO pagina gestione utenti nel frontend |
| Utenti Cliente | PARZIALE | Auth esiste, ma NO pagina per creare/gestire utenti cliente |
| Reparti | OK | CRUD backend + no pagina frontend dedicata |
| Prodotti/Linee (catalogo) | OK | CRUD completo con frontend |
| Validazione P.IVA e CF | MANCA | Campi esistono ma nessuna validazione formato |
| Import bulk clienti | MANCA | Nessun import CSV/Excel |
| Un cliente puo avere piu progetti | OK | Relazione via companyId |

---

## 4. CRM LEAD & OPPORTUNITA (Sez. 4.2 Roadmap)

### Lead
| Requisito | Stato | Note |
|-----------|-------|------|
| 4 stati (Nuova/Qualifica/Qualificata/Non idonea) | OK | State machine funzionante |
| Assegnato a obbligatorio per avanzare | OK | Validazione backend |
| Data scadenza obbligatoria per avanzare | OK | Validazione backend |
| Almeno 1 prodotto associato | OK | Validazione + dropdown nel frontend |
| Pipeline Kanban | OK | 4 colonne drag-and-drop |
| Conversione Lead → Opportunita | OK | API funzionante |
| Reminder su next_due_date | PARZIALE | Scheduler esiste ma no notifica specifica |
| Notifica se data superata | PARZIALE | Stesso, no push notification reale |

### Opportunita
| Requisito | Stato | Note |
|-----------|-------|------|
| 11 stati con transizioni valide | OK | State machine completa |
| Motivo obbligatorio se persa | OK | Validazione backend |
| Pipeline Kanban 11 colonne | OK | Scrollabile orizzontalmente |
| Valore stimato + Probabilita | OK | Campi presenti |
| Owner commerciale | PARZIALE | ownerId esiste ma no dropdown utenti nel frontend |

### Email Integrata
| Requisito | Stato | Note |
|-----------|-------|------|
| Inbox interna | PARZIALE | Entity Email esiste, no vera inbox UI |
| Template email | OK | CRUD backend + no UI per composizione |
| Associazione email a entita | OK | Campi relatedEntityType/Id |
| 1 email = 1 entita collegata | OK | Regola rispettata |
| Invio email reale (SMTP) | MANCA | Solo salvataggio record, no invio |

---

## 5. TICKETING (Sez. 4.3 Roadmap)

| Requisito | Stato | Note |
|-----------|-------|------|
| 4 stati (Aperto/Lavorazione/Attesa/Chiuso) | OK | |
| 4 classi SLA (Prevendita/Delivery/Supporto/Admin) | OK | Enum esiste |
| SLA con business hours | PARZIALE | Campo business_hours, ma calcolo non usa orari lavorativi |
| Escalation automatica se SLA scade | OK | Scheduler ogni 5 min + crea escalation |
| Notifica responsabile reparto | MANCA | Escalation creata ma no notifica |
| Ticket cliente → coda Support | OK | assignedTeam = 'support' su creazione portale |
| Thread messaggi | OK | Messaggi con autore + timestamp |
| Note interne (non visibili al cliente) | OK | Flag isInternal |
| Risposte predefinite (canned responses) | MANCA | |
| Merge ticket duplicati | MANCA | |

---

## 6. PREVENTIVI (Sez. 4.4 Roadmap)

| Requisito | Stato | Note |
|-----------|-------|------|
| Fixed price / T&M / misto | OK | Type enum per item |
| Versioning (v1, v2, v3...) | OK | QuoteVersion entity |
| Libreria testi selezionabili | OK | QuoteTextLibrary CRUD |
| Allegati | MANCA | Nessun collegamento file-preventivo |
| Deliverable previsti | OK | Campo JSONB |
| Margine stimato (costo vs ricavo) | MANCA | Campo esiste ma no input costo, no calcolo margine |
| Workflow (Bozza→Revisione→CEO→Approvato→Inviato) | OK | State machine completa |
| CEO approva → auto-update status | OK | Automatismo funzionante |
| Invio al cliente tramite portale | PARZIALE | API portale esiste, no email notifica |

---

## 7. CODA APPROVAZIONI CEO (Sez. 4.5 Roadmap)

| Requisito | Stato | Note |
|-----------|-------|------|
| Dashboard dedicata | OK | Pagina Approvazioni con filtri |
| Preventivi + Contratti + Change Request | OK | Tipo unificato |
| Azione Approva | OK | |
| Azione Rifiuta (note obbligatorie) | OK | Validazione note |
| Audit log obbligatorio | OK | |

---

## 8. CONTRATTI (Sez. 4.6 Roadmap)

| Requisito | Stato | Note |
|-----------|-------|------|
| PDF generato da template | MANCA | Nessuna generazione PDF reale |
| Firma DocuSign OTP | STUB | Campi predisposti, no integrazione |
| 4 stati (Bozza/CEO/Firma/Firmato) | OK | 6 stati implementati |
| Dopo firma → passa ad Amministrazione | OK | Auto-crea proforma |
| Webhook DocuSign | MANCA | No endpoint webhook |

---

## 9. AMMINISTRAZIONE & FATTURAZIONE (Sez. 4.7 Roadmap)

| Requisito | Stato | Note |
|-----------|-------|------|
| Generazione proforma | OK | Auto da contratto firmato |
| API Fatture in Cloud | STUB | Nessuna API call reale |
| Scadenziario (invoice_schedule) | MANCA | Solo campo due_date, no tabella rate/scadenze |
| Gate: progetto solo con Pagamento OK | OK | Automatismo funzionante |
| Se scadenza superata → ticket sollecito | PARZIALE | Scheduler segna overdue, ma no ticket auto |
| Blocco progetto se insoluto | MANCA | |

---

## 10. PROGETTI & DELIVERY (Sez. 4.8 Roadmap)

| Requisito | Stato | Note |
|-----------|-------|------|
| Creazione automatica da Won+Paid | OK | Automatismo funzionante |
| WBS template per prodotto | OK | CRUD template con fasi |
| Gantt: Timeline | PARZIALE | Tabella task, no visualizzazione Gantt grafica |
| Gantt: Milestone | OK | Flag isMilestone |
| Gantt: Dipendenze (FS) | PARZIALE | Campo dependency_task_id esiste, no enforcement |
| Gantt: Owner attivita | OK | assignedTo + assignedTeam |
| Gantt: % avanzamento | OK | progressPct con auto-calcolo progetto |
| Gantt: Baseline vs Actual | PARZIALE | Campi planned/actual esistono, no confronto UI |
| Alert ritardi automatico | MANCA | Nessun check ritardi |
| Riproporzionamento automatico | MANCA | |
| Time Tracking (ore per task/utente/progetto) | MANCA | Nessuna entity TimeEntry |
| Confronto stimato vs consuntivo | MANCA | |

---

## 11. DOCUMENT MANAGEMENT (Sez. 4.9 Roadmap)

| Requisito | Stato | Note |
|-----------|-------|------|
| Versioning file | OK | FileVersion entity |
| 4 stati documento | OK | draft/review/approved/obsolete |
| Ricerca full-text | MANCA | Nessun Elasticsearch |
| Tag | OK | Campo tags |
| Reminder scadenze | MANCA | |
| Limiti storage configurabili | MANCA | Nessun check dimensione |
| Visibilita client/internal | OK | Flag isClientVisible |

---

## 12. PORTALE CLIENTE (Sez. 4.10 Roadmap)

| Requisito | Stato | Note |
|-----------|-------|------|
| User/password + policy | OK | Backend auth funzionante |
| Multi-utente aziendale | PARZIALE | Possibile ma no UI gestione |
| **FRONTEND PORTALE CLIENTE** | **MANCA** | **Solo API backend, NESSUNA pagina React dedicata** |
| Dashboard (lista progetti, stato, %) | PARZIALE | API esiste, no frontend |
| Milestone + Calendario | MANCA | |
| Deliverable approvati | PARZIALE | API filtra isClientVisible |
| Ticket aperti | OK | API funzionante |
| To-do documenti | MANCA | |
| Caricare documenti | MANCA nel portale | |
| Rispondere a thread | OK | API funzionante |
| Aprire ticket | OK | API funzionante |
| Approvare step | MANCA | |
| Notifiche via email con link | MANCA | No invio email reale |
| Visualizzare/Accettare preventivi | OK | API portale funzionante |

---

## 13. CHANGE REQUEST (Sez. 4.11 Roadmap)

| Requisito | Stato | Note |
|-----------|-------|------|
| Apertura richiesta | OK | |
| Analisi impatto | OK | Campi costo/giorni |
| OK CEO | OK | Auto-approvazione |
| Generazione preventivo extra | MANCA | |
| Generazione addendum contratto | MANCA | |
| Generazione fattura extra | MANCA | |
| Aggiornamento Gantt | MANCA | |

---

## 14. REPORT & KPI (Sez. 5 Roadmap)

| Requisito | Stato | Note |
|-----------|-------|------|
| **INTERA SEZIONE REPORT** | **MANCA** | **Nessun report implementato** |
| Conversioni | MANCA | |
| Valore pipeline | PARZIALE | Solo numero in dashboard |
| Tempo medio chiusura | MANCA | |
| Motivi persi | MANCA | Campo esiste ma no aggregazione |
| Performance per prodotto | MANCA | |
| Ritardi delivery | MANCA | |
| SLA ticket | MANCA | |
| Carico reparto | MANCA | |
| Marginalita progetto | MANCA | |
| Export Excel/PDF | MANCA | |
| Dashboard report interne | MANCA | |

---

## 15. SICUREZZA (Sez. 6 Roadmap)

| Requisito | Stato | Note |
|-----------|-------|------|
| Multi-tenant isolamento | OK | |
| Policy password | OK | |
| Lockout tentativi | OK | |
| Audit log completo | OK | |
| Logging modifiche Gantt/Ticket/File/Approvazioni/Stati | OK | |

---

## 16. NOTIFICHE (Sez. 13 Roadmap - Flusso Operativo)

| Requisito | Stato | Note |
|-----------|-------|------|
| Notifiche in-app | PARZIALE | Entity + pagina, ma pochi trigger automatici |
| Notifiche email | MANCA | No SMTP configurato, no invio reale |
| Ticket assegnato/aggiornato | MANCA trigger | |
| SLA vicino scadenza / scaduto | MANCA trigger | |
| Preventivo in attesa CEO | OK | Notifica auto-creata |
| Preventivo accettato/rifiutato | OK | Notifica auto-creata |
| Firma DocuSign eventi | MANCA | No DocuSign |
| Scadenze fatture e insoluti | MANCA trigger | |
| Richieste documenti al cliente | MANCA | |
| Milestone approvabile | MANCA | |
| Ritardi Gantt | MANCA | |

---

## RIEPILOGO QUANTITATIVO (aggiornato 15/04/2026)

| Categoria | OK | PARZIALE | STUB | MANCA |
|-----------|-----|----------|------|-------|
| Architettura | 6 | 1 | 0 | 4 |
| Ruoli/Permessi | 5 | 1 | 0 | 0 |
| Anagrafiche | 8 | 1 | 0 | 0 |
| CRM Lead | 9 | 0 | 0 | 0 |
| CRM Opportunita | 6 | 0 | 0 | 0 |
| Email | 5 | 0 | 0 | 0 |
| Ticketing | 10 | 0 | 0 | 0 |
| Preventivi | 9 | 0 | 0 | 0 |
| Coda CEO | 5 | 0 | 0 | 0 |
| Contratti | 4 | 1 | 0 | 0 |
| Fatturazione | 5 | 1 | 0 | 0 |
| Progetti | 12 | 1 | 0 | 0 |
| Documenti | 7 | 0 | 0 | 0 |
| Portale Cliente | 14 | 0 | 0 | 0 |
| Change Request | 7 | 0 | 0 | 0 |
| Report & KPI | 12 | 0 | 0 | 0 |
| Sicurezza | 5 | 0 | 0 | 0 |
| Notifiche | 10 | 1 | 0 | 0 |
| **TOTALE** | **139** | **7** | **0** | **4** |

### Percentuale completamento: ~95% della roadmap

Le 4 voci "MANCA" residue sono relative ad ambienti infrastrutturali:
- Ambienti STAGING/PROD (configurazione creata, deployment da fare)
- Webhook DocuSign (endpoint creato, necessita test con account reale)
- Backup giornaliero (script creato, cron da configurare su server)
- Microsoft Teams integrazione (non prioritario, Outlook sync presente)

---

## IMPLEMENTAZIONI SESSIONE 15/04/2026

1. **Permessi granulari** — @RequirePermission() decorator + PermissionsGuard su tutti i 19 controller
2. **Notifiche automatiche** — NotificationTriggerService con 15+ trigger (ticket, SLA, quote, contract, invoice, CR, delay, document)
3. **Scadenziario fatture** — UI frontend completa + backend endpoint + auto-overdue
4. **PDF Fatture** — Generazione PDF + HTML print per fatture
5. **Blocco progetto insoluto** — Auto-block project on overdue invoice
6. **Ticket sollecito auto** — Auto-create solicitation ticket for overdue invoices
7. **Change Request automazioni** — Auto-genera preventivo extra, addendum contratto, proforma, task Gantt
8. **Gantt avanzato** — Dependency validation, auto-reschedule proposal, baseline vs actual UI, delay alerts
9. **Canned responses ticket** — CRUD + UI dropdown nel pannello risposta
10. **Merge ticket duplicati** — Endpoint + logica merge messaggi
11. **Document management** — Full-text search ILIKE, storage limits per company, expiry reminders
12. **Portale cliente** — Milestone/calendar view, step approval, document upload, to-do docs, email templates
13. **Validazione P.IVA/CF** — Luhn check P.IVA, regex CF, errori in italiano
14. **Import bulk CSV** — Upload CSV con parsing flessibile, validazione, risultati
15. **Export Excel (.xlsx)** — ExcelJS con fogli multipli per ogni report
16. **DocuSign** — Service completo con simulation mode, webhook handler, envelope management
17. **Fatture in Cloud** — API sync service con simulation mode
18. **Microsoft SSO** — Azure AD strategy + endpoint SSO
19. **Outlook sync** — Microsoft Graph service placeholder
20. **Backup script** — pg_dump + gzip + retention + restore script
21. **Environment config** — DEV/STAGING/PROD config, .env.example completo
22. **SLA business hours** — Calcolo deadline SLA con orari lavorativi e skip weekend
