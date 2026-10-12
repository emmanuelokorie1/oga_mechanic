import api from '../axios';
import { SERVICE_ENDPOINTS, MECHANIC_ENDPOINTS } from '../endpoints';

// Types
export interface CarDetails {
  carSelection: 'Yes' | 'No';
  selectedCar?: string;
  carModel?: string;
  carYear?: string;
  address: string;
  carIssue: string;
}

export interface RepairRequestData {
  mechanic_id?: string;
  /** Single service type (ID) when only one selected */
  service_type?: string;
  /** Multi-select service categories (IDs) when multiple selected */
  service_categories?: string[];
  /**
   * Linked saved vehicle UUID (for "Choose from saved vehicles" flow).
   * Backend can derive make/model/year/vin from this relation.
   */
  user_vehicle?: string;
  vehicle_make?: string;
  vehicle_model?: string;
  vehicle_year?: number;
  vehicle_vin?: string;
  problem_description: string;
  service_address: string;
  service_latitude?: number;
  service_longitude?: number;
  schedule?: boolean;
  preferred_date?: string;
  preferred_time_slot?: string;
}

export interface RepairRequestPayload {
  data: RepairRequestData;
  requestType: string;
}

export interface Mechanic {
  id: string;
  name: string;
  rating: number;
  reviewCount: number;
  location: string;
  specialties: string[];
  hourlyRate: number;
  availability: boolean;
  profileImage: string;
}

export interface FindMechanicResponse {
  mechanics: Mechanic[];
  total: number;
  message: string;
}

export interface ServiceType {
  id: string;
  name: string;
  description?: string;
  base_price: string;
  vehicle_make_name: string;
  vehicle_model_name?: string;
  vehicle_make: number | null;
  vehicle_model?: number | null;
  created_at: string;
  updated_at: string;
}

export interface ServiceTypesResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: ServiceType[];
}

// API Functions
export const mechanicAPI = {
  // Get service types
  getServiceTypes: async (): Promise<ServiceTypesResponse> => {
    const response = await api.get(MECHANIC_ENDPOINTS.SERVICE_TYPES);
    return response.data;
  },

  // Find mechanics based on car details
  findMechanic: async (carDetails: CarDetails): Promise<FindMechanicResponse> => {
    const response = await api.post(SERVICE_ENDPOINTS.MECHANICS_FIND, carDetails);
    return response.data;
  },

  // Get mechanic profile
  getMechanicProfile: async (mechanicId: string): Promise<Mechanic> => {
    const response = await api.get(SERVICE_ENDPOINTS.MECHANIC_PROFILE(mechanicId));
    return response.data;
  },

  // Get mechanic details (new endpoint)
  getMechanicDetail: async (mechanicId: string): Promise<any> => {
    console.log('🔧 Fetching mechanic detail for ID:', mechanicId);
    const response = await api.get(SERVICE_ENDPOINTS.MECHANIC_DETAIL(mechanicId));
    console.log('✅ Mechanic detail response:', response.data);
    return response.data;
  },

  // Get nearby mechanics
  getNearbyMechanics: async (latitude: number, longitude: number, radius: number = 10): Promise<Mechanic[]> => {
    const response = await api.get(SERVICE_ENDPOINTS.MECHANICS_NEARBY, {
      params: { lat: latitude, lng: longitude, radius }
    });
    return response.data;
  },

  // Get all available mechanics
  getAvailableMechanics: async (): Promise<Mechanic[]> => {
    const response = await api.get(SERVICE_ENDPOINTS.MECHANICS_AVAILABLE);
    return response.data;
  },

  // Book mechanic
  bookMechanic: async (mechanicId: string, bookingDetails: any): Promise<any> => {
    const response = await api.post(SERVICE_ENDPOINTS.MECHANIC_PROFILE(mechanicId), bookingDetails);
    return response.data;
  },

  createRepairRequest: async (payload: RepairRequestPayload): Promise<any> => {
    const response = await api.post(MECHANIC_ENDPOINTS.REPAIR_REQUESTS, payload);
    return response.data;
  },

  // Get mechanic reviews
  getMechanicReviews: async (mechanicId: string): Promise<any> => {
    const response = await api.get(`/users/mechanics/${mechanicId}/reviews/`);
    return response.data;
  },

  // Create mechanic review
  createMechanicReview: async (mechanicId: string, payload: { data: { mechanic_id: string | number; rating: number; comment: string }; requestType: string }): Promise<any> => {
    const response = await api.post(`/users/mechanics/${mechanicId}/reviews/`, payload);
    return response.data;
  },

  // Get repair requests for mechanic
  getRepairRequests: async (status?: string): Promise<any> => {
    // Use axios instance - it will handle redirects properly (maxRedirects: 1)
    const params = status ? { status } : {};
    const response = await api.get(MECHANIC_ENDPOINTS.REPAIR_REQUESTS, { params });
    return response.data;
  },

  // Get user's repair requests
  getUserRepairRequests: async (status?: string): Promise<any> => {
    const params = status && status !== 'all' ? { status } : {};
    const response = await api.get(MECHANIC_ENDPOINTS.REPAIR_REQUESTS, { params });
    return response.data;
  },

  // Get repair request detail by ID
  getRepairRequestDetail: async (requestId: string): Promise<any> => {
    const response = await api.get(`${MECHANIC_ENDPOINTS.REPAIR_REQUESTS}${requestId}/`);
    return response.data;
  },

  // Update repair request
  updateRepairRequest: async (requestId: string, payload: RepairRequestPayload): Promise<any> => {
    const response = await api.patch(`${MECHANIC_ENDPOINTS.REPAIR_REQUESTS}${requestId}/`, payload);
    return response.data;
  },

  // Update repair request status (e.g., in_transit, in_progress)
  updateRepairRequestStatus: async (requestId: string, status: string): Promise<any> => {
    const response = await api.patch(`${MECHANIC_ENDPOINTS.REPAIR_REQUESTS}${requestId}/`, {
      data: {
        status: status,
      },
      requestType: 'inbound',
    });
    
    // Check if API returned status: false (error in successful HTTP response)
    if (response.data?.status === false && response.data?.message) {
      const error: any = new Error(response.data.message);
      error.response = {
        data: {
          status: false,
          message: response.data.message,
        },
      };
      throw error;
    }
    
    return response.data;
  },

  // Cancel repair request with reason
  cancelRepairRequest: async (requestId: string, reason: string): Promise<any> => {
    const response = await api.patch(`${MECHANIC_ENDPOINTS.REPAIR_REQUESTS}${requestId}/`, {
      data: {
        status: 'cancelled',
        cancellation_reason: reason,
      },
      requestType: 'inbound',
    });
    
    // Check if API returned status: false (error in successful HTTP response)
    if (response.data?.status === false && response.data?.message) {
      const error: any = new Error(response.data.message);
      error.response = {
        data: {
          status: false,
          message: response.data.message,
        },
      };
      throw error;
    }
    
    return response.data;
  },

  // Respond to repair request (accept or decline)
  respondToRepairRequest: async (requestId: string, action: 'accept' | 'decline'): Promise<any> => {
    const response = await api.post(`${MECHANIC_ENDPOINTS.REPAIR_REQUESTS}${requestId}/respond/`, {
      data: {
        action: action,
      },
      requestType: 'inbound',
    });
    return response.data;
  },

  // Accept repair request
  acceptRepairRequest: async (requestId: string): Promise<any> => {
    const response = await api.post(`${MECHANIC_ENDPOINTS.REPAIR_REQUESTS}${requestId}/respond/`, {
      data: {
        action: 'accept',
      },
      requestType: 'inbound',
    });
    
    // Check if API returned status: false (error in successful HTTP response)
    if (response.data?.status === false && response.data?.message) {
      const error: any = new Error(response.data.message);
      error.response = {
        data: {
          status: false,
          message: response.data.message,
        },
      };
      throw error;
    }
    
    return response.data;
  },

  // Decline repair request
  declineRepairRequest: async (requestId: string): Promise<any> => {
    const response = await api.post(`${MECHANIC_ENDPOINTS.REPAIR_REQUESTS}${requestId}/respond/`, {
      data: {
        action: 'decline',
      },
      requestType: 'inbound',
    });
    
    // Check if API returned status: false (error in successful HTTP response)
    if (response.data?.status === false && response.data?.message) {
      const error: any = new Error(response.data.message);
      error.response = {
        data: {
          status: false,
          message: response.data.message,
        },
      };
      throw error;
    }
    
    return response.data;
  },

  // Get mechanic analytics
  getMechanicAnalytics: async (): Promise<any> => {
    const response = await api.get(MECHANIC_ENDPOINTS.ANALYTICS);
    return response.data;
  },

  // Verify repair request OTP
  verifyRepairRequestOtp: async (requestId: string, otpCode: string): Promise<any> => {
    const response = await api.post(MECHANIC_ENDPOINTS.VERIFY_OTP(requestId), {
      data: {
        otp_code: otpCode,
      },
      requestType: 'inbound',
    });

    // Check if API returned status: false (error in successful HTTP response)
    if (response.data?.status === false && response.data?.message) {
      const error: any = new Error(response.data.message);
      error.response = {
        data: {
          status: false,
          message: response.data.message,
        },
      };
      throw error;
    }

    return response.data;
  },

  // Verify repair completion (from user part)
  verifyRepairCompletion: async (requestId: string): Promise<any> => {
    const response = await api.patch(`${MECHANIC_ENDPOINTS.REPAIR_REQUESTS}${requestId}/`, {
      data: {
        status: 'verify_completed',
      },
      requestType: 'inbound',
    });

    // Check if API returned status: false (error in successful HTTP response)
    if (response.data?.status === false && response.data?.message) {
      const error: any = new Error(response.data.message);
      error.response = {
        data: {
          status: false,
          message: response.data.message,
        },
      };
      throw error;
    }

  },
  
  // Register device for push notifications
  registerPushDevice: async (fcmToken: string): Promise<any> => {
    const response = await api.post('/users/notifications/devices/', {
      fcm_token: fcmToken
    });
    return response.data;
  },

  getVehicleExpertise: async (): Promise<any> => {
    const response = await api.get(MECHANIC_ENDPOINTS.VEHICLE_EXPERTISE);
    return response.data;
  },

  getVehicleMakes: async (): Promise<any[]> => {
    const response = await api.get(MECHANIC_ENDPOINTS.VEHICLE_MAKES);
    return response.data;
  },

  
  getSpecializations: async (): Promise<any[]> => {
    const response = await api.get(MECHANIC_ENDPOINTS.SPECIALIZATIONS);
    return response.data;
  },

  createVehicleExpertise: async (expertise: any[]): Promise<any> => {
    const response = await api.post(MECHANIC_ENDPOINTS.VEHICLE_EXPERTISE, {
      requestType: "inbound",
      data: expertise
    });
    return response.data;
  },
};

