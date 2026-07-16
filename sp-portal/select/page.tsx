'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Truck, BarChart3, Settings, FileText, TrendingUp, Calendar, AlertCircle } from 'lucide-react';

interface MenuItem {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  category: string;
  color: 'dhl' | 'sp';
}

export default function SPPortalSelectPage() {
  const router = useRouter();

  const menuItems: MenuItem[] = [
    // Operations
    {
      id: 'drivers',
      name: 'Drivers',
      description: 'Manage drivers and their performance',
      icon: <Users className="w-6 h-6" />,
      href: '/sp-portal/drivers',
      category: 'Operations',
      color: 'sp',
    },
    {
      id: 'vehicles',
      name: 'Vehicles',
      description: 'Manage fleet vehicles and capacity',
      icon: <Truck className="w-6 h-6" />,
      href: '/sp-portal/vehicles',
      category: 'Operations',
      color: 'sp',
    },
    {
      id: 'route-balance',
      name: 'Route Balance',
      description: 'Monitor active and completed routes',
      icon: <Calendar className="w-6 h-6" />,
      href: '/sp-portal/route-balance',
      category: 'Operations',
      color: 'sp',
    },
    {
      id: 'week-planner',
      name: 'Weekly Planner',
      description: 'Plan driver allocation for the week',
      icon: <Calendar className="w-6 h-6" />,
      href: '/sp-portal/week-planner',
      category: 'Operations',
      color: 'sp',
    },
    {
      id: 'daily-operations',
      name: 'Daily Operations',
      description: 'Monitor daily activities in real-time',
      icon: <AlertCircle className="w-6 h-6" />,
      href: '/sp-portal/daily-operations-management',
      category: 'Operations',
      color: 'sp',
    },
    {
      id: 'contracts',
      name: 'Contracts',
      description: 'View and manage service contracts',
      icon: <FileText className="w-6 h-6" />,
      href: '/sp-portal/contracts',
      category: 'Operations',
      color: 'sp',
    },
    // Analytics
    {
      id: 'vendor-performance',
      name: 'Vendor Performance',
      description: 'Analytics on driver performance and metrics',
      icon: <TrendingUp className="w-6 h-6" />,
      href: '/sp-portal/vendor-performance',
      category: 'Analytics',
      color: 'sp',
    },
    {
      id: 'financial-insights',
      name: 'Financial Insights',
      description: 'Daily financial and operational metrics',
      icon: <BarChart3 className="w-6 h-6" />,
      href: '/sp-portal/daily-financial-insights',
      category: 'Analytics',
      color: 'sp',
    },
    {
      id: 'operations-reports',
      name: 'Operations Reports',
      description: 'Daily operations summary and reports',
      icon: <FileText className="w-6 h-6" />,
      href: '/sp-portal/daily-operations-reports',
      category: 'Analytics',
      color: 'sp',
    },
    {
      id: 'invoices',
      name: 'Ad-hoc Invoices',
      description: 'Create and manage additional invoices',
      icon: <FileText className="w-6 h-6" />,
      href: '/sp-portal/adhoc-invoice-management',
      category: 'Analytics',
      color: 'sp',
    },
  ];

  const categories = ['Operations', 'Analytics'];

  return (
    <div className="page-background">
      <div className="page-content p-6 md:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-3 bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
              Service Provider Portal
            </h1>
            <p className="text-lg md:text-xl text-slate-600 font-medium">
              Select a module to manage your operations
            </p>
          </div>

          {/* Modules by Category */}
          {categories.map((category) => (
            <div key={category} className="mb-12">
              <h2 className="text-2xl font-bold text-slate-900 mb-6">{category}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {menuItems
                  .filter((item) => item.category === category)
                  .map((item) => (
                    <Card
                      key={item.id}
                      className="card-glass rounded-2xl cursor-pointer group transition-all duration-300"
                      onClick={() => router.push(item.href)}
                    >
                      <CardHeader>
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-12 h-12 flex items-center justify-center rounded-lg bg-gradient-to-br from-indigo-100 to-sky-200 text-indigo-600 group-hover:scale-110 transition-transform duration-300">
                            {item.icon}
                          </div>
                          <div className="flex-1">
                            <CardTitle className="text-lg">{item.name}</CardTitle>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <CardDescription className="text-slate-600">
                          {item.description}
                        </CardDescription>
                        <button
                          className="w-full px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-semibold rounded-lg transition-all duration-300 hover:shadow-lg hover:shadow-indigo-600/25 hover:translate-x-1"
                          onClick={() => router.push(item.href)}
                        >
                          Open
                        </button>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
