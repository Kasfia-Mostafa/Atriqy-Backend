import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import config from "../../app/config";
import mongoose from "mongoose";
import { UserProfile } from "./users.model";
import getDataUri from "../../utils/datauri";
import cloudinary from "../../utils/cloudinary";

//*** Register user
const register = async (req: Request, res: Response) => {
  try {
    const { username, email, password, source } = req.body;

    // Validation: Require username and email; only require password if not from Google
    if (!username || !email || (source !== "google" && !password)) {
      return res.status(400).json({
        message: "Please provide username, email, and password.",
        success: false,
      });
    }

    // Check for existing user
    const existingUser = await UserProfile.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        message: "Email already in use.",
        success: false,
      });
    }

    // Hash password only if provided
    let hashedPassword: string | undefined;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    // Create user with or without password
    await UserProfile.create({
      username,
      email,
      password: hashedPassword, // Store hashed password only if it exists
    });

    return res.status(201).json({
      message: "Account created successfully.",
      success: true,
    });
  } catch (error) {
    console.error("Registration error:", error);
    return res.status(500).json({
      message: "Internal server error.",
      success: false,
    });
  }
};

//*** Login user
const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        message: "Please provide both email and password.",
        success: false,
      });
    }

    // Fetch user and verify password
    const user = await UserProfile.findOne({ email }).exec();
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res
        .status(401)
        .json({ message: "Incorrect email or password", success: false });
    }

    // Generate token
    const token = jwt.sign(
      { userId: user._id },
      config.jwt_access_secret as string,
      { expiresIn: config.jwt_access_expires_in }
    );

    const userResponse = {
      _id: user._id.toString(),
      username: user.username,
      email: user.email,
      profilePicture: user.profilePicture,
      bio: user.bio,
      followers: user.followers.map((follower) => follower.toString()),
      following: user.following.map((following) => following.toString()),
      posts: user.posts.map((post) => post.toString()),
      bookmarks: user.bookmarks.map((bookmark) => bookmark.toString()),
    };

    return res
      .cookie("token", token, {
        httpOnly: true,
        sameSite: "strict",
        maxAge: 1 * 24 * 60 * 60 * 1000,
      })
      .json({
        message: `Welcome back ${user.username}`,
        success: true,
        user: userResponse,
      });
  } catch (error) {
    console.error("Login error:", error);
    return res
      .status(500)
      .json({ message: "Internal server error.", success: false });
  }
};

//*** Logout user
const logout = async (req: Request, res: Response) => {
  try {
    res.cookie("token", "", {
      httpOnly: true,
      sameSite: "strict",
      expires: new Date(0),
    });
    return res.json({ message: "Successfully logged out.", success: true });
  } catch (error) {
    console.error("Logout error:", error);
    return res
      .status(500)
      .json({ message: "Internal server error.", success: false });
  }
};

//*** Get user profile
const getProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;

    // Validate user ID
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res
        .status(400)
        .json({ message: "Invalid user ID format.", success: false });
    }

    const user = await UserProfile.findById(userId)
      .select("-password") // Exclude password from the response
      .populate([
        {
          path: "bookmarks", // Assuming bookmarks reference Post documents
          select: "title content image createdAt likes comments",
          populate: [
            { path: "likes", select: "username profilePicture" }, // Populate likes details
            { path: "comments.userId", select: "username profilePicture" }, // Populate comments user details
          ],
        },
        {
          path: "posts", // Assuming posts reference Post documents
          select: "title content image createdAt likes comments",
          populate: [
            { path: "likes", select: "username profilePicture" }, // Populate likes details
            { path: "comments.userId", select: "username profilePicture" }, // Populate comments user details
          ],
        },
      ])
      .exec();

    // Check if user exists
    if (!user) {
      return res
        .status(404)
        .json({ message: "User not found.", success: false });
    }

    // Send back the user data
    return res.status(200).json({
      user: { ...user.toObject(), bio: user.bio }, // Convert mongoose document to plain object
      success: true,
    });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return res
      .status(500)
      .json({ message: "Internal server error.", success: false });
  }
};

//*** Edit user profile
const editProfile = async (req: Request, res: Response) => {
  try {
    // Type guard to ensure req.user is defined
    if (!req.user || !req.user.id) {
      return res
        .status(401)
        .json({ message: "User ID is missing.", success: false });
    }

    const userId = req.user.id; // Get user ID from authenticated request

    const { bio, username } = req.body;
    const profilePicture = req.file;

    // Validate username
    if (username) {
      const existingUser = await UserProfile.findOne({ username }).exec();
      if (existingUser && existingUser._id.toString() !== userId) {
        return res
          .status(400)
          .json({ message: "Username already taken.", success: false });
      }
    }

    let cloudResponse;

    // Upload the profile picture to Cloudinary if provided
    if (profilePicture) {
      const fileUri = getDataUri(profilePicture);
      cloudResponse = await cloudinary.uploader.upload(fileUri);
      console.log("Cloudinary response:", cloudResponse);
    }

    // Fetch the existing user profile
    const user = await UserProfile.findById(userId).select("-password").exec();
    console.log("Fetched user:", user);

    if (!user) {
      console.error(`No user found with ID: ${userId}`);
      return res
        .status(404)
        .json({ message: "User not found.", success: false });
    }

    // Update user fields if provided
    if (bio) user.bio = bio;
    if (username) user.username = username;
    if (profilePicture && cloudResponse)
      user.profilePicture = cloudResponse.secure_url;

    // Save the updated user profile
    await user.save();

    return res
      .status(200)
      .json({ message: "Profile updated successfully.", success: true, user });
  } catch (error) {
    console.error("Error updating profile:", error);
    return res
      .status(500)
      .json({ message: "Internal server error.", success: false });
  }
};

//*** Get suggested users
const getSuggestedUsers = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id; // Use optional chaining

    if (!userId) {
      return res.status(401).json({ message: "User not authenticated", success: false });
    }

    // Fetch the suggested users excluding the current user
    const suggestedUsers = await UserProfile.find({
      _id: { $ne: userId },
    }).select("-password"); 

    // Fetch the current user's profile to get their following list
    const currentUser = await UserProfile.findById(userId).select("following");

    if (!currentUser) {
      return res.status(404).json({ message: "User not found", success: false });
    }

    // Create a Set for the current user's following IDs for quick lookup
    const followingSet = new Set(currentUser.following.map(id => id.toString())); 

    // Map suggested users to include the isFollowing property
    const suggestedUsersWithFollowingStatus = suggestedUsers.map((user) => ({
      ...user.toObject(), 
      isFollowing: followingSet.has(user._id.toString()), 
    }));

    return res.status(200).json({ success: true, users: suggestedUsersWithFollowingStatus });
  } catch (error) {
    console.error("Error fetching suggested users:", error);
    return res.status(500).json({ message: "Internal server error.", success: false });
  }
};



//*** Follow or unfollow user
const followOrUnfollow = async (req: Request, res: Response) => {
  try {
    const currentUserId = req.user?.id; // Access user ID from req.user
    const targetUserId = req.params.id;

    // Log the user IDs for debugging
    console.log("Current User ID:", currentUserId);
    console.log("Target User ID:", targetUserId);

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(currentUserId)) {
      return res.status(400).json({ message: "Invalid current user ID format.", success: false });
    }

    if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
      return res.status(400).json({ message: "Invalid target user ID format.", success: false });
    }

    // Check if the user is trying to follow/unfollow themselves
    if (currentUserId === targetUserId) {
      return res.status(400).json({
        message: "You cannot follow or unfollow yourself.",
        success: false,
      });
    }

    // Fetch current and target user profiles
    const [currentUser, targetUser] = await Promise.all([
      UserProfile.findById(currentUserId),
      UserProfile.findById(targetUserId),
    ]);

    // Check if users were found
    if (!currentUser || !targetUser) {
      return res.status(404).json({ message: "User not found.", success: false });
    }

    // Check if the current user is already following the target user
    const isFollowing = currentUser.following.some((id) => id.equals(targetUser._id));

    if (isFollowing) {
      // Unfollow logic
      await Promise.all([
        UserProfile.updateOne(
          { _id: currentUserId },
          { $pull: { following: targetUserId } }
        ),
        UserProfile.updateOne(
          { _id: targetUserId },
          { $pull: { followers: currentUserId } }
        ),
      ]);
      return res.status(200).json({ message: "Successfully unfollowed.", success: true });
    } else {
      // Follow logic
      await Promise.all([
        UserProfile.updateOne(
          { _id: currentUserId },
          { $push: { following: targetUserId } }
        ),
        UserProfile.updateOne(
          { _id: targetUserId },
          { $push: { followers: currentUserId } }
        ),
      ]);
      return res.status(200).json({ message: "Successfully followed.", success: true });
    }
  } catch (error) {
    console.error("Error in follow or unfollow operation:", error);
    return res.status(500).json({ message: "Internal server error.", success: false });
  }
};


export default followOrUnfollow;


export const UserControllers = {
  register,
  login,
  logout,
  getProfile,
  editProfile,
  getSuggestedUsers,
  followOrUnfollow,
};
