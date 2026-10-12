import { ENV_CONFIG } from '../config/env';

// Base API URL
export const BASE_URL = ENV_CONFIG.API_URL;

// Auth endpoints (common for all roles)
export const AUTH_ENDPOINTS = {
  LOGIN: '/auth/login/',
  REGISTER: '/auth/register/',
  REFRESH_TOKEN: '/auth/refresh/',
  LOGOUT: '/auth/logout/',
  FORGOT_PASSWORD: '/users/password/reset/',
  RESET_PASSWORD: '/users/password/reset/confirm/',
  VERIFY_OTP: '/users/resend-verification-code/',
  SWITCH_ROLE: '/auth/switch-role/',
  ALL_ROLES: '/users/roles/list/',
  GOOGLE: '/users/google/',
} as const;

// User endpoints (regular users/customers)
export const USER_ENDPOINTS = {
  LOGIN: '/users/login/',
  LOGOUT: '/users/logout/',
  REGISTER: '/users/register/',
  GOOGLE: '/users/google/',
  REGISTER_STEP: (stepId: number) => `/users/register/step/${stepId}/`,
  REGISTER_VEHICLE: '/users/register/vehicle/',
  ROLES: '/users/roles/',
  SWITCH_ROLE: '/users/switch-role/',
  PROFILE: '/users/profile/primary/',
  PRIMARY_PROFILE: '/users/profile/primary/',
  UPDATE_PROFILE: '/users/profile/primary/',
  NIN_STATUS: '/users/nin/status/',
  NIN_VERIFY: '/users/nin/verify/',
  /** GET list (paginated ?page=), POST create — same collection */
  CARS: '/users/my-vehicles/',
  /** POST multipart: vin?, make, model, year, license_plate?, uploaded_images[] */
  ADD_CAR: '/users/my-vehicles/',
  UPDATE_CAR: (id: string) => `/users/my-vehicles/${id}/`,
  DELETE_CAR: (id: string) => `/users/my-vehicles/${id}/`,
  FIND_MECHANIC: '/user/mechanics/find',
  BOOK_MECHANIC: '/user/mechanics/book',
  RENT_CAR: '/user/cars/rent',
  BUY_CAR: '/user/cars/buy',
  SHOP_ITEMS: '/user/shop/items',
  CART: '/user/cart',
  ORDERS: '/user/orders',
  PAYMENTS: '/user/payments',
  NOTIFICATIONS: '/users/notifications/',
  NOTIFICATION_DETAIL: (id: number | string) => `/users/notifications/${id}/`,
  NOTIFICATION_MARK_ALL_READ: '/users/notifications/mark-all-read/',
   BANKS: '/users/banks/',
  BANK_ENQUIRY: '/users/bank/enquiry/',
  BANK_ACCOUNTS: '/users/bank-accounts/',
  WALLET: '/users/wallet/',
  EARNINGS: '/users/earnings/',
  WITHDRAWALS: '/users/withdrawals/',
  WITHDRAW_WALLET: '/users/wallet/withdraw/',
} as const;

// Mechanic endpoints (service providers)
export const MECHANIC_ENDPOINTS = {
  PROFILE: '/mechanic/profile',
  UPDATE_PROFILE: '/mechanic/profile',
  SERVICES: '/mechanic/services',
  ADD_SERVICE: '/mechanic/services',
  UPDATE_SERVICE: (id: string) => `/mechanic/services/${id}`,
  DELETE_SERVICE: (id: string) => `/mechanic/services/${id}`,
  BOOKINGS: '/mechanic/bookings',
  ACCEPT_BOOKING: (id: string) => `/mechanic/bookings/${id}/accept`,
  REJECT_BOOKING: (id: string) => `/mechanic/bookings/${id}/reject`,
  COMPLETE_BOOKING: (id: string) => `/mechanic/bookings/${id}/complete`,
  EARNINGS: '/mechanic/earnings',
  WITHDRAW: '/mechanic/earnings/withdraw',
  AVAILABILITY: '/mechanic/availability',
  SET_AVAILABILITY: '/mechanic/availability',
  REVIEWS: '/mechanic/reviews',
  SCHEDULE: '/mechanic/schedule',
  VEHICLE_MAKES: '/mechanics/vehicle-makes/',
  REPAIR_REQUESTS: '/mechanics/repair-requests/',
  VERIFY_OTP: (id: string) => `/mechanics/repair-requests/${id}/verify-otp/`,
  ANALYTICS: '/mechanics/mechanic-analytics/',
  SERVICE_TYPES: '/mechanics/service-types/',
  VEHICLE_EXPERTISE: '/mechanics/vehicle-expertise/',
  SPECIALIZATIONS: '/mechanics/specializations/',
} as const;

// Merchant endpoints (shop owners)
export const MERCHANT_ENDPOINTS = {
  PROFILE: '/users/profile/merchant/',
  UPDATE_PROFILE: '/merchant/profile',
  SHOPS: '/merchant/shops',
  CREATE_SHOP: '/merchant/shops',
  UPDATE_SHOP: (id: string) => `/merchant/shops/${id}`,
  DELETE_SHOP: (id: string) => `/merchant/shops/${id}`,
  PRODUCTS: '/merchant/products',
  ADD_PRODUCT: '/merchant/products',
  UPDATE_PRODUCT: (id: string) => `/merchant/products/${id}`,
  DELETE_PRODUCT: (id: string) => `/merchant/products/${id}`,
  ORDERS: '/merchant/orders',
  UPDATE_ORDER_STATUS: (id: string) => `/merchant/orders/${id}/status`,
  INVENTORY: '/merchant/inventory',
  UPDATE_INVENTORY: (id: string) => `/merchant/inventory/${id}`,
  EARNINGS: '/merchant/earnings',
  WITHDRAW: '/merchant/earnings/withdraw',
  ANALYTICS: '/products/merchant/analytics/',
  SUBSCRIPTION: '/users/profile/merchant/subscribe/',
} as const;

// Vehicle Rental endpoints
export const VEHICLE_RENTAL_ENDPOINTS = {
  PROFILE: '/users/profile/vehicle-rental/',
} as const;

// Common service endpoints (used by multiple roles)
export const SERVICE_ENDPOINTS = {
  MECHANICS_FIND: '/mechanics/find',
  MECHANICS_NEARBY: '/mechanics/nearby',
  MECHANICS_AVAILABLE: '/mechanics/available-mechanics/',
  MECHANIC_PROFILE: (id: string) => `/mechanics/${id}`,
  MECHANIC_DETAIL: (id: string) => `/mechanics/mechanics/${id}/`,
  MECHANIC_REVIEWS: (id: string) => `/mechanics/${id}/reviews`,
  PAYMENTS_CREATE: '/payments',
  PAYMENTS_VERIFY: (id: string) => `/payments/${id}/verify`,
  PAYMENTS_HISTORY: '/payments/history',
  SHOP_PRODUCTS: '/shop/products',
  SHOP_PRODUCT_DETAIL: (id: string) => `/products/products/${id}/`,
  SHOP_CATEGORIES: '/shop/categories',
  SHOP_SEARCH: '/shop/search',
  PRODUCTS_HOME: '/products/home/',
  PRODUCTS_LIST: '/products/products/',
  PRODUCTS_BY_MERCHANT: (merchantId: string) => `/products/products/${merchantId}/`,
  PRODUCTS_SEARCH: '/products/search/',
  PRODUCT_DETAIL: (id: string) => `/products/products/${id}/`,
  PRODUCTS_CATEGORIES: '/products/categories/',
  // Cart endpoints
  CART: '/products/cart/',
  ADD_TO_CART: '/products/cart/',
  GET_CART: '/products/cart/',
  UPDATE_CART_ITEM: '/products/cart/',
  REMOVE_FROM_CART: '/products/cart',
  CLEAR_CART: '/products/cart/clear/',
  // Favorites endpoints
  FAVORITE_PRODUCT: '/products/favorite-product/',
  FAVORITE_PRODUCTS: '/products/favorite-products/',
  FOLLOW_MERCHANT: '/products/follow-merchant/',
  FOLLOWED_MERCHANTS: '/products/followed-merchants/',
  // Checkout endpoints
  CHECKOUT: '/products/checkout/',
  // Payment verification endpoints
  PAYMENT_STATUS: (orderId: string) => `/products/orders/${orderId}/payment-status/`,
  // Orders endpoints
  ORDERS: '/products/orders/',
  ORDER_STATUS: (orderId: string) => `/products/orders/${orderId}/status/`,
  ORDER_VERIFY_PAYMENT: '/products/orders/verify-payment/',
  PRODUCT_REVIEWS: (id: string) => `/products/products/${id}/reviews/`,
  PRODUCT_BIDS: (id: string) => `/products/bidding/${id}/bids/`,
  PATCH_BID: (bidId: string) => `/products/bids/${bidId}/`,
  DELETE_BID: (bidId: string) => `/products/bids/${bidId}/`,
  MY_BIDS: '/products/bidding/my-bids/',
  ACTIVE_BIDDING_PRODUCTS: 'products/bidding/active-products/',
  SUPPORT_CONTACT: '/support/contact',
  SUPPORT_FAQ: '/support/faq',
  SUPPORT_TICKETS: '/support/tickets',
  SUPPORT_CREATE_TICKET: '/support/tickets',
  SUPPORT_CONVERSATIONS: '/communications/support/conversations/',
  COMMUNICATIONS_CHAT_ROOMS: '/communications/chat-rooms/',
  COMMUNICATIONS_NOTIFICATIONS: '/communications/notifications/',
  SUPPORT_UPLOAD: '/communications/support/upload/',
} as const;