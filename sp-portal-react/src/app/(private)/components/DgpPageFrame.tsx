// @ts-nocheck
export function DgpPageFrame({ children, maxWidthClassName = 'w-full', containerClassName = 'w-full px-4', className = '' }) {
  return (
    <div className={containerClassName}>
      <div className={`${maxWidthClassName} mx-auto ${className}`}>
        {children}
      </div>
    </div>
  );
}
