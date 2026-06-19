import { useState, useCallback } from 'react'
import { Upload, FileText, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { clsx } from 'clsx'

interface Document {
  id: string
  filename: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  entity_count: number
  relation_count: number
}

export default function DocumentIngest() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [isDragging, setIsDragging] = useState(false)

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files)
    await uploadFiles(files)
  }, [])

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      await uploadFiles(Array.from(e.target.files))
    }
  }

  const uploadFiles = async (files: File[]) => {
    for (const file of files) {
      const tempDoc: Document = {
        id: Date.now().toString(),
        filename: file.name,
        status: 'pending',
        entity_count: 0,
        relation_count: 0,
      }
      setDocuments((prev) => [tempDoc, ...prev])

      try {
        const formData = new FormData()
        formData.append('file', file)
        const res = await fetch('/api/v1/documents', { method: 'POST', body: formData })
        const data = await res.json()
        setDocuments((prev) =>
          prev.map((d) => (d.id === tempDoc.id ? { ...d, id: data.id, status: 'processing' } : d))
        )
      } catch {
        setDocuments((prev) =>
          prev.map((d) => (d.id === tempDoc.id ? { ...d, status: 'failed' } : d))
        )
      }
    }
  }

  return (
    <div className="h-full flex flex-col">
      <header className="p-4 border-b bg-white">
        <h2 className="text-lg font-semibold">文档管理</h2>
        <p className="text-sm text-gray-500">上传文档抽取知识，演化知识图谱</p>
      </header>

      <div className="p-6 space-y-6">
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={clsx(
            'border-2 border-dashed rounded-xl p-12 text-center transition-colors',
            isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
          )}
        >
          <Upload className="w-10 h-10 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600 mb-2">拖拽文档到此处上传</p>
          <p className="text-sm text-gray-400 mb-4">支持 PDF、TXT、MD、HTML 格式</p>
          <label className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700">
            选择文件
            <input type="file" multiple accept=".pdf,.txt,.md,.html" onChange={handleFileSelect} className="hidden" />
          </label>
        </div>

        {documents.length > 0 && (
          <div>
            <h3 className="font-medium mb-3">处理队列</h3>
            <div className="space-y-2">
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-center gap-3 p-3 bg-white rounded-lg border">
                  <FileText className="w-5 h-5 text-gray-400" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{doc.filename}</p>
                    <p className="text-xs text-gray-500">
                      {doc.status === 'completed' && `${doc.entity_count} 个实体, ${doc.relation_count} 个关系`}
                      {doc.status === 'processing' && '正在抽取实体和关系...'}
                      {doc.status === 'pending' && '排队等待处理'}
                      {doc.status === 'failed' && '处理失败'}
                    </p>
                  </div>
                  <StatusIcon status={doc.status} />
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg border p-4">
          <h3 className="font-medium mb-3">知识演化流水线</h3>
          <div className="flex items-center gap-2 text-sm">
            {['导入', '抽取', '消歧', '冲突检测', '合并'].map((stage, i) => (
              <div key={stage} className="flex items-center gap-2">
                <div className="px-3 py-1 bg-gray-100 rounded text-gray-600">{stage}</div>
                {i < 4 && <span className="text-gray-300">→</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'completed': return <CheckCircle className="w-5 h-5 text-green-500" />
    case 'failed': return <XCircle className="w-5 h-5 text-red-500" />
    case 'processing': return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
    default: return <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
  }
}
