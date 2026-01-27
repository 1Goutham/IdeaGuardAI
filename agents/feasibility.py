import requests

OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL = "gemma3:4b"

def feasibility_agent(idea: str):
    prompt = f"""
You are a Feasibility & Market Evaluation Agent.
Evaluate the AI product idea on:

- Technical feasibility
- Market potential
- Innovation

Give scores from 1 to 10 for each and a short explanation.

Idea:
{idea}
"""

    response = requests.post(OLLAMA_URL, json={
        "model": MODEL,
        "prompt": prompt,
        "stream": False
    })

    return response.json()["response"]
