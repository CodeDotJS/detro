export function backgroundOrder(list: { shell: string[]; snapshot: string[] }): string[][] {
  const shell: string[] = []
  const tiles: string[] = []
  for (const url of list.shell) {
    if (url === "/sw.js") continue
    if (url.startsWith("/map-tiles/")) tiles.push(url)
    else shell.push(url)
  }
  const journeys: string[] = []
  const briefs: string[] = []
  for (const url of list.snapshot) {
    if (url.startsWith("/snapshot/en/journeys/")) journeys.push(url)
    else briefs.push(url)
  }
  return [shell, journeys, briefs, tiles]
}

export function classifyPrecache(urls: string[]): { shell: string[]; snapshot: string[] } {
  const shell = ["/"]
  const snapshot: string[] = []
  for (const url of urls) {
    if (url === "/" || url === "/precache.json") continue
    if (url.startsWith("/snapshot/")) snapshot.push(url)
    else shell.push(url)
  }
  return { shell, snapshot }
}
