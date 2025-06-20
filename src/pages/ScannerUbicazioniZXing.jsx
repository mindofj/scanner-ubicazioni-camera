import React, { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import * as XLSX from 'xlsx';

export default function ScannerUbicazioniZXing() {
  const videoRef = useRef(null);
  const codeReader = useRef(null);
  const [data, setData] = useState([]);
  const [fileName, setFileName] = useState('');
  const [step, setStep] = useState(0);
  const [currentRowIndex, setCurrentRowIndex] = useState(null);
  const [vin, setVin] = useState('');
  const [modello, setModello] = useState('');
  const [cameraError, setCameraError] = useState(false);

  useEffect(() => {
    if (step === 1 || step === 2) {
      console.log('Avvio scanner');
      startScanner();
    }
    return () => {
      console.log('Reset scanner');
      stopScanner();
    };
  }, [step]);

  const startScanner = async () => {
    try {
      if (!videoRef.current) return;
      setCameraError(false);
      codeReader.current = new BrowserMultiFormatReader();
      await codeReader.current.decodeFromVideoDevice(null, videoRef.current, (result, err) => {
        if (result) {
          const text = result.getText().trim().toUpperCase();
          console.log('Codice letto:', text);
          handleScan(text);
        }
      });
    } catch (error) {
      setCameraError(true);
      console.error('Errore fotocamera:', error);
    }
  };

  const stopScanner = () => {
    if (codeReader.current) {
      codeReader.current.reset();
    }
  };

  const handleScan = (text) => {
    try {
      if (step === 1) {
        const index = data.findIndex(row => row.TARGA?.toString().trim().toUpperCase() === text);
        if (index !== -1) {
          console.log('Targa trovata in riga:', index);
          setCurrentRowIndex(index);
          setVin(data[index].VIN || '');
          setModello(data[index].MarcaModello || '');
          setStep(2);
        } else {
          alert('Targa non trovata');
        }
      } else if (step === 2 && currentRowIndex !== null) {
        const updated = [...data];
        updated[currentRowIndex].UBICAZIONE = text;
        setData(updated);
        setCurrentRowIndex(null);
        setVin('');
        setModello('');
        setStep(1);
      }
    } catch (error) {
      console.error('Errore durante la gestione della scansione:', error);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const wb = XLSX.read(evt.target.result, { type: 'binary' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(ws, { defval: '' });
      setData(json);
      setStep(1);
    };
    reader.readAsBinaryString(file);
  };

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Updated');
    XLSX.writeFile(wb, `aggiornato_${fileName}`);
  };

  return (
    <div style={{ padding: '1rem', textAlign: 'center' }}>
      {step === 0 && (
        <>
          <h2>Carica file Excel</h2>
          <input type="file" accept=".xls,.xlsx" onChange={handleFileUpload} />
        </>
      )}

      {(step === 1 || step === 2) && (
        <>
          {cameraError ? (
            <div style={{ color: 'red', marginBottom: '1rem' }}>
              Errore nell'accesso alla fotocamera. Assicurati di aver concesso i permessi e che un'altra app non la stia già usando.
            </div>
          ) : (
            <video
              ref={videoRef}
              style={{ width: '100%', maxWidth: 400, border: '2px solid black' }}
              autoPlay
              muted
              playsInline
            />
          )}

          {step === 2 && (
            <>
              <p><strong>VIN:</strong> {vin}</p>
              <p><strong>Modello:</strong> {modello}</p>
              <p>Ora scansiona l'ubicazione</p>
            </>
          )}
          <button onClick={handleExport} style={{ marginTop: '1rem' }}>📥 Esporta file aggiornato</button>
        </>
      )}
    </div>
  );
}
