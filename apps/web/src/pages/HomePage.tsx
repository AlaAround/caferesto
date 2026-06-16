import { Link } from 'react-router-dom';
import { QrCode, Shield, Zap, Smartphone, ArrowRight } from 'lucide-react';
import { VENUE_HERO } from '../lib/menu-images';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-surface-dark text-white">
      {/* Hero */}
      <div className="relative h-72 overflow-hidden">
        <img src={VENUE_HERO} alt="Restaurant" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-surface-dark/30 via-surface-dark/70 to-surface-dark" />
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-8 px-6 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-brand-600 rounded-2xl mb-4 shadow-float">
            <QrCode className="w-7 h-7" />
          </div>
          <h1 className="font-display text-4xl font-bold mb-2">TableOrder</h1>
          <p className="text-gray-300 text-lg max-w-xs">
            Scan, order, enjoy — no app download required.
          </p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-6 py-8">
        <div className="space-y-3 mb-10">
          {[
            { icon: Smartphone, title: 'Scan QR at your table', desc: 'Opens instantly in your browser', color: 'bg-brand-600/15 text-brand-400' },
            { icon: Shield, title: 'Secure location check', desc: 'Ensures you\'re physically at the venue', color: 'bg-ocean-500/15 text-ocean-500' },
            { icon: Zap, title: 'Live order tracking', desc: 'Watch your order progress in real time', color: 'bg-amber-500/15 text-amber-400' },
          ].map(({ icon: Icon, title, desc, color }) => (
            <div key={title} className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-sm">{title}</p>
                <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <Link
            to="/venue/restoran-el-bhar/table/7"
            className="btn-primary flex items-center justify-center gap-2 w-full"
          >
            Demo: Table 7 at El Bhar
            <ArrowRight className="w-5 h-5" />
          </Link>
          <Link
            to="/staff/restoran-el-bhar"
            className="block w-full text-center py-3.5 rounded-2xl text-gray-400 border border-white/10 hover:bg-white/5 transition-colors text-sm font-medium"
          >
            Staff Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
