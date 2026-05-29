'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CRMHeader } from '@/components/crm/crm-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { BarChart as BarChartIcon, LineChart as LineChartIcon, PieChart as PieChartIcon, Plus, Save, Trash2, Calendar, FileSpreadsheet } from 'lucide-react'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export interface SavedReport {
  id: string
  name: string
  config: {
    chartType: 'bar' | 'line' | 'pie'
    dataSource: 'leads' | 'deals'
    groupBy: string
  }
  created_at: string
}

export function ReportsPageClient({
  initialReports,
  leads,
  deals
}: {
  initialReports: SavedReport[]
  leads: any[]
  deals: any[]
}) {
  const [reports, setReports] = useState<SavedReport[]>(initialReports)
  const [mounted, setMounted] = useState(false)
  const [chartType, setChartType] = useState<'bar' | 'line' | 'pie'>('bar')
  const [dataSource, setDataSource] = useState<'leads' | 'deals'>('leads')
  const [groupBy, setGroupBy] = useState<string>('status')

  const [saveOpen, setSaveOpen] = useState(false)
  const [reportName, setReportName] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setMounted(true)
    
    const supabase = createClient()
    const channel = supabase
      .channel('saved-reports-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'saved_reports' }, payload => {
        if (payload.eventType === 'INSERT') {
          setReports(prev => [payload.new as SavedReport, ...prev])
        } else if (payload.eventType === 'DELETE') {
          setReports(prev => prev.filter(r => r.id !== (payload.old as any).id))
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  // Auto adjust groupBy based on datasource
  useEffect(() => {
    if (dataSource === 'leads') {
      setGroupBy('status')
    } else {
      setGroupBy('stage')
    }
  }, [dataSource])

  const processChartData = () => {
    const data = dataSource === 'leads' ? leads : deals
    const counts: Record<string, { name: string; count: number; totalValue: number }> = {}

    data.forEach(item => {
      let key = ''
      if (dataSource === 'leads') {
        if (groupBy === 'status') key = item.status || 'New'
        else if (groupBy === 'buying_intent') key = item.buying_intent || 'Medium'
        else if (groupBy === 'source') key = item.source || 'Direct'
      } else {
        key = item.stage || 'Prospect'
      }

      const val = parseFloat(item.deal_value || item.estimated_budget || item.value || 0)

      if (!counts[key]) {
        counts[key] = { name: key.toUpperCase().replace(/_/g, ' '), count: 0, totalValue: 0 }
      }
      counts[key].count += 1
      counts[key].totalValue += val
    })

    return Object.values(counts)
  }

  const chartData = processChartData()
  const COLORS = ['#000000', '#333333', '#666666', '#999999', '#cccccc', '#e5e5e5']

  const handleSaveReport = async () => {
    if (!reportName.trim()) {
      toast.error('Please enter a name for the report')
      return
    }
    setSaving(true)
    const supabase = createClient()
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const uac = await (supabase as any).from('user_active_company').select('company_id').eq('user_id', user!.id).single()

      const { error } = await (supabase as any).from('saved_reports').insert({
        company_id: uac.data.company_id,
        name: reportName.trim(),
        config: { chartType, dataSource, groupBy },
        created_by: user!.id
      })

      if (error) throw error
      toast.success('Report config saved successfully')
      setSaveOpen(false)
      setReportName('')
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteReport = async (id: string) => {
    if (!confirm('Delete this report preset?')) return
    const supabase = createClient()
    const { error } = await supabase.from('saved_reports').delete().eq('id', id)
    if (error) toast.error('Failed to delete report')
    else toast.success('Report config deleted')
  }

  const loadReport = (r: SavedReport) => {
    setChartType(r.config.chartType)
    setDataSource(r.config.dataSource)
    setGroupBy(r.config.groupBy)
    toast.success(`Loaded report preset: ${r.name}`)
  }

  if (!mounted) return null

  return (
    <div className="flex flex-col min-h-screen">
      <CRMHeader title="Custom Reports Builder" subtitle="Design and save dynamic organizational charts and analytics presets" />
      
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 border-t">
        {/* Sidebar Controls */}
        <div className="lg:col-span-1 border-r bg-muted/15 p-5 space-y-6">
          <div className="space-y-4">
            <h3 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">Visual Setup</h3>
            
            <div className="space-y-1.5">
              <Label>Data Source</Label>
              <Select value={dataSource} onValueChange={(v: any) => setDataSource(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="leads">CRM Leads Data</SelectItem>
                  <SelectItem value="deals">Deals Pipeline</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Group Metric By</Label>
              {dataSource === 'leads' ? (
                <Select value={groupBy} onValueChange={setGroupBy}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="status">Lead Status</SelectItem>
                    <SelectItem value="buying_intent">Intent Level</SelectItem>
                    <SelectItem value="source">Lead Source</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Select value={groupBy} onValueChange={setGroupBy}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stage">Pipeline Stage</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Chart Visual Type</Label>
              <div className="grid grid-cols-3 gap-2">
                <Button 
                  variant={chartType === 'bar' ? 'default' : 'outline'} 
                  size="sm"
                  onClick={() => setChartType('bar')}
                  className="flex flex-col items-center justify-center h-16 py-2 gap-1"
                >
                  <BarChartIcon className="size-4" />
                  <span className="text-[10px]">Bar</span>
                </Button>
                <Button 
                  variant={chartType === 'line' ? 'default' : 'outline'} 
                  size="sm"
                  onClick={() => setChartType('line')}
                  className="flex flex-col items-center justify-center h-16 py-2 gap-1"
                >
                  <LineChartIcon className="size-4" />
                  <span className="text-[10px]">Line</span>
                </Button>
                <Button 
                  variant={chartType === 'pie' ? 'default' : 'outline'} 
                  size="sm"
                  onClick={() => setChartType('pie')}
                  className="flex flex-col items-center justify-center h-16 py-2 gap-1"
                >
                  <PieChartIcon className="size-4" />
                  <span className="text-[10px]">Pie</span>
                </Button>
              </div>
            </div>
          </div>

          <div className="border-t pt-4 space-y-3">
            <Button className="w-full flex items-center justify-center gap-1.5" size="sm" onClick={() => setSaveOpen(true)}>
              <Save className="size-4" /> Save Configuration
            </Button>
          </div>

          {/* Saved Reports List */}
          <div className="border-t pt-4 space-y-3">
            <h3 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">Saved Report Presets</h3>
            {reports.length === 0 ? (
              <p className="text-xs text-muted-foreground">No saved report presets found.</p>
            ) : (
              <div className="space-y-2 max-h-[220px] overflow-y-auto">
                {reports.map(r => (
                  <div key={r.id} className="flex items-center justify-between p-2 rounded bg-muted/40 hover:bg-muted transition-colors text-xs">
                    <button className="flex-1 text-left font-medium truncate mr-2" onClick={() => loadReport(r)}>
                      {r.name}
                    </button>
                    <button className="text-muted-foreground hover:text-destructive" onClick={() => handleDeleteReport(r.id)}>
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Live Visual Render Canvas */}
        <div className="lg:col-span-3 p-6 flex flex-col bg-card">
          <div className="flex-1 border rounded-xl bg-muted/5 flex items-center justify-center min-h-[400px] p-6">
            <div className="w-full h-full max-w-2xl flex flex-col justify-between">
              
              <div className="text-center mb-6">
                <h4 className="font-semibold text-base capitalize">
                  {dataSource} Distribution by {groupBy.replace(/_/g, ' ')}
                </h4>
                <p className="text-xs text-muted-foreground">Generated live from operational CRM metrics</p>
              </div>

              {chartData.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-sm text-muted-foreground">
                  No data points found to visualize. Check your active Leads/Deals entries.
                </div>
              ) : (
                <div className="w-full h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    {chartType === 'bar' ? (
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                        <XAxis dataKey="name" stroke="#888888" fontSize={11} />
                        <YAxis stroke="#888888" fontSize={11} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#000000" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    ) : chartType === 'line' ? (
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                        <XAxis dataKey="name" stroke="#888888" fontSize={11} />
                        <YAxis stroke="#888888" fontSize={11} />
                        <Tooltip />
                        <Line type="monotone" dataKey="count" stroke="#000000" strokeWidth={2.5} activeDot={{ r: 6 }} />
                      </LineChart>
                    ) : (
                      <PieChart>
                        <Pie
                          data={chartData}
                          dataKey="count"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={2}
                        >
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    )}
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Save Config Modal */}
      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Save Report Configuration</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <Label>Report Title *</Label>
              <Input placeholder="e.g. Lead Status Overview" value={reportName} onChange={e => setReportName(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveReport} disabled={saving}>
              {saving ? 'Saving...' : 'Save Configuration'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
