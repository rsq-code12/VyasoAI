from intelligence.chunking import chunk_text

def test_prose_chunking_basic():
    text = "Paragraph one. It has sentences.\n\nParagraph two with more sentences. End here."
    chunks = chunk_text(text, "text", event_id="ev1")
    assert len(chunks) >= 1
    assert all(c.text for c in chunks)
    assert chunks[0].start_offset < chunks[0].end_offset
    assert chunks == sorted(chunks, key=lambda c: c.start_offset)