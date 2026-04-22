#!/bin/bash
# ============================================================
# CRM Connecteed — FULL BUSINESS FLOW E2E TEST
# Tests the COMPLETE roadmap flow from Lead to Project
# ============================================================

BASE="http://localhost:3000/api/v1"
TENANT="a0000000-0000-0000-0000-000000000001"
GREEN='\033[0;32m'; RED='\033[0;31m'; CYAN='\033[0;36m'; NC='\033[0m'
PASS=0; FAIL=0

check() {
  local name="$1" expected="$2" actual="$3" body="$4"
  if [ "$actual" == "$expected" ]; then
    echo -e "  ${GREEN}OK${NC} $name"
    PASS=$((PASS+1))
  else
    echo -e "  ${RED}FAIL${NC} $name — expected $expected, got $actual"
    [ -n "$body" ] && echo -e "       $(echo "$body" | head -c 300)"
    FAIL=$((FAIL+1))
  fi
}

req() {
  local method="$1" url="$2" data="$3"
  local args=(-s -w "\n%{http_code}" -X "$method" "$BASE$url" -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN")
  [ -n "$data" ] && args+=(-d "$data")
  local response=$(curl "${args[@]}")
  BODY=$(echo "$response" | head -n -1)
  CODE=$(echo "$response" | tail -n 1)
}

extract() { echo "$BODY" | grep -o "\"$1\":\"[^\"]*\"" | head -1 | cut -d'"' -f4; }
extractNum() { echo "$BODY" | grep -o "\"$1\":[0-9]*" | head -1 | cut -d: -f2; }

echo ""
echo -e "${CYAN}============================================================${NC}"
echo -e "${CYAN}  FLUSSO COMPLETO ROADMAP: Lead → Progetto${NC}"
echo -e "${CYAN}============================================================${NC}"
echo ""

# ─── SETUP: Clean + Login ─────────────────────────────────────
echo -e "${CYAN}=== SETUP ===${NC}"

# Register (idempotent)
curl -s -X POST "$BASE/auth/register" -H "Content-Type: application/json" -H "x-tenant-id: $TENANT" \
  -d '{"email":"test@connecteed.com","password":"Test123!@#","firstName":"Test","lastName":"User","role":"admin","type":"internal"}' > /dev/null 2>&1

# Login
req POST "/auth/login" '{"email":"test@connecteed.com","password":"Test123!@#"}'
TOKEN=$(extract "accessToken")
USER_ID=$(echo "$BODY" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
check "Login" "200" "$CODE"

# Create product if needed
req POST "/products" '{"code":"CRM-CUSTOM","name":"CRM Personalizzato","category":"Software","description":"Sviluppo CRM su misura"}'
PRODUCT_ID=$(extract "id")
[ -z "$PRODUCT_ID" ] && { req GET "/products"; PRODUCT_ID=$(echo "$BODY" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4); }
echo "  Product: $PRODUCT_ID"

# Create company
req POST "/companies" '{"name":"FlowTest Srl","vatNumber":"IT11111111111","email":"info@flowtest.it"}'
COMPANY_ID=$(extract "id")
echo "  Company: $COMPANY_ID"

echo ""
echo -e "${CYAN}=== STEP 1: LEAD ===${NC}"

req POST "/leads" "{\"companyName\":\"FlowTest Srl\",\"contactName\":\"Paolo Flusso\",\"contactEmail\":\"paolo@flowtest.it\",\"source\":\"Website\",\"ownerId\":\"$USER_ID\",\"assignedToUserId\":\"$USER_ID\",\"nextDueDate\":\"2026-05-01T00:00:00Z\",\"valueEstimateCents\":8000000,\"probability\":70,\"productIds\":[\"$PRODUCT_ID\"]}"
check "Create Lead" "201" "$CODE"
LEAD_ID=$(extract "id")

req PUT "/leads/$LEAD_ID/status" '{"status":"qualifying"}'
check "Lead → qualifying" "200" "$CODE"

echo ""
echo -e "${CYAN}=== STEP 2: LEAD → OPPORTUNITA ===${NC}"

req POST "/leads/$LEAD_ID/convert" "{\"name\":\"Progetto CRM FlowTest\",\"estimatedValueCents\":8000000,\"companyId\":\"$COMPANY_ID\",\"productId\":\"$PRODUCT_ID\"}"
check "Convert Lead → Opportunity" "201" "$CODE"
OPP_ID=$(extract "id")
echo "  Opportunity: $OPP_ID"

# Verify lead is now qualified
req GET "/leads/$LEAD_ID"
LEAD_STATUS=$(extract "status")
check "Lead status = qualified" "qualified" "$LEAD_STATUS"

echo ""
echo -e "${CYAN}=== STEP 3: OPPORTUNITA → PRESALES → PREVENTIVO ===${NC}"

req PUT "/opportunities/$OPP_ID/status" '{"status":"presales"}'
check "Opp → presales" "200" "$CODE"

req PUT "/opportunities/$OPP_ID/status" '{"status":"quote_preparing"}'
check "Opp → quote_preparing" "200" "$CODE"

# Create quote with items
req POST "/quotes" "{\"opportunityId\":\"$OPP_ID\",\"companyId\":\"$COMPANY_ID\",\"notes\":\"Preventivo per CRM personalizzato\",\"items\":[{\"type\":\"fixed\",\"description\":\"Analisi e Design\",\"quantity\":1,\"unitPriceCents\":2000000,\"discountPercent\":0},{\"type\":\"fixed\",\"description\":\"Sviluppo Backend\",\"quantity\":1,\"unitPriceCents\":3000000,\"discountPercent\":0},{\"type\":\"fixed\",\"description\":\"Sviluppo Frontend\",\"quantity\":1,\"unitPriceCents\":2500000,\"discountPercent\":0},{\"type\":\"fixed\",\"description\":\"Testing e Deploy\",\"quantity\":1,\"unitPriceCents\":500000,\"discountPercent\":0}]}"
check "Create Quote with 4 items" "201" "$CODE"
QUOTE_ID=$(extract "id")
echo "  Quote: $QUOTE_ID"

echo ""
echo -e "${CYAN}=== STEP 4: PREVENTIVO → CEO APPROVAL ===${NC}"

req POST "/quotes/$QUOTE_ID/status" '{"status":"awaiting_ceo"}'
check "Quote → awaiting_ceo" "201" "$CODE"

# Verify approval was auto-created
req GET "/approvals/pending"
APPROVAL_ID=$(echo "$BODY" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
check "Auto-created pending approval" "200" "$CODE"
echo "  Approval: $APPROVAL_ID"

echo ""
echo -e "${CYAN}=== STEP 5: CEO APPROVA → INVIA AL CLIENTE ===${NC}"

req POST "/approvals/$APPROVAL_ID/approve" '{"notes":"Ottimo preventivo, approvato"}'
check "CEO approves quote" "201" "$CODE"

# Verify quote is now approved
req GET "/quotes/$QUOTE_ID"
Q_STATUS=$(extract "status")
check "Quote status = approved" "approved" "$Q_STATUS"

# Send to client
req POST "/quotes/$QUOTE_ID/status" '{"status":"sent"}'
check "Quote → sent (to client)" "201" "$CODE"

echo ""
echo -e "${CYAN}=== STEP 6: CLIENTE ACCETTA → AUTO-CONTRATTO ===${NC}"

req POST "/quotes/$QUOTE_ID/status" '{"status":"accepted"}'
check "Quote → accepted (client accepts)" "201" "$CODE"

# Verify opportunity updated to accepted
req GET "/opportunities/$OPP_ID"
OPP_STATUS=$(extract "status")
check "Opportunity auto-updated to accepted" "accepted" "$OPP_STATUS"

# Verify contract was auto-created
req GET "/contracts"
CONTRACT_ID=$(echo "$BODY" | grep "$OPP_ID" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
[ -z "$CONTRACT_ID" ] && CONTRACT_ID=$(echo "$BODY" | grep -o '"id":"[^"]*"' | tail -1 | cut -d'"' -f4)
echo "  Contract: $CONTRACT_ID"
check "Contract auto-created" "200" "$CODE"

echo ""
echo -e "${CYAN}=== STEP 7: CONTRATTO → CEO → FIRMA ===${NC}"

req POST "/contracts/$CONTRACT_ID/status" '{"status":"awaiting_ceo"}'
check "Contract → awaiting_ceo" "201" "$CODE"

# Check approval was auto-created for contract
req GET "/approvals/pending"
CONTRACT_APPROVAL=$(echo "$BODY" | grep "contract" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
[ -z "$CONTRACT_APPROVAL" ] && CONTRACT_APPROVAL=$(echo "$BODY" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "  Contract Approval: $CONTRACT_APPROVAL"

req POST "/approvals/$CONTRACT_APPROVAL/approve" '{"notes":"Contratto approvato"}'
check "CEO approves contract" "201" "$CODE"

# Verify contract is ready_to_sign
req GET "/contracts/$CONTRACT_ID"
C_STATUS=$(extract "status")
check "Contract = ready_to_sign" "ready_to_sign" "$C_STATUS"

# Simulate signing
req POST "/contracts/$CONTRACT_ID/status" '{"status":"signing"}'
check "Contract → signing" "201" "$CODE"

req POST "/contracts/$CONTRACT_ID/status" '{"status":"signed"}'
check "Contract → signed" "201" "$CODE"

echo ""
echo -e "${CYAN}=== STEP 8: FIRMATO → AUTO-FATTURA PROFORMA ===${NC}"

# Verify proforma was auto-created
req GET "/invoices"
INVOICE_ID=$(echo "$BODY" | grep "proforma" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
[ -z "$INVOICE_ID" ] && INVOICE_ID=$(echo "$BODY" | grep -o '"id":"[^"]*"' | tail -1 | cut -d'"' -f4)
echo "  Invoice: $INVOICE_ID"

req GET "/invoices/$INVOICE_ID"
I_TYPE=$(extract "type")
check "Auto-created proforma invoice" "proforma" "$I_TYPE"

echo ""
echo -e "${CYAN}=== STEP 9: PAGAMENTO → GATE → AUTO-PROGETTO ===${NC}"

# Get invoice total
TOTAL=$(extract "totalCents")
[ -z "$TOTAL" ] && TOTAL=$(extractNum "totalCents")
[ -z "$TOTAL" ] && TOTAL=0
echo "  Invoice total: $TOTAL cents"

# Register full payment
req POST "/invoices/$INVOICE_ID/payments" "{\"amountCents\":$TOTAL,\"method\":\"bank_transfer\",\"reference\":\"CRO-FLOWTEST-001\",\"paymentDate\":\"2026-04-02\"}"
check "Register full payment" "201" "$CODE"

# Verify payment complete
req GET "/invoices/$INVOICE_ID/payment-complete"
check "Invoice payment complete" "200" "$CODE"

# Verify project was auto-created!
req GET "/projects"
PROJECT_COUNT=$(echo "$BODY" | grep -o '"projectNumber"' | wc -l)
PROJECT_ID=$(echo "$BODY" | grep -o '"id":"[^"]*"' | tail -1 | cut -d'"' -f4)
echo "  Project: $PROJECT_ID (total projects: $PROJECT_COUNT)"
check "Project auto-created (GATE)" "200" "$CODE"

# Verify opportunity is now WON
req GET "/opportunities/$OPP_ID"
FINAL_OPP_STATUS=$(extract "status")
check "Opportunity auto-updated to WON" "won" "$FINAL_OPP_STATUS"

echo ""
echo -e "${CYAN}=== STEP 10: PROGETTO DELIVERY ===${NC}"

# Create Gantt tasks
req POST "/projects/$PROJECT_ID/gantt" '{"name":"Analisi Requisiti","assignedTeam":"Development","startDatePlanned":"2026-04-10","endDatePlanned":"2026-04-20"}'
check "Create gantt task 1" "201" "$CODE"
TASK1=$(extract "id")

req POST "/projects/$PROJECT_ID/gantt" '{"name":"Sviluppo Backend","assignedTeam":"Development","startDatePlanned":"2026-04-21","endDatePlanned":"2026-05-15"}'
check "Create gantt task 2" "201" "$CODE"

req POST "/projects/$PROJECT_ID/gantt" '{"name":"Go-Live","assignedTeam":"PM","startDatePlanned":"2026-06-01","endDatePlanned":"2026-06-01","isMilestone":true}'
check "Create milestone" "201" "$CODE"

# Update progress
req PUT "/projects/gantt/$TASK1/progress" '{"progressPct":100}'
check "Update task progress" "200" "$CODE"

echo ""
echo -e "${CYAN}=== STEP 11: CHANGE REQUEST ===${NC}"

req POST "/change-requests" "{\"projectId\":\"$PROJECT_ID\",\"title\":\"Aggiunta modulo reportistica\",\"description\":\"Il cliente richiede dashboard analytics aggiuntiva\",\"impactCostEstimateCents\":1500000,\"impactDaysEstimate\":10}"
check "Create change request" "201" "$CODE"
CR_ID=$(extract "id")

req GET "/change-requests/$CR_ID"
check "Get change request" "200" "$CODE"

req PATCH "/change-requests/$CR_ID/status" '{"status":"impact_analysis"}'
check "CR → impact_analysis" "200" "$CODE"

req PATCH "/change-requests/$CR_ID/status" '{"status":"awaiting_ceo"}'
check "CR → awaiting_ceo (auto-approval)" "200" "$CODE"

echo ""
echo -e "${CYAN}=== STEP 12: VERIFICA FINALE ===${NC}"

# Dashboard
req GET "/dashboard"
check "Dashboard loads" "200" "$CODE"
echo "  Dashboard: $BODY"

# Audit log
req GET "/audit-logs?entityType=project"
check "Audit logs for project" "200" "$CODE"
AUDIT_COUNT=$(echo "$BODY" | grep -o '"action"' | wc -l)
echo "  Audit entries: $AUDIT_COUNT"

echo ""
echo -e "${CYAN}============================================================${NC}"
echo -e "  ${GREEN}PASSED: $PASS${NC}"
echo -e "  ${RED}FAILED: $FAIL${NC}"
echo -e "  Total: $((PASS + FAIL)) tests"
echo -e "${CYAN}============================================================${NC}"
echo ""
if [ $FAIL -eq 0 ]; then
  echo -e "  ${GREEN}FLUSSO COMPLETO ROADMAP: TUTTO OK${NC}"
else
  echo -e "  ${RED}ATTENZIONE: $FAIL step del flusso non funzionano${NC}"
fi
echo ""
