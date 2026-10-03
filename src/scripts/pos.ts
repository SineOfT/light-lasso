/** interface represents position in 2 dimensions */
export interface pos {
    x: number,
    y: number,
};

/** empty position, equal to (0, 0) */
export const EMPTY_POS: pos = { x: 0, y: 0 };

/** function adds 2 positions together */
export const posAdd = (a: pos, b: pos): pos => ({ x: a.x + b.x, y: a.y + b.y });
/** function subtracts the first position by the second position */
export const posSub = (a: pos, b: pos): pos => ({ x: a.x - b.x, y: a.y - b.y });
/** function multiplies a position by a scalar */
export const posMul = (a: pos, k: number): pos => ({ x: a.x * k, y: a.y * k });
/** function divides a position by a scalar, returning an empty position if the scalar is 0 */
export const posDiv = (a: pos, k: number): pos => k === 0 ? { ...EMPTY_POS } : ({ x: a.x / k, y: a.y / k });

/** function adds all the given positions together */
export const posAddAll = (...pos: pos[]) => pos.reduce((acc, p) => posAdd(acc, p), EMPTY_POS);
/** function finds the average of the given postions, returning an empty position if no positions are given */
export const posAvg = (...pos: pos[]) => pos.length === 0 ? { ...EMPTY_POS } : posDiv(posAddAll(...pos), pos.length);

/** function finds the square distance of a position from the origin */
export const posDistanceSqr = (pos: pos) => pos.x*pos.x + pos.y*pos.y;
/** function determines whether 2 positions are within a given distance */
export const posWithin = (a: pos, b: pos, distance: number) => posDistanceSqr(posSub(a, b)) <= distance*distance;
