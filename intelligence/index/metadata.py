import json
import time

def write_meta(path: str, dim: int, num_items: int, space: str, model_version: str, encryption: dict | None = None):
    meta = {
        "dimension": dim,
        "date_created": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "number_of_items": num_items,
        "model_version": model_version,
        "space": space,
    }
    if encryption is not None:
        meta["encryption"] = encryption
    with open(path, "w", encoding="utf-8") as f:
        json.dump(meta, f)

def read_meta(path: str):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)