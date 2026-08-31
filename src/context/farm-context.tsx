import { createContext, ReactNode, useContext, useState } from 'react';

export type Region = {
  district: string;
  state: string;
} | null;

type FarmContextType = {
  soilData: any;
  setSoilData: (data: any) => void;
  latitude: number | null;
  setLatitude: (lat: number | null) => void;
  previousCrop: string;
  setPreviousCrop: (crop: string) => void;
  region: Region;
  setRegion: (region: Region) => void;
  manualSoilTest: { phosphorus?: number; potassium?: number; calcium?: number };
  setManualSoilTest: (test: { phosphorus?: number; potassium?: number; calcium?: number }) => void;
  farmsMapped: number;
  incrementFarmsMapped: () => void;
  cropsTracked: number;
  incrementCropsTracked: () => void;
  scansDone: number;
  incrementScansDone: () => void;
};

const FarmContext = createContext<FarmContextType>({
  soilData: null,
  setSoilData: () => {},
  latitude: null,
  setLatitude: () => {},
  previousCrop: '',
  setPreviousCrop: () => {},
  region: null,
  setRegion: () => {},
  manualSoilTest: {},
  setManualSoilTest: () => {},
  farmsMapped: 0,
  incrementFarmsMapped: () => {},
  cropsTracked: 0,
  incrementCropsTracked: () => {},
  scansDone: 0,
  incrementScansDone: () => {},
});

export function FarmProvider({ children }: { children: ReactNode }) {
  const [soilData, setSoilData] = useState<any>(null);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [previousCrop, setPreviousCrop] = useState('');
  const [region, setRegion] = useState<Region>(null);
  const [manualSoilTest, setManualSoilTest] = useState<{ phosphorus?: number; potassium?: number; calcium?: number }>({});
  const [farmsMapped, setFarmsMapped] = useState(0);
  const [cropsTracked, setCropsTracked] = useState(0);
  const [scansDone, setScansDone] = useState(0);

  return (
    <FarmContext.Provider
      value={{
        soilData,
        setSoilData,
        latitude,
        setLatitude,
        previousCrop,
        setPreviousCrop,
        region,
        setRegion,
        manualSoilTest,
        setManualSoilTest,
        farmsMapped,
        incrementFarmsMapped: () => setFarmsMapped((n) => n + 1),
        cropsTracked,
        incrementCropsTracked: () => setCropsTracked((n) => n + 1),
        scansDone,
        incrementScansDone: () => setScansDone((n) => n + 1),
      }}
    >
      {children}
    </FarmContext.Provider>
  );
}

export const useFarm = () => useContext(FarmContext);