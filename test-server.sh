#!/bin/bash
# Test script for Table Top Codex server

echo "=== Testing Table Top Codex Server ==="
echo ""

# Kill any existing server processes
pkill -f "node.*index.js" 2>/dev/null
sleep 1

# Start server on port 5050 (to avoid conflict with port 5000)
cd server
PORT=5050 node index.js > /tmp/ttc-server.log 2>&1 &
SERVER_PID=$!
echo "Started server on port 5050 (PID: $SERVER_PID)"
sleep 2

echo ""
echo "1. Testing root endpoint..."
curl -s http://localhost:5050/ && echo ""

echo ""
echo "2. Testing /api/health..."
curl -s http://localhost:5050/api/health | python3 -m json.tool 2>/dev/null || curl -s http://localhost:5050/api/health

echo ""
echo "3. Testing /api/ping..."
curl -s http://localhost:5050/api/ping | python3 -m json.tool 2>/dev/null || curl -s http://localhost:5050/api/ping

echo ""
echo "4. Testing user registration..."
curl -s -X POST http://localhost:5050/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"password123"}' | python3 -m json.tool 2>/dev/null || echo "Failed"

echo ""
echo "5. Checking server logs for errors..."
tail -20 /tmp/ttc-server.log

echo ""
echo "=== Tests complete ==="
echo "Server still running (PID: $SERVER_PID)"
echo "Kill with: kill $SERVER_PID"
