#!/bin/bash
# ============================================================
# CRM Connecteed — E2E Test Script
# Tests EVERY API endpoint and reports pass/fail
# ============================================================

BASE="http://localhost:3000/api/v1"
TENANT="a0000000-0000-0000-0000-000000000001"
PASS=0
FAIL=0
ERRORS=""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

check() {
  local name="$1"
  local expected="$2"
  local actual="$3"
  local body="$4"
  if [ "$actual" == "$expected" ]; then
    echo -e "  ${GREEN}PASS${NC} $name (HTTP $actual)"
    PASS=$((PASS+1))
  else
    echo -e "  ${RED}FAIL${NC} $name — expected $expected, got $actual"
    if [ -n "$body" ]; then
      echo -e "        ${YELLOW}Response: $(echo "$body" | head -c 200)${NC}"
    fi
    FAIL=$((FAIL+1))
    ERRORS="$ERRORS\n  - $name (expected $expected, got $actual)"
  fi
}

# Helper: make request, capture code + body
req() {
  local method="$1"
  local url="$2"
  local data="$3"
  local extra_headers="$4"

  local args=(-s -w "\n%{http_code}" -X "$method" "$BASE$url" -H "Content-Type: application/json")

  if [ -n "$TOKEN" ]; then
    args+=(-H "Authorization: Bearer $TOKEN")
  fi
  if [ -n "$extra_headers" ]; then
    args+=(-H "$extra_headers")
  fi
  if [ -n "$data" ]; then
    args+=(-d "$data")
  fi

  local response=$(curl "${args[@]}")
  BODY=$(echo "$response" | head -n -1)
  CODE=$(echo "$response" | tail -n 1)
}

extract() {
  echo "$BODY" | grep -o "\"$1\":\"[^\"]*\"" | head -1 | cut -d'"' -f4
}

echo "============================================================"
echo "  CRM Connecteed — E2E Test Suite"
echo "  $(date)"
echo "============================================================"
echo ""

# ────────────────────────────────────────────────────────────
echo "=== 1. AUTH ==="
# ────────────────────────────────────────────────────────────

# 1.1 Register (might already exist)
req POST "/auth/register" '{"email":"test@connecteed.com","password":"Test123!@#","firstName":"Test","lastName":"User","role":"admin","type":"internal"}' "x-tenant-id: $TENANT"
if [ "$CODE" == "201" ] || [ "$CODE" == "409" ]; then
  check "Register user" "201 or 409" "$CODE"
  PASS=$((PASS)) # already counted
else
  check "Register user" "201" "$CODE" "$BODY"
fi

# 1.2 Login
req POST "/auth/login" '{"email":"test@connecteed.com","password":"Test123!@#"}' "x-tenant-id: $TENANT"
check "Login" "200" "$CODE" "$BODY"
TOKEN=$(extract "accessToken")
REFRESH=$(extract "refreshToken")
USER_ID=$(echo "$BODY" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo -e "${RED}FATAL: No token received. Cannot continue.${NC}"
  echo "$BODY"
  exit 1
fi
echo "  Token obtained: ${TOKEN:0:20}..."
echo "  User ID: $USER_ID"

# 1.3 Refresh token
req POST "/auth/refresh" "{\"refreshToken\":\"$REFRESH\"}"
check "Refresh token" "200" "$CODE" "$BODY"
TOKEN=$(extract "accessToken")

# 1.4 Login with wrong password
req POST "/auth/login" '{"email":"test@connecteed.com","password":"wrongpassword"}' "x-tenant-id: $TENANT"
check "Login wrong password (401)" "401" "$CODE"

# 1.5 Login without tenant
req POST "/auth/login" '{"email":"test@connecteed.com","password":"Test123!@#"}'
check "Login without tenant" "401" "$CODE"

echo ""

# ────────────────────────────────────────────────────────────
echo "=== 2. COMPANIES ==="
# ────────────────────────────────────────────────────────────

req POST "/companies" '{"name":"Test Corp Srl","vatNumber":"IT12345678901","email":"info@testcorp.it","phone":"+39 02 1234567"}'
check "Create company" "201" "$CODE" "$BODY"
COMPANY_ID=$(extract "id")
echo "  Company ID: $COMPANY_ID"

req GET "/companies"
check "List companies" "200" "$CODE"

req GET "/companies/$COMPANY_ID"
check "Get company by ID" "200" "$CODE"

req PUT "/companies/$COMPANY_ID" '{"name":"Test Corp Srl Updated","website":"https://testcorp.it"}'
check "Update company" "200" "$CODE"

echo ""

# ────────────────────────────────────────────────────────────
echo "=== 3. CONTACTS ==="
# ────────────────────────────────────────────────────────────

req POST "/contacts" "{\"companyId\":\"$COMPANY_ID\",\"firstName\":\"Mario\",\"lastName\":\"Rossi\",\"email\":\"mario@testcorp.it\",\"phone\":\"+39 333 1234567\",\"role\":\"CTO\",\"isPrimary\":true}"
check "Create contact" "201" "$CODE" "$BODY"
CONTACT_ID=$(extract "id")

req GET "/contacts?companyId=$COMPANY_ID"
check "List contacts by company" "200" "$CODE"

req GET "/contacts/$CONTACT_ID"
check "Get contact by ID" "200" "$CODE"

req PUT "/contacts/$CONTACT_ID" '{"role":"CEO"}'
check "Update contact" "200" "$CODE"

echo ""

# ────────────────────────────────────────────────────────────
echo "=== 4. PRODUCTS ==="
# ────────────────────────────────────────────────────────────

req POST "/products" '{"code":"WEB-APP","name":"Sviluppo Web Application","category":"Development","description":"Sviluppo applicazione web custom"}'
check "Create product" "201" "$CODE" "$BODY"
PRODUCT_ID=$(extract "id")

req POST "/products" '{"code":"MOBILE-APP","name":"Sviluppo App Mobile","category":"Development"}'
check "Create product 2" "201" "$CODE"

req GET "/products"
check "List products" "200" "$CODE"

req PUT "/products/$PRODUCT_ID" '{"description":"Web app con React + NestJS"}'
check "Update product" "200" "$CODE"

echo ""

# ────────────────────────────────────────────────────────────
echo "=== 5. DEPARTMENTS ==="
# ────────────────────────────────────────────────────────────

req POST "/departments" '{"name":"Development"}'
check "Create department" "201" "$CODE" "$BODY"
DEPT_ID=$(extract "id")

req POST "/departments" '{"name":"Design"}'
check "Create department 2" "201" "$CODE"

req GET "/departments"
check "List departments" "200" "$CODE"

echo ""

# ────────────────────────────────────────────────────────────
echo "=== 6. LEADS ==="
# ────────────────────────────────────────────────────────────

req POST "/leads" "{\"companyName\":\"Acme Lead Corp\",\"contactName\":\"Luigi Verdi\",\"contactEmail\":\"luigi@acme.it\",\"source\":\"website\",\"ownerId\":\"$USER_ID\",\"assignedToUserId\":\"$USER_ID\",\"nextDueDate\":\"2026-04-15T00:00:00Z\",\"valueEstimateCents\":5000000,\"probability\":60,\"productIds\":[\"$PRODUCT_ID\"],\"notes\":\"Lead da sito web\"}"
check "Create lead" "201" "$CODE" "$BODY"
LEAD_ID=$(extract "id")

req GET "/leads"
check "List leads" "200" "$CODE"

req GET "/leads/pipeline"
check "Lead pipeline" "200" "$CODE"

req GET "/leads/$LEAD_ID"
check "Get lead by ID" "200" "$CODE"

# Change status: new → qualifying
req PUT "/leads/$LEAD_ID/status" '{"status":"qualifying"}'
check "Lead status → qualifying" "200" "$CODE" "$BODY"

# Change status: qualifying → qualified
req PUT "/leads/$LEAD_ID/status" '{"status":"qualified"}'
check "Lead status → qualified" "200" "$CODE" "$BODY"

# Invalid transition test
req PUT "/leads/$LEAD_ID/status" '{"status":"new"}'
check "Lead invalid transition (400)" "400" "$CODE"

echo ""

# ────────────────────────────────────────────────────────────
echo "=== 7. LEAD CONVERSION ==="
# ────────────────────────────────────────────────────────────

# Create a new lead to convert
req POST "/leads" "{\"companyId\":\"$COMPANY_ID\",\"contactId\":\"$CONTACT_ID\",\"source\":\"referral\",\"ownerId\":\"$USER_ID\",\"assignedToUserId\":\"$USER_ID\",\"nextDueDate\":\"2026-05-01T00:00:00Z\",\"valueEstimateCents\":10000000,\"probability\":70,\"productIds\":[\"$PRODUCT_ID\"]}"
check "Create lead for conversion" "201" "$CODE" "$BODY"
LEAD2_ID=$(extract "id")

req PUT "/leads/$LEAD2_ID/status" '{"status":"qualifying"}'
check "Lead2 → qualifying" "200" "$CODE"

req POST "/leads/$LEAD2_ID/convert" '{"name":"Opportunita da Lead Test","estimatedValueCents":10000000}'
check "Convert lead to opportunity" "201" "$CODE" "$BODY"
OPP_FROM_LEAD=$(extract "id")

echo ""

# ────────────────────────────────────────────────────────────
echo "=== 8. OPPORTUNITIES ==="
# ────────────────────────────────────────────────────────────

req POST "/opportunities" "{\"name\":\"Progetto WebApp Acme\",\"companyId\":\"$COMPANY_ID\",\"productId\":\"$PRODUCT_ID\",\"source\":\"direct\",\"ownerId\":\"$USER_ID\",\"assignedToUserId\":\"$USER_ID\",\"nextDueDate\":\"2026-05-15T00:00:00Z\",\"estimatedValueCents\":15000000,\"probability\":80}"
check "Create opportunity" "201" "$CODE" "$BODY"
OPP_ID=$(extract "id")

req GET "/opportunities"
check "List opportunities" "200" "$CODE"

req GET "/opportunities/pipeline"
check "Opportunity pipeline" "200" "$CODE"

# Status transitions
req PUT "/opportunities/$OPP_ID/status" '{"status":"presales"}'
check "Opp → presales" "200" "$CODE" "$BODY"

req PUT "/opportunities/$OPP_ID/status" '{"status":"quote_preparing"}'
check "Opp → quote_preparing" "200" "$CODE" "$BODY"

# Lost with reason
req POST "/opportunities" "{\"name\":\"Lost Deal\",\"companyId\":\"$COMPANY_ID\",\"productId\":\"$PRODUCT_ID\",\"ownerId\":\"$USER_ID\"}"
check "Create opp for lost" "201" "$CODE"
LOST_OPP_ID=$(extract "id")

req PUT "/opportunities/$LOST_OPP_ID/status" '{"status":"lost","lostReason":"Budget insufficiente"}'
check "Opp → lost (with reason)" "200" "$CODE" "$BODY"

# Lost without reason should fail
req POST "/opportunities" "{\"name\":\"Test Lost No Reason\",\"companyId\":\"$COMPANY_ID\",\"productId\":\"$PRODUCT_ID\",\"ownerId\":\"$USER_ID\"}"
TEMP_OPP=$(extract "id")
req PUT "/opportunities/$TEMP_OPP/status" '{"status":"lost"}'
check "Opp → lost without reason (400)" "400" "$CODE"

echo ""

# ────────────────────────────────────────────────────────────
echo "=== 9. TICKETS ==="
# ────────────────────────────────────────────────────────────

req POST "/tickets" '{"subject":"Bug nel login","description":"Il login non funziona con Safari","priority":"high","type":"bug","category":"frontend","slaClass":"support","channel":"email"}'
check "Create ticket" "201" "$CODE" "$BODY"
TICKET_ID=$(extract "id")

req GET "/tickets"
check "List tickets" "200" "$CODE"

req GET "/tickets?status=open&priority=high"
check "Filter tickets" "200" "$CODE"

req GET "/tickets/$TICKET_ID"
check "Get ticket by ID" "200" "$CODE"

# Add message
req POST "/tickets/$TICKET_ID/reply" '{"content":"Stiamo investigando il problema","isInternal":false}'
check "Reply to ticket" "201" "$CODE" "$BODY"

# Add internal note
req POST "/tickets/$TICKET_ID/reply" '{"content":"Probabilmente un issue di CORS","isInternal":true}'
check "Internal note on ticket" "201" "$CODE"

# Get messages
req GET "/tickets/$TICKET_ID/messages?includeInternal=true"
check "Get ticket messages (with internal)" "200" "$CODE"

# Assign
req POST "/tickets/$TICKET_ID/assign" "{\"assignedTo\":\"$USER_ID\",\"assignedTeam\":\"Development\"}"
check "Assign ticket" "200" "$CODE"

# Change status
req PUT "/tickets/$TICKET_ID/status" '{"status":"in_progress"}'
check "Ticket → in_progress" "200" "$CODE"

req PUT "/tickets/$TICKET_ID/status" '{"status":"closed"}'
check "Ticket → closed" "200" "$CODE"

echo ""

# ────────────────────────────────────────────────────────────
echo "=== 10. EMAILS ==="
# ────────────────────────────────────────────────────────────

# Create template
req POST "/emails/templates" '{"name":"Welcome Email","subjectTemplate":"Benvenuto {{name}}","bodyTemplate":"<h1>Ciao {{name}}</h1><p>Benvenuto in Connecteed!</p>"}'
check "Create email template" "201" "$CODE" "$BODY"
TEMPLATE_ID=$(extract "id")

req GET "/emails/templates"
check "List email templates" "200" "$CODE"

# Create email
req POST "/emails" "{\"fromAddress\":\"team@connecteed.com\",\"toAddress\":\"mario@testcorp.it\",\"subject\":\"Test Email\",\"bodyText\":\"Contenuto test\",\"bodyHtml\":\"<p>Contenuto test</p>\",\"relatedEntityType\":\"company\",\"relatedEntityId\":\"$COMPANY_ID\"}"
check "Create email" "201" "$CODE" "$BODY"
EMAIL_ID=$(extract "id")

req GET "/emails"
check "List emails" "200" "$CODE"

req GET "/emails/by-entity?entityType=company&entityId=$COMPANY_ID"
check "Get emails by entity" "200" "$CODE"

req POST "/emails/$EMAIL_ID/send" '{}'
check "Mark email as sent" "200" "$CODE"

echo ""

# ────────────────────────────────────────────────────────────
echo "=== 11. QUOTES ==="
# ────────────────────────────────────────────────────────────

req POST "/quotes" "{\"opportunityId\":\"$OPP_ID\",\"companyId\":\"$COMPANY_ID\",\"notes\":\"Preventivo per webapp\",\"items\":[{\"type\":\"fixed\",\"description\":\"Sviluppo Frontend\",\"quantity\":1,\"unitPriceCents\":500000,\"discountPercent\":0},{\"type\":\"fixed\",\"description\":\"Sviluppo Backend\",\"quantity\":1,\"unitPriceCents\":800000,\"discountPercent\":10}]}"
check "Create quote with items" "201" "$CODE" "$BODY"
QUOTE_ID=$(extract "id")

req GET "/quotes"
check "List quotes" "200" "$CODE"

req GET "/quotes/$QUOTE_ID"
check "Get quote by ID" "200" "$CODE"

# Versions
req GET "/quotes/$QUOTE_ID/versions"
check "List quote versions" "200" "$CODE"

# Text library
req POST "/quotes/text-library" '{"category":"deliverables","title":"Standard deliverables","content":"Design mockups, Frontend, Backend, Testing, Deploy"}'
check "Create text library entry" "201" "$CODE"

req GET "/quotes/text-library"
check "List text library" "200" "$CODE"

# Status → awaiting_ceo (should auto-create approval)
req POST "/quotes/$QUOTE_ID/status" '{"status":"awaiting_ceo"}'
check "Quote → awaiting_ceo" "200" "$CODE" "$BODY"

echo ""

# ────────────────────────────────────────────────────────────
echo "=== 12. APPROVALS ==="
# ────────────────────────────────────────────────────────────

req GET "/approvals/pending"
check "List pending approvals" "200" "$CODE"
# Extract approval ID from the pending list
APPROVAL_ID=$(echo "$BODY" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "  Approval ID: $APPROVAL_ID"

if [ -n "$APPROVAL_ID" ]; then
  req POST "/approvals/$APPROVAL_ID/approve" '{"notes":"Approvato, ottimo preventivo"}'
  check "Approve quote" "200" "$CODE" "$BODY"
fi

# Verify quote status changed to approved
req GET "/quotes/$QUOTE_ID"
QUOTE_STATUS=$(extract "status")
if [ "$QUOTE_STATUS" == "approved" ]; then
  check "Quote auto-updated to approved" "approved" "$QUOTE_STATUS"
else
  check "Quote auto-updated to approved" "approved" "$QUOTE_STATUS" "Status is: $QUOTE_STATUS"
fi

# Test reject flow: create another approval
req POST "/quotes/$QUOTE_ID/status" '{"status":"awaiting_ceo"}'
# Get the new approval
req GET "/approvals/pending"
APPROVAL2_ID=$(echo "$BODY" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
if [ -n "$APPROVAL2_ID" ]; then
  req POST "/approvals/$APPROVAL2_ID/reject" '{"notes":"Margine troppo basso, rivedere i prezzi"}'
  check "Reject approval (with notes)" "200" "$CODE"
fi

# Test reject without notes
req POST "/approvals" "{\"type\":\"quote\",\"entityId\":\"$QUOTE_ID\"}"
APPROVAL3_ID=$(extract "id")
if [ -n "$APPROVAL3_ID" ]; then
  req POST "/approvals/$APPROVAL3_ID/reject" '{"notes":""}'
  check "Reject without notes (400)" "400" "$CODE"
fi

echo ""

# ────────────────────────────────────────────────────────────
echo "=== 13. CONTRACTS ==="
# ────────────────────────────────────────────────────────────

req POST "/contracts" "{\"companyId\":\"$COMPANY_ID\",\"opportunityId\":\"$OPP_ID\",\"quoteId\":\"$QUOTE_ID\"}"
check "Create contract" "201" "$CODE" "$BODY"
CONTRACT_ID=$(extract "id")

req GET "/contracts"
check "List contracts" "200" "$CODE"

req GET "/contracts/$CONTRACT_ID"
check "Get contract by ID" "200" "$CODE"

# Status transitions
req POST "/contracts/$CONTRACT_ID/status" '{"status":"awaiting_ceo"}'
check "Contract → awaiting_ceo" "200" "$CODE" "$BODY"

# Add signer
req POST "/contracts/$CONTRACT_ID/signatures" '{"signerEmail":"mario@testcorp.it","signerName":"Mario Rossi"}'
check "Add contract signer" "201" "$CODE" "$BODY"

echo ""

# ────────────────────────────────────────────────────────────
echo "=== 14. INVOICES ==="
# ────────────────────────────────────────────────────────────

req POST "/invoices" "{\"type\":\"proforma\",\"companyId\":\"$COMPANY_ID\",\"dueDate\":\"2026-05-01\",\"notes\":\"Proforma per progetto WebApp\",\"items\":[{\"description\":\"Sviluppo Frontend\",\"quantity\":1,\"unitPriceCents\":500000,\"taxRate\":22},{\"description\":\"Sviluppo Backend\",\"quantity\":1,\"unitPriceCents\":800000,\"taxRate\":22}]}"
check "Create invoice" "201" "$CODE" "$BODY"
INVOICE_ID=$(extract "id")

req GET "/invoices"
check "List invoices" "200" "$CODE"

req GET "/invoices/$INVOICE_ID"
check "Get invoice by ID" "200" "$CODE"

# Register partial payment
req POST "/invoices/$INVOICE_ID/payments" '{"amountCents":500000,"method":"bank_transfer","reference":"CRO-12345","paymentDate":"2026-04-02"}'
check "Register partial payment" "201" "$CODE" "$BODY"

# Check payment complete
req GET "/invoices/$INVOICE_ID/payment-complete"
check "Check payment complete (false)" "200" "$CODE"

# Register remaining payment
req POST "/invoices/$INVOICE_ID/payments" '{"amountCents":886000,"method":"bank_transfer","reference":"CRO-12346","paymentDate":"2026-04-03"}'
check "Register full payment" "201" "$CODE"

# Check overdue
req GET "/invoices/check-overdue"
check "Check overdue invoices" "200" "$CODE"

echo ""

# ────────────────────────────────────────────────────────────
echo "=== 15. PROJECTS ==="
# ────────────────────────────────────────────────────────────

# Create WBS template
req POST "/projects/wbs-templates" "{\"productId\":\"$PRODUCT_ID\",\"name\":\"Web App Standard\",\"phases\":[{\"name\":\"Analisi\",\"order\":1},{\"name\":\"Design\",\"order\":2},{\"name\":\"Sviluppo\",\"order\":3},{\"name\":\"Test\",\"order\":4},{\"name\":\"Go-Live\",\"order\":5}]}"
check "Create WBS template" "201" "$CODE" "$BODY"

req GET "/projects/wbs-templates"
check "List WBS templates" "200" "$CODE"

# Create project manually
req POST "/projects" "{\"companyId\":\"$COMPANY_ID\",\"opportunityId\":\"$OPP_ID\",\"name\":\"WebApp Acme Corp\",\"description\":\"Progetto sviluppo webapp\"}"
check "Create project" "201" "$CODE" "$BODY"
PROJECT_ID=$(extract "id")

req GET "/projects"
check "List projects" "200" "$CODE"

req GET "/projects/$PROJECT_ID"
check "Get project by ID" "200" "$CODE"

# Create Gantt tasks
req POST "/projects/$PROJECT_ID/gantt" '{"name":"Analisi Requisiti","assignedTeam":"Development","startDatePlanned":"2026-04-10","endDatePlanned":"2026-04-20","isMilestone":false}'
check "Create gantt task" "201" "$CODE" "$BODY"
TASK_ID=$(extract "id")

req POST "/projects/$PROJECT_ID/gantt" '{"name":"Milestone: Fine Analisi","assignedTeam":"PM","startDatePlanned":"2026-04-20","endDatePlanned":"2026-04-20","isMilestone":true}'
check "Create milestone" "201" "$CODE"

# Get gantt
req GET "/projects/$PROJECT_ID/gantt"
check "Get project gantt" "200" "$CODE"

# Update task progress
req PUT "/projects/gantt/$TASK_ID/progress" '{"progressPct":50}'
check "Update task progress" "200" "$CODE"

echo ""

# ────────────────────────────────────────────────────────────
echo "=== 16. FILES ==="
# ────────────────────────────────────────────────────────────

# Upload a test file
echo "Test file content for CRM Connecteed" > /tmp/test-upload.txt
curl -s -w "\n%{http_code}" -X POST "$BASE/files/upload" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/tmp/test-upload.txt" \
  -F "name=test-document.txt" \
  -F "entityType=project" \
  -F "entityId=$PROJECT_ID" \
  -F "isClientVisible=true" \
  -F "tags=test,document" > /tmp/file_resp.txt 2>&1
FILE_CODE=$(tail -1 /tmp/file_resp.txt)
FILE_BODY=$(head -n -1 /tmp/file_resp.txt)
check "Upload file" "201" "$FILE_CODE" "$FILE_BODY"
FILE_ID=$(echo "$FILE_BODY" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

req GET "/files"
check "List files" "200" "$CODE"

req GET "/files/by-entity?entityType=project&entityId=$PROJECT_ID"
check "Get files by entity" "200" "$CODE"

if [ -n "$FILE_ID" ]; then
  req GET "/files/$FILE_ID"
  check "Get file by ID" "200" "$CODE"

  req GET "/files/$FILE_ID/versions"
  check "Get file versions" "200" "$CODE"

  req PUT "/files/$FILE_ID" '{"status":"approved","isClientVisible":true}'
  check "Update file status" "200" "$CODE"
fi

echo ""

# ────────────────────────────────────────────────────────────
echo "=== 17. NOTIFICATIONS ==="
# ────────────────────────────────────────────────────────────

req GET "/notifications"
check "List notifications" "200" "$CODE"

req GET "/notifications/unread-count"
check "Unread count" "200" "$CODE"

req POST "/notifications/read-all" '{}'
check "Mark all read" "200" "$CODE"

echo ""

# ────────────────────────────────────────────────────────────
echo "=== 18. DASHBOARD ==="
# ────────────────────────────────────────────────────────────

req GET "/dashboard"
check "Dashboard KPIs" "200" "$CODE"
echo "  Dashboard data: $(echo $BODY | head -c 200)"

echo ""

# ────────────────────────────────────────────────────────────
echo "=== 19. AUDIT LOGS ==="
# ────────────────────────────────────────────────────────────

req GET "/audit-logs"
check "List audit logs" "200" "$CODE"

req GET "/audit-logs?entityType=company"
check "Filter audit logs by entity" "200" "$CODE"

echo ""

# ────────────────────────────────────────────────────────────
echo "=== 20. SECURITY TESTS ==="
# ────────────────────────────────────────────────────────────

# Access without token
SAVED_TOKEN="$TOKEN"
TOKEN=""
req GET "/companies"
check "No token → 401" "401" "$CODE"
TOKEN="$SAVED_TOKEN"

# Invalid token
TOKEN="invalid-token-12345"
req GET "/companies"
check "Invalid token → 401" "401" "$CODE"
TOKEN="$SAVED_TOKEN"

echo ""
echo "============================================================"
echo "  RESULTS"
echo "============================================================"
echo -e "  ${GREEN}PASSED: $PASS${NC}"
echo -e "  ${RED}FAILED: $FAIL${NC}"
echo ""
if [ $FAIL -gt 0 ]; then
  echo -e "  ${RED}FAILED TESTS:${NC}"
  echo -e "$ERRORS"
fi
echo ""
echo "  Total: $((PASS + FAIL)) tests"
echo "============================================================"
