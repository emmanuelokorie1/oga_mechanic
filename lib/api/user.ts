import api from '../axios';
import { USER_ENDPOINTS, AUTH_ENDPOINTS, BASE_URL, MERCHANT_ENDPOINTS, SERVICE_ENDPOINTS, VEHICLE_RENTAL_ENDPOINTS } from '../endpoints';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Types
export interface LoginCredentials {
  email?: string;
  phone_number?: string;
  password: string;
}

export interface LogoutCredentials {
  refresh: string;
}

export interface Role {
  id: string;
  name: string;
  display_name: string;
  description?: string;
}

export interface UserRolesResponse {
  requestTime: string;
  requestType: string;
  referenceId: string;
  status: boolean;
  message: string;
  data: {
    roles: Role[];
    active_role: Role | null;
  };
}

export interface RegisterData {
  email: string;
  password: string;
  password_confirm: string;
  first_name: string;
  last_name: string;
  roles: number[];
}

// Step-by-step registration interfaces
export interface RegisterStep1Data {
  role_id: number;
}

export interface RegisterStep2Data {
  email: string;
  first_name: string;
  last_name: string;
  phone_number: string;
}

export interface RegisterStep3VehicleData {
  vin?: string;
  model?: string;
  modelYear?: string;
  vehicleType?: string;
  engineType?: string;
  transmission?: string;
  bodyStyle?: string;
  color?: string;
}

/** Local image file for multipart upload (React Native) */
export interface AddVehicleImageFile {
  uri: string;
  name: string;
  type: string;
}

/** POST /users/my-vehicles/ (multipart/form-data) */
export interface AddVehiclePayload {
  vin?: string;
  make: string;
  model: string;
  year: number;
  license_plate?: string;
  images?: AddVehicleImageFile[];
}

export interface RegisterStep3Data {
  password: string;
  password_confirm: string;
}

export interface RegisterStep4Data {
  password: string;
  password_confirm: string;
}

// Direct registration (simplified flow)
export interface DirectRegisterRequest {
  email: string;
  password: string;
  confirm_password: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  role: string;
}

export interface DirectRegisterResponse {
  status: boolean;
  message: string;
  data?: {
    user_id?: string;
    email?: string;
    access?: string;
    refresh?: string;
    user?: {
      id: string;
      email: string;
      first_name: string;
      last_name: string;
      phone_number: string;
      role: string;
      is_verified: boolean;
    };
    verification_required?: boolean;
    verification_info?: {
      message: string;
      verify_endpoint: string;
      resend_endpoint: string;
    };
  };
  requestTime?: string;
  requestType?: string;
  referenceId?: string;
}



export interface UserProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  roles: number[];
  profileImage?: string;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
  active_role?: string | { name: string; [key: string]: any };
  car_make?: string | null;
  car_model?: string | null;
  car_year?: string | null;
  license_plate?: string | null;
  date_joined?: string;
  last_login?: string | null;
  phone_number?: string;
  dob?: string | null;
  gender?: string | null;
  selfie?: string | null;
}

export interface PrimaryUserProfileData {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  is_verified: boolean;
  current_role: string;
  active_role?: string | { name: string; [key: string]: any }; // Added to match backend and hook usage
  car_make: string;
  car_model: string;
  car_year: number | null;
  license_plate: string;
  date_joined: string;
  location?: string;
  profile_image?: string;
  dob?: string | null;
  gender?: string | null;
  selfie?: string | null;
}

export interface PrimaryUserProfileResponse {
  requestTime: string;
  requestType: string;
  data: PrimaryUserProfileData;
  active_role?: string | { name: string; [key: string]: any }; // Added to match top-level access in hooks
  message: string;
  referenceId: string;
  status: boolean;
}

export interface LoginResponse {
  data?: {
    access: string;
    refresh: string;
    user: UserProfile & {
      active_role: string;
    };
    id?: string;
    email?: string;
    first_name?: string;
    last_name?: string;
  };
  access?: string;
  refresh?: string;
  user?: UserProfile & {
    active_role: string;
  };
  id?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  message: string;
  requestTime: string;
  requestType: string;
  status: boolean;
  referenceId: string;
}

// Mechanic Profile specific interfaces
export interface MechanicProfile {
  id: number;
  user: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    active_role: string;
    date_joined: string;
    last_login: string | null;
    phone_number: string;
    created_at: string;
    updated_at: string;
    car_make: string | null;
    car_model: string | null;
    car_year: string | null;
    license_plate: string | null;
  };
  location: string | null;
  state?: string | null;
  lga: string | null;
  is_approved: boolean;
  is_active: boolean;
  latitude?: string | null;
  longitude?: string | null;
  bio?: string | null;
  cac_number?: string | null;
  cac_document?: string | null;
  selfie?: string | null;
  govt_id_type?: string | null;
  government_id_front?: string | null;
  government_id_back?: string | null;
  nin_number?: string | null;
  nin_document?: string | null;
  specializations?: (string | number)[];
  vehicle_expertise?: (string | number)[];
  created_at: string;
  updated_at: string;
}

export interface MechanicProfileResponse {
  requestTime: string;
  requestType: string;
  message: string;
  referenceId: string;
  status: boolean;
  data: {
    has_mechanic_profile: boolean;
    mechanic_profile: MechanicProfile;
    kyc: KYCStatus;
  };
}

// Merchant Profile specific interfaces
export interface MerchantProfile {
  id: number;
  user: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    active_role: string;
    date_joined: string;
    last_login: string | null;
    phone_number: string;
    created_at: string;
    updated_at: string;
    car_make: string | null;
    car_model: string | null;
    car_year: string | null;
    license_plate: string | null;
  };
  location: string | null;
  state?: string | null;
  lga: string | null;
  cac_number?: string | null;
  cac_document?: string | null;
  selfie?: string | null;
  store_name?: string | null;
  profile_picture?: string | null;
  latitude?: string | null;
  longitude?: string | null;
  nin_number?: string | null;
  nin_document?: string | null;
  is_approved: boolean;
  is_subscribed?: boolean;
  created_at: string;
  updated_at: string;
  is_following?: boolean;
  followers_count?: number;
}

export interface KYCStatus {
  profile_exists: boolean;
  is_complete: boolean;
  missing_fields: string[];
  missing_count: number;
}


// Merchant Profile API Response
export interface MerchantProfileResponse {
  requestTime: string;
  requestType: string;
  message: string;
  referenceId: string;
  status: boolean;
  data: {
    has_merchant_profile: boolean;
    merchant_profile: MerchantProfile;
    kyc: KYCStatus;
    restricted: boolean;
  };
}

// Vehicle Rental Profile API Response
export interface VehicleRentalProfileResponse {
  requestTime: string;
  requestType: string;
  message: string;
  referenceId: string;
  status: boolean;
  data: {
    has_vehicle_rental_profile: boolean;
    vehicle_rental_profile: MerchantProfile;
    kyc: KYCStatus;
  };
}

export interface RegisterResponse {
  success: boolean;
  data: {
    user: UserProfile;
    access_token: string;
    refresh_token: string;
  };
  message: string;
}

// Change Password Payload
export interface ChangePasswordData {
  requestType: string;
  data: {
    old_password: string;
    new_password: string;
    new_password_confirm: string;
  };
}

export interface ChangePasswordResponse {
  status: boolean;
  message: string;
  data?: any;
}

export interface Bank {
  id: number;
  name: string;
  code: string;
  slug: string;
  longcode?: string;
  gateway?: string | null;
  pay_with_bank?: boolean;
  supports_transfer?: boolean;
  available_for_direct_debit?: boolean;
  active?: boolean;
  country?: string;
  currency?: string;
  type?: string;
  is_deleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserBankAccount {
  id: number;
  user?: string;
  bank?: Bank; // Keeping for backward compatibility if used elsewhere
  bank_name?: string;
  bank_code?: string;
  account_number: string;
  account_name: string;
  is_default: boolean;
  is_verified?: boolean;
  is_active?: boolean;
  paystack_recipient_code?: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserBankAccountsResponse {
  status: boolean;
  message: string;
  data: UserBankAccount[];
}

export interface UserBankAccountResponse {
  status: boolean;
  message: string;
  data: UserBankAccount;
}

export interface BanksResponse {
  status: boolean;
  message: string;
  data: Bank[];
}

export interface BankEnquiryRequest {
  requestType: string;
  data: {
    account_number: string;
    bank_code: string;
  };
}

export interface BankEnquiryResponse {
  status: boolean;
  message: string;
  data: {
    account_number: string;
    account_name: string;
    bank_id?: number;
  };
}

export interface AddBankAccountRequest {
  requestType: string;
  data: {
    account_number: string;
    account_name: string;
    bank_code: string;
    is_default: boolean;
  };
}

export interface WalletTransaction {
  id: string;
  amount: string | number;
  type: 'credit' | 'debit';
  status: string;
  description?: string;
  created_at: string;
  reference?: string;
}

export interface WalletData {
  id: string;
  user: string;
  balance: string | number;
  currency: string;
  is_active: boolean;
  transactions?: WalletTransaction[];
}

export interface WalletResponse {
  requestTime: string;
  requestType: string;
  referenceId: string;
  status: boolean;
  message: string;
  data: WalletData;
}

export interface UserEarnings {
  total_combined_earnings: string;
  merchant_earnings: {
    total_earnings: string;
    pending_earnings: string;
    completed_tasks: number;
  };
  mechanic_earnings: {
    total_earnings: string;
    pending_earnings: string;
    completed_tasks: number;
  };
  currency: string;
}

export interface UserEarningsResponse {
  requestTime: string;
  requestType: string;
  referenceId: string;
  status: boolean;
  message: string;
  data: UserEarnings;
}

export interface WithdrawalRecord {
  id: number | string;
  amount: string;
  transaction_type: string;
  transaction_type_display: string;
  reference: string;
  description: string;
  status: string;
  status_display: string;
  fee: string;
  created_at: string;
  bank_name?: string;
  account_number?: string;
}

export interface WithdrawalFilters {
  status?: string;
  start_date?: string;
  end_date?: string;
}

export interface WithdrawalRequestData {
  amount: string | number;
  bank_account_id: string;
  description?: string;
}

export interface WithdrawalResponse {
  requestTime: string;
  requestType: string;
  referenceId: string;
  status: boolean;
  message: string;
  data: WithdrawalRecord[];
}

/** Single vehicle from GET /users/my-vehicles/ (and related). */
export interface UserVehicleImage {
  id: number | string;
  image: string;
  created_at?: string;
}

export interface UserVehicle {
  id: string;
  user: string;
  vin: string | null;
  make: string;
  model: string;
  year: number;
  license_plate: string | null;
  created_at?: string;
  updated_at?: string;
  images?: UserVehicleImage[];
}

function sortVehicleImagesById(
  imgs: UserVehicleImage[]
): UserVehicleImage[] {
  return [...imgs].sort((a, b) => {
    const na =
      typeof a.id === "number" ? a.id : parseInt(String(a.id), 10) || 0;
    const nb =
      typeof b.id === "number" ? b.id : parseInt(String(b.id), 10) || 0;
    return na - nb;
  });
}

/**
 * Best thumbnail / hero URL: prefer filename hints (e.g. front_), else lowest image id.
 * List order from API is not guaranteed to be front-first.
 */
export function getUserVehiclePrimaryImageUrl(
  v: Pick<UserVehicle, "images">
): string | null {
  const imgs = v.images;
  if (!Array.isArray(imgs) || imgs.length === 0) return null;
  const valid = imgs.filter(
    (x) => x && typeof x.image === "string" && x.image.startsWith("http")
  );
  if (valid.length === 0) return null;
  const front = valid.find((x) => /front[_.]/i.test(x.image));
  if (front) return front.image;
  return sortVehicleImagesById(valid)[0]?.image ?? null;
}

/** All vehicle photo URLs, ordered by image id (stable for gallery). */
export function getUserVehicleGalleryUrls(
  v: Pick<UserVehicle, "images">
): string[] {
  const imgs = v.images;
  if (!Array.isArray(imgs) || imgs.length === 0) return [];
  const urls = sortVehicleImagesById(
    imgs.filter(
      (x) => x && typeof x.image === "string" && x.image.startsWith("http")
    )
  ).map((x) => x.image);
  return [...new Set(urls)];
}

/**
 * Standard list envelope, e.g. `{ status, message, data: UserVehicle[] }`.
 * GET /users/my-vehicles/ returns this shape (plus optional `page` pagination fields).
 */
export interface UserVehiclesListEnvelope {
  requestTime: string;
  requestType: string;
  referenceId: string;
  status: boolean;
  message: string;
  data: UserVehicle[];
}

/** GET /users/my-vehicles/ — raw array, DRF `{ results }`, or envelope `{ data: [...] }`. */
function normalizeUserVehiclesListResponse(body: unknown): UserVehicle[] {
  if (body == null) return [];
  if (Array.isArray(body)) return body as UserVehicle[];
  if (typeof body !== 'object') return [];
  const o = body as Record<string, unknown>;
  if (Array.isArray(o.results)) return o.results as UserVehicle[];
  if (Array.isArray(o.data)) return o.data as UserVehicle[];
  if (o.data && typeof o.data === 'object' && !Array.isArray(o.data)) {
    const inner = o.data as Record<string, unknown>;
    if (Array.isArray(inner.results)) return inner.results as UserVehicle[];
  }
  return [];
}

function buildVehicleMultipartFormData(payload: AddVehiclePayload): FormData {
  const formData = new FormData();
  const vin = payload.vin?.replace(/\s/g, '').toUpperCase();
  if (vin) {
    formData.append('vin', vin);
  }
  formData.append('make', payload.make.trim());
  formData.append('model', payload.model.trim());
  formData.append('year', String(Math.trunc(payload.year)));
  const plate = payload.license_plate?.trim();
  if (plate) {
    formData.append('license_plate', plate);
  }
  for (const file of payload.images ?? []) {
    if (file?.uri) {
      formData.append('uploaded_images', file as any);
    }
  }
  return formData;
}

// API Functions
export const userAPI = {
  // Change Password
  changePassword: async (passwordData: ChangePasswordData): Promise<ChangePasswordResponse> => {
    const response = await api.post('/users/password/change/', passwordData);
    return response.data;
  },

  // Get Wallet details
  getWallet: async (): Promise<WalletResponse> => {
    const response = await api.get(USER_ENDPOINTS.WALLET);
    return response.data;
  },

  // Get consolidated Earnings
  getEarnings: async (): Promise<UserEarningsResponse> => {
    const response = await api.get(USER_ENDPOINTS.EARNINGS);
    return response.data;
  },

  // Get withdrawal history
  getWithdrawals: async (filters?: WithdrawalFilters): Promise<WithdrawalResponse> => {
    const response = await api.get(USER_ENDPOINTS.WITHDRAWALS, { params: filters });
    return response.data;
  },

  // Withdraw funds from wallet
  withdrawFunds: async (data: WithdrawalRequestData): Promise<any> => {
    const payload = {
      requestType: "inbound", // Following common pattern in this API
      data: {
        ...data,
        amount: String(data.amount).replace(/,/g, "") // Ensure it's a clean string
      }
    };
    const response = await api.post(USER_ENDPOINTS.WITHDRAW_WALLET, payload);
    return response.data;
  },

  // User login
  login: async (credentials: LoginCredentials): Promise<LoginResponse> => {


    const response = await api.post(USER_ENDPOINTS.LOGIN, credentials);

    return response.data;
  },

  // User logout
  logout: async (credentials: LogoutCredentials): Promise<any> => {

    const response = await api.post(USER_ENDPOINTS.LOGOUT, credentials);


    return response.data;
  },

  // User registration
  register: async (userData: RegisterData): Promise<RegisterResponse> => {


    const response = await api.post(USER_ENDPOINTS.REGISTER, userData);



    return response.data;
  },

  // Direct registration (simplified flow)
  directRegister: async (userData: DirectRegisterRequest): Promise<DirectRegisterResponse> => {
    const response = await api.post('/users/register/', userData);
    return response.data;
  },

  // Resend verification code
  resendVerificationCode: async (email: string): Promise<{ status: boolean; message: string }> => {
    const response = await api.post('/users/resend-verification-code/', { email });
    return response.data;
  },

  // Forgot password
  forgotPassword: async (email: string): Promise<{ status: boolean; message: string }> => {
    const response = await api.post(AUTH_ENDPOINTS.FORGOT_PASSWORD, { email });
    return response.data;
  },

  // Verify reset OTP
  verifyResetOtp: async (email: string, code: string): Promise<{ status: boolean; message: string; data?: any }> => {
    const response = await api.post(AUTH_ENDPOINTS.VERIFY_OTP, { email, code });
    return response.data;
  },

  // Reset password
  resetPassword: async (passwordData: any): Promise<{ status: boolean; message: string }> => {
    const response = await api.post(AUTH_ENDPOINTS.RESET_PASSWORD, passwordData);
    return response.data;
  },

  // Verify email code
  verifyEmailCode: async (email: string, code: string): Promise<{ status: boolean; message: string; data?: any }> => {
    const response = await api.post('/users/verify-email-code/', { email, code });
    return response.data;
  },

  // Dynamic step-by-step registration
  registerStep: async (stepId: number, stepData: any, config?: any): Promise<any> => {
    const endpoint = USER_ENDPOINTS.REGISTER_STEP(stepId);


    try {
      const response = await api.post(endpoint, stepData, config);



      return response.data;
    } catch (error: any) {

      throw error;
    }
  },

  registerVehicle: async (vehicleData: RegisterStep3VehicleData): Promise<any> => {


    const response = await api.post(USER_ENDPOINTS.REGISTER_VEHICLE, vehicleData);



    return response.data;
  },

  // Get user profile
  getProfile: async (): Promise<UserProfile> => {
    const response = await api.get(USER_ENDPOINTS.PROFILE);
    return response.data;
  },

  // Get role-specific profile (now uses primary profile for all roles)
  getRoleProfile: async (role?: string): Promise<UserProfile | MerchantProfileResponse> => {
    // Use primary profile endpoint for all roles
    const response = await api.get<UserProfile | MerchantProfileResponse>(USER_ENDPOINTS.PROFILE);
    return response.data;
  },

  // Get primary user profile
  getPrimaryProfile: async (): Promise<PrimaryUserProfileResponse> => {


    try {
      const response = await api.get(USER_ENDPOINTS.PRIMARY_PROFILE);

      return response.data;
    } catch (error: any) {

      throw error;
    }
  },

  // Get merchant profile
  getMerchantProfile: async (): Promise<MerchantProfileResponse> => {
    try {
      const response = await api.get<MerchantProfileResponse>('/users/profile/merchant/');
      return response.data;
    } catch (error: any) {
      throw error;
    }
  },

  // Get mechanic profile
  getMechanicProfile: async (): Promise<MechanicProfileResponse> => {
    try {
      const response = await api.get<MechanicProfileResponse>('/users/profile/mechanic/');
      return response.data;
    } catch (error: any) {
      throw error;
    }
  },

  // Get vehicle rental profile
  getVehicleRentalProfile: async (): Promise<VehicleRentalProfileResponse> => {
    try {
      const response = await api.get<VehicleRentalProfileResponse>(VEHICLE_RENTAL_ENDPOINTS.PROFILE);
      return response.data;
    } catch (error: any) {
      throw error;
    }
  },

  // Create vehicle rental profile
  createVehicleRentalProfile: async (data: any): Promise<VehicleRentalProfileResponse> => {
    try {
      const response = await api.post<VehicleRentalProfileResponse>(VEHICLE_RENTAL_ENDPOINTS.PROFILE, data);
      return response.data;
    } catch (error: any) {
      throw error;
    }
  },

  // Update vehicle rental profile
  updateVehicleRentalProfile: async (data: any): Promise<VehicleRentalProfileResponse> => {
    try {
      const response = await api.put<VehicleRentalProfileResponse>(VEHICLE_RENTAL_ENDPOINTS.PROFILE, data);
      return response.data;
    } catch (error: any) {
      throw error;
    }
  },



  // Get merchant profile by UUID
  getMerchantProfileByUuid: async (merchantUuid: string): Promise<MerchantProfileResponse> => {
    const endpoint = `users/profile/merchant/?merchant_user_uuid=${merchantUuid}`;

    try {
      const response = await api.get(endpoint);

      return response.data;
    } catch (error: any) {

      throw error;
    }
  },

  // Get list of banks
  getBanks: async (): Promise<BanksResponse> => {
    try {
      const response = await api.get(USER_ENDPOINTS.BANKS);
      return response.data;
    } catch (error: any) {
      throw error;
    }
  },

  // Get user bank accounts
  getBankAccounts: async (): Promise<UserBankAccountsResponse> => {
    try {
      const response = await api.get(USER_ENDPOINTS.BANK_ACCOUNTS);
      return response.data;
    } catch (error: any) {
      throw error;
    }
  },

  // Get single bank account by ID
  getBankAccountById: async (id: number | string): Promise<UserBankAccountResponse> => {
    try {
      const response = await api.get(`${USER_ENDPOINTS.BANK_ACCOUNTS}${id}/`);
      return response.data;
    } catch (error: any) {
      throw error;
    }
  },

  deleteBankAccount: async (id: number | string): Promise<any> => {
    try {
      const response = await api.delete(`${USER_ENDPOINTS.BANK_ACCOUNTS}${id}/`);
      return response.data;
    } catch (error: any) {
      throw error;
    }
  },

  updateBankAccount: async (id: number | string, data: any): Promise<UserBankAccountResponse> => {
    try {
      const response = await api.patch(`${USER_ENDPOINTS.BANK_ACCOUNTS}${id}/`, data);
      return response.data;
    } catch (error: any) {
      throw error;
    }
  },

  // Add bank account
  addBankAccount: async (data: AddBankAccountRequest): Promise<UserBankAccountResponse> => {
    try {
      const response = await api.post(USER_ENDPOINTS.BANK_ACCOUNTS, data);
      return response.data;
    } catch (error: any) {
      throw error;
    }
  },

  // Verify bank account
  verifyBank: async (data: BankEnquiryRequest): Promise<BankEnquiryResponse> => {
    try {
      const response = await api.post(USER_ENDPOINTS.BANK_ENQUIRY, data);
      return response.data;
    } catch (error: any) {
      throw error;
    }
  },

  // Follow merchant
  followMerchant: async (merchantId: string): Promise<any> => {
    const payload = {
      requestType: "inbound",
      data: {
        merchant_id: merchantId
      }
    };
    const response = await api.post(SERVICE_ENDPOINTS.FOLLOW_MERCHANT, payload);
    return response.data;
  },

  // Unfollow merchant
  unfollowMerchant: async (merchantId: string): Promise<any> => {
    const response = await api.delete(`${SERVICE_ENDPOINTS.FOLLOW_MERCHANT}?merchant_id=${merchantId}`);
    return response.data;
  },

  // Get followed merchants
  getFollowedMerchants: async (): Promise<any> => {
    const response = await api.get(SERVICE_ENDPOINTS.FOLLOWED_MERCHANTS);
    return response.data;
  },

  // Get user roles
  getUserRoles: async (): Promise<UserRolesResponse> => {

    
    try {
      const response = await api.get(USER_ENDPOINTS.ROLES);

      return response.data;
    } catch (error: any) {

      throw error;
    }
  },

  // Switch active role or add new role
  switchRole: async (roleName: string | null, addRoles?: number[]): Promise<any> => {
    
    try {
      const payload: any = {
        requestType: "inbound"
      };

      if (roleName) {
        payload.role = roleName;
      }

      if (addRoles && addRoles.length > 0) {
        payload.add_roles = addRoles;
      }

      const response = await api.post(USER_ENDPOINTS.SWITCH_ROLE, payload);

      return response.data;
    } catch (error: any) {

      throw error;
    }
  },

  // Get all available roles
  getAllRoles: async (): Promise<any> => {

    
    try {
      const response = await api.get(AUTH_ENDPOINTS.ALL_ROLES);

      return response.data;
    } catch (error: any) {

      throw error;
    }
  },

  // Update user profile
  updateProfile: async (profileData: Partial<UserProfile>): Promise<UserProfile> => {
    const response = await api.put(USER_ENDPOINTS.UPDATE_PROFILE, profileData);
    return response.data;
  },

  // Get user cars (GET /users/my-vehicles/?page=… — normalizes array | paginated | envelope)
  getCars: async (params?: { page?: number }): Promise<UserVehicle[]> => {
    const response = await api.get<UserVehiclesListEnvelope | UserVehicle[]>(
      USER_ENDPOINTS.CARS,
      {
        params:
          params?.page != null && params.page > 0 ? { page: params.page } : undefined,
      }
    );
    return normalizeUserVehiclesListResponse(response.data);
  },

  getCarById: async (carId: string): Promise<UserVehicle> => {
    const response = await api.get(`${USER_ENDPOINTS.CARS}${carId}/`);
    const d = response.data;
    if (
      d &&
      typeof d === 'object' &&
      !Array.isArray(d) &&
      'data' in d &&
      (d as any).data != null &&
      typeof (d as any).data === 'object' &&
      !Array.isArray((d as any).data)
    ) {
      return (d as { data: UserVehicle }).data;
    }
    return d as UserVehicle;
  },

  // Add new car (multipart: make, model, year, optional vin, license_plate, uploaded_images)
  addCar: async (payload: AddVehiclePayload): Promise<any> => {
    const formData = buildVehicleMultipartFormData(payload);
    const response = await api.post(USER_ENDPOINTS.ADD_CAR, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Update car — PUT multipart (same fields as POST)
  updateCar: async (carId: string, payload: AddVehiclePayload): Promise<any> => {
    const formData = buildVehicleMultipartFormData(payload);
    const response = await api.put(USER_ENDPOINTS.UPDATE_CAR(carId), formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    const d = response.data;
    if (
      d &&
      typeof d === 'object' &&
      !Array.isArray(d) &&
      'data' in d &&
      (d as any).data != null &&
      typeof (d as any).data === 'object' &&
      !Array.isArray((d as any).data)
    ) {
      return (d as { data: unknown }).data;
    }
    return d;
  },

  // Delete car
  deleteCar: async (carId: string): Promise<any> => {
    const response = await api.delete(USER_ENDPOINTS.DELETE_CAR(carId));
    return response.data;
  },

  // Rent car
  rentCar: async (rentalData: any): Promise<any> => {


    try {
      const response = await api.post(USER_ENDPOINTS.RENT_CAR, rentalData);

      return response.data;
    } catch (error: any) {

      throw error;
    }
  },

  // Get notifications
  getNotifications: async (offset = 0, limit = 10, filters?: { category?: string; is_read?: boolean }): Promise<any> => {
    try {
      const response = await api.get(USER_ENDPOINTS.NOTIFICATIONS, {
        params: { offset, limit, ...filters }
      });
      return response.data;
    } catch (error: any) {
      throw error;
    }
  },

  // Get a specific notification
  getNotification: async (id: number | string): Promise<any> => {
    try {
      const response = await api.get(USER_ENDPOINTS.NOTIFICATION_DETAIL(id));
      return response.data;
    } catch (error: any) {
      throw error;
    }
  },

  // Mark notification as read
  markNotificationAsRead: async (id: number | string): Promise<any> => {
    try {
      const response = await api.patch(USER_ENDPOINTS.NOTIFICATION_DETAIL(id), {
        is_read: true,
      });
      return response.data;
    } catch (error: any) {
      throw error;
    }
  },

  // Mark all notifications as read
  markAllNotificationsAsRead: async (): Promise<any> => {
    try {
      const response = await api.post(USER_ENDPOINTS.NOTIFICATION_MARK_ALL_READ);
      return response.data;
    } catch (error: any) {
      throw error;
    }
  },

  submitMechanicKYC: async (formData: FormData) => {
    try {
      const response = await api.put('/users/profile/mechanic/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error: any) {
      throw error;
    }
  },

  submitMerchantKYC: async (formData: FormData) => {
    try {
      const response = await api.put('/users/profile/merchant/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error: any) {
      throw error;
    }
  },

  submitVehicleRentalKYC: async (formData: FormData) => {
    try {
      const response = await api.put(VEHICLE_RENTAL_ENDPOINTS.PROFILE, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error: any) {
      throw error;
    }
  },



  // Subscribe merchant
  subscribeMerchant: async (data: { payment_reference: string; payment_url: string; amount: number }): Promise<any> => {
    try {
      const response = await api.post('users/profile/merchant/subscribe/', data);
      return response.data;
    } catch (error: any) {
      throw error;
    }
  },

  // Subscribe vehicle rental
  subscribeVehicleRental: async (data: { payment_reference: string; payment_url: string; amount: number }): Promise<any> => {
    try {
      const response = await api.post('users/profile/vehicle-rental/subscribe/', data);
      return response.data;
    } catch (error: any) {
      throw error;
    }
  },
};
