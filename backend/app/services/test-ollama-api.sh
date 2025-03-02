#!/bin/bash
# Script to test the Ollama API with a recycling-related prompt

# Terminal colors
GREEN='\033[0;32m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Ollama is running
if ! pgrep -x "ollama" > /dev/null; then
    echo -e "${RED}Ollama is not running. Please start it with 'ollama serve' first.${NC}"
    exit 1
fi

# Set the prompt for testing recycling information
TEST_CATEGORY="plastic"

# Create the request JSON
cat > /tmp/ollama_test.json << EOF
{
    "model": "mistral",
    "prompt": "You are an expert on recycling and environmental sustainability. 
A recycling detection system has identified an item as ${TEST_CATEGORY} with 85.5% confidence.

Provide detailed information about this recyclable category in the following format:
1. Description of the material (what it is and common items made from it)
2. Whether it's generally recyclable and any specific conditions
3. Proper disposal instructions and how to prepare it for recycling
4. Environmental impact of recycling this material vs. sending to landfill
5. Interesting facts about recycling this material

Your response should be informative, accurate, and encourage proper recycling practices.",
    "stream": false,
    "options": {
        "temperature": 0.7,
        "max_tokens": 500
    }
}
EOF

echo -e "${CYAN}Sending test prompt to Ollama API...${NC}"
echo -e "${CYAN}Category: ${TEST_CATEGORY}${NC}"
echo "This may take a few seconds..."

# Use curl to send the request
response=$(curl -s -X POST http://localhost:11434/api/generate \
    -H "Content-Type: application/json" \
    -d @/tmp/ollama_test.json)

# Check if we got a valid response
if [ $? -eq 0 ] && [[ $response == *"response"* ]]; then
    # Extract the response text
    echo -e "\n${GREEN}========== OLLAMA RESPONSE ==========${NC}"
    echo "$response" | grep -o '"response":"[^"]*"' | sed 's/"response":"//g' | sed 's/"//g'
    echo -e "${GREEN}=====================================${NC}"
    
    # Display metrics
    echo -e "\n${CYAN}Response Metrics:${NC}"
    
    # Extract model name
    model=$(echo "$response" | grep -o '"model":"[^"]*"' | sed 's/"model":"//g' | sed 's/"//g')
    echo -e "${CYAN}Model:${NC} $model"
    
    # Calculate total duration if available
    duration=$(echo "$response" | grep -o '"total_duration":[0-9]*' | sed 's/"total_duration"://g')
    if [ ! -z "$duration" ]; then
        # Convert from nanoseconds to milliseconds
        duration_ms=$((duration / 1000000))
        echo -e "${CYAN}Total Duration:${NC} ${duration_ms}ms"
    fi
    
    echo -e "\n${GREEN}API test successful!${NC}"
else
    echo -e "${RED}Error calling Ollama API:${NC}"
    echo "$response"
fi

# Clean up
rm /tmp/ollama_test.json