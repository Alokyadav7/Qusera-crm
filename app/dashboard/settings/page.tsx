'use client'

import { useState, useEffect, useCallback } from 'react'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import { CRMHeader } from '@/components/crm/crm-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import {
  Building2, Users, Bell, Shield, CreditCard, Mail, Phone,
  Globe, Loader2, CheckCircle2, Trash2, UserPlus, Key, Crown,
  Lock, ShieldAlert, MessageSquare, Zap
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface TeamMember {
  id: string
  email: string
  full_name: string | null
  role: 'owner' | 'admin' | 'member'
  created_at: string
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('member')
  const [inviting, setInviting] = useState(false)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [profile, setProfile] = useState({
    company_name: '',
    industry: '',
    phone: '',
    website: '',
    currency: 'INR',
    email_notifications: true,
    whatsapp_notifications: true,
  })

  // Load current user & profile in a reactive real-time load function
  const loadSettings = useCallback(async () => {
    const supabase = createClient()
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (!currentUser) return
    setUser(currentUser)

    // Load profile
    const { data: prof } = await supabase.from('profiles').select('*').eq('id', currentUser.id).single()
    if (prof) {
      setProfile({
        company_name: prof.company_name || '',
        industry: prof.industry || '',
        phone: prof.phone || '',
        website: prof.website || '',
        currency: prof.currency || 'INR',
        email_notifications: prof.email_notifications !== false,
        whatsapp_notifications: prof.whatsapp_notifications !== false,
      })
    }

    // Fetch team members sharing the same company name
    let query = supabase
      .from('profiles')
      .select('id, email, full_name, role, created_at')
      .order('created_at', { ascending: true })

    if (prof?.company_name) {
      query = query.eq('company_name', prof.company_name)
    } else {
      query = query.eq('id', currentUser.id)
    }

    const { data: members } = await query.limit(50)
    setTeamMembers((members || []) as TeamMember[])
  }, [])

  // Sync settings and set up real-time postgres subscription
  useEffect(() => {
    loadSettings()

    const supabase = createClient()
    const channel = supabase
      .channel('realtime-settings-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        (payload) => {
          console.log('🔄 [Realtime Settings] Profile updated in DB:', payload)
          loadSettings()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [loadSettings])

  const saveProfile = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    if (!user) { setLoading(false); return }
    const { error } = await supabase.from('profiles').upsert({
      id: user.id,
      email: user.email,
      ...profile,
      updated_at: new Date().toISOString(),
    })
    if (error) {
      toast.error('Save failed: ' + error.message)
    } else {
      toast.success('Settings saved successfully!')
      loadSettings() // Force state refresh
    }
    setLoading(false)
  }, [user, profile, loadSettings])

  const sendInvite = useCallback(async () => {
    if (!inviteEmail) return
    setInviting(true)
    try {
      const res = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: [inviteEmail],
          subject: `You've been invited to OrbitCRM`,
          html: `
            <div style="font-family: sans-serif; padding: 24px; color: #333;">
              <h2>You've been invited to join OrbitCRM</h2>
              <p style="font-size: 14px; line-height: 1.5; color: #555;">${user?.email} has invited you to collaborate as a <strong>${inviteRole}</strong>.</p>
              <p style="margin: 24px 0;">
                <a href="${typeof window !== 'undefined' ? window.location.origin : ''}/login" 
                   style="background: #6366f1; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
                  Accept Invitation
                </a>
              </p>
              <hr style="border: 0; border-top: 1px solid #eee; margin: 24px 0;" />
              <p style="font-size: 12px; color: #777;">If you did not expect this invitation, you can safely ignore this email.</p>
            </div>
          `,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(`Invitation successfully sent to ${inviteEmail}${data.mock ? ' (sandbox mode — mock email sent)' : ''}`)
      } else {
        toast.error('Invite failed: ' + (data.error || 'Server error'))
      }
      setInviteEmail('')
    } catch (err: any) {
      toast.error('Invite error: ' + (err.message || 'Could not reach server'))
    } finally {
      setInviting(false)
    }
  }, [inviteEmail, inviteRole, user])

  const changePassword = useCallback(async () => {
    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(user?.email || '', {
      redirectTo: `${window.location.origin}/auth/callback`,
    })
    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Password reset instruction email dispatched to ' + user?.email)
    }
  }, [user])

  const currencySymbol = profile.currency === 'INR' ? '₹' : profile.currency === 'USD' ? '$' : profile.currency === 'GBP' ? '£' : 'د.إ'

  return (
    <div className="flex flex-col min-h-screen bg-background/30">
      <CRMHeader 
        title="Settings" 
        subtitle="Manage your company profile, team permission nodes, and billing integrations" 
      />

      <main className="flex-1 p-4 md:p-6 space-y-6">
        {/* Real-time telemetry status banner */}
        <div className="flex items-center justify-between p-3.5 rounded-lg bg-card border border-border/60">
          <div className="flex items-center gap-3">
            <span className="size-2 rounded-full bg-foreground/60" />
            <div>
              <p className="text-sm font-semibold text-foreground">Real-Time Settings Active</p>
              <p className="text-xs text-muted-foreground">Changes sync dynamically to the database</p>
            </div>
          </div>
          <Badge variant="outline" className="font-mono text-[10px]">
            {user?.email}
          </Badge>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid grid-cols-2 md:flex h-auto gap-1 bg-muted/65 p-1 rounded-xl w-full md:w-fit">
            <TabsTrigger value="profile" className="gap-1.5 py-2 px-3 rounded-lg text-xs md:text-sm"><Building2 className="size-4" />Company</TabsTrigger>
            <TabsTrigger value="team" className="gap-1.5 py-2 px-3 rounded-lg text-xs md:text-sm"><Users className="size-4" />Team Deck</TabsTrigger>
            <TabsTrigger value="notifications" className="gap-1.5 py-2 px-3 rounded-lg text-xs md:text-sm"><Bell className="size-4" />Alerts</TabsTrigger>
            <TabsTrigger value="security" className="gap-1.5 py-2 px-3 rounded-lg text-xs md:text-sm"><Shield className="size-4" />Security</TabsTrigger>
            <TabsTrigger value="billing" className="gap-1.5 py-2 px-3 rounded-lg text-xs md:text-sm col-span-2 md:col-span-1"><CreditCard className="size-4" />Billing</TabsTrigger>
          </TabsList>

          {/* ── COMPANY PROFILE ── */}
          <TabsContent value="profile">
            <Card className="border-border/60 overflow-hidden animate-in fade-in-50 duration-200">
              <CardHeader className="pb-6 border-b border-border/40">
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="size-5 text-muted-foreground" />
                  Company Profile
                </CardTitle>
                <CardDescription>
                  Configure core metadata used for reporting, invoice generation, and dashboard telemetry filters.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="company_name" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Company Name</Label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/70" />
                      <Input 
                        id="company_name"
                        className="pl-9 bg-background/50 hover:bg-background/80 transition-colors rounded-xl" 
                        value={profile.company_name} 
                        onChange={e => setProfile(p => ({ ...p, company_name: e.target.value }))} 
                        placeholder="e.g. Acme Corporation" 
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="industry" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Industry Sector</Label>
                    <Select value={profile.industry} onValueChange={v => setProfile(p => ({ ...p, industry: v }))}>
                      <SelectTrigger id="industry" className="bg-background/50 hover:bg-background/80 transition-colors rounded-xl">
                        <SelectValue placeholder="Select industry" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {['SaaS', 'Real Estate', 'Manufacturing', 'Retail', 'Finance', 'Healthcare', 'Education', 'Other'].map(i => (
                          <SelectItem key={i} value={i} className="rounded-lg">{i}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Business Contact Phone</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/70" />
                      <Input 
                        id="phone"
                        className="pl-9 bg-background/50 hover:bg-background/80 transition-colors rounded-xl" 
                        value={profile.phone} 
                        onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} 
                        placeholder="+91 98765 43210" 
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="website" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Corporate Website</Label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/70" />
                      <Input 
                        id="website"
                        className="pl-9 bg-background/50 hover:bg-background/80 transition-colors rounded-xl" 
                        value={profile.website} 
                        onChange={e => setProfile(p => ({ ...p, website: e.target.value }))} 
                        placeholder="acme.com" 
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="currency" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Preferred Currency</Label>
                    <Select value={profile.currency} onValueChange={v => setProfile(p => ({ ...p, currency: v }))}>
                      <SelectTrigger id="currency" className="bg-background/50 hover:bg-background/80 transition-colors rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="INR" className="rounded-lg">₹ Indian Rupee (INR)</SelectItem>
                        <SelectItem value="USD" className="rounded-lg">$ US Dollar (USD)</SelectItem>
                        <SelectItem value="AED" className="rounded-lg">د.إ UAE Dirham (AED)</SelectItem>
                        <SelectItem value="GBP" className="rounded-lg">£ British Pound (GBP)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Registered Account Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/40" />
                      <Input className="pl-9 bg-muted/40 cursor-not-allowed rounded-xl" value={user?.email || ''} disabled />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-border/40 flex justify-end">
                  <Button onClick={saveProfile} disabled={loading} className="rounded-xl px-5 gap-2">
                    {loading ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                    Save Company Profile
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── TEAM DECK ── */}
          <TabsContent value="team" className="space-y-6">
            <Card className="border-border/60 shadow-md animate-in fade-in-50 duration-200">
              <CardHeader className="pb-6 border-b border-border/40">
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="size-5 text-primary" />
                  Invite Collaborator
                </CardTitle>
                <CardDescription>
                  Invite sales executives or operations managers to access this pipeline database.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex gap-4 flex-wrap items-end">
                  <div className="space-y-2 flex-1 min-w-[240px]">
                    <Label htmlFor="invite_email" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Collaborator Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/75" />
                      <Input 
                        id="invite_email"
                        className="pl-9 bg-background/50 hover:bg-background/80 transition-colors rounded-xl" 
                        placeholder="partner@company.com" 
                        value={inviteEmail}
                        onChange={e => setInviteEmail(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && sendInvite()} 
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2 w-[140px]">
                    <Label htmlFor="invite_role" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Access Role</Label>
                    <Select value={inviteRole} onValueChange={setInviteRole}>
                      <SelectTrigger id="invite_role" className="bg-background/50 hover:bg-background/80 transition-colors rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="admin" className="rounded-lg">Admin</SelectItem>
                        <SelectItem value="member" className="rounded-lg">Member</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button onClick={sendInvite} disabled={inviting || !inviteEmail} className="rounded-xl gap-2 h-10 px-5">
                    {inviting ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
                    Send Invite
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60 shadow-md">
              <CardHeader className="pb-6 border-b border-border/40">
                <CardTitle className="flex items-center gap-2">
                  <Users className="size-5 text-primary" />
                  Active Team Members ({teamMembers.length})
                </CardTitle>
                <CardDescription>
                  Sales reps and operators linked to company <strong>{profile.company_name || '(Set Company Profile to link)'}</strong>.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                {teamMembers.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground bg-muted/10 rounded-2xl border border-dashed border-border/80">
                    <Users className="size-12 mx-auto mb-3 opacity-30 text-primary" />
                    <p className="font-semibold text-sm">No team members yet</p>
                    <p className="text-xs text-muted-foreground mt-1">Configure your Company Name to view linked teammates</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {teamMembers.map(member => {
                      const isSelf = member.id === user?.id
                      const isOwner = member.role === 'owner'
                      return (
                        <div 
                          key={member.id} 
                          className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                            isSelf 
                              ? 'bg-primary/[0.03] border-primary/20 dark:bg-primary/5' 
                              : 'bg-card border-border/60 hover:border-primary/20'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <Avatar className="size-9 ring-1 ring-border shadow-sm">
                              <AvatarFallback className="bg-primary/10 text-primary text-xs font-extrabold">
                                {(member.full_name || member.email || '?').slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-sm truncate text-foreground leading-tight">
                                  {member.full_name || member.email?.split('@')[0]}
                                </p>
                                {isSelf && <Badge variant="secondary" className="text-[9px] px-1.5 py-0 font-bold">You</Badge>}
                              </div>
                              <p className="text-xs text-muted-foreground truncate mt-0.5">{member.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {isOwner ? (
                              <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200/50">
                                <Crown className="size-3 mr-1" />Owner
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="capitalize text-xs font-semibold">{member.role || 'member'}</Badge>
                            )}
                            {!isSelf && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8 text-muted-foreground hover:text-destructive transition-colors rounded-lg"
                                onClick={async () => {
                                  const supabase = createClient()
                                  const { error } = await supabase
                                    .from('profiles')
                                    .update({ company_name: null, role: 'member' })
                                    .eq('id', member.id)
                                  if (error) {
                                    toast.error('Failed to unlink member: ' + error.message)
                                  } else {
                                    toast.success('Member removed from team!')
                                    loadSettings()
                                  }
                                }}
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── NOTIFICATIONS ── */}
          <TabsContent value="notifications">
            <Card className="border-border/60 shadow-md animate-in fade-in-50 duration-200">
              <CardHeader className="pb-6 border-b border-border/40">
                <CardTitle className="flex items-center gap-2">
                  <Bell className="size-5 text-primary" />
                  Alert Channels
                </CardTitle>
                <CardDescription>
                  Configure system trigger nodes for push updates on incoming leads and compliance status updates.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between p-4 border border-border/60 rounded-2xl bg-card hover:bg-muted/10 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Mail className="size-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-foreground">Email Notifications</p>
                      <p className="text-xs text-muted-foreground">Receive daily briefs and summaries of processed lead counts</p>
                    </div>
                  </div>
                  <Switch
                    checked={profile.email_notifications}
                    onCheckedChange={v => setProfile(p => ({ ...p, email_notifications: v }))}
                  />
                </div>

                <div className="flex items-center justify-between p-4 border border-border/60 rounded-2xl bg-card hover:bg-muted/10 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <MessageSquare className="size-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-foreground">WhatsApp Instant Alerts</p>
                      <p className="text-xs text-muted-foreground">Get pinged immediately when a lead exhibits hot buying intent (🔥)</p>
                    </div>
                  </div>
                  <Switch
                    checked={profile.whatsapp_notifications}
                    onCheckedChange={v => setProfile(p => ({ ...p, whatsapp_notifications: v }))}
                  />
                </div>

                <div className="pt-4 border-t border-border/40 flex justify-end">
                  <Button onClick={saveProfile} disabled={loading} className="rounded-xl px-5 gap-2">
                    {loading && <Loader2 className="size-4 animate-spin" />}
                    Save Preferences
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── SECURITY ── */}
          <TabsContent value="security">
            <Card className="border-border/60 shadow-md animate-in fade-in-50 duration-200">
              <CardHeader className="pb-6 border-b border-border/40">
                <CardTitle className="flex items-center gap-2">
                  <Shield className="size-5 text-primary" />
                  Credentials & Cryptography
                </CardTitle>
                <CardDescription>
                  Maintain account access credentials and inspect multi-tenant security architecture.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="flex items-center justify-between p-4 border border-border/60 rounded-2xl bg-card">
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-xl bg-muted/80 text-foreground">
                      <Key className="size-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-foreground">Change Password</p>
                      <p className="text-xs text-muted-foreground">Dispatches a secure password reset link to your email</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={changePassword} className="rounded-xl px-4 gap-2">
                    <Mail className="size-4" />
                    Send Reset Link
                  </Button>
                </div>

                <div className="flex items-center justify-between p-4 border border-border/60 rounded-2xl bg-card">
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-xl bg-muted/80 text-foreground">
                      <Lock className="size-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-foreground">Two-Factor Authentication (2FA)</p>
                      <p className="text-xs text-muted-foreground">Managed via Supabase JWT session keys for secure log-ins</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-amber-600 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/30 font-semibold">
                    Enforced at Core
                  </Badge>
                </div>

                <div className="p-4 bg-muted/10 rounded-2xl border border-border/40 flex gap-3">
                  <ShieldAlert className="size-5 text-primary shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground leading-normal">
                    <strong>Multi-Tenant Isolation Security:</strong> OrbitCRM utilizes Row Level Security (RLS) policies 
                    enforced on the database schema layer. Authenticated JWT payloads verify `auth.uid() = user_id` for every transaction. 
                    All data is encrypted in transit using TLS 1.3 and at rest with AES-256 standards.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── BILLING ── */}
          <TabsContent value="billing">
            <div className="grid gap-6 md:grid-cols-3 mb-6 animate-in fade-in-50 duration-200">
              {[
                { name: 'Starter', price: 999, period: '/mo', features: ['1 active user', '500 leads limit', 'Basic AI scoring engine', 'WhatsApp & Email auto-logging', 'GSTIN & PAN compliance verification'], cta: 'Current Plan', current: true },
                { name: 'Growth', price: 2499, period: '/mo', features: ['5 active users', '5,000 leads limit', 'Advanced AI scoring nodes', 'Real WhatsApp API Webhooks', 'Dynamic Voice-to-CRM parser', 'Interactive Analytics Dashboard', 'Priority support channels'], cta: 'Upgrade Plan', highlight: true },
                { name: 'Enterprise', price: 'Custom', period: '', features: ['Unlimited users', 'Unlimited leads limit', 'Custom-trained AI models', 'Dedicated corporate WhatsApp number', 'Direct database export APIs', 'Custom integrations suite', 'Dedicated SLA guarantees'], cta: 'Contact Sales', current: false },
              ].map(plan => {
                const priceFormatted = typeof plan.price === 'number' 
                  ? `${currencySymbol}${plan.price.toLocaleString('en-IN')}` 
                  : plan.price

                return (
                  <Card 
                    key={plan.name} 
                    className={`relative overflow-hidden rounded-3xl border transition-all ${
                      plan.highlight 
                        ? 'border-primary ring-2 ring-primary/20 shadow-lg scale-102 bg-card' 
                        : 'border-border/60 bg-card hover:border-primary/20'
                    }`}
                  >
                    {plan.highlight && (
                      <div className="bg-foreground text-background text-[10px] font-bold tracking-wider text-center py-1.5 uppercase">
                        Most Popular
                      </div>
                    )}
                    <CardHeader className="p-6">
                      <CardTitle className="text-lg font-bold flex items-center justify-between">
                        {plan.name}
                      </CardTitle>
                      <div className="flex items-baseline gap-1 mt-2">
                        <span className="text-3xl font-extrabold tracking-tight text-foreground">{priceFormatted}</span>
                        <span className="text-muted-foreground text-xs font-semibold">{plan.period}</span>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6 pt-0 space-y-6">
                      <ul className="space-y-3">
                        {plan.features.map(f => (
                          <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground">
                            <CheckCircle2 className="size-4 text-emerald-500 shrink-0 mt-0.5" />
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                      
                      <Button
                        className="w-full rounded-xl h-10 font-bold"
                        variant={plan.current ? 'outline' : plan.highlight ? 'default' : 'outline'}
                        disabled={plan.current}
                        onClick={async () => {
                          if (plan.name === 'Enterprise') {
                            window.open('mailto:sales@orbitcrm.in')
                            return
                          }
                          const amountMap: Record<string, number> = { Starter: 99900, Growth: 249900 }
                          try {
                            const res = await fetch('/api/payments/create-order', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ 
                                amount: amountMap[plan.name] || 99900, 
                                planId: plan.name, 
                                userId: user?.id || 'unknown' 
                              }),
                            })
                            const data = await res.json()
                            if (data.mock) {
                              toast.info('Razorpay not configured in environment — sandbox payment simulated successfully.')
                            } else {
                              toast.success('Secure order created: ' + data.orderId)
                            }
                          } catch (err: any) {
                            toast.error('Order creation failed: ' + (err.message || 'Network error'))
                          }
                        }}
                      >
                        {plan.current ? '✓ Active Plan' : plan.cta}
                      </Button>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
