import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { authApi } from '@/api';
import { toast } from 'sonner';

const AuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();

  useEffect(() => {
    const handleCallback = async () => {
      const token = searchParams.get('token');

      if (!token) {
        toast.error('Authentication failed');
        navigate('/auth');
        return;
      }

      try {
        // Store the token
        localStorage.setItem('auth_token', token);

        // Fetch user data
        const userData = await authApi.getMe();
        localStorage.setItem('user', JSON.stringify(userData));

        // Refresh auth context
        await refreshUser();

        toast.success('Successfully signed in with Google!');

        // Check if user needs to complete assessment
        // Consistent with email flow: Go to dashboard, let them browse, show banner
        navigate('/dashboard');
      } catch (error) {
        console.error('Auth callback error:', error);
        toast.error('Failed to complete authentication');
        navigate('/auth');
      }
    };

    handleCallback();
  }, [searchParams, navigate, refreshUser]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse text-lg">
        Completing sign in...
      </div>
    </div>
  );
};

export default AuthCallback;
