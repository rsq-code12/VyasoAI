from typing import Dict

class IdMap:
    def __init__(self):
        self._to_int: Dict[str, int] = {}
        self._to_str: Dict[int, str] = {}
        self._next = 1

    def get_int(self, chunk_id: str) -> int:
        if chunk_id in self._to_int:
            return self._to_int[chunk_id]
        v = self._next
        self._next += 1
        self._to_int[chunk_id] = v
        self._to_str[v] = chunk_id
        return v

    def get_str(self, int_id: int) -> str:
        return self._to_str[int_id]