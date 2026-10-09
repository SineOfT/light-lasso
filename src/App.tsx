import { useState, useEffect } from 'react';
import Main from './layout/Main';
import Sidebar from './layout/Sidebar';
import LocalControls from './layout/LocalControls';
import './styles/App.css'

import type { pos } from './scripts/pos';
import { type point, type selectedPoint } from './scripts/point';
import type { curve } from './scripts/curve';
import type { pointData } from './scripts/pointData';

/** type defines set of functions that can be returned by updater to update state */
export type stateUpdaterFunctions = {
    updatePoints?: (prevPoints: Map<string, point>) => Map<string, point>,
    updatePointDatas?: (prevPointDatas: Map<string, pointData>) => Map<string, pointData>,
    updateCurves?: (prevCurves: Map<string, curve>) => Map<string, curve>,
    newSelectedPoint?: selectedPoint|null,
}

const App = () => {
    // the dimensions of the editable canvas, as an (x,y) position
    const [resolution, setResolution] = useState<pos>({ x: 0, y: 0 });
    // a record of all existing points
    const [points, setPoints] = useState<Map<string, point>>(new Map());
    // a record of all radius points on each curve
    const [radiusDatas, setRadiusDatas] = useState<Map<string, pointData>>(new Map());
    // a record of all existing curves
    const [curves, setCurves] = useState<Map<string, curve>>(new Map());
    // the point that is currently selected
    const [selectedPoint, setSelectedPoint] = useState<selectedPoint|null>(null);

    // effect updates states to temporary mock starting data
    useEffect(() => {
        setResolution({ x: 1024, y: 1024 });
        setPoints(new Map([
            ['0', {
                controlPos: { x: 0,   y: 0   },
                anchorPos:  { x: 50,  y: 50  },
            }],
            ['1', {
                controlPos: { x: 500, y: 500 },
                anchorPos:  { x: 600, y: 300 },
            }],
        ]));
        setCurves(new Map([
            ['1', ['0', '1']],
        ]));

    }, []);

    /**
     * function applies updates to states dictated by return value of updater function
     * @param data the updater functions returned after calling an updater
     */
    const handleUpdateState = (data: stateUpdaterFunctions|undefined) => {
        // if updater functions undefined, skip
        if (data === undefined) { return; }

        // apply updates to states
        if (data.updatePoints !== undefined) {
            setPoints(data.updatePoints);
        }
        if (data.updateCurves !== undefined) {
            setCurves(data.updateCurves);
        }
        if (data.updatePointDatas !== undefined) {
            setRadiusDatas(data.updatePointDatas);
        }
        if (data.newSelectedPoint !== undefined) {
            setSelectedPoint(data.newSelectedPoint);
        }
    }

    return (<>
        <Main
            resolution={resolution}
            points={points}
            curves={curves}
            selectedPoint={selectedPoint}
            onUpdateState={handleUpdateState}
        />
        <Sidebar direction="right" zIndex={1}>
            <LocalControls
                points={points}
                radiusDatas={radiusDatas}
                curves={curves}
                selectedPoint={selectedPoint}
                onUpdateState={handleUpdateState}
            />
        </Sidebar>
        <Sidebar direction="bottom" zIndex={2}></Sidebar>
    </>);
}

export default App;
