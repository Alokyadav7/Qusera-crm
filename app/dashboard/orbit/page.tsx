'use client'

import { useState, useCallback } from 'react'
import { Users, Kanban, BarChart3, Activity } from 'lucide-react'
import { CRMHeader } from '@/components/crm/crm-header'
import { ContactsTable } from '@/components/crm/contacts-table'
import { PipelineKanban } from '@/components/crm/pipeline-kanban'
import { AnalyticsDashboard } from '@/components/crm/analytics-dashboard'
import { ActivityFeed } from '@/components/crm/activity-feed'
import { AIAssistantPanel } from '@/components/crm/ai-assistant-panel'
import { useRealtimeLeads } from '@/hooks/use-realtime-leads'
import { useRealtimeInteractions } from '@/hooks/use-realtime-interactions'

type Tab = 'contacts' | 'pipeline' | 'analytics' | 'activity'

const TABS = [
  { id:'contacts' as Tab,  label:'Contacts',  icon:Users },
  { id:'pipeline' as Tab,  label:'Pipeline',  icon:Kanban },
  { id:'analytics' as Tab, label:'Analytics', icon:BarChart3 },
  { id:'activity' as Tab,  label:'Activity',  icon:Activity },
]

export default function OrbitCRMPage() {
  const [activeTab, setActiveTab] = useState<Tab>('contacts')
  const [aiContext, setAiContext] = useState('')
  const [pendingPrompt, setPendingPrompt] = useState('')
  const [aiOpen, setAiOpen] = useState(false)

  // Real-time data from Supabase
  const { leads, isLoading: leadsLoading, refetch: refetchLeads, updateLeadStatus } = useRealtimeLeads()
  const { interactions, isLoading: interactionsLoading } = useRealtimeInteractions()

  const handleAIAction = useCallback((prompt: string, context: string) => {
    setAiContext(context)
    setPendingPrompt(prompt)
    setAiOpen(true)
  }, [])

  return (
    <div className="flex flex-col min-h-screen">
      <CRMHeader
        title="OrbitCRM"
        subtitle="AI-powered sales intelligence — click any element to get AI insights"
      />

      <main className="flex-1 p-4 md:p-6 md:pt-8 space-y-6 max-w-[1600px] mx-auto w-full relative">
        <div className="absolute right-1/4 top-10 size-[500px] bg-foreground/5 blur-[120px] -z-10 rounded-full animate-float" />
        <div className="absolute left-1/4 bottom-10 size-[400px] bg-foreground/5 blur-[100px] -z-10 rounded-full animate-float delay-500" />
        <div className="fixed inset-0 pointer-events-none bg-[url('/noise.png')] opacity-[0.015] mix-blend-overlay -z-20" />

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 glass-ultra rounded-full p-1.5 w-fit animate-fade-in-up mx-auto md:mx-0 relative z-10">
          {TABS.map(tab => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-500 ${
                  isActive ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}>
                {isActive && (
                  <div className="absolute inset-0 bg-primary rounded-full shadow-md shadow-foreground/10 -z-10 animate-fade-in" />
                )}
                <Icon className={`size-4 ${isActive ? 'animate-pulse-glow' : ''}`} />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            )
          })}
        </div>

        {/* Tab Content */}
        {activeTab === 'contacts' && (
          <div className="animate-fade-in-up delay-100">
            <ContactsTable
              leads={leads}
              isLoading={leadsLoading}
              onRefresh={refetchLeads}
              onAIAction={handleAIAction}
            />
          </div>
        )}
        {activeTab === 'pipeline' && (
          <div className="overflow-x-auto animate-fade-in-up delay-100">
            <PipelineKanban
              leads={leads}
              isLoading={leadsLoading}
              onUpdateLeadStatus={updateLeadStatus}
              onAIAction={handleAIAction}
            />
          </div>
        )}
        {activeTab === 'analytics' && (
          <div className="animate-fade-in-up delay-100">
            <AnalyticsDashboard
              leads={leads}
              interactions={interactions}
              isLoading={leadsLoading}
              onRefresh={refetchLeads}
              onAIAction={handleAIAction}
            />
          </div>
        )}
        {activeTab === 'activity' && (
          <div className="animate-fade-in-up delay-100">
            <ActivityFeed
              interactions={interactions}
              isLoading={interactionsLoading}
              onAIAction={handleAIAction}
            />
          </div>
        )}
      </main>

      <AIAssistantPanel
        context={`User is on the ${activeTab} tab. ${aiContext}`}
        pendingPrompt={pendingPrompt}
        onPromptConsumed={() => setPendingPrompt('')}
        forceOpen={aiOpen}
        onOpenChange={setAiOpen}
      />
    </div>
  )
}
