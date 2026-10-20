import NumberInput from './NumberInput';

import type { pos } from '../scripts/pos';

/** component defines input that updates positions */
export const PosInput = ({
    id,
    pos,
    onUpdatePos,
}: {
    /** ID to uniquely identify input */
    id: string,
    /** current position of input */
    pos: pos,
    /** function updates position of current position, ignoring unset keys */
    onUpdatePos: (changedPos: Partial<pos>) => void,
}) => {
    /** function handles updating x value of position */
    const handleUpdateX = (newX: number) => { onUpdatePos({ x: newX }); }

    /** function handles updating y value of position */
    const handleUpdateY = (newY: number) => { onUpdatePos({ y: newY }); }

    // create IDs for each input
    const xInputId = `${id}-x-input`;
    const yInputId = `${id}-y-input`;

    return (<>
        <NumberInput id={xInputId} title="X" value={pos.x} onUpdateValue={handleUpdateX} />
        <NumberInput id={yInputId} title="Y" value={pos.y} onUpdateValue={handleUpdateY} />
    </>);
}

export default PosInput;
