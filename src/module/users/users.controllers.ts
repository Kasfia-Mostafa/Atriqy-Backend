import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import config from "../../app/config";
import { Types } from "mongoose";
import { UserProfile } from "./users.model";
import getDataUri from "../../utils/datauri";
import cloudinary from "../../utils/cloudinary";
import mongoose from "mongoose";
import { Post } from "../post/post.model";

//*** Define the register function
const register = async (req: Request, res: Response) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({
        message: "Please provide username, email, and password.",
        success: false,
      });
    }

    const existingUser = await UserProfile.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        message: "Email already in use. Please try a different one.",
        success: false,
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await UserProfile.create({
      username,
      email,
      password: hashedPassword,
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

//*** Define the login function
const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({
        message: "Please provide both email and password.",
        success: false,
      });
    }

    const user = await UserProfile.findOne({ email }).exec();
    if (!user) {
      return res.status(401).json({
        message: "Incorrect email or password",
        success: false,
      });
    }

    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      return res.status(401).json({
        message: "Incorrect email or password",
        success: false,
      });
    }

    const token = jwt.sign(
      { userId: user._id },
      config.jwt_access_secret as string,
      { expiresIn: config.jwt_access_expires_in }
    );

    // const populatedPosts = await Promise.all(
    //   user.posts.map(async (postId: Types.ObjectId) => {
    //     const post = await Post.findById(postId).exec();
    //     if (post && post.author.equals(user._id)) {
    //       return post._id.toString();
    //     }
    //     return null;
    //   })
    // ).then((posts) => posts.filter((post) => post !== null) as string[]);

    const userResponse = {
      _id: user._id.toString(),
      username: user.username,
      email: user.email,
      profilePicture: user.profilePicture,
      bio: user.bio, 
      gender: user.gender,
      followers: user.followers.map((follower) => follower.toString()),
      following: user.following.map((following) => following.toString()),
      posts: user.posts.map((post) => post.toString()),
      bookmarks: user.bookmarks.map((bookmark) => bookmark.toString()),
    };

    return res
      .cookie("token", token, {
        httpOnly: true,
        sameSite: "strict",
        maxAge: 1 * 24 * 60 * 60 * 1000, // 1 day
      })
      .json({
        message: `Welcome back ${user.username}`,
        success: true,
        user: userResponse,
      });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      message: "Internal server error.",
      success: false,
    });
  }
};

//*** Define the logout function
const logout = async (req: Request, res: Response) => {
  try {
    res.cookie("token", "", {
      httpOnly: true,
      sameSite: "strict",
      expires: new Date(0),
    });

    return res.json({
      message: "Successfully logged out.",
      success: true,
    });
  } catch (error) {
    console.error("Logout error:", error);
    return res.status(500).json({
      message: "Internal server error.",
      success: false,
    });
  }
};

//*** Define the get profile function
const getProfile = async (req: Request, res: Response) => {
  try {
    // Extract the user ID from the request parameters
    const userId = req.params.id;

    // Fetch the user profile from the database, including populated bookmarks
    const user = await UserProfile.findById(userId).select("-password")
      .populate({
        path: 'bookmarks',
        select: 'title content', // Select only the fields you need
      })
      .exec();

    // If the user profile is not found, return a 404 response
    if (!user) {
      return res.status(404).json({
        message: "User not found.",
        success: false,
      });
    }

    // Fetch posts related to the user, sort by creation date in descending order
    const posts = await Post.find({ _id: { $in: user.posts } })
      .sort({ createdAt: -1 })
      .select('title content createdAt') // Select only the fields you need
      .exec();

    // Return the user profile and associated posts in the response
    return res.status(200).json({
      user: {
        ...user.toObject(), // Convert the user document to a plain JavaScript object
        posts, // Attach posts to the user profile
      },
      success: true,
    });
  } catch (error) {
    // Log the error and return a 500 response for internal server errors
    console.error("Error fetching user profile:", error);
    return res.status(500).json({
      message: "Internal server error.",
      success: false,
    });
  }
};

//*** Define the edit profile function
const editProfile = async (req:Request, res:Response) => {
  try {
    const userId = req.userId;
    const { bio, gender } = req.body;
    const profilePicture = req.file;

    let cloudResponse;

    if (profilePicture) {
      const fileUri = getDataUri(profilePicture); // Convert file to URI
      cloudResponse = await cloudinary.uploader.upload(fileUri); // Upload to Cloudinary
    }

    const user = await UserProfile.findById(userId).select("-password").exec();
    if (!user) {
      return res.status(404).json({
        message: "User not found.",
        success: false,
      });
    }

    if (bio) user.bio = bio;
    if (gender) user.gender = gender;
    if (profilePicture && cloudResponse)
      user.profilePicture = cloudResponse.secure_url;

    await user.save();

    return res.status(200).json({
      message: "Profile updated successfully.",
      success: true,
      user,
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    return res.status(500).json({
      message: "Internal server error.",
      success: false,
    });
  }
};

//*** Define the get suggestedUsers function
const getSuggestedUsers = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;

    // Validate that userId is present
    if (!userId) {
      return res.status(401).json({
        message: "User not authenticated",
        success: false,
      });
    }

    // Find users other than the current authenticated user
    const suggestedUsers = await UserProfile.find({
      _id: { $ne: userId },
    }).select("-password");

    return res.status(200).json({
      success: true,
      users: suggestedUsers,
    });
  } catch (error) {
    console.error("Error fetching suggested users:", error);
    return res.status(500).json({
      message: "Internal server error.",
      success: false,
    });
  }
};


//*** Define the followOrUnfollow function
const followOrUnfollow = async (req: Request, res: Response) => {
  try {
    // Extract user IDs from request
    const currentUserId = req.userId as string;
    const targetUserId = req.params.id;

    // Convert string IDs to ObjectId
    const currentUserObjectId = new mongoose.Types.ObjectId(currentUserId);
    const targetUserObjectId = new mongoose.Types.ObjectId(targetUserId);

    // Check if the current user is trying to follow/unfollow themselves
    if (currentUserObjectId.equals(targetUserObjectId)) {
      return res.status(400).json({
        message: "You cannot follow or unfollow yourself.",
        success: false,
      });
    }

    // Find users by ObjectId
    const currentUser = await UserProfile.findById(currentUserObjectId);
    const targetUser = await UserProfile.findById(targetUserObjectId);

    // Check if both users exist
    if (!currentUser || !targetUser) {
      return res.status(404).json({
        message: "User not found.",
        success: false,
      });
    }

    // Check if the current user is following the target user
    const isFollowing = currentUser.following.some(id => id.equals(targetUserObjectId));

    if (isFollowing) {
      // Unfollow logic
      await Promise.all([
        UserProfile.updateOne(
          { _id: currentUserObjectId },
          { $pull: { following: targetUserObjectId } }
        ),
        UserProfile.updateOne(
          { _id: targetUserObjectId },
          { $pull: { followers: currentUserObjectId } }
        ),
      ]);
      return res.status(200).json({
        message: "Successfully unfollowed.",
        success: true,
      });
    } else {
      // Follow logic
      await Promise.all([
        UserProfile.updateOne(
          { _id: currentUserObjectId },
          { $push: { following: targetUserObjectId } }
        ),
        UserProfile.updateOne(
          { _id: targetUserObjectId },
          { $push: { followers: currentUserObjectId } }
        ),
      ]);
      return res.status(200).json({
        message: "Successfully followed.",
        success: true,
      });
    }
  } catch (error) {
    console.error("Error in follow or unfollow operation:", error);
    return res.status(500).json({
      message: "Internal server error.",
      success: false,
    });
  }
};

export const UserControllers = {
  register,
  login,
  logout,
  getProfile,
  editProfile,
  getSuggestedUsers,
  followOrUnfollow
};