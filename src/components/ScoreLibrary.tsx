import { useState, useRef, useEffect } from 'react';
import type { ScoreMeta } from '../types/score';
import { loadScoreMetas, loadScoreMetasSync, addScore, deleteScore } from '../utils/storage';
import PdfImporter, { type PdfImporterHandle } from './PdfImporter';
import './ScoreLibrary.css';

interface ScoreLibraryProps {
  onOpenScore: (score: ScoreMeta) => void;
}

export default function ScoreLibrary({ onOpenScore }: ScoreLibraryProps) {
  const [scores, setScores] = useState<ScoreMeta[]>(() => loadScoreMetasSync());
  const [, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [importing, setImporting] = useState(false);
  const importerRef = useRef<PdfImporterHandle>(null);

  // 从 API 加载乐谱列表
  useEffect(() => {
    let cancelled = false;
    loadScoreMetas().then((metas) => {
      if (!cancelled) {
        setScores(metas);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, []);

  // 处理导入成功
  const handleImport = async (id: string, name: string, pdfData: string, thumbnail: string, pageCount: number, fileSize: number) => {
    try {
      setImporting(true);
      const updated = await addScore(id, name, pdfData, thumbnail, pageCount, fileSize);
      setScores(updated);
      setErrorMsg('');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : '保存失败');
    } finally {
      setImporting(false);
    }
  };

  // 处理导入失败
  const handleError = (error: string) => {
    setErrorMsg(error);
  };

  // 处理删除乐谱
  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`确定要删除"${name}"吗？`)) return;
    const updated = await deleteScore(id);
    setScores(updated);
  };

  return (
    <div className="score-library">
      {/* 顶部标题栏 */}
      <header className="score-library-header">
        <h1 className="score-library-title">ElecScore - 乐谱翻页器</h1>
        <button
          className="score-library-import-btn"
          onClick={() => importerRef.current?.triggerImport()}
          disabled={importing}
        >
          {importing ? '导入中…' : '导入乐谱'}
        </button>
      </header>

      {/* 错误提示 */}
      {errorMsg && (
        <div className="score-library-error">
          {errorMsg}
          <button
            className="score-library-error-close"
            onClick={() => setErrorMsg('')}
          >
            ×
          </button>
        </div>
      )}

      {/* 乐谱列表 */}
      {scores.length === 0 ? (
        <div className="score-library-empty">
          点击右上角导入乐谱开始使用
        </div>
      ) : (
        <div className="score-library-grid">
          {scores.map((score) => (
            <div
              key={score.id}
              className="score-card"
              onClick={() => onOpenScore(score)}
            >
              <div className="score-card-thumbnail">
                <img src={score.thumbnail} alt={score.name} />
              </div>
              <div className="score-card-info">
                <span className="score-card-name">{score.name}</span>
                <span className="score-card-pages">{score.pageCount} 页</span>
              </div>
              <button
                className="score-card-delete"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(score.id, score.name);
                }}
                title="删除"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 隐藏的 PDF 导入器 */}
      <PdfImporter
        ref={importerRef}
        onImport={handleImport}
        onError={handleError}
      />
    </div>
  );
}
