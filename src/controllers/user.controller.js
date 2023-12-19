import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/Cloudinary.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import  Jwt  from "jsonwebtoken";

const generateAccessAndRefreshsTokens = async (userId)=>{
  try {
    const user = await User.findById(userId);
    const accesstoken = user.generateAccessToken();
    const refreshtoken = user.generateRefreshToken();

    user.refreshtoken = refreshtoken;
    await user.save({ validateBeforeSave: false });

    return {accesstoken, refreshtoken}
  } catch (error) {
    throw new ApiError(500, "Error while generating access and refresh tokens")
  }
}


const registerUser = asyncHandler(async (req, res)=>{
  //get user details from frontend
  //validation - like not empty
  //check if user already exists: using username or email field
  //check for images, check for avatar
  //upload them to cloudinary, avatar
  //create user object - create entry in db
  //remove password and refresh token field from the response
  //check for user creation
  //return res

  const {fullname, email, username, password}=req.body
  console.log("email", email)

  if ([fullname, email, username, password].some((field)=>field?.trim()==="")) {
    throw new ApiError(400, "All fields are required")
  }

  const existedUser = await User.findOne({$or:[{username},{email}]})

  if (existedUser) {
    throw new ApiError(400, "User already exists with the provided email or username")
  }
  console.log(req.files) //i'm getting [Object: null prototype]

  const avatarLocalPath = req.files?.avatar[0]?.path;
  //const coverImageLocalPath = req.files?.coverImage[0]?.path;
  let coverImageLocalPath;
  if (req.files && Array.isArray(req.files.coverImage)&& req.files.coverImage.length >0) {
    coverImageLocalPath = req.files?.coverImage[0]?.path
    console.log("images uploaded successfully")
  }

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required")
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath)
  const coverImage = await uploadOnCloudinary(coverImageLocalPath)

  if (!avatar) {
    throw new ApiError(400, "Avatar file is required")
  }

  const user = await User.create({
    fullname,
    avatar: avatar.url,
    coverImage: coverImage.url || "",
    email,
    password,
    username: username.toLowerCase()
  })

  const createdUser = await User.findById(user._id).select("-password -refreshToken")

  if (!createdUser) {
    throw new ApiError (500, "Something went wrong while registering the user")
  }

  return res.status(201).json(
    new ApiResponse(200, createdUser, "User registered Successfully")
  )

})


const loginUser = asyncHandler(async (req, res)=>{
  //get user details from frontend
  //validation - like not empty
  //check if user already exists: using username or email field
  //check for images, check for avatar
  //upload them to cloudinary, avatar
  //create user object - create entry in db
  //remove password and refresh token field from the response
  //check for user creation
  //return res


  //req.body ->data
  //login using username or email
  //check if user exists
  //password check
  //generate access and refresh tokens
  //send cookies

  const {email, password, username} = req.body
  console.log(email);

  if (!username &&!email) {
    throw new ApiError(400, "Email or username is required")
  }

  // another logic that can be used for above problem statement
  // if(! (username || email)) {
    // throw new ApiError(400, "Email or username is required")}
  
  const user = await User.findOne({$or:[{username},{email}]})

  if (!user) {
    throw new ApiError(400, "User does not exist")
  }

  const isPasswordCorrect = await user.isPasswordCorrect(password)
  
  if (!isPasswordCorrect) {
    throw new ApiError(401, "Incorrect password")
  }

  const {accesstoken, refreshtoken} = await generateAccessAndRefreshsTokens(user._id);

  const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

  const options = {
    httpOnly: true,
    secure: true,
  };
  
  return res
  .status(201)
  .cookie("accesstoken", accesstoken, options)
  .cookie("refreshtoken", refreshtoken, options)
  .json(
    new ApiResponse(
      200,{
        user: loggedInUser, accesstoken, refreshtoken
      },
        "User logged in Successfully")
  )
})

const logoutUser = asyncHandler(async (req, res)=>{
  await User.findByIdAndUpdate(req.user._id, {refreshToken: null},{
    new: true,
  })
  const options ={
    httpOnly: true,
    secure: true,
  }
  return res
  .status(200)
  .cookie("accesstoken", "", options)
  .json(
    new ApiResponse(200, {}, "User logged out successfully")
  )

})

const refreshAccessToken = asyncHandler(async (req, res)=>{
  const incomingRefreshToken = req.cookies?.refreshtoken || req.body?.refreshtoken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, " Unauthorized request")
  }

  try {
    const decodeToken = Jwt.verify(incomingRefreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decodeToken?._id);
    if (!user) {
      throw new ApiError(401, " Invalid Refresh Token");
    }

    if (incomingRefreshToken!== user?.refreshtoken) 
    {
      throw new ApiError(401, " Invalid Refresh Token is expired or used");
    }
    
    const options ={
      httpOnly: true,
      secure: true,
    }

    const {accesstoken, newRefreshToken} = await generateAccessAndRefreshsTokens(user._id);
    
    return res
    .status(200)
    .cookie("accesstoken", accesstoken, options)
    .cookie("refreshtoken", newRefreshToken, options)
    .json(
      new ApiResponse(
        200, {
          newRefreshToken, accesstoken, refreshtoken
        },
          "Access token refreshed successfully")
    )

  } catch (error) {
    throw new ApiError(401, error?.message ||  " Invalid Refresh Token");
  }
})

const changeCurrentPassword = asyncHandler(async (req, res)=>{
  const {oldPassword, newPassword} = req.body

  
  const user = await User.findById(req.user?._id);
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordCorrect) {
    throw new ApiError(401, "Invalid old password")
  }

  user.password = newPassword;
  await user.save({validateBeforeSave: false});

  return res.status(200).json(
    new ApiResponse(200, {}, "Password changed successfully")
  )

})

const getCurrentUser = asyncHandler(async (req, res)=>{
  const user = await User.findById(req.user?._id);

  return res.status(200).json(
    new ApiResponse(200, user, "User fetched successfully")
  )
})

const updateAccountDetails = asyncHandler(async (req, res)=>{
  const {fullname, email} = req.body

  if (!fullname || !email) {
    throw new ApiError(400, "All fields are required")
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id, 
    { 
      $set:{
        fullname,
        email: email
      }
      },
    {
    new: true,
     }
  ).select("-password ");

  return res
  .status(200)
  .json(
    new ApiResponse(200, user, "User details updated successfully")
  )
});

const updateUserAvatar = asyncHandler(async (req, res)=>{
  const avatarLocalPath = req.file?.path

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is missing")
  }

  //TODO: delete old image - assignment

  const avatar = await uploadOnCloudinary(avatarLocalPath)

  if (!avatar.url) {
    throw new ApiError(400, "Error while uploading the avatar.") 
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set:{
        avatar: avatar.url
      }
      },
    {
    new: true,
     }
  ).select("-password ");

  return res.status(200).json(
    new ApiResponse(200, user, "User avatar updated successfully")
  )

})

const updateUserCoverImage = asyncHandler(async (req, res)=>{
  const coverImageLocalPath = req.file?.path

  if (!coverImageLocalPath) {
    throw new ApiError(400, "Cover image file is missing")
  }

  //TODO: delete old image - assignment

  const coverImage = await uploadOnCloudinary(coverImageLocalPath)

  if (!coverImage.url) {
    throw new ApiError(400, "Error while uploading the cover image.")
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set:{
        coverImage: coverImage.url
      }
      },
    {
    new: true,
     }
  ).select("-password ");

  return res.status(200).json(
    new ApiResponse(200, user, "User cover image updated successfully")
  )

})
export {registerUser, loginUser, logoutUser, refreshAccessToken, changeCurrentPassword, getCurrentUser, updateAccountDetails, updateUserAvatar, updateUserCoverImage}