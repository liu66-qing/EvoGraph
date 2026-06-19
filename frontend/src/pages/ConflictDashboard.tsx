import { useState } from 'react'
import { AlertTriangle, CheckCircle, Eye } from 'lucide-react'
import { clsx } from 'clsx'

interface Conflict {
  id: string
  type: 'temporal_overlap' | 'logical_contradiction' | 'source_disagreement'
  status: 'open' | 'resolved' | 'dismissed'
  description: string
  fact_a: string
  fact_b: string
  detected_at: string
}

const DEMO_CONFLICTS: Conflict[] = [
  {
    id: '1',
    type: 'temporal_overlap',
    status: 'open',
    description: '马孔多建镇时间冲突',
    fact_a: '何塞·阿尔卡蒂奥·布恩迪亚建立马孔多（约1820年）',
    fact_b: '另一记载称马孔多建于1850年',
    detected_at: '2024-01-15',
  },
  {
    id: '2',
    type: 'source_disagreement',
    status: 'open',
    description: '同名人物消歧冲突',
    fact_a: '何塞·阿尔卡蒂奥（创始人，第一代）',
    fact_b: '何塞·阿尔卡蒂奥（长子，第二代）',
    detected_at: '2024-01-10',
  },
]

export default function ConflictDashboard() {
  const [conflicts, setConflicts] = useState<Conflict[]>(DEMO_CONFLICTS)
  const [selectedConflict, setSelectedConflict] = useState<Conflict | null>(null)
  const [tab, setTab] = useState<'open' | 'resolved'>('open')

  const filteredConflicts = conflicts.filter((c) =>
    tab === 'open' ? c.status === 'open' : c.status === 'resolved'
  )
  const openCount = conflicts.filter((c) => c.status === 'open').length

  const handleResolve = async (resolution: string) => {
    if (!selectedConflict) return
    try {
      await fetch(`/api/v1/conflicts/${selectedConflict.id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolution }),
      })
      setConflicts((prev) =>
        prev.map((c) => (c.id === selectedConflict.id ? { ...c, status: 'resolved' as const } : c))
      )
      setSelectedConflict(null)
    } catch { /* ignore */ }
  }

  return (
    <div className="h-full flex flex-col">
      <header className="p-4 border-b bg-white">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          知识冲突
        </h2>
        <p className="text-sm text-gray-500">
          {openCount} 个待处理冲突
        </p>
        <div className="mt-2 flex gap-2">
          <button
            onClick={() => setTab('open')}
            className={clsx('px-3 py-1 text-sm rounded', tab === 'open' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600')}
          >
            待处理
          </button>
          <button
            onClick={() => setTab('resolved')}
            className={clsx('px-3 py-1 text-sm rounded', tab === 'resolved' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600')}
          >
            已处理
          </button>
        </div>
      </header>

      <div className="flex-1 flex">
        <div className="w-1/2 border-r overflow-auto p-4 space-y-2">
          {filteredConflicts.map((conflict) => (
            <div
              key={conflict.id}
              onClick={() => setSelectedConflict(conflict)}
              className={clsx(
                'p-3 rounded-lg border cursor-pointer transition-colors',
                selectedConflict?.id === conflict.id ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'
              )}
            >
              <div className="flex items-center gap-2">
                <TypeBadge type={conflict.type} />
                <span className={clsx(
                  'text-xs px-1.5 py-0.5 rounded',
                  conflict.status === 'open' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                )}>
                  {conflict.status}
                </span>
              </div>
              <p className="text-sm mt-2">{conflict.description}</p>
              <p className="text-xs text-gray-400 mt-1">检测时间: {conflict.detected_at}</p>
            </div>
          ))}
        </div>

        <div className="w-1/2 p-4">
          {selectedConflict ? (
            <div>
              <h3 className="font-semibold mb-4">冲突证据</h3>
              <div className="space-y-4">
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs font-medium text-blue-700 mb-1">事实 A</p>
                  <p className="text-sm">{selectedConflict.fact_a}</p>
                </div>
                <div className="text-center text-gray-400 text-sm">vs</div>
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-xs font-medium text-amber-700 mb-1">事实 B</p>
                  <p className="text-sm">{selectedConflict.fact_b}</p>
                </div>
              </div>
              <div className="mt-6 flex gap-2">
                <button onClick={() => handleResolve('accept_new')} className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">采纳新信息</button>
                <button onClick={() => handleResolve('keep_existing')} className="px-3 py-1.5 bg-amber-600 text-white text-sm rounded hover:bg-amber-700">保留原有</button>
                <button onClick={() => handleResolve('keep_both')} className="px-3 py-1.5 border text-sm rounded hover:bg-gray-50">两者并存</button>
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-400 mt-20">
              <Eye className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>选择一个冲突查看详情</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function TypeBadge({ type }: { type: string }) {
  const labels: Record<string, string> = {
    temporal_overlap: '时间冲突',
    logical_contradiction: '逻辑矛盾',
    source_disagreement: '来源分歧',
  }
  const colors: Record<string, string> = {
    temporal_overlap: 'bg-purple-100 text-purple-700',
    logical_contradiction: 'bg-red-100 text-red-700',
    source_disagreement: 'bg-amber-100 text-amber-700',
  }
  return (
    <span className={clsx('text-xs px-1.5 py-0.5 rounded', colors[type] || 'bg-gray-100')}>
      {labels[type] || type}
    </span>
  )
}
