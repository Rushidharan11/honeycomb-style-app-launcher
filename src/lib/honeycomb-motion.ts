export type Point = { x: number; y: number };

export function panWithFinger(origin: Point, start: Point, current: Point): Point {
  return { x: origin.x + current.x - start.x, y: origin.y + current.y - start.y };
}

export function wrapCoordinate(value: number, period: number): number {
  return ((value % period) + period) % period;
}