'use client'

import { useMemo } from 'react'
import { TrendingUp, TrendingDown, IndianRupee, Target, Calendar, Trophy, Sparkles, Loader2, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import type { Lead } from '@/hooks/use-realtime-leads'
import type { Interaction } from '@/hooks/use-realtime-interactions'

function fmt(v: number) {
  return v>=10000000?`₹${(v/10000000).toFixed(1)}Cr`:v>=100000?`₹${(v/100000).toFixed(1)}L`:`₹${(v/1000).toFixed(0)}K`
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const SOURCE_COLORS = ['#6366f1','#8b5cf6','#06b6d4','#10b981','#f59e0b','#ef4444','#ec4899']

interface AnalyticsDashboardProps {
  leads: Lead[]
  interactions: Interaction[]
  isLoading: boolean
  onRefresh: () => void
  onAIAction?: (prompt: string, context: string) => void
}

export function AnalyticsDashboard({ leads, interactions, isLoading, onRefresh, onAIAction }: AnalyticsDashboardProps) {
  const stats = useMemo(() => {
    const now = new Date()
    const thisMonth = now.getMonth()
    const thisYear = now.getFullYear()
    const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1
    const lastYear = thisMonth === 0 ? thisYear - 1 : thisYear

    const wonLeads = leads.filter(l => l.status === 'closed_won')
    const thisMonthWon = wonLeads.filter(l => {
      const d = new Date(l.updated_at)
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear
    })
    const lastMonthWon = wonLeads.filter(l => {
      const d = new Date(l.updated_at)
      return d.getMonth() === lastMonth && d.getFullYear() === lastYear
    })

    const mrr = thisMonthWon.reduce((s,l)=>s+(l.deal_value||0),0)
    const lastMrr = lastMonthWon.reduce((s,l)=>s+(l.deal_value||0),0)
    const mrrChange = lastMrr>0?Math.round(((mrr-lastMrr)/lastMrr)*100):0

    const wonCount = thisMonthWon.length
    const lastWonCount = lastMonthWon.length
    const wonChange = lastWonCount>0?Math.round(((wonCount-lastWonCount)/lastWonCount)*100):0

    const allDealValues = wonLeads.map(l=>l.deal_value||0).filter(v=>v>0)
    const avgDeal = allDealValues.length>0?Math.round(allDealValues.reduce((s,v)=>s+v,0)/allDealValues.length):0

    // Sales cycle = avg days from created_at to updated_at for closed_won
    const cycles = wonLeads.map(l=>Math.floor((new Date(l.updated_at).getTime()-new Date(l.created_at).getTime())/86400000)).filter(d=>d>0)
    const avgCycle = cycles.length>0?Math.round(cycles.reduce((s,v)=>s+v,0)/cycles.length):0

    return { mrr, mrrChange, wonCount, wonChange, avgDeal, avgCycle }
  }, [leads])

  // Build last 6 months revenue chart from real closed_won data
  const revenueData = useMemo(() => {
    const now = new Date()
    return Array.from({length:6},(_,i)=>{
      const d = new Date(now.getFullYear(), now.getMonth()-5+i, 1)
      const m = d.getMonth(), y = d.getFullYear()
      const revenue = leads
        .filter(l=>l.status==='closed_won')
        .filter(l=>{ const ld=new Date(l.updated_at); return ld.getMonth()===m&&ld.getFullYear()===y })
        .reduce((s,l)=>s+(l.deal_value||0),0)
      return { month: MONTHS[m], revenue }
    })
  }, [leads])

  // Source distribution from real leads
  const sourceData = useMemo(() => {
    const counts: Record<string,number> = {}
    leads.forEach(l=>{ const s=l.source||'Other'; counts[s]=(counts[s]||0)+1 })
    return Object.entries(counts)
      .sort((a,b)=>b[1]-a[1])
      .slice(0,6)
      .map(([name,value],i)=>({ name, value, color: SOURCE_COLORS[i%SOURCE_COLORS.length] }))
  }, [leads])

  const kpis = [
    { title:'Monthly Revenue', value:fmt(stats.mrr), change:stats.mrrChange, icon:IndianRupee, color:'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400', metricKey:'MRR' },
    { title:'Won Deals (Month)', value:`${stats.wonCount} deals`, change:stats.wonChange, icon:Trophy, color:'bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400', metricKey:'Won Deals' },
    { title:'Avg Deal Size', value:stats.avgDeal>0?fmt(stats.avgDeal):'No data', change:0, icon:Target, color:'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400', metricKey:'Average Deal Size' },
    { title:'Avg Sales Cycle', value:stats.avgCycle>0?`${stats.avgCycle} days`:'No data', change:0, icon:Calendar, color:'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400', metricKey:'Sales Cycle' },
  ]

  if (isLoading) return (
    <div className="flex items-center justify-center py-24 gap-2 text-muted-foreground">
      <Loader2 className="size-6 animate-spin" /> Loading analytics…
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Live data from Supabase · {leads.length} total leads · {leads.filter(l=>l.status==='closed_won').length} won</p>
        <Button variant="ghost" size="icon" className="size-8" onClick={onRefresh}>
          <RefreshCw className="size-3.5" />
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {kpis.map(kpi=>{
          const positive=kpi.change>=0
          const Icon=kpi.icon
          return (
            <Card key={kpi.title} className="cursor-pointer hover:-translate-y-0.5 hover:shadow-md transition-all group"
              onClick={()=>onAIAction?.(`Analyze the ${kpi.metricKey} which is currently ${kpi.value}${kpi.change!==0?` (${kpi.change>0?'+':''}${kpi.change}% vs last month)`:' (no month-on-month data yet)'}. What does this indicate and what are 3 actions to improve it?`, `Metric: ${kpi.metricKey} | Value: ${kpi.value} | Change: ${kpi.change}%`)}>
              <CardContent className="pt-5 pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground mb-0.5">{kpi.title}</p>
                    <p className="text-2xl font-bold tracking-tight">{kpi.value}</p>
                    {kpi.change!==0&&(
                      <div className={`flex items-center gap-1 mt-1.5 text-xs font-medium ${positive?'text-emerald-600':'text-red-500'}`}>
                        {positive?<TrendingUp className="size-3"/>:<TrendingDown className="size-3"/>}
                        {positive?'+':''}{kpi.change}% vs last month
                      </div>
                    )}
                  </div>
                  <div className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${kpi.color}`}>
                    <Icon className="size-5"/>
                  </div>
                </div>
                <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-[10px] text-primary">
                  <Sparkles className="size-2.5"/> Click for AI insight
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base">Revenue (Last 6 Months)</CardTitle>
            <CardDescription>Real closed deals from Supabase</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueData} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)"/>
                  <XAxis dataKey="month" tick={{fontSize:11}} axisLine={false} tickLine={false}/>
                  <YAxis tickFormatter={v=>`${(v/100000).toFixed(0)}L`} tick={{fontSize:11}} axisLine={false} tickLine={false}/>
                  <Tooltip formatter={(v:number)=>fmt(v)} contentStyle={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:'8px',fontSize:'12px'}}/>
                  <Bar dataKey="revenue" name="Revenue" fill="#6366f1" radius={[4,4,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Lead Sources</CardTitle>
            <CardDescription>Where your real leads come from</CardDescription>
          </CardHeader>
          <CardContent>
            {sourceData.length===0?(
              <div className="h-[180px] flex items-center justify-center text-sm text-muted-foreground">No source data yet</div>
            ):(
              <>
                <div className="h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={sourceData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={3} dataKey="value">
                        {sourceData.map((_,i)=><Cell key={i} fill={SOURCE_COLORS[i%SOURCE_COLORS.length]}/>)}
                      </Pie>
                      <Tooltip contentStyle={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:'8px',fontSize:'12px'}}/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-2">
                  {sourceData.map((s,i)=>(
                    <div key={s.name} className="flex items-center gap-2 text-xs">
                      <div className="size-2 rounded-full shrink-0" style={{backgroundColor:SOURCE_COLORS[i%SOURCE_COLORS.length]}}/>
                      <span className="text-muted-foreground truncate">{s.name}</span>
                      <span className="font-medium ml-auto">{s.value}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
