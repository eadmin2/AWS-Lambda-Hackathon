import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Users, FileText, CreditCard, BarChart3, Search } from 'lucide-react';
import PageLayout from '../components/layout/PageLayout';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { formatDate } from '../lib/utils';

const AdminDashboard = () => {
  const { user, profile, isLoading } = useAuth();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalDocuments: 0,
    activeSubscriptions: 0,
    revenueThisMonth: 0,
  });
  const [users, setUsers] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoadingData, setIsLoadingData] = useState(true);

  useEffect(() => {
    if (!user || profile?.role !== 'admin') return;

    const fetchData = async () => {
      try {
        setIsLoadingData(true);

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
          revenueThisMonth: paymentsData?.reduce((acc, payment) => acc + 49, 0) || 0,
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
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchData();
  }, [user, profile]);

  // Redirect if not admin
  if (!isLoading && (!user || profile?.role !== 'admin')) {
    return <Navigate to="/dashboard" replace />;
  }

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <PageLayout>
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
                          {user.documents?.[0]?.count || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {user.payments?.[0]?.subscription_status || 'None'}
                          </div>
                          {user.payments?.[0]?.upload_credits > 0 && (
                            <div className="text-sm text-gray-500">
                              {user.payments[0].upload_credits} credits
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              // Implement role toggle
                              const newRole = user.role === 'admin' ? 'veteran' : 'admin';
                              supabase
                                .from('profiles')
                                .update({ role: newRole })
                                .eq('id', user.id)
                                .then(() => {
                                  setUsers(users.map(u => 
                                    u.id === user.id ? { ...u, role: newRole } : u
                                  ));
                                });
                            }}
                          >
                            Toggle Role
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
                          {formatDate(doc.uploaded_at)}
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
        </div>
      </div>
    </PageLayout>
  );
};

export default AdminDashboard;