import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { LoadingSpinner } from '../components/LoadingSpinner';

/**
 * Legacy invitation page - now redirects to /signin with token preserved.
 * The sign-in page handles invitation tokens directly.
 */
export default function Invite() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  useEffect(() => {
    // Redirect to signin page, preserving the token if present
    const redirectUrl = token ? `/signin?token=${token}` : '/signin';
    navigate(redirectUrl, { replace: true });
  }, [token, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
      <LoadingSpinner />
    </div>
  );
}
