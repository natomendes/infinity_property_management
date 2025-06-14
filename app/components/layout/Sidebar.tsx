import { Link, useLocation } from 'react-router';

interface SidebarProps {
  userRole?: string;
}

export function Sidebar({ userRole }: SidebarProps) {
  const location = useLocation();

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: '📊' },
    { name: 'Properties', href: '/properties', icon: '🏠' },
    { name: 'My Properties', href: '/my-properties', icon: '🏡' },
    ...(userRole === 'manager' ? [
      { name: 'Owners', href: '/owners', icon: '👥' },
      { name: 'Reservations', href: '/reservations', icon: '📅' },
      { name: 'Payments', href: '/payments', icon: '💳' },
    ] : []),
  ];

  return (
    <div className="w-64 bg-gray-50 border-r border-gray-200 h-full">
      <nav className="mt-8 px-4">
        <ul className="space-y-2">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <li key={item.name}>
                <Link
                  to={item.href}
                  className={`
                    flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors
                    ${isActive
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }
                  `}
                >
                  <span className="mr-3 text-lg">{item.icon}</span>
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}