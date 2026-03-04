import { Card, CardHeader, CardTitle, CardContent } from '@aalta/ui';
import { Scale, Clock, RefreshCw, AlertTriangle, TrendingUp, Shield } from 'lucide-react';

export const metadata = {
  title: 'Methodology',
  description: 'Learn how AALTA calculates compliance scores and risk levels for Arizona assisted living facilities.',
};

const scoringFactors = [
  {
    name: 'Violation History',
    weight: '50%',
    description: 'Based on the severity and frequency of regulatory violations over the past 3 years.',
    icon: AlertTriangle,
  },
  {
    name: 'Complaint Ratio',
    weight: '20%',
    description: 'Ratio of substantiated complaints to inspections, weighted by severity.',
    icon: Scale,
  },
  {
    name: 'Improvement Trajectory',
    weight: '20%',
    description: 'Compares recent violations to historical patterns to identify improving or declining trends.',
    icon: TrendingUp,
  },
  {
    name: 'Stability',
    weight: '10%',
    description: 'Accounts for ownership changes, license status, and operational continuity.',
    icon: Shield,
  },
];

const severityLevels = [
  {
    level: 'Minor',
    points: 5,
    color: 'bg-yellow-100 text-yellow-800',
    description: 'Violations with no harm and low risk to residents.',
  },
  {
    level: 'Moderate',
    points: 15,
    color: 'bg-orange-100 text-orange-800',
    description: 'Violations with potential for harm to residents.',
  },
  {
    level: 'Major',
    points: 35,
    color: 'bg-red-100 text-red-800',
    description: 'Violations resulting in actual harm or high risk.',
  },
  {
    level: 'Critical',
    points: 60,
    color: 'bg-purple-100 text-purple-800',
    description: 'Violations causing immediate jeopardy to resident safety.',
  },
];

export default function MethodologyPage() {
  return (
    <div className="py-12">
      <div className="container-page">
        {/* Header */}
        <div className="max-w-3xl">
          <h1 className="text-3xl font-bold text-slate-900">Scoring Methodology</h1>
          <p className="mt-4 text-lg text-slate-600">
            AALTA uses a transparent, data-driven methodology to calculate compliance scores
            for Arizona assisted living facilities. Our algorithm is based solely on public
            regulatory data and is designed to be fair, consistent, and actionable.
          </p>
        </div>

        {/* Key Principles */}
        <section className="mt-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Key Principles</h2>
          <div className="grid gap-6 md:grid-cols-3">
            <Card>
              <CardHeader>
                <Scale className="h-8 w-8 text-aalta-600" />
                <CardTitle className="mt-4">Objective Data Only</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600">
                  Our scores are based entirely on public regulatory data. No demographic
                  information, reviews, or subjective factors are used.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <Clock className="h-8 w-8 text-aalta-600" />
                <CardTitle className="mt-4">Time-Weighted</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600">
                  Recent violations have more impact than older ones. Violations lose 50%
                  of their weight after 18 months.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <RefreshCw className="h-8 w-8 text-aalta-600" />
                <CardTitle className="mt-4">Correction Credit</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600">
                  Facilities that quickly correct violations receive credit, recognizing
                  their responsiveness to regulatory concerns.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Scoring Factors */}
        <section className="mt-16">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Scoring Factors</h2>
          <div className="grid gap-6 md:grid-cols-2">
            {scoringFactors.map((factor) => (
              <Card key={factor.name}>
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-lg bg-aalta-100 flex items-center justify-center flex-shrink-0">
                      <factor.icon className="h-6 w-6 text-aalta-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-slate-900">{factor.name}</h3>
                        <span className="text-sm font-medium text-aalta-600 bg-aalta-50 px-2 py-0.5 rounded">
                          {factor.weight}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-slate-600">{factor.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Severity Levels */}
        <section className="mt-16">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Violation Severity Levels</h2>
          <Card>
            <CardContent className="p-0">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left text-sm font-medium text-slate-900 px-6 py-4">
                      Severity
                    </th>
                    <th className="text-left text-sm font-medium text-slate-900 px-6 py-4">
                      Base Points
                    </th>
                    <th className="text-left text-sm font-medium text-slate-900 px-6 py-4">
                      Description
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {severityLevels.map((level) => (
                    <tr key={level.level}>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded text-sm font-medium ${level.color}`}
                        >
                          {level.level}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-900 font-medium">
                        {level.points} points
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {level.description}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </section>

        {/* Risk Levels */}
        <section className="mt-16">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Risk Level Classification</h2>
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-24 text-sm font-medium text-slate-900">85-100</div>
                  <div className="flex-1 h-8 bg-green-100 rounded flex items-center px-3">
                    <span className="text-sm font-medium text-green-800">Low Risk</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-24 text-sm font-medium text-slate-900">65-84</div>
                  <div className="flex-1 h-8 bg-yellow-100 rounded flex items-center px-3">
                    <span className="text-sm font-medium text-yellow-800">Moderate Risk</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-24 text-sm font-medium text-slate-900">40-64</div>
                  <div className="flex-1 h-8 bg-orange-100 rounded flex items-center px-3">
                    <span className="text-sm font-medium text-orange-800">High Risk</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-24 text-sm font-medium text-slate-900">0-39</div>
                  <div className="flex-1 h-8 bg-red-100 rounded flex items-center px-3">
                    <span className="text-sm font-medium text-red-800">Critical Risk</span>
                  </div>
                </div>
              </div>
              <p className="mt-6 text-sm text-slate-600">
                Note: Facilities with critical violations in the past 12 months are automatically
                classified as Critical Risk regardless of their overall score.
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Data Sources */}
        <section className="mt-16">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Data Sources</h2>
          <Card>
            <CardContent className="p-6">
              <p className="text-slate-600">
                All data used in our scoring algorithm is sourced from public records made
                available by the Arizona Department of Health Services (ADHS). This includes:
              </p>
              <ul className="mt-4 space-y-2 text-slate-600">
                <li className="flex items-start gap-2">
                  <span className="text-aalta-600 mt-1">•</span>
                  <span>Facility license information and status</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-aalta-600 mt-1">•</span>
                  <span>Inspection reports and statements of deficiencies</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-aalta-600 mt-1">•</span>
                  <span>Complaint investigation outcomes</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-aalta-600 mt-1">•</span>
                  <span>Enforcement actions and penalties</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-aalta-600 mt-1">•</span>
                  <span>Ownership and management information</span>
                </li>
              </ul>
              <p className="mt-4 text-sm text-slate-500">
                Our data is updated daily to ensure you have access to the most current information.
              </p>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
