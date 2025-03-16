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
  const [endDate, setEndDate] = useState(new Date('2024-12-31'));

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
    });

    // Add candlestick series with its own price scale
    const candleSeries = chart.addCandlestickSeries({
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
      priceScaleId: 'right',
    });

    // Add volume series with a separate price scale
    const volumeSeries = chart.addHistogramSeries({
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: 'volume',
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });

    // Configure the volume price scale
    chart.priceScale('volume').applyOptions({
      scaleMargins: {
        top: 0.8, // Position volume at the bottom 20% of the chart
        bottom: 0,
      },
      visible: true,
      borderVisible: true,
      borderColor: '#d1d1d1',
      textColor: '#888888',
      autoScale: true,
    });

    // Configure the main price scale
    chart.priceScale('right').applyOptions({
      scaleMargins: {
        top: 0.1, // Leave some space at the top
        bottom: 0.2, // This space is for the volume chart
      },
      borderColor: '#d1d1d1',
      visible: true,
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

  // Fetch data when time range changes or end date changes
  useEffect(() => {
    if (chartRef.current) {
      fetchData();
    }
  }, [timeRange, endDate]);

  const fetchData = async () => {
    if (!chartRef.current || !candleSeriesRef.current || !volumeSeriesRef.current) {
      console.error('Chart not initialized');
      return;
    }
  
    setLoading(true);
    setError(null);

    try {
      // Use the selected end date
      const endDateTime = endDate.getTime();
      const startDate = new Date('2017-01-01').getTime();
      let queryStartTime;

      switch (timeRange) {
        case '1d':
          queryStartTime = endDateTime - 24 * 60 * 60 * 1000;
          break;
        case '7d':
          queryStartTime = endDateTime - 7 * 24 * 60 * 60 * 1000;
          break;
        case '1m':
          queryStartTime = endDateTime - 30 * 24 * 60 * 60 * 1000;
          break;
        case '3m':
          queryStartTime = endDateTime - 90 * 24 * 60 * 60 * 1000;
          break;
        case '6m':
          queryStartTime = endDateTime - 180 * 24 * 60 * 60 * 1000;
          break;
        case '1y':
          queryStartTime = endDateTime - 365 * 24 * 60 * 60 * 1000;
          break;
        case '2y':
          queryStartTime = endDateTime - 2 * 365 * 24 * 60 * 60 * 1000;
          break;
        case '3y':
          queryStartTime = endDateTime - 3 * 365 * 24 * 60 * 60 * 1000;
          break;
        case '5y':
          queryStartTime = endDateTime - 5 * 365 * 24 * 60 * 60 * 1000;
          break;
        case 'all':
          // Use complete dataset from 2017
          queryStartTime = startDate;
          break;
        default:
          queryStartTime = endDateTime - 24 * 60 * 60 * 1000;
      }

      console.log(`Fetching data from ${new Date(queryStartTime).toISOString()} to ${new Date(endDateTime).toISOString()}`);

      const response = await axios.get('http://localhost:8000/binance_data/', {
        params: {
          start_time: queryStartTime,
          end_time: endDateTime,
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
          
          // Add a visual separator between price and volume
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

  const handleEndDateChange = (e) => {
    setEndDate(new Date(e.target.value));
  };

  return (
    <div className="candlestick-chart-container">
      <h2>BTC/USDT Candlestick Chart</h2>

      <div className="chart-controls">
        <div className="date-selector">
          <label htmlFor="candle-end-date">End Date:</label>
          <input 
            type="date" 
            id="candle-end-date" 
            value={endDate.toISOString().split('T')[0]} 
            onChange={handleEndDateChange}
            max={new Date().toISOString().split('T')[0]}
          />
        </div>

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
            className={timeRange === '6m' ? 'active' : ''}
            onClick={() => handleTimeRangeChange('6m')}
          >
            6M
          </button>
          <button
            className={timeRange === '1y' ? 'active' : ''}
            onClick={() => handleTimeRangeChange('1y')}
          >
            1Y
          </button>
          <button
            className={timeRange === '2y' ? 'active' : ''}
            onClick={() => handleTimeRangeChange('2y')}
          >
            2Y
          </button>
          <button
            className={timeRange === '3y' ? 'active' : ''}
            onClick={() => handleTimeRangeChange('3y')}
          >
            3Y
          </button>
          <button
            className={timeRange === '5y' ? 'active' : ''}
            onClick={() => handleTimeRangeChange('5y')}
          >
            5Y
          </button>
          <button
            className={timeRange === 'all' ? 'active' : ''}
            onClick={() => handleTimeRangeChange('all')}
          >
            All
          </button>
        </div>
      </div>

      {loading && <div className="loading">Loading chart data...</div>}
      {error && <div className="error-message">{error}</div>}
      <div ref={chartContainerRef} style={{ height: '500px' }} />
    </div>
  );
}

export default CandlestickChart;