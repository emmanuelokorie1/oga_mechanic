# Functional Requirements Document (FRD)
**Project Name:** Oga Mechanic Mobile Application  
**Document Version:** 1.0  
**Target Audience:** QA Engineers, Development Team, Product Owners  

---

## 1. Introduction
### 1.1 Purpose
The purpose of this document is to define the functional and non-functional requirements for the **Oga Mechanic** mobile application. This document serves as the primary reference for Quality Assurance (QA) teams to develop comprehensive test plans, test cases, and execute end-to-end testing across the platform.

### 1.2 Scope
Oga Mechanic is a multi-sided marketplace application designed to connect:
1. **Users (Vehicle Owners):** Seeking auto repair services, car rentals, and spare parts.
2. **Mechanics:** Professionals offering maintenance and repair services.
3. **Sellers:** Vendors selling automotive parts and accessories.

### 1.3 Technology Stack (Testing Context)
- **Frontend:** React Native (Expo)
- **Navigation:** Expo Router (`app/` directory structure)
- **Platforms:** iOS & Android

---

## 2. User Roles & Access Control
| Role | Access Level | Description |
| :--- | :--- | :--- |
| **Guest** | Unauthenticated | Can view onboarding screens, Terms, and Privacy Policy. Cannot access core tabs. |
| **User** | `(user)` routes | Can book services, buy parts, chat, and manage their profile. |
| **Mechanic** | `(mechanic)` routes | Can accept/decline service requests, manage workshop profile, and track earnings. |
| **Seller** | `(sellers)` routes | Can manage product inventory, fulfill orders, and track sales revenue. |

> [!IMPORTANT]
> **QA Access Rule:** A single account/session must strictly enforce Role-Based Access Control (RBAC). A logged-in User must never route to Mechanic or Seller tabs. 

---

## 3. Detailed Functional Requirements

### Epic 1: Authentication & Onboarding (FR-AUTH)

**FR-AUTH-01: User Registration**
- **Description:** Users must be able to sign up by providing their Name, Email, Phone Number, Password, and selecting their Role (User/Mechanic/Seller).
- **Validation:** Email must follow standard regex. Passwords must be at least 8 characters. Phone numbers must be verified.
- **Acceptance Criteria:** Upon successful registration, the user is redirected to the `welcome.tsx` or `accountCreatedSucessful.tsx` screen.

**FR-AUTH-02: User Login**
- **Description:** Users must be able to log in using their Email and Password.
- **Acceptance Criteria:** System routes the user to their specific root layout (`/tabs/(user)`, `/tabs/(mechanic)`, or `/tabs/(sellers)`) based on their registered role.

**FR-AUTH-03: Password Reset**
- **Description:** Users who forget their password can request a reset link.
- **Acceptance Criteria:** User successfully completes the flow ending on `resetPasswordSucessful.tsx` and can log in with the new password.

### Epic 2: User Module (FR-USR)

**FR-USR-01: Home Dashboard**
- **Description:** The user dashboard (`(user)/home.tsx`) must display quick actions, supported car brands ("Brands We Work With" carousel), and a grid of available services.
- **Acceptance Criteria:** 
  - Carousel scrolls horizontally without clipping.
  - Clicking "Find a Mechanic" routes to the mechanic search/listing flow.
  - Clicking "Buy Spare Parts" routes to the marketplace (`shop.tsx`).

**FR-USR-02: Spare Parts Marketplace (Shop)**
- **Description:** Users can browse products listed by Sellers, view details, add to cart, and checkout.
- **Acceptance Criteria:** Search returns relevant products. The payment flow deducts funds correctly and generates an order record.

**FR-USR-03: Service Booking**
- **Description:** Users can request a mechanic for a specific service.
- **Acceptance Criteria:** Request triggers a notification to nearby/relevant Mechanics.

### Epic 3: Mechanic Module (FR-MEC)

**FR-MEC-01: Job Management**
- **Description:** Mechanics view incoming service requests on their dashboard (`(mechanic)/home.tsx` and `order.tsx`).
- **Acceptance Criteria:** 
  - Mechanics can `Accept` or `Decline` a request.
  - Accepting a request changes the job status to `In Progress` and notifies the User.

**FR-MEC-02: Earnings Tracking**
- **Description:** Mechanics can view their total earnings and transaction history (`earnings.tsx`).
- **Acceptance Criteria:** Earnings accurately reflect completed jobs minus platform commission.

**FR-MEC-03: Service Catalog**
- **Description:** Mechanics can add, edit, or remove services they offer (`service.tsx`).
- **Acceptance Criteria:** Updates reflect immediately on the User's side when viewing this mechanic's profile.

### Epic 4: Seller Module (FR-SEL)

**FR-SEL-01: Inventory Management**
- **Description:** Sellers must be able to add products, upload images, set prices, and manage stock (`product.tsx`).
- **Acceptance Criteria:** Out-of-stock items should automatically display as "Unavailable" to Users.

**FR-SEL-02: Order Fulfillment**
- **Description:** Sellers view incoming orders and update statuses (e.g., Processing, Shipped, Delivered) in `orders.tsx`.
- **Acceptance Criteria:** Status changes trigger push notifications to the purchasing User.

### Epic 5: Cross-Functional (FR-GEN)

**FR-GEN-01: In-App Chat & Calls**
- **Description:** Users can communicate directly with Mechanics or Sellers regarding their active orders/requests (`(screens)/(calls)`).
- **Acceptance Criteria:** Messages are delivered in real-time. Call UI handles permissions gracefully (Mic/Camera).

**FR-GEN-02: Push Notifications**
- **Description:** System sends push alerts for new orders, job updates, and messages.
- **Acceptance Criteria:** Tapping a notification routes the user directly to the relevant screen (e.g., tapping an order update opens the order details).

---

## 4. Non-Functional Requirements (NFR)

1. **Performance:** Screens must load in under 2 seconds on standard 4G networks. Image assets (like brand logos and product images) must be optimized and cached.
2. **Responsiveness:** The UI must be fluid and render correctly across varying mobile screen sizes (e.g., iPhone SE to iPhone 15 Pro Max, standard Android devices).
3. **Security:** Sensitive data (passwords, payment tokens) must be encrypted. Secure endpoints must reject requests with invalid JWT/Auth tokens.
4. **Offline Gracefulness:** If the user loses internet connection, the app should display a user-friendly "No Internet Connection" toast/screen rather than crashing.

---

## 5. QA Testing Strategy & Focus Areas

> [!WARNING]
> Ensure testing environments (Staging/QA APIs) are properly configured before testing payment flows to avoid real charges.

### Phase 1: Smoke Testing
- Verify successful App build on iOS Simulators and Android Emulators.
- Verify basic Login and Registration for all three roles.
- Verify tab bar navigation does not crash.

### Phase 2: Functional & Integration Testing
- **User-to-Mechanic Flow:** Create a User, book a service. Log in as a Mechanic, accept the service, complete it, and verify earnings.
- **User-to-Seller Flow:** Create a Seller, list a product. Log in as a User, buy the product. Log in as the Seller, fulfill the order.
- **State Management:** Ensure that navigating between screens (e.g., going deep into a product page and pressing the back button) retains the expected state and scroll position.

### Phase 3: Edge Cases & Error Handling
- Attempt to check out with an empty cart.
- Attempt to register with an already existing email.
- Test form validations (submitting without required fields, invalid phone numbers).
- Upload invalid file types or oversized images when adding a product.

### Phase 4: UI/UX & Visual Regression
- Verify the "Brands We Work With" component matches the new design updates (pill-shaped tags, brand logos).
- Check Dark Mode/Light Mode consistency (if applicable).
- Ensure typography, padding, and layout do not violate design constraints.
