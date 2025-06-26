import { create } from 'zustand';
import type { Asset, Trade } from "@/actions/binance"; // Import types

// Placeholder data for initial state
const initialAssets: Asset[] = [];
const initialTrades: Trade[] = [];

// Định nghĩa kiểu cho một tài khoản Binance
export interface BinanceAccount {
  id: string; // unique id
  name?: string; // optional user label
  apiKey: string;
  apiSecret: string;
  isTestnet: boolean;
  assets: Asset[];
  trades: Trade[];
  isLoadingAssets: boolean;
  isLoadingTrades: boolean;
  isConnected: boolean;
  ownedSymbols: string[];
}

// Define the state structure
interface AssetStoreState {
  accounts: BinanceAccount[];
  activeAccountId: string | null;
  activeTab: string;
  apiKey: string | null;
  apiSecret: string | null;
  isTestnet: boolean;
  setCredentials: (key: string | null, secret: string | null, testnet: boolean) => void;
  clearState: () => void;
  addAccount: (account: Omit<BinanceAccount, 'id' | 'assets' | 'trades' | 'isLoadingAssets' | 'isLoadingTrades' | 'isConnected' | 'ownedSymbols'> & { name?: string }) => void;
  removeAccount: (id: string) => void;
  updateAccount: (id: string, data: Partial<BinanceAccount>) => void;
  setActiveAccount: (id: string) => void;
  setActiveTab: (tab: string) => void;
}

// Create the Zustand store
export const useAssetStore = create<AssetStoreState>((set, get) => ({
  accounts: [],
  activeAccountId: null,
  activeTab: "summary",
  apiKey: null,
  apiSecret: null,
  isTestnet: false,
  setCredentials: (apiKey, apiSecret, isTestnet) => set({ apiKey, apiSecret, isTestnet }),
  clearState: () => set({
    accounts: [],
    activeAccountId: null,
    apiKey: null,
    apiSecret: null,
    isTestnet: false,
  }),
  addAccount: (account) => set((state) => {
    const id = Math.random().toString(36).substring(2, 10);
    return {
      accounts: [
        ...state.accounts,
        {
          id,
          name: account.name || `Tài khoản ${state.accounts.length + 1}`,
          apiKey: account.apiKey,
          apiSecret: account.apiSecret,
          isTestnet: account.isTestnet,
          assets: [],
          trades: [],
          isLoadingAssets: false,
          isLoadingTrades: false,
          isConnected: false,
          ownedSymbols: [],
        },
      ],
      activeAccountId: id,
    };
  }),
  removeAccount: (id) => set((state) => {
    const accounts = state.accounts.filter(acc => acc.id !== id);
    return {
      accounts,
      activeAccountId: accounts.length > 0 ? accounts[0].id : null,
    };
  }),
  updateAccount: (id, data) => set((state) => ({
    accounts: state.accounts.map(acc => acc.id === id ? { ...acc, ...data } : acc),
  })),
  setActiveAccount: (id) => set({ activeAccountId: id }),
  setActiveTab: (tab) => set({ activeTab: tab }),
}));
