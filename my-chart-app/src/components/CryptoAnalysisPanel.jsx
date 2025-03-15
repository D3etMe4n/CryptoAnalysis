import React, { useState } from 'react';
import axios from 'axios';
import Markdown from 'react-markdown';
import './CryptoAnalysisPanel.css';

function CryptoAnalysisPanel() {
  const [timeRange, setTimeRange] = useState('7d');
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [generatedAt, setGeneratedAt] = useState(null);

  const handleAnalysisRequest = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.post('http://localhost:8000/crypto_analysis/', {
        timeframe: timeRange
      });
      
      setAnalysis(response.data.analysis);
      setGeneratedAt(new Date(response.data.generated_at).toLocaleString());
      
      console.log(`Analysis generated in ${response.data.execution_time.toFixed(2)} seconds`);
    } catch (err) {
      console.error('Error fetching analysis:', err);
      setError(err.response?.data?.detail || 'Failed to generate analysis. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleTimeRangeChange = (range) => {
    setTimeRange(range);
  };

  return (
    <div className="analysis-panel">
      <h2>Bitcoin Market Analysis</h2>
      
      <div className="analysis-controls">
        <div className="time-range-buttons">
          <button
            className={timeRange === '1d' ? 'active' : ''}
            onClick={() => handleTimeRangeChange('1d')}
          >
            24 Hours
          </button>
          <button
            className={timeRange === '3d' ? 'active' : ''}
            onClick={() => handleTimeRangeChange('3d')}
          >
            3 Days
          </button>
          <button
            className={timeRange === '7d' ? 'active' : ''}
            onClick={() => handleTimeRangeChange('7d')}
          >
            7 Days
          </button>
        </div>
        
        <button 
          className="generate-button" 
          onClick={handleAnalysisRequest}
          disabled={loading}
        >
          {loading ? 'Generating Analysis...' : 'Generate AI Analysis'}
        </button>
      </div>
      
      {loading && (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Generating market analysis with AI...<br />This may take up to 30 seconds.</p>
        </div>
      )}
      
      {error && <div className="error-message">{error}</div>}
      
      {analysis && !loading && (
        <div className="analysis-content">
          <div className="analysis-metadata">
            <span>Generated at: {generatedAt}</span>
            <span>Timeframe: {timeRange === '1d' ? '24 Hours' : timeRange === '3d' ? '3 Days' : '7 Days'}</span>
          </div>
          <div className="analysis-text">
            <Markdown>{analysis}</Markdown>
          </div>
        </div>
      )}
      
      {!analysis && !loading && !error && (
        <div className="placeholder-message">
          <p>Click "Generate AI Analysis" to get an in-depth market analysis powered by AI.</p>
          <p>The analysis will include market trends, technical indicators, risk assessment, and trading recommendations.</p>
        </div>
      )}
    </div>
  );
}

export default CryptoAnalysisPanel;