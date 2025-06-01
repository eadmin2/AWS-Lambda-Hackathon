import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Users, FileText, CreditCard, BarChart3, Search } from 'lucide-react';
import PageLayout from '../components/layout/PageLayout';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { formatDate } from '../lib/utils';
import UserDetailModal from '../components/UserDetailModal';
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend } from 'recharts';

interface AdminUser {
  id: string;
  email: string;
  full_name?: string;
  role: string;
  documents?: { count: number }[];
  payments?: {
    subscription_status?: string;
    subscription_end_date?: string;
    upload_credits?: number;
  }[];
}

interface AdminDocument {
  id: string;
  file_name: string;
  file_url?: string;
  uploaded_at?: string;
  profiles?: {
    email?: string;
    full_name?: string;
  };
  disability_estimates?: {
    condition?: string;
    estimated_rating?: number;
    combined_rating?: number;
  }[];
}

interface AdminActivityLog {
  id: string;
  admin_id: string;
  admin_email: string;
  action: string;
  target_type: string;
  target_id: string;
  details: any;
  created_at: string;
}

// Helper to render compact details
function renderLogDetails(details: any) {
  let parsed: any = details;
  if (typeof details === 'string') {
    try {
      parsed = JSON.parse(details);
    } catch {
      return details;
    }
  }
  if (parsed && parsed.old && parsed.new) {
    // Show only changed fields
    const changes = Object.keys(parsed.new)
      .filter(key => parsed.old[key] !== parsed.new[key])
      .map(key => `${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}: ${parsed.old[key] ?? '—'} → ${parsed.new[key] ?? '—'}`);
    return changes.length > 0 ? changes.join(', ') : 'No changes';
  } else if (parsed && typeof parsed === 'object') {
    // For other actions, show key: old → new or key: value
    return Object.entries(parsed)
      .map(([key, value]) => {
        if (
          value &&
          typeof value === 'object' &&
          'old' in value &&
          'new' in value &&
          value.old !== undefined &&
          value.new !== undefined
        ) {
          return `${key}: ${value.old} → ${value.new}`;
        }
        return `${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}: ${value}`;
      })
      .join(', ');
  }
  return typeof parsed === 'string' ? parsed : JSON.stringify(parsed);
}

const IMPERSONATION_KEY = 'admin_impersonation_session';

const AdminDashboard = () => {
  const { user, profile, isLoading } = useAuth();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalDocuments: 0,
    activeSubscriptions: 0,
    revenueThisMonth: 0,
  });
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [documents, setDocuments] = useState<AdminDocument[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activityLogs, setActivityLogs] = useState<AdminActivityLog[]>([]);

  // User detail modal state
  const [selectedUser, setSelectedUser] = useState<AdminUser & { user_documents?: any[] } | null>(null);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [userModalLoading, setUserModalLoading] = useState(false);

  // Analytics state
  const [userSignups, setUserSignups] = useState<any[]>([]);
  const [documentUploads, setDocumentUploads] = useState<any[]>([]);
  const [revenueTrends, setRevenueTrends] = useState<any[]>([]);
  const [activeInactiveUsers, setActiveInactiveUsers] = useState<any[]>([]);

  // Notifications state
  const [notifications, setNotifications] = useState<any[]>([]);
  const [bellOpen, setBellOpen] = useState(false);

  // Impersonation state
  const [isImpersonating, setIsImpersonating] = useState(false);

  // Handler to dismiss a notification
  const handleDismissNotification = (idx: number) => {
    setNotifications((prev) => {
      const newNotifs = prev.filter((_, i) => i !== idx);
      if (newNotifs.length === 0) setBellOpen(false);
      return newNotifs;
    });
  };

  useEffect(() => {
    if (!user || profile?.role !== 'admin') return;

    const fetchData = async () => {
      try {
        // Fetch stats
        const { data: usersData } = await supabase
          .from('profiles')
          .select('*');

        const { data: docsData } = await supabase
          .from('documents')
          .select('*');

        const { data: paymentsData } = await supabase
          .from('payments')
          .select('*')
          .eq('subscription_status', 'active');

        setStats({
          totalUsers: usersData?.length || 0,
          totalDocuments: docsData?.length || 0,
          activeSubscriptions: paymentsData?.length || 0,
          revenueThisMonth: paymentsData?.reduce((acc) => acc + 49, 0) || 0,
        });

        // Fetch users with their documents and payments
        const { data: userData } = await supabase
          .from('profiles')
          .select(`
            *,
            documents (count),
            payments (
              subscription_status,
              subscription_end_date,
              upload_credits
            )
          `);

        setUsers(userData || []);

        // Fetch recent documents
        const { data: recentDocs } = await supabase
          .from('documents')
          .select(`
            *,
            profiles (email, full_name),
            disability_estimates (
              condition,
              estimated_rating,
              combined_rating
            )
          `)
          .order('uploaded_at', { ascending: false })
          .limit(10);

        setDocuments(recentDocs || []);
      } catch (error) {
        console.error('Error fetching admin data:', error);
      }
    };

    fetchData();

    // Fetch analytics data
    const fetchAnalytics = async () => {
      // User signups by month
      const { data: signupData } = await supabase.rpc('monthly_user_signups');
      setUserSignups(signupData || []);
      // Document uploads by month
      const { data: docData } = await supabase.rpc('monthly_document_uploads');
      setDocumentUploads(docData || []);
      // Revenue by month
      const { data: revData } = await supabase.rpc('monthly_revenue');
      setRevenueTrends(revData || []);
      // Active vs inactive users
      const { data: activeData } = await supabase.rpc('active_inactive_users');
      setActiveInactiveUsers(activeData || []);
    };
    fetchAnalytics();

    // Fetch notifications
    const fetchNotifications = async () => {
      const now = new Date();
      const in7days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      // Expiring subscriptions (end date within 7 days)
      const { data: expiring } = await supabase
        .from('payments')
        .select('id, user_id, subscription_end_date, subscription_status, profiles (email, full_name)')
        .eq('subscription_status', 'active')
        .gte('subscription_end_date', now.toISOString())
        .lte('subscription_end_date', in7days.toISOString());
      // New orders (last 7 days, status active)
      const { data: newOrders } = await supabase
        .from('payments')
        .select('id, user_id, created_at, subscription_status, profiles (email, full_name)')
        .eq('subscription_status', 'active')
        .gte('created_at', new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString());
      // Recently cancelled orders (last 7 days, status cancelled)
      const { data: cancelled } = await supabase
        .from('payments')
        .select('id, user_id, created_at, subscription_status, profiles (email, full_name)')
        .eq('subscription_status', 'cancelled')
        .gte('created_at', new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString());
      // Failed payments (last 7 days, status failed)
      const { data: failed } = await supabase
        .from('payments')
        .select('id, user_id, created_at, subscription_status, profiles (email, full_name)')
        .eq('subscription_status', 'failed')
        .gte('created_at', new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString());
      // Combine and sort notifications
      const notifs = [
        ...(expiring || []).map((n: any) => ({
          type: 'Expiring Subscription',
          user: n.profiles?.full_name || n.profiles?.email || n.user_id,
          date: n.subscription_end_date,
        })),
        ...(newOrders || []).map((n: any) => ({
          type: 'New Order',
          user: n.profiles?.full_name || n.profiles?.email || n.user_id,
          date: n.created_at,
        })),
        ...(cancelled || []).map((n: any) => ({
          type: 'Cancelled Order',
          user: n.profiles?.full_name || n.profiles?.email || n.user_id,
          date: n.created_at,
        })),
        ...(failed || []).map((n: any) => ({
          type: 'Failed Payment',
          user: n.profiles?.full_name || n.profiles?.email || n.user_id,
          date: n.created_at,
        })),
      ].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      setNotifications(notifs);
    };
    fetchNotifications();

    // Check if we're in impersonation mode on load
    const stored = localStorage.getItem(IMPERSONATION_KEY);
    if (stored) {
      setIsImpersonating(true);
    }
  }, [user, profile]);

  // Fetch activity logs
  useEffect(() => {
    if (!user || profile?.role !== 'admin') return;
    const fetchLogs = async () => {
      const { data } = await supabase
        .from('admin_activity_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      setActivityLogs(data || []);
    };
    fetchLogs();
  }, [user, profile]);

  // Redirect if not admin or not allowed
  if (!isLoading && (!user || !profile || profile.admin_level === 'readonly')) {
    return <Navigate to="/dashboard" replace />;
  }

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handler to open modal and fetch user documents and payments
  const handleViewUser = async (user: AdminUser) => {
    setUserModalLoading(true);
    // Fetch user's documents
    const { data: userDocs } = await supabase
      .from('documents')
      .select('id, file_name, uploaded_at')
      .eq('user_id', user.id)
      .order('uploaded_at', { ascending: false });
    // Fetch user's payments (all records)
    const { data: userPayments } = await supabase
      .from('payments')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setSelectedUser({ ...user, user_documents: userDocs || [], payments: userPayments || [] });
    setIsUserModalOpen(true);
    setUserModalLoading(false);
  };

  // Handler to update upload credits for a user
  const handleUpdateCredits = async (userId: string, paymentId: string, newCredits: number) => {
    await supabase
      .from('payments')
      .update({ upload_credits: newCredits })
      .eq('id', paymentId);
    // Refresh user payments in modal
    if (selectedUser && selectedUser.id === userId) {
      const { data: userPayments } = await supabase
        .from('payments')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      setSelectedUser({ ...selectedUser, payments: userPayments || [] });
    }
  };

  // Handler to save user edits
  const handleSaveUser = async (updated: { id: string; full_name?: string; role: string }) => {
    const oldUser = users.find(u => u.id === updated.id);
    await supabase
      .from('profiles')
      .update({ full_name: updated.full_name, role: updated.role })
      .eq('id', updated.id);
    setUsers(users => users.map(u =>
      u.id === updated.id ? { ...u, full_name: updated.full_name, role: updated.role } : u
    ));
    // Log admin action
    await supabase.from('admin_activity_log').insert([
      {
        admin_id: profile?.id,
        admin_email: profile?.email,
        action: 'edited user',
        target_type: 'user',
        target_id: updated.id,
        details: JSON.stringify({
          old: { full_name: oldUser?.full_name, role: oldUser?.role },
          new: { full_name: updated.full_name, role: updated.role }
        })
      }
    ]);
    // Refresh logs
    const { data } = await supabase
      .from('admin_activity_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);
    setActivityLogs(data || []);
  };

  // Handler to toggle user role
  const handleToggleRole = async (user: AdminUser) => {
    const newRole = user.role === 'admin' ? 'veteran' : 'admin';
    await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', user.id);
    setUsers(users => users.map(u =>
      u.id === user.id ? { ...u, role: newRole } : u
    ));
    // Log admin action
    await supabase.from('admin_activity_log').insert([
      {
        admin_id: profile?.id,
        admin_email: profile?.email,
        action: 'toggled role',
        target_type: 'user',
        target_id: user.id,
        details: JSON.stringify({ old: user.role, new: newRole })
      }
    ]);
    // Refresh logs
    const { data } = await supabase
      .from('admin_activity_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);
    setActivityLogs(data || []);
  };

  // Impersonate user handler
  const handleImpersonate = async (userId: string) => {
    // Store current session
    const currentSession = await supabase.auth.getSession();
    localStorage.setItem(IMPERSONATION_KEY, JSON.stringify({
      session: currentSession.data.session,
      impersonatedUserId: userId
    }));
    // Call Edge Function
    const resp = await fetch('/functions/v1/impersonate-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentSession.data.session?.access_token}`
      },
      body: JSON.stringify({ user_id: userId })
    });
    const data = await resp.json();
    if (data.session && data.session.access_token) {
      await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token
      });
      setIsImpersonating(true);
      window.location.reload(); // reload to update context
    } else {
      alert(data.error || 'Failed to impersonate user');
    }
  };

  // Return to admin handler
  const handleReturnToAdmin = async () => {
    const stored = localStorage.getItem(IMPERSONATION_KEY);
    if (stored) {
      const { session } = JSON.parse(stored);
      await supabase.auth.setSession(session);
      localStorage.removeItem(IMPERSONATION_KEY);
      setIsImpersonating(false);
      window.location.reload();
    }
  };

  return (
    <PageLayout
      notifications={notifications}
      onDismissNotification={handleDismissNotification}
      bellOpen={bellOpen}
      onBellOpenChange={setBellOpen}
    >
      {isImpersonating && (
        <div className="bg-yellow-100 border-b border-yellow-300 text-yellow-900 px-4 py-2 flex items-center justify-between">
          <span>
            <b>Impersonation Mode:</b> You are viewing the dashboard as another user.
          </span>
          <Button variant="danger" size="sm" onClick={handleReturnToAdmin}>
            Return to Admin
          </Button>
        </div>
      )}
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Admin Dashboard</h1>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center">
                  <Users className="h-8 w-8 text-primary-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Total Users</p>
                    <p className="text-2xl font-semibold text-gray-900">{stats.totalUsers}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center">
                  <FileText className="h-8 w-8 text-primary-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Documents</p>
                    <p className="text-2xl font-semibold text-gray-900">{stats.totalDocuments}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center">
                  <CreditCard className="h-8 w-8 text-primary-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Active Subscriptions</p>
                    <p className="text-2xl font-semibold text-gray-900">{stats.activeSubscriptions}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center">
                  <BarChart3 className="h-8 w-8 text-primary-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Monthly Revenue</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      ${stats.revenueThisMonth}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* User Management */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>User Management</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search users..."
                    className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Documents
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Subscription
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredUsers.map((user) => (
                      <tr key={user.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {user.full_name || 'N/A'}
                              </div>
                              <div className="text-sm text-gray-500">{user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            user.role === 'admin' 
                              ? 'bg-purple-100 text-purple-800' 
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.documents?.[0]?.count ?? 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {user.payments?.[0]?.subscription_status || 'None'}
                          </div>
                          {user.payments?.[0]?.upload_credits && (
                            <div className="text-sm text-gray-500">
                              {user.payments?.[0]?.upload_credits} credits
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium flex gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleViewUser(user)}
                            isLoading={userModalLoading && selectedUser?.id === user.id}
                            disabled={profile?.admin_level === 'readonly'}
                          >
                            View
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleToggleRole(user)}
                            disabled={profile?.admin_level === 'readonly'}
                          >
                            Toggle Role
                          </Button>
                          {profile?.admin_level === 'super_admin' && user.id !== profile.id && (
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => handleImpersonate(user.id)}
                            >
                              Impersonate
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Admin Activity Log */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Admin Activity Log</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Admin</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Target</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {activityLogs.map(log => (
                      <tr key={log.id}>
                        <td className="px-4 py-2 whitespace-nowrap text-sm">{log.admin_email}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm">{log.action}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm">{log.target_type} <span className="text-gray-400">/</span> {log.target_id}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-600 max-w-xs truncate" title={renderLogDetails(log.details)}>
                          {renderLogDetails(log.details)}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-500">{formatDate(log.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {activityLogs.length === 0 && <div className="text-gray-500 text-sm py-4">No recent admin activity.</div>}
              </div>
            </CardContent>
          </Card>

          {/* Recent Documents */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Documents</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Document
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Upload Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rating
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {documents.map((doc) => (
                      <tr key={doc.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {doc.file_name}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {doc.profiles?.full_name || 'N/A'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {doc.profiles?.email}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {doc.uploaded_at ? formatDate(doc.uploaded_at) : ''}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {doc.disability_estimates?.[0] ? (
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {doc.disability_estimates[0].combined_rating}%
                              </div>
                              <div className="text-xs text-gray-500">
                                Combined Rating
                              </div>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-500">Processing</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => window.open(doc.file_url, '_blank')}
                          >
                            View
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Analytics & Trends */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Analytics & Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* User Signups Over Time */}
                <div>
                  <h3 className="font-semibold mb-2">User Signups Over Time</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={userSignups} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Line type="monotone" dataKey="count" stroke="#8884d8" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                {/* Document Uploads Over Time */}
                <div>
                  <h3 className="font-semibold mb-2">Document Uploads Over Time</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={documentUploads} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Line type="monotone" dataKey="count" stroke="#82ca9d" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                {/* Revenue Trends */}
                <div>
                  <h3 className="font-semibold mb-2">Revenue Trends</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={revenueTrends} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="revenue" fill="#ffc658" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                {/* Active vs Inactive Users */}
                <div>
                  <h3 className="font-semibold mb-2">Active vs Inactive Users</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={activeInactiveUsers} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={80} label>
                        {activeInactiveUsers.map((_, idx) => (
                          <Cell key={`cell-${idx}`} fill={idx === 0 ? '#82ca9d' : '#d0d0d0'} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      {/* User Detail Modal */}
      <UserDetailModal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        user={selectedUser}
        onSave={handleSaveUser}
        loading={userModalLoading}
        onUpdateCredits={handleUpdateCredits}
        canEditCredits={profile?.admin_level === 'admin' || profile?.admin_level === 'super_admin'}
      />
    </PageLayout>
  );
};

export default AdminDashboard;