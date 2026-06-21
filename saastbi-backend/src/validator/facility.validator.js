import { z } from "zod";

export const facilityCreateSchema = z.object({
  name: z.string().min(1),
  type: z.string().optional(),
  description: z.string().optional(),
  location: z.string().optional(),
  totalUnits: z.number().int().positive().optional(),
  capacity: z.number().int().optional(),
  imageUrl: z.string().optional(),
  availableDays: z.array(z.string()).optional(),
  status: z.string().optional(),
});

export const timeslotSchema = z.object({
  dayOfWeek: z.string().min(1),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
});
