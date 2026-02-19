"""Proxy server for intercepting LLM API requests."""

import json
import time
from collections.abc import AsyncIterator

import httpx
from starlette.applications import Starlette
from starlette.requests import Request
from starlette.responses import JSONResponse, StreamingResponse, Response
from starlette.routing import Route

from .models import TraceRecord
from .storage import JSONLStorage

# Default OpenAI API base URL
DEFAULT_TARGET_URL = "https://api.openai.com"


class LLMProxy:
    """Proxy server that intercepts and logs LLM API requests."""

    def __init__(self, target_url: str, storage: JSONLStorage):
        self.target_url = target_url.rstrip("/")
        self.storage = storage
        self.client = httpx.AsyncClient(timeout=httpx.Timeout(300.0))

    async def close(self):
        """Close the HTTP client."""
        await self.client.aclose()

    async def proxy_chat_completions(self, request: Request) -> Response:
        """Proxy the chat completions endpoint."""
        start_time = time.time()

        # Read and parse request body
        body = await request.body()
        try:
            request_data = json.loads(body)
        except json.JSONDecodeError:
            return JSONResponse({"error": "Invalid JSON"}, status_code=400)

        # Build headers for upstream request
        headers = {}
        if "authorization" in request.headers:
            headers["Authorization"] = request.headers["authorization"]
        if "content-type" in request.headers:
            headers["Content-Type"] = request.headers["content-type"]

        # Determine if streaming
        is_stream = request_data.get("stream", False)

        # Build upstream URL
        upstream_url = f"{self.target_url}/v1/chat/completions"

        if is_stream:
            return await self._handle_streaming_request(
                upstream_url, headers, request_data, start_time
            )
        else:
            return await self._handle_normal_request(
                upstream_url, headers, request_data, start_time
            )

    async def _handle_normal_request(
        self,
        url: str,
        headers: dict,
        request_data: dict,
        start_time: float,
    ) -> Response:
        """Handle non-streaming request."""
        record = TraceRecord(request=request_data)

        try:
            response = await self.client.post(url, headers=headers, json=request_data)
            duration_ms = int((time.time() - start_time) * 1000)

            response_data = response.json()
            record.response = response_data
            record.duration_ms = duration_ms

            self.storage.append(record)

            return JSONResponse(response_data, status_code=response.status_code)

        except httpx.RequestError as e:
            duration_ms = int((time.time() - start_time) * 1000)
            record.error = str(e)
            record.duration_ms = duration_ms
            self.storage.append(record)

            return JSONResponse(
                {"error": {"message": str(e), "type": "proxy_error"}},
                status_code=502,
            )

    async def _handle_streaming_request(
        self,
        url: str,
        headers: dict,
        request_data: dict,
        start_time: float,
    ) -> Response:
        """Handle streaming request."""
        record = TraceRecord(request=request_data)

        async def generate() -> AsyncIterator[bytes]:
            chunks: list[str] = []
            collected_content = ""
            response_id = None
            model = None

            try:
                async with self.client.stream(
                    "POST", url, headers=headers, json=request_data
                ) as response:
                    async for line in response.aiter_lines():
                        # Forward raw line to client
                        yield f"{line}\n".encode("utf-8")

                        # Parse SSE data
                        if line.startswith("data: "):
                            data = line[6:]
                            if data == "[DONE]":
                                continue

                            try:
                                chunk = json.loads(data)
                                chunks.append(data)

                                # Extract metadata from first chunk
                                if response_id is None:
                                    response_id = chunk.get("id")
                                    model = chunk.get("model")

                                # Extract content delta
                                choices = chunk.get("choices", [])
                                if choices:
                                    delta = choices[0].get("delta", {})
                                    content = delta.get("content", "")
                                    if content:
                                        collected_content += content

                            except json.JSONDecodeError:
                                pass

                # Record the complete response
                duration_ms = int((time.time() - start_time) * 1000)
                record.duration_ms = duration_ms
                record.response = {
                    "id": response_id,
                    "model": model,
                    "content": collected_content,
                    "stream": True,
                }
                self.storage.append(record)

            except httpx.RequestError as e:
                duration_ms = int((time.time() - start_time) * 1000)
                record.error = str(e)
                record.duration_ms = duration_ms
                self.storage.append(record)

                error_response = json.dumps(
                    {"error": {"message": str(e), "type": "proxy_error"}}
                )
                yield f"data: {error_response}\n".encode("utf-8")

        return StreamingResponse(
            generate(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
            },
        )


def create_app(target_url: str, storage: JSONLStorage) -> Starlette:
    """Create the Starlette application."""
    proxy = LLMProxy(target_url, storage)

    async def chat_completions(request: Request) -> Response:
        return await proxy.proxy_chat_completions(request)

    async def health(request: Request) -> Response:
        return JSONResponse({"status": "ok"})

    async def on_shutdown():
        await proxy.close()

    app = Starlette(
        routes=[
            Route("/v1/chat/completions", chat_completions, methods=["POST"]),
            Route("/health", health, methods=["GET"]),
        ],
        on_shutdown=[on_shutdown],
    )

    return app
