import { useState } from 'react';
import type { ScoreMeta } from './types/score';
import ScoreLibrary from './components/ScoreLibrary';
import ScoreReader from './components/ScoreReader';
import './App.css';

function App() {
  const [activeScore, setActiveScore] = useState<ScoreMeta | null>(null);

  if (activeScore) {
    return (
      <ScoreReader
        score={activeScore}
        onBack={() => setActiveScore(null)}
      />
    );
  }

  return <ScoreLibrary onOpenScore={setActiveScore} />;
}

export default App;
