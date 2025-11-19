import json
import csv
import argparse
from typing import List
from intelligence.embeddings.mock import MockEmbeddingAdapter
from intelligence.index.vector_index import VectorIndex

def precision_at_k(retrieved: List[str], relevant: List[str], k: int = 5) -> float:
    top = set(retrieved[:k])
    rel = set(relevant)
    if not top:
        return 0.0
    return len(top & rel) / min(k, len(retrieved))

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("test_data")
    parser.add_argument("--index", default=None)
    args = parser.parse_args()
    with open(args.test_data, "r", encoding="utf-8") as f:
        data = json.load(f)
    adapter = MockEmbeddingAdapter()
    if args.index:
        index = VectorIndex.load(args.index)
    else:
        index = VectorIndex(dim=128)
        ids = []
        vecs = []
        for i, item in enumerate(data):
            v = adapter.embed(item["query"])
            ids.append(i+1)
            vecs.append(v)
        index.add(ids, vecs)
    rows = []
    for item in data:
        q = item["query"]
        rel = item["relevant_ids"]
        v = adapter.embed(q)
        ids, sims = index.search(v, top_k=5)
        retrieved_ids = [str(x) for x in ids]
        p5 = precision_at_k(retrieved_ids, [str(x) for x in rel], k=5)
        rows.append([q, f"{p5:.3f}", ",".join(retrieved_ids), ",".join([str(x) for x in rel])])
    with open("evaluation_results.csv", "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["query", "p@5", "retrieved_ids", "relevant_ids"])
        w.writerows(rows)

if __name__ == "__main__":
    main()