import { create } from 'zustand';

interface RegistrationData {
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  password: string;
  password_confirm: string;
}

interface StepByStepRegistrationData {
  role_id?: number;
  email?: string;
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  vin?: string;
  model?: string;
  modelYear?: string;
  vehicleType?: string;
  engineType?: string;
  transmission?: string;
  bodyStyle?: string;
  color?: string;
  password?: string;
  password_confirm?: string;
  confirm_password?: string;
  verification_code?: string;
  has_car?: boolean;
  car_make?: string;
  car_model?: string;
  car_year?: number;
  license_plate?: string;
  business_name?: string;
  business_type?: string;
  business_address?: string;
  sessionId?: string;
}

interface RegistrationState {
  data: Partial<RegistrationData>;
  stepByStepData: StepByStepRegistrationData;
  currentStep: number;
  isStepByStepMode: boolean;
  setStep1Data: (data: Pick<RegistrationData, 'email' | 'first_name' | 'last_name' | 'phone'>) => void;
  setStep3Data: (data: Pick<RegistrationData, 'password' | 'password_confirm'>) => void;
  getRegistrationData: () => RegistrationData;
  clearData: () => void;
  // Step-by-step methods
  setStepByStepData: (data: Partial<StepByStepRegistrationData>) => void;
  getStepByStepData: () => StepByStepRegistrationData;
  setCurrentStep: (step: number) => void;
  setStepByStepMode: (enabled: boolean) => void;
  clearStepByStepData: () => void;
}

export const useRegistrationStore = create<RegistrationState>((set, get) => ({
  data: {},
  stepByStepData: {},
  currentStep: 1,
  isStepByStepMode: false,
  
  setStep1Data: (step1Data) => {
    set((state) => ({
      data: { ...state.data, ...step1Data }
    }));
  },
  
  setStep3Data: (step3Data) => {
    set((state) => ({
      data: { ...state.data, ...step3Data }
    }));
  },
  
  getRegistrationData: () => {
    const state = get();
    return state.data as RegistrationData;
  },
  
  clearData: () => {
    set({ data: {} });
  },

  // Step-by-step methods
  setStepByStepData: (stepData) => {
    set((state) => ({
      stepByStepData: { ...state.stepByStepData, ...stepData }
    }));
  },

  getStepByStepData: () => {
    const state = get();
    return state.stepByStepData;
  },

  setCurrentStep: (step) => {
    set({ currentStep: step });
  },

  setStepByStepMode: (enabled) => {
    set({ isStepByStepMode: enabled });
  },

  clearStepByStepData: () => {
    set({ 
      stepByStepData: {},
      currentStep: 1,
      isStepByStepMode: false
    });
  },
}));
