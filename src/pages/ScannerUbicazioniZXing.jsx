import React, { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, BrowserQRCodeReader } from '@zxing/browser';
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
  const [message, setMessage] = useState('');

  useEffect(() => {
    if ((step === 1 || step === 2) && videoRef.current) {
      startScanner();
    }
    return () => {
      codeReader.current?.reset();
    };
  }, [step]);

  const startScanner = async () => {
    try {
      codeReader.current?.reset();
      const reader = new BrowserMultiFormatReader();
      codeReader.current = reader;
      const deviceId = (await BrowserMultiFormatReader.listVideoInputDevices())[0].deviceId;
      reader.decodeFromVideoDevice(deviceId, videoRef.current, (result, err) => {
        if (result) {
          reader.reset();
          handleScan(result.getText());
        }
      });
    } catch (e) {
      console.error(e);
      setMessage('Errore accesso videocamera');
    }
  };

  const handleScan = (text) => {
    if (step === 1) {
      const idx = data.findIndex(r => r.TARGA?.toString().trim().toUpperCase() === text);
      if (idx !== -1) {
        setCurrentRowIndex(idx);
        setVin(data[idx].VIN || '');
        setModello(data[idx].MarcaModello || '');
        setStep(2);
        setMessage('');
      } else {
        setMessage('Targa non trovata');
        setTimeout(() => setStep(1), 1500);
      }
    } else if (step === 2 && currentRowIndex !== null) {
      const newData = [...data];
      newData[currentRowIndex].UBICAZIONE = text;
      setData(newData);
      setCurrentRowIndex(null);
      setVin('');
      setModello('');
      setStep(1);
    }
  };

  const handleFileUpload = (e) => {
    const f = e.target.files[0];
    setFileName(f.name);
    const reader = new FileReader();
    reader.onload = evt => {
      const wb = XLSX.read(evt.target.result, { type: 'binary' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      setData(XLSX.utils.sheet_to_json(ws, { defval: '' }));
      setStep(1);
    };
    reader.readAsBinaryString(f);
  };

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Updated');
    XLSX.writeFile(wb, `aggiornato_${fileName}`);
  };

  return (
    <div style={{ padding: 20, maxWidth: 480, margin: 'auto', textAlign: 'center' }}>
      {step === 0 && (
        <>
          <h2>Carica file Excel</h2>
          <input type="file" accept=".xls,.xlsx" onChange={handleFileUpload} />
        </>
      )}
      {(step === 1 || step === 2) && (
        <>
          <video ref={videoRef} style={{ width: '100%', maxHeight: 400, border: '1px solid #333' }} />
          {step === 2 && (
            <>
              <p><strong>VIN:</strong> {vin}</p>
              <p><strong>Modello:</strong> {modello}</p>
              <p><em>Scansiona ora l’ubicazione</em></p>
            </>
          )}
          {message && <div style={{ color: 'red', margin: 10 }}>{message}</div>}
          <button onClick={handleExport} style={{ marginTop: 10 }}>📥 Esporta file</button>
        </>
      )}
    </div>
  );
}
