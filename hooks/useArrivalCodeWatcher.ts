import { useEffect, useRef } from 'react';
import { useUserRepairRequests } from '@/hooks/useRepairRequests';
import { mechanicAPI } from '@/lib/api/mechanic';
import { useArrivalCodeStore } from '@/stores/arrivalCodeStore';
import { useActiveRoleProfile } from '@/hooks/useUserProfile';

/**
 * useArrivalCodeWatcher
 * Automatically watches user repair requests across the customer interface.
 * When a mechanic marks a job as "arrived", this hook resolves the 6-digit OTP
 * and immediately triggers the CustomerArrivalCodeModal anywhere in the user role.
 */
export const useArrivalCodeWatcher = () => {
  const { isMechanic, isMerchant, isVehicleRental } = useActiveRoleProfile();
  const isCustomerRole = !isMechanic && !isMerchant && !isVehicleRental;
  const isAwaitingVerification = useArrivalCodeStore((state) => state.isVisible && !state.isVerified);

  const { data: userRequestsRes } = useUserRepairRequests(
    undefined, 
    isCustomerRole, 
    { refetchInterval: isAwaitingVerification ? 8000 : false }
  );
  const fetchingDetailRef = useRef<Record<string, boolean>>({});

  useEffect(() => {
    if (!isCustomerRole || !userRequestsRes) return;

    const requests = Array.isArray(userRequestsRes?.data)
      ? userRequestsRes.data
      : (userRequestsRes?.data?.results || userRequestsRes?.results || []);

    if (!Array.isArray(requests) || requests.length === 0) return;

    const store = useArrivalCodeStore.getState();

    // 1. If modal is currently open, always check if this order was verified on the mechanic side
    if (store.isVisible && store.orderId && !store.isVerified) {
      const currentActiveOrder = requests.find((r: any) => String(r.id) === String(store.orderId));
      if (currentActiveOrder) {
        const curStatus = (currentActiveOrder.status || '').toLowerCase();
        if (curStatus === 'in_progress' || curStatus === 'completed' || currentActiveOrder.is_otp_verified) {
          store.markVerified();
          return;
        }
      }
    }

    // 2. Find any order currently marked as 'arrived' and not verified
    const arrivedOrder = requests.find((r: any) => {
      const status = (r.status || '').toLowerCase();
      return status === 'arrived' && !r.is_otp_verified;
    });

    if (arrivedOrder) {
      const orderId = String(arrivedOrder.id);

      // Check if user has already dismissed this order's modal during this session
      if (store.dismissedOrderIds.includes(orderId)) {
        return;
      }

      // If modal is already showing this order, do nothing
      if (store.isVisible && store.orderId === orderId) {
        return;
      }

      // Format mechanic and vehicle summary
      const mechanic = arrivedOrder.mechanic;
      const mechanicName = mechanic
        ? `${mechanic.first_name || ''} ${mechanic.last_name || ''}`.trim()
        : (arrivedOrder.mechanic_name || 'Specialist Mechanic');
      const mechanicPhone = mechanic?.phone_number || arrivedOrder.mechanic_phone || null;
      const vehicleSummary = [
        arrivedOrder.vehicle_year,
        arrivedOrder.vehicle_make,
        arrivedOrder.vehicle_model,
      ].filter(Boolean).join(' ');

      // If otp_code is already on the order object, show modal immediately
      if (arrivedOrder.otp_code) {
        store.showArrivalModal({
          orderId,
          otpCode: String(arrivedOrder.otp_code),
          mechanicName,
          mechanicPhone,
          vehicleSummary,
          serviceAddress: arrivedOrder.service_address || arrivedOrder.address,
        });
        return;
      }

      // Otherwise, fetch detail to obtain the full OTP code
      if (!fetchingDetailRef.current[orderId]) {
        fetchingDetailRef.current[orderId] = true;
        mechanicAPI
          .getRepairRequestDetail(orderId)
          .then((res: any) => {
            const detail = res?.data || res;
            const code = detail?.otp_code || arrivedOrder.otp_code;
            if (code) {
              const freshPhone = detail?.mechanic?.phone_number || mechanicPhone;
              store.showArrivalModal({
                orderId,
                otpCode: String(code),
                mechanicName: mechanicName || (detail?.mechanic ? `${detail.mechanic.first_name || ''} ${detail.mechanic.last_name || ''}`.trim() : 'Specialist Mechanic'),
                mechanicPhone: freshPhone,
                vehicleSummary,
                serviceAddress: detail?.service_address || arrivedOrder.service_address,
              });
            }
          })
          .catch((err) => {
            console.error('Failed to load repair arrival details for OTP modal:', err);
          })
          .finally(() => {
            fetchingDetailRef.current[orderId] = false;
          });
      }
    }
  }, [userRequestsRes, isCustomerRole]);
};

export default useArrivalCodeWatcher;
