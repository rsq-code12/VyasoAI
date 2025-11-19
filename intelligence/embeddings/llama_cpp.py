from typing import List, Optional, Callable

class LlamaCppEmbeddingAdapter:
    def __init__(self, model_path: str, embedding_fn: Optional[Callable] = None, batch_size: int = 32, normalize: bool = True):
        self.model_path = model_path
        self.embedding_fn = embedding_fn
        self.batch_size = batch_size
        self.normalize = normalize
        self._model = None

    def _ensure_model(self):
        if self._model is None:
            if self.embedding_fn is None:
                raise RuntimeError("No embedding function provided")
            self._model = self.embedding_fn(self.model_path)

    def embed(self, text: str) -> List[float]:
        self._ensure_model()
        vec = self._model.embed(text)
        if not isinstance(vec, list):
            vec = list(vec)
        if self.normalize and vec:
            s = sum(x * x for x in vec) ** 0.5
            if s > 0:
                vec = [x / s for x in vec]
        return vec