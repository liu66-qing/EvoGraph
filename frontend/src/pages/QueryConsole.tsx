import { useState, useRef, useEffect } from 'react'
import { Send, Brain, ChevronRight, AlertCircle, RotateCcw } from 'lucide-react'
import { clsx } from 'clsx'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  confidence?: number
  reasoning?: ReasoningStep[]
  sources?: Source[]
  total_tokens?: number
  total_cost?: number
  total_duration_ms?: number
}

interface ReasoningStep {
  step_id: number
  action: string
  tool: string
  output_summary: string
  duration_ms: number
}

interface Source {
  document_title: string
  chunk_text: string
  confidence: number
}

export default function QueryConsole() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showReasoning, setShowReasoning] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState(() => crypto.randomUUID())
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: input }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setIsLoading(true)

    try {
      const res = await fetch('/api/v1/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: input, include_reasoning: true, session_id: sessionId }),
      })
      const data = await res.json()
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.answer,
        confidence: data.confidence,
        reasoning: data.reasoning_trace,
        sources: data.sources,
        total_tokens: data.total_tokens,
        total_cost: data.total_cost,
        total_duration_ms: data.total_duration_ms,
      }
      setMessages((prev) => [...prev, assistantMsg])
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: 'assistant', content: 'Error connecting to the agent. Make sure the backend is running.' },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="h-full flex flex-col">
      <header className="p-4 border-b bg-white flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Brain className="w-5 h-5 text-blue-500" />
            智能问答
          </h2>
          <p className="text-sm text-gray-500">基于知识图谱的多跳推理问答</p>
        </div>
        {messages.length > 0 && (
          <button
            onClick={() => { setMessages([]); setSessionId(crypto.randomUUID()) }}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            清空对话
          </button>
        )}
      </header>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 mt-20">
            <Brain className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg">向知识图谱提问</p>
            <div className="mt-4 space-y-2 text-sm">
              <p className="text-gray-500">试试：</p>
              <button onClick={() => setInput('布恩迪亚家族的创始人是谁？')} className="block mx-auto text-blue-500 hover:underline">"布恩迪亚家族的创始人是谁？"</button>
              <button onClick={() => setInput('奥雷里亚诺上校和马孔多有什么关系？')} className="block mx-auto text-blue-500 hover:underline">"奥雷里亚诺上校和马孔多有什么关系？"</button>
              <button onClick={() => setInput('香蕉公司进入马孔多后发生了什么？')} className="block mx-auto text-blue-500 hover:underline">"香蕉公司进入马孔多后发生了什么？"</button>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={clsx('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
            <div className={clsx(
              'max-w-2xl rounded-lg px-4 py-3',
              msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-white border shadow-sm'
            )}>
              <p className="whitespace-pre-wrap">{msg.content}</p>

              {msg.confidence !== undefined && (
                <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <div className={clsx(
                      'w-2 h-2 rounded-full',
                      msg.confidence > 0.7 ? 'bg-green-500' : msg.confidence > 0.4 ? 'bg-yellow-500' : 'bg-red-500'
                    )} />
                    置信度: {(msg.confidence * 100).toFixed(0)}%
                  </div>
                  {msg.reasoning && msg.reasoning.length > 0 && (
                    <button
                      onClick={() => setShowReasoning(showReasoning === msg.id ? null : msg.id)}
                      className="text-blue-500 hover:underline flex items-center gap-1"
                    >
                      <ChevronRight className={clsx('w-3 h-3 transition-transform', showReasoning === msg.id && 'rotate-90')} />
                      {msg.reasoning.length} 推理步骤
                    </button>
                  )}
                  {msg.total_tokens !== undefined && msg.total_tokens > 0 && (
                    <span className="text-gray-400">
                      | {msg.total_duration_ms}ms | {msg.total_tokens} tokens | ¥{msg.total_cost?.toFixed(4)}
                    </span>
                  )}
                </div>
              )}

              {showReasoning === msg.id && msg.reasoning && (
                <div className="mt-3 border-t pt-3 space-y-2">
                  {msg.reasoning.map((step) => (
                    <div key={step.step_id} className="flex items-start gap-2 text-xs">
                      <span className="bg-gray-100 px-1.5 py-0.5 rounded font-mono">{step.tool}</span>
                      <span className="text-gray-600">{step.action}</span>
                      <span className="text-gray-400 ml-auto">{step.duration_ms}ms</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border shadow-sm rounded-lg px-4 py-3 flex items-center gap-2">
              <div className="animate-pulse flex gap-1">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:0.1s]" />
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:0.2s]" />
              </div>
              <span className="text-sm text-gray-500">推理中...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t bg-white">
        <div className="flex gap-2 max-w-3xl mx-auto">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="输入你的问题..."
            className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  )
}
