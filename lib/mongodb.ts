import { MongoClient, Db, ObjectId } from "mongodb";

const MONGODB_URI = process.env.MONGODB_URI!;

let client: MongoClient;
let db: Db;

export async function getDb(): Promise<Db> {
  if (db) return db;

  client = new MongoClient(MONGODB_URI, {
    connectTimeoutMS: 5000,
    serverSelectionTimeoutMS: 5000,
  });
  await client.connect();
  db = client.db("minttales");
  return db;
}

export interface Story {
  _id?: ObjectId;
  prompt: string;
  content: string;
  genre: string;
  audioUrl?: string;
  videoUrl?: string;
  nftMint?: string;
  nftExplorerUrl?: string;
  createdAt: Date;
  votes: number;
  isRecommended?: boolean;
}

export async function saveStory(story: Omit<Story, "_id">): Promise<string> {
  const database = await getDb();
  const result = await database.collection("stories").insertOne(story);
  return result.insertedId.toString();
}

export async function getStories(limit = 20): Promise<Story[]> {
  const database = await getDb();
  return database
    .collection<Story>("stories")
    .find()
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
}

export async function getStoryById(id: string): Promise<Story | null> {
  const database = await getDb();
  return database
    .collection<Story>("stories")
    .findOne({ _id: new ObjectId(id) });
}

export async function updateStory(
  id: string,
  update: Partial<Story>
): Promise<void> {
  const database = await getDb();
  await database
    .collection("stories")
    .updateOne({ _id: new ObjectId(id) }, { $set: update });
}

export async function voteStory(id: string): Promise<void> {
  const database = await getDb();
  await database
    .collection("stories")
    .updateOne({ _id: new ObjectId(id) }, { $inc: { votes: 1 } });
}
