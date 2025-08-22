# AI Lead Gen Pro - Test Scenarios

## Overview
These test scenarios validate the system's ability to identify automation opportunities and analyze companies for potential lead generation. Each scenario tests different aspects of the 5-pass Horsemen analysis pattern.

## Test Environment
- URL: http://localhost:3001
- Mode: Mock mode enabled (no real API calls)
- Database: PostgreSQL local instance

## Test Scenarios

### Scenario 1: Opportunity Search - Data Entry Automation
**Purpose**: Test the system's ability to identify businesses needing data entry automation

**API Call**:
```bash
curl -X POST http://localhost:3001/api/research \
  -H "Content-Type: application/json" \
  -H "X-Client-ID: test-client-001" \
  -d '{
    "keywords": "data entry automation",
    "location": "Remote",
    "clientId": "test-client-001"
  }'
```

**Expected Behavior**:
1. Brody Pass: Should identify job postings with data entry keywords
2. Karen Pass: Should analyze job descriptions for repetitive task indicators
3. Durin Pass: Should validate companies are legitimate
4. Kevin Pass: Should enrich with company size/industry data
5. Pinko Pass: Should score opportunities based on automation potential

**Success Criteria**:
- Returns 5-10 opportunities
- Each opportunity has automation_score > 70
- Companies show indicators like "manual data entry", "repetitive tasks"

### Scenario 2: Company Deep Research - E-commerce Business
**Purpose**: Test deep analysis of a specific company's automation needs

**API Call**:
```bash
curl -X POST http://localhost:3001/api/research \
  -H "Content-Type: application/json" \
  -H "X-Client-ID: test-client-002" \
  -d '{
    "companyName": "TechCorp Solutions",
    "companyUrl": "https://techcorp.example.com",
    "notes": "Focus on e-commerce order processing automation"
  }'
```

**Expected Behavior**:
1. Initial scraping of company website
2. Technology stack analysis (e-commerce platforms)
3. Process inefficiency identification
4. Business intelligence gathering
5. Automation opportunity synthesis

**Success Criteria**:
- Detailed company profile returned
- Identified manual processes (order processing, inventory)
- Technology gaps highlighted
- Automation recommendations provided
- Confidence score > 80%

### Scenario 3: Industry-Specific Search - Legal Services
**Purpose**: Validate industry-specific opportunity identification

**API Call**:
```bash
curl -X POST http://localhost:3001/api/research \
  -H "Content-Type: application/json" \
  -H "X-Client-ID: test-client-003" \
  -d '{
    "keywords": "legal document processing",
    "location": "New York, NY",
    "clientId": "test-client-003"
  }'
```

**Expected Behavior**:
- Identifies law firms and legal services companies
- Focuses on document-heavy processes
- Highlights contract review, case filing automation needs

**Success Criteria**:
- Returns legal industry companies
- High scores for document processing inefficiencies
- Appropriate industry-specific recommendations

### Scenario 4: High-Volume Processing Test
**Purpose**: Test system performance under multiple concurrent requests

**Test Script**:
```bash
# Run 5 concurrent searches
for i in {1..5}; do
  curl -X POST http://localhost:3001/api/research \
    -H "Content-Type: application/json" \
    -H "X-Client-ID: test-client-load-$i" \
    -d "{
      \"keywords\": \"customer service automation\",
      \"location\": \"California\",
      \"clientId\": \"test-client-load-$i\"
    }" &
done
wait
```

**Success Criteria**:
- All requests complete within 30 seconds
- No errors or timeouts
- Rate limiting properly enforced
- Results remain consistent

### Scenario 5: Edge Case - No Results Found
**Purpose**: Test graceful handling when no opportunities match criteria

**API Call**:
```bash
curl -X POST http://localhost:3001/api/research \
  -H "Content-Type: application/json" \
  -H "X-Client-ID: test-client-004" \
  -d '{
    "keywords": "quantum computing nanotechnology",
    "location": "Rural Montana",
    "clientId": "test-client-004"
  }'
```

**Expected Behavior**:
- Returns empty or minimal results
- Provides helpful message about expanding search
- No errors or crashes

### Scenario 6: Status Endpoint Health Check
**Purpose**: Verify system operational status

**API Call**:
```bash
curl -X GET http://localhost:3001/api/status \
  -H "X-Client-ID: test-client-status"
```

**Expected Response**:
```json
{
  "status": "operational",
  "timestamp": "2024-01-20T...",
  "version": "2.0.0",
  "rateLimit": {
    "remaining": 95,
    "reset": "..."
  },
  "cache": {
    "type": "in-memory",
    "hits": 0,
    "misses": 0
  },
  "health": {
    "api": "healthy",
    "cache": "in-memory",
    "database": "healthy"
  }
}
```

## Validation Process

1. **Run Each Scenario**: Execute the curl commands and capture responses
2. **Verify Response Structure**: Ensure all expected fields are present
3. **Check Business Logic**: Validate scoring algorithms work correctly
4. **Monitor Performance**: Track response times and resource usage
5. **Review Logs**: Check for any errors or warnings in console

## Scoring Validation

The system should score opportunities based on:
- **Manual Process Indicators** (30 points): "data entry", "manual processing"
- **Volume Indicators** (25 points): "high volume", "repetitive"
- **Tech Gap Indicators** (20 points): No automation mentioned
- **Growth Indicators** (15 points): "growing", "scaling"
- **Pain Point Indicators** (10 points): "time-consuming", "tedious"

Total scores above 70 indicate strong automation opportunities.

## Test Automation Script

Save as `run-tests.sh`:

```bash
#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo "Starting AI Lead Gen Pro Test Suite..."
echo "======================================="

# Function to test endpoint
test_endpoint() {
    local test_name=$1
    local curl_cmd=$2
    local expected_status=${3:-200}
    
    echo -e "\n${GREEN}Testing: $test_name${NC}"
    response=$(eval "$curl_cmd -w '\n%{http_code}'" 2>/dev/null)
    status_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$status_code" = "$expected_status" ]; then
        echo -e "${GREEN}✓ Status Code: $status_code${NC}"
        echo "Response: $body" | jq '.' 2>/dev/null || echo "$body"
    else
        echo -e "${RED}✗ Failed - Status Code: $status_code${NC}"
        echo "Response: $body"
    fi
}

# Run tests
test_endpoint "Status Check" \
    "curl -s -X GET http://localhost:3001/api/status -H 'X-Client-ID: test-status'"

test_endpoint "Opportunity Search" \
    "curl -s -X POST http://localhost:3001/api/research -H 'Content-Type: application/json' -H 'X-Client-ID: test-001' -d '{\"keywords\":\"data entry automation\",\"location\":\"Remote\",\"clientId\":\"test-001\"}'"

test_endpoint "Company Research" \
    "curl -s -X POST http://localhost:3001/api/research -H 'Content-Type: application/json' -H 'X-Client-ID: test-002' -d '{\"companyName\":\"TechCorp\",\"companyUrl\":\"https://techcorp.com\",\"notes\":\"E-commerce focus\"}'"

echo -e "\n${GREEN}Test Suite Complete!${NC}"
```

Make executable: `chmod +x run-tests.sh`