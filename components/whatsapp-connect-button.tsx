'use client'

import { useEffect, useRef, useState } from 'react'

declare global {
  interface Window {
    FB: any
    fbAsyncInit: () => void
  }
}

export interface WAConnectResult {
  success: boolean
  phone_number: string
  display_name: string
  waba_id: string
}

interface Props {
  companyId: string
  onSuccess: (data: WAConnectResult) => void
  onError?: (msg: string) => void
}

export function WhatsAppConnectButton({ companyId, onSuccess, onError }: Props) {
  const [loading, setLoading] = useState(false)
  const sdkReady = useRef(false)

  useEffect(() => {
    // Load Facebook JS SDK once
    if (document.getElementById('facebook-jssdk')) {
      sdkReady.current = true
      return
    }
    const script = document.createElement('script')
    script.id = 'facebook-jssdk'
    script.src = 'https://connect.facebook.net/en_US/sdk.js'
    script.async = true
    script.defer = true
    script.onload = () => { sdkReady.current = true }
    document.head.appendChild(script)

    window.fbAsyncInit = function () {
      window.FB.init({
        appId: process.env.NEXT_PUBLIC_META_APP_ID,
        autoLogAppEvents: true,
        xfbml: true,
        version: 'v19.0',
      })
    }
  }, [])

  const handleConnect = () => {
    if (typeof window === 'undefined' || !window.FB) {
      onError?.('Facebook SDK not loaded yet. Please wait a moment and try again.')
      return
    }

    setLoading(true)

    window.FB.login(
      async (response: any) => {
        try {
          if (!response.authResponse?.code) {
            setLoading(false)
            onError?.('Connection cancelled or failed.')
            return
          }

          const res = await fetch('/api/whatsapp/connect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              code: response.authResponse.code,
              company_id: companyId,
            }),
          })

          const data = await res.json()

          if (!res.ok || !data.success) {
            onError?.(data.error ?? 'Failed to connect WhatsApp. Please try again.')
            return
          }

          onSuccess(data as WAConnectResult)
        } catch (e: any) {
          onError?.(e.message ?? 'Unexpected error during connection.')
        } finally {
          setLoading(false)
        }
      },
      {
        config_id: process.env.NEXT_PUBLIC_META_APP_ID,
        response_type: 'code',
        override_default_response_type: true,
        extras: {
          setup: {},
          featureType: '',
          sessionInfoVersion: '3',
        },
      }
    )
  }

  return (
    <button
      onClick={handleConnect}
      disabled={loading}
      className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#1ebe5d] disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all shadow-sm cursor-pointer"
    >
      {loading ? (
        <>
          <svg className="animate-spin size-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Connecting…
        </>
      ) : (
        <>
          {/* WhatsApp icon */}
          <svg viewBox="0 0 24 24" className="size-4 fill-white" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
            <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.118 1.528 5.847L.057 23.882l6.196-1.624A11.937 11.937 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.804 9.804 0 01-5.002-1.368l-.36-.214-3.68.965.981-3.594-.235-.37A9.819 9.819 0 012.182 12C2.182 6.578 6.578 2.182 12 2.182S21.818 6.578 21.818 12 17.422 21.818 12 21.818z" />
          </svg>
          Connect WhatsApp Business Number
        </>
      )}
    </button>
  )
}
