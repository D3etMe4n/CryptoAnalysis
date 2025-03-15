import React, { useEffect, useRef, useState } from 'react';
import { createChart } from 'lightweight-charts';
import axios from 'axios';

function LineChart() {
  const chartContainerRef = useRef();
  const [timeRange, setTimeRange] = useState('1d');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);

  // Function to create chart
  const createChartInstance = () => {
    if (!chartContainerRef.current) return null;

    // Create a new chart
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 400,
      layout: {
        background: { type: 'solid', color: '#ffffff' },
        textColor: '#333',
      },
      grid: {
        vertLines: { color: '#e0e0e0' },
        horzLines: { color: '#e0e0e0' },
      },
      timeScale: {
        borderColor: '#d1d1d1',
        timeVisible: true,
      },
      rightPriceScale: {
        borderColor: '#d1d1d1',
      },
    });

    // Add line series
    const lineSeries = chart.addLineSeries({
      color: '#2962FF',
      lineWidth: 2,
      priceLineVisible: false,
    });

    // Save references
    chartRef.current = chart;
    seriesRef.current = lineSeries;

    return chart;
  };

  // Initialize chart only once when component mounts
  useEffect(() => {
    const chart = createChartInstance();
    
    if (!chart) {
      setError('Failed to initialize chart');
      return;
    }
    
    // Add a window resize handler
    const handleResize = () => {
      if (chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);
    fetchData();

    // Clean up function
    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
        seriesRef.current = null;
      }
    };
  }, []);

  // Fetch data when time range changes
  useEffect(() => {
    if (chartRef.current) {
      fetchData();
    }
  }, [timeRange]);

  const fetchData = async () => {
    if (!chartRef.current || !seriesRef.current) {
      console.error('Chart not initialized');
      return;
    }
  
    setLoading(true);
    setError(null);
  
    try {
    // Fixed time range: from 2017 to Dec 31, 2024
    const startDate = new Date('2017-01-01').getTime();
    const endDate = new Date('2024-12-31T23:59:59').getTime();
    let queryStartTime;

    switch(timeRange) {
      case '1d':
        queryStartTime = endDate - 24 * 60 * 60 * 1000;
        break;
      case '7d':
        queryStartTime = endDate - 7 * 24 * 60 * 60 * 1000;
        break;
      case '1m':
        queryStartTime = endDate - 30 * 24 * 60 * 60 * 1000;
        break;
      case '3m':
        queryStartTime = endDate - 90 * 24 * 60 * 60 * 1000;
        break;
      case 'all':
        queryStartTime = startDate;
        break;
      default:
        queryStartTime = endDate - 24 * 60 * 60 * 1000;
    }

    console.log(`Fetching data from ${new Date(queryStartTime).toISOString()} to ${new Date(endDate).toISOString()}`);

    const response = await axios.get('http://localhost:8000/binance_data/', {
      params: {
        start_time: queryStartTime,
        end_time: endDate, // Fixed end date instead of current time
        limit: 10000 // Increased to get more historical data points
      }
    });
  
      if (response.data && response.data.length > 0) {
        const lineData = response.data.map(item => ({
          time: Math.floor(new Date(item.open_time).getTime() / 1000),
          value: parseFloat(item.close)
        }));
  
        console.log(`Line chart: Received ${lineData.length} data points`);
        
        if (lineData.length > 0) {
          console.log('First data point:', new Date(lineData[0].time * 1000).toISOString());
          console.log('Last data point:', new Date(lineData[lineData.length-1].time * 1000).toISOString());
        }
        
        // Check if series is still valid before setting data
        if (seriesRef.current && chartRef.current) {
          seriesRef.current.setData(lineData);
          chartRef.current.timeScale().fitContent();
        }
      } else {
        console.warn('No data received from API');
        setError('No data available for the selected time range');
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(`Failed to load chart data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleTimeRangeChange = (range) => {
    setTimeRange(range);
  };

  return (
    <div className="line-chart-container">
      <h2>BTC/USDT Price History</h2>
      
      <div className="time-range-buttons">
        <button 
          className={timeRange === '1d' ? 'active' : ''}
          onClick={() => handleTimeRangeChange('1d')}
        >
          1D
        </button>
        <button 
          className={timeRange === '7d' ? 'active' : ''}
          onClick={() => handleTimeRangeChange('7d')}
        >
          7D
        </button>
        <button 
          className={timeRange === '1m' ? 'active' : ''}
          onClick={() => handleTimeRangeChange('1m')}
        >
          1M
        </button>
        <button 
          className={timeRange === '3m' ? 'active' : ''}
          onClick={() => handleTimeRangeChange('3m')}
        >
          3M
        </button>
        <button 
          className={timeRange === 'all' ? 'active' : ''}
          onClick={() => handleTimeRangeChange('all')}
        >
          All Time
        </button>
      </div>
      
      {loading && <div className="loading">Loading chart data...</div>}
      {error && <div className="error-message">{error}</div>}
      <div ref={chartContainerRef} style={{ height: '400px' }} />
    </div>
  );
}

export default LineChart;