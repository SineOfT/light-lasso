
export const posAdd = (a, b) => ({ x: a.x + b.x, y: a.y + b.y });
export const posSub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });
export const posMul = (a, k) => ({ x: a.x * k,   y: a.y * k   });
export const posDiv = (a, k) => k === 0 ? 0 : ({ x: a.x / k, y: a.y / k });

export const posAddAll = (...pos) => pos.reduce((acc, p) => posAdd(acc, p), { x: 0, y: 0 });
export const posAvg = (...pos) => pos.length === 0 ? 0 : posDiv(posAddAll(...pos), pos.length);

export const numAddAll = (...num) => num.reduce((acc, x) => acc + x, 0);
export const numAvg = (...num) => num.length === 0 ? 0 : (numAddAll(...num) / num.length);

export const posDistanceSqr = (pos) => pos.x*pos.x + pos.y*pos.y;
export const posWithin = (a, b, distance) => posDistanceSqr(posSub(a, b)) <= distance*distance;

export const lerp = (a, b, t) => a * (1-t) + b * t;
export const invLerp = (a, b, x) =>  (x - a) / (b - a);

export const generateId = (existingIds) => {
    const generateRandom4BitHex = () => Math.round(Math.random() * 0x10000).toString(16);
    const id = `${generateRandom4BitHex()}-${generateRandom4BitHex()}-${generateRandom4BitHex()}`;
    if (existingIds.includes(id)) { return generateId(existingIds); }
    return id;
}