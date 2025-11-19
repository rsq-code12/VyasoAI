from intelligence.chunking import chunk_text

def test_markdown_code_blocks():
    md = "# H1\n\nText before.\n\n```python\nprint('x')\n```\n\nText after."
    chunks = chunk_text(md, "markdown", event_id="ev2")
    assert any("print('x')" in c.text for c in chunks)

def test_html_blocks():
    html = "<h1>Title</h1><p>Para</p><script>var x=1;</script><pre>code</pre>"
    chunks = chunk_text(html, "html", event_id="ev3")
    assert any("Para" in c.text for c in chunks)
    assert any("code" in c.text for c in chunks)