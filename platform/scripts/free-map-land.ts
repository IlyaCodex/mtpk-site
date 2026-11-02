/**
 * Контур суши для карты без рекламы (apps/web/src/client/free-map.ts): без плиток, чужих подписей и границ.
 * Источник — Natural Earth 1:50m (общественное достояние). Около России контур подробнее, дальше грубее:
 * файл грузит браузер. Чукотка за 180° переносится вправо, к остальной России. Результат — free-map-land.json.
 *
 *   npx tsx scripts/free-map-land.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson';
const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../apps/web/src/client/free-map-land.json');

type Point = [number, number];
type Ring = Point[];
type Polygon = Ring[];
type Geometry = { type: 'Polygon'; coordinates: Polygon } | { type: 'MultiPolygon'; coordinates: Polygon[] };

const near = ([lon, lat]: Point) => lat > 30 && lon > 15;
/** Допуск и наименьший размер — в градусах меркатора: на экране карта в этой проекции. */
const tolerance = (p: Point) => (near(p) ? 0.06 : 0.4);
const mercator = ([lon, lat]: Point): Point => [lon, (Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)) * 180) / Math.PI];
const round = (n: number) => Math.round(n * 100) / 100;

function toSegment([x, y]: Point, [ax, ay]: Point, [bx, by]: Point): number {
  const dx = bx - ax;
  const dy = by - ay;
  const t = dx || dy ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy))) : 0;
  return Math.hypot(x - ax - t * dx, y - ay - t * dy);
}

/** Дуглас — Пекер для замкнутого контура: допуск зависит от места точки. */
function simplify(ring: Ring): Ring {
  const xy = ring.map(mercator);
  const last = ring.length - 1;
  const opposite = xy.reduce((best, p, i) => (Math.hypot(p[0] - xy[0]![0], p[1] - xy[0]![1]) > Math.hypot(xy[best]![0] - xy[0]![0], xy[best]![1] - xy[0]![1]) ? i : best), 0);
  const keep = new Set([0, opposite, last]);
  const stack: Point[] = [[0, opposite], [opposite, last]];
  while (stack.length) {
    const [a, b] = stack.pop()!;
    let worst = 1;
    let index = -1;
    for (let i = a + 1; i < b; i++) {
      const excess = toSegment(xy[i]!, xy[a]!, xy[b]!) / tolerance(ring[i]!);
      if (excess > worst) {
        worst = excess;
        index = i;
      }
    }
    if (index < 0) continue;
    keep.add(index);
    stack.push([a, index], [index, b]);
  }
  return ring.filter((_, i) => keep.has(i)).map(([lon, lat]): Point => [round(lon), round(lat)]);
}

function size(ring: Ring): number {
  const xy = ring.map(mercator);
  const xs = xy.map((p) => p[0]);
  const ys = xy.map((p) => p[1]);
  return Math.hypot(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
}

async function load(name: string): Promise<Polygon[]> {
  const res = await fetch(`${BASE}/${name}.geojson`);
  if (!res.ok) throw new Error(`${name}: ${res.status}`);
  const { features } = (await res.json()) as { features: { geometry: Geometry }[] };
  return features
    .flatMap(({ geometry: g }) => (g.type === 'Polygon' ? [g.coordinates] : g.coordinates))
    .filter((polygon) => polygon[0]!.some(([, lat]) => lat > -60)) // без Антарктиды
    .map((polygon) => polygon.map((ring) => (ring.every(([lon, lat]) => lon < -168 && lat > 60) ? ring.map(([lon, lat]): Point => [lon + 360, lat]) : ring)));
}

/** Мелкие острова и озёра не рисуются: nearMin — около России, farMin — дальше. */
function prepare(polygons: Polygon[], nearMin: number, farMin: number): Polygon[] {
  const big = (ring: Ring) => size(ring) >= (near(ring[0]!) ? nearMin : farMin);
  return polygons
    .filter((polygon) => big(polygon[0]!))
    .map((polygon) => polygon.filter(big).map(simplify))
    .filter((polygon) => polygon[0] && polygon[0].length >= 4);
}

const land = prepare(await load('ne_50m_land'), 0.25, 1.5);
const lakes = prepare(await load('ne_50m_lakes'), 0.6, 4);
const json = JSON.stringify({ land, lakes });
fs.writeFileSync(OUT, `${json}\n`);
const count = (list: Polygon[]) => list.flat(2).length;
console.log(`суша: контуров ${land.length}, точек ${count(land)}; озёра: ${lakes.length}, точек ${count(lakes)}; файл ${(json.length / 1024).toFixed(0)} КБ`);
