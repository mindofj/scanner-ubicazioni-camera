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
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    if ((step === 1 || step === 2) && !scanning) {
      startScanner();
    }

    return () => {
      if (codeReader.current) {
        codeReader.current.reset();
      }
    };
  }, [step]);

  const startScanner = () => {
    if (!videoRef.current) return;

    codeReader.current = new BrowserMultiFormatReader();
    setScanning(true);

    codeReader.current.decodeFromVideoDevice(null, videoRef.current, (result, err) => {
      if (result) {
        const text = result.getText().trim().toUpperCase();
        console.log("Scansione:", text);
        handleScan(text);
      }
      if (err && !(err instanceof NotFoundException)) {
        console.error("Errore scanner:", err);
      }
    });
  };

  const handleScan = (text) => {
    if (!text) return;

    if (step === 1) {
      const index = data.findIndex(row => row.TARGA?.toString().trim().toUpperCase() === text);
      if (index !== -1) {
        setCurrentRowIndex(index);
        setVin(data[index].VIN || '');
        setModello(data[index].MarcaModello || '');
        setStep(2);
      } else {
        alert(`Targa "${text}" non trovata nel file.`);
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
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(ws, { defval: '' });
        const headers = Object.keys(json[0] || {});
        if (!headers.includes("TARGA") || !headers.includes("VIN") || !headers.includes("UBICAZIONE")) {
          alert("⚠️ Il file Excel deve contenere le colonne 'TARGA', 'VIN' e 'UBICAZIONE'");
          return;
        }
        setData(json);
        setStep(1);
      } catch (error) {
        console.error("Errore lettura Excel:", error);
        alert("Errore durante il caricamento del file.");
      }
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
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            style={{ width: '100%', maxWidth: 400, border: '2px solid black' }}
          />
          {step === 2 && (
            <>
              <p><strong>VIN:</strong> {vin}</p>
              <p><strong>Modello:</strong> {modello}</p>
              <p>📦 Ora scansiona l'ubicazione</p>
            </>
          )}
          <button onClick={handleExport} style={{ marginTop: '1rem' }}>
            📥 Esporta file aggiornato
          </button>
        </>
      )}
    </div>
  );
}

