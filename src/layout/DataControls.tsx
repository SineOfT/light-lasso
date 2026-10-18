import { getCurvePointLocation, type Curve } from "../scripts/curve";
import { RADIUS_POINT_TYPE } from "../scripts/dataPoint";
import DataPointCurveEditor from "../templates/DataPointCurveEditor";

import type { PointUpdaterFunctions, SelectedPoint } from "../scripts/point";
import type { DataPoint } from "../scripts/dataPoint";
import type { LutPoint } from "../scripts/lut";

/** component defines controls for the data associated with each point, with a data curve editor */
const DataControls = ({
    radiusPoints,
    curves,
    radiusLuts,
    selectedPoint,
    onUpdateState,
}: {
    /** a record of all existing radius data points */
    radiusPoints: Map<string, DataPoint>,
    /** a record of all existing curves */
    curves: Map<string, Curve>,
    /** a LUT for each radius data curve */
    radiusLuts: Map<string, LutPoint<number>[]>,
    /** point currently selected, or null if none selected */
    selectedPoint: SelectedPoint|null,
    /** function updates states based on updater function */
    onUpdateState: (data: PointUpdaterFunctions|undefined) => void,
}) => {
    // if no point selected, nothing to show
    if (selectedPoint === null) { return <></>; }

    // get location of selected point, skipping if selected point does not have radius data
    const pointLocation = getCurvePointLocation(radiusPoints, curves, selectedPoint.id);
    if (pointLocation === undefined) { return <></>; }
    const { curveId, curvePoints } = pointLocation;

    // find corresponding LUT for selected curve, using an empty LUT if doesn't exist yet
    const radiusLut = radiusLuts.get(curveId) ?? [];

    return (
        <DataPointCurveEditor
            dataPointType={RADIUS_POINT_TYPE}
            dataPoints={radiusPoints}
            curves={curves}
            curve={curvePoints}
            dataLut={radiusLut}
            selectedPoint={selectedPoint}
            onUpdateState={onUpdateState}
        />
    );
}

export default DataControls;