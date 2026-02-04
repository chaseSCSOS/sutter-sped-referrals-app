import { z } from 'zod'

export const orderItemSchema = z.object({
  itemName: z.string().min(1, 'Item name is required'),
  itemLink: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  estimatedPrice: z.number().min(0.01, 'Price must be greater than 0'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
})

export const orderSchema = z.object({
  items: z.array(orderItemSchema).min(1, 'At least one item is required'),
  schoolSite: z.string().min(1, 'School/site is required'),
  justification: z.string().min(20, 'Please provide a detailed justification (at least 20 characters)'),
})

export type OrderItemData = z.infer<typeof orderItemSchema>
export type OrderFormData = z.infer<typeof orderSchema>
