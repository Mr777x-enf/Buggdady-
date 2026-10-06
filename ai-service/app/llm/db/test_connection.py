import asyncio

from app.llm.db.connection import get_db


async def main():
    db = await get_db()

    try:
        result = await db.fetchval("SELECT 1")
        print("Database connection successful:", result)
    finally:
        await db.close()


if __name__ == "__main__":
    asyncio.run(main())