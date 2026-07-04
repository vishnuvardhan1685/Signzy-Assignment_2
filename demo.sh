#!/usr/bin/env bash
set -e
BASE="http://localhost:3000"

echo "== 1. Register vendors =="
curl -s -X POST $BASE/vendors -H "Content-Type: application/json" -d @sample-configs/vendors.json | jq
sleep 1

echo "== 2. Normal weighted routing (all vendors healthy) =="
for i in 1 2 3 4 5; do
  curl -s -X POST $BASE/route -H "Content-Type: application/json" \
    -d '{"capability":"PAN_VERIFICATION","strategy":"weighted","payload":{}}' | jq -c '{vendorUsed, routingReason}'
done

echo "== 3. Simulate Vendor A outage, trigger reactive failover =="
curl -s "http://localhost:3000/mock/vendor-a/verify?down=true" > /dev/null || true
curl -s -X POST $BASE/route -H "Content-Type: application/json" \
  -d '{"capability":"PAN_VERIFICATION","strategy":"priority","payload":{}}' | jq

echo "== 4. Proactive exclusion — next call skips Vendor A entirely =="
curl -s -X POST $BASE/route -H "Content-Type: application/json" \
  -d '{"capability":"PAN_VERIFICATION","strategy":"priority","payload":{}}' | jq

echo "== 5. Metrics after failover =="
curl -s "$BASE/vendor-metrics?capability=PAN_VERIFICATION" | jq

echo "== 6. Routing logs =="
curl -s "$BASE/routing-logs?capability=PAN_VERIFICATION&limit=5" | jq

echo "== 7. Agentic AI — generate config from natural language =="
curl -s -X POST $BASE/ai/generate-routing-config -H "Content-Type: application/json" \
  -d '{"prompt":"Use Vendor A for 70% traffic, Vendor B for 30%, switch to Vendor C if latency crosses 2 seconds or error rate is above 5%"}' | jq

echo "== 8. Agentic AI — explain last routing decision =="
curl -s -X POST $BASE/ai/explain-routing -H "Content-Type: application/json" \
  -d '{"routingReason":"VendorB selected after failover from: VendorA (HTTP 503)","vendorUsed":"VendorB","strategy":"priority"}' | jq

echo "Demo complete."