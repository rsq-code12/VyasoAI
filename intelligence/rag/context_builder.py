from typing import Callable, List, Dict, Any

def build_rag_context(query: str, top_k: int = 5, time_filter=None, adapter=None, index=None, chunk_lookup: Callable[[List[int]], List[Any]] = lambda ids: [], max_tokens: int = 2048) -> Dict[str, Any]:
    qvec = adapter.embed(query)
    ids, sims = index.search(qvec, top_k)
    chunks = chunk_lookup(ids)
    items = list(zip(ids, sims, chunks))
    items.sort(key=lambda x: x[1], reverse=True)
    result_chunks = []
    provenance = []
    used = 0
    for i, s, ch in items:
        if ch is None:
            continue
        tks = max(1, len(ch.text.split()))
        if used + tks > max_tokens:
            break
        used += tks
        result_chunks.append(ch)
        provenance.append({"chunk_id": ch.chunk_id, "event_id": ch.event_id})
    compiled = "".join([f"--- Chunk {idx+1} (event_id: {c.event_id}) ---\n{c.text}\n" for idx, c in enumerate(result_chunks)])
    return {"query": query, "chunks": result_chunks, "context": compiled, "provenance": provenance}