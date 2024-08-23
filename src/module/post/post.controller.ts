import { Request, Response } from "express";
import sharp from "sharp";
import cloudinary from "../../utils/cloudinary";
import { UserProfile } from "../users/users.model";
import { TPost } from "./post.interface";
import mongoose from "mongoose";
import { Post } from "./post.model";
import { Comment } from "../comment/comment.model";
import { createSocketServer } from "../socket/socket";
import app from "../../app";

const { getReceiverSocketId, io } = createSocketServer(app);

//*** New post
const addNewPost = async (req: Request, res: Response) => {
  try {
    const { caption } = req.body;
    const image = req.file;

    // Safely access user ID from req.user
    const authorId = req.user?.id;

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
    // Fetch posts, populate author and comments in one go
    const posts: TPost[] = await Post.find()
      .sort({ createdAt: -1 })
      .populate({
        path: "author",
        select: "username profilePicture",
      })
      .populate({
        path: "comments",
        populate: {
          path: "author",
          select: "username profilePicture",
        },
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

//*** Get a user's posts
const getUserPost = async (req: Request, res: Response): Promise<Response> => {
  try {
    const authorId = req.params.id;

    // Fetch user's posts, populate author, comments, and likes
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
        select: "username profilePicture",
      });

    return res.status(200).json({
      posts,
      success: true,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while fetching user's posts",
    });
  }
};

//*** Like post
const likePost = async (req: Request, res: Response) => {
  try {
    const UserIdOfWhoLiked = req.user?.id;
    const postId = req.params.id;

    // Ensure the user ID is present
    if (!UserIdOfWhoLiked) {
      return res
        .status(401)
        .json({ message: "User not authenticated", success: false });
    }

    // Find the post
    const post = await Post.findById(postId);
    if (!post) {
      return res
        .status(404)
        .json({ message: "Post not found", success: false });
    }

    // Like logic started
    await post.updateOne({ $addToSet: { likes: UserIdOfWhoLiked } });

    // Implement socket io for real-time notification
    const user = await UserProfile.findById(UserIdOfWhoLiked).select(
      "username profilePicture"
    );

    const postOwnerId = post.author.toString();
    if (postOwnerId !== UserIdOfWhoLiked) {
      // Get the socket ID for the post owner
      const postOwnerSocketId = getReceiverSocketId(postOwnerId);

      // Check if postOwnerSocketId is defined before emitting a notification
      if (postOwnerSocketId) {
        // Emit a notification event
        const notification = {
          type: "like",
          userId: UserIdOfWhoLiked,
          userDetails: user,
          postId,
          message: "Your post was liked",
        };

        io.to(postOwnerSocketId).emit("notification", notification);
      }
    }

    return res.status(200).json({ message: "Post liked", success: true });
  } catch (error) {
    console.error("Error liking post:", error);
    return res
      .status(500)
      .json({ message: "Internal server error", success: false });
  }
};

//*** Dislike post
const dislikePost = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = req.user?.id; // Use optional chaining to safely access req.user
    const postId: string = req.params.id;

    // Check if userId is defined
    if (!userId) {
      return res
        .status(401)
        .json({ message: "User not authenticated", success: false });
    }

    // Convert postId to ObjectId
    const postObjectId = new mongoose.Types.ObjectId(postId);

    // Check if the post exists
    const post = await Post.findById(postObjectId);
    if (!post) {
      return res
        .status(404)
        .json({ message: "Post not found", success: false });
    }

    // Check if the user has liked the post
    if (!post.likes.includes(userId)) {
      return res
        .status(400)
        .json({ message: "Post not liked by user", success: false });
    }

    // Remove the user ID from the likes array
    await post.updateOne({ $pull: { likes: userId } });

    // Fetch user details for the notification
    const user = await UserProfile.findById(userId).select(
      "username profilePicture"
    );
    if (!user) {
      return res
        .status(404)
        .json({ message: "User not found", success: false });
    }

    // Handle notifications
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
      if (postOwnerSocketId) {
        io.to(postOwnerSocketId).emit("notification", notification);
      }
    }

    return res.status(200).json({ message: "Post disliked", success: true });
  } catch (error) {
    console.error("Error in dislikePost:", error);
    return res
      .status(500)
      .json({ message: "An error occurred", success: false });
  }
};

//*** Add comment
const addComment = async (req: Request, res: Response): Promise<Response> => {
  try {
    const postId = req.params.id;
    const userId = req.user?.id; // Use optional chaining to safely access req.user

    // Check if userId is defined
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized", success: false });
    }

    const { text } = req.body;

    // Validate the text input
    if (!text) {
      return res
        .status(400)
        .json({ message: "Text is required", success: false });
    }

    // Check if the post exists
    const post = await Post.findById(postId);
    if (!post) {
      return res
        .status(404)
        .json({ message: "Post not found", success: false });
    }

    // Create the comment
    const comment = await Comment.create({
      text,
      author: new mongoose.Types.ObjectId(userId), // Ensure the author is set to the userId as an ObjectId
      post: new mongoose.Types.ObjectId(postId),
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

//*** Get comments of a specific post
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
    if (comments.length === 0) {
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

//*** Delete a post
const deletePost = async (
  req: Request,
  res: Response
): Promise<Response | void> => {
  try {
    const postId = req.params.id;
    const authorId = req.user?.id;

    if (!authorId) {
      return res.status(401).json({ message: "Unauthorized", success: false });
    }

    // Find the post by ID
    const post = await Post.findById(postId);
    if (!post) {
      return res
        .status(404)
        .json({ message: "Post not found", success: false });
    }

    // Check if the logged-in user is the owner of the post
    if (post.author.toString() !== authorId) {
      return res.status(403).json({ message: "Unauthorized", success: false });
    }

    // Proceed with deleting the post
    await Post.findByIdAndDelete(postId);

    // Remove the post ID from the user's list of posts
    const user = await UserProfile.findById(authorId);
    if (user) {
      user.posts = user.posts.filter((id) => id.toString() !== postId);
      await user.save();
    }

    // Delete associated comments
    await Comment.deleteMany({ post: postId });

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

//*** Bookmark a post
const bookmarkPost = async (req: Request, res: Response): Promise<Response> => {
  const postId = req.params.id;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ message: "Unauthorized", success: false });
  }

  try {
    // Find the post by ID
    const post = await Post.findById(postId);
    if (!post) {
      return res
        .status(404)
        .json({ message: "Post not found", success: false });
    }

    // Find the user by ID
    const user = await UserProfile.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ message: "User not found", success: false });
    }

    // Check if the post is already bookmarked
    const isBookmarked = user.bookmarks.includes(
      post._id as mongoose.Types.ObjectId
    );
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
    return res
      .status(500)
      .json({ message: "An internal server error occurred", success: false });
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
