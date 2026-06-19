"""一键导入演示数据"""
import asyncio
import httpx
from pathlib import Path

API_BASE = "http://localhost:8080/api/v1"


async def seed():
    demo_dir = Path(__file__).parent.parent / "demo"
    async with httpx.AsyncClient(timeout=120) as client:
        for doc_path in sorted(demo_dir.glob("*.txt")):
            print(f"上传: {doc_path.name}")
            files = {"file": (doc_path.name, doc_path.read_bytes(), "text/plain")}
            resp = await client.post(f"{API_BASE}/documents", files=files)
            if resp.status_code == 200:
                print(f"  OK - ID: {resp.json().get('id')}")
            else:
                print(f"  FAIL: {resp.status_code}")

    print("\n演示数据导入完成")
    print("访问 http://localhost:5173 查看图谱")
    print("试试问: '布恩迪亚家族的创始人是谁？'")


if __name__ == "__main__":
    asyncio.run(seed())
