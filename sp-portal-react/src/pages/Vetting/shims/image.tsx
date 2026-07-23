// Local stand-in for 'next/image' — renders a plain <img>.

import type { ImgHTMLAttributes } from 'react';

interface ImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  priority?: boolean;
  fill?: boolean;
  unoptimized?: boolean;
}

export default function Image({
  priority: _priority,
  fill: _fill,
  unoptimized: _unoptimized,
  ...rest
}: ImageProps) {
  return <img {...rest} />;
}
