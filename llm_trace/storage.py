"""Storage layer for trace records."""

import json
import threading
from pathlib import Path

from .models import TraceRecord


class JSONLStorage:
    """Append-only JSONL storage for trace records."""

    def __init__(self, filepath: str | Path):
        self.filepath = Path(filepath)
        self._lock = threading.Lock()
        # Ensure parent directory exists
        self.filepath.parent.mkdir(parents=True, exist_ok=True)

    def append(self, record: TraceRecord) -> None:
        """Append a trace record to the JSONL file."""
        with self._lock:
            with open(self.filepath, "a", encoding="utf-8") as f:
                json.dump(record.to_dict(), f, ensure_ascii=False)
                f.write("\n")

    def read_all(self) -> list[TraceRecord]:
        """Read all records from the JSONL file."""
        if not self.filepath.exists():
            return []

        records = []
        with open(self.filepath, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line:
                    data = json.loads(line)
                    records.append(
                        TraceRecord(
                            id=data["id"],
                            timestamp=data["timestamp"],
                            request=data["request"],
                            response=data.get("response"),
                            duration_ms=data.get("duration_ms", 0),
                            error=data.get("error"),
                        )
                    )
        return records
