export default function Button({
  type = 'button',
  loading = false,
  disabled = false,
  children,
  className = 'btn btn-primary',
  loadingText = 'Please wait...',
  ...rest
}) {
  return (
    <button type={type} className={className} disabled={disabled || loading} {...rest}>
      {loading ? loadingText : children}
    </button>
  );
}
