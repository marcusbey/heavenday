#!/bin/bash

# Integration Tests Runner Script
# Comprehensive script to run all integration tests with proper setup and teardown

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
INTEGRATION_TESTS_DIR="$PROJECT_ROOT/tests/integration"
DOCKER_COMPOSE_FILE="$PROJECT_ROOT/docker-compose.integration.yml"
LOG_DIR="$PROJECT_ROOT/logs/integration-tests"
TIMEOUT=300  # 5 minutes timeout for service startup

# Create log directory
mkdir -p "$LOG_DIR"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] ✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] ⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ❌ $1${NC}"
}

# Function to cleanup on exit
cleanup() {
    local exit_code=$?
    print_status "Cleaning up..."
    
    if [ "$CLEANUP_ON_EXIT" = "true" ]; then
        docker-compose -f "$DOCKER_COMPOSE_FILE" down -v --remove-orphans &>/dev/null || true
        docker system prune -f --filter "label=com.docker.compose.project=heaven-dolls-integration" &>/dev/null || true
    fi
    
    if [ $exit_code -eq 0 ]; then
        print_success "Integration tests completed successfully!"
    else
        print_error "Integration tests failed with exit code $exit_code"
        print_status "Logs are available in: $LOG_DIR"
    fi
    
    exit $exit_code
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to wait for service
wait_for_service() {
    local service_name="$1"
    local url="$2"
    local timeout="$3"
    local start_time=$(date +%s)
    
    print_status "Waiting for $service_name to be ready..."
    
    while ! curl -f -s "$url" >/dev/null 2>&1; do
        local current_time=$(date +%s)
        local elapsed=$((current_time - start_time))
        
        if [ $elapsed -gt $timeout ]; then
            print_error "$service_name failed to start within $timeout seconds"
            return 1
        fi
        
        sleep 2
        printf "."
    done
    
    echo ""
    print_success "$service_name is ready!"
}

# Function to check system requirements
check_requirements() {
    print_status "Checking system requirements..."
    
    # Check Docker
    if ! command_exists docker; then
        print_error "Docker is not installed or not in PATH"
        exit 1
    fi
    
    # Check Docker Compose
    if ! command_exists docker-compose; then
        print_error "Docker Compose is not installed or not in PATH"
        exit 1
    fi
    
    # Check Node.js
    if ! command_exists node; then
        print_error "Node.js is not installed or not in PATH"
        exit 1
    fi
    
    # Check npm
    if ! command_exists npm; then
        print_error "npm is not installed or not in PATH"
        exit 1
    fi
    
    # Check available memory
    if command_exists free; then
        local available_memory=$(free -m | awk '/^Mem:/{print $7}')
        if [ "$available_memory" -lt 4096 ]; then
            print_warning "Available memory is less than 4GB. Integration tests may fail."
        fi
    fi
    
    # Check available disk space
    if command_exists df; then
        local available_space=$(df -BG "$PROJECT_ROOT" | awk 'NR==2{print $4}' | sed 's/G//')
        if [ "$available_space" -lt 10 ]; then
            print_warning "Available disk space is less than 10GB. Integration tests may fail."
        fi
    fi
    
    print_success "System requirements check passed!"
}

# Function to setup environment
setup_environment() {
    print_status "Setting up test environment..."
    
    cd "$PROJECT_ROOT"
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        print_status "Installing project dependencies..."
        npm ci
    fi
    
    # Install integration test dependencies
    if [ ! -d "$INTEGRATION_TESTS_DIR/node_modules" ]; then
        print_status "Installing integration test dependencies..."
        cd "$INTEGRATION_TESTS_DIR"
        npm ci
        cd "$PROJECT_ROOT"
    fi
    
    # Create test environment file
    if [ ! -f ".env.test" ]; then
        print_status "Creating test environment file..."
        cat > .env.test << EOF
NODE_ENV=test
DATABASE_URL=postgresql://test_user:test_password@localhost:5433/heaven_dolls_integration_test
CMS_URL=http://localhost:1338
WEB_URL=http://localhost:3001
AUTOMATION_URL=http://localhost:3002
TRACKING_URL=http://localhost:3003
REDIS_URL=redis://localhost:6380
JWT_SECRET=integration_test_jwt_secret
ADMIN_JWT_SECRET=integration_test_admin_jwt_secret
APP_KEYS=integration_test_app_key_1,integration_test_app_key_2
API_TOKEN_SALT=integration_test_api_token_salt
TRANSFER_TOKEN_SALT=integration_test_transfer_token_salt
WEBHOOK_SECRET=test-webhook-secret
GOOGLE_SHEETS_CLIENT_EMAIL=test@example.com
GOOGLE_SHEETS_PRIVATE_KEY=test_private_key
GOOGLE_SHEETS_SPREADSHEET_ID=test_spreadsheet_id
EOF
    fi
    
    # Create test service account file
    if [ ! -f "$INTEGRATION_TESTS_DIR/test-service-account.json" ]; then
        print_status "Creating test Google Sheets service account..."
        cat > "$INTEGRATION_TESTS_DIR/test-service-account.json" << EOF
{
  "type": "service_account",
  "project_id": "test-project",
  "private_key_id": "test-key-id",
  "private_key": "-----BEGIN PRIVATE KEY-----\nTEST_PRIVATE_KEY\n-----END PRIVATE KEY-----\n",
  "client_email": "test@test-project.iam.gserviceaccount.com",
  "client_id": "123456789",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token"
}
EOF
    fi
    
    print_success "Environment setup completed!"
}

# Function to start services
start_services() {
    print_status "Starting integration test services..."
    
    # Clean up any existing containers
    docker-compose -f "$DOCKER_COMPOSE_FILE" down -v --remove-orphans >/dev/null 2>&1 || true
    
    # Start services
    docker-compose -f "$DOCKER_COMPOSE_FILE" up -d --build
    
    # Wait for core services
    print_status "Waiting for core services to be ready..."
    
    wait_for_service "PostgreSQL" "http://localhost:5433" 60 || {
        print_error "PostgreSQL health check failed, trying manual check..."
        docker exec heaven-dolls-integration-postgres-integration-1 pg_isready -U test_user -d heaven_dolls_integration_test || return 1
    }
    
    wait_for_service "Redis" "http://localhost:6380" 30 || {
        print_error "Redis health check failed, trying manual check..."
        docker exec heaven-dolls-integration-redis-integration-1 redis-cli ping | grep -q PONG || return 1
    }
    
    wait_for_service "CMS" "http://localhost:1338/_health" "$TIMEOUT"
    wait_for_service "Web" "http://localhost:3001/api/health" "$TIMEOUT"
    wait_for_service "Tracking" "http://localhost:3003/health" "$TIMEOUT"
    wait_for_service "MinIO" "http://localhost:9000/minio/health/live" 60
    
    print_success "All services are ready!"
}

# Function to run specific test suite
run_test_suite() {
    local test_pattern="$1"
    local test_name="$2"
    
    print_status "Running $test_name tests..."
    
    cd "$INTEGRATION_TESTS_DIR"
    
    local log_file="$LOG_DIR/${test_name,,}-$(date +%Y%m%d-%H%M%S).log"
    
    if npm test -- --testNamePattern="$test_pattern" --verbose --forceExit 2>&1 | tee "$log_file"; then
        print_success "$test_name tests passed!"
        return 0
    else
        print_error "$test_name tests failed! Check log: $log_file"
        return 1
    fi
}

# Function to run all tests
run_all_tests() {
    print_status "Running complete integration test suite..."
    
    local failed_tests=()
    local start_time=$(date +%s)
    
    cd "$INTEGRATION_TESTS_DIR"
    
    # Array of test suites to run
    local test_suites=(
        "Frontend.*CMS:Frontend ↔ CMS Integration"
        "Automation.*CMS:Automation ↔ CMS Integration"
        "Tracking.*Systems:Tracking ↔ All Systems Integration"
        "Database:Database Integration"
        "End-to-End:End-to-End Data Flow"
        "Performance:Performance Integration"
        "Error Handling:Error Handling and Recovery"
        "Security:Security Integration"
    )
    
    # Run test suites
    for suite in "${test_suites[@]}"; do
        IFS=':' read -r pattern name <<< "$suite"
        
        if [ "$SPECIFIC_SUITE" = "" ] || [ "$SPECIFIC_SUITE" = "$pattern" ]; then
            if ! run_test_suite "$pattern" "$name"; then
                failed_tests+=("$name")
            fi
        fi
    done
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    print_status "Test suite completed in ${duration}s"
    
    if [ ${#failed_tests[@]} -eq 0 ]; then
        print_success "All integration tests passed! 🎉"
        
        # Generate summary report
        generate_test_report "success" "$duration"
        
        return 0
    else
        print_error "Failed test suites: ${failed_tests[*]}"
        
        # Generate summary report
        generate_test_report "failure" "$duration" "${failed_tests[@]}"
        
        return 1
    fi
}

# Function to generate test report
generate_test_report() {
    local status="$1"
    local duration="$2"
    shift 2
    local failed_tests=("$@")
    
    local report_file="$LOG_DIR/integration-test-report-$(date +%Y%m%d-%H%M%S).md"
    
    cat > "$report_file" << EOF
# Integration Test Report

**Date:** $(date '+%Y-%m-%d %H:%M:%S')
**Duration:** ${duration}s
**Status:** $status

## Environment
- Node.js: $(node --version)
- Docker: $(docker --version | head -n1)
- OS: $(uname -s -r)

## Services
- PostgreSQL: localhost:5433
- Redis: localhost:6380
- CMS: localhost:1338
- Web: localhost:3001
- Automation: localhost:3002
- Tracking: localhost:3003

## Test Results
EOF
    
    if [ "$status" = "success" ]; then
        echo "✅ All tests passed successfully!" >> "$report_file"
    else
        echo "❌ Some tests failed:" >> "$report_file"
        for test in "${failed_tests[@]}"; do
            echo "- $test" >> "$report_file"
        done
    fi
    
    echo "" >> "$report_file"
    echo "## Logs" >> "$report_file"
    echo "Test logs are available in: $LOG_DIR" >> "$report_file"
    
    print_status "Test report generated: $report_file"
}

# Function to collect debug information
collect_debug_info() {
    print_status "Collecting debug information..."
    
    local debug_dir="$LOG_DIR/debug-$(date +%Y%m%d-%H%M%S)"
    mkdir -p "$debug_dir"
    
    # Docker logs
    docker-compose -f "$DOCKER_COMPOSE_FILE" logs --no-color > "$debug_dir/docker-compose.log" 2>&1
    
    # Individual service logs
    docker logs heaven-dolls-integration-cms-integration-1 > "$debug_dir/cms.log" 2>&1 || true
    docker logs heaven-dolls-integration-web-integration-1 > "$debug_dir/web.log" 2>&1 || true
    docker logs heaven-dolls-integration-tracking-integration-1 > "$debug_dir/tracking.log" 2>&1 || true
    docker logs heaven-dolls-integration-automation-integration-1 > "$debug_dir/automation.log" 2>&1 || true
    
    # System information
    cat > "$debug_dir/system-info.txt" << EOF
Date: $(date)
OS: $(uname -a)
Docker version: $(docker --version)
Docker Compose version: $(docker-compose --version)
Node.js version: $(node --version)
npm version: $(npm --version)
Available memory: $(free -h 2>/dev/null || echo "N/A")
Available disk space: $(df -h "$PROJECT_ROOT" 2>/dev/null || echo "N/A")
EOF
    
    # Docker system information
    docker system info > "$debug_dir/docker-info.txt" 2>&1 || true
    docker ps -a > "$debug_dir/docker-ps.txt" 2>&1 || true
    
    print_status "Debug information collected in: $debug_dir"
}

# Function to show usage
show_usage() {
    cat << EOF
Integration Tests Runner

USAGE:
    $0 [OPTIONS] [TEST_SUITE]

OPTIONS:
    -h, --help              Show this help message
    -v, --verbose           Enable verbose output
    -c, --no-cleanup        Don't cleanup containers on exit
    -s, --setup-only        Only setup environment and start services
    -t, --teardown-only     Only teardown services and cleanup
    -d, --debug             Collect debug information on failure
    --timeout SECONDS       Set service startup timeout (default: 300)

TEST_SUITES:
    frontend-cms           Frontend ↔ CMS Integration tests
    automation-cms         Automation ↔ CMS Integration tests
    tracking               Tracking ↔ All Systems Integration tests
    database               Database Integration tests
    e2e                    End-to-End Data Flow tests
    performance            Performance Integration tests
    security               Security Integration tests
    error-handling         Error Handling and Recovery tests
    all                    Run all test suites (default)

EXAMPLES:
    $0                     Run all integration tests
    $0 frontend-cms        Run only Frontend ↔ CMS tests
    $0 -c performance      Run performance tests without cleanup
    $0 --setup-only        Only start services for manual testing
    $0 --teardown-only     Stop and cleanup all services

ENVIRONMENT VARIABLES:
    CLEANUP_ON_EXIT        Set to "false" to disable cleanup on exit
    INTEGRATION_TEST_LOG   Set to custom log directory path
    TIMEOUT                Override default service startup timeout

EOF
}

# Parse command line arguments
VERBOSE=false
CLEANUP_ON_EXIT=true
SETUP_ONLY=false
TEARDOWN_ONLY=false
DEBUG_ON_FAILURE=false
SPECIFIC_SUITE=""

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_usage
            exit 0
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        -c|--no-cleanup)
            CLEANUP_ON_EXIT=false
            shift
            ;;
        -s|--setup-only)
            SETUP_ONLY=true
            shift
            ;;
        -t|--teardown-only)
            TEARDOWN_ONLY=true
            shift
            ;;
        -d|--debug)
            DEBUG_ON_FAILURE=true
            shift
            ;;
        --timeout)
            TIMEOUT="$2"
            shift 2
            ;;
        frontend-cms)
            SPECIFIC_SUITE="Frontend.*CMS"
            shift
            ;;
        automation-cms)
            SPECIFIC_SUITE="Automation.*CMS"
            shift
            ;;
        tracking)
            SPECIFIC_SUITE="Tracking.*Systems"
            shift
            ;;
        database)
            SPECIFIC_SUITE="Database"
            shift
            ;;
        e2e)
            SPECIFIC_SUITE="End-to-End"
            shift
            ;;
        performance)
            SPECIFIC_SUITE="Performance"
            shift
            ;;
        security)
            SPECIFIC_SUITE="Security"
            shift
            ;;
        error-handling)
            SPECIFIC_SUITE="Error Handling"
            shift
            ;;
        all)
            SPECIFIC_SUITE=""
            shift
            ;;
        *)
            print_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Set trap for cleanup
trap cleanup EXIT

# Main execution
main() {
    print_status "Starting Heaven Dolls Integration Tests Runner"
    print_status "Project root: $PROJECT_ROOT"
    print_status "Log directory: $LOG_DIR"
    
    # Handle teardown only
    if [ "$TEARDOWN_ONLY" = "true" ]; then
        print_status "Teardown only mode - stopping services..."
        docker-compose -f "$DOCKER_COMPOSE_FILE" down -v --remove-orphans
        docker system prune -f --filter "label=com.docker.compose.project=heaven-dolls-integration"
        print_success "Services stopped and cleaned up!"
        exit 0
    fi
    
    # Check requirements
    check_requirements
    
    # Setup environment
    setup_environment
    
    # Start services
    start_services
    
    # Handle setup only
    if [ "$SETUP_ONLY" = "true" ]; then
        print_success "Setup completed! Services are running and ready for testing."
        print_status "To run tests manually:"
        print_status "  cd $INTEGRATION_TESTS_DIR"
        print_status "  npm test"
        print_status ""
        print_status "To stop services:"
        print_status "  $0 --teardown-only"
        CLEANUP_ON_EXIT=false  # Don't cleanup in setup-only mode
        exit 0
    fi
    
    # Run tests
    if ! run_all_tests; then
        if [ "$DEBUG_ON_FAILURE" = "true" ]; then
            collect_debug_info
        fi
        exit 1
    fi
}

# Run main function
main "$@"