const BASE = "http://10.109.226.206:5000";

export function imgUrl(url) {
  if (!url) return null;
  if (url.startsWith("blob:")) return url;
  if (url.startsWith("http")) return url;
  // relative path like /uploads/abc123.jpg
  return `${BASE}${url}`;
}

export default function NgrokImg({ src, alt, style, onError }) {
  if (!src) return null;

  const fullUrl = imgUrl(src);
  if (!fullUrl) return null;

  return (
    <img
      src={fullUrl}
      alt={alt}
      style={style}
      onError={onError}
    />
  );
}