import React from 'react';

interface EnvironmentBannerProps {
  isTestnet: boolean;
}

export function EnvironmentBanner({ isTestnet }: EnvironmentBannerProps) {
  if (!isTestnet) return null;

  return (
    <div className="environment-banner">
      🚧 TEST ENVIRONMENT 🚧
    </div>
  );
}
