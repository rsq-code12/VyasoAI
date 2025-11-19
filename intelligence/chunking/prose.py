import re
from typing import List, Tuple

DEFAULT_TARGET_TOKENS = 400
DEFAULT_OVERLAP_RATIO = 0.25

def estimate_tokens(text: str) -> int:
    return max(1, len(re.findall(r"\w+", text)))

def split_sentences(text: str) -> List[Tuple[int, int]]:
    spans = []
    start = 0
    for m in re.finditer(r"(?<=[.!?])\s+", text):
        end = m.start() + 1
        spans.append((start, end))
        start = m.end()
    if start < len(text):
        spans.append((start, len(text)))
    return spans

def split_paragraphs(text: str) -> List[Tuple[int, int]]:
    spans = []
    start = 0
    for m in re.finditer(r"\n\n+", text):
        end = m.start()
        if end > start:
            spans.append((start, end))
        start = m.end()
    if start < len(text):
        spans.append((start, len(text)))
    return spans

def chunk_prose(text: str, target_tokens: int = DEFAULT_TARGET_TOKENS, overlap_ratio: float = DEFAULT_OVERLAP_RATIO) -> List[Tuple[int, int]]:
    para_spans = split_paragraphs(text)
    chunks = []
    for ps in para_spans:
        ptext = text[ps[0]:ps[1]]
        s_spans = split_sentences(ptext)
        acc = []
        acc_tokens = 0
        i = 0
        while i < len(s_spans):
            s = s_spans[i]
            s_abs = (ps[0] + s[0], ps[0] + s[1])
            acc.append(s_abs)
            acc_tokens += estimate_tokens(text[s_abs[0]:s_abs[1]])
            if acc_tokens >= target_tokens:
                start = acc[0][0]
                end = acc[-1][1]
                chunks.append((start, end))
                overlap_tokens_target = int(target_tokens * overlap_ratio)
                back_tokens = 0
                j = len(acc) - 1
                while j >= 0 and back_tokens < overlap_tokens_target:
                    back_tokens += estimate_tokens(text[acc[j][0]:acc[j][1]])
                    j -= 1
                acc = acc[max(0, j+1):]
                acc_tokens = sum(estimate_tokens(text[a[0]:a[1]]) for a in acc)
            i += 1
        if acc:
            start = acc[0][0]
            end = acc[-1][1]
            if start < end:
                chunks.append((start, end))
    return chunks