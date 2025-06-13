"use client";
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface ChartData {
  name: string;
  biaya: number;
  waktu: number;
}

interface BarChartProps {
  data: ChartData[];
}

const BarChart = ({ data }: BarChartProps) => {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <RechartsBarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey="biaya" fill="#3b82f6" name="Biaya (Rp)" />
        <Bar dataKey="waktu" fill="#10b981" name="Waktu (menit)" />
      </RechartsBarChart>
    </ResponsiveContainer>
  );
};

export default BarChart;
