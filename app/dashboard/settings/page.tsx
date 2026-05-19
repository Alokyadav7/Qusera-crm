'use client'

import { useState, useEffect, useCallback } from 'react'
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
  Globe, Loader2, CheckCircle2, Trash2, UserPlus, Key, Zap, Crown
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface TeamMember {
  id: string
  email: string
  full_name: string | null
  role: 'owner' | 'admin' | 'member'
  created_at: string
  last_sign_in_at: string | null
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('member')
  const [inviting, setInviting] = useState(false)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [profile, setProfile] = useState({
    company_name: '', industry: '', phone: '', website: '',
    currency: 'INR', email_notifications: true, whatsapp_notifications: true,
  })

  // Load current user & profile
  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      if (!user) return

      // Load profile
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (prof) {
        setProfile(p => ({
          ...p,
          ...prof,
          company_name: prof.company_name || '',
          industry: prof.industry || '',
          phone: prof.phone || '',
          website: prof.website || '',
          currency: prof.currency || 'INR',
        }))
      }

      // Load team members (only show current user — multi-tenant support coming soon)
      const { data: members } = await supabase
        .from('profiles')
        .select('id, email, full_name, role, created_at')
        .eq('id', user.id)
        .limit(20)
      setTeamMembers((members || []) as TeamMember[])
    }
    load()
  }, [])

  const saveProfile = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    if (!user) return
    const { error } = await supabase.from('profiles').upsert({
      id: user.id,
      email: user.email,
      ...profile,
      updated_at: new Date().toISOString(),
    })
    if (error) toast.error('Save failed: ' + error.message)
    else toast.success('Profile saved!')
    setLoading(false)
  }, [user, profile])

  const sendInvite = useCallback(async () => {
    if (!inviteEmail) return
    setInviting(true)
    // Send invite via our email API
    const res = await fetch('/api/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: [inviteEmail],
        subject: `You've been invited to OrbitCRM`,
        html: `
          <h2>You've been invited to join OrbitCRM</h2>
          <p>${user?.email} has invited you as a <strong>${inviteRole}</strong>.</p>
          <p><a href="${window.location.origin}/login" style="background:#6366f1;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;">Accept Invite</a></p>
        `,
      }),
    })
    const data = await res.json()
    if (data.success) toast.success(`Invite sent to ${inviteEmail}${data.mock ? ' (mock — add RESEND_API_KEY)' : ''}`)
    else toast.error('Invite failed: ' + data.error)
    setInviteEmail('')
    setInviting(false)
  }, [inviteEmail, inviteRole, user])

  const changePassword = useCallback(async () => {
    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(user?.email, {
      redirectTo: `${window.location.origin}/auth/callback`,
    })
    if (error) toast.error(error.message)
    else toast.success('Password reset email sent to ' + user?.email)
  }, [user])

  return (
    <div className="flex flex-col min-h-screen">
      <CRMHeader title="Settings" subtitle="Manage your account, team, and integrations" />

      <main className="flex-1 p-4 md:p-6">
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="profile" className="gap-1.5"><Building2 className="size-4" />Company</TabsTrigger>
            <TabsTrigger value="team" className="gap-1.5"><Users className="size-4" />Team</TabsTrigger>
            <TabsTrigger value="notifications" className="gap-1.5"><Bell className="size-4" />Notifications</TabsTrigger>
            <TabsTrigger value="security" className="gap-1.5"><Shield className="size-4" />Security</TabsTrigger>
            <TabsTrigger value="billing" className="gap-1.5"><CreditCard className="size-4" />Billing</TabsTrigger>
            <TabsTrigger value="integrations" className="gap-1.5"><Zap className="size-4" />Integrations</TabsTrigger>
          </TabsList>

          {/* ── COMPANY PROFILE ── */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Company Profile</CardTitle>
                <CardDescription>This information is shown to your team and used in reports</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Company Name</Label>
                    <div className="relative"><Building2 className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input className="pl-9" value={profile.company_name} onChange={e => setProfile(p => ({ ...p, company_name: e.target.value }))} placeholder="Sharma Enterprises" /></div>
                  </div>
                  <div className="space-y-2">
                    <Label>Industry</Label>
                    <Select value={profile.industry} onValueChange={v => setProfile(p => ({ ...p, industry: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select industry" /></SelectTrigger>
                      <SelectContent>
                        {['SaaS','Real Estate','Manufacturing','Retail','Finance','Healthcare','Education','Other'].map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Business Phone</Label>
                    <div className="relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input className="pl-9" value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} placeholder="+91 98765 43210" /></div>
                  </div>
                  <div className="space-y-2">
                    <Label>Website</Label>
                    <div className="relative"><Globe className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input className="pl-9" value={profile.website} onChange={e => setProfile(p => ({ ...p, website: e.target.value }))} placeholder="yourcompany.com" /></div>
                  </div>
                  <div className="space-y-2">
                    <Label>Currency</Label>
                    <Select value={profile.currency} onValueChange={v => setProfile(p => ({ ...p, currency: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INR">₹ Indian Rupee (INR)</SelectItem>
                        <SelectItem value="USD">$ US Dollar (USD)</SelectItem>
                        <SelectItem value="AED">د.إ UAE Dirham (AED)</SelectItem>
                        <SelectItem value="GBP">£ British Pound (GBP)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Account Email</Label>
                    <div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input className="pl-9" value={user?.email || ''} disabled /></div>
                  </div>
                </div>
                <Button onClick={saveProfile} disabled={loading}>
                  {loading ? <Loader2 className="size-4 mr-2 animate-spin" /> : <CheckCircle2 className="size-4 mr-2" />}
                  Save Changes
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── TEAM MANAGEMENT ── */}
          <TabsContent value="team" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Invite Team Members</CardTitle>
                <CardDescription>Invite your sales team to collaborate in OrbitCRM</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-3 flex-wrap">
                  <div className="relative flex-1 min-w-[200px]">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input className="pl-9" placeholder="colleague@company.com" value={inviteEmail}
                      onChange={e => setInviteEmail(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && sendInvite()} />
                  </div>
                  <Select value={inviteRole} onValueChange={setInviteRole}>
                    <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="member">Member</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={sendInvite} disabled={inviting || !inviteEmail}>
                    {inviting ? <Loader2 className="size-4 mr-2 animate-spin" /> : <UserPlus className="size-4 mr-2" />}
                    Send Invite
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Team Members ({teamMembers.length})</CardTitle>
                <CardDescription>People with access to this workspace</CardDescription>
              </CardHeader>
              <CardContent>
                {teamMembers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="size-10 mx-auto mb-2 opacity-30" />
                    <p>No team members yet — invite your first colleague above</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Always show the current user */}
                    {user && (
                      <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                        <div className="flex items-center gap-3">
                          <Avatar className="size-9">
                            <AvatarFallback className="bg-primary/10 text-primary text-xs">
                              {user.email?.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">{user.email}</p>
                            <p className="text-xs text-muted-foreground">You</p>
                          </div>
                        </div>
                        <Badge className="bg-amber-50 text-amber-700 border-amber-200">
                          <Crown className="size-3 mr-1" />Owner
                        </Badge>
                      </div>
                    )}
                    {teamMembers.filter(m => m.id !== user?.id).map(member => (
                      <div key={member.id} className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="flex items-center gap-3">
                          <Avatar className="size-9">
                            <AvatarFallback className="bg-primary/10 text-primary text-xs">
                              {(member.full_name || member.email || '?').slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">{member.full_name || member.email}</p>
                            <p className="text-xs text-muted-foreground">{member.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{member.role || 'member'}</Badge>
                          <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-destructive">
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── NOTIFICATIONS ── */}
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>Control when and how you get notified</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { key: 'email_notifications', icon: <Mail className="size-4" />, label: 'Email Notifications', desc: 'Get notified about new leads and deal updates by email' },
                  { key: 'whatsapp_notifications', icon: <Phone className="size-4" />, label: 'WhatsApp Alerts', desc: 'Receive critical alerts via WhatsApp' },
                ].map(item => (
                  <div key={item.key} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 items-center justify-center rounded-lg bg-muted">{item.icon}</div>
                      <div>
                        <p className="font-medium text-sm">{item.label}</p>
                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                      </div>
                    </div>
                    <Switch
                      checked={(profile as any)[item.key]}
                      onCheckedChange={v => setProfile(p => ({ ...p, [item.key]: v }))}
                    />
                  </div>
                ))}
                <Button onClick={saveProfile} disabled={loading}>
                  {loading ? <Loader2 className="size-4 mr-2 animate-spin" /> : null}Save Preferences
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── SECURITY ── */}
          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle>Security</CardTitle>
                <CardDescription>Manage your account security</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-lg bg-muted"><Key className="size-4" /></div>
                    <div>
                      <p className="font-medium text-sm">Password</p>
                      <p className="text-xs text-muted-foreground">Change your account password via email reset</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={changePassword}>
                    <Mail className="size-4 mr-2" />Send Reset Email
                  </Button>
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-lg bg-muted"><Shield className="size-4" /></div>
                    <div>
                      <p className="font-medium text-sm">Two-Factor Authentication</p>
                      <p className="text-xs text-muted-foreground">Managed via Supabase Auth — enable in your account settings</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-amber-600 bg-amber-50">Not enabled</Badge>
                </div>
                <div className="p-4 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground">
                    <strong>Data Security:</strong> All data is stored in Supabase PostgreSQL with Row Level Security (RLS).
                    Your data is encrypted in transit (TLS 1.3) and at rest. Each user can only access their own leads and interactions.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── BILLING ── */}
          <TabsContent value="billing">
            <div className="grid gap-4 md:grid-cols-3 mb-6">
              {[
                { name: 'Starter', price: '₹999', period: '/mo', features: ['1 user', '500 leads', 'Basic AI scoring', 'WhatsApp & Email logging', 'Compliance tracking'], cta: 'Current Plan', current: true },
                { name: 'Growth', price: '₹2,499', period: '/mo', features: ['5 users', '5,000 leads', 'Advanced AI scoring', 'Real WhatsApp API', 'Voice-to-CRM', 'Analytics dashboard', 'Priority support'], cta: 'Upgrade', highlight: true },
                { name: 'Enterprise', price: 'Custom', period: '', features: ['Unlimited users', 'Unlimited leads', 'Custom AI models', 'Dedicated WhatsApp number', 'API access', 'Custom integrations', 'SLA guarantee'], cta: 'Contact Sales', current: false },
              ].map(plan => (
                <Card key={plan.name} className={plan.highlight ? 'border-primary ring-2 ring-primary/20 shadow-lg' : ''}>
                  {plan.highlight && <div className="bg-primary text-primary-foreground text-xs font-semibold text-center py-1 rounded-t-lg">MOST POPULAR</div>}
                  <CardHeader>
                    <CardTitle>{plan.name}</CardTitle>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold">{plan.price}</span>
                      <span className="text-muted-foreground text-sm">{plan.period}</span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      {plan.features.map(f => (
                        <div key={f} className="flex items-center gap-2 text-sm">
                          <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />{f}
                        </div>
                      ))}
                    </div>
                    <Button
                      className="w-full"
                      variant={plan.current ? 'outline' : plan.highlight ? 'default' : 'outline'}
                      disabled={plan.current}
                      onClick={async () => {
                        if (plan.name === 'Enterprise') { window.open('mailto:sales@orbitcrm.in'); return }
                        const amountMap: Record<string, number> = { Growth: 249900, Enterprise: 0 }
                        const res = await fetch('/api/payments/create-order', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ amount: amountMap[plan.name] || 99900, planId: plan.name, userId: 'user' }),
                        })
                        const data = await res.json()
                        if (data.mock) toast.info('Razorpay not configured yet — add keys to .env to accept payments')
                        else toast.success('Order created: ' + data.orderId)
                      }}
                    >
                      {plan.current ? '✓ Current Plan' : plan.cta}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* ── INTEGRATIONS ── */}
          <TabsContent value="integrations">
            <div className="grid gap-4 md:grid-cols-2">
              {[
                { name: 'WhatsApp Business API', icon: '💬', status: process.env.NEXT_PUBLIC_META_CONFIGURED === 'true' ? 'connected' : 'not_configured', desc: 'Send & receive real WhatsApp messages. Add META_WHATSAPP_TOKEN to .env', action: 'Configure', href: 'https://developers.facebook.com/docs/whatsapp' },
                { name: 'Resend Email', icon: '✉️', status: 'not_configured', desc: 'Send real emails from CRM. Add RESEND_API_KEY to .env', action: 'Get Free Key', href: 'https://resend.com' },
                { name: 'Razorpay Payments', icon: '💳', status: 'not_configured', desc: 'Accept subscription payments. Add RAZORPAY_KEY_ID to .env', action: 'Get Keys', href: 'https://razorpay.com' },
                { name: 'Google Gemini AI', icon: '🤖', status: 'connected', desc: 'AI lead scoring, voice extraction, and chat. Powered by Gemini Pro', action: 'Manage', href: 'https://aistudio.google.com' },
                { name: 'Supabase', icon: '⚡', status: 'connected', desc: 'Real-time database, auth, and file storage', action: 'View Dashboard', href: 'https://supabase.com/dashboard' },
                { name: 'Google Sheets', icon: '📊', status: 'coming_soon', desc: 'Sync leads automatically from your spreadsheet', action: 'Coming Soon', href: '#' },
              ].map(int => (
                <Card key={int.name}>
                  <CardContent className="flex items-start justify-between gap-4 pt-6">
                    <div className="flex items-start gap-3">
                      <div className="text-2xl">{int.icon}</div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-sm">{int.name}</p>
                          {int.status === 'connected' && <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">Connected</Badge>}
                          {int.status === 'not_configured' && <Badge variant="outline" className="text-amber-600 text-xs">Not configured</Badge>}
                          {int.status === 'coming_soon' && <Badge variant="secondary" className="text-xs">Soon</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground">{int.desc}</p>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" disabled={int.status === 'coming_soon'}
                      onClick={() => int.href !== '#' && window.open(int.href, '_blank')}>
                      {int.action}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
