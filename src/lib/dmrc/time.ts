export function formatKolkataTimestamp(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date)
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? ""
  const hour = read("hour") === "24" ? "00" : read("hour")
  const millis = String(date.getMilliseconds()).padStart(3, "0")
  return `${read("year")}-${read("month")}-${read("day")}T${hour}:${read("minute")}:${read("second")}.${millis}`
}
