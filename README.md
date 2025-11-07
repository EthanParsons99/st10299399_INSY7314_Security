# Secure Customer/Admin International Payments Portal

- **Ethan Parsons** - ST10299399
- **Calwyn Govender** - ST10303017
- **Joshua Thomas** - ST10263292
- **Morne Erasmus** - ST10400684


This project implements a secure, two part system for an international payments portal. The core focus of the entire project is on robust, multi-layered **Application Security**.

The system consists of two main portals:
1.  **The Customer Portal (`/frontend`):** A public-facing application where customers can register, log in, initiate international payments, and view their transaction history.
2.  **The Employee Portal (`/employee-portal`):** A secure, internal application for bank staff to log in, review pending customer payments, and approve or reject them.

This system also successfully implements for both portals:
- Password security with hashing and salting
- Ensuring all inputs are whitelisted using RegEx patterns 
- Esuring all traffic of the system is served over SSL
- Ensuring that we protect our system against all attacks

## Lecturer Feedback Implementation

This version of the project addresses all specific feedback provided:

1. **Landing Page**: This now serves as the application's entry point, presenting clear "Log In" and "Sign Up" options to all users.

2. **Account Number**:This feature is now fully implemented. New users are automatically assigned a unique 10-digit account number upon registration, which is now a required field for customer login.

3. **"Personalized welcome message":** The customer dashboard has been enhanced to display a personalized welcome message that includes both the user's name and their account number, providing clear confirmation of their identity.


# How to install and run the project
The project requires you to run dual server setup

## Prerequisites
1. Node.js
2. MongoDB Atlas or the .env file
3. Visual Studio Code
4. Github repository to download zip folder

## Steps
- Step 1: Download the zip and extect to a location of your choice
- Step 2: Ensure the .env file is in the the backend folder
- Step 3: If step 2 is missing. Then run visual studio code as an administrator and create the .env file and paste the MongoDB Atlas connection string in the .env file
- Step 4: Install the dependencies by opening a terminal in visual studio code
- Step 5: In the terminal enter: cd backend then "npm install --legacy-peer-deps"
- Step 6: After the install is finished open another terminal and enter: cd frontend then "npm install"
- Step 6: After the install is finished open another terminal and enter: cd employee-portal then "npm install"
- Step 7: After the installs is complete go back to the terminal which is in the backend and "npm run dev" to start the backend (It should say mongoDB is CONNECTED and Server is running on port:3000)
- Step 8: Go back to the other terminal that is in the frontend and run "npm start" when the terminal prompts if it should open a new port enter Y
- Step 8: Go back to the other terminal that is in the employee-portal and run "npm start" when the terminal prompts if it should open a new port enter Y
- Step 9: It should launch a two tabs in your browser. One for customers and one for admins. Before trying to login open a new tab and navigate to https://localhost:3000
- Step 10: When the browser displays the "Your connection is not private" warning, click "Advanced" or "Proceed to localhost" to accept the certificate
- Step 11: Once accepted switch back to the frontend or employee-portal (e.g., https://localhost:3001/login). The API calls will now succeed and you will be able to test the system.
- Step 12: If you reject or approve a payment to see the updated status on the customer side just refresh the page if you are already logged in

## Login Information
  - Username: testuser
  - Password: SecurePassword123
## Admin Login
  -  The admin is a seeded user and has no signup method
  -  The login credentials for a admin was seeded in the .env file to make the application secure
  -  The .env file is not on github but will be in the zip submitted
  -  As well as a file that provides the login details inside the zip

# User Functions
## Customer
- Able to login and signup to the system
- Create and send payments
- View payment statuses
- Logout

## Admin
- Able to login as user is static and seeded
- Able to view all incoming payments
- Able to reject or approve these payments
- Logout

 ## Database Setup
 - **User** -> name, password
 - **Payment** -> amount, currency, provider, recipientAmount, swiftCode, status, owner, createdAt

