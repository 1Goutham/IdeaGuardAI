import requests

OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL = "gemma3:4b"

def analyzer_agent(idea: str):
    prompt = f"""
You are an AI Idea Analysis Agent.
Understand and summarise the AI product idea.
Identify domain and key purpose.

Idea:
{idea}

Provide:
1. Short summary
2. Domain (healthcare, finance, education, etc.)
3. Key value proposition
"""

    response = requests.post(OLLAMA_URL, json={
        "model": MODEL,
        "prompt": prompt,
        "stream": False
    })

    return response.json()["response"]
