#!/bin/bash

# AI Hive Mind - Daily Reflection Processing Script
# This script runs the daily reflection and personality evolution process

set -e

echo "🧠 AI Hive Mind - Daily Reflection Processing"
echo "============================================"

# Configuration
API_BASE_URL="${API_BASE_URL:-http://localhost:3000}"
LOG_FILE="${LOG_FILE:-/var/log/ai-hive-mind/reflection.log}"

# Ensure log directory exists
mkdir -p "$(dirname "$LOG_FILE")"

# Log function
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $*" | tee -a "$LOG_FILE"
}

log "Starting daily reflection processing..."

# Check if API is available
if ! curl -s -f "$API_BASE_URL/api/health" > /dev/null; then
    log "ERROR: API is not available at $API_BASE_URL"
    exit 1
fi

log "API is available, proceeding with reflection processing..."

# Get list of active users and characters (this would be implemented in the API)
# For now, we'll process a sample user/character
SAMPLE_USER_ID="user_123"
SAMPLE_CHARACTER_ID="ai_hive_mind"

log "Processing reflection for user: $SAMPLE_USER_ID, character: $SAMPLE_CHARACTER_ID"

# Trigger reflection processing
RESPONSE=$(curl -s -X POST "$API_BASE_URL/api/reflection" \
    -H "Content-Type: application/json" \
    -d "{\"action\": \"process\", \"userId\": \"$SAMPLE_USER_ID\", \"characterId\": \"$SAMPLE_CHARACTER_ID\"}")

if echo "$RESPONSE" | grep -q '"success":true'; then
    log "Reflection processing completed successfully"

    # Extract and log key insights
    if echo "$RESPONSE" | jq -e '.reflection' > /dev/null 2>&1; then
        SUMMARY=$(echo "$RESPONSE" | jq -r '.reflection.summary')
        THEMES=$(echo "$RESPONSE" | jq -r '.reflection.keyThemes | join(", ")')
        ADJUSTMENTS=$(echo "$RESPONSE" | jq -r '.reflection.personalityAdjustments | length')

        log "Summary: $SUMMARY"
        log "Key themes: $THEMES"
        log "Personality adjustments: $ADJUSTMENTS"
    fi
else
    ERROR_MSG=$(echo "$RESPONSE" | jq -r '.error // "Unknown error"')
    log "ERROR: Reflection processing failed - $ERROR_MSG"
    exit 1
fi

# Optional: Run memory consolidation
log "Running memory consolidation..."
MEMORY_RESPONSE=$(curl -s -X POST "$API_BASE_URL/api/memory-aging" \
    -H "Content-Type: application/json" \
    -d "{\"action\": \"consolidate\", \"userId\": \"$SAMPLE_USER_ID\", \"characterId\": \"$SAMPLE_CHARACTER_ID\"}")

if echo "$MEMORY_RESPONSE" | grep -q '"success":true'; then
    CONSOLIDATED=$(echo "$MEMORY_RESPONSE" | jq -r '.consolidated')
    ARCHIVED=$(echo "$MEMORY_RESPONSE" | jq -r '.archived')
    DELETED=$(echo "$MEMORY_RESPONSE" | jq -r '.deleted')

    log "Memory consolidation: $CONSOLIDATED consolidated, $ARCHIVED archived, $DELETED deleted"
else
    log "WARNING: Memory consolidation failed, but continuing..."
fi

# Get updated personality traits
log "Fetching updated personality traits..."
TRAITS_RESPONSE=$(curl -s "$API_BASE_URL/api/reflection?action=traits")

if echo "$TRAITS_RESPONSE" | grep -q '"success":true'; then
    FRIENDLINESS=$(echo "$TRAITS_RESPONSE" | jq -r '.traits.friendliness')
    EMPATHY=$(echo "$TRAITS_RESPONSE" | jq -r '.traits.empathy')
    CURIOSITY=$(echo "$TRAITS_RESPONSE" | jq -r '.traits.curiosity')

    log "Updated personality traits - Friendliness: $FRIENDLINESS, Empathy: $EMPATHY, Curiosity: $CURIOSITY"
else
    log "WARNING: Could not fetch updated personality traits"
fi

log "Daily reflection processing completed successfully! 🌙✨"

# Optional: Send notification (would require external service)
# curl -X POST https://api.example.com/notify \
#     -H "Content-Type: application/json" \
#     -d "{\"message\": \"AI Hive Mind daily reflection completed\", \"status\": \"success\"}"

exit 0