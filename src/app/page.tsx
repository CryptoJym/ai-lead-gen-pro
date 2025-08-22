export default function HomePage() {
  return (
    <div style={{ 
      fontFamily: 'system-ui, -apple-system, sans-serif',
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '2rem'
    }}>
      <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>AI Lead Gen Pro</h1>
      <p style={{ fontSize: '1.2rem', color: '#666', marginBottom: '3rem' }}>
        AI-powered lead generation system using the 5-pass Horsemen analysis pattern
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
        <div style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>📊 System Status</h2>
          <p>Check the health and status of the system</p>
          <a href="/api/status" style={{ 
            display: 'inline-block',
            marginTop: '1rem',
            padding: '0.5rem 1rem',
            backgroundColor: '#0070f3',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '4px'
          }}>View Status</a>
        </div>

        <div style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>🔍 Visual Flow</h2>
          <p>Understand how the system works</p>
          <a href="/docs/system-flow-visualization.html" style={{ 
            display: 'inline-block',
            marginTop: '1rem',
            padding: '0.5rem 1rem',
            backgroundColor: '#0070f3',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '4px'
          }}>View Flow Diagram</a>
        </div>

        <div style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>🎮 Interactive Demo</h2>
          <p>Try the system with mock data</p>
          <a href="/docs/interactive-demo.html" style={{ 
            display: 'inline-block',
            marginTop: '1rem',
            padding: '0.5rem 1rem',
            backgroundColor: '#0070f3',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '4px'
          }}>Launch Demo</a>
        </div>

        <div style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>🌐 3D Analysis Flow</h2>
          <p>Experience the Horsemen analysis in 3D</p>
          <a href="/docs/3d-analysis-flow.html" style={{ 
            display: 'inline-block',
            marginTop: '1rem',
            padding: '0.5rem 1rem',
            backgroundColor: '#0070f3',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '4px'
          }}>View 3D Visualization</a>
        </div>
      </div>

      <div style={{ marginTop: '3rem', padding: '2rem', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>API Endpoints</h2>
        
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Research API</h3>
          <code style={{ 
            display: 'block',
            padding: '1rem',
            backgroundColor: '#282c34',
            color: '#abb2bf',
            borderRadius: '4px',
            overflow: 'auto'
          }}>
            POST /api/research
            {'\n'}Content-Type: application/json
            {'\n'}X-Client-ID: [your-uuid]
            {'\n\n'}# Opportunity Search:
            {'\n'}{JSON.stringify({
              keywords: "data entry automation",
              location: "Remote",
              clientId: "550e8400-e29b-41d4-a716-446655440000"
            }, null, 2)}
            {'\n\n'}# Company Research:
            {'\n'}{JSON.stringify({
              companyName: "TechCorp",
              companyUrl: "https://techcorp.com",
              notes: "Focus on e-commerce"
            }, null, 2)}
          </code>
        </div>

        <div>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Status API</h3>
          <code style={{ 
            display: 'block',
            padding: '1rem',
            backgroundColor: '#282c34',
            color: '#abb2bf',
            borderRadius: '4px'
          }}>
            GET /api/status
            {'\n'}X-Client-ID: [your-uuid]
          </code>
        </div>
      </div>

      <div style={{ marginTop: '2rem', fontSize: '0.9rem', color: '#666' }}>
        <p>Current Mode: {process.env.ENABLE_MOCK_MODE === 'true' ? '🧪 Mock Mode' : '🚀 Production Mode'}</p>
        <p>Version: 2.0.0</p>
      </div>
    </div>
  );
}