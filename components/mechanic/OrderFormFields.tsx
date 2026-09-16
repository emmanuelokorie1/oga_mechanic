import React from 'react';
import { View, Text } from 'react-native';
import SelectField from '@/components/forms/SelectField';
import { VehicleDetailsForm } from './VehicleDetailsForm';
import { ServiceDetailsForm } from './ServiceDetailsForm';
import { SchedulingSection } from './SchedulingSection';
import { TruckIcon } from 'react-native-heroicons/outline';

interface SelectOption {
  label: string;
  value: string;
  imageUri?: string | null;
}

interface OrderFormFieldsProps {
  // Car selection
  carSelection: 'Yes' | 'No' | null;
  selectedCar: string;
  setSelectedCar: (value: string) => void;
  hasCarList: boolean;
  /** Populated from GET /users/my-vehicles/ via useCarList */
  carOptions: SelectOption[];
  /** While vehicles are loading */
  carsLoading?: boolean;

  // Service details
  serviceTypes: string[];
  setServiceTypes: (value: string[]) => void;
  problemDescription: string;
  setProblemDescription: (value: string) => void;
  serviceAddress: string;
  setServiceAddress: (value: string) => void;
  serviceLatitude: number | undefined;
  setServiceLatitude: (value: number | undefined) => void;
  serviceLongitude: number | undefined;
  setServiceLongitude: (value: number | undefined) => void;
  serviceTypeOptions: SelectOption[];

  // Vehicle details
  vehicleMake: string;
  setVehicleMake: (value: string) => void;
  vehicleModel: string;
  setVehicleModel: (value: string) => void;
  vehicleYear: string;
  setVehicleYear: (value: string) => void;
  vehicleMakeOptions: SelectOption[];
  vehicleModelOptions: SelectOption[];
  vehicleYearOptions: SelectOption[];
  vehicleVin: string;
  setVehicleVin: (value: string) => void;
  vehicleMakesLoading: boolean;

  // Scheduling
  isScheduled: boolean;
  setIsScheduled: (value: boolean) => void;
  preferredDate: Date | null;
  setPreferredDate: (value: Date | null) => void;
  preferredTimeSlot: string;
  setPreferredTimeSlot: (value: string) => void;
  timeSlotOptions: SelectOption[];

  // Callbacks
  onCarSelect?: (carId: string) => void;
  onVINLookup?: (vin: string) => void;
}

/**
 * Composite component that renders the appropriate form fields
 * based on whether user has a car list and their selection
 */
export const OrderFormFields: React.FC<OrderFormFieldsProps> = ({
  carSelection,
  selectedCar,
  setSelectedCar,
  hasCarList,
  carOptions,
  carsLoading = false,
  serviceTypes,
  setServiceTypes,
  problemDescription,
  setProblemDescription,
  serviceAddress,
  setServiceAddress,
  serviceLatitude,
  setServiceLatitude,
  serviceLongitude,
  setServiceLongitude,
  serviceTypeOptions,
  vehicleMake,
  setVehicleMake,
  vehicleModel,
  setVehicleModel,
  vehicleYear,
  setVehicleYear,
  vehicleVin,
  setVehicleVin,
  vehicleMakeOptions,
  vehicleModelOptions,
  vehicleYearOptions,
  vehicleMakesLoading,
  isScheduled,
  setIsScheduled,
  preferredDate,
  setPreferredDate,
  preferredTimeSlot,
  setPreferredTimeSlot,
  timeSlotOptions,
  onCarSelect,
  onVINLookup,
}) => {
  // If user has car list and selected "Yes", show car dropdown + service details
  if (hasCarList && carSelection === 'Yes') {
    return (
      <View>
        {/* Select Car Section */}
        <View className="mb-4">
          <SelectField
            name="selectedCar"
            label="Vehicle Reference"
            placeholder={
              carsLoading
                ? "Loading your vehicles…"
                : carOptions.length === 0
                  ? "No saved vehicles"
                  : "Select a car"
            }
            options={carOptions}
            value={selectedCar}
            onValueChange={(carId) => {
              setSelectedCar(carId);
              onCarSelect?.(carId);
            }}
          />
        </View>


        <ServiceDetailsForm
          serviceTypes={serviceTypes}
          setServiceTypes={setServiceTypes}
          problemDescription={problemDescription}
          setProblemDescription={setProblemDescription}
          serviceAddress={serviceAddress}
          setServiceAddress={setServiceAddress}
          serviceLatitude={serviceLatitude}
          setServiceLatitude={setServiceLatitude}
          serviceLongitude={serviceLongitude}
          setServiceLongitude={setServiceLongitude}
          serviceTypeOptions={serviceTypeOptions}
        />


        <SchedulingSection
          isScheduled={isScheduled}
          setIsScheduled={setIsScheduled}
          preferredDate={preferredDate}
          setPreferredDate={setPreferredDate}
          preferredTimeSlot={preferredTimeSlot}
          setPreferredTimeSlot={setPreferredTimeSlot}
          timeSlotOptions={timeSlotOptions}
        />
      </View>
    );
  }

  // If user has car list and selected "No", or no car list exists
  // Show full manual entry form
  return (
    <View>
      <ServiceDetailsForm
        serviceTypes={serviceTypes}
        setServiceTypes={setServiceTypes}
        problemDescription={problemDescription}
        setProblemDescription={setProblemDescription}
        serviceAddress={serviceAddress}
        setServiceAddress={setServiceAddress}
        serviceLatitude={serviceLatitude}
        setServiceLatitude={setServiceLatitude}
        serviceLongitude={serviceLongitude}
        setServiceLongitude={setServiceLongitude}
        serviceTypeOptions={serviceTypeOptions}
      />

      {/* Divider */}
      <View className="h-[1px] bg-gray-100 mb-4" />

      <VehicleDetailsForm
        vehicleMake={vehicleMake}
        setVehicleMake={setVehicleMake}
        vehicleModel={vehicleModel}
        setVehicleModel={setVehicleModel}
        vehicleYear={vehicleYear}
        setVehicleYear={setVehicleYear}
        vehicleVin={vehicleVin}
        setVehicleVin={setVehicleVin}
        vehicleMakeOptions={vehicleMakeOptions}
        vehicleModelOptions={vehicleModelOptions}
        vehicleYearOptions={vehicleYearOptions}
        onVINLookup={onVINLookup}
        vehicleMakesLoading={vehicleMakesLoading}
      />

      {/* Divider */}
      <View className="h-[1px] bg-gray-100 mb-2" />

      <SchedulingSection
        isScheduled={isScheduled}
        setIsScheduled={setIsScheduled}
        preferredDate={preferredDate}
        setPreferredDate={setPreferredDate}
        preferredTimeSlot={preferredTimeSlot}
        setPreferredTimeSlot={setPreferredTimeSlot}
        timeSlotOptions={timeSlotOptions}
      />
    </View>
  );
};
