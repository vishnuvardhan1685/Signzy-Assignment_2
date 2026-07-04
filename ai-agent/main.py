import os
import json
import re
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import google.generativeai as genai
from dotenv import load_dotenv
import google.generativeai as genai  # type: ignore
from google.generativeai import configure  # type: ignore

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise RuntimeError("GEMINI_API_KEY not set in environment")

genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel("gemini-2.5-flash")

app = FastAPI(title="Vendor Routing AI Agent")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class GenerateConfigRequest(BaseModel):
    prompt: str

class ExplainRequest(BaseModel):
    routingReason: str
    vendorUsed: str | None = None
    strategy: str | None = None

SCHEMA_INSTRUCTIONS = """
You are a routing-config generator for a vendor routing platform.
Given a plain-English instruction, output ONLY valid JSON (no markdown fences, no preamble, no explanation)
matching exactly this schema:

{
  "capability": "<string, UPPER_SNAKE_CASE, inferred from context or default to GENERIC_CAPABILITY>",
  "strategy": "priority" | "weighted" | "lowest_latency",
  "vendors": [
    { "name": "<string>", "priority": <int or null>, "weight": <int 0-100 or null> }
  ],
  "failoverConditions": {
    "maxLatencyMs": <int or null>,
    "maxErrorRate": <float 0-1 or null>
  }
}

Rules:
- If the prompt mentions percentages/traffic split -> strategy = "weighted", fill "weight" for each vendor, "priority" = null.
- If the prompt mentions order/priority/"try X first" -> strategy = "priority", fill "priority" (1 = highest), "weight" = null.
- If the prompt mentions latency-based selection without explicit split -> strategy = "lowest_latency".
- If the prompt mentions a latency threshold like "switch if latency crosses Nms/Ns" -> failoverConditions.maxLatencyMs.
- If the prompt mentions an error rate threshold like "error rate above X%" -> failoverConditions.maxErrorRate as a decimal (5% -> 0.05).
- If a field isn't mentioned, use null. Never omit a key.
- Output raw JSON only. No ```json fences.
"""

def _strip_fences(text: str) -> str:
    text = text.strip()
    fenced = re.search(r"```(?:json)?\s*(.*?)\s*```", text, re.DOTALL | re.IGNORECASE)
    if fenced:
        return fenced.group(1).strip()
    return text

@app.post("/generate-routing-config")
def generate_routing_config(req: GenerateConfigRequest):
    full_prompt = f"{SCHEMA_INSTRUCTIONS}\n\nInstruction: \"{req.prompt}\"\n\nJSON:"
    try:
        response = model.generate_content(full_prompt)
        raw = _strip_fences(response.text)
        config = json.loads(raw)
    except json.JSONDecodeError:
        raise HTTPException(status_code=502, detail="Gemini did not return valid JSON", )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Gemini call failed: {str(e)}")

    return {"generatedConfig": config, "sourcePrompt": req.prompt}

@app.post("/explain-routing")
def explain_routing(req: ExplainRequest):
    """Turns the raw routingReason string into a natural-language explanation.
    Reuses router.js's routingReason — this endpoint just makes it more readable."""
    prompt = (
        "Rewrite this vendor-routing decision as one clear, natural sentence "
        "for a non-technical stakeholder. Do not invent facts not present below.\n\n"
        f"Raw reason: {req.routingReason}\n"
        f"Vendor used: {req.vendorUsed or 'unknown'}\n"
        f"Strategy: {req.strategy or 'unknown'}"
    )
    try:
        response = model.generate_content(prompt)
        explanation = response.text.strip()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Gemini call failed: {str(e)}")

    return {"explanation": explanation, "raw": req.routingReason}

@app.get("/health")
def health():
    return {"status": "ok"}
