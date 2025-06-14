import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { LoginForm } from '~/components/auth/LoginForm';
import { auth } from '~/lib/auth';
import type { Route } from './+types/login';

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Login - Property Management" },
    { name: "description", content: "Sign in to your property management account" },
  ];
}

export default function Login() {
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is already logged in
    const checkAuth = async () => {
      const session = await auth.getSession();
      if (session) {
        navigate('/dashboard');
      }
    };
    
    checkAuth();
  }, [navigate]);

  return <LoginForm />;
}