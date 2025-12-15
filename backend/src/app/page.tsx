export default function Home() {
  return (
    <main style={{ padding: '2rem', fontFamily: 'system-ui' }}>
      <h1>Speak It Backend</h1>
      <p>API endpoints:</p>
      <ul>
        <li><code>POST /api/voice/token</code> - Get Deepgram API key</li>
        <li><code>POST /api/voice/track</code> - Track usage to TiDB</li>
      </ul>
    </main>
  );
}
