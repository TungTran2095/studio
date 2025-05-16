import { create } from 'zustand';
import type { Asset, Trade } from "@/actions/binance"; // Import types

// Placeholder data for initial state
const initialAssets: Asset[] = [];
const initialTrades: Trade[] = [];

// Define the state structure
interface AssetStoreState {
  assets: Asset[];
  trades: Trade[];
  isLoadingAssets: boolean;
  isLoadingTrades: boolean;
  isConnected: boolean;
  ownedSymbols: string[];
  activeTab: string;
  apiKey: string | null;
  apiSecret: string | null;
  isTestnet: boolean;
  setAssets: (assets: Asset[]) => void;
  setTrades: (trades: Trade[]) => void;
  setIsLoadingAssets: (loading: boolean) => void;
  setIsLoadingTrades: (loading: boolean) => void;
  setIsConnected: (connected: boolean) => void;
  setOwnedSymbols: (symbols: string[]) => void;
  setActiveTab: (tab: string) => void;
  setCredentials: (key: string | null, secret: string | null, testnet: boolean) => void;
  clearState: () => void; // Function to reset state
}

// Create the Zustand store
export const useAssetStore = create<AssetStoreState>((set) => ({
  // Initial state
  assets: initialAssets,
  trades: initialTrades,
  isLoadingAssets: false,
  isLoadingTrades: false,
  isConnected: false,
  ownedSymbols: [],
  activeTab: "summary",
  apiKey: null,
  apiSecret: null,
  isTestnet: false,

  // Actions to update state
  setAssets: (assets) => set({ assets }),
  setTrades: (trades) => set({ trades }),
  setIsLoadingAssets: (isLoadingAssets) => set({ isLoadingAssets }),
  setIsLoadingTrades: (isLoadingTrades) => set({ isLoadingTrades }),
  setIsConnected: (isConnected) => set({ isConnected }),
  setOwnedSymbols: (ownedSymbols) => set({ ownedSymbols }),
  setActiveTab: (activeTab) => set({ activeTab }),
  setCredentials: (apiKey, apiSecret, isTestnet) => set({ apiKey, apiSecret, isTestnet }),
  clearState: () => set({
    assets: initialAssets,
    trades: initialTrades,
    isLoadingAssets: false,
    isLoadingTrades: false,
    isConnected: false,
    ownedSymbols: [],
    // Don't reset activeTab on error? Maybe keep it.
    // activeTab: "summary",
    // Don't clear credentials on error, user might want to retry
    // apiKey: null,
    // apiSecret: null,
    // isTestnet: false,
  }),
}));
