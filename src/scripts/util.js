
export const posAdd = (a, b) => ({ x: a.x + b.x, y: a.y + b.y });
export const posSub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });
export const posMul = (a, k) => ({ x: a.x * k,   y: a.y * k   });

export const posAddAll = (...pos) => pos.reduce((acc, p) => posAdd(acc, p), { x: 0, y: 0 });

export const posDistanceSqr = (pos) => pos.x*pos.x + pos.y*pos.y;
export const posWithin = (a, b, distance) => posDistanceSqr(posSub(a, b)) <= distance*distance;

export const lerp = (a, b, t) => a * (1-t) + b * t;
export const invLerp = (a, b, x) =>  (x - a) / (b - a);
