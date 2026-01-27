import requests

OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL = "gemma3:4b"

def improver_agent(idea: str):
    prompt = f"""
You are an AI Product Improvement Agent.
Suggest improvements and alternative safer use cases for this AI idea.
Enhance value and reduce risks.

Idea:
{idea}

Provide actionable recommendations.
"""

    response = requests.post(OLLAMA_URL, json={
        "model": MODEL,
        "prompt": prompt,
        "stream": False
    })

    return response.json()["response"]
