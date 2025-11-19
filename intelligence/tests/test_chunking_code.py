from intelligence.chunking import chunk_text

def test_python_code_chunking():
    code = "def a():\n    return 1\n\nclass B:\n    def m(self):\n        return 2\n"
    chunks = chunk_text(code, "python", event_id="ev4")
    assert len(chunks) >= 2
    assert any("class B" in c.text for c in chunks)

def test_js_code_chunking():
    code = "function a(){return 1;}\nclass X{}\nconst f = () => 2;"
    chunks = chunk_text(code, "js", event_id="ev5")
    assert len(chunks) >= 2