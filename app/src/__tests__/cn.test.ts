import { describe, it, expect } from 'vitest'
import { cn } from '../utils/cn'

describe('cn', () => {
  it('returns empty string when called with no arguments', () => {
    expect(cn()).toBe('')
  })

  it('returns a single class unchanged', () => {
    expect(cn('foo')).toBe('foo')
  })

  it('joins multiple classes with a space', () => {
    expect(cn('foo', 'bar', 'baz')).toBe('foo bar baz')
  })

  it('ignores falsy values (false, null, undefined, 0)', () => {
    expect(cn('foo', false, null, undefined, 0 as never, 'bar')).toBe('foo bar')
  })

  it('includes truthy conditional classes', () => {
    const active = true
    expect(cn('base', active && 'active')).toBe('base active')
  })

  it('excludes falsy conditional classes', () => {
    const active = false
    expect(cn('base', active && 'active')).toBe('base')
  })

  it('accepts object syntax — includes keys whose value is truthy', () => {
    expect(cn({ foo: true, bar: false, baz: true })).toBe('foo baz')
  })

  it('accepts array syntax', () => {
    expect(cn(['foo', 'bar'])).toBe('foo bar')
  })

  it('accepts nested arrays', () => {
    expect(cn(['foo', ['bar', 'baz']])).toBe('foo bar baz')
  })

  it('resolves Tailwind conflicts — last padding wins', () => {
    expect(cn('p-4', 'p-8')).toBe('p-8')
  })

  it('resolves Tailwind conflicts — last text color wins', () => {
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500')
  })

  it('resolves Tailwind conflicts — more specific variant does not clobber base', () => {
    // hover:text-blue-500 and text-red-500 are different slots
    const result = cn('text-red-500', 'hover:text-blue-500')
    expect(result).toContain('text-red-500')
    expect(result).toContain('hover:text-blue-500')
  })

  it('handles mixed array / object / string inputs', () => {
    const result = cn('base', ['extra'], { active: true, disabled: false })
    expect(result).toBe('base extra active')
  })

  it('trims superfluous whitespace from class strings', () => {
    // clsx normalises; twMerge passes through, but result should not have double spaces
    expect(cn('  foo  ', '  bar  ')).not.toContain('  ')
  })
})
