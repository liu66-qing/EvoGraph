# EvoGraph 面试级改造提示词（精确版，基于实际代码验证）

> 最后更新：2026-06-19 | 基于 commit 435faf1 验证

## 背景（每次对话开头贴）

```
项目：EvoGraph — 基于知识图谱的 Agentic RAG 系统
技术栈：FastAPI + React + Neo4j + Qdrant + Redis + Celery + D3.js
核心流程：文档上传 → 切片(loader.py) → LLM抽取实体关系(extractor.py) → 消歧(resolver.py) → 冲突检测+合并(merger.py) → 混合检索(hybrid.py, RRF融合graph/vector/keyword) → Agent多步推理(orchestrator.py: plan→execute→synthesize→validate) → 回答

关键代码位置：
- Agent入口：src/evograph/agent/orchestrator.py — AgentOrchestrator.run()
- 规划器：src/evograph/agent/planner.py — QueryPlanner.plan()
- 工具注册：src/evograph/agent/tools/registry.py — 6工具：graph_query, vector_search, temporal_query, conflict_check, causal_reason, hybrid_search
- 混合检索：src/evograph/retrieval/hybrid.py — HybridRetriever._reciprocal_rank_fusion()
- 知识演化：src/evograph/evolution/pipeline.py — 6阶段
- 冲突检测：src/evograph/evolution/conflict_detector.py
- LLM客户端：src/evograph/llm/client.py — AsyncOpenAI + DeepSeek兼容
- 前端：frontend/src/pages/ 下5页面

当前问题（面试要靠修复这些来展示工程能力）：
1. 从未用真实数据跑通端到端流程
2. 前端全英文，demo数据是硬编码的OpenAI相关内容
3. llm/client.py 第39行取response后忽略usage字段 — 无token统计
4. orchestrator.py 第81行 working_memory 是请求级list，无session持久化
5. merger.py 第63-69行：检测到冲突后仍执行_create_relation，无阻断
6. 测试仅1文件3个测试方法（tests/unit/test_conflict_detector.py），integration/e2e目录为空
7. observability/tracing.py的SpanTracer未被orchestrator调用
8. 无CI，无认证

面试官关注6点：
1. 真实业务场景+可演示   2. 企业级工程规范
3. 任务规划能力          4. 上下文管理
5. 可观测性              6. 人机协同
```

---

## 第一轮：前端汉化 + Demo数据替换

```
完成以下修改：

### A. Layout.tsx 导航汉化

文件：frontend/src/components/common/Layout.tsx
第5-11行 navItems 数组 label 改为：
- 'Graph Explorer' → '知识图谱'
- 'Query Console' → '智能问答'
- 'Documents' → '文档管理'
- 'Conflicts' → '冲突检测'
- 'Timeline' → '时间线'

第23行副标题 "Knowledge Graph Evolution Agent" → "知识图谱演化智能体"
第44行底部 "Agentic RAG with KG Evolution" → "Agentic RAG 知识演化系统"

### B. GraphExplorer.tsx

标题 "Knowledge Graph Explorer" → "知识图谱"
搜索placeholder "Search entities..." → "搜索实体..."
图例 "Entity Types" → "实体类型"

第181-190行 DEMO_NODES 替换为：
```typescript
const DEMO_NODES: GraphNode[] = [
  { id: '1', name: '何塞·阿尔卡蒂奥·布恩迪亚', type: 'person' },
  { id: '2', name: '乌尔苏拉', type: 'person' },
  { id: '3', name: '马孔多', type: 'location' },
  { id: '4', name: '奥雷里亚诺·布恩迪亚上校', type: 'person' },
  { id: '5', name: '梅尔基亚德斯', type: 'person' },
  { id: '6', name: '阿玛兰妲', type: 'person' },
  { id: '7', name: '雷梅黛丝', type: 'person' },
  { id: '8', name: '香蕉公司', type: 'organization' },
]
```

第192-200行 DEMO_LINKS 替换为：
```typescript
const DEMO_LINKS: GraphLink[] = [
  { source: '1', target: '2', type: 'MARRIED_TO', confidence: 0.99 },
  { source: '1', target: '3', type: 'FOUNDED', confidence: 0.95 },
  { source: '4', target: '1', type: 'SON_OF', confidence: 0.99 },
  { source: '6', target: '1', type: 'DAUGHTER_OF', confidence: 0.99 },
  { source: '5', target: '1', type: 'FRIEND_OF', confidence: 0.85 },
  { source: '8', target: '3', type: 'LOCATED_IN', confidence: 0.9 },
  { source: '4', target: '7', type: 'MARRIED_TO', confidence: 0.8 },
]
```

### C. QueryConsole.tsx

标题 → "智能问答"
"Ask a question about your knowledge graph" → "向知识图谱提问"
"Try:" → "试试："
第91-93行三个示例替换为：
- "布恩迪亚家族的创始人是谁？"
- "奥雷里亚诺上校和马孔多有什么关系？"
- "香蕉公司进入马孔多后发生了什么？"

"Reasoning..." → "推理中..."
"reasoning steps" → "推理步骤"
"Confidence" → "置信度"

### D. DocumentIngest.tsx

第60行 "Document Ingestion" → "文档管理"
拖拽区 "Drag & drop files" → "拖拽文档到此处上传"
"Supports PDF, TXT, MD, HTML" → "支持 PDF、TXT、MD、HTML"
"Browse Files" → "选择文件"
status文案汉化：processing→"处理中", completed→"已完成", failed→"处理失败", pending→"等待中"

### E. ConflictDashboard.tsx

第47行 "Knowledge Conflicts" → "知识冲突"
第50行 "open conflict(s) detected..." → "{openCount} 个待处理冲突"
DEMO_CONFLICTS 改为百年孤独相关：
- 冲突1: "马孔多建镇时间冲突", fact_a: "何塞建立马孔多(约1820年)", fact_b: "另一记载称马孔多建于1850年"
- 冲突2: "同名人物消歧", fact_a: "何塞·阿尔卡蒂奥(创始人,第一代)", fact_b: "何塞·阿尔卡蒂奥(长子,第二代)"

### F. Timeline.tsx

第37行 "Temporal Evolution" → "时间演化"
第40行 "Travel through time..." → "查看知识图谱的演化历程"
DEMO_EVENTS 改为百年孤独事件：
- "实体「何塞·阿尔卡蒂奥·布恩迪亚」创建"
- "何塞 --[FOUNDED]--> 马孔多"
- "奥雷里亚诺 --[SON_OF]--> 何塞"
- "时间冲突：马孔多建镇日期"

改完运行 `cd frontend && npm run build` 确认通过。
```

---

## 第二轮：演示文档 + seed脚本

```
### 设计原则
选《百年孤独》做测试集因为：七代同名人物是实体消歧极端case，密集时间跨度压测时间冲突检测，复杂家族关系链验证多跳推理。

### 创建 demo/ 目录

demo/doc1_first_generation.txt（~600字）：
布恩迪亚家族第一代叙述，必须包含：
- 实体：何塞·阿尔卡蒂奥·布恩迪亚(person)、乌尔苏拉·伊瓜兰(person)、马孔多(location)、梅尔基亚德斯(person)
- 关系：何塞 FOUNDED 马孔多（约1820年）、何塞 MARRIED_TO 乌尔苏拉、梅尔基亚德斯 FRIEND_OF 何塞
- 时间：明确"约1820年建镇"

demo/doc2_colonel.txt（~600字）：
奥雷里亚诺上校叙述，包含：
- 实体：奥雷里亚诺·布恩迪亚上校(person)、雷梅黛丝(person)、自由党(organization)、马孔多(location)
- 关系：奥雷里亚诺 SON_OF 何塞、MARRIED_TO 雷梅黛丝、LEADER_OF 自由党
- 时间：战争时期"1876-1898年"

demo/doc3_conflict.txt（~600字）：
故意制造冲突：
- 同名冲突："何塞·阿尔卡蒂奥"既指创始人又指第二代长子
- 时间冲突：声称"马孔多建于1850年"（与doc1矛盾）
- 数字分歧："发动32次起义"vs其他说法

### 创建 scripts/seed_demo.py

```python
"""一键导入演示数据"""
import asyncio
import httpx
from pathlib import Path

API_BASE = "http://localhost:8080/api/v1"

async def seed():
    demo_dir = Path(__file__).parent.parent / "demo"
    async with httpx.AsyncClient(timeout=120) as client:
        for doc_path in sorted(demo_dir.glob("*.txt")):
            print(f"上传: {doc_path.name}")
            files = {"file": (doc_path.name, doc_path.read_bytes(), "text/plain")}
            resp = await client.post(f"{API_BASE}/documents", files=files)
            if resp.status_code == 200:
                print(f"  OK - ID: {resp.json().get('id')}")
            else:
                print(f"  FAIL: {resp.status_code}")

    print("\n演示数据导入完成")
    print("访问 http://localhost:5173 查看图谱")
    print("试试问: '布恩迪亚家族的创始人是谁？'")

if __name__ == "__main__":
    asyncio.run(seed())
```

### Makefile 添加

```makefile
demo:
	python scripts/seed_demo.py
```

注意：httpx 已在 pyproject.toml dev deps 中，无需重复添加。
```

---

## 第三轮：可观测性（token统计 + tracing集成）

```
### 1. 修改 src/evograph/llm/client.py

在 LLMClient.__init__ 添加统计字段：
```python
self._call_stats: list[dict] = []
self._total_tokens: int = 0
self._total_cost: float = 0.0
```

修改 chat() 方法（第29-40行区域），在调用前后加计时和统计：
```python
async def chat(self, messages, temperature=0.0, max_tokens=4096, response_format=None) -> str:
    kwargs = {...}  # 现有逻辑
    start_time = time.time()
    response = await self._client.chat.completions.create(**kwargs)
    latency_ms = int((time.time() - start_time) * 1000)

    if response.usage:
        usage = response.usage
        stat = {
            "model": self._model,
            "prompt_tokens": usage.prompt_tokens,
            "completion_tokens": usage.completion_tokens,
            "total_tokens": usage.total_tokens,
            "timestamp": time.time(),
            "latency_ms": latency_ms,
        }
        self._call_stats.append(stat)
        self._total_tokens += usage.total_tokens
        # DeepSeek: 输入¥0.001/千token，输出¥0.002/千token
        self._total_cost += (usage.prompt_tokens * 0.001 + usage.completion_tokens * 0.002) / 1000

    return response.choices[0].message.content or ""
```

添加统计方法：
```python
def get_stats(self) -> dict:
    return {
        "total_calls": len(self._call_stats),
        "total_tokens": self._total_tokens,
        "total_cost_yuan": round(self._total_cost, 4),
        "avg_latency_ms": int(sum(s["latency_ms"] for s in self._call_stats) / max(len(self._call_stats), 1)),
        "recent_calls": self._call_stats[-10:],
    }

def reset_stats(self) -> None:
    self._call_stats.clear()
    self._total_tokens = 0
    self._total_cost = 0.0
```

记得 `import time` 加到文件头。

### 2. 修改 domain.py 的 AgentResponse

在 AgentResponse（第113行）添加字段：
```python
total_tokens: int = 0
total_cost: float = 0.0
total_duration_ms: int = 0
```

### 3. 修改 orchestrator.py 的 run()

开头记录基线：
```python
tokens_before = llm_client._total_tokens
cost_before = llm_client._total_cost
```

返回 AgentResponse 时填充：
```python
total_tokens=llm_client._total_tokens - tokens_before,
total_cost=round(llm_client._total_cost - cost_before, 4),
total_duration_ms=int((time.time() - start_time) * 1000),
```

### 4. 修改 api_schemas.py 的 QueryResponse（第74行）

添加：
```python
total_tokens: int = 0
total_cost: float = 0.0
total_duration_ms: int = 0
```

在 api/v1/query.py 的 query endpoint 中填充这三个字段（从 result 取）。

### 5. orchestrator.py 集成 SpanTracer

在 run() 开头创建 tracer = SpanTracer()，每个 tool 调用包裹：
```python
with tracer.span(f"tool:{step.tool}", {"step_id": step.step_id}):
    result = await tool_registry.execute(step.tool, step.input_params)
```
synthesis 和 validation 也各包一个 span。

### 6. admin.py 添加 metrics 端点

```python
@router.get("/metrics")
async def get_metrics() -> dict:
    from evograph.llm.client import llm_client
    return llm_client.get_stats()
```

### 7. 前端 QueryConsole.tsx

回答气泡下方显示：
"本次推理：{steps}步 | {duration}ms | {tokens} tokens | ¥{cost}"

验证：`python -m ruff check src --select E9` 通过。
```

---

## 第四轮：Session Memory 持久化

```
### 1. 创建 src/evograph/memory/__init__.py（空）

### 2. 创建 src/evograph/memory/session_store.py

```python
"""Redis-backed session memory for multi-turn dialogue."""
import json
import time
from evograph.storage.redis_cache import redis_client

SESSION_TTL = 7200  # 2小时

class SessionMemory:
    @staticmethod
    async def add(session_id: str, entry: dict) -> None:
        key = f"session:{session_id}:memory"
        entry["timestamp"] = time.time()
        await redis_client.client.rpush(key, json.dumps(entry, default=str))
        await redis_client.client.expire(key, SESSION_TTL)

    @staticmethod
    async def get_history(session_id: str, limit: int = 10) -> list[dict]:
        key = f"session:{session_id}:memory"
        raw = await redis_client.client.lrange(key, -limit, -1)
        return [json.loads(item) for item in raw]

    @staticmethod
    async def clear(session_id: str) -> None:
        await redis_client.client.delete(f"session:{session_id}:memory")

session_memory = SessionMemory()
```

### 3. 修改 orchestrator.py

run() 方法中：
- 开头：如有 session_id，调 session_memory.get_history(session_id) 获取历史
- 将历史格式化注入 SYNTHESIS_PROMPT（在 Evidence 段前加 "对话历史:\n{history}"）
- 结尾：存 {question, answer, entities} 到 session memory

### 4. SYNTHESIS_PROMPT 添加段落

在现有 "Evidence gathered..." 前插入：
```
对话历史（同一session）：
{conversation_history}
```

### 5. 前端 QueryConsole.tsx

- useState 生成 sessionId = crypto.randomUUID()
- POST body 带 session_id
- 添加"清空对话"按钮 → 重置 sessionId + 清空 messages

### 6. 确认 api_schemas.py

QueryRequest 已有 `session_id: str | None = None`（第49行），无需修改。

验证多轮：第二次提问时 Agent 回答应引用第一次对话的实体。
```

---

## 第五轮：人机协同 — 冲突阻断确认

```
### 1. 修改 merger.py 第63-69行

当前代码：检测冲突后仍执行 _create_relation。改为：
```python
conflicts = await conflict_detector.detect_conflicts(graph_rel)
if conflicts:
    stats["conflicts_detected"] += len(conflicts)
    for conflict in conflicts:
        await self._store_conflict(conflict)
    await self._create_pending_relation(graph_rel)
    logger.warning("relation_pending_review", source=graph_rel.source_id, target=graph_rel.target_id)
else:
    await self._create_relation(graph_rel)
    stats["relations_created"] += 1
```

添加 _create_pending_relation — 同 _create_relation 但 is_active=false, status='pending_review'。

### 2. 修改 api/v1/conflicts.py resolve endpoint（第62-76行）

当前只改状态。改为按 resolution 执行不同逻辑：

ConflictResolveRequest 已有 resolution + note 字段（api_schemas.py 第116-118行），
将 resolution 选项改为："accept_new" | "keep_existing" | "keep_both"

resolve endpoint 逻辑：
- accept_new: pending_review关系设 is_active=true，旧冲突关系设 is_active=false
- keep_existing: 删除 pending_review 关系
- keep_both: 两者都 is_active=true
- 更新 Conflict 节点 status='resolved'

### 3. SYNTHESIS_PROMPT 添加指令

"如果证据中有 pending_review 标记的信息，用 ⚠️ 标注并说明'此信息尚待人工确认'。"

### 4. tools/registry.py

_graph_query 和 _hybrid_search 返回结果保留 is_active 字段。

### 5. ConflictDashboard.tsx

每个冲突卡片添加三按钮：
- "采纳新信息" → POST resolve body={resolution:"accept_new"}
- "保留原有" → {resolution:"keep_existing"}
- "两者并存" → {resolution:"keep_both"}

添加"待处理"/"已处理" tab 切换。

验证：ruff check + npm run build 通过。
```

---

## 第六轮：测试 + CI

```
### 1. 单元测试（全部 mock 外部依赖）

tests/unit/test_planner.py:
- mock llm_client.chat_json 返回合法JSON plan
- 测试 QueryPlanner.plan() 正确解析 intent + steps
- 测试 LLM返回非法JSON时的 fallback

tests/unit/test_orchestrator.py:
- mock tool_registry.execute + llm_client.chat_json
- 测试完整 run() 循环：plan→execute→synthesize→validate→return
- 测试 validation 失败时 re-plan
- 验证 AgentResponse 包含 total_tokens（第三轮新增字段）

tests/unit/test_hybrid_retrieval.py:
- 直接测试 HybridRetriever._reciprocal_rank_fusion（纯计算）
- 测试 graph entity boost
- 测试空结果集

tests/unit/test_session_memory.py:
- mock redis_client
- 测试 add / get_history / clear

tests/unit/test_merger.py:
- mock neo4j_client + conflict_detector
- 测试有冲突 → pending_review 路径
- 测试无冲突 → 直接写入

### 2. .github/workflows/ci.yml

```yaml
name: CI
on: [push, pull_request]
jobs:
  backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - run: pip install -e ".[dev]"
      - run: python -m ruff check src tests
      - run: python -m pytest tests/unit -q --tb=short
  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: cd frontend && npm ci && npm run build
```

### 3. 确保 pytest tests/unit -q 全绿

import 问题就修，不跳过。
```

---

## 第七轮：Git提交 + Issue

```
分成独立 commit，每个能独立通过 ruff check：

1. "feat(frontend): 界面中文本地化 + 百年孤独demo数据"
2. "feat(demo): 添加百年孤独演示文档和seed脚本"
3. "feat(observability): LLM调用token统计和成本追踪"
4. "feat(memory): Redis-backed session memory for multi-turn"
5. "feat(safety): 知识冲突人工确认阻断机制"
6. "test: 补充核心模块单元测试"
7. "ci: 添加GitHub Actions CI workflow"

GitHub Issue（gh issue create）：
- "前端本地化：支持中文界面" — commit 1 closes
- "准备演示数据集验证端到端流程" — commit 2 closes
- "LLM调用缺少token统计和成本追踪" — commit 3 closes
- "多轮对话：session memory持久化" — commit 4 closes
- "冲突检测后缺少人工确认机制" — commit 5 closes
- "测试覆盖不足" — commit 6 closes

commit message 用 "closes #N" 关联。
```

---

## 使用说明

1. **每轮单独一个对话**，开头贴"背景"段 + 该轮提示词
2. **严格按顺序**：第3-5轮修改前几轮的文件
3. 每轮验证：`python -m ruff check src --select E9` + `cd frontend && npm run build`
4. 第六轮后验证：`pytest tests/unit -q` 全绿
5. 全部完成预计 4-5 小时
6. **完成后回来**，帮你：梳理面试话术、模拟追问、确认能讲清每个改动的 why

---

## 面试话术要点

| 改造点 | 面试时怎么讲 |
|--------|-------------|
| 百年孤独数据集 | "选它是因为七代同名人物是实体消歧极端case，密集时间线压测冲突检测" |
| Token统计 | "生产环境必须做成本可观测，我在client层做了per-call统计，request级累计差值算单次开销" |
| Session Memory | "用Redis list + TTL实现，不用数据库是因为对话记忆是热数据、有过期语义、不需事务" |
| 冲突阻断 | "这是human-in-the-loop设计——不确定的事实不进active图谱，保证推理链路基于已确认知识" |
| SpanTracer集成 | "每个tool调用有span，能看到推理瓶颈在哪步，生产可替换为OTLP exporter" |
| RRF融合 | "graph entity boost让图谱结构信息提升相关chunk排名，解决纯向量检索忽略结构关系的问题" |
