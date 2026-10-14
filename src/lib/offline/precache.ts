export type WarmGroups = {
  shell: string[]
  journeys: string[]
  tiles: string[]
}

/** Split the build list into warm phases. Station briefs stay out — they ship in the JS bundle. */
export function backgroundOrder(list: { shell: string[]; snapshot: string[] }): WarmGroups {
  const pages: string[] = []
  const assets: string[] = []
  const other: string[] = []
  const tiles: string[] = []
  for (const url of list.shell) {
    if (url === "/sw.js") continue
    if (url.startsWith("/map-tiles/")) tiles.push(url)
    else if (url === "/" || url === "/index.html") pages.push(url)
    else if (url.startsWith("/assets/")) assets.push(url)
    else other.push(url)
  }
  const journeys: string[] = []
  for (const url of list.snapshot) {
    if (url.startsWith("/snapshot/en/journeys/")) journeys.push(url)
  }
  return {
    shell: [...pages, ...assets, ...other],
    journeys,
    tiles,
  }
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
