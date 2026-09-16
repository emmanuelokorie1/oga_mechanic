import type React from "react"
import type { ImageSourcePropType, KeyboardType, TextInputProps, TouchableOpacityProps } from "react-native"
import type { SvgProps } from "react-native-svg" // Import SvgProps

declare interface Driver {
  id: number
  first_name: string
  last_name: string
  profile_image_url: string
  car_image_url: string
  car_seats: number
  rating: number
}

declare interface MarkerData {
  latitude: number
  longitude: number
  id: number
  title: string
  profile_image_url: string
  car_image_url: string
  car_seats: number
  rating: number
  first_name: string
  last_name: string
  time?: number
  price?: string
}

declare interface AuthNavigateLinkProps {
  text?: string
  textLink?: string
  containerClassName?: string
  textClassName?: string
  linkClassName?: string
  onPress?: () => void
}

declare interface MapProps {
  destinationLatitude?: number
  destinationLongitude?: number
  onDriverTimesCalculated?: (driversWithTimes: MarkerData[]) => void
  selectedDriver?: number | null
  onMapReady?: () => void
}

declare interface OTPInputProps {
  numberOfDigits?: number
  countdown?: number
  onComplete?: (otp: string | number) => void | undefined
}

declare interface Ride {
  origin_address: string
  destination_address: string
  origin_latitude: number
  origin_longitude: number
  destination_latitude: number
  destination_longitude: number
  ride_time: number
  fare_price: number
  payment_status: string
  driver_id: number
  user_id: string
  created_at: string
  driver: {
    first_name: string
    last_name: string
    car_seats: number
  }
}

declare interface ButtonProps extends TouchableOpacityProps {
  title: string
  bgVariant?: "primary" | "secondary" | "danger" | "outline" | "success" | "dangerborder"
  textVariant?: "primary" | "default" | "secondary" | "danger" | "success" | "dangerborder" | "outline"
  IconLeft?: React.ComponentType<any>
  IconRight?: React.ComponentType<any>
  className?: string
  loading?: boolean
  loadingText?: string
}

declare interface GoogleInputProps {
  icon?: string
  initialLocation?: string
  containerStyle?: string
  textInputBackgroundColor?: string
  handlePress: ({
    latitude,
    longitude,
    address,
  }: {
    latitude: number
    longitude: number
    address: string
  }) => void
}

declare interface InputFieldProps extends TextInputProps {
  label?: string
  icon?: any
  secureTextEntry?: boolean
  labelStyle?: string
  containerStyle?: string
  inputStyle?: string
  iconStyle?: string
  className?: string
  placeholder?: string
  isPasswordVisible?: boolean
  setIsPasswordVisible?: any
  keyboardType?: KeyboardType
  required?: boolean
  helperText?: string
  leftIcon?: any
  error?: any
  touched?: any
  noMargin?: boolean
}

declare interface PaymentProps {
  fullName: string
  email: string
  amount: string
  driverId: number
  rideTime: number
}

declare interface LocationStore {
  userLatitude: number | null
  userLongitude: number | null
  userAddress: string | null
  destinationLatitude: number | null
  destinationLongitude: number | null
  destinationAddress: string | null
  setUserLocation: ({
    latitude,
    longitude,
    address,
  }: {
    latitude: number
    longitude: number
    address: string
  }) => void
  setDestinationLocation: ({
    latitude,
    longitude,
    address,
  }: {
    latitude: number
    longitude: number
    address: string
  }) => void
}

declare interface DriverStore {
  drivers: MarkerData[]
  selectedDriver: number | null
  setSelectedDriver: (driverId: number) => void
  setDrivers: (drivers: MarkerData[]) => void
  clearSelectedDriver: () => void
}

declare interface DriverCardProps {
  item: MarkerData
  selected: number
  setSelected: () => void
}

declare interface HeaderAndDescTextCenterProps {
  header?: string
  text1?: string
  text2?: string
  text3?: string
  containerStyle?: string
  headerStyle?: string
  textStyle?: string
}

declare interface AdsProps {
  id?: string | number
  image: ImageSourcePropType
  title?: string
  description?: string
  containerStyle?: string
  onPress?: () => void
  price?: string | number
  currency?: string
  vin?: string
  year?: number | string
  repairHistoryCount?: number
  isBidding?: boolean
}

declare interface ServicesProps {
  id: number
  name: string
  description: string
  image: any // Support both SVG components and standard Image assets
  isSmall?: boolean
  bgColor: string
  border: string
  badge?: string
}

declare interface myCar {
  id: number;
  name: string;
  year: number;
  vin: string;
  status: "Active" | "Inactive";
  image: any;
  color: string;
}