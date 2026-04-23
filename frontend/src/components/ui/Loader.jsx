export default function Loader({ fullScreen = false, text = 'Loading...' }) {
  return (
    <div className={fullScreen ? 'page-loader' : 'inline-loader'}>
      <div className="spinner" />
      {text ? <span>{text}</span> : null}
    </div>
  );
}
