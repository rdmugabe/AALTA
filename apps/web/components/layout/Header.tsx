'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Menu, X, Building2 } from 'lucide-react';
import { SearchAutocomplete } from '@/components/search/SearchAutocomplete';

const navigation = [
  { name: 'Facilities', href: '/facilities' },
  { name: 'Reports', href: '/reports' },
  { name: 'Rankings', href: '/rankings' },
  { name: 'Methodology', href: '/methodology' },
  { name: 'About', href: '/about' },
];

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="bg-white border-b border-slate-200">
      <nav className="container-page" aria-label="Global">
        <div className="flex items-center justify-between py-4">
          {/* Logo */}
          <div className="flex lg:flex-1">
            <Link href="/" className="-m-1.5 p-1.5 flex items-center gap-2">
              <Building2 className="h-8 w-8 text-aalta-600" />
              <span className="font-bold text-xl text-slate-900">AALTA</span>
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="flex lg:hidden">
            <button
              type="button"
              className="-m-2.5 inline-flex items-center justify-center rounded-md p-2.5 text-slate-700"
              onClick={() => setMobileMenuOpen(true)}
            >
              <span className="sr-only">Open main menu</span>
              <Menu className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>

          {/* Desktop navigation */}
          <div className="hidden lg:flex lg:gap-x-8">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="text-sm font-medium text-slate-700 hover:text-aalta-600 transition-colors"
              >
                {item.name}
              </Link>
            ))}
          </div>

          {/* Desktop search */}
          <div className="hidden lg:flex lg:flex-1 lg:justify-end lg:gap-x-4">
            <SearchAutocomplete
              placeholder="Search facilities..."
              className="w-72"
            />
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden">
            <div className="fixed inset-0 z-50" />
            <div className="fixed inset-y-0 right-0 z-50 w-full overflow-y-auto bg-white px-6 py-6 sm:max-w-sm sm:ring-1 sm:ring-slate-900/10">
              <div className="flex items-center justify-between">
                <Link href="/" className="-m-1.5 p-1.5 flex items-center gap-2">
                  <Building2 className="h-8 w-8 text-aalta-600" />
                  <span className="font-bold text-xl text-slate-900">AALTA</span>
                </Link>
                <button
                  type="button"
                  className="-m-2.5 rounded-md p-2.5 text-slate-700"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span className="sr-only">Close menu</span>
                  <X className="h-6 w-6" aria-hidden="true" />
                </button>
              </div>
              <div className="mt-6 flow-root">
                <div className="-my-6 divide-y divide-slate-500/10">
                  {/* Mobile search */}
                  <div className="py-4">
                    <SearchAutocomplete
                      placeholder="Search facilities..."
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-2 py-6">
                    {navigation.map((item) => (
                      <Link
                        key={item.name}
                        href={item.href}
                        className="-mx-3 block rounded-lg px-3 py-2 text-base font-medium text-slate-900 hover:bg-slate-50"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        {item.name}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
