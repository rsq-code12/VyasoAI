import ast
import re
from typing import List, Tuple

def _line_offsets(text: str) -> List[int]:
    offs = [0]
    for i, ch in enumerate(text):
        if ch == "\n":
            offs.append(i + 1)
    offs.append(len(text))
    return offs

def _span_from_lines(text: str, start_line: int, end_line: int) -> Tuple[int, int]:
    offs = _line_offsets(text)
    start = offs[max(0, start_line - 1)]
    end = offs[max(0, end_line - 1)]
    return (start, end)

def chunk_python(text: str, max_chars: int = 4000, overlap_chars: int = 800) -> List[Tuple[int, int]]:
    spans: List[Tuple[int, int]] = []
    try:
        tree = ast.parse(text)
    except Exception:
        return [(0, len(text))]
    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
            if hasattr(node, "lineno") and hasattr(node, "end_lineno") and node.end_lineno:
                s, e = _span_from_lines(text, node.lineno, node.end_lineno)
                if e - s <= max_chars:
                    spans.append((s, e))
                else:
                    start = s
                    while start < e:
                        end = min(e, start + max_chars)
                        spans.append((start, end))
                        if end >= e:
                            break
                        start = max(start + max_chars - overlap_chars, s)
    if not spans:
        spans.append((0, len(text)))
    spans.sort(key=lambda x: x[0])
    return spans

def chunk_js_ts(text: str, max_chars: int = 4000, overlap_chars: int = 800) -> List[Tuple[int, int]]:
    spans: List[Tuple[int, int]] = []
    patterns = [
        r"class\s+\w+\s*\{",
        r"function\s+\w+\s*\(",
        r"\w+\s*=\s*\([^\)]*\)\s*=>",
    ]
    idxs = []
    for pat in patterns:
        for m in re.finditer(pat, text):
            idxs.append(m.start())
    idxs = sorted(set(idxs))
    if not idxs:
        return [(0, len(text))]
    idxs.append(len(text))
    for i in range(len(idxs) - 1):
        s = idxs[i]
        e = idxs[i + 1]
        if e - s <= max_chars:
            spans.append((s, e))
        else:
            start = s
            while start < e:
                end = min(e, start + max_chars)
                spans.append((start, end))
                if end >= e:
                    break
                start = max(start + max_chars - overlap_chars, s)
    return spans

def chunk_go(text: str, max_chars: int = 4000, overlap_chars: int = 800) -> List[Tuple[int, int]]:
    spans: List[Tuple[int, int]] = []
    idxs = [m.start() for m in re.finditer(r"\bfunc\s+", text)]
    if not idxs:
        return [(0, len(text))]
    idxs.append(len(text))
    for i in range(len(idxs) - 1):
        s = idxs[i]
        e = idxs[i + 1]
        if e - s <= max_chars:
            spans.append((s, e))
        else:
            start = s
            while start < e:
                end = min(e, start + max_chars)
                spans.append((start, end))
                if end >= e:
                    break
                start = max(start + max_chars - overlap_chars, s)
    return spans

def chunk_rust(text: str, max_chars: int = 4000, overlap_chars: int = 800) -> List[Tuple[int, int]]:
    spans: List[Tuple[int, int]] = []
    idxs = [m.start() for m in re.finditer(r"\b(fn|struct|impl)\b", text)]
    if not idxs:
        return [(0, len(text))]
    idxs.append(len(text))
    for i in range(len(idxs) - 1):
        s = idxs[i]
        e = idxs[i + 1]
        if e - s <= max_chars:
            spans.append((s, e))
        else:
            start = s
            while start < e:
                end = min(e, start + max_chars)
                spans.append((start, end))
                if end >= e:
                    break
                start = max(start + max_chars - overlap_chars, s)
    return spans