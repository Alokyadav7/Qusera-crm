'use client'

import { useState, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, Download, X, Loader2, Info } from 'lucide-react'
import Papa from 'papaparse'
import { toast } from 'sonner'

interface ImportResult { imported: number; skipped: number; errors: string[] }
interface CSVImportModalProps { open: boolean; onClose: () => void; onImported: () => void }

const TEMPLATE_HEADERS = ['full_name','phone_number','email','company','city','state','status','buying_intent','estimated_budget','gstin','pan_number','source']
const SAMPLE_ROWS = [
  ['Rajesh Kumar','+91 98765 43210','rajesh@sharma.com','Sharma Enterprises','Mumbai','Maharashtra','new','high','500000','27AABCS1429B1Z1','ABCDE1234F','referral'],
  ['Priya Sharma','+91 87654 32109','priya@techco.in','TechCo Solutions','Delhi','Delhi','contacted','medium','250000','','PQRST5678G','website'],
]

export function CSVImportModal({ open, onClose, onImported }: CSVImportModalProps) {
  const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'done'>('upload')
  const [rows, setRows] = useState<Record<string, string>[]>([])
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const downloadTemplate = () => {
    const csv = [TEMPLATE_HEADERS.join(','), ...SAMPLE_ROWS.map(r => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'orbitcrm-template.csv' })
    a.click()
  }

  const parseFile = useCallback((file: File) => {
    if (!file.name.endsWith('.csv')) { toast.error('Please upload a CSV file'); return }
    Papa.parse<Record<string, string>>(file, {
      header: true, skipEmptyLines: true,
      complete: (r) => {
        const parsed = r.data
        if (!parsed.length || !parsed[0].full_name) { toast.error('CSV must have a full_name column'); return }
        setRows(parsed); setStep('preview')
      },
      error: (e) => toast.error('Parse error: ' + e.message),
    })
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) parseFile(file)
  }, [parseFile])

  const handleImport = async () => {
    setStep('importing'); setProgress(10)
    const interval = setInterval(() => setProgress(p => Math.min(p + 10, 85)), 400)
    try {
      const res = await fetch('/api/leads/import', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows }),
      })
      clearInterval(interval); setProgress(100)
      const data = await res.json()
      if (data.success) { setResult(data); setStep('done') }
      else { toast.error('Import failed: ' + data.error); setStep('preview') }
    } catch (err: any) { clearInterval(interval); toast.error(err.message); setStep('preview') }
  }

  const handleClose = () => {
    if (result?.imported) onImported()
    setStep('upload'); setRows([]); setResult(null); setProgress(0); onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><FileSpreadsheet className="size-5 text-primary" />Import Leads from CSV</DialogTitle>
          <DialogDescription>Upload your spreadsheet to bulk-import leads into OrbitCRM</DialogDescription>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-4">
            <div
              className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}`}
              onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="size-10 text-muted-foreground/50 mx-auto mb-3" />
              <p className="font-semibold">Drop your CSV file here or click to browse</p>
              <p className="text-xs text-muted-foreground mt-2">Supports up to 10,000 rows</p>
              <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={e => e.target.files?.[0] && parseFile(e.target.files[0])} />
            </div>
            <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
              <Info className="size-4 shrink-0" />Required: <strong>full_name</strong>. Optional: phone_number, email, company, city, state, status, buying_intent, estimated_budget
            </div>
            <Button variant="outline" className="w-full" onClick={downloadTemplate}>
              <Download className="size-4 mr-2" />Download Sample Template
            </Button>
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200"><CheckCircle2 className="size-3 mr-1" />{rows.length} rows ready</Badge>
              <Button variant="ghost" size="sm" onClick={() => { setStep('upload'); setRows([]) }}><X className="size-4 mr-1" />Change file</Button>
            </div>
            <div className="border rounded-lg overflow-auto max-h-52">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>{Object.keys(rows[0] || {}).slice(0, 6).map(h => <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {rows.slice(0, 8).map((row, i) => (
                    <tr key={i} className="border-t hover:bg-muted/30">
                      {Object.values(row).slice(0, 6).map((v, j) => <td key={j} className="px-3 py-1.5 truncate max-w-[120px]">{String(v)}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length > 8 && <p className="text-center text-xs text-muted-foreground py-2">+{rows.length - 8} more rows</p>}
            </div>
          </div>
        )}

        {step === 'importing' && (
          <div className="py-8 space-y-4 text-center">
            <Loader2 className="size-12 animate-spin text-primary mx-auto" />
            <div><p className="font-semibold">Importing {rows.length} leads…</p><p className="text-sm text-muted-foreground mt-1">Do not close this window</p></div>
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground">{progress}% complete</p>
          </div>
        )}

        {step === 'done' && result && (
          <div className="py-6 space-y-4 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-emerald-100 mx-auto"><CheckCircle2 className="size-8 text-emerald-600" /></div>
            <div><h3 className="text-xl font-bold">Import Complete!</h3><p className="text-muted-foreground mt-1">Your leads have been added</p></div>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-emerald-50 rounded-xl p-3"><p className="text-2xl font-bold text-emerald-700">{result.imported}</p><p className="text-xs text-emerald-600">Imported</p></div>
              <div className="bg-amber-50 rounded-xl p-3"><p className="text-2xl font-bold text-amber-700">{result.skipped}</p><p className="text-xs text-amber-600">Skipped</p></div>
              <div className="bg-blue-50 rounded-xl p-3"><p className="text-2xl font-bold text-blue-700">{result.imported + result.skipped}</p><p className="text-xs text-blue-600">Total</p></div>
            </div>
            {result.errors.length > 0 && (
              <div className="text-left bg-red-50 rounded-lg p-3 space-y-1">
                <p className="text-xs font-semibold text-red-700 flex items-center gap-1"><AlertTriangle className="size-3" />Skipped rows:</p>
                {result.errors.map((e, i) => <p key={i} className="text-xs text-red-600">{e}</p>)}
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {step === 'preview' && <><Button variant="outline" onClick={handleClose}>Cancel</Button><Button onClick={handleImport}><Upload className="size-4 mr-2" />Import {rows.length} Leads</Button></>}
          {step === 'done' && <Button onClick={handleClose} className="w-full"><CheckCircle2 className="size-4 mr-2" />View Leads</Button>}
          {step === 'upload' && <Button variant="outline" onClick={handleClose}>Cancel</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
