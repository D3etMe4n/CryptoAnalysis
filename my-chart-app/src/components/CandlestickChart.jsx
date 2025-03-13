import React, { useEffect, useState, useCallback, useRef } from 'react';
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
import { CandlestickController, CandlestickElement } from 'chartjs-chart-financial';
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
  CandlestickController,
  CandlestickElement
);

const CandlestickChart = () => {
  const [chartData, setChartData] = useState(null);
  const [timeRange, setTimeRange] = useState('100');
  const [candleWidth, setCandleWidth] = useState(0.6);
  const [isLoading, setIsLoading] = useState(false);
  const [dynamicWidth, setDynamicWidth] = useState(0.6);
  const [visibleRange, setVisibleRange] = useState({ start: null, end: null });
  const chartRef = useRef(null);
  const dataCache = useRef(new Map()); // Cache for storing fetched data

  // Calculate chunk size based on time range
  const getChunkSize = (range) => {
    if (range === 'all') return 5000; // Increased for "all" option
    return Math.min(parseInt(range), 1000);
  };

  const fetchDataChunk = useCallback((start = null, end = null, chunkSize = 500) => {
    setIsLoading(true);
    
    // Prepare query parameters - use current time as end_time if not specified
    let queryParams = `?limit=${chunkSize}`;
    
    // If no end time provided, set it to now (recent data)
    if (!end) {
      end = new Date();
    }
    queryParams += `&end_time=${end.getTime()}`;
    
    // If start is provided, add it
    if (start) {
      queryParams += `&start_time=${start.getTime()}`;
    }
    
    // Generate a cache key based on the request parameters
    const cacheKey = queryParams;
    
    // Check if data is already in cache
    if (dataCache.current.has(cacheKey)) {
      console.log('Using cached data for', cacheKey);
      const cachedData = dataCache.current.get(cacheKey);
      updateChartWithData(cachedData);
      setIsLoading(false);
      return;
    }
    
    console.log('Fetching data chunk:', queryParams);
    axios.get(`http://localhost:8000/binance_data${queryParams}`)
      .then(response => {
        const newData = response.data;
        console.log(`Loaded ${newData.length} candles from ${new Date(newData[0]?.open_time).toLocaleDateString()} to ${new Date(newData[newData.length-1]?.open_time).toLocaleDateString()}`);
        
        // Store in cache
        dataCache.current.set(cacheKey, newData);
        
        // Update chart
        updateChartWithData(newData);
      })
      .catch(error => {
        console.error('Error fetching data:', error);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const updateChartWithData = (data) => {
    if (!data || data.length === 0) return;
    
    // Downsample data if there are too many points
    const processedData = downsampleData(data, 2000);
    
    // Sort data by time to ensure proper ordering
    processedData.sort((a, b) => new Date(a.open_time) - new Date(b.open_time));
    
    setChartData({
      datasets: [{
        label: 'BTCUSDT',
        data: processedData.map(item => ({
          x: new Date(item.open_time),
          o: parseFloat(item.open_price),
          h: parseFloat(item.high),
          l: parseFloat(item.low),
          c: parseFloat(item.close)
        }))
      }]
    });
  };

  // Downsample data to improve performance
  const downsampleData = (data, maxPoints) => {
    if (data.length <= maxPoints) return data;
    
    const skipFactor = Math.ceil(data.length / maxPoints);
    return data.filter((_, index) => index % skipFactor === 0);
  };

  // Initial data loading
  const fetchData = (range) => {
    const chunkSize = getChunkSize(range);
    
    // Clear previous data
    setChartData(null);
    
    // Calculate appropriate date range based on selected period
    const endDate = new Date(); // Now
    let startDate = null;
    
    if (range !== 'all') {
      // For specific candle counts, fetch most recent ones
      fetchDataChunk(null, endDate, parseInt(range));
    } else {
      // For "all" data, set a larger timeframe
      startDate = new Date();
      startDate.setFullYear(startDate.getFullYear() - 3); // Last 3 years
      fetchDataChunk(startDate, endDate, chunkSize);
    }
  };

  useEffect(() => {
    fetchData(timeRange);
  }, [timeRange]);

  // Load more data when panning to edge of chart
  const handlePanEdge = useCallback((chart) => {
    if (!chart || !chart.scales || !chart.scales.x) return;
    
    const xAxis = chart.scales.x;
    const visibleStart = new Date(xAxis.min);
    const visibleEnd = new Date(xAxis.max);
    
    // Store the visible range
    setVisibleRange({
      start: visibleStart,
      end: visibleEnd
    });
    
    // Check if we're near the edge of the currently loaded data
    const chartData = chart.data.datasets[0]?.data;
    if (!chartData || chartData.length === 0) return;
    
    const earliestPoint = new Date(chartData[0].x);
    const latestPoint = new Date(chartData[chartData.length - 1].x);
    
    const THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours
    
    // If we're near the beginning of the data, load more past data
    if (visibleStart - earliestPoint < THRESHOLD_MS) {
      // Load more historical data
      const newEndDate = new Date(earliestPoint);
      const newStartDate = new Date(newEndDate);
      newStartDate.setDate(newStartDate.getDate() - 30); // Load 30 days more
      
      fetchDataChunk(newStartDate, newEndDate);
    }
    
    // If we're near the end of the data, load more recent data
    if (latestPoint - visibleEnd < THRESHOLD_MS) {
      // Load more recent data
      const newStartDate = new Date(latestPoint);
      const newEndDate = new Date(newStartDate);
      newEndDate.setDate(newEndDate.getDate() + 30); // Load 30 days more
      
      fetchDataChunk(newStartDate, newEndDate);
    }
  }, [fetchDataChunk]);

  const handleResetZoom = () => {
    if (chartRef && chartRef.current) {
      chartRef.current.resetZoom();
      setDynamicWidth(candleWidth); // Reset to base width when zoom is reset
      
      // Reload initial data range
      fetchData(timeRange);
    }
  };

  // Dynamic candle width adjustment
  const handleZoom = useCallback((context) => {
    if (chartRef.current) {
      const chart = chartRef.current;
      // Get the current visible range
      const xAxis = chart.scales.x;
      const visibleRange = xAxis.max - xAxis.min;
      
      // Calculate points in visible range to adjust candle width
      const totalPoints = chart.data.datasets[0]?.data.length || 1;
      const msPerPoint = (chart.scales.x._max - chart.scales.x._min) / totalPoints;
      const pointsInView = visibleRange / msPerPoint;
      
      // Adjust candle width based on zoom level
      const baseWidth = candleWidth;
      let newWidth;
      
      if (pointsInView <= 20) {
        newWidth = Math.min(baseWidth * 1.5, 0.95); // Max out at 0.95
      } else if (pointsInView <= 50) {
        newWidth = baseWidth * 1.2;
      } else if (pointsInView <= 100) {
        newWidth = baseWidth;
      } else {
        newWidth = Math.max(baseWidth * 0.8, 0.1); // Min at 0.1
      }
      
      setDynamicWidth(newWidth);
      
      // Check if we need to load more data
      handlePanEdge(chart);
    }
  }, [candleWidth, handlePanEdge]);

  // Add timeframe selection buttons for time-based filtering
  const timeframeButtons = [
    { label: '1M', period: '1m', days: 30 },
    { label: '3M', period: '3m', days: 90 },
    { label: '6M', period: '6m', days: 180 },
    { label: '1Y', period: '1y', days: 365 },
    { label: '3Y', period: '3y', days: 365 * 3 },
    { label: 'All', period: 'all', days: 365 * 10 }
  ];

  const fetchDataByTimeframe = (period) => {
    setTimeRange(period);
    const now = new Date();
    let startDate = new Date();
    
    // Set start date based on period
    switch(period) {
      case '1m':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case '3m':
        startDate.setMonth(startDate.getMonth() - 3);
        break;
      case '6m':
        startDate.setMonth(startDate.getMonth() - 6);
        break;
      case '1y':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      case '3y':
        startDate.setFullYear(startDate.getFullYear() - 3);
        break;
      case 'all':
        startDate.setFullYear(2017, 0, 1); // Start from 2017
        break;
      default:
        // Default just use candle count
        fetchData(period);
        return;
    }
    
    // Clear chart and fetch with date range
    setChartData(null);
    fetchDataChunk(startDate, now, 5000);
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
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
          mode: 'xy',
          onZoom: handleZoom // Add zoom handler
        },
        pan: {
          enabled: true,
          mode: 'xy',
          onPan: handleZoom // Also update on pan
        },
        limits: {
          x: {minRange: 60 * 1000}, // Minimum 1 minute range
        }
      }
    },
    scales: {
      x: {
        type: 'time',
        time: {
          unit: 'day',
          displayFormats: {
            minute: 'MMM dd HH:mm', // Show month, day and time
            hour: 'MMM dd HH:mm',
            day: 'MMM dd yyyy'
          }
        },
        ticks: {
          source: 'auto',
          maxRotation: 45,
          minRotation: 45,
          autoSkip: true,
          maxTicksLimit: 10,
          callback: function(value) {
            const date = new Date(value);
            // Format with date when zoomed out, time only when zoomed in
            if (this.chart.scales.x.max - this.chart.scales.x.min > 24 * 60 * 60 * 1000) {
              // More than a day visible - show date and time
              return date.toLocaleDateString();
            } else {
              // Less than a day visible - just show time
              return date.toLocaleDateString() + ' ' + 
                date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            }
          }
        }
      },
      y: {
        position: 'left',
        title: {
          display: true,
          text: 'Price (USDT)'
        }
      }
    },
    datasets: {
      candlestick: {
        color: {
          up: '#26a69a',
          down: '#ef5350',
        },
        borderColor: {
          up: '#26a69a',
          down: '#ef5350',
        },
        width: 1,
        barPercentage: dynamicWidth,
        categoryPercentage: dynamicWidth
      }
    }
  };

  // Styles for the control panel and buttons
  const controlPanelStyle = {
    marginBottom: '10px',
    padding: '10px',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: '10px'
  };

  const buttonStyle = active => ({
    padding: '5px 10px',
    border: '1px solid #ccc',
    backgroundColor: active ? '#4CAF50' : '#f0f0f0',
    color: active ? 'white' : 'black',
    cursor: 'pointer',
    borderRadius: '3px'
  });

  return (
    <div>
      <div style={controlPanelStyle}>
        <div>
          <label htmlFor="timeRange">Candles: </label>
          <button onClick={() => setTimeRange('100')} style={buttonStyle(timeRange === '100')}>100</button>
          <button onClick={() => setTimeRange('250')} style={buttonStyle(timeRange === '250')}>250</button>
          <button onClick={() => setTimeRange('500')} style={buttonStyle(timeRange === '500')}>500</button>
          <button onClick={() => setTimeRange('1000')} style={buttonStyle(timeRange === '1000')}>1000</button>
        </div>
        
        <div>
          <label htmlFor="timeframe">Timeframe: </label>
          {timeframeButtons.map(({label, period}) => (
            <button 
              key={period}
              onClick={() => fetchDataByTimeframe(period)} 
              style={buttonStyle(timeRange === period)}
            >
              {label}
            </button>
          ))}
        </div>
        
        <div>
          <label htmlFor="candleWidth">Width: </label>
          <input
            type="range"
            id="candleWidth"
            min="0.1"
            max="1"
            step="0.1"
            value={candleWidth}
            onChange={(e) => {
              const newWidth = parseFloat(e.target.value);
              setCandleWidth(newWidth);
              setDynamicWidth(newWidth);
            }}
          />
          <span>{candleWidth.toFixed(1)}</span>
        </div>
        <button onClick={handleResetZoom} style={buttonStyle(false)}>Reset Zoom</button>
      </div>
      <div style={{ 
        marginBottom: '20px', 
        width: '1000px',
        height: '600px',
        padding: '20px',
        position: 'relative'
      }}>
        {isLoading && !chartData ? (
          <p>Loading candlestick chart...</p>
        ) : chartData ? (
          <>
            {isLoading && <div style={{position: 'absolute', padding: '5px', background: 'rgba(255,255,255,0.7)', borderRadius: '3px', zIndex: 10}}>Loading more data...</div>}
            <Chart
              ref={chartRef}
              type='candlestick'
              options={options}
              data={chartData}
              id="candlestickChart"
            />
          </>
        ) : (
          <p>Loading candlestick chart...</p>
        )}
      </div>
    </div>
  );
};

export default CandlestickChart;