import { getCurvePointLocation, type Curve } from "../scripts/curve";
import { RADIUS_POINT_TYPE } from "../scripts/dataPoint";
import DataPointCurveEditor from "../templates/DataPointCurveEditor";

import type { PointUpdaterFunctions, SelectedPoint } from "../scripts/point";
import type { DataPoint } from "../scripts/dataPoint";

const DataControls = ({
    radiusPoints,
    curves,
    selectedPoint,
    onUpdateState,
}: {
    radiusPoints: Map<string, DataPoint>,
    curves: Map<string, Curve>,
    selectedPoint: SelectedPoint|null,
    onUpdateState: (data: PointUpdaterFunctions|undefined) => void,
}) => {

    if (selectedPoint === null) { return; }

    const pointLocation = getCurvePointLocation(radiusPoints, curves, selectedPoint.id);
    if (pointLocation === undefined) { return; }
    const { curvePoints } = pointLocation;

    return (
        <DataPointCurveEditor
            dataPointType={RADIUS_POINT_TYPE}
            dataPoints={radiusPoints}
            curves={curves}
            curve={curvePoints}
            selectedPoint={selectedPoint}
            onUpdateState={onUpdateState}
        />
    )
}

export default DataControls;