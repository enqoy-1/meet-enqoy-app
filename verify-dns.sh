#!/bin/bash

# DNS Verification Script
# Checks if vps.lanchi.et resolves to the correct IP

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

DOMAIN="vps.lanchi.et"
EXPECTED_IP="75.119.156.107"

echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}DNS Verification for $DOMAIN${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""

# Method 1: Using dig
echo -e "${YELLOW}[1] Checking with dig...${NC}"
if command -v dig &> /dev/null; then
    RESOLVED_IP=$(dig +short $DOMAIN | tail -1)
    if [ "$RESOLVED_IP" = "$EXPECTED_IP" ]; then
        echo -e "${GREEN}✓ DNS is correct: $DOMAIN → $RESOLVED_IP${NC}"
    else
        echo -e "${RED}✗ DNS mismatch: Expected $EXPECTED_IP, got $RESOLVED_IP${NC}"
    fi
else
    echo "  dig not installed, skipping..."
fi

# Method 2: Using nslookup
echo ""
echo -e "${YELLOW}[2] Checking with nslookup...${NC}"
if command -v nslookup &> /dev/null; then
    RESOLVED_IP=$(nslookup $DOMAIN 2>/dev/null | grep -A 1 "Name:" | tail -1 | awk '{print $2}')
    if [ -n "$RESOLVED_IP" ]; then
        if [ "$RESOLVED_IP" = "$EXPECTED_IP" ]; then
            echo -e "${GREEN}✓ DNS is correct: $DOMAIN → $RESOLVED_IP${NC}"
        else
            echo -e "${RED}✗ DNS mismatch: Expected $EXPECTED_IP, got $RESOLVED_IP${NC}"
        fi
    else
        echo -e "${RED}✗ Could not resolve $DOMAIN${NC}"
    fi
else
    echo "  nslookup not installed, skipping..."
fi

# Method 3: Using host
echo ""
echo -e "${YELLOW}[3] Checking with host...${NC}"
if command -v host &> /dev/null; then
    RESOLVED_IP=$(host $DOMAIN | grep "has address" | awk '{print $4}' | head -1)
    if [ -n "$RESOLVED_IP" ]; then
        if [ "$RESOLVED_IP" = "$EXPECTED_IP" ]; then
            echo -e "${GREEN}✓ DNS is correct: $DOMAIN → $RESOLVED_IP${NC}"
        else
            echo -e "${RED}✗ DNS mismatch: Expected $EXPECTED_IP, got $RESOLVED_IP${NC}"
        fi
    else
        echo -e "${RED}✗ Could not resolve $DOMAIN${NC}"
    fi
else
    echo "  host not installed, skipping..."
fi

# Method 4: Using ping (just to test connectivity)
echo ""
echo -e "${YELLOW}[4] Testing connectivity...${NC}"
if ping -c 1 -W 2 $DOMAIN &> /dev/null; then
    echo -e "${GREEN}✓ Domain is reachable${NC}"
else
    echo -e "${YELLOW}⚠ Domain may not be reachable (could be firewall or DNS not propagated)${NC}"
fi

# Summary
echo ""
echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}Summary${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""
echo "Domain: $DOMAIN"
echo "Expected IP: $EXPECTED_IP"
echo ""
echo "If DNS is not resolving correctly:"
echo "1. Check DNS records in your domain provider"
echo "2. Wait for DNS propagation (can take up to 48 hours)"
echo "3. Clear your DNS cache"
echo "4. Try checking from different locations: https://dnschecker.org/#A/$DOMAIN"

