import json
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/api/tasks", tags=["Tasks"])
DATA_DIR = Path(__file__).resolve().parent.parent / "data"

class SubmitAnswerRequest(BaseModel):
    task_id: str
    user_answer: float

@router.get("/{topic_id}")
def get_tasks_for_topic(topic_id: str):
    tasks_file = DATA_DIR / "tasks.json"
    if not tasks_file.exists():
        raise HTTPException(status_code=404, detail="Tasks not found")
    with open(tasks_file, "r", encoding="utf-8") as f:
        tasks_map = json.load(f)
    
    topic_tasks = tasks_map.get(topic_id, [])
    # Скрываем правильный ответ для клиента, отдаём только вопрос, подсказку и единицу измерения
    public_tasks = []
    for t in topic_tasks:
        public_tasks.append({
            "id": t["id"],
            "question": t["question"],
            "hint": t["hint"],
            "unit": t.get("unit", "")
        })
    return public_tasks

@router.post("/{topic_id}/check")
def check_answer(topic_id: str, payload: SubmitAnswerRequest):
    tasks_file = DATA_DIR / "tasks.json"
    if not tasks_file.exists():
        raise HTTPException(status_code=404, detail="Tasks not found")
    with open(tasks_file, "r", encoding="utf-8") as f:
        tasks_map = json.load(f)
    
    topic_tasks = tasks_map.get(topic_id, [])
    task = next((t for t in topic_tasks if t["id"] == payload.task_id), None)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    correct_val = task["correct"]
    tolerance = task.get("tolerance", 0.05)
    diff = abs(payload.user_answer - correct_val)
    is_correct = diff <= tolerance

    return {
        "is_correct": is_correct,
        "user_answer": payload.user_answer,
        "correct_answer": correct_val if is_correct else None,
        "unit": task.get("unit", ""),
        "explanation": task["explanation"] if is_correct else "Попробуйте ещё раз или воспользуйтесь подсказкой."
    }
