import { readFileSync, writeFileSync } from 'fs'

const file = readFileSync('./components/crm/onboarding-wizard.tsx', 'utf8')

const startMarker = '  const handleSubmit = async () => {'
const endMarker = '}\n\n  return ('

const startIdx = file.indexOf(startMarker)
const endIdx = file.indexOf(endMarker, startIdx) + 1 // include closing }

console.log('Found handleSubmit at:', startIdx, '→', endIdx)

const newFn = `  const handleSubmit = async () => {
    setError(null)

    if (!form.password) { setError('Please enter a password'); return }
    if (!strength.valid) {
      setError('Password must have 8+ chars, 1 uppercase, 1 number, 1 special character.')
      return
    }
    if (form.password !== form.confirm) { setError('Passwords do not match'); return }

    setSaving(true)
    try {
      const supabase = createClient()

      // 1. Update password (15s timeout guard)
      const { error } = await Promise.race([
        supabase.auth.updateUser({ password: form.password }),
        new Promise((resolve) =>
          setTimeout(() => resolve({ data: null, error: new Error('Connection timed out. Check your internet and try again.') }), 15000)
        ),
      ])

      if (error) {
        setError(error.message)
        toast.error(error.message)
        setSaving(false)
        return
      }

      // 2. Fire-and-forget: mark temp_password_used=true in DB so page reloads
      //    correctly skip Step 0 and start from Step 1.
      fetch('/api/onboarding/complete-step', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: 0 }),
      }).catch(() => {})

      // 3. Just advance to next step — onNext() = setStep(1), pure local React state.
      //    No page reload, no middleware, no JWT issues.
      toast.success('Password set! Continuing...')
      onNext()

    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
      toast.error('Something went wrong. Please try again.')
      setSaving(false)
    }
  }`

const newFile = file.slice(0, startIdx) + newFn + '\n' + file.slice(endIdx)
writeFileSync('./components/crm/onboarding-wizard.tsx', newFile, 'utf8')
console.log('Done! File patched successfully.')
