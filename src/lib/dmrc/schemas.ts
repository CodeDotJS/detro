import { z } from "zod"

export const lineSchema = z.looseObject({
  line_code: z.string(),
  name: z.string(),
  line_color: z.string(),
  primary_color_code: z.string(),
  show_in_frontend: z.boolean(),
})

export const lineListSchema = z.array(lineSchema)

export const stationSchema = z.looseObject({
  station_code: z.string(),
  station_name: z.string(),
})

export const stationListSchema = z.array(stationSchema)

const pathStopSchema = z.looseObject({
  name: z.string(),
})

export const legSchema = z.looseObject({
  line: z.string(),
  path: z.array(pathStopSchema),
  start: z.string().optional(),
  end: z.string().optional(),
  towards_station: z.string().optional(),
  platform_name: z.string().optional(),
  "map-path": z.array(z.string()).optional(),
})

export const journeySchema = z.looseObject({
  from: z.string().optional(),
  to: z.string().optional(),
  total_time: z.string().nullable().optional(),
  fare: z.number().nullable().optional(),
  route: z.array(legSchema).optional(),
})

export const fareSchema = z.looseObject({
  weekday_fare: z.number().nullable().optional(),
  weekend_fare: z.number().nullable().optional(),
})

const serviceDetailSchema = z.looseObject({
  start_time: z.string().optional(),
  end_time: z.string().optional(),
})

export const serviceSchema = z.looseObject({
  first_train: z
    .looseObject({
      endstation_from_first_train_estimated_time: z.string().optional(),
      first_train_route_detail: z.array(serviceDetailSchema).optional(),
    })
    .optional(),
  last_train: z
    .looseObject({
      endstation_from_last_train_estimated_time: z.string().optional(),
      last_train_route_detail: z.array(serviceDetailSchema).optional(),
    })
    .optional(),
})
