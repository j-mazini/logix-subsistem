// Local stand-in for 'next/link' on top of react-router-dom.

import { Link as RouterLink } from 'react-router-dom';
import type { AnchorHTMLAttributes, ReactNode } from 'react';

interface LinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  href: string;
  children?: ReactNode;
  prefetch?: boolean;
}

export default function Link({ href, children, prefetch: _prefetch, ...rest }: LinkProps) {
  return (
    <RouterLink to={href} {...rest}>
      {children}
    </RouterLink>
  );
}
