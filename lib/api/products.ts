import api from '../axios';
import { SERVICE_ENDPOINTS, MERCHANT_ENDPOINTS, MECHANIC_ENDPOINTS } from '../endpoints';

// Types
export interface Product {
  id: string;
  name: string;
  price: number;
  rating: number;
  reviewCount: number;
  image: string;
  category: string;
  description?: string;
  inStock: boolean;
  discount?: number;
}

export interface HomeProductsResponse {
  data: {
    mechanics: any[];
    best_selling_cars: any[];
    best_selling_spare_parts: any[];
  };
  message?: string;
  status?: boolean;
  requestTime?: string;
  requestType?: string;
  referenceId?: string;
}

export interface RepairResolution {
  id: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface RepairHistoryItem {
  id: string;
  customer?: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    phone_number: string;
  };
  mechanic?: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    phone_number: string;
  } | null;
  service_type: string;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_year: number;
  vehicle_vin: string;
  problem_description: string;
  problem_resolutions: RepairResolution[];
  service_address: string;
  service_latitude: string;
  service_longitude: string;
  status: string;
  priority: string;
  requested_at: string;
  accepted_at: string | null;
  completed_at: string | null;
  is_active: boolean;
}

export interface BiddingWindow {
  id: string;
  product: string;
  bids: any[];
  start_time: string;
  duration_days: number;
  is_closed: boolean;
  is_active: boolean;
  end_time: string;
  created_at: string;
}

export interface ProductDetailResponse {
  id: string;
  merchant_id: string;
  merchant_email: string;
  name: string;
  make_id: string | null;
  model_id: string | null;
  year: number | null;
  condition: string;
  body_type: string;
  mileage: number | null;
  mileage_unit: string;
  transmission: string;
  fuel_type: string;
  engine_size: number | null;
  exterior_color: string | null;
  interior_color: string | null;
  number_of_doors: number | null;
  number_of_seats: number | null;
  air_conditioning: boolean;
  leather_seats: boolean;
  navigation_system: boolean;
  bluetooth: boolean;
  parking_sensors: boolean;
  cruise_control: boolean;
  keyless_entry: boolean;
  sunroof: boolean;
  alloy_wheels: boolean;
  airbags: boolean;
  abs: boolean;
  traction_control: boolean;
  lane_assist: boolean;
  blind_spot_monitor: boolean;
  price: string;
  currency: string;
  negotiable: boolean;
  discount: string | null;
  availability: string;
  stock: number;
  description: string;
  category: {
    id: number;
    name: string;
    sub_categories: any[];
    description: string;
    created_at: string;
    updated_at: string;
  };
  images: Array<{
    id: number;
    image: string;
    ordering: number;
    created_at: string;
  }>;
  vehicle_compatibility: any[];
  is_rental: boolean;
  delivery_option: string;
  rating: number;
  merchant_rating: number;
  purchased_count: number | null;
  contact_info: any | null;
  is_in_cart: boolean;
  is_in_favorite_list: boolean;
  created_at: string;
  updated_at: string;
  vin?: string;
  repair_history?: RepairHistoryItem[];
  is_bidding?: boolean;
  bidding_window?: BiddingWindow;
}

export interface SubmitBidRequest {
  requestType: string;
  bidding_window: string;
  amount: number;
  data: {
    bidding_window: string;
    amount: number;
  }
}

// Complete API response wrapper
export interface ProductDetailAPIResponse {
  data: ProductDetailResponse;
  message: string;
  referenceId: string;
  requestTime: string;
  requestType: string;
  status: boolean;
}

// Product List Response
export interface ProductListResponse {
  id: string;
  name: string;
  price: string;
  description: string;
  category: {
    id: number;
    name: string;
    description: string;
    created_at: string;
    updated_at: string;
  };
  images: Array<{
    id: number;
    image: string;
  }>;
  merchant: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    active_role: string;
    date_joined: string;
    last_login: string;
    phone_number: string;
    created_at: string;
    updated_at: string;
  };
  is_rental: boolean;
  stock: number;
  rating: number;
  merchant_rating: number;
  purchased_count: number;
  is_in_cart: boolean;
  created_at: string;
  updated_at: string;
}

// Paginated response structure
export interface ProductListAPIResponse {
  data: {
    count: number;
    next: string | null;
    previous: string | null;
    results: ProductListResponse[];
  } | ProductListResponse[]; // Allow data to be a direct array
  message: string;
  referenceId: string;
  requestTime: string;
  requestType: string;
  status: boolean;
  results?: ProductListResponse[]; // for API variations that return results at the root
}

// Category Response
export interface CategoryResponse {
  id: number;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
  sub_categories?: CategoryResponse[];
}

export interface FavoriteProduct {
  id: number;
  product: ProductDetailResponse;
  created_at: string;
  is_in_favorite_list: boolean;
}

export interface FavoriteProductAPIResponse {
  data: FavoriteProduct[];
  message: string;
  referenceId: string;
  requestTime: string;
  requestType: string;
  status: boolean;
}

// Cart Types
export interface CartItem {
  id: string;
  quantity: number;
  added_at?: string;
  product?: {
    id: string;
    name: string;
    price: string;
    images: Array<{ id: number; image: string }>;
    stock: number;
    original_price?: string;
    discount?: number;
  };
}

export interface CartResponse {
  data: {
    id: number;
    user: string;
    items?: CartItem[];
    total_price?: number; // From actual API response
    created_at?: string;
    updated_at?: string;
    // Add other cart fields as needed
  };
  message: string;
  referenceId: string;
  requestTime: string;
  requestType: string;
  status: boolean;
}

export interface AddToCartRequest {
  product_id: string;
  quantity: number;
}

export interface AddToCartResponse {
  data: {
    product_id: string;
    quantity: number;
  };
  message: string;
  status: boolean;
}

export interface UpdateCartItemRequest {
  requestType: string;
  data: {
    product_id: string;
    action: "increment" | "decrement";
  };
}

export interface UpdateCartItemResponse {
  data: {
    product_id: string;
    quantity: number;
  };
  message: string;
  referenceId: string;
  requestTime: string;
  requestType: string;
  status: boolean;
}

export interface CategoriesAPIResponse {
  data: CategoryResponse[];
  message: string;
  referenceId: string;
  requestTime: string;
  requestType: string;
  status: boolean;
}

// Vehicle Makes Types
export interface VehicleModel {
  id: number;
  name: string;
  parent_make: number;
  description: string;
  is_active: boolean;
  models: any[]; // Empty array for models
}

export interface VehicleMake {
  id: number;
  name: string;
  parent_make: number | null;
  description: string;
  is_active: boolean;
  models: VehicleModel[];
  created_at?: string;
  updated_at?: string;
}

export interface VehicleMakesAPIResponse {
  data: VehicleMake[];
  message: string;
  referenceId: string;
  requestTime: string;
  requestType: string;
  status: boolean;
}

// Payment Verification Response Types
export interface PaymentVerificationResponse {
  status: boolean;
  message: string;
  data?: {
    payment_status: 'pending' | 'success' | 'failed' | 'cancelled' | 'paid' | 'successful';
    order_id: string;
    amount: number;
    reference: string;
    payment_method: string;
    paid_at?: string;
    gateway_response?: string;
  };
}

export interface PaymentStatusResponse {
  status: boolean;
  message: string;
  data?: {
    order_id: string;
    payment_status: 'pending' | 'success' | 'failed' | 'cancelled' | 'paid' | 'successful';
    order_status: string;
    total_amount: number;
    payment_reference?: string;
    paid_at?: string;
  };
}

// Merchant Analytics Types
export interface MerchantAnalytics {
  total_sales: number;
  order_count: number;
  order_status_counts: Record<string, number>;
  product_count: number;
  rental_products: number;
  best_selling_products: Array<{
    id: string;
    name: string;
    quantity_sold: number;
    revenue: number;
  }>;
  customer_insights: {
    unique_customers: number;
    repeat_customers: number;
    avg_order_value: number;
    retention_rate: number;
    repeat_customer_rate: number;
  };
  product_performance: {
    products_with_reviews: number;
    avg_rating: number;
    top_performing_products: Array<{
      id: string;
      name: string;
      rating: number;
      review_count: number;
    }>;
    total_products: number;
  };
  rental_analytics: {
    total_rentals: number;
    completed_rentals: Array<any>;
    active_rentals: number;
    pending_rentals: number;
    rental_revenue: number;
    avg_rental_duration: number;
    completion_rate: number;
  };
  revenue_by_month: Record<string, number>;
  message: string;
  referenceId: string;
  requestTime: string;
  requestType: string;
  status: boolean;
}

export interface MerchantAnalyticsResponse {
  data: MerchantAnalytics;
  message: string;
  referenceId: string;
  requestTime: string;
  requestType: string;
  status: boolean;
}

// API Functions
export const productsAPI = {
  // Get home products (cars and spare parts)
  getHomeProducts: async (): Promise<HomeProductsResponse> => {
    try {
      // Make three separate API calls for each data type using Promise.allSettled
      // This allows individual calls to fail without affecting others
      const [mechanicsResult, carsResult, sparePartsResult] = await Promise.allSettled([
        api.get(`${SERVICE_ENDPOINTS.PRODUCTS_HOME}?requestType=mechanics`),
        api.get(`${SERVICE_ENDPOINTS.PRODUCTS_HOME}?requestType=best_selling_cars`),
        api.get(`${SERVICE_ENDPOINTS.PRODUCTS_HOME}?requestType=best_selling_spare_parts`),
      ]);

      // Extract data from successful responses, use empty array for failed ones
      const mechanicsData = mechanicsResult.status === 'fulfilled' 
        ? mechanicsResult.value.data?.data?.mechanics || []
        : [];
      
      const carsData = carsResult.status === 'fulfilled'
        ? carsResult.value.data?.data?.best_selling_cars || []
        : [];
      
      const sparePartsData = sparePartsResult.status === 'fulfilled'
        ? sparePartsResult.value.data?.data?.best_selling_spare_parts || []
        : [];

      // Log any failed requests for debugging
      if (mechanicsResult.status === 'rejected') {
        console.warn('Mechanics endpoint failed:', mechanicsResult.reason);
      }
      if (carsResult.status === 'rejected') {
        console.warn('Cars endpoint failed:', carsResult.reason);
      }
      if (sparePartsResult.status === 'rejected') {
        console.warn('Spare parts endpoint failed:', sparePartsResult.reason);
      }

      // Combine the responses
      return {
        data: {
          mechanics: mechanicsData,
          best_selling_cars: carsData,
          best_selling_spare_parts: sparePartsData,
        },
        message: 'Home products fetched successfully',
        status: true,
      };
    } catch (error) {
      console.error('Error fetching home products:', error);
      throw error;
    }
  },
  
  // Get product detail by ID
  getProductDetail: async (id: string): Promise<ProductDetailResponse> => {

    
    try {
      // Try shop endpoint first
      const response = await api.get<ProductDetailAPIResponse>(SERVICE_ENDPOINTS.SHOP_PRODUCT_DETAIL(id));

      return response.data.data; // Extract the data field from the API response
    } catch (shopError) {

      try {
        // Fallback to products endpoint
        const response = await api.get<ProductDetailAPIResponse>(SERVICE_ENDPOINTS.PRODUCT_DETAIL(id));

        return response.data.data; // Extract the data field from the API response
      } catch (productsError) {
        console.error('❌ Both endpoints failed:', { shopError, productsError });
        throw productsError; // Throw the last error
      }
    }
  },

  // Get all products
  getProducts: async (
    categoryId?: number | null,
    minPrice?: string,
    maxPrice?: string,
    offset?: number,
    limit?: number,
    merchantId?: string,
    isRental?: boolean,
    make?: string
  ): Promise<ProductListAPIResponse> => {
    const response = await api.get(SERVICE_ENDPOINTS.PRODUCTS_LIST, {
      params: {
        category: categoryId || undefined,
        min_price: minPrice?.trim() || undefined,
        max_price: maxPrice?.trim() || undefined,
        offset,
        limit,
        merchant: merchantId || undefined,
        is_rental: isRental,
        make: make?.trim() || undefined,
      }
    });
    return response.data;
  },

  // Search products
  searchProducts: async (
    query: string,
    categoryId?: number | null,
    minPrice?: string,
    maxPrice?: string,
    make?: string,
    isRental?: boolean
  ): Promise<ProductListResponse[]> => {
    const params = new URLSearchParams();
    params.append('q', query);
    
    if (categoryId) {
      params.append('category', categoryId.toString());
    }
    if (minPrice && minPrice.trim()) {
      params.append('min_price', minPrice);
    }
    if (maxPrice && maxPrice.trim()) {
      params.append('max_price', maxPrice);
    }
    if (make && make.trim()) {
      params.append('make', make);
    }
    if (isRental !== undefined) {
      params.append('is_rental', isRental ? 'true' : 'false');
    }
    
    const response = await api.get<any>(
      `${SERVICE_ENDPOINTS.PRODUCTS_SEARCH}?${params.toString()}`
    );

    
    // Handle different response structures
    if (Array.isArray(response.data.data)) {
      // Direct array response
      return response.data.data;
    } else if (response.data.data && Array.isArray(response.data.data.results)) {
      // Paginated response
      return response.data.data.results;
    } else {
      // Fallback to empty array

      return [];
    }
  },

  // Search products by VIN specifically
  searchByVin: async (vin: string): Promise<ProductListResponse[]> => {
    const params = new URLSearchParams();
    params.append('vin', vin);
    
    const response = await api.get<any>(
      `${SERVICE_ENDPOINTS.PRODUCTS_SEARCH}?${params.toString()}`
    );
    
    // Handle different response structures
    if (Array.isArray(response.data.data)) {
      return response.data.data;
    } else if (response.data.data && Array.isArray(response.data.data.results)) {
      return response.data.data.results;
    } else {
      return [];
    }
  },

  // Get all categories
  getCategories: async (): Promise<CategoryResponse[]> => {
    const response = await api.get<CategoriesAPIResponse>(SERVICE_ENDPOINTS.PRODUCTS_CATEGORIES);
    return response.data.data;
  },

  // Cart API functions
  getCart: async (): Promise<CartResponse> => {
    const response = await api.get<CartResponse>(SERVICE_ENDPOINTS.CART);

    return response.data;
  },

  addToCart: async (productId: string, quantity: number): Promise<AddToCartResponse> => {
    const payload: AddToCartRequest = {
      product_id: productId,
      quantity: quantity
    };
    const response = await api.post<AddToCartResponse>(SERVICE_ENDPOINTS.CART, payload);

    return response.data;
  },

  updateCartItem: async (itemId: string, quantity: number): Promise<AddToCartResponse> => {
    const payload = {
      quantity: quantity
    };
    const response = await api.put<AddToCartResponse>(`${SERVICE_ENDPOINTS.CART}/${itemId}`, payload);

    return response.data;
  },

  removeFromCart: async (productId: string): Promise<{ message: string; status: boolean }> => {
    const response = await api.delete<{ message: string; status: boolean }>(`${SERVICE_ENDPOINTS.CART}?product_id=${productId}`);

    return response.data;
  },

  clearCart: async (): Promise<{ message: string; status: boolean }> => {
    const response = await api.delete<{ message: string; status: boolean }>(SERVICE_ENDPOINTS.CLEAR_CART);
    return response.data;
  },

  updateCartItemQuantity: async (productId: string, action: "increment" | "decrement"): Promise<UpdateCartItemResponse> => {
    const payload = {
      product_id: productId,
      action: action
    };
    const response = await api.patch<UpdateCartItemResponse>(SERVICE_ENDPOINTS.CART, payload);

    return response.data;
  },

  // Add product to favorites
  addToFavorites: async (productId: string): Promise<{ message: string; status: boolean }> => {
    const payload = {
      product_id: productId
    };
    
    const response = await api.post<{ message: string; status: boolean }>(SERVICE_ENDPOINTS.FAVORITE_PRODUCT, payload);

    return response.data;
  },

  // Remove product from favorites
  removeFromFavorites: async (productId: string): Promise<{ message: string; status: boolean }> => {

    
    const response = await api.delete<{ message: string; status: boolean }>(`${SERVICE_ENDPOINTS.FAVORITE_PRODUCT}?product_id=${productId}`);

    return response.data;
  },

  // Toggle favorite (add if not favorited, remove if favorited)
  toggleFavorite: async (productId: string, isCurrentlyFavorited: boolean): Promise<{ message: string; status: boolean }> => {

    
    if (isCurrentlyFavorited) {
      return await productsAPI.removeFromFavorites(productId);
    } else {
      return await productsAPI.addToFavorites(productId);
    }
  },

  // Get user's favorite products
  getFavoriteProducts: async (): Promise<FavoriteProductAPIResponse> => {
    const response = await api.get<FavoriteProductAPIResponse>(`${SERVICE_ENDPOINTS.FAVORITE_PRODUCTS}`);
    return response.data;
  },

  // Checkout with payment method
  checkout: async (paymentMethod: string, mobileCallbackUrl?: string): Promise<{ message: string; status: boolean; data?: any }> => {


    // Create the exact payload structure you want
    const payload: any = {
      data: {
        payment_method: paymentMethod
      },
      requestType: "inbound"
    };

    // Add mobile_callback_url to data object if provided
    if (mobileCallbackUrl && paymentMethod === 'online') {
      payload.data.mobile_callback_url = mobileCallbackUrl;
    }

    const response = await api.post(SERVICE_ENDPOINTS.CHECKOUT, payload);
    return response.data;
  },

  // Get merchant analytics
  getMerchantAnalytics: async (): Promise<MerchantAnalytics> => {
    const response = await api.get<MerchantAnalyticsResponse>(MERCHANT_ENDPOINTS.ANALYTICS);
    
    return response.data.data;
  },

  // Get vehicle makes
  getVehicleMakes: async (): Promise<VehicleMake[]> => {
    const response = await api.get<VehicleMakesAPIResponse>(MECHANIC_ENDPOINTS.VEHICLE_MAKES);
    
    return response.data.data;
  },

  // Get product by ID (for seller product details)
  getProductById: async (id: string): Promise<ProductDetailAPIResponse> => {
    const response = await api.get<ProductDetailAPIResponse>(`${SERVICE_ENDPOINTS.PRODUCTS_LIST}${id}/`);
    
    return response.data;
  },

  // Delete product by ID
  deleteProduct: async (id: string): Promise<any> => {
    const response = await api.delete(`${SERVICE_ENDPOINTS.PRODUCTS_LIST}${id}/`);

    return response.data;
  },

  // Get merchant orders
  getMerchantOrders: async (merchantId: string): Promise<any> => {
    const response = await api.get(`${SERVICE_ENDPOINTS.ORDERS}?merchant_id=${merchantId}`);

    return response.data;
  },

  // Get specific order by ID
  getOrderById: async (orderId: string): Promise<any> => {
    const response = await api.get(SERVICE_ENDPOINTS.ORDER_STATUS(orderId));

    return response.data;
  },

  // Verify payment by reference
  verifyPayment: async (reference: string): Promise<PaymentVerificationResponse> => {
    const payload = {
      requestType: "inbound",
      data: {
        reference: reference
      }
    };
    const response = await api.post<PaymentVerificationResponse>(
      SERVICE_ENDPOINTS.ORDER_VERIFY_PAYMENT,
      payload
    );
    return response.data;
  },

  // Get payment status for an order
  getPaymentStatus: async (orderId: string): Promise<PaymentStatusResponse> => {
    const response = await api.get<PaymentStatusResponse>(
      SERVICE_ENDPOINTS.PAYMENT_STATUS(orderId)
    );
    return response.data;
  },

  // Get user orders
  getUserOrders: async (status?: string): Promise<any> => {
    const params = new URLSearchParams();
    if (status && status !== 'All') {
      params.append('status', status.toLowerCase());
    }
    
    // Using the endpoint provided in the request: products/orders/
    const response = await api.get(`${SERVICE_ENDPOINTS.ORDERS}?${params.toString()}`);
    return response.data;
  },


  // Initiate a subscription payment
  initiatePayment: async (payload: {
    requestType: string;
    data: {
      callback_url: string;
      plan: string;
    };
  }, _isVehicleRental?: boolean): Promise<{ status: boolean; message: string; data?: { payment_url: string; payment_reference?: string; reference?: string; amount?: number } }> => {
    const response = await api.post(
      MERCHANT_ENDPOINTS.SUBSCRIPTION,
      payload
    );
    return response.data;
  },

  // Create product review
  createProductReview: async (productId: string, payload: { data: { rating: number; comment: string }; requestType: string }): Promise<any> => {
    const response = await api.post(SERVICE_ENDPOINTS.PRODUCT_REVIEWS(productId), payload);
    return response.data;
  },

  // Get active bidding products
  getActiveBiddingProducts: async (): Promise<ProductListAPIResponse> => {
    const response = await api.get<ProductListAPIResponse>(SERVICE_ENDPOINTS.ACTIVE_BIDDING_PRODUCTS);
    return response.data;
  },

  // Get product bids by bidding window ID
  getProductBids: async (biddingWindowId: string): Promise<any> => {
    const response = await api.get(SERVICE_ENDPOINTS.PRODUCT_BIDS(biddingWindowId));
    return response.data;
  },

  // Get current user's bids
  getMyBids: async (): Promise<any> => {
    const response = await api.get(SERVICE_ENDPOINTS.MY_BIDS);
    return response.data;
  },

  // Submit a bid by bidding window ID for the URL
  submitBid: async (biddingWindowId: string, payload: SubmitBidRequest): Promise<any> => {
    const response = await api.post(SERVICE_ENDPOINTS.PRODUCT_BIDS(biddingWindowId), payload);
    return response.data;
  },

  // Update a bid (Accept/Reject for merchant, amount update for bidder)
  updateBid: async (bidId: string, payload: { status?: string; amount?: string; bidding_window?: string }): Promise<any> => {
    const response = await api.patch(SERVICE_ENDPOINTS.PATCH_BID(bidId), payload);
    return response.data;
  },

  deleteBid: async (bidId: string): Promise<any> => {
    const response = await api.delete(SERVICE_ENDPOINTS.DELETE_BID(bidId));
    return response.data;
  },
};
