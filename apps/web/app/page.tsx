import Link from 'next/link';
import { Search, Shield, FileText, TrendingUp, ArrowRight, Building2 } from 'lucide-react';
import { Button, Card, CardHeader, CardTitle, CardDescription, CardContent } from '@aalta/ui';

const features = [
  {
    name: 'Facility Search',
    description: 'Search and compare Arizona assisted living facilities by location, compliance score, and more.',
    icon: Search,
    href: '/facilities',
  },
  {
    name: 'Compliance Scores',
    description: 'Data-driven compliance scores based on official inspection reports and violation history.',
    icon: Shield,
    href: '/methodology',
  },
  {
    name: 'Inspection Reports',
    description: 'Access detailed inspection reports, violations, and corrective actions for every facility.',
    icon: FileText,
    href: '/reports',
  },
  {
    name: 'Trend Analysis',
    description: 'Track facility performance over time and identify improving or declining trends.',
    icon: TrendingUp,
    href: '/rankings',
  },
];

const stats = [
  { label: 'Facilities Tracked', value: '1,200+' },
  { label: 'Inspection Reports', value: '15,000+' },
  { label: 'Data Points', value: '500K+' },
  { label: 'Updated', value: 'Daily' },
];

export default function HomePage() {
  return (
    <div>
      {/* Hero Section */}
      <section className="relative bg-gradient-to-b from-aalta-50 to-white py-20 md:py-28">
        <div className="container-page">
          <div className="max-w-3xl">
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl md:text-6xl">
              Make Informed Care Decisions with{' '}
              <span className="text-aalta-600">Transparent Data</span>
            </h1>
            <p className="mt-6 text-lg text-slate-600 max-w-2xl">
              AALTA provides independent compliance intelligence on Arizona assisted living facilities.
              Access inspection reports, violation history, and data-driven compliance scores to make
              better care decisions.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Button size="lg" asChild>
                <Link href="/facilities">
                  Search Facilities
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link href="/methodology">Learn Our Methodology</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-slate-900">
        <div className="container-page">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl font-bold text-white">{stat.value}</div>
                <div className="mt-1 text-sm text-slate-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="container-page">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">
              Transparency You Can Trust
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              We aggregate public regulatory data to provide clear, actionable insights into
              assisted living facility compliance and quality.
            </p>
          </div>

          <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <Card key={feature.name} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="h-12 w-12 rounded-lg bg-aalta-100 flex items-center justify-center">
                    <feature.icon className="h-6 w-6 text-aalta-600" />
                  </div>
                  <CardTitle className="text-lg mt-4">{feature.name}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Link
                    href={feature.href}
                    className="text-sm font-medium text-aalta-600 hover:text-aalta-700 inline-flex items-center"
                  >
                    Learn more
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-aalta-600">
        <div className="container-page text-center">
          <Building2 className="h-12 w-12 text-white mx-auto" />
          <h2 className="mt-6 text-3xl font-bold text-white">
            Start Your Search Today
          </h2>
          <p className="mt-4 text-lg text-aalta-100 max-w-2xl mx-auto">
            Join thousands of families who use AALTA to research assisted living facilities
            and make informed care decisions.
          </p>
          <div className="mt-8">
            <Button variant="secondary" size="lg" asChild>
              <Link href="/facilities">
                Browse All Facilities
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
