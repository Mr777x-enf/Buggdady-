import os

from langchain_google_genai import ChatGoogleGenerativeAI


def get_llm():

    return ChatGoogleGenerativeAI(
        model=os.getenv("GEMINI_MODEL", "gemini-2.5-flash"),
        temperature=0,
    )