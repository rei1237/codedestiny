import mongoose, { type Model, type Types } from "mongoose";

export interface IChapterDocument {
  _id: Types.ObjectId;
  storyId: Types.ObjectId;
  chapterNumber: number;
  title: string;
  content: string;
  wordCount: number;
  viewCount: number;
  publishedAt: Date;
  createdAt: Date;
}

const chapterSchema = new mongoose.Schema<IChapterDocument>(
  {
    storyId: { type: mongoose.Schema.Types.ObjectId, ref: "Story", required: true, index: true },
    chapterNumber: { type: Number, required: true },
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    wordCount: { type: Number, default: 0 },
    viewCount: { type: Number, default: 0 },
    publishedAt: { type: Date, required: true, index: true },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false },
);

chapterSchema.index({ storyId: 1, chapterNumber: 1 }, { unique: true });
chapterSchema.index({ storyId: 1, publishedAt: -1 });

export const Chapter: Model<IChapterDocument> =
  mongoose.models.Chapter || mongoose.model<IChapterDocument>("Chapter", chapterSchema, "chapters");

export default Chapter;
