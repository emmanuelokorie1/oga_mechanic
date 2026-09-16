import { ServicesProps } from "@/types/type";

//images
import welcomeImg1 from "@/assets/images/auth/welcomeImg1.svg";
import welcomeImg2 from "@/assets/images/auth/welcomeImg2.svg";
import welcomeImg3 from "@/assets/images/auth/welcomeImg3.svg";
import welcomeImg4 from "@/assets/images/auth/welcomeImg4.svg";
import success from "@/assets/images/success.svg";
import dummyProfile from "@/assets/images/propics.jpeg";
import carFront from "@/assets/images/frontCarPlaceholder.jpg";
import carBack from "@/assets/images/carBack.png";
import carRight from "@/assets/images/carRight.png";
import carLeft from "@/assets/images/carLeft.png";

//icons
import logo from "@/assets/icons/logo.svg";
import logoBlack from "@/assets/icons/logo_black.svg";
import logoBox from "@/assets/icons/box_logo.png";
import splash from "@/assets/icons/logo2.svg";
import backBtn from "@/assets/icons/backBtn.svg";
import tick1 from "@/assets/icons/tick1.svg";
import eyeClosed from "@/assets/icons/EyeClosed.png";
import eyeOpen from "@/assets/icons/eyeOpen.png";
import filledStar from "@/assets/icons/filledStar.svg";
import unfillStar from "@/assets/icons/unfillStar.svg";
import empty from "@/assets/icons/empty.svg";
import bankIcon from "@/assets/icons/bank.svg";
import mechanic3 from "@/assets/icons/mechanic3.png";
import carRent from "@/assets/icons/car_rent.png";
import round from "@/assets/icons/round.svg";
import mechanicOrderIcon from "@/assets/icons/find_mechanic.png";
import customerService from "@/assets/icons/customer-service.png";

//profile icons
import UserCircle from "@/assets/icons/profile/UserCircle.svg";
import addBank from "@/assets/icons/profile/addBank.svg";
import savingWallet from "@/assets/icons/profile/savingWallet.svg";
import padlock from "@/assets/icons/profile/padlock.svg";
import switch1 from "@/assets/icons/profile/switch.svg";
import sub from "@/assets/icons/profile/sub.svg";
import faceId from "@/assets/icons/profile/faceId.svg";
import enablePass from "@/assets/icons/profile/enablePass.svg";
import phone1 from "@/assets/icons/profile/phone1.svg";
import x from "@/assets/icons/profile/x.svg";
import linkedIn from "@/assets/icons/profile/linkedIn.svg";
import email from "@/assets/icons/profile/email.svg";

//services icons
import sparePartIcon from "@/assets/icons/sparePart.svg";
import buycar from "@/assets/icons/buycar.svg";

//tabs icons
import home from "@/assets/icons/home.svg";
import earnings from "@/assets/icons/earnings.svg";
import order from "@/assets/icons/order.svg";
import activeEarnings from "@/assets/icons/activeEarnings.svg";
import activeOrder from "@/assets/icons/activeOrder.svg";
import activeHome from "@/assets/icons/activeHome.svg";
import activeServices from "@/assets/icons/activeServices.svg";
import activeProfile from "@/assets/icons/activeProfile.svg";
import activeCar from "@/assets/icons/activeCar.svg";
import car from "@/assets/icons/car.svg";
import services from "@/assets/icons/services.svg";
import profile from "@/assets/icons/profile.svg";
import shopTab from "@/assets/icons/shopTab.svg";
import productTab from "@/assets/icons/productTab.svg";
import activeProductTab from "@/assets/icons/activeProductTab.svg";
import searchCar from "@/assets/icons/search_car.png";

import { mechanicRoutes, routes, sellerRoutes, generalRoutes } from "./routes";

export const images = {
  welcomeImg1,
  welcomeImg2,
  welcomeImg3,
  welcomeImg4,
  dummyProfile,

  carFront,
  carBack,
  carRight,
  carLeft,
};

export const icons = {
  logo,
  logoBlack,
  logoBox,
  eyeClosed,
  eyeOpen,
  tick1,
  splash,
  success,
  backBtn,
  home,
  earnings,
  activeEarnings,
  activeHome,
  order,
  activeOrder,
  activeServices,
  activeProfile,
  activeCar,
  car,
  services,
  profile,
  filledStar,
  unfillStar,
  UserCircle,
  enablePass,
  faceId,
  shopTab,
  bankIcon,
  productTab,
  activeProductTab,
  empty,
  round,
  customerService,
  spareParts: sparePartIcon,
  cars: car,
  activeFleetTab: carRent
};



export const Services: ServicesProps[] = [
  {
    id: 6,
    name: "Find a Mechanic",
    description: "Verified roadside & workshop repairs",
    image: mechanic3,
    bgColor: "#EEF2FF",
    border: "#ACA6FF",
    badge: "Verified Pros",
    isSmall: true,
  },
  {
    id: 2,
    name: "Buy Spare Parts",
    description: "100% genuine OEM vehicle parts",
    image: sparePartIcon,
    isSmall: true,
    bgColor: "#FFF7ED",
    border: "#5A4F49",
    badge: "100% OEM",
  },
  {
    id: 3,
    name: "Buy a Car",
    description: "Inspected certified pre-owned cars",
    image: buycar,
    bgColor: "#FFFBEB",
    border: "#F6B80D",
    badge: "Inspected",
  },
  {
    id: 5,
    name: "Vehicle Rental",
    description: "Chauffeured & self-drive fleet",
    image: carRent,
    isSmall: true,
    bgColor: "#F0FDF4",
    border: "#189804",
    badge: "Insured",
  },
  {
    id: 10,
    name: "VIN Search",
    description: "Instant chassis & diagnostic report",
    image: searchCar,
    isSmall: true,
    bgColor: "#F0FDF4",
    border: "#86EFAC",
    badge: "Instant Report",
  },
  {
    id: 8,
    name: "My Repair Orders",
    description: "Track active jobs & order status",
    image: mechanicOrderIcon,
    isSmall: true,
    bgColor: "#FEF2F2",
    border: "#FCA5A5",
    badge: "Live Tracking",
  },
  {
    id: 11,
    name: "Chat Specialist",
    description: "24/7 technical advice and support",
    image: customerService,
    isSmall: true,
    bgColor: "#FEF2F2",
    border: "#EF4444",
    badge: "24/7",
  },
  {
    id: 9,
    name: "Service Provider",
    description: "Switch to workshop",
    image: round,
    bgColor: "#F0F9FF",
    border: "#7DD3FC",
    badge: "Partner",
  },
];

export const userInfo = {
  id: 1,
  name: "Okorie Emmanuel",
  location: "Lagos, Nigeria",
  phone: "07084844214",
};

export const ProfileSettings = {
  name: "Profile settings",
  options: [
    {
      id: 1,
      name: "My Profile",
      image: UserCircle,
      route: routes.editProfile,
    },
    {
      id: 10,
      name: "My Cars",
      image: car,
      route: routes.cars,
    },
    {
      id: 2,
      name: "Change Password",
      image: padlock,
      route: routes.changePassword,
    },
    {
      id: 3,
      name: "Service Provider",
      image: switch1,
      route: "Service Provider",
    },
    {
      id: 11,
      name: "My Bids",
      image: savingWallet,
      route: routes.myBids,
    },
    {
      id: 4,
      name: "Subscription",
      image: sub,
      route: routes.notifications,
    },
  ],
};

export const MechanicProfileSettings = {
  name: "Profile settings",
  options: [
    {
      id: 1,
      name: "My Profile",
      image: UserCircle,
      route: mechanicRoutes.profileDetails,
    },
    {
      id: 2,
      name: "Bank Details",
      image: addBank,
      route: generalRoutes.bankInfo,
    },
    {
      id: 3,
      name: "My Reviews",
      image: filledStar,
      route: mechanicRoutes.reviews,
    },
    {
      id: 4,
      name: "Change Password",
      image: padlock,
      route: routes.changePassword,
    },
    {
      id: 5,
      name: "Service Provider",
      image: switch1,
      route: "Service Provider",
    },
    {
      id: 7,
      name: "My Bids",
      image: savingWallet,
      route: routes.myBids,
    },
  ],
};

export const SellerProfileSettings = {
  name: "Profile settings",
  options: [
    {
      id: 1,
      name: "My Profile",
      image: UserCircle,
      route: sellerRoutes.profileDetails,
    },
    {
      id: 2,
      name: "Bank Details",
      image: addBank,
      route: generalRoutes.bankInfo,
    },
    {
      id: 3,
      name: "Subscription",
      image: sub,
      route: sellerRoutes.subscription,
    },
    {
      id: 4,
      name: "Change Password",
      image: padlock,
      route: routes.changePassword,
    },
    {
      id: 5,
      name: "Service Provider",
      image: switch1,
      route: "Service Provider",
    },
    {
      id: 6,
      name: "My Bids",
      image: savingWallet,
      route: routes.myBids,
    },
  ],
};

export const ProfileSopprt = {
  name: "SuPPORT",
  options: [
    {
      id: 1,
      name: "+234 70564733811",
      image: phone1,
      route: "supportSuggestions",
    },
    {
      id: 2,
      name: "+234 70564733811",
      image: phone1,
      route: "supportSuggestions",
    },
    {
      id: 3,
      name: "@ogamechanic",
      image: x,
      route: "supportSuggestions",
    },
    {
      id: 4,
      name: "Oga mechanic",
      image: linkedIn,
      route: "supportSuggestions",
    },
    {
      id: 5,
      name: "help@ogamechanic.com",
      image: email,
      route: "supportSuggestions",
    },
  ],
};

export const data = {
};
