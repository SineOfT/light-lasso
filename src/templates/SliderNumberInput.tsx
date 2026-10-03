import type { ChangeEvent } from 'react';
import '../styles/Input.css';

/** function gets slider value (0-100) from value of input */
const getSliderValue    = (x: number) => Math.round(Math.log10(x + 1) * 33.333);
/** function gets value of input from slider value (0-100) */
const getInvSliderValue = (x: number) => Math.round(Math.pow(10, x * 0.03) - 1);

/**
 * component defines numerical input that can be assigned through slider or number input
 */
const SliderNumberInput = ({
    title,
    id,
    value,
    onUpdateValue,
}: {
    /** title label placed above inputs */
    title: string,
    /** ID to uniquely identify inputs */
    id: string,
    /** current value of input */
    value: number,
    /** function sets value of input */
    onUpdateValue: (newValue: number) => void,
}) => {
    /**
     * function handles a change to the value of the slider input
     * by updating the value of the input and the display on the number input
     * @param e event provided by the event listener
     */
    const handleChangeSlider = (e: ChangeEvent<HTMLInputElement>) => {
        const newValue = parseInt(e.target.value);
        if (isNaN(newValue)) { return; }
        onUpdateValue(getInvSliderValue(newValue));
    }

    /**
     * function handles a change to the value of the number input
     * by updating the value of the input and the display on the slider input
     * @param e event provided by the event listener
     */
    const handleChangeNumber = (e: ChangeEvent<HTMLInputElement>) => {
        const newValue = parseFloat(e.target.value);
        if (isNaN(newValue)) { return; }
        onUpdateValue(newValue);
    }

    // create unique IDs for inputs
    const sliderId = `${id}-slider-input`;
    const numberId = `${id}-number-input`;

    // calculate value of slider from value of input
    const sliderValue = getSliderValue(value);

    return (
        <fieldset className="slider-number-input">
            <legend>{title}</legend>
            <div className="slider-input">
                <label htmlFor={sliderId}>Slider</label>
                <input type="range" id={sliderId} min="0" max="100" value={sliderValue}
                    onChange={handleChangeSlider}
                />
            </div>
            <div className="number-input">
                <label htmlFor={numberId}>Number</label>
                <input type="number" id={numberId} value={value}
                    onChange={handleChangeNumber}
                />
            </div>
        </fieldset>
    );
}

export default SliderNumberInput;