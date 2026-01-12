import { ReactNode } from 'react';

interface FeatureCardProps {
  icon: ReactNode;
  iconBg: string;
  title: string;
  subtitle: string;
}

export function FeatureCard({ icon, iconBg, title, subtitle }: FeatureCardProps) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-100 hover:shadow-xl transition-shadow">
      <div className={`w-12 h-12 ${iconBg} rounded-xl flex items-center justify-center mb-4`}>
        {icon}
      </div>
      <h3 className="font-semibold text-slate-800">{title}</h3>
      <p className="text-sm text-slate-400">{subtitle}</p>
    </div>
  );
}
