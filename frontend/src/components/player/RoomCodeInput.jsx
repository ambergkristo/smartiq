export default function RoomCodeInput({
  id = 'player-room-code',
  label = 'Room code',
  value,
  placeholder,
  disabled = false,
  readOnly = false,
  onChange = null
}) {
  return (
    <label className="player-join-field player-join-field--code" htmlFor={id}>
      <span>{label}</span>
      <input
        id={id}
        type="text"
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        inputMode="text"
        disabled={disabled}
        readOnly={readOnly}
        onChange={onChange}
      />
    </label>
  );
}
