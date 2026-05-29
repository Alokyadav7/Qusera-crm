'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import { useState, useEffect } from 'react'
import { useNotifications } from '@/lib/hooks/use-notifications'
import { useCompany } from '@/lib/company-context'
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  Calendar,
  BarChart3,
  Settings,
  Mic,
  FileCheck,
  LogOut,
  Zap,
  Kanban,
  Bell,
  BrainCircuit,
  Globe,
  Plug,
  ShieldCheck,
  ExternalLink,
  Building2,
  Mail,
  Phone,
  Shield,
  KeyRound,
  FileText,
  Contact,
  TrendingUp,
  Heart,
  MapPin,
  Smartphone
} from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator
} from '@/components/ui/sidebar'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { OrgSwitcher } from '@/components/crm/org-switcher'

const mainNavItems = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    badge: null
  },
  {
    title: 'Leads',
    href: '/dashboard/leads',
    icon: Users,
    badge: null
  },
  {
    title: 'Contacts',
    href: '/dashboard/contacts',
    icon: Contact,
    badge: null
  },
  {
    title: 'Deals',
    href: '/dashboard/deals',
    icon: Kanban,
    badge: null
  },
  {
    title: 'Pipeline',
    href: '/dashboard/pipeline',
    icon: TrendingUp,
    badge: 'Live'
  },
  {
    title: 'Accounts',
    href: '/dashboard/accounts',
    icon: Building2,
    badge: null
  },
  {
    title: 'Tasks',
    href: '/dashboard/tasks',
    icon: Calendar,
    badge: null
  },
]

const featureNavItems = [
  {
    title: 'Voice to CRM',
    href: '/dashboard/voice',
    icon: Mic,
    badge: 'AI'
  },
  {
    title: 'AI Lead Scoring',
    href: '/dashboard/scoring',
    icon: BrainCircuit,
    badge: 'New'
  },
  {
    title: 'Customer Success',
    href: '/dashboard/customer-success',
    icon: Heart,
    badge: 'Live'
  },
  {
    title: 'Route Planner',
    href: '/dashboard/routes',
    icon: MapPin,
    badge: null
  },
  {
    title: 'Lead Sources',
    href: '/dashboard/lead-sources',
    icon: Globe,
    badge: 'Live'
  },
  {
    title: 'Compliance',
    href: '/dashboard/compliance',
    icon: FileCheck,
    badge: null
  },
  {
    title: 'Invoices',
    href: '/dashboard/invoices',
    icon: FileText,
    badge: null
  },
  {
    title: 'Reports',
    href: '/dashboard/reports',
    icon: BarChart3,
    badge: null
  },
]

const settingsNavItems = [
  { title: 'Email Integration', href: '/dashboard/email',         icon: Mail,           badge: null },
  { title: 'WhatsApp Live',    href: '/dashboard/whatsapp',      icon: Phone,          badge: null },
  { title: 'Bulk SMS',         href: '/dashboard/sms',           icon: Smartphone,     badge: null },
  { title: 'Automations',      href: '/dashboard/automations',   icon: Zap,            badge: null },
  { title: 'Integrations',     href: '/dashboard/integrations',  icon: Plug,           badge: null },
  { title: 'Notifications',    href: '/dashboard/notifications', icon: Bell,           badge: 'LIVE' },
  { title: 'Settings',         href: '/dashboard/settings',      icon: Settings,       badge: null },
]

interface CRMSidebarProps {
  user: User | null
}

export function CRMSidebar({ user }: CRMSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { company } = useCompany()
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const { unread: unreadCount } = useNotifications(companyId)

  // ── Fetch active company id (for notifications) ───────────────────────
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === 'true') return
    if (!user) return
    const run = async () => {
      try {
        const supabase = createClient()
        const res = await (supabase as any)
          .from('user_active_company')
          .select('company_id')
          .eq('user_id', user.id)
          .single()
        const cid = res.data?.company_id
        if (cid) {
          setCompanyId(cid)
          // Fetch role
          const memberRes = await (supabase as any)
            .from('company_members')
            .select('role')
            .eq('user_id', user.id)
            .eq('company_id', cid)
            .single()
          setUserRole(memberRes.data?.role ?? null)
        }
        // Check super admin
        const profileRes = await (supabase as any)
          .from('profiles')
          .select('is_super_admin')
          .eq('id', user.id)
          .single()
        setIsSuperAdmin(profileRes.data?.is_super_admin === true)
      } catch (_) {}
    }
    run()
  }, [user])


  const handleLogout = async () => {
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
    } catch {
      // ignore
    }
    window.location.replace('/login')
  }

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'
  const userEmail = user?.email || ''
  const userInitials = userName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <Sidebar className="border-r border-border/50 glass-dark">
      <SidebarHeader className="border-b border-sidebar-border/50 bg-background/5 p-4 space-y-3">
        <Link href="/dashboard" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="flex size-10 items-center justify-center rounded-xl bg-foreground text-background shadow-lg ring-2 ring-foreground/10 overflow-hidden shrink-0">
            {company?.logo_url
              ? <img src={company.logo_url} alt={company.name} className="size-10 object-cover" />
              : <span className="text-background font-bold text-lg">{(company?.name ?? 'Q').charAt(0).toUpperCase()}</span>
            }
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-base font-bold tracking-tight truncate">{company?.name ?? 'Klinq'} CRM</span>
            <span className="text-xs font-medium text-muted-foreground">powered by Klinq</span>
          </div>
        </Link>
        <OrgSwitcher user={user} />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={item.href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(item.href)}>
                    <Link href={item.href}>
                      <item.icon className="size-4" />
                      <span>{item.title}</span>
                      {item.badge && (
                        <Badge variant="secondary" className="ml-auto text-xs">
                          {item.badge}
                        </Badge>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel>Features</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {featureNavItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={pathname.startsWith(item.href)}>
                    <Link href={item.href}>
                      <item.icon className="size-4" />
                      <span>{item.title}</span>
                      {item.badge && (
                        <Badge 
                          variant={item.badge === 'New' ? 'default' : 'secondary'} 
                          className="ml-auto text-xs"
                        >
                          {item.badge}
                        </Badge>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel>System</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {settingsNavItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={pathname.startsWith(item.href)}>
                    <Link href={item.href}>
                      <item.icon className="size-4" />
                      <span>{item.title}</span>
                      {item.title === 'Notifications' && unreadCount > 0 && (
                        <Badge className="ml-auto text-xs bg-red-500 text-white border-0 h-5 min-w-5 px-1.5">
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </Badge>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Admin Panels - role gated */}
        {(userRole === 'company_admin' || userRole === 'sales_manager' || isSuperAdmin) && (
          <>
            <SidebarSeparator />
            <SidebarGroup>
              <SidebarGroupLabel>Admin Panels</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {(userRole === 'company_admin' || isSuperAdmin) && (
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={pathname.startsWith('/dashboard/admin') && !pathname.includes('/audit-logs') && !pathname.includes('/api')}>
                        <Link href="/dashboard/admin">
                          <ShieldCheck className="size-4" />
                          <span>Company Admin</span>
                          <Badge className="ml-auto text-xs bg-blue-500 text-white border-0">Admin</Badge>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={pathname.startsWith('/dashboard/admin/audit-logs')}>
                      <Link href="/dashboard/admin/audit-logs">
                        <Shield className="size-4" />
                        <span>Audit Logs</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  {(userRole === 'company_admin' || isSuperAdmin) && (
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={pathname.startsWith('/dashboard/admin/api')}>
                        <Link href="/dashboard/admin/api">
                          <KeyRound className="size-4" />
                          <span>API & Webhooks</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}
                  {isSuperAdmin && (
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={pathname.startsWith('/super-admin')}>
                        <Link href="/super-admin">
                          <ExternalLink className="size-4" />
                          <span>Super Admin</span>
                          <Badge className="ml-auto text-xs bg-purple-600 text-white border-0">Platform</Badge>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <div className="w-full flex items-center">
                <Avatar className="size-7">
                  <AvatarImage src={user?.user_metadata?.avatar_url || ''} alt={userName} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-1 flex-col text-left ml-2 min-w-0">
                  <span className="text-sm font-medium truncate">{userName}</span>
                  <span className="text-xs text-muted-foreground truncate">{userEmail}</span>
                </div>
                <button 
                  onClick={handleLogout}
                  className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
                  title="Logout"
                >
                  <LogOut className="size-4" />
                </button>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
