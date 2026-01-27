import requests

OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL = "gemma3:4b"

def governance_agent(idea: str):
    prompt = f"""
You are an AI Governance & Safety Agent.
Analyse the AI product idea for:

- Ethical risks
- Data privacy issues
- Bias and misuse
- Regulatory concerns (GDPR, healthcare, finance if applicable)

Provide:
1. Key risks
2. Safety recommendations
"""

    response = requests.post(OLLAMA_URL, json={
        "model": MODEL,
        "prompt": prompt,
        "stream": False
    })

    return response.json()["response"]
