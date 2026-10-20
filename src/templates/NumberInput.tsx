import type { ChangeEvent } from "react";

/** component defines input that updates number */
const NumberInput = ({
    id,
    title,
    disabled,
    value,
    onUpdateValue,
}: {
    /** ID to uniquely identify input */
    id: string,
    /** label added to left of input */
    title: string,
    /** whether the button can be clicked or not */
    disabled?: boolean,
    /** current number value of input */
    value: number,
    /** function updates value of state */
    onUpdateValue: (newValue: number) => void,
}) => {
    /** function handles updating value of state when input value changed */
    const onChange = (e: ChangeEvent<HTMLInputElement>) => {
        const newValue = parseFloat(e.target.value);
        if (isNaN(newValue)) { return; }
        onUpdateValue(newValue);
    }

    return (
        <div className="number-input input-inline">
            <label htmlFor={id}>{title}</label>
            <input type="number" id={id} disabled={disabled} value={parseFloat(value.toFixed(2))}
                onChange={onChange}
            />
        </div>
    );
}

export default NumberInput;
