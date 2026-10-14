import { create } from 'zustand';

export interface ArrivalCodeModalData {
  orderId: string;
  otpCode: string;
  mechanicName?: string;
  mechanicPhone?: string;
  mechanicImage?: string;
  vehicleSummary?: string;
  serviceAddress?: string;
}

interface ArrivalCodeStoreState {
  isVisible: boolean;
  isVerified: boolean;
  orderId: string | null;
  otpCode: string | null;
  mechanicName: string | null;
  mechanicPhone: string | null;
  mechanicImage: string | null;
  vehicleSummary: string | null;
  serviceAddress: string | null;
  dismissedOrderIds: string[];

  showArrivalModal: (data: ArrivalCodeModalData) => void;
  hideArrivalModal: () => void;
  markVerified: () => void;
  dismissOrder: (orderId: string) => void;
  reset: () => void;
}

export const useArrivalCodeStore = create<ArrivalCodeStoreState>((set) => ({
  isVisible: false,
  isVerified: false,
  orderId: null,
  otpCode: null,
  mechanicName: null,
  mechanicPhone: null,
  mechanicImage: null,
  vehicleSummary: null,
  serviceAddress: null,
  dismissedOrderIds: [],

  showArrivalModal: (data) => {
    set((state) => {
      // Don't pop up again if the user explicitly dismissed this order in this session
      if (state.dismissedOrderIds.includes(data.orderId)) {
        return state;
      }
      return {
        isVisible: true,
        isVerified: false,
        orderId: data.orderId,
        otpCode: data.otpCode,
        mechanicName: data.mechanicName || 'Specialist Mechanic',
        mechanicPhone: data.mechanicPhone || null,
        mechanicImage: data.mechanicImage || null,
        vehicleSummary: data.vehicleSummary || null,
        serviceAddress: data.serviceAddress || null,
      };
    });
  },

  hideArrivalModal: () => {
    set({ isVisible: false, isVerified: false });
  },

  markVerified: () => {
    set({ isVerified: true });
  },

  dismissOrder: (orderId) => {
    set((state) => ({
      isVisible: false,
      isVerified: false,
      dismissedOrderIds: [...state.dismissedOrderIds, orderId],
    }));
  },

  reset: () => {
    set({
      isVisible: false,
      isVerified: false,
      orderId: null,
      otpCode: null,
      mechanicName: null,
      mechanicPhone: null,
      mechanicImage: null,
      vehicleSummary: null,
      serviceAddress: null,
      dismissedOrderIds: [],
    });
  },
}));
