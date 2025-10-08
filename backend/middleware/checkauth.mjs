// backend/middleware/checkauth.mjs
import jwt from "jsonwebtoken";

export default (req, res, next) => {
  try {
    // Tokens are usually sent in the header like "Bearer TOKEN_VALUE"
    // We split the string and take the second part, which is the token itself.
    const token = req.headers.authorization.split(" ")[1];

    // Verify the token using the same secret you used to create it
    const decodedToken = jwt.verify(token, "this_secret_should_be_longer_than_it_is");

    // Attach the decoded user info to the request object
    // Now, any subsequent route handler can access `req.userData`
    req.userData = { name: decodedToken.name };
    
    // If verification is successful, allow the request to proceed
    next();

  } catch (error) {
    // If the token is missing or invalid, deny access
    return res.status(401).json({ message: "Authentication failed: Invalid token." });
  }
};