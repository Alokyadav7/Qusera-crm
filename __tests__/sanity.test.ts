import { describe, it, expect } from 'vitest'
import { cn } from '@/lib/utils'

describe('CRM Sanity Tests', () => {
  it('should correctly merge CSS class names', () => {
    const result = cn('text-red-500', 'bg-blue-500', { 'font-bold': true, 'italic': false })
    expect(result).toContain('text-red-500')
    expect(result).toContain('bg-blue-500')
    expect(result).toContain('font-bold')
    expect(result).not.toContain('italic')
  })
})
