import { proportion } from "./util";

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

/** function finds the square length of a position */
export const posLengthSqr = (pos: pos) => pos.x*pos.x + pos.y*pos.y;
/** function finds the distance of a position */
export const posLength = (pos: pos) => Math.sqrt(posLengthSqr(pos));
/** function finds square distance between two positions */
export const posDistanceSqr = (a: pos, b: pos) => posLengthSqr(posSub(a, b));
/** function finds distance between two positions */
export const posDistance = (a: pos, b: pos) => posLength(posSub(a, b));
/** function determines whether 2 positions are within a given distance */
export const posWithin = (a: pos, b: pos, distance: number) => posLengthSqr(posSub(a, b)) <= distance*distance;

/** function changes a position to have a length of 1, while maintaining direction */
export const posNormalize = (pos: pos) => posDiv(pos, posLength(pos));
/** function changes a position to have a given length, while maintaining direction */
export const posWithLength = (pos: pos, length: number) => posMul(posNormalize(pos), length);

/** function takes a position and an anchor, and finds the position that is opposite to the given position */
export const getInvPos = (pos: pos, anchor: pos) => posSub(posMul(anchor, 2), pos);

/** function finds the position which is linearly interpolated between 2 positions */
export const posLerp = (a: pos, b: pos, t: number) => posAdd(posMul(a, 1-t), posMul(b, t));
/** function finds how far a position is between 2 other positions, linearly */
export const posInvLerp = (a: pos, b: pos, x: pos) => proportion(posDistance(a, x), posDistance(b, x));

/** function rounds position to nearest integer position */
export const posRound = (pos: pos): pos => ({ x: Math.round(pos.x), y: Math.round(pos.y) });