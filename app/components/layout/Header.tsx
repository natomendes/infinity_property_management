import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Button } from '../ui/Button';
import { auth } from '~/lib/auth';

interface HeaderProps {
  user?: {
    email?: string;
    user_metadata?: {
      full_name?: string;
      user_role?: string;
    };
  } | null;
}

export function Header({ user }: HeaderProps) {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const handleSignOut = async () => {
    setIsLoading(true);
    try {
      await auth.signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link to="/dashboard" className="text-xl font-bold text-gray-900">
            Property Manager
          </Link>
        </div>

        <div className="flex items-center space-x-4">
          {user && (
            <>
              <div className="text-sm text-gray-600">
                <span className="font-medium">{user.user_metadata?.full_name || user.email}</span>
                {user.user_metadata?.user_role && (
                  <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                    {user.user_metadata.user_role}
                  </span>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSignOut}
                isLoading={isLoading}
              >
                Sign Out
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}