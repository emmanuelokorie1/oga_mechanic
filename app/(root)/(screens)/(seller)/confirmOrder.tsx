import SuccessPage from "@/components/SuccessPage";
import { sellerRoutes } from "@/constants/routes";
import React from "react";

const SellerConfirmOrder = () => {
    return (
        <SuccessPage
            header="Order Updated"
            text="You have successfully updated this order status."
            btnText="View Orders"
            route={sellerRoutes.order}
        />
    );
};

export default SellerConfirmOrder;
