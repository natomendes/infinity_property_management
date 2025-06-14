import { useOutletContext } from 'react-router';
import { StatsCard } from '~/components/dashboard/StatsCard';
import type { AuthUser } from '~/lib/auth';
import type { Route } from './+types/_app.dashboard';

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Dashboard - Property Management" },
    { name: "description", content: "Property management dashboard" },
  ];
}

interface OutletContext {
  user: AuthUser;
}

export default function Dashboard() {
  const { user } = useOutletContext<OutletContext>();

  const stats = [
    {
      title: 'Total Properties',
      value: '24',
      icon: '🏠',
      trend: { value: 12, isPositive: true }
    },
    {
      title: 'Active Reservations',
      value: '18',
      icon: '📅',
      trend: { value: 8, isPositive: true }
    },
    {
      title: 'Monthly Revenue',
      value: '$12,450',
      icon: '💰',
      trend: { value: 15, isPositive: true }
    },
    {
      title: 'Occupancy Rate',
      value: '85%',
      icon: '📊',
      trend: { value: 3, isPositive: false }
    },
  ];

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user.user_metadata?.full_name || user.email}!
        </h1>
        <p className="text-gray-600">Here's what's happening with your properties today.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => (
          <StatsCard key={index} {...stat} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-600">New reservation for Ocean View Villa</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-sm text-gray-600">Payment received for Downtown Apartment</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              <span className="text-sm text-gray-600">Maintenance request for Mountain Cabin</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Check-ins</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-900">Ocean View Villa</span>
              <span className="text-sm text-gray-500">Today, 3:00 PM</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-900">Downtown Apartment</span>
              <span className="text-sm text-gray-500">Tomorrow, 2:00 PM</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-900">Mountain Cabin</span>
              <span className="text-sm text-gray-500">Dec 28, 4:00 PM</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}