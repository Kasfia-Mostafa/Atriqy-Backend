import { Request, Response } from "express";
import sharp from "sharp";
import cloudinary from "../../utils/cloudinary";
import { UserProfile } from "../users/users.model";
import { TPost } from "./post.interface";
import mongoose from "mongoose";
import { TUser } from "../users/users.interface";
import { Post } from "./post.model";
import { Types } from "mongoose";
import { Comment } from "../comment/comment.model";
import { AuthenticatedRequest } from "../../types/express";

//*** New post
const addNewPost = async (req: Request, res: Response) => {
  try {
    const { caption } = req.body;
    const image = req.file;
    const authorId = req.userId as string;

    // Validate input
    if (!caption) {
      return res.status(400).json({ message: "Caption is required" });
    }

    if (!authorId) {
      return res.status(400).json({ message: "Author ID is required" });
    }

    if (!image) {
      return res.status(400).json({ message: "Image is required" });
    }

    // Validate authorId
    if (!mongoose.Types.ObjectId.isValid(authorId)) {
      return res.status(400).json({ message: "Invalid author ID" });
    }

    const authorObjectId = new mongoose.Types.ObjectId(authorId);

    // Image upload and processing
    const optimizedImageBuffer = await sharp(image.buffer)
      .resize({ width: 800, height: 800, fit: "inside" })
      .toFormat("jpeg", { quality: 80 })
      .toBuffer();

    // Upload to Cloudinary
    const cloudResponse = await new Promise<any>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { resource_type: "image" },
        (error, result) => {
          if (error) {
            console.error("Cloudinary upload error:", error);
            reject(error);
          } else {
            resolve(result);
          }
        }
      );
      uploadStream.end(optimizedImageBuffer);
    });

    // Create new post
    const post = await Post.create({
      caption,
      image: cloudResponse.secure_url,
      author: authorObjectId,
    });

    // Update user's posts
    const user = await UserProfile.findById(authorObjectId).exec();
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.posts.push(post._id as mongoose.Types.ObjectId);
    await user.save();

    // Fetch and populate the post
    const populatedPost = await Post.findById(post._id)
      .populate({ path: "author", select: "-password" })
      .exec();

    return res.status(201).json({
      message: "New post added",
      post: populatedPost,
      success: true,
    });
  } catch (error) {
    console.error("Error:", error);
    return res
      .status(500)
      .json({ message: "An error occurred while adding the post" });
  }
};

//*** Get all post
const getAllPost = async (req: Request, res: Response): Promise<Response> => {
  try {
    // Fetch posts and populate author
    const posts: TPost[] = await Post.find().sort({ createdAt: -1 }).populate({
      path: "author",
      select: "username profilePicture",
    });

    // Populate comments separately
    const populatedPosts = await Promise.all(
      posts.map(async (post) => {
        const populatedPost = await Post.findById(post._id).populate({
          path: "comments",
          populate: {
            path: "author",
            select: "username profilePicture",
          },
        });
        return populatedPost;
      })
    );

    return res.status(200).json({
      posts: populatedPosts,
      success: true,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while fetching posts",
    });
  }
};

//*** Get user's post
const getUserPost = async (req: Request, res: Response): Promise<Response> => {
  try {
    const authorId = req.params.id;

    const posts: TPost[] = await Post.find({ author: authorId })
      .sort({ createdAt: -1 })
      .populate({
        path: "author",
        select: "username profilePicture",
      })
      .populate({
        path: "comments",
        options: { sort: { createdAt: -1 } },
        populate: {
          path: "author",
          select: "username profilePicture",
        },
      })
      .populate({
        path: "likes",
        select: "username profilePicture", // If likes are references to user documents
      });

    return res.status(200).json({
      posts,
      success: true,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while fetching posts",
    });
  }
};

//*** Like post
const likePost = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = req.userId; // This can be undefined
    const postId: string = req.params.id;

    // Check if userId is defined
    if (!userId) {
      return res
        .status(401)
        .json({ message: "User not authenticated", success: false });
    }

    // Convert postId and userId to ObjectId
    const postObjectId = new mongoose.Types.ObjectId(postId);
    const userObjectId = new mongoose.Types.ObjectId(userId);

    const post = await Post.findById(postObjectId);
    if (!post) {
      return res
        .status(404)
        .json({ message: "Post not found", success: false });
    }

    // Like the post if the user hasn't already liked it
    if (!post.likes.includes(userObjectId)) {
      post.likes.push(userObjectId);
      await post.save(); // Save the updated post
    }

    const user = await UserProfile.findById(userObjectId).select(
      "username profilePicture"
    );
    if (!user) {
      return res
        .status(404)
        .json({ message: "User not found", success: false });
    }

    return res.status(200).json({
      message: "Post liked",
      success: true,
      post: { id: post._id, likes: post.likes.length, likedBy: user.username }, // Example response
    });
  } catch (error) {
    console.error("Error in likePost:", error);
    return res
      .status(500)
      .json({ message: "An error occurred", success: false });
  }
};

//*** Dislike post
const dislikePost = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = req.userId; // Ensure this is set correctly in your authentication middleware
    const postId: string = req.params.id;

    // Check if userId is defined
    if (!userId) {
      return res
        .status(401)
        .json({ message: "User not authenticated", success: false });
    }

    // Convert postId and userId to ObjectId
    const postObjectId = new mongoose.Types.ObjectId(postId);
    const userObjectId = new mongoose.Types.ObjectId(userId);

    // Check if the post exists
    const post = await Post.findById(postObjectId);
    if (!post) {
      return res
        .status(404)
        .json({ message: "Post not found", success: false });
    }

    // Check if the user has liked the post
    if (!post.likes.includes(userObjectId)) {
      return res
        .status(400)
        .json({ message: "Post not liked by user", success: false });
    }

    // Remove the user ID from the likes array
    await post.updateOne({ $pull: { likes: userObjectId } });

    // Fetch user details for the notification
    const user = await UserProfile.findById(userObjectId).select(
      "username profilePicture"
    );
    if (!user) {
      return res
        .status(404)
        .json({ message: "User not found", success: false });
    }

    // Uncomment this part if you want to handle notifications
    /*
    const postOwnerId = post.author.toString();
    if (postOwnerId !== userId) {
      const notification = {
        type: "dislike",
        userId,
        userDetails: user,
        postId,
        message: "Your post was disliked",
      };
      const postOwnerSocketId = getReceiverSocketId(postOwnerId);
      io.to(postOwnerSocketId).emit("notification", notification);
    }
    */

    return res.status(200).json({ message: "Post disliked", success: true });
  } catch (error) {
    console.error("Error in dislikePost:", error);
    return res
      .status(500)
      .json({ message: "An error occurred", success: false });
  }
};

//*** Add comment
const addComment = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    const postId = req.params.id;
    const userId = req.userId; // Accessing userId directly

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized", success: false });
    }

    const { text } = req.body;

    if (!text) {
      return res
        .status(400)
        .json({ message: "Text is required", success: false });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res
        .status(404)
        .json({ message: "Post not found", success: false });
    }

    // Create the comment
    const comment = await Comment.create({
      text,
      author: userId, // Ensure the author is set to the userId
      post: postId,
    });

    // Populate the author field
    await comment.populate({
      path: "author",
      select: "username profilePicture",
    });

    // Add the comment ID to the post's comments array
    post.comments.push(comment._id);
    await post.save();

    return res.status(201).json({
      message: "Comment Added",
      comment, // Return the populated comment
      success: true,
    });
  } catch (error) {
    console.error("Error adding comment:", error);
    return res.status(500).json({
      message: "An error occurred",
      success: false,
    });
  }
};

//*** Get comments of post
const getCommentsOfPost = async (
  req: Request,
  res: Response
): Promise<Response | void> => {
  try {
    const postId = req.params.id;

    // Fetch comments associated with the given postId and populate author details
    const comments = await Comment.find({ post: postId }).populate(
      "author",
      "username profilePicture"
    );

    // If no comments are found, return a 404 response
    if (!comments || comments.length === 0) {
      return res
        .status(404)
        .json({ message: "No comments found for this post", success: false });
    }

    // Return the comments in the response with a success message
    return res.status(200).json({ success: true, comments });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "An error occurred", success: false });
  }
};

//*** Delete post
const deletePost = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response | void> => {
  try {
    const postId = req.params.id;
    const authorId = req.userId; // Correctly reference userId

    console.log("Attempting to delete post with ID:", postId);
    console.log("Logged-in Author ID:", authorId);

    // Find the post by ID
    const post = await Post.findById(postId);
    if (!post) {
      return res
        .status(404)
        .json({ message: "Post not found", success: false });
    }

    console.log("Post Author ID:", post.author.toString());

    // Check if the logged-in user is the owner of the post
    if (post.author.toString() !== authorId) {
      console.log(
        "Unauthorized Access Attempt: User is not the owner of the post"
      );
      return res.status(403).json({ message: "Unauthorized", success: false });
    }

    // Proceed with deleting the post
    await Post.findByIdAndDelete(postId);

    // Remove the post ID from the user's list of posts
    const user = await UserProfile.findById(authorId);
    if (user) {
      user.posts = user.posts.filter((id) => id.toString() !== postId);
      await user.save();
      console.log("Post ID removed from user's posts list.");
    }

    // Delete associated comments
    await Comment.deleteMany({ post: postId });
    console.log("Comments associated with the post deleted.");

    // Return a success response
    return res.status(200).json({
      success: true,
      message: "Post deleted",
    });
  } catch (error) {
    console.error("Error deleting post:", error);
    return res
      .status(500)
      .json({ message: "An error occurred", success: false });
  }
};

//*** Bookmark post
const bookmarkPost = async (req: Request, res: Response): Promise<Response> => {
  const postId = req.params.id;
  const userId = req.userId;

  try {
    // Find the post by ID
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: "Post not found", success: false });
    }

    // Find the user by ID
    const user = await UserProfile.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found", success: false });
    }

    // Check if the post is already bookmarked
    const isBookmarked = user.bookmarks.includes(post._id as mongoose.Types.ObjectId);
    const updateOperation = isBookmarked 
      ? { $pull: { bookmarks: post._id } } 
      : { $addToSet: { bookmarks: post._id } };

    await user.updateOne(updateOperation);

    return res.status(200).json({
      type: isBookmarked ? "unsaved" : "saved",
      message: isBookmarked ? "Post removed from bookmarks" : "Post bookmarked",
      success: true,
    });

  } catch (error) {
    console.error("Error in bookmarkPost:", error);
    return res.status(500).json({ message: "An internal server error occurred", success: false });
  }
};

export const PostController = {
  addNewPost,
  getAllPost,
  getUserPost,
  likePost,
  dislikePost,
  addComment,
  getCommentsOfPost,
  deletePost,
  bookmarkPost,
};
