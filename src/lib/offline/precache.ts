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
