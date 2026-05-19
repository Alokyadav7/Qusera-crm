'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import { useState, useEffect } from 'react'
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  Calendar,
  BarChart3,
  Settings,
  MapPin,
  Mic,
  FileCheck,
  Phone,
  LogOut,
  Zap,
  Kanban,
  Bell,
  BrainCircuit,
  Satellite,
  Smartphone,
  Globe,
  Plug,
  HeartHandshake
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

const mainNavItems = [
  {
    title: 'OrbitCRM AI',
    href: '/dashboard/orbit',
    icon: Satellite,
    badge: 'AI'
  },
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
    title: 'Pipeline',
    href: '/dashboard/pipeline',
    icon: Kanban,
    badge: 'New'
  },
  {
    title: 'Interactions',
    href: '/dashboard/interactions',
    icon: MessageSquare,
    badge: null
  },
  {
    title: 'Tasks',
    href: '/dashboard/tasks',
    icon: Calendar,
    badge: null
  },
  {
    title: 'Customer Success',
    href: '/dashboard/customer-success',
    icon: HeartHandshake,
    badge: 'Live'
  }
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
    title: 'Bulk SMS',
    href: '/dashboard/sms',
    icon: Smartphone,
    badge: 'New'
  },
  {
    title: 'Lead Sources',
    href: '/dashboard/lead-sources',
    icon: Globe,
    badge: 'Live'
  },
  {
    title: 'Route Planner',
    href: '/dashboard/routes',
    icon: MapPin,
    badge: null
  },
  {
    title: 'Compliance',
    href: '/dashboard/compliance',
    icon: FileCheck,
    badge: null
  },
  {
    title: 'WhatsApp',
    href: '/dashboard/whatsapp',
    icon: Phone,
    badge: null
  }
]

const settingsNavItems = [
  { title: 'Analytics',     href: '/dashboard/analytics',     icon: BarChart3,  badge: null },
  { title: 'Integrations',  href: '/dashboard/integrations',  icon: Plug,       badge: 'New' },
  { title: 'Notifications', href: '/dashboard/notifications', icon: Bell,       badge: 'LIVE' },
  { title: 'Settings',      href: '/dashboard/settings',      icon: Settings,   badge: null },
]

interface CRMSidebarProps {
  user: User | null
}

export function CRMSidebar({ user }: CRMSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [unreadCount, setUnreadCount] = useState<number>(0)

  // ── Real unread count from Supabase ──────────────────────────────────
  useEffect(() => {
    if (!user) return
    const supabase = createClient()

    // Count inbound interactions in last 48h as notifications
    async function fetchCount() {
      const since = new Date(Date.now() - 48 * 3600 * 1000).toISOString()
      const { count } = await supabase
        .from('interactions')
        .select('id', { count: 'exact', head: true })
        .eq('direction', 'inbound')
        .gte('created_at', since)
      setUnreadCount(count || 0)
    }
    fetchCount()

    // Subscribe to new interactions for live badge update
    const channel = supabase
      .channel('notif-badge')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'interactions' }, () => {
        fetchCount()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
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
      <SidebarHeader className="border-b border-sidebar-border/50 bg-background/5 p-4">
        <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-secondary text-primary-foreground shadow-lg shadow-primary/20">
            <Zap className="size-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-bold tracking-tight">OrbitCRM</span>
            <span className="text-xs font-medium text-muted-foreground">Voice-First CRM</span>
          </div>
        </Link>
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
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
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
