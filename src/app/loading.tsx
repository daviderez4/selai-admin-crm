import Image from 'next/image';

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900" dir="rtl">
      <div className="flex flex-col items-center gap-6">
        <Image
          src="/sela-logo.png"
          alt="סלע ביטוח"
          width={180}
          height={180}
          className="animate-pulse"
          priority
        />
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
          <div className="h-2 w-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
          <div className="h-2 w-2 bg-blue-500 rounded-full animate-bounce" />
        </div>
        <p className="text-slate-400 text-sm">טוען...</p>
      </div>
    </div>
  );
}
