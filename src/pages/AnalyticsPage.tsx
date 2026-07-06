import { motion } from 'framer-motion';
import {
  BarChart3,
  TrendingUp,
  Users,
  Calendar,
  Download,
  Filter,
  Package,
  Archive,
  Clock,
  Loader2
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { StatCard } from '@/components/ui/stat-card';
import { Button } from '@/components/ui/button';
import { mockAnalytics } from '@/lib/mockData';
import { useAnalyticsData } from '@/hooks/useAnalyticsData';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
  Area,
  AreaChart
} from 'recharts';

const COLORS = ['hsl(221, 83%, 53%)', 'hsl(38, 92%, 50%)', 'hsl(142, 76%, 36%)', 'hsl(0, 84%, 60%)', 'hsl(250, 84%, 54%)', 'hsl(199, 89%, 48%)'];

export default function AnalyticsPage() {
  const { data, isLoading, error } = useAnalyticsData();

  if (isLoading) {
    return (
      <MainLayout>
        <div className="p-8 flex items-center justify-center h-full min-h-[50vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <div className="p-8">
          <div className="bg-destructive/10 text-destructive p-4 rounded-lg">
            Failed to load analytics data. Please try again later.
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="p-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <motion.h1
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-3xl font-bold"
            >
              Analytics & Reports
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-muted-foreground mt-1"
            >
              Comprehensive insights into event performance
            </motion.p>
          </div>

          <div className="flex gap-3">
            <Button variant="outline">
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </Button>
            <Button className="gradient-primary text-white">
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Events"
            value={data.totalEvents}
            icon={Calendar}
            variant="primary"
            delay={0}
          />
          <StatCard
            title="Active Users"
            value={data.totalUsers.toLocaleString()}
            icon={Users}
            variant="success"
            delay={0.1}
          />
          <StatCard
            title="Registered Students"
            value={data.totalRegistrants.toLocaleString()}
            icon={Users}
            variant="accent"
            delay={0.2}
          />
          <StatCard
            title="Attendance Records"
            value={data.totalAttendance.toLocaleString()}
            icon={TrendingUp}
            variant="warning"
            delay={0.3}
          />
          <StatCard
            title="Resources Available"
            value={data.totalResources.toLocaleString()}
            icon={Package}
            variant="primary"
            delay={0.4}
          />
          <StatCard
            title="Resources Allocated"
            value={data.allocatedResources.toLocaleString()}
            icon={Archive}
            variant="success"
            delay={0.5}
          />
          <StatCard
            title="Upcoming Events"
            value={data.upcomingEvents.toLocaleString()}
            icon={Clock}
            variant="accent"
            delay={0.6}
          />
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Registrations Trend */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-card rounded-2xl border border-border p-6"
          >
            <h3 className="text-lg font-semibold mb-6">Registration Trends</h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={mockAnalytics.monthlyTrends}>
                <defs>
                  <linearGradient id="colorRegistrations" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(221, 83%, 53%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(221, 83%, 53%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="registrations"
                  stroke="hsl(221, 83%, 53%)"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorRegistrations)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Department Participation */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-card rounded-2xl border border-border p-6"
          >
            <h3 className="text-lg font-semibold mb-6">Department Participation</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={mockAnalytics.departmentParticipation}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="count"
                  nameKey="department"
                  label={({ department, percent }) => `${department} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {mockAnalytics.departmentParticipation.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Popular Events */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-card rounded-2xl border border-border p-6"
          >
            <h3 className="text-lg font-semibold mb-6">Popular Events</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={mockAnalytics.popularEvents} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis
                  type="category"
                  dataKey="name"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  width={120}
                  tickFormatter={(value) => value.length > 15 ? value.substring(0, 15) + '...' : value}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="registrations" fill="hsl(var(--accent))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Events vs Registrations */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="bg-card rounded-2xl border border-border p-6"
          >
            <h3 className="text-lg font-semibold mb-6">Events vs Registrations</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={mockAnalytics.monthlyTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis yAxisId="left" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="events"
                  stroke="hsl(221, 83%, 53%)"
                  strokeWidth={2}
                  dot={{ fill: 'hsl(221, 83%, 53%)', strokeWidth: 2, r: 4 }}
                  name="Events"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="registrations"
                  stroke="hsl(var(--accent))"
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--accent))', strokeWidth: 2, r: 4 }}
                  name="Registrations"
                />
              </LineChart>
            </ResponsiveContainer>
          </motion.div>
        </div>

        {/* Recent Activity Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="bg-card rounded-2xl border border-border p-6"
        >
          <h3 className="text-lg font-semibold mb-6">Top Performing Events</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Event</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Registrations</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Attendance</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Rate</th>
                </tr>
              </thead>
              <tbody>
                {mockAnalytics.popularEvents.map((event, index) => (
                  <tr key={index} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
                    <td className="py-3 px-4 font-medium">{event.name}</td>
                    <td className="py-3 px-4">{event.registrations.toLocaleString()}</td>
                    <td className="py-3 px-4">{Math.floor(event.registrations * 0.85).toLocaleString()}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-1 bg-success/10 text-success rounded-md text-sm font-medium">
                        85%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </MainLayout>
  );
}
