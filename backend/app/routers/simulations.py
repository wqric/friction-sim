import json
from pathlib import Path
from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/api/simulations", tags=["Simulations"])
DATA_DIR = Path(__file__).resolve().parent.parent / "data"

@router.get("")
@router.get("/")
def get_topics():
    topics_file = DATA_DIR / "topics.json"
    if not topics_file.exists():
        raise HTTPException(status_code=404, detail="Topics not found")
    with open(topics_file, "r", encoding="utf-8") as f:
        return json.load(f)

@router.get("/{topic_id}")
def get_topic(topic_id: str):
    topics_file = DATA_DIR / "topics.json"
    with open(topics_file, "r", encoding="utf-8") as f:
        topics = json.load(f)
    for t in topics:
        if t["id"] == topic_id:
            return t
    raise HTTPException(status_code=404, detail="Topic not found")
