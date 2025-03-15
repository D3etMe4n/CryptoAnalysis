import React, { useEffect, useRef, useState } from 'react';
import { createChart } from 'lightweight-charts';
import axios from 'axios';

function CandlestickChart() {
  const chartContainerRef = useRef();
  const [timeRange, setTimeRange] = useState('1d');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const chartRef = useRef(null);
  const candleSeriesRef = useRef(null);
  const volumeSeriesRef = useRef(null);

  // Function to create chart
  const createChartInstance = () => {
    if (!chartContainerRef.current) return null;

    // Create a new chart
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 500,
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

    // Add candlestick series
    const candleSeries = chart.addCandlestickSeries({
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });

    // Add volume series
    const volumeSeries = chart.addHistogramSeries({
      color: '#26a69a',
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: '',
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });

    // Save references
    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;

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
        candleSeriesRef.current = null;
        volumeSeriesRef.current = null;
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
    if (!chartRef.current || !candleSeriesRef.current || !volumeSeriesRef.current) {
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

 switch (timeRange) {
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
     // Use complete dataset from 2017
     queryStartTime = startDate;
     break;
   default:
     queryStartTime = endDate - 24 * 60 * 60 * 1000;
 }

 console.log(`Fetching data from ${new Date(queryStartTime).toISOString()} to ${new Date(endDate).toISOString()}`);

 const response = await axios.get('http://localhost:8000/binance_data/', {
   params: {
     start_time: queryStartTime,
     end_time: endDate,  // Fixed end date instead of current time
     limit: 10000,   // Increased limit for more data points
   },
 });

      console.log(`Received ${response.data?.length} data points`);

      if (response.data && response.data.length > 0) {
        // Format data for candlestick chart - parse timestamp correctly
        const candlestickData = response.data.map((item) => {
          return {
            time: Math.floor(new Date(item.open_time).getTime() / 1000),
            open: parseFloat(item.open_price),
            high: parseFloat(item.high),
            low: parseFloat(item.low),
            close: parseFloat(item.close),
          };
        });

        // Format data for volume
        const volumeData = response.data.map((item) => {
          return {
            time: Math.floor(new Date(item.open_time).getTime() / 1000),
            value: parseFloat(item.volume),
            color: parseFloat(item.close) >= parseFloat(item.open_price) ? '#26a69a' : '#ef5350',
          };
        });

        if (candlestickData.length > 0) {
          console.log('First candlestick data point:', new Date(candlestickData[0].time * 1000).toISOString());
          console.log('Last candlestick data point:', new Date(candlestickData[candlestickData.length-1].time * 1000).toISOString());
        }

        // Set data only if chart is still valid
        if (candleSeriesRef.current && volumeSeriesRef.current) {
          candleSeriesRef.current.setData(candlestickData);
          volumeSeriesRef.current.setData(volumeData);
          chartRef.current.timeScale().fitContent();
        }
      } else {
        console.warn('No data received from API');
        setError('No data available for the selected time range.');
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
    <div className="candlestick-chart-container">
      <h2>BTC/USDT Candlestick Chart</h2>

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
      <div ref={chartContainerRef} style={{ height: '500px' }} />
    </div>
  );
}

export default CandlestickChart;