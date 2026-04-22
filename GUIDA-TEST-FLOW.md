# CRM Connecteed — Guida Test Usabilità Giornaliera

Questa guida simula una giornata di lavoro reale con il CRM.
Ogni step va eseguito nel browser come farebbe un utente.

---

## Prerequisiti

| Servizio | URL |
|----------|-----|
| Frontend | http://localhost:5173 |
| Backend | http://localhost:3000 |
| Portale Cliente | http://localhost:5173/portal/login |
| PostgreSQL | Docker porta 5433 |
| Redis | Docker porta 6380 |

```bash
cd CRM_Connecteed
docker-compose up -d
cd backend && npx nest start --watch &
cd ../frontend && npx vite --host &
```

**Login interno:** `admin@connecteed.com` / `Admin123!@#`
**Tenant ID:** `a0000000-0000-0000-0000-000000000001`

---

## FASE 1 — SETUP INIZIALE (Admin fa una volta sola)

### 1.1 Login
1. Apri http://localhost:5173/login
2. Compila Tenant ID, Email, Password
3. Clicca **Accedi**
4. **Verifica:** Arrivi sulla Dashboard con KPI tutti a 0

### 1.2 Crea i Reparti aziendali
1. Sidebar → **Reparti**
2. Clicca **Nuovo Reparto**, crea:
   - `Development`
   - `Design`
   - `Project Management`
   - `Support`
   - `Amministrazione`
3. **Verifica:** 5 reparti nella lista

### 1.3 Crea il Catalogo Prodotti
1. Sidebar → **Prodotti**
2. Clicca **+ Nuovo Prodotto**, crea:
   - Codice: `WEB-APP` / Nome: `Sviluppo Web Application` / Categoria: `Development`
   - Codice: `MOBILE-APP` / Nome: `App Mobile` / Categoria: `Development`
   - Codice: `E-COMMERCE` / Nome: `Piattaforma E-commerce` / Categoria: `Development`
   - Codice: `CONSULTING` / Nome: `Consulenza IT` / Categoria: `Servizi`
3. **Verifica:** 4 prodotti con toggle "Attivo" acceso

### 1.4 Crea gli Utenti Interni (il team)
1. Sidebar → **Utenti**
2. Clicca **+ Nuovo Utente**, crea questi utenti:

| Nome | Email | Ruolo | Tipo |
|------|-------|-------|------|
| Marco Rossi | marco@connecteed.com | commerciale | Interno |
| Laura Bianchi | laura@connecteed.com | pm | Interno |
| Andrea Verdi | andrea@connecteed.com | dev | Interno |
| Sara Neri | sara@connecteed.com | design | Interno |
| Paolo Gialli | paolo@connecteed.com | support | Interno |

Password per tutti: `Team123!@#`

3. **Verifica:** 6 utenti nella lista (admin + 5 team)
4. Per ogni utente, clicca l'icona **Permessi** (cerchio) e assegna i permessi pertinenti al ruolo

---

## FASE 2 — ACQUISIZIONE CLIENTE (Commerciale)

### 2.1 Registra l'Azienda Cliente
1. Sidebar → **Aziende**
2. Clicca **+ Nuova Azienda**
3. Compila:
   - Nome: `TechStore Italia Srl`
   - P.IVA: `IT98765432109`
   - Email: `info@techstore.it`
   - Telefono: `+39 02 9876543`
   - Indirizzo: `Via Montenapoleone 15`
   - Citta: `Milano`
   - Note: `Catena e-commerce elettronica, 3 punti vendita`
4. **Verifica:** Azienda appare nella tabella

### 2.2 Aggiungi il Contatto di riferimento
1. Clicca sulla riga **TechStore Italia Srl**
2. Tab **Contatti** → clicca **Aggiungi Contatto**
3. Compila:
   - Nome: `Giuseppe` / Cognome: `Ferraro`
   - Email: `giuseppe@techstore.it`
   - Telefono: `+39 333 9876543`
   - Ruolo: `Direttore IT`
   - Spunta **Contatto principale**
4. **Verifica:** Contatto con badge "Principale"

### 2.3 Crea l'Accesso Portale per il Cliente
1. Torna su **Aziende** (sidebar)
2. Sulla riga TechStore, clicca l'icona viola **Crea Accesso Portale** (icona persona con +)
3. Compila:
   - Nome: `Giuseppe` / Cognome: `Ferraro`
   - Email: `giuseppe@techstore.it`
   - Password: `Client123!@#`
4. Clicca **Crea Accesso**
5. **Verifica:** Modale verde con credenziali: "Email: giuseppe@techstore.it / Password: Client123!@#"
6. **ANNOTA** queste credenziali — le userai per testare il portale cliente

---

## FASE 3 — GESTIONE LEAD (Commerciale)

### 3.1 Crea il Lead
1. Sidebar → **Lead**
2. Clicca **+ Nuovo Lead**
3. Compila:
   - Nome Azienda: `TechStore Italia Srl`
   - **Prodotto/Linea:** `E-COMMERCE — Piattaforma E-commerce` (OBBLIGATORIO)
   - Nome Contatto: `Giuseppe Ferraro`
   - Email: `giuseppe@techstore.it`
   - Fonte: `Referral`
   - Valore Stimato: `120000`
   - Probabilita: `70`
   - Scadenza: una data tra 2 settimane
   - Note: `Referral da partner LogiTech. Interessati a rifare il sito e-commerce.`
4. **Verifica:** Lead appare nella colonna **Nuovo** del Kanban

### 3.2 Qualifica il Lead
1. Clicca sulla card del lead
2. Nel pannello laterale, clicca **In Qualifica**
3. **Verifica:** Card si sposta nella colonna gialla "In Qualifica"

### 3.3 Verifica Vista 360° dell'Azienda
1. Sidebar → **Aziende** → clicca **TechStore Italia Srl**
2. **Verifica i 5 tab:**
   - **Informazioni:** Tutti i dati azienda
   - **Contatti:** Giuseppe Ferraro con badge Principale
   - **Opportunita:** (vuoto per ora, ma la tab esiste)
   - **Ticket:** (vuoto)
   - **Fatture:** (vuoto)

---

## FASE 4 — OPPORTUNITA E PRE-VENDITA

### 4.1 Crea Opportunita
1. Sidebar → **Opportunita**
2. Clicca **+ Nuova Opportunita**
3. Compila:
   - Nome: `E-commerce TechStore 2026`
   - Azienda: seleziona `TechStore Italia Srl`
   - Fonte: `Referral`
   - Valore Stimato: `120000`
   - Probabilita: `70`
   - Scadenza: data futura
4. **Verifica:** Appare nella colonna **Scoping**

### 4.2 Avanza l'Opportunita
1. Clicca sulla card dell'opportunita
2. Avanza: **Pre-vendita** → poi **Preventivo**
3. **Verifica:** Card si sposta nelle colonne corrispondenti

### 4.3 Crea Ticket Pre-vendita per i Reparti
1. Sidebar → **Ticket**
2. Clicca **+ Nuovo Ticket**
3. Crea ticket:
   - Soggetto: `Fattibilita e-commerce TechStore`
   - Descrizione: `Verificare fattibilita migrazione da Magento a piattaforma custom React + NestJS`
   - Priorita: `Alta`
   - Classe SLA: `Pre-vendita`
   - Team: `Development`
4. **Verifica:** Ticket creato con numero TKT-xxx, stato "Aperto"
5. Clicca sulla riga del ticket
6. Scrivi una risposta: `Fattibile. Stima 3 mesi, team di 3 dev.`
7. Clicca **Invia**
8. Spunta **Nota interna**, scrivi: `Valutare se serve anche il team Design per UX`
9. Clicca **Invia**
10. **Verifica:** Thread con 2 messaggi (nota interna con sfondo diverso)

---

## FASE 5 — PREVENTIVO

### 5.1 Crea il Preventivo
1. Sidebar → **Preventivi**
2. Clicca **+ Nuovo Preventivo**
3. Compila:
   - Titolo: `Preventivo E-commerce TechStore v1`
   - Azienda: `TechStore Italia Srl`
4. Aggiungi le voci (clicca **+ Aggiungi voce** per ogni riga):

| Descrizione | Qty | Prezzo (€) | Tipo |
|-------------|-----|------------|------|
| Analisi e Design UX/UI | 1 | 20000 | Fixed |
| Sviluppo Backend API | 1 | 35000 | Fixed |
| Sviluppo Frontend React | 1 | 30000 | Fixed |
| Migrazione dati da Magento | 1 | 15000 | Fixed |
| Testing, QA e Deploy | 1 | 10000 | Fixed |
| Formazione team cliente | 10 | 1500 | T&M |

5. **Verifica:** Totale calcolato automaticamente (125.000 €)
6. Clicca **Crea Preventivo**

### 5.2 Invia a CEO per Approvazione
1. Nella lista preventivi, clicca sulla riga del preventivo
2. Nella sezione "Cambia stato", clicca **awaiting_ceo**
3. **Verifica:** Stato diventa "Attesa CEO"

### 5.3 CEO Approva
1. Sidebar → **Approvazioni**
2. **Verifica:** Appare l'approvazione del preventivo
3. Clicca **Approva** → Aggiungi nota: `Approvato, ottimo margine`
4. **Verifica:** Approvazione risulta "Approvato"

### 5.4 Scarica PDF e Invia al Cliente
1. Sidebar → **Preventivi** → clicca il preventivo
2. **Verifica:** Ora appare la sezione blu con due pulsanti:
   - **Scarica PDF** → si apre il PDF del preventivo in una nuova tab
   - **Invia al Cliente** → clicca
3. **Verifica:** Messaggio verde "Preventivo inviato! Il cliente lo vedra nel portale."
4. **Verifica:** Stato diventa "Inviato"

---

## FASE 6 — IL CLIENTE NEL PORTALE

### 6.1 Accedi come Cliente
1. Apri una **nuova finestra** del browser (o in incognito)
2. Vai a http://localhost:5173/portal/login
3. Compila:
   - Email: `giuseppe@techstore.it`
   - Password: `Client123!@#`
   - (Tenant ID potrebbe essere richiesto — usa lo stesso)
4. **Verifica:** Arrivi nella dashboard del portale cliente

### 6.2 Visualizza e Accetta il Preventivo
1. Nel portale, vai su **Preventivi**
2. **Verifica:** Il preventivo inviato appare nella lista
3. Clicca sul preventivo
4. **Verifica:** Mostra dettaglio con voci e totale
5. Clicca **Accetta**
6. **Verifica:** Stato diventa "Accettato"

### 6.3 Apri un Ticket dal Portale
1. Vai su **Ticket** nel portale
2. Clicca **Nuovo Ticket**
3. Compila:
   - Soggetto: `Richiesta tempistiche progetto`
   - Descrizione: `Vorremmo sapere quando possiamo iniziare il progetto e-commerce`
4. **Verifica:** Ticket creato, stato "Aperto"

---

## FASE 7 — CONTRATTO E FIRMA (torna al pannello interno)

### 7.1 Verifica Contratto Auto-Creato
1. Torna al browser del pannello interno
2. Sidebar → **Contratti**
3. **Verifica:** Un contratto e stato **auto-creato** dall'accettazione del preventivo
4. Clicca sul contratto

### 7.2 Workflow Contratto
1. Clicca **Invia a CEO** (awaiting_ceo)
2. Sidebar → **Approvazioni** → Approva il contratto
3. Torna su Contratti → clicca il contratto
4. **Verifica:** Stato = "Pronto per firma"
5. Clicca **Scarica PDF Contratto** → si apre il PDF autocompilato
6. Aggiungi firmatario: Email `giuseppe@techstore.it`, Nome `Giuseppe Ferraro`
7. Avanza: **Avvia Firma** → poi **Conferma Firma**
8. **Verifica:** Stato = "Firmato"

### 7.3 Verifica Proforma Auto-Creata
1. Sidebar → **Fatture**
2. **Verifica:** Una proforma e stata auto-creata con il totale del preventivo
3. Clicca sulla proforma

---

## FASE 8 — PAGAMENTO E GATE PROGETTO

### 8.1 Registra il Pagamento
1. Nel dettaglio fattura, trova la sezione **Registra Pagamento**
2. Compila:
   - Importo: il totale della fattura
   - Metodo: `Bonifico bancario`
   - Riferimento: `CRO-TECHSTORE-001`
   - Data: oggi
3. Clicca **Registra Pagamento**
4. **Verifica GATE (3 cose automatiche):**
   - La fattura diventa **"Pagata"**
   - Un **progetto viene creato automaticamente**
   - L'opportunita diventa **"Vinto"**

### 8.2 Verifica il Progetto
1. Sidebar → **Progetti**
2. **Verifica:** Il progetto e apparso
3. Clicca sul progetto

---

## FASE 9 — DELIVERY (PM gestisce il progetto)

### 9.1 Crea i Task nel Gantt
1. Nel dettaglio progetto, tab **Task/Gantt**
2. Clicca **+ Nuovo Task** per ogni riga:

| Nome | Team | Assegnato a | Inizio | Fine | Milestone |
|------|------|-------------|--------|------|-----------|
| Kickoff Meeting | PM | Laura Bianchi | +1 sett | +1 sett | Si |
| Analisi Requisiti | Development | Andrea Verdi | +1 sett | +3 sett | No |
| Design UX/UI | Design | Sara Neri | +2 sett | +5 sett | No |
| Milestone: Design Approvato | PM | Laura Bianchi | +5 sett | +5 sett | Si |
| Sviluppo Backend | Development | Andrea Verdi | +5 sett | +10 sett | No |
| Sviluppo Frontend | Development | Andrea Verdi | +6 sett | +11 sett | No |
| Migrazione Dati | Development | Andrea Verdi | +10 sett | +11 sett | No |
| Testing & QA | Development | Andrea Verdi | +11 sett | +12 sett | No |
| Go-Live | PM | Laura Bianchi | +13 sett | +13 sett | Si |

3. **Verifica:** Gantt chart visuale con barre colorate, milestone con diamanti

### 9.2 Aggiorna il Progresso
1. Per "Kickoff Meeting", sposta lo slider a 100%
2. Per "Analisi Requisiti", sposta a 50%
3. **Verifica:** Il progresso complessivo del progetto si aggiorna nella card

### 9.3 Registra Ore Lavorate
1. Sidebar → **Ore Lavorate**
2. Clicca **+ Aggiungi Ore**
3. Compila:
   - Progetto: seleziona il progetto TechStore
   - Data: oggi
   - Ore: `4`
   - Descrizione: `Analisi requisiti e-commerce`
   - Fatturabile: spuntato
4. **Verifica:** Entry appare nella tabella "Le mie ore"
5. Tab **Per progetto** → seleziona il progetto
6. **Verifica:** Summary con ore totali e stima

---

## FASE 10 — DOCUMENTI

### 10.1 Carica un Documento
1. Sidebar → **Documenti**
2. Clicca **Carica File**
3. Seleziona un file qualsiasi (es. un PDF, un'immagine)
4. **Verifica:** File appare con versione v1, stato "Bozza"

---

## FASE 11 — TICKET DI SUPPORTO

### 11.1 Gestisci il Ticket del Cliente
1. Sidebar → **Ticket**
2. Trova il ticket aperto dal cliente dal portale ("Richiesta tempistiche")
3. Clicca sulla riga
4. Scrivi risposta: `Gentile Giuseppe, il progetto partira la prossima settimana. Il kickoff meeting e previsto per lunedi.`
5. Clicca **Invia**
6. Cambia stato a **Chiuso**
7. **Verifica:** Ticket chiuso

---

## FASE 12 — REPORT E DASHBOARD

### 12.1 Controlla la Dashboard
1. Sidebar → **Dashboard**
2. **Verifica KPI aggiornati:**
   - Lead Attivi: almeno 1
   - Opportunita: i numeri corretti
   - Progetti Attivi: almeno 1
   - Pipeline: valore > 0

### 12.2 Consulta i Report
1. Sidebar → **Report**
2. Tab **Vendite:** vedi opportunita vinte/perse, valore chiuso
3. Tab **Pipeline:** pipeline per stato con grafici
4. Tab **Delivery:** progetti per stato
5. Tab **Supporto:** ticket per stato e priorita
6. Tab **Finanziario:** fatture e revenue
7. Clicca **Esporta CSV** → si scarica un file CSV
8. **Verifica:** Tutti i tab caricano dati reali

---

## FASE 13 — NOTIFICHE

1. Sidebar → **Notifiche**
2. **Verifica:** Notifiche create automaticamente per:
   - Approvazione preventivo
   - Approvazione contratto
3. Clicca **Segna tutte come lette**
4. **Verifica:** Badge si azzera

---

## FASE 14 — VERIFICA PORTALE CLIENTE (torna alla finestra cliente)

### 14.1 Il Cliente vede gli Aggiornamenti
1. Nella finestra del portale cliente
2. **Progetti:** il progetto appare con progress
3. **Ticket:** il ticket ha la risposta dell'operatore
4. **Documenti:** i file con visibilita cliente appaiono

---

## CHECKLIST COMPLETA

### Setup
- [ ] Login funzionante
- [ ] 5 reparti creati
- [ ] 4 prodotti nel catalogo
- [ ] 5 utenti interni con ruoli diversi
- [ ] Permessi assegnati per ruolo

### Ciclo Cliente
- [ ] Azienda creata con tutti i dati
- [ ] Contatto principale associato
- [ ] Accesso portale cliente creato (credenziali visibili)
- [ ] Lead creato con prodotto obbligatorio
- [ ] Lead qualificato nel Kanban
- [ ] Vista 360° cliente con 5 tab funzionanti

### Ciclo Commerciale
- [ ] Opportunita creata e avanzata negli stati
- [ ] Ticket pre-vendita per reparti con thread e note interne
- [ ] Preventivo con 6 voci e totale calcolato
- [ ] Preventivo inviato a CEO → approvazione automatica
- [ ] CEO approva preventivo
- [ ] PDF preventivo scaricato
- [ ] Preventivo inviato al cliente → messaggio conferma

### Ciclo Cliente (Portale)
- [ ] Login portale cliente funzionante
- [ ] Preventivo visibile nel portale
- [ ] Cliente accetta il preventivo
- [ ] Cliente apre ticket dal portale

### Ciclo Contratto
- [ ] Contratto auto-creato dall'accettazione
- [ ] Contratto approvato da CEO
- [ ] PDF contratto autocompilato scaricato
- [ ] Firmatario aggiunto
- [ ] Contratto firmato

### Ciclo Fatturazione
- [ ] Proforma auto-creata dalla firma
- [ ] Pagamento registrato
- [ ] GATE: progetto auto-creato
- [ ] Opportunita diventa "Vinto"

### Delivery
- [ ] 9 task Gantt creati con assegnazioni
- [ ] Gantt chart visuale con barre e milestone
- [ ] Progresso aggiornato
- [ ] Ore lavorate registrate
- [ ] Documento caricato

### Supporto
- [ ] Ticket cliente gestito e chiuso

### Analisi
- [ ] Dashboard con KPI reali
- [ ] 5 tab report con grafici
- [ ] Export CSV funzionante
- [ ] Notifiche gestite

---

## Regole Business Verificate

| Regola | Come verificarla |
|--------|-----------------|
| Lead obbliga almeno 1 prodotto | Prova a creare lead senza prodotto → errore |
| Lead non avanza senza assegnato/scadenza | Il backend blocca la transizione |
| Opportunita persa → motivo obbligatorio | Prova a mettere "lost" senza motivo → errore |
| CEO rifiuta → note obbligatorie | Prova a rifiutare senza note → errore |
| GATE pagamento → progetto solo con paid | Il progetto si crea SOLO dopo pagamento completo |
| Ticket cliente → sempre coda Support | Ticket dal portale ha assignedTeam=support |
| Ogni azione → audit log | Sidebar → controlla audit log (solo admin/CEO) |
| Multi-tenant → isolamento dati | Utenti diversi tenant non vedono dati altrui |

---

## Automazioni Attive

| Evento | Azione Automatica |
|--------|-------------------|
| Preventivo → awaiting_ceo | Crea Approvazione per CEO |
| CEO approva preventivo | Status → approved |
| CEO rifiuta preventivo | Status → draft + notifica |
| Preventivo → sent | Email al cliente (se SMTP configurato) |
| Cliente accetta preventivo | Opportunita → accepted + Contratto auto-creato |
| Cliente rifiuta preventivo | Opportunita → lost |
| Contratto → awaiting_ceo | Crea Approvazione per CEO |
| CEO approva contratto | Status → ready_to_sign |
| Contratto firmato | Proforma auto-creata con totale |
| Pagamento completato | Progetto auto-creato + Opportunita → won |
| SLA ticket scaduto | Escalation auto (check ogni 5 min) |
| Fattura scaduta | Segna overdue (check ogni 15 min) |
| Change Request → awaiting_ceo | Crea Approvazione per CEO |
