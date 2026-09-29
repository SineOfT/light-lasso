
const getSliderValue    = (x) => Math.round(Math.log10(x + 1) * 33.333); // 0-100
const getInvSliderValue = (x) => Math.round(Math.pow(10, x * 0.03) - 1); // 0-999

function SliderNumberInput({ title, id, value, onUpdateValue }) {

    const handleChangeSlider = (e) => {
        const newValue = parseInt(e.target.value);
        if (isNaN(newValue)) { return; }
        onUpdateValue(getInvSliderValue(newValue));
    }
    const handleChangeNumber = (e) => {
        const newValue = parseFloat(e.target.value);
        if (isNaN(newValue)) { return; }
        onUpdateValue(newValue);
    }

    const inputId = `${id}-input`;
    const sliderId = `${id}-slider-input`;
    const numberId = `${id}-number-input`;

    const sliderValue = getSliderValue(value);

    return (
        <fieldset id={inputId} className="slider-number-input">
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