import { useState } from 'react'
import { Clock, Play, ChevronLeft, ChevronRight } from 'lucide-react'

interface TimelineEvent {
  timestamp: string
  type: 'entity_created' | 'relation_added' | 'relation_expired' | 'conflict_detected'
  description: string
}

const DEMO_EVENTS: TimelineEvent[] = [
  { timestamp: '2024-01-15', type: 'entity_created', description: '实体「何塞·阿尔卡蒂奥·布恩迪亚」创建' },
  { timestamp: '2024-01-15', type: 'relation_added', description: '何塞 --[FOUNDED]--> 马孔多' },
  { timestamp: '2024-01-16', type: 'entity_created', description: '实体「奥雷里亚诺·布恩迪亚上校」创建' },
  { timestamp: '2024-01-16', type: 'relation_added', description: '奥雷里亚诺 --[SON_OF]--> 何塞' },
  { timestamp: '2024-01-17', type: 'relation_added', description: '香蕉公司 --[LOCATED_IN]--> 马孔多' },
  { timestamp: '2024-01-18', type: 'conflict_detected', description: '时间冲突：马孔多建镇日期' },
  { timestamp: '2024-01-18', type: 'relation_expired', description: '何塞 --[LEADER_OF]--> 马孔多远征队（已过期）' },
]

const EVENT_COLORS: Record<string, string> = {
  entity_created: 'bg-green-500',
  relation_added: 'bg-blue-500',
  relation_expired: 'bg-gray-400',
  conflict_detected: 'bg-red-500',
}

export default function Timeline() {
  const [sliderValue, setSliderValue] = useState(100)
  const [events] = useState<TimelineEvent[]>(DEMO_EVENTS)

  const visibleEvents = events.slice(0, Math.ceil((sliderValue / 100) * events.length))

  return (
    <div className="h-full flex flex-col">
      <header className="p-4 border-b bg-white">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Clock className="w-5 h-5 text-purple-500" />
          时间演化
        </h2>
        <p className="text-sm text-gray-500">查看知识图谱的演化历程</p>
      </header>

      <div className="p-6 space-y-6">
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-4 mb-4">
            <button className="p-1 hover:bg-gray-100 rounded">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex-1">
              <input
                type="range"
                min="0"
                max="100"
                value={sliderValue}
                onChange={(e) => setSliderValue(Number(e.target.value))}
                className="w-full accent-purple-600"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>2024-01-15</span>
                <span>2024-01-18</span>
              </div>
            </div>
            <button className="p-1 hover:bg-gray-100 rounded">
              <ChevronRight className="w-4 h-4" />
            </button>
            <button className="p-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200">
              <Play className="w-4 h-4" />
            </button>
          </div>

          <div className="flex gap-4 text-xs">
            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500" /> 实体创建</div>
            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500" /> 关系添加</div>
            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-gray-400" /> 关系过期</div>
            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500" /> 冲突检测</div>
          </div>
        </div>

        <div className="bg-white rounded-lg border p-4">
          <h3 className="font-medium mb-4">演化事件</h3>
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
            <div className="space-y-4">
              {visibleEvents.map((event, i) => (
                <div key={i} className="flex items-start gap-4 relative">
                  <div className={`w-3 h-3 rounded-full ${EVENT_COLORS[event.type]} ring-4 ring-white relative z-10 mt-1`} />
                  <div className="flex-1">
                    <p className="text-sm">{event.description}</p>
                    <p className="text-xs text-gray-400">{event.timestamp}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border p-4">
          <h3 className="font-medium mb-3">图谱快照对比</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-gray-50 rounded">
              <p className="text-xs font-medium text-gray-500 mb-2">之前 (2024-01-15)</p>
              <p className="text-sm">3 个实体，2 个关系</p>
            </div>
            <div className="p-3 bg-gray-50 rounded">
              <p className="text-xs font-medium text-gray-500 mb-2">之后 (2024-01-18)</p>
              <p className="text-sm">8 个实体，7 个关系，1 个冲突</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
