# LLM Trace

一个用于追踪 LLM 请求的工具，帮助调试和分析 LLM 应用的行为。

## 功能概述

### 1. 本地代理服务器 (Proxy)

提供一个本地 HTTP 代理，拦截和记录对 LLM API 的请求：

- 支持 OpenAI 兼容 API
- 支持流式输出 (SSE)
- 支持普通调用
- 请求和响应保存为 JSONL 格式

### 2. 可视化工具 (TODO)

将保存的请求历史可视化为树形结构：

- 每个节点表示一次 LLM 请求
- 节点之间的边表示依赖关系：子节点的请求是在父节点基础上 append 了更多内容
- 线性对话显示为一条线
- 对话回退（如 rewind）会产生分叉
- 多条不相关对话显示为森林结构
- 点击节点可查看请求和响应详情
- 默认显示增量内容，支持查看完整请求

## 设计决策

### 存储格式：JSONL

选择 JSONL 而非数据库的原因：

- **简单** - 无需依赖，append-only 写入
- **可读** - 直接用 `cat` / `jq` 查看和处理
- **流式友好** - 每条记录独立，不怕写到一半崩溃
- **版本控制友好** - 可以直接 git diff

### 树结构构建

通过 messages 内容前缀匹配来确定父子关系，在可视化时实时计算，无需在存储时记录 parent_id。

## 使用方式

启动 proxy：

```bash
python -m llm_trace --port 8080 --output ./traces/trace.jsonl --target https://api.openai.com
```

客户端修改 base_url 即可：

```python
from openai import OpenAI

# 原来
client = OpenAI()

# 改成
client = OpenAI(base_url="http://localhost:8080/v1")
```

## 技术栈

- Python
- httpx - HTTP 客户端
- starlette - Web 框架
- uvicorn - ASGI 服务器
