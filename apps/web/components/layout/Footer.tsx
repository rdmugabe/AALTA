import Link from 'next/link';
import { Building2 } from 'lucide-react';

const footerNavigation = {
  main: [
    { name: 'Facilities', href: '/facilities' },
    { name: 'Reports', href: '/reports' },
    { name: 'Rankings', href: '/rankings' },
    { name: 'Methodology', href: '/methodology' },
    { name: 'About', href: '/about' },
    { name: 'Contact', href: '/contact' },
  ],
  legal: [
    { name: 'Privacy Policy', href: '/privacy' },
    { name: 'Terms of Service', href: '/terms' },
    { name: 'Data Sources', href: '/data-sources' },
  ],
};

export function Footer() {
  return (
    <footer className="bg-slate-900">
      <div className="container-page py-12 md:py-16">
        <div className="xl:grid xl:grid-cols-3 xl:gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-8 w-8 text-aalta-400" />
              <span className="font-bold text-xl text-white">AALTA</span>
            </div>
            <p className="text-sm text-slate-400 max-w-xs">
              Arizona Assisted Living Transparency Authority. Independent compliance intelligence for better care decisions.
            </p>
          </div>

          {/* Navigation */}
          <div className="mt-12 grid grid-cols-2 gap-8 xl:col-span-2 xl:mt-0">
            <div>
              <h3 className="text-sm font-semibold text-white">Navigation</h3>
              <ul className="mt-4 space-y-3">
                {footerNavigation.main.map((item) => (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className="text-sm text-slate-400 hover:text-white transition-colors"
                    >
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Legal</h3>
              <ul className="mt-4 space-y-3">
                {footerNavigation.legal.map((item) => (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className="text-sm text-slate-400 hover:text-white transition-colors"
                    >
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-12 border-t border-slate-800 pt-8">
          <p className="text-xs text-slate-500">
            &copy; {new Date().getFullYear()} Arizona Assisted Living Transparency Authority. All rights reserved.
          </p>
          <p className="text-xs text-slate-500 mt-2">
            Data sourced from Arizona Department of Health Services public records. This is an independent platform and is not affiliated with any government agency.
          </p>
        </div>
      </div>
    </footer>
  );
}
