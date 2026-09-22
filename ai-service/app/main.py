from fastapi import FastAPI

from app.routes.router import router


app = FastAPI(
    title="Code Debugger AI Service",
    version="1.0.0"
)


app.include_router(router)


@app.get("/")
async def root():
    return {
        "message": "AI service is running"
    }


@app.get("/health")
async def health():
    return {
        "status": "healthy"
    }