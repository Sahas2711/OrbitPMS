import { HiOutlineBuildingOffice2 } from 'react-icons/hi2';

export default function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="min-h-svh flex items-center justify-center bg-bg-page px-4 py-8">
      <div className="w-full max-w-[480px]">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-[12px] bg-brand mb-4">
            <HiOutlineBuildingOffice2 className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-page-title font-bold text-text-primary m-0">
            OrbitPMS
          </h1>
          <p className="text-body text-text-secondary mt-1">
            Property Management System
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-bg-card rounded-card shadow-card p-8">
          <div className="mb-6">
            <h2 className="text-card-title font-semibold text-text-primary m-0">
              {title}
            </h2>
            {subtitle && (
              <p className="text-small text-text-secondary mt-1">{subtitle}</p>
            )}
          </div>

          {children}
        </div>

        {/* Footer */}
        <p className="text-caption text-text-muted text-center mt-6">
          &copy; {new Date().getFullYear()} OrbitPMS. All rights reserved.
        </p>
      </div>
    </div>
  );
}
