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
      
      // Format the markdown to ensure proper rendering
      let formattedAnalysis = response.data.analysis;
      
      // Process headers to ensure they have proper spacing after #
      formattedAnalysis = formattedAnalysis.replace(/#+(\w)/g, (match, p1) => {
        return match.replace(p1, ' ' + p1);
      });
      
      // Ensure all lists have proper spacing after markers
      formattedAnalysis = formattedAnalysis.replace(/^\s*[-*]\s*(\w)/gm, (match, p1) => {
        return match.replace(p1, ' ' + p1);
      });
      
      // Make sure numbered lists have proper spacing
      formattedAnalysis = formattedAnalysis.replace(/^\s*(\d+)\.\s*(\w)/gm, (match, p1, p2) => {
        return match.replace(p2, ' ' + p2);
      });
      
      setAnalysis(formattedAnalysis);
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

  // Custom components for markdown rendering
  const components = {
    // Add custom rendering for headings to ensure proper styling
    h1: ({node, ...props}) => <h1 style={{marginTop: '1em', marginBottom: '0.5em'}} {...props} />,
    h2: ({node, ...props}) => <h2 style={{marginTop: '0.8em', marginBottom: '0.4em'}} {...props} />,
    h3: ({node, ...props}) => <h3 style={{marginTop: '0.7em', marginBottom: '0.3em'}} {...props} />,
    // Style lists properly
    ul: ({node, ...props}) => <ul style={{marginBottom: '1em', paddingLeft: '1.5em'}} {...props} />,
    ol: ({node, ...props}) => <ol style={{marginBottom: '1em', paddingLeft: '1.5em'}} {...props} />,
    li: ({node, ...props}) => <li style={{marginBottom: '0.3em'}} {...props} />,
    // Style paragraphs
    p: ({node, ...props}) => <p style={{marginBottom: '1em'}} {...props} />,
    // Style code blocks
    code: ({node, inline, ...props}) => 
      inline ? 
        <code style={{background: '#f5f5f5', padding: '2px 4px', borderRadius: '3px', fontSize: '0.9em'}} {...props} /> : 
        <pre style={{background: '#f5f5f5', padding: '1em', borderRadius: '5px', overflowX: 'auto'}}><code {...props} /></pre>
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
            <Markdown components={components}>
              {analysis}
            </Markdown>
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