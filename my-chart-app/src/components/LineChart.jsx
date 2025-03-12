import React, { useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import axios from 'axios';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const LineChart = () => {
  const [chartData, setChartData] = useState(null);

  useEffect(() => {
    // Fetch data from the backend
    axios.get('http://localhost:8000/binance_data')
      .then(response => {
        const data = response.data;
        const labels = data.map(item => new Date(item.open_time).toLocaleDateString());
        const openPrices = data.map(item => item.open_price);
        const closePrices = data.map(item => item.close);
        
        console.log('Labels:', labels);
        console.log('Open Prices:', openPrices);
        console.log('Close Prices:', closePrices);
        
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

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Binance Data Chart',
      },
    },
  };

  return chartData ? <Line options={options} data={chartData} /> : <p>Loading...</p>;
};

export default LineChart;