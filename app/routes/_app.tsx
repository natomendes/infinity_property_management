import { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router';
import { Header } from '~/components/layout/Header';
import { Sidebar } from '~/components/layout/Sidebar';
import { auth, type AuthUser } from '~/lib/auth';

export default function AppLayout() {
  const navigate = useNavigate();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check initial auth state
    const checkAuth = async () => {
      try {
        const currentUser = await auth.getCurrentUser();
        if (!currentUser) {
          navigate('/login');
          return;
        }
        setUser(currentUser);
      } catch (error) {
        console.error('Auth check failed:', error);
        navigate('/login');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = auth.onAuthStateChange((user) => {
      if (!user) {
        navigate('/login');
      } else {
        setUser(user);
      }
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to login
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={user} />
      <div className="flex h-[calc(100vh-73px)]">
        <Sidebar userRole={user.user_metadata?.user_role} />
        <main className="flex-1 overflow-auto">
          <Outlet context={{ user }} />
        </main>
      </div>
    </div>
  );
}