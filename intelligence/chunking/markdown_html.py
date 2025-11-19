from html.parser import HTMLParser
from typing import List, Tuple
import re

ALLOWED_TAGS = {"p", "li", "h1", "h2", "h3", "h4", "h5", "h6", "pre", "code"}

class BlockHTMLParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.blocks: List[str] = []
        self._stack: List[str] = []
        self._buf: List[str] = []

    def handle_starttag(self, tag, attrs):
        if tag in ALLOWED_TAGS:
            self._stack.append(tag)

    def handle_endtag(self, tag):
        if tag in ALLOWED_TAGS and self._stack and self._stack[-1] == tag:
            text = "".join(self._buf).strip()
            if text:
                self.blocks.append(text)
            self._buf = []
            self._stack.pop()

    def handle_data(self, data):
        if self._stack:
            self._buf.append(data)

def normalize_html_to_blocks(text: str) -> List[str]:
    parser = BlockHTMLParser()
    parser.feed(text)
    return parser.blocks

def parse_markdown_to_blocks(text: str) -> List[str]:
    blocks: List[str] = []
    fence_re = re.compile(r"^```(\w+)?\n([\s\S]*?)\n```", re.MULTILINE)
    pos = 0
    for m in fence_re.finditer(text):
        pre = text[pos:m.start()].strip()
        if pre:
            pre_lines = [x for x in re.split(r"\n\n+", pre) if x.strip()]
            blocks.extend(pre_lines)
        code_block = m.group(2).rstrip()
        if code_block:
            blocks.append(code_block)
        pos = m.end()
    tail = text[pos:].strip()
    if tail:
        tail_lines = [x for x in re.split(r"\n\n+", tail) if x.strip()]
        blocks.extend(tail_lines)
    return blocks