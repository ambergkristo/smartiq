export default function PlayerNameInput({
  id = 'player-display-name',
  label = 'Your name',
  value,
  placeholder,
  disabled = false,
  onChange
}) {
  return (
    <label className="player-join-field" htmlFor={id}>
      <span>{label}</span>
      <input
        id={id}
        type="text"
        value={value}
        placeholder={placeholder}
        autoComplete="nickname"
        disabled={disabled}
        onChange={onChange}
      />
    </label>
  );
}
