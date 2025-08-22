#!/bin/bash

# Test runner script for AI Lead Gen Pro
echo "🧪 Running AI Lead Gen Pro Test Suite"
echo "====================================="

# Set test environment
export NODE_ENV=test
export REDIS_URL=memory

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to run tests with nice output
run_test_suite() {
    local suite_name=$1
    local test_command=$2
    
    echo -e "\n${YELLOW}Running ${suite_name}...${NC}"
    
    if eval "$test_command"; then
        echo -e "${GREEN}✅ ${suite_name} passed${NC}"
        return 0
    else
        echo -e "${RED}❌ ${suite_name} failed${NC}"
        return 1
    fi
}

# Track failures
FAILED=0

# Run unit tests
run_test_suite "Unit Tests" "npm test -- --testPathPattern='(cache|rate-limit|engine|horsemen)\.test\.ts' --silent" || FAILED=$((FAILED + 1))

# Run API tests
run_test_suite "API Tests" "npm test -- --testPathPattern='api.*\.test\.ts' --silent" || FAILED=$((FAILED + 1))

# Run integration tests
run_test_suite "Integration Tests" "npm test -- --testPathPattern='integration.*\.test\.ts' --silent" || FAILED=$((FAILED + 1))

# Run with coverage
echo -e "\n${YELLOW}Generating coverage report...${NC}"
npm test -- --coverage --silent

# Summary
echo -e "\n====================================="
if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All test suites passed!${NC}"
    echo -e "\n📊 Coverage report generated in coverage/"
    echo -e "📄 View detailed report: open coverage/lcov-report/index.html"
else
    echo -e "${RED}❌ ${FAILED} test suite(s) failed${NC}"
    exit 1
fi

# Run type checking
echo -e "\n${YELLOW}Running TypeScript type checking...${NC}"
if npm run type-check; then
    echo -e "${GREEN}✅ Type checking passed${NC}"
else
    echo -e "${RED}❌ Type checking failed${NC}"
    exit 1
fi

# Run linting
echo -e "\n${YELLOW}Running ESLint...${NC}"
if npm run lint; then
    echo -e "${GREEN}✅ Linting passed${NC}"
else
    echo -e "${RED}❌ Linting failed${NC}"
    exit 1
fi

echo -e "\n${GREEN}🎉 All checks passed! The system is working correctly.${NC}"