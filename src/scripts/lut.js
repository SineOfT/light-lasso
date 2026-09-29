import { posAdd, posSub, posMul, posAddAll, invLerp } from './util';

const LUT_STEP = 0.1;

export function generateLut(points) {
    if (points.length < 2) { return; }
    points.sort((a, b) => a.t - b.t);
    
    let lut = [];

    let p1 = points[0].pos;
    let p2 = points[1].pos;
    let p0 = posSub(posMul(p1, 2), p2);
    let p3 = points.length === 2 ? posSub(posMul(p2, 2), p1) : points[2].pos;
    
    let currT = points[0].t;
    let prevT = points[0].t;
    let nextT = points[1].t;

    for (let i = 1; i < points.length; i++) {
        // Catmut-Rom Spline
        const a0 =                                    p1                                            ;
        const a1 = posAddAll(posMul(p0, -0.5),                   posMul(p2,  0.5)                  );
        const a2 = posAddAll(posMul(p0,  1  ), posMul(p1, -2.5), posMul(p2,  2  ), posMul(p3, -0.5));
        const a3 = posAddAll(posMul(p0, -0.5), posMul(p1,  1.5), posMul(p2, -1.5), posMul(p3,  0.5));
        
        while (currT < nextT) {
            const t = invLerp(prevT, nextT, currT);
            const pos = posAdd(posMul(posAdd(posMul(posAdd(posMul(a3, t), a2), t), a1), t), a0);
            lut.push(pos);
            currT += LUT_STEP;
        }

        if (i < points.length - 1) {
            p0 = p1;
            p1 = p2;
            p2 = p3;
            p3 = i === points.length - 2 ? posSub(posMul(p2, 2), p1) : points[i+2].pos;
            
            prevT = nextT;
            nextT = points[i+1].t;
        }
    }

    return lut;
}
