'use client'

import { useEffect, useState, useCallback } from 'react'
import ClassroomCard from '../components/classroom-card'
import { SCHOOL_YEARS, getCurrentSchoolYear } from '@/lib/school-year'

interface Teacher {
  id: string
  name: string
  positionControlNumber?: string | null
  credentials?: string | null
  isVacancy: boolean
  classroom?: {
    id: string
    programSilo: string
    gradeStart: string
    gradeEnd: string
    site: { id: string; name: string }
  } | null
}

interface Classroom {
  id: string
  programSilo: string
  gradeStart: string
  gradeEnd: string
  sessionType: string
  sessionNumber?: string | null
  positionControlNumber?: string | null
  maxCapacity?: number | null
  isOpenPosition: boolean
  site: { name: string }
  teacher?: { id: string; name: string; positionControlNumber?: string | null } | null
  paras: Array<{ id: string; name: string; role: string; isVacancy: boolean }>
  studentPlacements: Array<{
    id: string
    studentNameFirst: string
    studentNameLast: string
    grade: string
    primaryDisability?: string | null
    enrollmentStatus: string
    requires1to1: boolean
    seisConfirmed: boolean
    aeriesConfirmed: boolean
  }>
  _count?: { studentPlacements: number }
}

export default function ByTeacherPage() {
  const [schoolYear, setSchoolYear] = useState<string>(getCurrentSchoolYear())
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('')
  const [classroom, setClassroom] = useState<Classroom | null>(null)
  const [teachersLoading, setTeachersLoading] = useState(false)
  const [classroomLoading, setClassroomLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch teachers when school year changes
  const fetchTeachers = useCallback(async (year: string) => {
    setTeachersLoading(true)
    setError(null)
    setSelectedTeacherId('')
    setClassroom(null)
    try {
      const res = await fetch(
        `/api/staff?role=TEACHER&schoolYear=${encodeURIComponent(year)}&isActive=true`
      )
      if (!res.ok) throw new Error('Failed to load teachers')
      const data = await res.json()
      setTeachers(data.staffMembers ?? [])
    } catch {
      setError('Could not load teachers.')
      setTeachers([])
    } finally {
      setTeachersLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTeachers(schoolYear)
  }, [schoolYear, fetchTeachers])

  // When teacher selected, fetch their classroom
  const fetchClassroom = useCallback(
    async (teacherId: string) => {
      if (!teacherId) {
        setClassroom(null)
        return
      }

      // Find the teacher's classroomId from the already-fetched list
      const teacher = teachers.find((t) => t.id === teacherId)
      if (!teacher?.classroom?.id) {
        setClassroom(null)
        return
      }

      setClassroomLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/classrooms/${teacher.classroom.id}`)
        if (!res.ok) throw new Error('Failed to load classroom')
        const data = await res.json()
        setClassroom(data.classroom ?? null)
      } catch {
        setError('Could not load classroom details.')
        setClassroom(null)
      } finally {
        setClassroomLoading(false)
      }
    },
    [teachers]
  )

  function handleTeacherChange(teacherId: string) {
    setSelectedTeacherId(teacherId)
    fetchClassroom(teacherId)
  }

  const selectedTeacher = teachers.find((t) => t.id === selectedTeacherId)
  const teacherHasClassroom = selectedTeacher?.classroom != null

  return (
    <div>
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.2em] text-warm-gray-500 mb-1">Classrooms</p>
        <h1 className="text-2xl font-semibold text-warm-gray-900">By Teacher</h1>
        <p className="text-sm text-warm-gray-600 mt-0.5">
          Find a teacher&apos;s classroom and student roster
        </p>
      </div>

      {/* Controls row */}
      <div className="flex flex-wrap items-end gap-4 mb-6">
        {/* School year selector */}
        <div>
          <label
            htmlFor="year-select"
            className="block text-sm font-medium text-warm-gray-700 mb-1.5"
          >
            School Year
          </label>
          <select
            id="year-select"
            value={schoolYear}
            onChange={(e) => setSchoolYear(e.target.value)}
            className="block rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-warm-gray-900 shadow-sm focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
          >
            {SCHOOL_YEARS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        {/* Teacher selector */}
        <div className="flex-1 min-w-[260px] max-w-sm">
          <label
            htmlFor="teacher-select"
            className="block text-sm font-medium text-warm-gray-700 mb-1.5"
          >
            Teacher
          </label>
          {teachersLoading ? (
            <div className="h-9 w-full bg-gray-100 rounded animate-pulse" />
          ) : (
            <select
              id="teacher-select"
              value={selectedTeacherId}
              onChange={(e) => handleTeacherChange(e.target.value)}
              className="block w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-warm-gray-900 shadow-sm focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            >
              <option value="">-- Select a teacher --</option>
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.name}
                  {teacher.positionControlNumber ? ` (PC# ${teacher.positionControlNumber})` : ''}
                  {teacher.isVacancy ? ' [VACANCY]' : ''}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Results */}
      {!selectedTeacherId && !teachersLoading && (
        <div className="text-center py-16 text-warm-gray-400">
          <p className="text-sm">Select a teacher above to view their classroom.</p>
        </div>
      )}

      {selectedTeacherId && classroomLoading && (
        <div className="text-center py-16 text-warm-gray-400">
          <p className="text-sm">Loading classroom&hellip;</p>
        </div>
      )}

      {selectedTeacherId && !classroomLoading && !teacherHasClassroom && !error && (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-warm-gray-600 font-medium">
            Not assigned to a classroom for this school year
          </p>
          {selectedTeacher && (
            <p className="mt-1 text-xs text-warm-gray-400">
              {selectedTeacher.name} has no classroom assignment in {schoolYear}.
            </p>
          )}
        </div>
      )}

      {selectedTeacherId && !classroomLoading && teacherHasClassroom && classroom && (
        <div className="space-y-4">
          {/* Summary header */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-warm-gray-800">
                {selectedTeacher?.name}&apos;s Classroom
              </p>
              <p className="text-xs text-warm-gray-500 mt-0.5">
                {classroom.studentPlacements.length} student
                {classroom.studentPlacements.length !== 1 ? 's' : ''} enrolled
              </p>
            </div>
          </div>

          {/* Classroom card */}
          <div className="max-w-lg">
            <ClassroomCard classroom={classroom} />
          </div>
        </div>
      )}
    </div>
  )
}
