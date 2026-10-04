import type { Copy } from "../../i18n/copy"
import { formatClock } from "./clock"
import type { Journey, ServiceTrain } from "./types"

export function journeySteps(journey: Journey, text: Copy): string[] {
  const steps: string[] = []
  journey.legs.forEach((leg, index) => {
    if (index === 0) steps.push(text.goTo(leg.startName))
    const take = leg.towards ? text.takeTowards(leg.lineName, leg.towards) : text.takeLine(leg.lineName)
    steps.push(leg.platform ? `${take} ${text.platform(leg.platform)}` : take)
    if (leg.rideStops !== null) steps.push(text.travelStops(leg.rideStops))
    if (index < journey.legs.length - 1) steps.push(text.changeAt(leg.endName))
    else steps.push(text.getOff(leg.endName))
  })
  const first = spokenTrain(journey.trains.first, text)
  const last = spokenTrain(journey.trains.last, text)
  if (first) steps.push(`${text.firstTrain}. ${first}`)
  if (last) steps.push(`${text.lastTrain}. ${last}`)
  return steps
}

function spokenTrain(train: ServiceTrain | null, text: Copy): string | null {
  if (!train) return null
  const depart = formatClock(train.depart)
  const arrive = formatClock(train.arrive)
  if (!depart || !arrive) return null
  return text.trainRun(depart, arrive)
}
