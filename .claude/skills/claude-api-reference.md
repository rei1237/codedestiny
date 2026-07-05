---
name: claude-api-reference
description: Claude API reference guide for building LLM applications with Anthropic's Claude models
---

# Claude API Reference

## Quick Start

**Always use Claude Opus 4.8** unless explicitly directed otherwise. This is the current recommended model for new applications.

```
Model: claude-opus-4-8
Context Window: 1M tokens
Input: $5.00/M tokens
Output: $25.00/M tokens
```

## Authentication

Check credentials with:
```bash
ant auth status
```

After running `ant auth login`, SDKs work with no environment variable needed.

For raw `curl` with OAuth:
```bash
Authorization: Bearer $(ant auth print-credentials --access-token)
```

## Core API Call

Everything goes through `POST /v1/messages`:

```python
from anthropic import Anthropic

client = Anthropic()  # Uses ANTHROPIC_API_KEY or OAuth
response = client.messages.create(
    model="claude-opus-4-8",
    max_tokens=1024,
    messages=[
        {"role": "user", "content": "Hello, Claude!"}
    ]
)
print(response.content[0].text)
```

## Current Models (2026)

| Model | ID | Context | Input | Output | Best For |
|---|---|---|---|---|---|
| Fable 5 | `claude-fable-5` | 1M | $10/M | $50/M | Research, complex reasoning |
| Opus 4.8 | `claude-opus-4-8` | 1M | $5/M | $25/M | General purpose (RECOMMENDED) |
| Sonnet 5 | `claude-sonnet-5` | 1M | $3/M | $15/M | Balanced (faster, cheaper) |
| Haiku 4.5 | `claude-haiku-4-5` | 200K | $1/M | $5/M | Fast, low-cost |

**Use exact model ID strings only—never append date suffixes.**

## Extended Thinking (Reasoning)

Available on Fable 5, Opus 4.8/4.7, and Sonnet 5:

```python
response = client.messages.create(
    model="claude-opus-4-8",
    max_tokens=4096,
    thinking={"type": "adaptive"},  # Auto-adjusts thinking depth
    messages=[...]
)
```

**Effort levels** control reasoning depth:
```python
output_config={"effort": "low"}    # Fast, basic reasoning
output_config={"effort": "high"}   # Thorough reasoning (default)
output_config={"effort": "max"}    # Maximum reasoning depth
```

**Display reasoning summary** (instead of empty thinking blocks):
```python
thinking={"type": "adaptive", "display": "summarized"}
```

## Tool Use (Function Calling)

Define tools for Claude to use:

```python
tools = [
    {
        "name": "get_weather",
        "description": "Get weather for a location",
        "input_schema": {
            "type": "object",
            "properties": {
                "location": {"type": "string"},
                "unit": {"type": "string", "enum": ["celsius", "fahrenheit"]}
            },
            "required": ["location"]
        }
    }
]

response = client.messages.create(
    model="claude-opus-4-8",
    max_tokens=1024,
    tools=tools,
    messages=[{"role": "user", "content": "What's the weather in Seoul?"}]
)

# Process tool calls
for content_block in response.content:
    if content_block.type == "tool_use":
        tool_name = content_block.name
        tool_input = content_block.input
        # Execute tool...
```

**Parallel tools:** Claude can call multiple tools in one message. Execute all concurrently, return all results in a single user message.

## Streaming

For real-time token output:

```python
with client.messages.stream(
    model="claude-opus-4-8",
    max_tokens=1024,
    messages=[{"role": "user", "content": "Hello!"}]
) as stream:
    for text in stream.text_stream:
        print(text, end="", flush=True)
```

## Structured Outputs

Return validated JSON from Claude:

```python
import json

response = client.messages.create(
    model="claude-opus-4-8",
    max_tokens=1024,
    messages=[...],
    output_config={
        "format": {
            "type": "json_schema",
            "json_schema": {
                "name": "fortune",
                "schema": {
                    "type": "object",
                    "properties": {
                        "card": {"type": "string"},
                        "meaning": {"type": "string"}
                    }
                }
            }
        }
    }
)

# Parse response
fortune = json.loads(response.content[0].text)
```

## File Input (Documents)

### PDF Upload (Base64)
```python
import base64

with open("document.pdf", "rb") as f:
    pdf_data = base64.standard_b64encode(f.read()).decode("utf-8")

response = client.messages.create(
    model="claude-opus-4-8",
    max_tokens=1024,
    messages=[
        {
            "role": "user",
            "content": [
                {"type": "text", "text": "Summarize this document"},
                {
                    "type": "document",
                    "source": {
                        "type": "base64",
                        "media_type": "application/pdf",
                        "data": pdf_data
                    }
                }
            ]
        }
    ]
)
```

### Files API (Beta)
For larger files or multiple requests:
```python
file = client.beta.files.upload(
    file=("report.pdf", open("report.pdf", "rb")),
)

response = client.beta.messages.create(
    model="claude-opus-4-8",
    max_tokens=1024,
    messages=[
        {
            "role": "user",
            "content": [
                {"type": "text", "text": "Analyze this file"},
                {
                    "type": "document",
                    "source": {"type": "file", "file_id": file.id}
                }
            ]
        }
    ],
    betas=["files-api-2025-04-14"]
)
```

## Prompt Caching

Reuse expensive system prompts or large context:

```python
response = client.messages.create(
    model="claude-opus-4-8",
    max_tokens=1024,
    system=[
        {
            "type": "text",
            "text": "[Large system prompt or knowledge base]",
            "cache_control": {"type": "ephemeral"}
        }
    ],
    messages=[...]
)

# Check cache hits
print(f"Cache read tokens: {response.usage.cache_read_input_tokens}")
```

## Message Batches (50% Cost Savings)

For non-latency-sensitive processing:

```python
batch_job = client.beta.messages.create_batch(
    requests=[
        {
            "custom_id": "request-1",
            "params": {
                "model": "claude-opus-4-8",
                "max_tokens": 1024,
                "messages": [{"role": "user", "content": "Query 1"}]
            }
        },
        {
            "custom_id": "request-2",
            "params": {
                "model": "claude-opus-4-8",
                "max_tokens": 1024,
                "messages": [{"role": "user", "content": "Query 2"}]
            }
        }
    ]
)

# Poll for results
while True:
    batch = client.beta.messages.retrieve_batch(batch_job.id)
    if batch.processing_status == "ended":
        break
    time.sleep(5)

# Retrieve results (unordered—match by custom_id)
for result in client.beta.messages.batch_results(batch_job.id):
    print(f"Request {result.custom_id}: {result.result.message.content[0].text}")
```

## Server-Side Tools

Available without tool definitions:

| Tool | Model Support | Use Case |
|---|---|---|
| `web_search_20260209` | Opus 4.8/4.7/4.6, Sonnet 5 | Search the web |
| `web_fetch_20260209` | Opus 4.8/4.7/4.6, Sonnet 5 | Fetch and parse URLs |
| `code_execution_20260521` | All models | Run Python code |
| `bash_20250124` | All models | Run bash commands |
| `text_editor_20250728` | All models | Read/write files |
| `memory_20250818` | All models | Persistent memory |

Example: Web search
```python
response = client.messages.create(
    model="claude-opus-4-8",
    max_tokens=1024,
    tools=[
        {
            "type": "builtin_tool",
            "name": "web_search_20260209"
        }
    ],
    messages=[{"role": "user", "content": "Search for latest AI news"}]
)
```

## Error Handling

```python
from anthropic import (
    APIError,
    APIConnectionError,
    RateLimitError,
    APIStatusError
)

try:
    response = client.messages.create(...)
except RateLimitError:
    print("Hit rate limit, retrying...")
except APIConnectionError:
    print("Connection failed")
except APIStatusError as e:
    print(f"API error: {e.status_code} - {e.message}")
```

## Common Parameters

| Parameter | Default | Notes |
|---|---|---|
| `model` | — | Required. Use `claude-opus-4-8` |
| `max_tokens` | ~16,000 | Response token limit |
| `temperature` | 1.0 | 0–1. Lower = more deterministic |
| `system` | — | System prompt or instructions |
| `messages` | — | Conversation history |
| `tools` | — | Available functions |
| `tool_choice` | "auto" | How to call tools |

## Best Practices

1. **Always check `stop_reason`** — especially for refusals
2. **Use streaming for UI** — incremental token output
3. **Validate structured outputs** — parse JSON carefully
4. **Handle tool calls explicitly** — don't assume success
5. **Batch non-urgent requests** — save 50% on cost
6. **Cache system prompts** — reuse across messages
7. **Test with Sonnet first** — faster, cheaper feedback loop
8. **Monitor token usage** — watch `response.usage`

## Application to Code Destiny

For Code Destiny's AI-powered fortune telling:

**Use Cases:**
- **Fortune interpretation**: Send user data + fortune type → Claude generates personalized reading
- **PDF generation**: Extract fortune data → format → generate PDF
- **User guidance**: Web search for astrological facts → combine with user chart

**Example: Generate Saju Interpretation**
```python
response = client.messages.create(
    model="claude-opus-4-8",
    max_tokens=2048,
    system="You are an expert in Korean Saju (사주) astrology...",
    messages=[
        {
            "role": "user",
            "content": f"Generate fortune interpretation for: {saju_data}"
        }
    ]
)

fortune_text = response.content[0].text
# Use fortune_text in PDF or UI
```

## Resources

- **Official Docs**: https://docs.anthropic.com
- **API Status**: https://status.anthropic.com
- **Python SDK**: https://github.com/anthropics/anthropic-sdk-python
- **TypeScript SDK**: https://github.com/anthropics/anthropic-sdk-typescript

---

**Use this skill when integrating Claude API into Code Destiny features.**
