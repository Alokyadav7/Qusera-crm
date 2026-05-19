'use client'

import { useState, useCallback } from 'react'
import { Plus, Filter, Download, Upload, Search, LayoutGrid, List, Users, RefreshCw } from 'lucide-react'
import { CRMHeader } from '@/components/crm/crm-header'
import { LeadsTable } from '@/components/crm/leads-table'
import { LeadDetailPanel } from '@/components/crm/lead-detail-panel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { createLead } from './actions'
import { useRealtimeLeads } from '@/hooks/use-realtime-leads'
import type { Lead } from '@/hooks/use-realtime-leads'
import { CSVImportModal } from '@/components/crm/csv-import-modal'
import { toast } from 'sonner'

interface LeadsPageClientProps {
  initialLeads: Lead[]
}

export function LeadsPageClient({ initialLeads }: LeadsPageClientProps) {
  const { leads, refetch } = useRealtimeLeads(initialLeads)
  const displayLeads = leads
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [intentFilter, setIntentFilter] = useState('all')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isImportOpen, setIsImportOpen] = useState(false)

  const filteredLeads = displayLeads.filter(lead => {
    const matchesSearch = searchQuery === '' || 
      lead.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (lead.company?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (lead.phone_number?.includes(searchQuery)) ||
      (lead.email?.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter
    const matchesIntent = intentFilter === 'all' || lead.buying_intent === intentFilter
    return matchesSearch && matchesStatus && matchesIntent
  })

  const hotLeads = displayLeads.filter(l => l.buying_intent === 'high').length
  const pendingVerification = displayLeads.filter(l => l.gst_status === 'pending' || l.pan_status === 'pending').length
  const newToday = displayLeads.filter(l => new Date(l.created_at).toDateString() === new Date().toDateString()).length
  const highValue = displayLeads.filter(l => l.estimated_budget && l.estimated_budget >= 300000).length

  const handleAddLead = async (formData: FormData) => {
    setIsSubmitting(true)
    try {
      const newLead = await createLead(formData)
      if (newLead) {
        setIsAddDialogOpen(false)
        refetch()
      }
    } catch (error) {
      console.error('Failed to create lead:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      <CRMHeader 
        title="Leads" 
        subtitle={leads.length > 0 
          ? `${leads.length} total leads • ${hotLeads} hot leads`
          : 'No leads yet - add your first lead to get started'
        }
      />
      
      <main className="flex-1 p-4 md:p-6 space-y-4">
        {/* Filters & Actions Bar */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div className="relative flex-1 w-full sm:max-w-sm">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input 
                type="search" 
                placeholder="Search by name, company, phone..." 
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="flex items-center border rounded-lg p-0.5">
                <Button 
                  variant={viewMode === 'table' ? 'secondary' : 'ghost'} 
                  size="sm"
                  className="h-7"
                  onClick={() => setViewMode('table')}
                >
                  <List className="size-4" />
                </Button>
                <Button 
                  variant={viewMode === 'kanban' ? 'secondary' : 'ghost'} 
                  size="sm"
                  className="h-7"
                  onClick={() => setViewMode('kanban')}
                >
                  <LayoutGrid className="size-4" />
                </Button>
              </div>
              <Button variant="outline" size="sm" className="hidden sm:flex" onClick={() => setIsImportOpen(true)}>
                <Upload className="size-4 mr-1" />
                Import
              </Button>
              <Button variant="outline" size="sm" className="hidden sm:flex" onClick={async () => {
                toast.loading('Preparing export…')
                const res = await fetch('/api/leads/export')
                if (res.ok) {
                  const blob = await res.blob()
                  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'orbitcrm-leads.csv' })
                  a.click()
                  toast.dismiss(); toast.success('Export downloaded!')
                } else { toast.dismiss(); toast.error('Export failed') }
              }}>
                <Download className="size-4 mr-1" />
                Export
              </Button>
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="size-4 mr-1" />
                    <span className="hidden xs:inline">Add Lead</span>
                    <span className="xs:hidden">Add</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Add New Lead</DialogTitle>
                    <DialogDescription>
                      Enter the lead details below. You can add more information later.
                    </DialogDescription>
                  </DialogHeader>
                  <form action={handleAddLead}>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="full_name">Full Name *</Label>
                        <Input id="full_name" name="full_name" required placeholder="Enter full name" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="phone_number">Phone Number</Label>
                          <Input id="phone_number" name="phone_number" placeholder="+91 98765 43210" />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="email">Email</Label>
                          <Input id="email" name="email" type="email" placeholder="email@example.com" />
                        </div>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="company">Company</Label>
                        <Input id="company" name="company" placeholder="Company name" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="source">Source</Label>
                          <Select name="source" defaultValue="website">
                            <SelectTrigger>
                              <SelectValue placeholder="Select source" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="manual">✍️ Manual Entry</SelectItem>
                              <SelectItem value="website">🌐 Website</SelectItem>
                              <SelectItem value="referral">🤝 Referral</SelectItem>
                              <SelectItem value="cold_call">📞 Cold Call</SelectItem>
                              <SelectItem value="facebook_ads">📘 Facebook Ads</SelectItem>
                              <SelectItem value="instagram_ads">📸 Instagram Ads</SelectItem>
                              <SelectItem value="google_ads">🔍 Google Ads</SelectItem>
                              <SelectItem value="whatsapp">💬 WhatsApp</SelectItem>
                              <SelectItem value="voice">🎙️ Voice Note</SelectItem>
                              <SelectItem value="csv_import">📄 CSV Import</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="buying_intent">Buying Intent</Label>
                          <Select name="buying_intent" defaultValue="medium">
                            <SelectTrigger>
                              <SelectValue placeholder="Select intent" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="high">High</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="low">Low</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="city">City</Label>
                          <Input id="city" name="city" placeholder="City" />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="state">State</Label>
                          <Input id="state" name="state" placeholder="State" />
                        </div>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="estimated_budget">Estimated Budget (INR)</Label>
                        <Input id="estimated_budget" name="estimated_budget" type="number" placeholder="500000" />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? 'Adding...' : 'Add Lead'}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[130px] h-8 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="interested">Interested</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="negotiation">Negotiation</SelectItem>
                <SelectItem value="closed_won">Closed Won</SelectItem>
                <SelectItem value="closed_lost">Closed Lost</SelectItem>
              </SelectContent>
            </Select>
            <Select value={intentFilter} onValueChange={setIntentFilter}>
              <SelectTrigger className="w-[130px] h-8 text-xs">
                <SelectValue placeholder="Intent" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Intent</SelectItem>
                <SelectItem value="high">High Intent</SelectItem>
                <SelectItem value="medium">Medium Intent</SelectItem>
                <SelectItem value="low">Low Intent</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="h-8">
              <Filter className="size-4" />
            </Button>
          </div>
        </div>

        {/* Quick Filter Badges */}
        {leads.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <Badge 
              variant="outline" 
              className={`cursor-pointer hover:bg-muted ${statusFilter === 'all' && intentFilter === 'all' ? 'bg-primary/10' : ''}`}
              onClick={() => { setStatusFilter('all'); setIntentFilter('all') }}
            >
              All Leads ({leads.length})
            </Badge>
            <Badge 
              variant="outline" 
              className="cursor-pointer hover:bg-muted bg-red-50 text-red-700 border-red-200"
              onClick={() => setIntentFilter('high')}
            >
              Hot / High Intent ({hotLeads})
            </Badge>
            <Badge 
              variant="outline" 
              className="cursor-pointer hover:bg-muted bg-amber-50 text-amber-700 border-amber-200"
            >
              Pending Verification ({pendingVerification})
            </Badge>
            <Badge 
              variant="outline" 
              className="cursor-pointer hover:bg-muted bg-blue-50 text-blue-700 border-blue-200"
            >
              New Today ({newToday})
            </Badge>
            <Badge 
              variant="outline" 
              className="cursor-pointer hover:bg-muted bg-emerald-50 text-emerald-700 border-emerald-200"
            >
              High Value ({highValue})
            </Badge>
          </div>
        )}

        {/* Empty State or Leads Table */}
        {leads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center border rounded-lg bg-muted/20">
            <Users className="size-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No leads yet</h3>
            <p className="text-muted-foreground mb-6 max-w-md">
              Start building your sales pipeline by adding your first lead.
              You can add leads manually or import them from a CSV file.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" size="sm">
                <Upload className="size-4 mr-2" />
                Import CSV
              </Button>
              <Button size="sm" onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="size-4 mr-2" />
                Add First Lead
              </Button>
            </div>
          </div>
        ) : (
          <LeadsTable
            leads={filteredLeads}
            onViewLead={(lead) => setSelectedLead(lead)}
            onEditLead={(lead) => setSelectedLead(lead)}
            onLeadsChanged={refetch}
          />
        )}
      </main>

      {/* Lead Detail Panel */}
      {selectedLead && (
        <LeadDetailPanel 
          lead={selectedLead} 
          onClose={() => setSelectedLead(null)}
          onLeadUpdated={refetch}
        />
      )}

      <CSVImportModal
        open={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImported={refetch}
      />
    </div>
  )
}
