import mongoose, { type Model, type Types } from "mongoose";
import type { StoryGenre, StoryStatus } from "@/lib/stories/types";

export interface IStoryDocument {
  _id: Types.ObjectId;
  title: string;
  slug: string;
  description: string;
  coverImage?: string;
  genre: StoryGenre[];
  tags: string[];
  author: string;
  status: StoryStatus;
  totalChapters: number;
  viewCount: number;
  likeCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const storySchema = new mongoose.Schema<IStoryDocument>(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, unique: true, index: true },
    description: { type: String, required: true, trim: true },
    coverImage: { type: String, default: "" },
    genre: {
      type: [String],
      enum: ["명리학", "타로", "자미두수", "점성술", "숙요점"],
      default: [],
      index: true,
    },
    tags: { type: [String], default: [] },
    author: { type: String, required: true, trim: true },
    status: { type: String, enum: ["ongoing", "completed"], default: "ongoing", index: true },
    totalChapters: { type: Number, default: 0 },
    viewCount: { type: Number, default: 0 },
    likeCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

storySchema.index({ status: 1, updatedAt: -1 });
storySchema.index({ genre: 1, updatedAt: -1 });

export const Story: Model<IStoryDocument> =
  mongoose.models.Story || mongoose.model<IStoryDocument>("Story", storySchema, "stories");

export default Story;
