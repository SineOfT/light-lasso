
function Button({ title, disabled, onClick }) {
    return (
        <button type="button" className="button-input" disabled={disabled} onClick={onClick}>
            {title}
        </button>
    );
}

export default Button;