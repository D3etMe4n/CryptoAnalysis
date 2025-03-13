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
import { CandlestickController, CandlestickElement } from 'chartjs-chart-financial'; // Changed import
import { Chart } from 'react-chartjs-2';
import axios from 'axios';
import 'chartjs-adapter-date-fns';
import zoomPlugin from 'chartjs-plugin-zoom';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  TimeScale,
  Title,
  Tooltip,
  Legend,
  zoomPlugin,
  CandlestickController, // Added this
  CandlestickElement
);

const CandlestickChart = () => {
  const [chartData, setChartData] = useState(null);

  useEffect(() => {
    axios.get('http://localhost:8000/binance_data')
      .then(response => {
        const data = response.data.slice(0, 100);

        setChartData({
          labels: data.map(item => new Date(item.open_time)),
          datasets: [
            {
              label: 'BTCUSDT',
              data: data.map(item => ({
                x: new Date(item.open_time),
                o: parseFloat(item.open_price),
                h: parseFloat(item.high),
                l: parseFloat(item.low),
                c: parseFloat(item.close)
              })),
              borderColor: '#000000',
              color: {
                up: '#00ff00',
                down: '#ff0000',
              }
            }
          ]
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
        text: 'BTCUSDT Candlestick Chart'
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
          displayFormats: {
            minute: 'HH:mm'
          }
        },
        ticks: {
          source: 'auto',
          maxRotation: 45,
          minRotation: 45
        }
      },
      y: {
        position: 'right',
        title: {
          display: true,
          text: 'Price (USDT)'
        }
      }
    }
  };

  return (
    <div>
      <div style={{ 
        marginBottom: '20px', 
        width: '1000px',
        height: '600px'
      }}>
        {chartData ? (
          <Chart
            type='candlestick'
            options={options}
            data={chartData}
            id="candlestickChart"
          />
        ) : (
          <p>Loading candlestick chart...</p>
        )}
      </div>
    </div>
  );
};

export default CandlestickChart;