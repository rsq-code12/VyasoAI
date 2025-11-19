from typing import List
from .chunk_types import Chunk, make_chunk_id
from .prose import chunk_prose
from .markdown_html import normalize_html_to_blocks, parse_markdown_to_blocks
from .code import chunk_python, chunk_js_ts, chunk_go, chunk_rust

def _assemble_chunks_from_spans(content: str, spans, content_type: str, event_id: str | None) -> List[Chunk]:
    return [
        Chunk(
            chunk_id=make_chunk_id(event_id, s, e),
            event_id=event_id,
            text=content[s:e],
            start_offset=s,
            end_offset=e,
            content_type=content_type,
        )
        for s, e in spans
    ]

def chunk_text(content: str, content_type: str, event_id: str | None = None) -> List[Chunk]:
    ct = content_type.lower()
    if ct in {"text", "prose", "plain"}:
        spans = chunk_prose(content)
        return _assemble_chunks_from_spans(content, spans, ct, event_id)
    if ct in {"html"}:
        blocks = normalize_html_to_blocks(content)
        spans = []
        offset = 0
        for b in blocks:
            i = content.find(b, offset)
            if i == -1:
                continue
            for s, e in chunk_prose(b):
                spans.append((i + s, i + e))
            offset = i + len(b)
        return _assemble_chunks_from_spans(content, spans, ct, event_id)
    if ct in {"markdown", "md"}:
        blocks = parse_markdown_to_blocks(content)
        spans = []
        cursor = 0
        for b in blocks:
            idx = content.find(b, cursor)
            if idx == -1:
                idx = content.find(b)
            if idx == -1:
                continue
            rel_spans = chunk_prose(b)
            spans.extend([(idx + s, idx + e) for s, e in rel_spans])
            cursor = idx + len(b)
        return _assemble_chunks_from_spans(content, spans, ct, event_id)
    if ct in {"python", "py"}:
        return _assemble_chunks_from_spans(content, chunk_python(content), ct, event_id)
    if ct in {"javascript", "js", "typescript", "ts"}:
        return _assemble_chunks_from_spans(content, chunk_js_ts(content), ct, event_id)
    if ct in {"go"}:
        return _assemble_chunks_from_spans(content, chunk_go(content), ct, event_id)
    if ct in {"rust", "rs"}:
        return _assemble_chunks_from_spans(content, chunk_rust(content), ct, event_id)
    spans = chunk_prose(content)
    return _assemble_chunks_from_spans(content, spans, ct, event_id)