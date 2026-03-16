'use client'

import { useRouter } from 'next/navigation'
import { SCHOOL_YEARS, getCurrentSchoolYear } from '@/lib/school-year'

const COOKIE_KEY = 'spedex-school-year'

function getStoredYear(): string {
  if (typeof document === 'undefined') return getCurrentSchoolYear()
  const match = document.cookie.match(new RegExp(`${COOKIE_KEY}=([^;]+)`))
  return match ? match[1] : getCurrentSchoolYear()
}

export function SchoolYearSwitcher() {
  const router = useRouter()

  function handleChange(year: string) {
    document.cookie = `${COOKIE_KEY}=${year}; path=/; max-age=31536000`
    router.refresh()
  }

  const current = getStoredYear()

  return (
    <div className="px-3 py-2">
      <label className="block text-xs text-gray-500 mb-1">School Year</label>
      <select
        defaultValue={current}
        onChange={(e) => handleChange(e.target.value)}
        className="w-full text-sm rounded-lg border border-gray-200 bg-white px-2 py-1.5 shadow-sm"
      >
        {SCHOOL_YEARS.map((y) => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>
    </div>
  )
}
