
function InputSet({ title, children }) {
    return (
        <fieldset className="input-set">
            <legend>{title}</legend>
            {children}
        </fieldset>
    );
}

export default InputSet;