import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/currency';

export default function Invite() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, signUp, signIn, refreshProfile } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [duesInfo, setDuesInfo] = useState(null);
  const [memberInfo, setMemberInfo] = useState(null); // For member-only invitations
  const [chapterInfo, setChapterInfo] = useState(null);
  const [error, setError] = useState(null);

  // Prevent repeated linking attempts
  const linkAttemptedRef = useRef(false);

  const [isSignUp, setIsSignUp] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    phone: '',
    year: '',
    major: '',
  });

  const invitationToken = searchParams.get('token');
  const invitationType = searchParams.get('type'); // 'member' or null (for dues)

  useEffect(() => {
    if (user && user.id && invitationToken) {
      // Prevent repeated link attempts
      if (linkAttemptedRef.current) {
        console.log('Link already attempted, skipping');
        return;
      }
      linkAttemptedRef.current = true;

      // User is already logged in, try to link their account
      console.log('User detected, attempting to link invitation');
      if (invitationType === 'member') {
        linkUserToMemberInvitation();
      } else {
        linkUserToDues();
      }
    } else if (invitationToken && !user) {
      // No user logged in yet, fetch invitation details
      fetchInvitationDetails();
    } else if (!invitationToken) {
      setError('Invalid invitation link');
      setIsLoading(false);
    }
  }, [invitationToken, invitationType, user]);

  const fetchInvitationDetails = async () => {
    try {
      if (invitationType === 'member') {
        // Fetch member invitation
        const { data, error } = await supabase
          .from('member_invitations')
          .select('*')
          .eq('invitation_token', invitationToken)
          .eq('status', 'pending')
          .single();

        if (error || !data) {
          throw new Error('Invalid or expired invitation link');
        }

        // Check expiration
        if (new Date(data.invitation_expires_at) < new Date()) {
          throw new Error('This invitation has expired');
        }

        // Get chapter information
        const { data: chapter, error: chapterError } = await supabase
          .from('chapters')
          .select('name')
          .eq('id', data.chapter_id)
          .single();

        if (chapterError) {
          console.error('Error fetching chapter:', chapterError);
        }

        setMemberInfo(data);
        setChapterInfo(chapter);
        setFormData(prev => ({
          ...prev,
          email: data.email,
          fullName: `${data.first_name} ${data.last_name}`,
          phone: data.phone_number || '',
          year: data.year || '',
        }));
        setIsLoading(false);
      } else {
        // Fetch dues invitation (existing logic)
        const { data, error } = await supabase
          .from('member_dues')
          .select(`
            *,
            dues_configuration (
              period_name,
              fiscal_year,
              due_date
            )
          `)
          .eq('invitation_token', invitationToken)
          .eq('status', 'pending_invite')
          .single();

        if (error || !data) {
          throw new Error('Invalid or expired invitation link');
        }

        // Get chapter information
        const { data: chapter, error: chapterError } = await supabase
          .from('chapters')
          .select('name')
          .eq('id', data.chapter_id)
          .single();

        if (chapterError) {
          console.error('Error fetching chapter:', chapterError);
        }

        setDuesInfo(data);
        setChapterInfo(chapter);
        setFormData(prev => ({ ...prev, email: data.email }));
        setIsLoading(false);
      }
    } catch (err) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  const linkUserToDues = async (retryCount = 0) => {
    try {
      // Validate user and invitation token
      if (!user || !user.id || !user.email) {
        throw new Error('User information is incomplete. Please try signing in again.');
      }

      if (!invitationToken) {
        throw new Error('Invalid invitation token');
      }

      console.log('Attempting to link user to dues:', {
        userId: user.id,
        email: user.email,
        token: invitationToken,
        retryCount
      });

      // Call the database function to link user to dues
      const { data, error } = await supabase.rpc('link_member_to_dues_invitation', {
        p_member_id: user.id,
        p_email: user.email,
        p_invitation_token: invitationToken
      });

      if (error) {
        console.error('RPC error:', error);
        throw error;
      }

      console.log('Link response:', data);

      if (data && data.success) {
        toast.success(`Successfully linked ${data.linked_count} dues assignment(s) to your account!`);
        // Refresh profile to get updated chapter_id
        await refreshProfile();
        navigate('/app');
      } else {
        const errorMsg = data?.error || 'Failed to link dues to account';

        // If profile not found and we haven't retried, wait and retry once
        if (errorMsg.includes('User profile not found') && retryCount === 0) {
          console.log('Profile not found, waiting 2 seconds before retry...');
          toast.loading('Setting up your account...');
          await new Promise(resolve => setTimeout(resolve, 2000));
          return linkUserToDues(1);
        }

        throw new Error(errorMsg);
      }
    } catch (err) {
      console.error('Error linking dues:', err);

      const errorMessage = err.message || 'Failed to link dues to your account';
      toast.error(errorMessage);

      setError(errorMessage);
      setIsLoading(false);
    }
  };

  const linkUserToMemberInvitation = async (retryCount = 0) => {
    try {
      // Validate user and invitation token
      if (!user || !user.id || !user.email) {
        throw new Error('User information is incomplete. Please try signing in again.');
      }

      if (!invitationToken) {
        throw new Error('Invalid invitation token');
      }

      console.log('Attempting to link user to member invitation:', {
        userId: user.id,
        email: user.email,
        token: invitationToken,
        retryCount
      });

      // Call the database function to link user to member invitation
      const { data, error } = await supabase.rpc('link_member_invitation', {
        p_user_id: user.id,
        p_email: user.email,
        p_invitation_token: invitationToken
      });

      if (error) {
        console.error('RPC error:', error);
        throw error;
      }

      console.log('Link response:', data);

      if (data && data.success) {
        toast.success('Successfully joined the chapter!');
        // Refresh profile to get updated chapter_id
        await refreshProfile();
        navigate('/app');
      } else {
        const errorMsg = data?.error || 'Failed to link invitation to account';

        // If profile not found and we haven't retried, wait and retry once
        if (errorMsg.includes('User profile not found') && retryCount === 0) {
          console.log('Profile not found, waiting 2 seconds before retry...');
          toast.loading('Setting up your account...');
          await new Promise(resolve => setTimeout(resolve, 2000));
          return linkUserToMemberInvitation(1);
        }

        throw new Error(errorMsg);
      }
    } catch (err) {
      console.error('Error linking member invitation:', err);

      const errorMessage = err.message || 'Failed to link invitation to your account';
      toast.error(errorMessage);

      setError(errorMessage);
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Get chapter_id from either dues or member invitation
    const chapterId = duesInfo?.chapter_id || memberInfo?.chapter_id;

    try {
      if (isSignUp) {
        // Sign up new user
        const signUpData = {
          email: formData.email,
          password: formData.password,
          full_name: formData.fullName,
          phone_number: formData.phone,
          year: formData.year,
          major: formData.major,
          chapter_id: chapterId,
        };

        console.log('Signing up with data:', { ...signUpData, password: '[REDACTED]' });
        const success = await signUp(signUpData);

        if (success) {
          // After successful signup, link the account to dues
          toast.success('Account created! Linking to your dues assignment...');
          // The useEffect will handle linking since user will be set
        } else {
          throw new Error('Failed to create account');
        }
      } else {
        // Sign in existing user
        const success = await signIn({
          email: formData.email,
          password: formData.password,
        });

        if (success) {
          toast.success('Signed in! Linking to your dues assignment...');
          // The useEffect will handle linking since user will be set
        } else {
          throw new Error('Failed to sign in');
        }
      }
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    }
  };

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-indigo-600"></div>
          <p className="text-sm text-gray-600">Loading invitation...</p>
        </div>
      </div>
    );
  }

  if (error && !duesInfo && !memberInfo) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md rounded-lg bg-white p-8 shadow-lg">
          <div className="mb-4 text-center text-5xl">⚠️</div>
          <h1 className="mb-2 text-center text-2xl font-bold text-gray-900">
            Invalid Invitation
          </h1>
          <p className="mb-6 text-center text-gray-600">{error}</p>
          <button
            onClick={() => navigate('/signin')}
            className="w-full rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-700"
          >
            Go to Sign In
          </button>
        </div>
      </div>
    );
  }

  // Determine if this is a member-only invitation (no dues)
  const isMemberInvitation = !!memberInfo && !duesInfo;

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Left side - Information Panel */}
      <div className="hidden w-1/2 bg-gradient-to-br from-indigo-600 to-purple-700 p-12 lg:block">
        <div className="flex h-full flex-col justify-center">
          <div className="mb-8">
            <h1 className="mb-2 text-4xl font-bold text-white">GreekPay</h1>
            <p className="text-xl text-indigo-100">{chapterInfo?.name}</p>
          </div>

          <div className="rounded-lg bg-white/10 p-8 backdrop-blur-sm">
            {isMemberInvitation ? (
              <>
                {/* Member Invitation Content */}
                <h2 className="mb-4 text-2xl font-bold text-white">
                  Welcome, {memberInfo?.first_name}!
                </h2>

                <p className="text-lg text-indigo-100 mb-6">
                  You've been invited to join {chapterInfo?.name || 'the chapter'} on GreekPay.
                </p>

                <div className="space-y-4 text-indigo-100">
                  <p>Create your account to access:</p>
                  <ul className="space-y-2 list-disc list-inside">
                    <li>Member dashboard</li>
                    <li>Chapter announcements and events</li>
                    <li>Online dues payment</li>
                    <li>Your member profile</li>
                  </ul>
                </div>

                <div className="mt-6 rounded-lg border border-white/30 bg-white/10 p-4 backdrop-blur-sm">
                  <p className="mb-2 text-sm font-semibold text-white">
                    ✅ Next Steps:
                  </p>
                  <ol className="space-y-1 text-sm text-indigo-100 list-decimal list-inside">
                    <li>Create your account using the form</li>
                    <li>Complete your profile information</li>
                    <li>Access your member dashboard</li>
                  </ol>
                </div>
              </>
            ) : (
              <>
                {/* Dues Invitation Content */}
                <h2 className="mb-4 text-2xl font-bold text-white">
                  You've Been Assigned Dues
                </h2>

                <div className="mb-6 border-l-4 border-white/50 bg-white/20 p-6 backdrop-blur-sm">
                  <p className="mb-2 text-sm font-medium uppercase tracking-wide text-indigo-100">
                    Dues Amount
                  </p>
                  <p className="text-5xl font-bold text-white">
                    {duesInfo?.total_amount ? formatCurrency(duesInfo.total_amount) : '$0.00'}
                  </p>
                  {duesInfo?.due_date && (
                    <p className="mt-2 text-sm text-indigo-100">
                      Due: {new Date(duesInfo.due_date).toLocaleDateString()}
                    </p>
                  )}
                </div>

                <div className="space-y-2 text-sm text-indigo-100">
                  <p><strong className="text-white">Period:</strong> {duesInfo?.dues_configuration?.period_name} {duesInfo?.dues_configuration?.fiscal_year}</p>
                </div>

                {duesInfo?.notes && (
                  <div className="mt-6 rounded-lg border-2 border-yellow-400/60 bg-yellow-400/30 p-4 backdrop-blur-sm">
                    <p className="mb-2 text-sm font-bold uppercase tracking-wide text-yellow-50">
                      📋 Important Instructions
                    </p>
                    <p className="text-base leading-relaxed text-white whitespace-pre-wrap">{duesInfo.notes}</p>
                  </div>
                )}

                <div className="mt-6 rounded-lg border border-white/30 bg-white/10 p-4 backdrop-blur-sm">
                  <p className="mb-2 text-sm font-semibold text-white">
                    ✅ Next Steps:
                  </p>
                  <ol className="space-y-1 text-sm text-indigo-100 list-decimal list-inside">
                    <li>Create your account using the form</li>
                    <li>Complete your profile information</li>
                    <li>View your dues balance in the dashboard</li>
                    <li>Contact your treasurer for payment options</li>
                  </ol>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Right side - Sign Up/In Form */}
      <div className="flex w-full items-center justify-center p-8 lg:w-1/2">
        <div className="w-full max-w-md">
          {/* Mobile header */}
          <div className="mb-8 lg:hidden">
            <h1 className="mb-2 text-3xl font-bold text-gray-900">GreekPay</h1>
            <p className="text-lg text-gray-600">{chapterInfo?.name}</p>

            {isMemberInvitation ? (
              <>
                {/* Member invitation mobile header */}
                <div className="mt-4 rounded-lg bg-indigo-50 p-4">
                  <p className="text-lg font-medium text-indigo-900">
                    Welcome, {memberInfo?.first_name}!
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    You've been invited to join {chapterInfo?.name || 'the chapter'}.
                  </p>
                </div>

                <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <p className="mb-2 text-sm font-semibold text-gray-900">
                    ✅ Next Steps:
                  </p>
                  <ol className="space-y-1 text-sm text-gray-700 list-decimal list-inside">
                    <li>Create your account below</li>
                    <li>Complete your profile information</li>
                    <li>Access your member dashboard</li>
                  </ol>
                </div>
              </>
            ) : (
              <>
                {/* Dues invitation mobile header */}
                <div className="mt-4 rounded-lg bg-indigo-50 p-4">
                  <p className="text-sm text-gray-600">Dues Amount</p>
                  <p className="text-3xl font-bold text-indigo-600">
                    {duesInfo?.total_amount ? formatCurrency(duesInfo.total_amount) : '$0.00'}
                  </p>
                  {duesInfo?.due_date && (
                    <p className="mt-2 text-sm text-gray-600">
                      Due: {new Date(duesInfo.due_date).toLocaleDateString()}
                    </p>
                  )}
                </div>

                {duesInfo?.notes && (
                  <div className="mt-4 rounded-lg border-2 border-yellow-500 bg-yellow-50 p-4">
                    <p className="mb-2 text-sm font-bold uppercase tracking-wide text-yellow-900">
                      📋 Important Instructions
                    </p>
                    <p className="text-sm leading-relaxed text-gray-800 whitespace-pre-wrap">{duesInfo.notes}</p>
                  </div>
                )}

                <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <p className="mb-2 text-sm font-semibold text-gray-900">
                    ✅ Next Steps:
                  </p>
                  <ol className="space-y-1 text-sm text-gray-700 list-decimal list-inside">
                    <li>Create your account below</li>
                    <li>Complete your profile information</li>
                    <li>View your dues balance in the dashboard</li>
                    <li>Contact your treasurer for payment options</li>
                  </ol>
                </div>
              </>
            )}
          </div>

          <div className="rounded-lg bg-white p-8 shadow-lg">
            <h2 className="mb-6 text-2xl font-bold text-gray-900">
              {isSignUp ? 'Create Your Account' : 'Sign In'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  readOnly={!!(duesInfo?.email || memberInfo?.email)}
                  required
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  minLength={6}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {isSignUp && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Full Name
                    </label>
                    <input
                      type="text"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleChange}
                      required
                      className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="(555) 123-4567"
                      className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Year
                    </label>
                    <select
                      name="year"
                      value={formData.year}
                      onChange={handleChange}
                      className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="">Select year (optional)</option>
                      <option value="1">1st Year</option>
                      <option value="2">2nd Year</option>
                      <option value="3">3rd Year</option>
                      <option value="4">4th Year</option>
                      <option value="5">5th Year</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Major
                    </label>
                    <input
                      type="text"
                      name="major"
                      value={formData.major}
                      onChange={handleChange}
                      placeholder="e.g., Computer Science"
                      className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </>
              )}

              {error && (
                <div className="rounded-lg bg-red-50 p-3">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <button
                type="submit"
                className="w-full rounded-lg bg-indigo-600 px-4 py-3 font-semibold text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                {isSignUp
                  ? (isMemberInvitation ? 'Create Account & Join Chapter' : 'Create Account & View Dues')
                  : (isMemberInvitation ? 'Sign In & Join Chapter' : 'Sign In & View Dues')
                }
              </button>
            </form>

            <div className="mt-6 text-center">
              <button
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-sm text-indigo-600 hover:text-indigo-500"
              >
                {isSignUp
                  ? 'Already have an account? Sign in'
                  : "Don't have an account? Sign up"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
