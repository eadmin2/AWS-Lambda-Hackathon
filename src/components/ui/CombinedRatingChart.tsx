import React from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { motion } from 'framer-motion';

interface ChartData {
  name: string;
  value: number;
  color: string;
}

interface CombinedRatingChartProps {
  data: ChartData[];
}

const CombinedRatingChart: React.FC<CombinedRatingChartProps> = ({ data }) => {
  return (
    <motion.div
      className="bg-white rounded-lg shadow p-4 w-full h-72"
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Condition % Contribution</h2>
      <ResponsiveContainer width="100%" height="90%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
            {data.map((entry, idx) => (
              <Cell key={`cell-${idx}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip formatter={(value: number, name: string) => [`${value}%`, name]} />
        </PieChart>
      </ResponsiveContainer>
    </motion.div>
  );
};

export default CombinedRatingChart; 