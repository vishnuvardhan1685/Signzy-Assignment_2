# Sample API Requests & Responses

All examples below were captured from real runs against this codebase, not hand-written — copy-paste them into Postman/curl to reproduce.

---

## 1. Register a vendor
**Request**
```
POST /vendors
Content-Type: application/json

{
  "name": "VendorA",
  "capability": "PAN_VERIFICATION",
  "baseUrl": "http://localhost:4000/mock/vendor-a/verify",
  "weight": 70,
  "priority": 1,
  "costPerRequest": 1.5,
  "timeoutMs": 2000,
  "rateLimitPerMinute": 100
}
```
**Response — 201 Created**
```json
{
  "id": "77a3a930-a30a-4faf-88a7-d835e35c1ee4",
  "status": "healthy",
  "createdAt": "2026-07-04T06:48:49.715Z",
  "name": "VendorA",
  "capability": "PAN_VERIFICATION",
  "baseUrl": "http://localhost:4000/mock/vendor-a/verify",
  "weight": 70,
  "priority": 1,
  "costPerRequest": 1.5,
  "timeoutMs": 2000,
  "rateLimitPerMinute": 100,
  "supportedFeatures": []
}
```

**Validation error — 400 Bad Request** (missing required fields)
```json
{ "error": "Missing required field(s): capability, baseUrl" }
```

---

## 2. List vendors
**Request**
```
GET /vendors?capability=PAN_VERIFICATION
```
**Response — 200 OK**
```json
{
  "count": 2,
  "vendors": [
    { "id": "...", "name": "VendorA", "capability": "PAN_VERIFICATION", "priority": 1, "weight": 70, "status": "healthy" },
    { "id": "...", "name": "VendorB", "capability": "PAN_VERIFICATION", "priority": 2, "weight": 30, "status": "healthy" }
  ]
}
```

---

## 3. Route a request — successful, no failover
**Request**
```
POST /route
Content-Type: application/json

{
  "capability": "PAN_VERIFICATION",
  "payload": { "pan": "ABCDE1234F", "name": "Rahul Sharma" },
  "strategy": "weighted"
}
```
**Response — 200 OK**
```json
{
  "status": "SUCCESS",
  "vendorUsed": "VendorB",
  "routingReason": "VendorB selected via weighted strategy",
  "latencyMs": 3,
  "cost": 1.2,
  "response": { "panStatus": "VALID", "nameMatch": true, "verifiedBy": "VendorB" }
}
```

---

## 4. Route a request — with failover (this is the demo scenario)
VendorA is registered with `?down=true` on its baseUrl to force a real failure.

**Request**
```
POST /route
Content-Type: application/json

{
  "capability": "PAN_VERIFICATION",
  "payload": { "pan": "ABCDE1234F", "name": "Rahul Sharma" },
  "strategy": "priority"
}
```
**Response — 200 OK**
```json
{
  "status": "SUCCESS",
  "vendorUsed": "VendorB",
  "routingReason": "VendorB selected after failover from: VendorA (HTTP 503)",
  "latencyMs": 4,
  "cost": 1.2,
  "response": { "panStatus": "VALID", "nameMatch": true, "verifiedBy": "VendorB" }
}
```
Notice this exactly matches the standardized envelope shape from the assignment spec.

---

## 5. Route a request — lowest_latency strategy
After VendorA has an observed avg latency of 509ms and VendorB has 4ms:

**Request**
```
POST /route
{ "capability": "PAN_VERIFICATION", "payload": { "pan": "X" }, "strategy": "lowest_latency" }
```
**Response — 200 OK**
```json
{
  "status": "SUCCESS",
  "vendorUsed": "VendorB",
  "routingReason": "VendorB selected via lowest_latency strategy",
  "latencyMs": 4,
  "cost": 1.2,
  "response": { "panStatus": "VALID", "nameMatch": true, "verifiedBy": "VendorB" }
}
```

---

## 6. Route a request — no vendors available
**Request**
```
POST /route
{ "capability": "OCR", "payload": { "file": "x" } }
```
**Response — 502 Bad Gateway**
```json
{
  "status": "FAILED",
  "vendorUsed": null,
  "routingReason": "No vendors registered for capability: OCR",
  "latencyMs": 0,
  "cost": null,
  "response": null
}
```

---

## 7. Vendor metrics
**Request**
```
GET /vendor-metrics?capability=PAN_VERIFICATION
```
**Response — 200 OK**
```json
{
  "count": 2,
  "metrics": [
    {
      "vendorName": "VendorA",
      "capability": "PAN_VERIFICATION",
      "avgLatencyMs": 509,
      "successRate": 1,
      "errorRate": 0,
      "totalCalls": 4,
      "callsInLastMinute": 4,
      "available": true,
      "lastCallAt": "2026-07-04T10:50:12.965Z"
    },
    {
      "vendorName": "VendorB",
      "capability": "PAN_VERIFICATION",
      "avgLatencyMs": 4,
      "successRate": 1,
      "errorRate": 0,
      "totalCalls": 2,
      "callsInLastMinute": 2,
      "available": true,
      "lastCallAt": "2026-07-04T10:50:11.937Z"
    }
  ]
}
```

---

## 8. Routing logs
**Request**
```
GET /routing-logs?capability=PAN_VERIFICATION
```
**Response — 200 OK**
```json
{
  "count": 1,
  "logs": [
    {
      "id": "6136f264-6aa9-4042-84bf-ecf8f576f137",
      "timestamp": "2026-07-04T10:42:39.495Z",
      "capability": "PAN_VERIFICATION",
      "vendorSelected": "VendorB",
      "routingReason": "VendorB selected after failover from: VendorA (HTTP 503)",
      "status": "SUCCESS",
      "latencyMs": 4,
      "cost": 1.2
    }
  ]
}
```

---

## 9. Health check
**Request:** `GET /health`
**Response:** `{ "status": "ok", "service": "vendor-routing-platform" }`