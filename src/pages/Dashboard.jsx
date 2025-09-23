import {
  CurrencyDollarIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';

const stats = [
  {
    name: 'Total Balance (USD)',
    value: '--',
    icon: CurrencyDollarIcon,
  },
  {
    name: 'Active Members',
    value: '--',
    icon: UserGroupIcon,
  },
  {
    name: 'Monthly Dues',
    value: '--',
    icon: CurrencyDollarIcon,
  },
];

export default function Dashboard() {
  return (
    <div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <div
            key={stat.name}
            className="relative overflow-hidden rounded-lg bg-white px-4 pb-12 pt-5 shadow sm:px-6 sm:pt-6"
          >
            <dt>
              <div className="absolute rounded-md bg-blue-500 p-3">
                <stat.icon className="h-6 w-6 text-white" aria-hidden="true" />
              </div>
              <p className="ml-16 truncate text-sm font-medium text-gray-500">
                {stat.name}
              </p>
            </dt>
            <dd className="ml-16 flex items-baseline pb-6 sm:pb-7">
              <p className="text-2xl font-semibold text-gray-900">
                {stat.value}
              </p>
            </dd>
          </div>
        ))}
      </div>
    </div>
  );
} 