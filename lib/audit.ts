import type { PrismaClient } from '@prisma/client'

interface AuditParams {
  entityType: string
  entityId: string
  field: string
  oldValue?: string | null
  newValue?: string | null
  changedBy: string
  studentId?: string | null
}

type TxClient = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>

export async function createAuditEntry(tx: TxClient, params: AuditParams) {
  return tx.placementAuditLog.create({
    data: {
      entityType: params.entityType,
      entityId: params.entityId,
      field: params.field,
      oldValue: params.oldValue ?? null,
      newValue: params.newValue ?? null,
      changedBy: params.changedBy,
      studentId: params.studentId ?? null,
      changedAt: new Date(),
    },
  })
}
