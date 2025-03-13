import React, { useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import axios from 'axios';
import 'chartjs-adapter-date-fns';
import zoomPlugin from 'chartjs-plugin-zoom';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  TimeScale,
  Title,
  Tooltip,
  Legend,
  zoomPlugin
);

const LineChart = () => {
  const [chartData, setChartData] = useState(null);

  useEffect(() => {
    // Fetch data from the backend
    axios.get('http://localhost:8000/binance_data')
      .then(response => {
        const data = response.data.slice(0, 100); // Fetch a smaller subset of data

        // Data for line chart
        const labels = data.map(item => new Date(item.open_time));
        const openPrices = data.map(item => item.open_price);
        const closePrices = data.map(item => item.close);

        setChartData({
          labels,
          datasets: [
            {
              label: 'Open Price',
              data: openPrices,
              borderColor: 'rgb(75, 192, 192)',
              tension: 0.1,
            },
            {
              label: 'Close Price',
              data: closePrices,
              borderColor: 'rgb(255, 99, 132)',
              tension: 0.1,
            },
          ],
        });
      })
      .catch(error => {
        console.error('Error fetching data:', error);
      });
  }, []);

  const lineOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Line Chart',
      },
      zoom: {
        zoom: {
          wheel: {
            enabled: true,
          },
          pinch: {
            enabled: true
          },
          mode: 'xy'
        },
        pan: {
          enabled: true,
          mode: 'xy'
        }
      }
    },
    scales: {
      x: {
        type: 'time',
        time: {
          unit: 'minute',
          stepSize: 30,
          displayFormats: {
            minute: 'HH:mm'
          },
        },
        ticks: {
          source: 'auto',
          autoSkip: true,  // Changed to true to allow proper tick spacing
          maxTicksLimit: 10, // Limit the number of ticks to prevent overcrowding
          maxRotation: 45,  // Allow rotation for better readability
          minRotation: 45,  // Rotate labels for better fit
          callback: function(value) {
            const date = new Date(value);
            return date.toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit',
              hour12: true // Ensures AM/PM format
            });
          }
        }
      },
      y: {
        title: {
          display: true,
          text: 'Price (USDT)'
        }
      }
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '20px', width: '1000px' }}>
        {chartData ? (
          <Line
            options={lineOptions}
            data={chartData}
            id="lineChart"
          />
        ) : (
          <p>Loading line chart...</p>
        )}
      </div>
    </div>
  );
};

export default LineChart;