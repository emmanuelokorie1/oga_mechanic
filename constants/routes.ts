export const routes = {
  // Auth routes
  welcome: "/(auth)/welcome",
  signUp: "/(auth)/(register)/register",
  register: "/(auth)/(register)/register",
  signIn: "/(auth)/(login)/sign_in",
  forgotPassword: "/(auth)/(login)/forgetPassword",
  resetPassword: "/(auth)/(login)/resetPassword",
  enterCode: "/(auth)/(login)/enterCode",
  verifyEmail: "/(auth)/(register)/verify-email",
  terms: "/(auth)/terms",
  privacy: "/(auth)/privacy",  // Success pages
  accountCreated: "/(auth)/accountCreatedSucessful",
  resetPasswordSuccess: "/(auth)/resetPasswordSucessful",

  // Main app routes
  home: "/(root)/(tabs)/(user)/home",
  userHome: "/(root)/(tabs)/(user)/home",
  mechanicHome: "/(root)/(tabs)/(mechanic)/home",
  cars: "/(root)/(screens)/(user)/cars",
  services: "/(root)/(tabs)/(user)/home",
  profile: "/(root)/(tabs)/(user)/profile",
  shop: "/(root)/(tabs)/(user)/shop",
  myOrders: "/(root)/(screens)/(user)/my-orders",
  reviews: "/(root)/(screens)/(user)/reviews",


  //screens
  changePassword: "/(root)/(screens)/(general)/change-password",
  editProfile: "/(root)/(screens)/(user)/edit-profile",
  favoriteProducts: "/(root)/(screens)/(user)/favorite-products",
  ProductDetail: "/(root)/(screens)/(user)/product-detail",
  cart: "/(root)/(screens)/(user)/cart",
  orderDetail: "/(root)/(screens)/(user)/order-details",
  paymentResult: "/(root)/(screens)/(user)/payment-result",
  orderConfirmation: "/(root)/(screens)/(user)/order-confirmation",
  orderTracking: "/(root)/(screens)/(user)/order-tracking",
  chatSpecialist: "/(root)/(screens)/(user)/chat-specialist",
  carDetails: "/(root)/(screens)/(user)/car-detail",
  addCar: "/(root)/(screens)/(user)/add-car",
  AllMechanic: "/(root)/(screens)/(mechanicScreens)/all-mechanic",
  mechanicProfile: "/(root)/(screens)/(mechanicScreens)/mechanic-profile",
  chatMechanic: "/(root)/(screens)/(mechanicScreens)/chat-mechanic",
  findMechanic: "/(root)/(screens)/(user)/(ordermechanic)/find-mechanic",
  orderMechanic: "/(root)/(screens)/(user)/(ordermechanic)/order-mechanic",
  trackMechanicOrder: "/(root)/(screens)/(user)/(ordermechanic)/track-mechanic-order",
  myMechanicOrders: "/(root)/(screens)/(user)/(ordermechanic)/my-mechanic-orders",
  merchantProfile: "/(root)/(screens)/(user)/merchant-profile",
  notifications: "/(root)/(screens)/(notifications)/notification",
  notificationDetail: "/(root)/(screens)/(notifications)/notification-detail",
  followedMerchants: "/(root)/(screens)/(user)/followed-merchants",
  activeBids: "/(root)/(screens)/(user)/active-bids",
  biddingDetail: "/(root)/(screens)/(user)/bidding-detail",
  myBids: "/(root)/(screens)/(user)/my-bids",
  supportSuggestions: "/(root)/(screens)/(user)/support-suggestions",

  //calls
  videoCall: "/(root)/(screens)/(calls)/video-call",
  voiceCall: "/(root)/(screens)/(calls)/voice-call",

  // Rent a car
  rentACar: "/(root)/(screens)/(rentCar)/rent-a-car",
  carRentalDetail: "/(root)/(screens)/(rentCar)/car-rental-detail",

  //payment
  paymentConfirm: "/(root)/(screens)/(payments)/payment-confirm",
  cardPayment: "/(root)/(screens)/(payments)/card-payment",
  paymentOTP: "/(root)/(screens)/(payments)/payment-otp",
  bankTransfer: "/(root)/(screens)/(payments)/bank-transfer",
} as const;

export type RouteKeys = keyof typeof routes;
export type RouteValues = (typeof routes)[RouteKeys];


// Mechanic routes
export const mechanicRoutes = {
  // Mechanic tabs
  home: "/(root)/(tabs)/(mechanic)/home",
  earnings: "/(root)/(tabs)/(mechanic)/earnings",
  order: "/(root)/(tabs)/(mechanic)/order",
  profile: "/(root)/(tabs)/(mechanic)/profile",
  shop: "/(root)/(tabs)/(mechanic)/shop",

  ConfirmWithdrawal: "/(root)/(screens)/(mechanic)/confirmWithdrawal",
  ConfirmOrder: "/(root)/(screens)/(mechanic)/confirmOrder",
  WithdrawalHistory: "/(root)/(screens)/(mechanic)/withdrawalHistory",
  EditProfile: "/(root)/(screens)/(mechanic)/editProfile",
  profileDetails: "/(root)/(screens)/(mechanic)/profileDetails",
  orderDetails: "/(root)/(screens)/(mechanic)/order-details",
  completeKyc: "/(root)/(screens)/(mechanic)/complete-kyc",
  reviews: "/(root)/(screens)/(mechanic)/reviews",
} as const;

export type MechanicRouteKeys = keyof typeof mechanicRoutes;
export type MechanicRouteValues = (typeof mechanicRoutes)[MechanicRouteKeys];

  // seller routes
export const sellerRoutes = {

  // seller tabs
  home: "/(root)/(tabs)/(sellers)/home",
  earnings: "/(root)/(tabs)/(sellers)/earnings",
  order: "/(root)/(tabs)/(sellers)/orders",
  products: "/(root)/(tabs)/(sellers)/product",
  profile: "/(root)/(tabs)/(sellers)/profile",

  // seller screens
  ConfirmWithdrawal: "/(root)/(screens)/(seller)/confirmWithdrawal",
  ConfirmOrder: "/(root)/(screens)/(seller)/confirmOrder",
  WithdrawalHistory: "/(root)/(screens)/(seller)/withdrawalHistory",
  EditProfile: "/(root)/(screens)/(seller)/editProfile",
  profileDetails: "/(root)/(screens)/(seller)/profileDetails",
  orderDetails: "/(root)/(screens)/(seller)/orderDetails",
  uploadProducts: "/(root)/(screens)/(seller)/(products)/(uploadProducts)/uploadProducts",
  editProduct: "/(root)/(screens)/(seller)/(products)/(editProduct)/editProduct",
  editSparePart: "/(root)/(screens)/(seller)/(products)/(editProduct)/editSparePart",
  editCarToRent: "/(root)/(screens)/(seller)/(products)/(editProduct)/editRentCar",
  editImage: "/(root)/(screens)/(seller)/(products)/(editProduct)/editImage",
  uploadCarImages: "/(root)/(screens)/(seller)/(products)/(uploadProducts)/uploadCarImages",
  uploadSpareParts: "/(root)/(screens)/(seller)/(products)/(uploadProducts)/upload-sparePart",
  uploadCarToRent: "/(root)/(screens)/(seller)/(products)/(uploadCarRent)/uploadCarToRent",
  successfulPage: "/(root)/(screens)/(seller)/(products)/SuccessfulPage",
  allSpareParts: "/(root)/(screens)/(seller)/allSpareParts",
  allCars: "/(root)/(screens)/(seller)/allCars",
  allRentedCars: "/(root)/(screens)/(seller)/allRentedCars",
  productDetails: "/(root)/(screens)/(seller)/productDetails",
  productDetailsDetailed: "/(root)/(screens)/(seller)/productDetailsDetailed",
  deleteSuccess: "/(root)/(screens)/(seller)/deleteSuccess",
  subscription: "/(root)/(screens)/(seller)/subscription",
  subscriptionPayment: "/(root)/(screens)/(seller)/subscription-payment",
} as const;

export type SellerRouteKeys = keyof typeof sellerRoutes;
export type SellerRouteValues = (typeof sellerRoutes)[SellerRouteKeys];

// KYC Routes map by role
export const roleKYCRoutes: Record<string, string> = {
  mechanic: "/(root)/(screens)/(mechanic)/complete-kyc",
  merchant: "/(root)/(screens)/(seller)/complete-kyc",
  seller: "/(root)/(screens)/(seller)/complete-kyc",
  vehicle_rental: "/(root)/(screens)/(seller)/complete-kyc",
};

// KYC Routes map by role
export const generalRoutes: Record<string, string> = {
  bankInfo: "/(root)/(screens)/(general)/BankInfo/BankInfo",
};