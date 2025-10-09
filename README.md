# Secure Customer International Payments Portal

- **Ethan Parsons** - ST10299399
- **Calwyn Govender** - ST10303017
- **Joshua Thomas** - ST10263292
- **Morne Erasmus** - ST10400684

The project implements a secure backend API for a customer international payments portal. The core focus is on the requirements that are needed for task 2.
These include:
- Password security with hashing and salting
- Ensuring all inputs are whitelisted using RegEx patterns 
- Esuring all traffic of the system is served over SSL
- Ensuring that we protect our system against all attacks

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
- Step 4: Install the dependancies by opening a terminal in visual studio code
- Step 5: In the terminal enter: cd backend then "npm install --legacy-peer-deps"
- Step 6: After the install is finished open another terminal and enter: cd frontend then "npm install"
- Step 7: After the install is complete go back to the terminal which is in the backend and "npm run dev" to start the backend (It should say mongoDB is CONNECTED and Server is running on port:3000)
- Step 8: Go back to the other terminal that is in the frontend and run "npm start" when the terminal promts if it should open a new port enter Y
- Step 9: It should launch a tab in your browser. Before trying to login open a new tab and navigate to https://localhost:3000
- Step 10: When the browser displays the "Your connection is not private" warning, click "Advanced" or "Proceed to localhost" to accept the certificate
- Step 11: Once accepted switch back to the frontend (e.g., https://localhost:3001/login). The API calls will now succeed and you will be able to test the system.

  ## Login Information
  - Username: testuser
  - Password: SecurePassword123
