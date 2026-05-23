"use client";

import React, { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface ActivityDataPoint {
  month: string;
  visits: number;
}

interface TravelActivityChartProps {
  userId?: string;
}

const getApiBase = () => {
  if (typeof window !== "undefined") {
    const { hostname, protocol } = window.location;
    if (hostname !== "localhost" && hostname !== "127.0.0.1") {
      return `${protocol}//${hostname}:4000`;
    }
  }
  return "http://localhost:4000";
};

const TravelActivityChart: React.FC<TravelActivityChartProps> = () => {
  const [activityData, setActivityData] = useState<ActivityDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTravelActivity = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          setError("Not authenticated");
          return;
        }

        const apiBase = getApiBase();
        console.log("Fetching from:", `${apiBase}/api/visits/activity/last-6-months`);

        const response = await fetch(`${apiBase}/api/visits/activity/last-6-months`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error("Fetch error status:", response.status);
          console.error("Fetch error data:", errorData);
          throw new Error(errorData.error || `Failed to fetch travel activity: ${response.status}`);
        }

        const data = await response.json();
        if (data.success && Array.isArray(data.data)) {
          setActivityData(data.data);
        }
      } catch (err) {
        console.error("Error fetching travel activity:", err);
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    fetchTravelActivity();
  }, []);

  if (loading) {
    return (
      <div className="w-full h-96 flex items-center justify-center bg-white rounded-2xl shadow-lg">
        <p className="text-gray-500">Loading travel activity data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-96 flex items-center justify-center bg-white rounded-2xl shadow-lg">
        <p className="text-red-500">Error: {error}</p>
      </div>
    );
  }

  if (activityData.length === 0) {
    return (
      <div className="w-full h-96 flex items-center justify-center bg-white rounded-2xl shadow-lg">
        <p className="text-gray-500">No travel activity data available for the last 6 months</p>
      </div>
    );
  }

  return (
    <div className="w-full bg-white rounded-2xl shadow-lg p-8">
      <div className="mb-6">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Travel Activity</h3>
        <p className="text-gray-600">Count of completed visits per month for the last 6 months</p>
      </div>

      <ResponsiveContainer width="100%" height={400}>
        <LineChart
          data={activityData}
          margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="month"
            stroke="#6b7280"
            style={{ fontSize: "14px" }}
          />
          <YAxis
            stroke="#6b7280"
            style={{ fontSize: "14px" }}
            label={{ value: "Number of Visits", angle: -90, position: "insideLeft" }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
            }}
            formatter={(value: number | undefined) => [value ?? 0, "Completed Visits"]}
            labelStyle={{ color: "#1f2937" }}
          />
          <Legend wrapperStyle={{ paddingTop: "20px" }} />
          <Line
            type="monotone"
            dataKey="visits"
            stroke="#4A9B7F"
            strokeWidth={3}
            dot={{ fill: "#4A9B7F", r: 5 }}
            activeDot={{ r: 7 }}
            name="Completed Visits"
            isAnimationActive={true}
          />
        </LineChart>
      </ResponsiveContainer>

      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-gray-700">
          <span className="font-semibold text-blue-900">Travel Activity Definition:</span> The count of completed VisitLogs per month for the last 6 months. This metric helps you track how actively you've been exploring and visiting new places.
        </p>
      </div>
    </div>
  );
};

export default TravelActivityChart;
