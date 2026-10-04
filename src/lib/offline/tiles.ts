export function tileUrls(
  zooms: number[],
  south: number,
  north: number,
  west: number,
  east: number,
): string[] {
  const urls: string[] = []
  for (const zoom of zooms) {
    const span = 2 ** zoom
    const x0 = lonTile(west, span) - 1
    const x1 = lonTile(east, span) + 1
    const yNorth = latTile(north, span) - 1
    const ySouth = latTile(south, span) + 1
    for (let x = x0; x <= x1; x += 1) {
      for (let y = Math.max(0, yNorth); y <= ySouth; y += 1) {
        urls.push(`https://tile.openstreetmap.org/${zoom}/${x}/${y}.png`)
      }
    }
  }
  return urls
}

function lonTile(lng: number, span: number): number {
  return Math.floor(((lng + 180) / 360) * span)
}

function latTile(lat: number, span: number): number {
  const rad = (lat * Math.PI) / 180
  const merc = Math.log(Math.tan(rad) + 1 / Math.cos(rad))
  return Math.floor(((1 - merc / Math.PI) / 2) * span)
}
