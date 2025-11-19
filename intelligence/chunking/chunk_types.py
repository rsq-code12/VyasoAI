from dataclasses import dataclass
from typing import Optional
import uuid

@dataclass
class Chunk:
    chunk_id: str
    event_id: Optional[str]
    text: str
    start_offset: int
    end_offset: int
    content_type: str

def make_chunk_id(event_id: Optional[str], start_offset: int, end_offset: int) -> str:
    if event_id:
        base = f"{event_id}:{start_offset}:{end_offset}"
        return uuid.UUID(bytes=uuid.uuid5(uuid.NAMESPACE_URL, base).bytes).hex
    return uuid.uuid4().hex