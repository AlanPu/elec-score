import { useRef, useImperativeHandle, forwardRef } from 'react';
import { importPdfFile } from '../utils/pdfImporter';

export interface PdfImporterHandle {
  triggerImport: () => void;
}

interface PdfImporterProps {
  onImport: (id: string, name: string, pdfData: string, thumbnail: string, pageCount: number, fileSize: number) => void;
  onError: (error: string) => void;
}

const PdfImporter = forwardRef<PdfImporterHandle, PdfImporterProps>(
  ({ onImport, onError }, ref) => {
    const inputRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => ({
      triggerImport: () => {
        inputRef.current?.click();
      },
    }));

    const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
        const result = await importPdfFile(file);
        onImport(result.id, result.name, result.pdfData, result.thumbnail, result.pageCount, result.fileSize);
      } catch (err) {
        onError(err instanceof Error ? err.message : '导入失败');
      }

      // 重置 input 以允许重复选择同一文件
      e.target.value = '';
    };

    return (
      <input
        ref={inputRef}
        type="file"
        accept=".pdf"
        onChange={handleChange}
        style={{ display: 'none' }}
      />
    );
  }
);

PdfImporter.displayName = 'PdfImporter';

export default PdfImporter;
